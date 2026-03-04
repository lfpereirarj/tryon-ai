'use client';

/**
 * /dashboard/store/[storeId]/integration — Integração VTEX (portal do lojista)
 *
 * Mesma lógica do painel admin, mas com navegação do portal do lojista.
 * A API /api/admin/stores/[id]/integration aceita store_owner pelo RBAC.
 */
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Eye, EyeOff, RefreshCw, CheckCircle2, XCircle, Settings2, ShoppingBag,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

type IntegrationStatus = 'pending' | 'active' | 'error';

interface IntegrationRow {
  id: string;
  account: string;
  appKey: string;
  appTokenMasked: string;
  status: IntegrationStatus;
  errorMessage: string | null;
  testedAt: string | null;
}

const STATUS_VARIANT: Record<IntegrationStatus, 'default' | 'secondary' | 'destructive'> = {
  active: 'default', pending: 'secondary', error: 'destructive',
};
const STATUS_LABEL: Record<IntegrationStatus, string> = {
  active: 'Conectada', pending: 'Pendente', error: 'Erro',
};

async function getToken() {
  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  if (!session) throw new Error('Sessão expirada. Faça login novamente.');
  return session.access_token;
}

export default function StoreIntegrationPage() {
  const { storeId } = useParams<{ storeId: string }>();

  const [integration, setIntegration] = useState<IntegrationRow | null>(null);
  const [fetching, setFetching] = useState(true);
  const [account, setAccount] = useState('');
  const [appKey, setAppKey] = useState('');
  const [appToken, setAppToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [tokenEditing, setTokenEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  const fetchIntegration = useCallback(async () => {
    setFetching(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/stores/${storeId}/integration`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { integration?: IntegrationRow; error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      if (json.integration) {
        setIntegration(json.integration);
        setAccount(json.integration.account);
        setAppKey(json.integration.appKey);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar integração.');
    } finally {
      setFetching(false);
    }
  }, [storeId]);

  useEffect(() => { void fetchIntegration(); }, [fetchIntegration]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!integration && !appToken.trim()) {
      toast.error('appToken é obrigatório na criação da integração.');
      return;
    }
    setSaving(true);
    try {
      const token = await getToken();
      const body: Record<string, string> = { account: account.trim(), appKey: appKey.trim() };
      if (appToken.trim()) body.appToken = appToken.trim();
      const res = await fetch(`/api/admin/stores/${storeId}/integration`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const json = await res.json() as { integration?: IntegrationRow; error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setIntegration(json.integration!);
      setAccount(json.integration!.account);
      setAppKey(json.integration!.appKey);
      setAppToken('');
      setTokenEditing(false);
      toast.success('Integração salva! Clique em "Testar conexão" para validar.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!integration) { toast.error('Salve a integração antes de testar.'); return; }
    setTesting(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/stores/${storeId}/integration/test`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok: boolean; message: string };
      if (json.ok) {
        toast.success(`✓ ${json.message}`);
        setIntegration((prev) => prev ? { ...prev, status: 'active', errorMessage: null } : prev);
      } else {
        toast.error(`✗ ${json.message}`);
        setIntegration((prev) => prev ? { ...prev, status: 'error', errorMessage: json.message } : prev);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha no teste de conexão.');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      {/* Tabs do portal do lojista */}
      <div className="flex gap-1 border-b border-border pb-0">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary">
          <Link href={`/dashboard/store/${storeId}`}>Dashboard</Link>
        </Button>
        <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary flex items-center gap-1.5">
          <Settings2 className="h-3.5 w-3.5" />Integração VTEX
        </span>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
          <Link href={`/dashboard/store/${storeId}/catalog`}>
            <ShoppingBag className="h-3.5 w-3.5" />Catálogo
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary">
          <Link href={`/dashboard/store/${storeId}/settings`}>Dados da Loja</Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="font-mono text-lg font-bold">Integração VTEX</CardTitle>
            <CardDescription className="font-mono text-xs mt-1">
              Credenciais para busca de catálogo e try-on.
            </CardDescription>
          </div>
          {integration && (
            <Badge variant={STATUS_VARIANT[integration.status]} className="font-mono text-xs shrink-0">
              {STATUS_LABEL[integration.status]}
            </Badge>
          )}
        </CardHeader>

        <CardContent>
          {fetching ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-3/4" />
            </div>
          ) : (
            <>
              {integration?.status === 'error' && integration.errorMessage && (
                <div className="flex items-start gap-2 mb-5 p-3 border border-destructive/50 bg-destructive/10 rounded-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="font-mono text-xs text-destructive">{integration.errorMessage}</p>
                </div>
              )}
              {integration?.status === 'active' && (
                <div className="flex items-center gap-2 mb-5 p-3 border border-primary/30 bg-primary/5 rounded-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <p className="font-mono text-xs text-primary">Conexão ativa e validada.</p>
                </div>
              )}

              <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <Label className="font-mono text-xs text-muted-foreground tracking-widest">CONTA VTEX</Label>
                  <Input value={account} onChange={(e) => setAccount(e.target.value)} required
                    placeholder="minhaloja"
                    className="font-mono text-sm bg-background border-border focus-visible:ring-primary" />
                  <p className="font-mono text-[10px] text-muted-foreground/60">
                    Ex: se acessar <em>minhaloja.myvtex.com</em>, ponha <strong>minhaloja</strong>
                  </p>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="font-mono text-xs text-muted-foreground tracking-widest">APP KEY</Label>
                  <Input value={appKey} onChange={(e) => setAppKey(e.target.value)} required
                    placeholder="vtexappkey-minhaloja-XXXXXX"
                    className="font-mono text-sm bg-background border-border focus-visible:ring-primary" />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="font-mono text-xs text-muted-foreground tracking-widest">APP TOKEN</Label>
                    {integration && !tokenEditing && (
                      <Button type="button" variant="ghost" size="sm"
                        className="font-mono text-[10px] h-auto py-0.5 text-muted-foreground hover:text-primary"
                        onClick={() => setTokenEditing(true)}>
                        Alterar token
                      </Button>
                    )}
                  </div>
                  {integration && !tokenEditing ? (
                    <div className="flex items-center gap-2 px-3 py-2 border border-border bg-muted/30 rounded-sm">
                      <code className="font-mono text-xs text-muted-foreground flex-1">
                        {showToken ? '(armazenado criptografado)' : integration.appTokenMasked}
                      </code>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"
                        onClick={() => setShowToken((v) => !v)}>
                        {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Input type={showToken ? 'text' : 'password'} value={appToken}
                        onChange={(e) => setAppToken(e.target.value)} required={!integration}
                        placeholder={integration ? 'Novo token (vazio = manter atual)' : 'Cole o appToken aqui'}
                        className="font-mono text-sm bg-background border-border focus-visible:ring-primary pr-10" />
                      <Button type="button" variant="ghost" size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground"
                        onClick={() => setShowToken((v) => !v)}>
                        {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <Button type="submit" disabled={saving || testing} className="font-mono font-bold tracking-wider">
                    {saving ? 'Salvando…' : integration ? 'Atualizar' : 'Salvar integração'}
                  </Button>
                  <Button type="button" variant="outline" disabled={saving || testing || !integration}
                    onClick={() => void handleTest()} className="font-mono border-border gap-2">
                    <RefreshCw className={`h-3.5 w-3.5 ${testing ? 'animate-spin' : ''}`} />
                    {testing ? 'Testando…' : 'Testar conexão'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </CardContent>
      </Card>

      <p className="font-mono text-[10px] text-muted-foreground/60 leading-relaxed border border-border/30 p-3">
        <strong className="text-muted-foreground">Permissão VTEX necessária:</strong>{' '}
        Catalog › Products and SKUs › Read.{' '}
        <a href="https://help.vtex.com/pt/tutorial/application-keys"
          target="_blank" rel="noopener noreferrer"
          className="text-primary underline underline-offset-2">
          help.vtex.com/tutorial/application-keys
        </a>
      </p>
    </div>
  );
}
