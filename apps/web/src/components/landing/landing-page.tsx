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
  Store,
  Wallet,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@vippin/ui/button";
import { ScreenLoading } from "@vippin/ui/screen-loading";
import { useCurrentReturnPath } from "@/hooks/use-current-return-path";
import { buildLoginUrl } from "@/lib/auth/login-url";
import { SiteLogo } from "@/components/ui/site-logo";

import { LandingNavbar } from "./landing-navbar";
import { InstallAppButton } from "@/components/pwa/install-app-button";
import { LayoutBackground } from "@vippin/ui/layout-background";
import { ContactEmailLink } from "@/components/ui/contact-email-link";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationAndWebsiteJsonLd } from "@/lib/structured-data";

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
      "Pause, volte e pule quando quiser. Assista quantas vezes for necessário e continue de onde parou.",
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

/** Coluna de recursos (criadores ou compradores): lista aberta, sem cards. */
function FeatureColumn({
  title,
  lead,
  features,
}: {
  title: string;
  lead: string;
  features: readonly { icon: React.ComponentType<{ className?: string }>; title: string; description: string }[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h3 className="text-2xl font-semibold tracking-tight">{title}</h3>
        <p className="text-muted-foreground max-w-[52ch]">{lead}</p>
      </div>
      <ul className="flex flex-col gap-7">
        {features.map((feature) => (
          <li key={feature.title} className="flex gap-4">
            <span className="bg-muted flex size-11 shrink-0 items-center justify-center rounded-xl">
              <feature.icon className="size-5" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="font-semibold">{feature.title}</span>
              <span className="text-muted-foreground leading-relaxed">{feature.description}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingPage() {
  const returnPath = useCurrentReturnPath();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.refresh();
    }
  }, [loading, user, router]);

  // The server only renders this page for logged-out visitors, so while the
  // session loads we show the landing itself (crawlers and first paint get
  // the content). The loader is only for someone who just logged in here.
  if (!loading && user) {
    return <ScreenLoading />;
  }

  return (
    <LayoutBackground
      element="div"
      className="overflow-x-clip text-foreground">
      <JsonLd data={organizationAndWebsiteJsonLd()} />
      <LandingNavbar />

      {/* HERO */}
      <section className="relative overflow-hidden px-5 pt-36 pb-24 sm:px-8 sm:pt-44 sm:pb-32">
        <div aria-hidden className="aurora-glow pointer-events-none absolute inset-0 -z-10" />
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-8">
          <h1 className="max-w-4xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.035em] sm:text-6xl md:text-7xl">
            Transforme seu conhecimento em renda
          </h1>
          <p className="text-muted-foreground max-w-[56ch] text-pretty text-lg leading-relaxed sm:text-xl">
            No Vippin, criadores vendem aulas e materiais direto para sua audiência,
            e quem quer aprender encontra conteúdo de qualidade em um só lugar.
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href={buildLoginUrl({ role: "creator", next: returnPath })}>
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
          <InstallAppButton className="max-w-xs" />
          <ul className="text-muted-foreground flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            {TRUST_BADGES.map((badge) => (
              <li key={badge.label} className="inline-flex items-center gap-2">
                <badge.icon className="text-ring size-4" />
                {badge.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* DOIS LADOS */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <div className="flex max-w-3xl flex-col gap-4">
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Feito para os dois lados da mesa
          </h2>
          <p className="text-muted-foreground max-w-[60ch] text-lg leading-relaxed">
            Seja você quem ensina ou quem quer aprender, o Vippin conecta os dois
            com uma experiência simples, bonita e segura.
          </p>
        </div>

        <div className="mt-16 grid gap-16 lg:grid-cols-2 lg:gap-20">
          <FeatureColumn
            title="Para criadores"
            lead="Tudo que você precisa para publicar, proteger e vender o que você sabe."
            features={CREATOR_FEATURES}
          />
          <FeatureColumn
            title="Para quem quer aprender"
            lead="Encontre aulas e materiais dos criadores que você segue e evolua no seu tempo."
            features={CONSUMER_FEATURES}
          />
        </div>
      </section>

      {/* COMO FUNCIONA (sequência real: números fazem sentido aqui) */}
      <section className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Como funciona</h2>
        <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, index) => (
            <li key={step.number} className="border-border flex flex-col gap-3 border-t pt-6">
              <span className="text-muted-foreground text-sm font-medium">Passo {index + 1}</span>
              <h3 className="text-xl font-semibold">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* CTA FINAL */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8 sm:pb-32">
        <div className="bg-card shadow-surface relative overflow-hidden rounded-[32px] px-6 py-16 sm:px-14 sm:py-20">
          <div aria-hidden className="aurora-glow pointer-events-none absolute inset-0" />
          <div className="relative flex max-w-2xl flex-col items-start gap-6">
            <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
              Pronto para começar?
            </h2>
            <p className="text-muted-foreground text-lg">
              Crie sua conta gratuitamente e comece a vender ou a aprender hoje mesmo.
            </p>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={buildLoginUrl({ role: "creator", next: returnPath })}>
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
          </div>
        </div>
      </section>

      <footer className="border-border border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-8 gap-y-4 px-5 py-10 sm:px-8">
          <SiteLogo size={28} nameClassName="text-base" className="w-auto" />
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Vippin. Conhecimento que gera renda.
          </p>
          <div className="sm:ml-auto">
            <ContactEmailLink />
          </div>
        </div>
      </footer>
    </LayoutBackground>
  );
}
