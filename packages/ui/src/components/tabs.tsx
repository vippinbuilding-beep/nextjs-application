"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "../lib/utils"

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

type TabsVariant = "pill" | "underline"

const TabsVariantContext = React.createContext<TabsVariant>("pill")

/**
 * `pill` (padrão): segmentos em pílula, para alternar visões curtas.
 * `underline`: abas de página (vitrine, listas longas), só um traço embaixo.
 */
function TabsList({
  className,
  variant = "pill",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          variant === "underline"
            ? "flex w-full items-end gap-8 overflow-x-auto border-b border-border"
            : "flex w-full items-center gap-1 rounded-full border border-border bg-muted p-1",
          className
        )}
        {...props}
      />
    </TabsVariantContext.Provider>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const variant = React.useContext(TabsVariantContext)
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-1.5 text-muted-foreground outline-none transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-ring focus-visible:ring-[3px]",
        variant === "underline"
          ? "-mb-px shrink-0 border-b-2 border-transparent pb-3 text-base font-medium data-[state=active]:border-foreground data-[state=active]:text-foreground"
          : "flex-1 rounded-full px-3 py-2 text-sm font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground data-[state=active]:shadow-elevated-sm",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "outline-none data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-1 data-[state=active]:duration-300",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
