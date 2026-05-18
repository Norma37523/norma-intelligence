'use client';

import { useTransition } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';

import { dismissInsight } from '../application/actions';

export function DismissAction({ insightId }: { insightId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      try {
        await dismissInsight(insightId, null);
        toast.success('Insight arquivado.');
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao arquivar.');
      }
    });
  }

  return (
    <Button onClick={onClick} disabled={pending} variant="ghost" size="sm">
      {pending ? <Loader2 className="animate-spin" /> : <Check />} Arquivar
    </Button>
  );
}
