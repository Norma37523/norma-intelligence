import type { Metadata, Viewport } from 'next';

import { ThemeProvider } from '@/shared/components/layout/theme-provider';
import { Toaster } from '@/shared/components/ui/toaster';

import { clientEnv } from '@/shared/config/env';

import './globals.css';

export const metadata: Metadata = {
  title: {
    default: clientEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    'Plataforma de inteligência financeira da Norma Contábil — DRE gerencial, insights automáticos e forecast.',
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL),
  applicationName: clientEnv.NEXT_PUBLIC_APP_NAME,
  authors: [{ name: 'Norma Contábil' }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0B1220' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
