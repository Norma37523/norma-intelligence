import Link from 'next/link';
import { ArrowRight, BarChart3, LineChart, Sparkles } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-b from-background via-background to-muted/40">
      {/* Decorative blur */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_at_top,theme(colors.norma.teal.100)_0%,transparent_70%)] dark:bg-[radial-gradient(ellipse_at_top,theme(colors.norma.teal.900)_0%,transparent_70%)]" />

      <header className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="font-semibold tracking-tight">Norma Intelligence</span>
        </div>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">Começar</Link>
          </Button>
        </nav>
      </header>

      <section className="container flex flex-col items-center py-24 text-center">
        <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
          Plataforma de inteligência financeira
        </span>
        <h1 className="mt-6 max-w-3xl text-balance text-5xl font-semibold tracking-tight md:text-6xl">
          Decisões financeiras com a <span className="text-primary">precisão da Norma</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-balance text-lg text-muted-foreground">
          DRE gerencial em tempo real, insights automáticos e forecast — tudo em um painel
          desenhado para quem decide.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/signup">
              Começar agora <ArrowRight />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">Já tenho conta</Link>
          </Button>
        </div>

        <div className="mt-24 grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<BarChart3 className="size-5" />}
            title="DRE Gerencial"
            description="Receitas, custos e margens organizados em hierarquia. Drill-down até o lançamento."
          />
          <FeatureCard
            icon={<Sparkles className="size-5" />}
            title="Insights automáticos"
            description="Variações relevantes, anomalias e narrativas explicando o que mudou — e por quê."
          />
          <FeatureCard
            icon={<LineChart className="size-5" />}
            title="Forecast"
            description="Projeções com cenários (baseline, otimista, pessimista) e intervalos de confiança."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card/60 p-6 text-left backdrop-blur-sm transition-colors hover:bg-card">
      <div className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
