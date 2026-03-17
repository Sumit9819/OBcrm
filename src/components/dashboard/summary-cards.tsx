"use client"

import { motion } from "framer-motion"
import {
    ArrowUpRight,
    Users,
    MessageSquare,
    Calendar,
    TrendingUp,
    CheckCircle2,
    AlertCircle,
    UserPlus,
    FileText,
    DollarSign,
    Target,
    Briefcase,
    Phone,
    CheckSquare
} from "lucide-react"
import Link from "next/link"

// Icon mapping to fix serialization issues between Server and Client components
const ICON_MAP = {
    users: Users,
    messages: MessageSquare,
    calendar: Calendar,
    trending: TrendingUp,
    check: CheckCircle2,
    alert: AlertCircle,
    plus: UserPlus,
    file: FileText,
    dollar: DollarSign,
    target: Target,
    briefcase: Briefcase,
    phone: Phone,
    checksquare: CheckSquare
} as const

type IconName = keyof typeof ICON_MAP

interface StatCardProps {
    title: string
    value: string
    icon: IconName
    href: string
    delay?: number
}

export function StatCard({ title, value, icon, href, delay = 0 }: StatCardProps) {
    const Icon = ICON_MAP[icon] || Target

    return (
        <Link href={href} className="block outline-none">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    ease: [0.23, 1, 0.32, 1], // Custom easing for premium feel
                    delay: delay
                }}
                whileHover={{ y: -4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-2xl bg-white/50 backdrop-blur-xl border border-slate-200/60 p-5 shadow-sm transition-all hover:bg-white hover:border-slate-300 hover:shadow-md"
            >
                {/* Subtle gradient background effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-purple-50/0 opacity-0 group-hover:from-indigo-50/50 group-hover:to-purple-50/40 group-hover:opacity-100 transition-opacity duration-500 ease-out" />

                <div className="relative flex flex-col gap-4 z-10">
                    <div className="flex justify-between items-center text-slate-500">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-indigo-600 transition-colors duration-300">
                            {title}
                        </p>
                        <div className="p-2 rounded-lg bg-slate-50 group-hover:bg-indigo-50 transition-colors duration-300">
                            <Icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-colors duration-300" />
                        </div>
                    </div>

                    <div className="flex items-end justify-between">
                        <h4 className="text-3xl font-extrabold tracking-tight text-slate-800 tabular-nums">
                            {value}
                        </h4>
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 opacity-0 group-hover:opacity-100 group-hover:bg-indigo-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                            <ArrowUpRight className="h-3.5 w-3.5 text-indigo-700" strokeWidth={2.5} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    )
}

interface SummaryCardsProps {
    stats: Array<{
        title: string
        value: string
        icon: IconName
        href: string
    }>
    className?: string
}

export function SummaryCards({ stats, className }: SummaryCardsProps) {
    return (
        <div className={className || "grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6"}>
            {stats.map((stat, i) => (
                <StatCard
                    key={stat.title + i}
                    {...stat}
                    delay={i * 0.1} // Staggered animation
                />
            ))}
        </div>
    )
}
