import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

interface LoadingProps {
    className?: string;
}

export function Loading({ className }: LoadingProps) {
    return (
        <Loader2 className={cn("animate-spin", className)} />
    );
}