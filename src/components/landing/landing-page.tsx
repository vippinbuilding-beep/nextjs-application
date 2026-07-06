"use client";

import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  FileText,
  Heart,
  Infinity as InfinityIcon,
  Link2,
  Lock,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteLogo } from "@/components/ui/site-logo";
import { cn } from "@/lib/utils";

import { LandingNavbar } from "./landing-navbar";
import { LayoutBackground } from "../ui/layout-background";

const CREATOR_FEATURES = [
  {
    icon: Store,
    title: "Sua própria vitrine",
    description:
      "Um perfil público com link exclusivo (vippin.com.br/@você) para reunir todas as suas aulas e materiais em um só lugar.",
  },
  {
    icon: Wallet,
    title: "Receba direto no Pix",
    description:
      "Configure sua chave Pix no cadastro e transforme seu conhecimento em renda sem intermediários complicados.",
  },
  {
    icon: PlayCircle,
    title: "Aulas e documentos",
    description:
      "Faça upload de vídeos e PDFs com segurança. Seus arquivos ficam protegidos e só quem comprou tem acesso.",
  },
  {
    icon: BarChart3,
    title: "Preços que você define",
    description:
      "Você tem o controle: defina o valor de cada produto e ofereça o conteúdo do seu jeito, do gratuito ao premium.",
  },
] as const;

const CONSUMER_FEATURES = [
  {
    icon: PlayCircle,
    title: "Aprenda no seu ritmo",
    description:
      "Assista às aulas quando e quantas vezes quiser. O player faz seek e buffer direto, sem travar.",
  },
  {
    icon: FileText,
    title: "Materiais para baixar",
    description:
      "Baixe documentos e apostilas que acompanham os cursos e estude offline sempre que precisar.",
  },
  {
    icon: Heart,
    title: "Apoie quem você admira",
    description:
      "Compre direto do criador que te inspira e ajude quem produz conteúdo de qualidade a continuar.",
  },
  {
    icon: BadgeCheck,
    title: "Acesso garantido",
    description:
      "Depois de comprar, o conteúdo é seu. Acesse a qualquer momento pelo perfil do criador.",
  },
] as const;

const STEPS = [
  {
    number: "01",
    title: "Crie sua conta",
    description:
      "Entre com o Google em segundos. Escolha se quer criar conteúdo ou apenas consumir.",
  },
  {
    number: "02",
    title: "Monte seu perfil",
    description:
      "Criadores personalizam a vitrine e publicam aulas e documentos. Tudo com poucos cliques.",
  },
  {
    number: "03",
    title: "Compartilhe e venda",
    description:
      "Divulgue seu link exclusivo. Sua audiência compra e você recebe. Simples assim.",
  },
] as const;

const TRUST_BADGES = [
  { icon: ShieldCheck, label: "Arquivos protegidos" },
  { icon: Lock, label: "Login seguro com Google" },
  { icon: Zap, label: "Pagamento via Pix" },
  { icon: InfinityIcon, label: "Acesso vitalício" },
] as const;

/** Elemento decorativo estático de fundo. */
function DecorShape({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute", className)} />
  );
}

export function LandingPage() {
  return (
    <LayoutBackground
      element="div"
      dotsOpacity={0.1}
      className="overflow-x-clip text-foreground">
      <LandingNavbar />

      {/* HERO */}
      <section className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4 pt-28 pb-20">
        {/* Formas decorativas de fundo */}
        <DecorShape className="lg:block hidden left-[6%] top-[22%] size-24 -rotate-12 rounded-3xl border-2 border-border bg-primary shadow-cartoon sm:size-32" />
        <DecorShape className="lg:block hidden right-[8%] top-[18%] size-16 rounded-full border-2 border-border bg-[#4dd2ff] shadow-cartoon-sm sm:size-24" />
        <DecorShape className="lg:block hidden left-[14%] bottom-[16%] size-14 rounded-full border-2 border-border bg-[#9b5de5] shadow-cartoon-sm sm:size-20" />
        <DecorShape className="lg:block hidden right-[14%] bottom-[20%] size-20 rotate-10 rounded-2xl border-2 border-border bg-[#ff4d4d] shadow-cartoon sm:size-24" />
        <DecorShape className="lg:block hidden left-[42%] top-[12%] size-12 rotate-45 border-2 border-border bg-primary shadow-cartoon-sm" />

        <div className="relative z-10 flex w-full max-w-3xl flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-4 py-1.5 text-sm font-bold shadow-cartoon-sm">
            <Sparkles className="size-4" />
            A plataforma de quem cria e de quem aprende
          </span>

          <h1 className="text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            Transforme seu{" "}
            <span className="relative inline-block">
              <span className="relative z-10">conhecimento</span>
              <span className="absolute inset-x-0 bottom-1 z-0 h-4 -rotate-1 bg-primary sm:h-5" />
            </span>{" "}
            em renda
          </h1>

          <p className="max-w-xl text-pretty text-lg font-medium text-muted-foreground sm:text-xl">
            No Vippin, criadores vendem aulas e materiais direto para sua audiência,
            e quem quer aprender encontra conteúdo de qualidade em um só lugar.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/login?role=creator">
                <Rocket className="size-5" />
                Começar como criador
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
              <Link href="explore">
                Explorar conteúdos
                <ArrowRight className="size-5" />
              </Link>
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST_BADGES.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
              >
                <badge.icon className="size-4" />
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div
          aria-hidden
          className="absolute bottom-0 lg:bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-muted-foreground"
        >
          <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-border p-1">
            <div className="h-2 w-1 rounded-full bg-border" />
          </div>
        </div>
      </section>

      {/* DOIS LADOS */}
      <section className="relative mx-auto w-full max-w-5xl px-4 py-16 sm:py-24">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
            Uma plataforma, dois mundos
          </span>
          <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Feito para os dois lados da mesa
          </h2>
          <p className="max-w-2xl text-pretty text-lg font-medium text-muted-foreground">
            Seja você quem ensina ou quem quer aprender, o Vippin conecta os dois
            com uma experiência simples, bonita e segura.
          </p>
        </div>

        {/* CRIADORES */}
        <div className="mt-14 flex flex-col gap-8">
          <div className="flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-4 py-1.5 text-sm font-bold shadow-cartoon-sm">
              <Rocket className="size-4" />
              Para criadores
            </span>
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Monte seu negócio de conteúdo
            </h3>
            <p className="max-w-2xl text-pretty text-lg font-medium text-muted-foreground">
              Tudo que você precisa para publicar, proteger e vender o que você sabe.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {CREATOR_FEATURES.map((feature) => (
              <Card key={feature.title} className="gap-4 transition-transform hover:-translate-y-1">
                <CardHeader className="gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-primary shadow-cartoon-sm">
                    <feature.icon className="size-6" />
                  </span>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CONSUMIDORES */}
        <div className="mt-20 flex flex-col gap-8">
          <div className="flex flex-col items-start gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-[#4dd2ff] px-4 py-1.5 text-sm font-bold shadow-cartoon-sm">
              <Heart className="size-4" />
              Para quem quer aprender
            </span>
            <h3 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Aprenda com quem você admira
            </h3>
            <p className="max-w-2xl text-pretty text-lg font-medium text-muted-foreground">
              Encontre aulas e materiais dos criadores que você segue e evolua no
              seu tempo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {CONSUMER_FEATURES.map((feature) => (
              <Card key={feature.title} className="gap-4 transition-transform hover:-translate-y-1">
                <CardHeader className="gap-3">
                  <span className="flex size-12 items-center justify-center rounded-xl border-2 border-border bg-[#4dd2ff] shadow-cartoon-sm">
                    <feature.icon className="size-6" />
                  </span>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section className="relative overflow-hidden py-16 sm:py-24">
        <DecorShape className="lg:block hidden right-[6%] top-[45%] size-28 rounded-full border-2 border-border bg-primary/40 shadow-cartoon-sm" />
        <DecorShape className="lg:block hidden left-[4%] bottom-[10%] size-20 rounded-2xl border-2 border-border bg-[#9b5de5]/40" />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
              Simples do começo ao fim
            </span>
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Como funciona
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.number} className="relative gap-4 overflow-hidden">
                <span className="pointer-events-none absolute -right-2 -top-4 text-7xl font-bold text-primary/40">
                  {step.number}
                </span>
                <CardHeader className="gap-2">
                  <CardTitle className="text-xl">{step.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:pb-28">
        <Card className="relative overflow-hidden bg-primary shadow-cartoon-xl">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(var(--border)_1.5px,transparent_1.5px)] bg-size-[24px_24px] opacity-30"
          />
          <CardContent className="relative z-10 flex flex-col items-center gap-6 px-6 py-14 text-center sm:py-20">
            <span className="flex size-14 items-center justify-center rounded-2xl border-2 border-border bg-background shadow-cartoon">
              <Sparkles className="size-7" />
            </span>
            <h2 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Pronto para começar?
            </h2>
            <p className="max-w-xl text-pretty text-lg font-semibold">
              Crie sua conta gratuitamente e comece a vender ou a aprender hoje mesmo.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                <Link href="/login?role=creator">
                  <Rocket className="size-5" />
                  Quero criar conteúdo
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                <Link href="explore">
                  <Link2 className="size-5" />
                  Quero aprender
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FOOTER */}
      <footer className="border-t-2 border-border bg-background">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <SiteLogo size={32} nameClassName="text-lg" />
          <p className="text-sm font-medium text-muted-foreground">
            © {new Date().getFullYear()} Vippin. Conhecimento que gera renda.
          </p>
        </div>
      </footer>
    </LayoutBackground>
  );
}
