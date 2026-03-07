import * as React from "react"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export interface PipelineStepperProps extends React.HTMLAttributes<HTMLDivElement> {
    currentStatus: string;
    statuses: string[];
    onStatusChange: (status: string) => void;
    disabled?: boolean;
}

export function PipelineStepper({
    currentStatus,
    statuses,
    onStatusChange,
    disabled = false,
    className,
    ...props
}: PipelineStepperProps) {
    const currentIndex = statuses.indexOf(currentStatus);

    return (
        <div className={cn("flex w-full items-center justify-between pb-8 pt-2 px-4", className)} {...props}>
            {statuses.map((status, index) => {
                const isCompleted = currentIndex > index;
                const isCurrent = currentIndex === index;
                const isUpcoming = currentIndex < index;
                const isLast = index === statuses.length - 1;

                return (
                    <React.Fragment key={status}>
                        {/* The Node */}
                        <div className="relative flex flex-col items-center shrink-0">
                            <div
                                className={cn(
                                    "z-10 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-full border-2 transition-all duration-300 bg-background",
                                    isCompleted && "border-primary bg-primary text-primary-foreground",
                                    isCurrent && "border-primary text-primary ring-4 ring-primary/20",
                                    isUpcoming && "border-muted-foreground/30 text-muted-foreground",
                                    disabled && "opacity-50",
                                    (isCurrent || isCompleted) && isLast && "bg-emerald-500 border-emerald-500 text-emerald-50 shadow-[0_0_15px_rgba(16,185,129,0.5)] ring-emerald-500/20"
                                )}
                            >
                                {isCompleted || (isCurrent && isLast) ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    <div className={cn(
                                        "h-2.5 w-2.5 rounded-full transition-colors duration-300",
                                        isCurrent ? "bg-primary" : "bg-transparent"
                                    )} />
                                )}
                            </div>
                            <span className={cn(
                                "absolute top-10 whitespace-nowrap text-[10px] sm:text-xs font-medium transition-colors",
                                isCurrent && "text-foreground font-bold scale-105",
                                isCompleted && "text-primary/80",
                                isUpcoming && "text-muted-foreground",
                                isCurrent && isLast && "text-emerald-600"
                            )}>
                                {status}
                            </span>
                        </div>

                        {/* The Line */}
                        {!isLast && (
                            <div className="flex-1 px-1 sm:px-2">
                                <div className={cn(
                                    "h-1.5 w-full rounded-full transition-colors duration-500",
                                    currentIndex > index ? "bg-primary" : "bg-muted"
                                )} />
                            </div>
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}
