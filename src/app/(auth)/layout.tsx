import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Side panel (institucional) */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-secondary p-10 text-secondary-foreground lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,theme(colors.norma.teal.500)_0%,transparent_50%)] opacity-40" />
        <Link href="/" className="relative flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">N</span>
          </div>
          <span className="font-semibold tracking-tight">Norma Intelligence</span>
        </Link>
        <div className="relative space-y-4">
          <p className="text-balance text-2xl font-medium leading-snug">
            “Transformamos números em decisões — com o rigor de uma contabilidade boutique e a
            agilidade de uma plataforma moderna.”
          </p>
          <p className="text-sm text-secondary-foreground/70">Equipe Norma Contábil</p>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
