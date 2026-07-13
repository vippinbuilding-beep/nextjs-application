"use client";

import { useLayoutEffect, useRef, useState } from "react";

import { cn } from "../lib/utils";

interface AnimatedHeightProps {
    children: React.ReactNode;
    className?: string;
}

/**
 * Smoothly animates its own height whenever the height of its content
 * changes (e.g. switching tabs that render lists of different sizes),
 * instead of resizing abruptly.
 */
export function AnimatedHeight({ children, className }: AnimatedHeightProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [height, setHeight] = useState<number | "auto">("auto");

    useLayoutEffect(() => {
        const node = contentRef.current;
        if (!node) return;

        setHeight(node.getBoundingClientRect().height);

        const observer = new ResizeObserver(([entry]) => {
            if (entry) setHeight(entry.target.getBoundingClientRect().height);
        });
        observer.observe(node);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            style={{ height }}
            className={cn(
                // Negative margin cancels out the inner padding so this doesn't shift
                // surrounding layout; the padding just gives hover effects (lift,
                // growing shadow) room to breathe instead of being clipped by
                // `overflow-hidden`.
                "-m-2 overflow-hidden transition-[height] duration-300 ease-in-out",
                className
            )}
        >
            <div ref={contentRef} className="p-2">
                {children}
            </div>
        </div>
    );
}
