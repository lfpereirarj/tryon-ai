'use client';

/**
 * /dashboard/admin/stores/[id]/installation — Snippet de instalação GTM
 *
 * - Exibe URL do script do widget e api-url configurados para a loja
 * - Passo a passo para GTM Custom HTML (VTEX)
 * - Botão "Copiar" por step + botão "Copiar snippet completo"
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Copy,
  Check,
  Settings2,
  ShoppingBag,
  Puzzle,
  ExternalLink,
  Receipt,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface SnippetStep {
  title: string;
  description: string;
  code: string;
  language: 'html' | 'javascript';
}

interface InstallationPayload {
  storeId: string;
  storeName: string;
  platform: string;
  widgetScriptUrl: string;
  apiUrl: string;
  storeApiKey: string;
  steps: SnippetStep[];
  fullSnippet: string;
}

// ---------------------------------------------------------------------------
// Hook auxiliar: copia para área de transferência com feedback visual
// ---------------------------------------------------------------------------

function useCopyButton(timeoutMs = 2000) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      toast.success('Copiado para a área de transferência!');
      setTimeout(() => setCopiedId(null), timeoutMs);
    }).catch(() => {
      toast.error('Falha ao copiar. Selecione manualmente.');
    });
  }

  return { copiedId, copy };
}

// ---------------------------------------------------------------------------
// Componente de bloco de código com botão copiar
// ---------------------------------------------------------------------------

function CodeBlock({
  code,
  copyId,
  copiedId,
  onCopy,
}: {
  code: string;
  copyId: string;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}) {
  const copied = copiedId === copyId;
  return (
    <div className="relative group">
      <pre className="bg-muted/30 border border-border rounded-sm p-4 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground/80 whitespace-pre">
        {code}
      </pre>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-background border border-border"
        onClick={() => onCopy(code, copyId)}
        title="Copiar código"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-primary" />
        ) : (
          <Copy className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function InstallationPage() {
  const { id: storeId } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<InstallationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const { copiedId, copy } = useCopyButton();

  const loadPayload = useCallback(async () => {
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
  }, [storeId]);

  useEffect(() => { void loadPayload(); }, [loadPayload]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <Link href="/dashboard/admin" className="hover:text-primary transition-colors">lojas</Link>
        <span>/</span>
        <Link href={`/dashboard/admin/stores/${storeId}`} className="hover:text-primary transition-colors">editar</Link>
        <span>/</span>
        <span className="text-foreground">instalação</span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border pb-0 flex-wrap">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}`}>Dados</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/integration`}>
            <Settings2 className="h-3.5 w-3.5" />
            Integração VTEX
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/catalog`}>
            <ShoppingBag className="h-3.5 w-3.5" />
            Catálogo
          </Link>
        </Button>
        <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary flex items-center gap-1.5">
          <Puzzle className="h-3.5 w-3.5" />
          Instalação
        </span>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/admin/stores/${storeId}/billing`}>
            <Receipt className="h-3.5 w-3.5" />
            Faturamento
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : !payload ? (
        <p className="font-mono text-sm text-destructive">
          Falha ao carregar snippet.{' '}
          <button className="text-primary underline underline-offset-2" onClick={() => void loadPayload()}>
            tentar novamente
          </button>
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Card de resumo */}
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="font-mono text-base font-bold">
                  {payload.storeName}
                </CardTitle>
                <CardDescription className="font-mono text-xs mt-1">
                  Snippet gerado para instalação via GTM
                </CardDescription>
              </div>
              <Badge variant="default" className="font-mono text-[10px] shrink-0">
                {payload.platform.toUpperCase()}
              </Badge>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Metadados da loja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
                    STORE API KEY
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs text-primary bg-muted/30 px-2 py-1.5 rounded-sm border border-border truncate select-all">
                      {payload.storeApiKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 border border-border"
                      onClick={() => copy(payload.storeApiKey, 'api-key')}
                      title="Copiar API Key"
                    >
                      {copiedId === 'api-key'
                        ? <Check className="h-3.5 w-3.5 text-primary" />
                        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="font-mono text-[10px] text-muted-foreground tracking-widest mb-1">
                    API URL
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 font-mono text-xs text-muted-foreground bg-muted/30 px-2 py-1.5 rounded-sm border border-border truncate">
                      {payload.apiUrl}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 border border-border"
                      onClick={() => copy(payload.apiUrl, 'api-url')}
                      title="Copiar API URL"
                    >
                      {copiedId === 'api-url'
                        ? <Check className="h-3.5 w-3.5 text-primary" />
                        : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Botão snippet completo */}
              <div className="pt-2 border-t border-border/50">
                <p className="font-mono text-[10px] text-muted-foreground mb-2 tracking-widest">
                  SNIPPET COMPLETO (GTM CUSTOM HTML)
                </p>
                <CodeBlock
                  code={payload.fullSnippet}
                  copyId="full-snippet"
                  copiedId={copiedId}
                  onCopy={copy}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 font-mono text-xs border-border gap-2 h-8"
                  onClick={() => copy(payload.fullSnippet, 'full-snippet-btn')}
                >
                  {copiedId === 'full-snippet-btn'
                    ? <><Check className="h-3.5 w-3.5 text-primary" /> Copiado!</>
                    : <><Copy className="h-3.5 w-3.5" /> Copiar snippet completo</>}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Steps */}
          <div className="flex flex-col gap-4">
            <h2 className="font-mono text-xs text-muted-foreground tracking-widest uppercase">
              Passo a passo
            </h2>

            {payload.steps.map((step, idx) => (
              <Card key={idx} className="border-border bg-card">
                <CardHeader className="pb-2">
                  <CardTitle className="font-mono text-sm font-semibold text-foreground">
                    {step.title}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={step.code}
                    copyId={`step-${idx}`}
                    copiedId={copiedId}
                    onCopy={copy}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Link GTM docs */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <a
              href="https://support.google.com/tagmanager/answer/6107167"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs hover:text-primary transition-colors underline underline-offset-2"
            >
              Como criar tags Custom HTML no Google Tag Manager
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
