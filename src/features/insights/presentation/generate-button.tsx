'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

import { generateInsights } from '../application/actions';

interface GenerateButtonProps {
  companyId: string;
  months?: number;
}

export function GenerateButton({ companyId, months = 12 }: GenerateButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastRun, setLastRun] = useState<Date | null>(null);

  function onClick() {
    startTransition(async () => {
      try {
        const result = await generateInsights({ companyId, months });
        setLastRun(new Date());
        if (result.inserted === 0 && result.skipped === 0) {
          toast.info('Nenhum dado financeiro encontrado no período.');
        } else if (result.inserted === 0) {
          toast.info(`Nenhum novo insight — ${result.skipped} já existiam.`);
        } else {
          toast.success(
            `${result.inserted} ${result.inserted === 1 ? 'novo insight' : 'novos insights'}` +
              (result.llmUsed ? ' (com narrativa IA)' : ''),
          );
        }
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao gerar insights.');
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={onClick} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Analisando…
          </>
        ) : (
          <>
            <Sparkles /> Gerar insights
          </>
        )}
      </Button>
      {lastRun && (
        <span className="text-xs text-muted-foreground">
          Última execução: {lastRun.toLocaleTimeString('pt-BR')}
        </span>
      )}
    </div>
  );
}
