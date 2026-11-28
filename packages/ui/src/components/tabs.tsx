"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "../lib/utils"

/**
 * Abas com movimento (Espectro 2), sem JS de animação:
 * - um indicador único desliza até a aba ativa (clip-path com mola em CSS);
 * - o conteúdo novo entra pelo lado da aba escolhida, só depois do primeiro
 *   clique: no carregamento da página nada anima (LCP).
 * Antes da hidratação a aba ativa mostra o próprio fundo/traço; quando o
 * indicador está posicionado (`data-indicator="ready"`), ele assume.
 */

function Tabs({
  className,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const rootRef = React.useRef<HTMLDivElement>(null)

  const handleValueChange = (value: string) => {
    const root = rootRef.current
    if (root) {
      // Direção da troca (para o conteúdo entrar pelo lado certo). Escrito
      // direto no DOM antes do render do conteúdo novo: sem re-render extra.
      const triggers = Array.from(
        root.querySelectorAll<HTMLElement>('[data-slot="tabs-trigger"]')
      ).filter((trigger) => trigger.closest('[data-slot="tabs"]') === root)
      const from = triggers.findIndex((trigger) => trigger.dataset.state === "active")
      const to = triggers.findIndex((trigger) => trigger.dataset.value === value)
      root.dataset.direction = to >= from ? "forward" : "back"
      root.dataset.interacted = ""
    }
    onValueChange?.(value)
  }

  return (
    <TabsPrimitive.Root
      ref={rootRef}
      data-slot="tabs"
      className={cn("group/tabs flex flex-col gap-4", className)}
      onValueChange={handleValueChange}
      {...props}
    />
  )
}

type TabsVariant = "pill" | "underline"

const TabsVariantContext = React.createContext<TabsVariant>("pill")

/**
 * Posiciona o indicador na aba ativa via variáveis CSS (`--tab-left`,
 * `--tab-right`). Observa a troca de aba e o tamanho da lista. A transição só
 * liga depois da primeira posição, para não deslizar no carregamento.
 */
function useTabIndicator(
  listRef: React.RefObject<HTMLDivElement | null>,
  indicatorRef: React.RefObject<HTMLSpanElement | null>
) {
  React.useLayoutEffect(() => {
    const list = listRef.current
    const indicator = indicatorRef.current
    if (!list || !indicator) return

    let frame = 0
    const update = () => {
      const active = list.querySelector<HTMLElement>(
        '[data-slot="tabs-trigger"][data-state="active"]'
      )
      if (!active) {
        delete list.dataset.indicator
        return
      }
      const width = list.scrollWidth
      const left = active.offsetLeft
      const right = width - (left + active.offsetWidth)
      indicator.style.width = `${width}px`
      indicator.style.setProperty("--tab-left", `${left}px`)
      indicator.style.setProperty("--tab-right", `${Math.max(right, 0)}px`)
      if (list.dataset.indicator !== "ready") {
        list.dataset.indicator = "ready"
        // Liga a transição só no próximo frame (a primeira posição é instantânea).
        frame = requestAnimationFrame(() => {
          indicator.dataset.animate = ""
        })
      }
    }

    update()
    const mutations = new MutationObserver(update)
    mutations.observe(list, { subtree: true, attributes: true, attributeFilter: ["data-state"] })
    const resize = new ResizeObserver(update)
    resize.observe(list)
    return () => {
      cancelAnimationFrame(frame)
      mutations.disconnect()
      resize.disconnect()
    }
  }, [listRef, indicatorRef])
}

/**
 * `pill` (padrão): segmentos em pílula, para alternar visões curtas.
 * `underline`: abas de página (vitrine, listas longas), só um traço embaixo.
 */
function TabsList({
  className,
  variant = "pill",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  const listRef = React.useRef<HTMLDivElement>(null)
  const indicatorRef = React.useRef<HTMLSpanElement>(null)
  useTabIndicator(listRef, indicatorRef)

  return (
    <TabsVariantContext.Provider value={variant}>
      <TabsPrimitive.List
        ref={listRef}
        data-slot="tabs-list"
        data-variant={variant}
        className={cn(
          "group/tabs-list relative",
          variant === "underline"
            ? "flex w-full items-end gap-8 overflow-x-auto border-b border-border"
            : "flex w-full items-center gap-1 rounded-full border border-border bg-muted p-1",
          className
        )}
        {...props}
      >
        <span
          ref={indicatorRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-0 opacity-0 group-data-[indicator=ready]/tabs-list:opacity-100",
            "[clip-path:inset(0_var(--tab-right,100%)_0_var(--tab-left,0px)_round_9999px)]",
            "data-[animate]:transition-[clip-path] data-[animate]:duration-[420ms] data-[animate]:ease-spring",
            variant === "underline"
              ? "bottom-0 h-0.5 bg-foreground"
              : "inset-y-1 bg-secondary"
          )}
        />
        {children}
      </TabsPrimitive.List>
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
      data-value={props.value}
      className={cn(
        "relative inline-flex cursor-pointer items-center justify-center gap-1.5 text-muted-foreground outline-none transition-colors duration-200 hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
        "focus-visible:ring-ring focus-visible:ring-[3px]",
        variant === "underline"
          ? "-mb-px shrink-0 border-b-2 border-transparent pb-3 text-base font-medium data-[state=active]:border-foreground data-[state=active]:text-foreground group-data-[indicator=ready]/tabs-list:data-[state=active]:border-transparent"
          : "flex-1 rounded-full px-3 py-2 text-sm font-semibold data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground group-data-[indicator=ready]/tabs-list:data-[state=active]:bg-transparent",
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
        "outline-none",
        // Só anima depois do primeiro clique (a aba padrão aparece pronta no
        // carregamento), entrando pelo lado da aba escolhida.
        "group-data-[interacted]/tabs:data-[state=active]:animate-in group-data-[interacted]/tabs:data-[state=active]:fade-in-0 group-data-[interacted]/tabs:data-[state=active]:duration-300 group-data-[interacted]/tabs:data-[state=active]:ease-spring-soft",
        "group-data-[direction=forward]/tabs:slide-in-from-right-6 group-data-[direction=back]/tabs:slide-in-from-left-6",
        className
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
