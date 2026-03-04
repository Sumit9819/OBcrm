"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export function PaginationControls({ totalItems, pageSize = 20 }: { totalItems: number; pageSize?: number }) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const router = useRouter()

    const currentPage = Number(searchParams.get('page') || '1')
    const totalPages = Math.ceil(totalItems / pageSize)

    if (totalPages <= 1) return null

    const goToPage = (page: number) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('page', String(page))
        router.push(`${pathname}?${params.toString()}`)
    }

    return (
        <div className="flex items-center justify-between py-4 px-2">
            <p className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1}–{Math.min(currentPage * pageSize, totalItems)} of {totalItems}
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => goToPage(currentPage - 1)}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                        page = i + 1
                    } else if (currentPage <= 3) {
                        page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i
                    } else {
                        page = currentPage - 2 + i
                    }
                    return (
                        <Button
                            key={page}
                            variant={page === currentPage ? "default" : "outline"}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => goToPage(page)}
                        >
                            {page}
                        </Button>
                    )
                })}
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    )
}
