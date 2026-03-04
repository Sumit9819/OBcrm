import { FileQuestion, HardHat } from "lucide-react"

export default async function ComingSoonPage({ params }: { params: Promise<{ slug: string[] }> }) {
    const { slug } = await params;
    const featureName = slug.join(' / ').replace(/-/g, ' ')

    return (
        <div className="flex h-[calc(100vh-8rem)] w-full items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-sm">
                <div className="flex justify-center flex-col items-center">
                    <div className="bg-primary/10 p-4 rounded-full mb-4">
                        <HardHat className="h-12 w-12 text-primary" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold tracking-tight capitalize">
                    {featureName}
                </h2>
                <p className="text-muted-foreground text-sm">
                    This feature module is currently under construction and will be released in an upcoming update.
                </p>
            </div>
        </div>
    )
}
