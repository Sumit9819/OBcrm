import type { OpenNextConfig } from "@opennextjs/cloudflare";

const config: OpenNextConfig = {
    default: {
        override: {
            wrapper: "cloudflare-node",
            converter: "edge",
            // Use the Cloudflare cache adapter (optional — comment out if not using KV cache)
            // incrementalCache: "dummy",
            // tagCache: "dummy",
            // queue: "dummy",
        },
    },

    middleware: {
        external: true,
        override: {
            wrapper: "cloudflare-edge",
            converter: "edge",
        },
    },
};

export default config;
