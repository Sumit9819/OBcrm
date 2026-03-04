-- ================================================================
-- Migration 0012: Full Chat System Upgrade
-- DMs, Group Channels, Lead Threads, Typing, Reactions, Pinned
-- Run in Supabase SQL Editor
-- ================================================================

-- ── 1. Chat Channels ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_channels (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    agency_id    uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    name         text,                                  -- NULL for DMs
    description  text,
    channel_type text NOT NULL DEFAULT 'dm',            -- 'dm' | 'group' | 'lead_thread'
    lead_id      uuid REFERENCES leads(id) ON DELETE CASCADE, -- for lead threads
    created_by   uuid REFERENCES auth.users(id),
    created_at   timestamptz DEFAULT now()
);

-- ── 2. Channel Members ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_members (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at   timestamptz DEFAULT now(),
    last_read_at timestamptz DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- ── 3. Chat Messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id   uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    agency_id    uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
    sender_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content      text NOT NULL,
    reply_to_id  uuid REFERENCES chat_messages(id) ON DELETE SET NULL,
    edited_at    timestamptz,
    deleted_at   timestamptz,                           -- soft delete
    is_pinned    boolean DEFAULT false,
    created_at   timestamptz DEFAULT now()
);

-- ── 4. Message Reactions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id uuid NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji      text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE(message_id, user_id, emoji)
);

-- ── 5. Typing Status ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS typing_status (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id  uuid NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_typing   boolean DEFAULT false,
    updated_at  timestamptz DEFAULT now(),
    UNIQUE(channel_id, user_id)
);

-- ── RLS Policies ────────────────────────────────────────────────

ALTER TABLE chat_channels  ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_members   ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_status  ENABLE ROW LEVEL SECURITY;

-- chat_channels: agency members can see their agency's channels
CREATE POLICY "Agency members view channels" ON chat_channels
    FOR SELECT USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Agency members manage channels" ON chat_channels
    FOR ALL USING (agency_id = (SELECT agency_id FROM users WHERE id = auth.uid()));

-- chat_members: visible to same agency
CREATE POLICY "Agency members view memberships" ON chat_members
    FOR ALL USING (
        channel_id IN (
            SELECT id FROM chat_channels
            WHERE agency_id = (SELECT agency_id FROM users WHERE id = auth.uid())
        )
    );

-- chat_messages: members of the channel
CREATE POLICY "Channel members view messages" ON chat_messages
    FOR SELECT USING (
        channel_id IN (
            SELECT channel_id FROM chat_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Channel members send messages" ON chat_messages
    FOR INSERT WITH CHECK (
        sender_id = auth.uid() AND
        channel_id IN (
            SELECT channel_id FROM chat_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Senders edit own messages" ON chat_messages
    FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Senders delete own messages" ON chat_messages
    FOR DELETE USING (sender_id = auth.uid());

-- message_reactions
CREATE POLICY "Members view reactions" ON message_reactions
    FOR SELECT USING (
        message_id IN (
            SELECT cm.id FROM chat_messages cm
            JOIN chat_members mb ON mb.channel_id = cm.channel_id
            WHERE mb.user_id = auth.uid()
        )
    );

CREATE POLICY "Members manage own reactions" ON message_reactions
    FOR ALL USING (user_id = auth.uid());

-- typing_status
CREATE POLICY "Members view typing" ON typing_status
    FOR SELECT USING (
        channel_id IN (SELECT channel_id FROM chat_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users manage own typing" ON typing_status
    FOR ALL USING (user_id = auth.uid());

-- ── Enable Realtime (safe: only adds if not already a member) ────
DO $$
DECLARE tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['chat_channels','chat_messages','message_reactions','typing_status','chat_members']
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime' AND tablename = tbl
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
        END IF;
    END LOOP;
END;
$$;

-- ── Notification trigger for new DM messages ────────────────────
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_channel       chat_channels%ROWTYPE;
    v_sender_name   text;
    v_member        RECORD;
BEGIN
    SELECT * INTO v_channel FROM chat_channels WHERE id = NEW.channel_id;
    SELECT concat(first_name, ' ', last_name) INTO v_sender_name FROM users WHERE id = NEW.sender_id;

    -- Notify all channel members except sender
    FOR v_member IN
        SELECT user_id FROM chat_members
        WHERE channel_id = NEW.channel_id AND user_id != NEW.sender_id
    LOOP
        INSERT INTO notifications (user_id, agency_id, title, message, type, link)
        VALUES (
            v_member.user_id,
            v_channel.agency_id,
            CASE
                WHEN v_channel.channel_type = 'dm' THEN 'New message from ' || v_sender_name
                ELSE 'New message in #' || COALESCE(v_channel.name, 'channel')
            END,
            LEFT(NEW.content, 100),
            'message',
            '/dashboard/chat'
        );
    END LOOP;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_chat_message ON chat_messages;
CREATE TRIGGER on_new_chat_message
    AFTER INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Also enable notifications realtime if not already
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'notifications'
    )
    AND NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END;
$$;
