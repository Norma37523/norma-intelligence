'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Check, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/shared/components/ui/button';
import { commitUpload } from '../application/actions';

export function CommitButton({ uploadId, disabled }: { uploadId: string; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function onClick() {
    startTransition(async () => {
      try {
        const result = await commitUpload(uploadId);
        if (result.errors.length > 0) {
          toast.warning(`Importado com avisos: ${result.errors.length} erros.`);
        } else {
          toast.success(`${result.inserted} lançamentos importados.`);
        }
        setDone(true);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Falha ao importar.');
      }
    });
  }

  if (done) {
    return (
      <Button disabled variant="outline" className="w-full">
        <Check /> Importação concluída
      </Button>
    );
  }

  return (
    <Button onClick={onClick} disabled={disabled || pending} className="w-full">
      {pending ? (
        <>
          <Loader2 className="animate-spin" /> Importando…
        </>
      ) : disabled ? (
        <>
          <AlertTriangle /> Resolva erros para importar
        </>
      ) : (
        'Confirmar importação'
      )}
    </Button>
  );
}
