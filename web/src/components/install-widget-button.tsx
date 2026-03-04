'use client';

/**
 * InstallWidgetButton — botão no header do portal do lojista
 *
 * Abre um Dialog/Sheet com o snippet GTM da loja, sem precisar navegar
 * para uma tela separada. Instalação é uma ação pontual, não um item de menu.
 */
import { useState, useCallback } from 'react';
import { Copy, Check, Puzzle, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

// ---------------------------------------------------------------------------
// Tipos (espelho do installation.service.ts)
// ---------------------------------------------------------------------------

interface SnippetStep {
  title: string;
  description: string;
  code: string;
}

interface InstallationPayload {
  storeId: string;
  storeName: string;
  storeApiKey: string;
  apiUrl: string;
  fullSnippet: string;
  steps: SnippetStep[];
}

// ---------------------------------------------------------------------------
// Hook copiar
// ---------------------------------------------------------------------------

function useCopy(ms = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Copiado!');
      setTimeout(() => setCopiedId(null), ms);
    }).catch(() => toast.error('Falha ao copiar.'));
  }
  return { copiedId, copy };
}

// ---------------------------------------------------------------------------
// Bloco de código compacto
// ---------------------------------------------------------------------------

function Code({ code, copyId, copiedId, onCopy }: {
  code: string; copyId: string; copiedId: string | null;
  onCopy: (t: string, id: string) => void;
}) {
  return (
    <div className="relative group">
      <pre className="bg-muted/30 border border-border rounded-sm px-3 py-3 font-mono text-[10px] leading-relaxed overflow-x-auto text-foreground/80 whitespace-pre max-h-48">
        {code}
      </pre>
      <Button
        variant="ghost" size="icon"
        className="absolute top-1.5 right-1.5 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 border border-border"
        onClick={() => onCopy(code, copyId)}
      >
        {copiedId === copyId
          ? <Check className="h-3 w-3 text-primary" />
          : <Copy className="h-3 w-3 text-muted-foreground" />}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export function InstallWidgetButton({ storeId }: { storeId: string }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState<InstallationPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const { copiedId, copy } = useCopy();

  const load = useCallback(async () => {
    if (payload) return; // cache
    setLoading(true);
    try {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) { toast.error('Sessão expirada.'); return; }
      const res = await fetch(`/api/admin/stores/${storeId}/installation`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json() as InstallationPayload & { error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setPayload(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar snippet.');
    } finally {
      setLoading(false);
    }
  }, [storeId, payload]);

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (v) void load();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-mono text-xs border-border gap-1.5 h-8"
        >
          <Puzzle className="h-3.5 w-3.5" />
          Instalar widget
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm font-bold">
            Instalar widget TryOn
          </DialogTitle>
          <DialogDescription className="font-mono text-xs">
            Adicione o snippet abaixo via <span className="text-foreground">Google Tag Manager</span> na sua loja.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-3 mt-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !payload ? (
          <p className="font-mono text-xs text-muted-foreground mt-4">
            Falha ao carregar.{' '}
            <button className="text-primary underline" onClick={() => void load()}>
              tentar novamente
            </button>
          </p>
        ) : (
          <div className="flex flex-col gap-5 mt-2">
            {/* API Key */}
            <div>
              <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1.5">
                SUA STORE API KEY
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-xs text-primary bg-muted/30 px-2 py-1.5 rounded-sm border border-border truncate select-all">
                  {payload.storeApiKey}
                </code>
                <Button variant="ghost" size="icon" className="h-7 w-7 border border-border"
                  onClick={() => copy(payload.storeApiKey, 'key')}>
                  {copiedId === 'key'
                    ? <Check className="h-3.5 w-3.5 text-primary" />
                    : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </Button>
              </div>
            </div>

            {/* Snippet completo */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="font-mono text-[10px] text-muted-foreground tracking-widest">
                  SNIPPET GTM COMPLETO
                </p>
                <Button variant="outline" size="sm"
                  className="font-mono text-[10px] border-border gap-1 h-6"
                  onClick={() => copy(payload.fullSnippet, 'full')}>
                  {copiedId === 'full'
                    ? <><Check className="h-3 w-3" /> Copiado</>
                    : <><Copy className="h-3 w-3" /> Copiar tudo</>}
                </Button>
              </div>
              <Code code={payload.fullSnippet} copyId="full-code" copiedId={copiedId} onCopy={copy} />
            </div>

            {/* Passos */}
            {payload.steps.map((step, i) => (
              <div key={i}>
                <p className="font-mono text-xs font-semibold text-foreground mb-0.5">{step.title}</p>
                <p className="font-mono text-[11px] text-muted-foreground mb-2">{step.description}</p>
                <Code code={step.code} copyId={`step-${i}`} copiedId={copiedId} onCopy={copy} />
              </div>
            ))}

            {/* Docs */}
            <a
              href="https://support.google.com/tagmanager/answer/6107167"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              Como criar tags Custom HTML no GTM
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
