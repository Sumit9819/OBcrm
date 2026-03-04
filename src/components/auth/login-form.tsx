"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight, Loader2, UserPlus, LogIn } from "lucide-react"
import { login, signup } from "@/app/auth/actions"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
    const [mode, setMode] = useState<"login" | "signup">("login")
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        setError(null)

        const result = mode === "login"
            ? await login(formData)
            : await signup(formData)

        if (result?.error) {
            setError(result.error)
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <Card className="border-0 shadow-2xl shadow-primary/5 bg-background/60 backdrop-blur-xl w-full max-w-md">
                <CardHeader className="space-y-1 pb-8">
                    <div className="flex items-center justify-center mb-6">
                        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                            <span className="text-primary-foreground font-bold text-xl">G</span>
                        </div>
                    </div>
                    <CardTitle className="text-2xl text-center font-semibold tracking-tight">
                        {mode === "login" ? "Welcome back" : "Create an account"}
                    </CardTitle>
                    <CardDescription className="text-center">
                        {mode === "login"
                            ? "Enter your credentials to access your agency workspace"
                            : "Join GrowthCRM and start managing your agency today"}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form action={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={mode}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-4"
                            >
                                {mode === "signup" && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First name</Label>
                                            <Input
                                                id="firstName"
                                                name="firstName"
                                                placeholder="John"
                                                required
                                                className="bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 transition-all h-11"
                                                disabled={loading}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last name</Label>
                                            <Input
                                                id="lastName"
                                                name="lastName"
                                                placeholder="Doe"
                                                required
                                                className="bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 transition-all h-11"
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="m@example.com"
                                        required
                                        className="bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 transition-all h-11"
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        {mode === "login" && (
                                            <a
                                                href="#"
                                                className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                                            >
                                                Forgot password?
                                            </a>
                                        )}
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="••••••••"
                                        required
                                        className="bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/30 transition-all h-11"
                                        disabled={loading}
                                    />
                                </div>
                            </motion.div>
                        </AnimatePresence>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-md"
                            >
                                {error}
                            </motion.div>
                        )}

                        <div className="space-y-4">
                            <Button disabled={loading} className="w-full h-11 text-base group relative overflow-hidden transition-all shadow-md">
                                <span className="relative z-10 flex items-center justify-center gap-2">
                                    {loading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            {mode === "login" ? "Signing in..." : "Creating account..."}
                                        </>
                                    ) : (
                                        <>
                                            {mode === "login" ? (
                                                <>
                                                    Sign In
                                                    <LogIn className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                                                </>
                                            ) : (
                                                <>
                                                    Create Account
                                                    <UserPlus className="h-4 w-4 transition-transform group-hover:scale-110" />
                                                </>
                                            )}
                                        </>
                                    )}
                                </span>
                                <div className="absolute inset-0 bg-primary/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-in-out" />
                            </Button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMode(mode === "login" ? "signup" : "login")
                                        setError(null)
                                    }}
                                    className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium decoration-primary/30 hover:underline underline-offset-4"
                                    disabled={loading}
                                >
                                    {mode === "login"
                                        ? "Don't have an account? Sign up"
                                        : "Already have an account? Sign in"}
                                </button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    )
}
