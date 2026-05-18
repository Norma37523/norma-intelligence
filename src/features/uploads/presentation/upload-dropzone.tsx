'use client';

import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload, FileSpreadsheet, FileText, X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { cn } from '@/shared/lib/utils';

import { createUpload } from '../application/actions';
import { initialUploadState } from '../application/types';

interface UploadDropzoneProps {
  companyId: string;
}

const ACCEPT = '.csv,.xlsx,.xlsm,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 10 * 1024 * 1024;

export function UploadDropzone({ companyId }: UploadDropzoneProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState(async (
    prev: typeof initialUploadState,
    fd: FormData,
  ) => {
    const result = await createUpload(prev, fd);
    if (result.status === 'success' && result.uploadId) {
      router.push(`/app/uploads/${result.uploadId}`);
    }
    return result;
  }, initialUploadState);

  function pickFile(f: File | null) {
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) return;
    setFile(f);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files[0] ?? null);
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <input type="hidden" name="companyId" value={companyId} />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'group relative grid cursor-pointer place-items-center rounded-xl border-2 border-dashed bg-card p-10 text-center transition-colors',
          isDragOver
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          required
        />

        {file ? (
          <div className="flex w-full max-w-md items-center gap-3 rounded-lg border bg-background p-3 text-left">
            {file.name.toLowerCase().endsWith('.csv') ? (
              <FileText className="size-8 text-primary" />
            ) : (
              <FileSpreadsheet className="size-8 text-primary" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{file.name}</p>
              <p className="text-xs text-muted-foreground">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); pickFile(null); }}
              className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label="Remover arquivo"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Upload className="size-5" />
            </div>
            <p className="text-sm font-medium">Arraste e solte o arquivo aqui</p>
            <p className="text-xs text-muted-foreground">
              CSV ou XLSX · até 10 MB · ou clique para escolher
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="kind">Tipo de arquivo</Label>
        <select
          id="kind"
          name="kind"
          defaultValue="bank_statement_csv"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="bank_statement_csv">Extrato bancário (CSV)</option>
          <option value="bank_statement_pdf">Extrato bancário (PDF)</option>
          <option value="journal_entries">Razão / lançamentos contábeis</option>
          <option value="other">Outro</option>
        </select>
      </div>

      {state.status === 'error' && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}

      <Button type="submit" disabled={!file || pending} className="w-full">
        {pending ? (
          <>
            <Loader2 className="animate-spin" /> Enviando…
          </>
        ) : (
          <>
            <Upload /> Enviar arquivo
          </>
        )}
      </Button>
    </form>
  );
}
