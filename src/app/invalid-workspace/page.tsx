import Link from 'next/link'

export default function InvalidWorkspacePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
            {/* Background grid */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
                    backgroundSize: '50px 50px',
                }}
            />

            <div className="relative z-10 max-w-md w-full text-center">
                {/* Icon */}
                <div className="flex justify-center mb-8">
                    <div className="relative">
                        <div className="w-24 h-24 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <svg
                                className="w-12 h-12 text-red-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                                />
                            </svg>
                        </div>
                        <div className="absolute -inset-2 rounded-2xl bg-red-500/5 blur-xl" />
                    </div>
                </div>

                {/* Heading */}
                <h1 className="text-3xl font-bold text-white mb-3">
                    Workspace Not Found
                </h1>
                <p className="text-slate-400 text-base mb-2 leading-relaxed">
                    This workspace doesn&apos;t exist or has been deactivated.
                </p>
                <p className="text-slate-500 text-sm mb-10">
                    Please check the URL or contact your administrator.
                </p>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-10" />

                {/* Error code */}
                <div className="inline-flex items-center gap-2 bg-slate-800/50 border border-slate-700/50 rounded-full px-4 py-1.5 text-xs text-slate-500 font-mono mb-8">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    Error: WORKSPACE_NOT_FOUND
                </div>

                <p className="text-slate-600 text-xs mt-4">
                    If you believe this is a mistake, contact{' '}
                    <Link
                        href="mailto:support@growthcrm.app"
                        className="text-slate-400 hover:text-white transition-colors underline underline-offset-4"
                    >
                        support@growthcrm.app
                    </Link>
                </p>
            </div>
        </div>
    )
}
