import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/30 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6 relative z-10">
                <LoginForm />
            </div>

            {/* Decorative background elements for a premium feel */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute top-[60%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[100px]" />
            </div>
        </div>
    )
}
