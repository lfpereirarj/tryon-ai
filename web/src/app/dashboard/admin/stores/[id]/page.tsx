'use client';

/**
 * /dashboard/admin/stores/[id] — Editar / Suspender loja (Super Admin)
 */
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Settings2, ShoppingBag, Puzzle, Receipt } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

const PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;
const STATUSES = ['active', 'suspended', 'cancelled'] as const;
type Plan = (typeof PLANS)[number];
type Status = (typeof STATUSES)[number];

interface StoreRow {
  id: string;
  name: string;
  domain: string | null;
  public_api_key: string;
  status: Status;
  plan: Plan;
  allowed_origins: string[];
  created_at: string;
}

const STATUS_VARIANT: Record<Status, 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'destructive',
  cancelled: 'secondary',
};

async function getToken() {
  const { data: { session } } = await getSupabaseBrowser().auth.getSession();
  if (!session) throw new Error('Sessão expirada.');
  return session.access_token;
}

export default function EditStorePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [store, setStore] = useState<StoreRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  // Editable fields
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState<Plan>('free');
  const [status, setStatus] = useState<Status>('active');
  const [originsRaw, setOriginsRaw] = useState('');

  const fetchStore = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/stores/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { error?: string; store?: StoreRow };

      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }

      const s = json.store!;
      setStore(s);
      setName(s.name);
      setDomain(s.domain ?? '');
      setPlan(s.plan);
      setStatus(s.status);
      setOriginsRaw((s.allowed_origins ?? []).join('\n'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao carregar loja.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void fetchStore(); }, [fetchStore]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const allowedOrigins = originsRaw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const token = await getToken();

      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          domain: domain.trim() || null,
          plan,
          status,
          allowedOrigins,
        }),
      });

      const json = await res.json() as { error?: string; store?: StoreRow };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }

      setStore(json.store!);
      toast.success('Loja atualizada com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSuspend(confirmed: boolean) {
    setConfirmSuspend(false);
    if (!confirmed) return;
    setSaving(true);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/stores/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'suspended' }),
      });
      const json = await res.json() as { error?: string };
      if (!res.ok) { toast.error(json.error ?? `Erro ${res.status}`); return; }
      setStatus('suspended');
      setStore((prev) => prev ? { ...prev, status: 'suspended' } : prev);
      toast.success('Loja suspensa. /api/generate retornará 403 para esta loja.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao suspender.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="font-mono text-sm text-destructive">
        Loja não encontrada.{' '}
        <Link href="/dashboard/admin" className="text-primary underline underline-offset-2">
          ← voltar
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Confirm suspend dialog */}
      <AlertDialog open={confirmSuspend} onOpenChange={setConfirmSuspend}>
        <AlertDialogContent className="font-mono bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Suspender loja?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              O widget desta loja será bloqueado imediatamente —{' '}
              <code>/api/generate</code> retornará 403. Pode ser revertido depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground text-xs hover:bg-destructive/80"
              onClick={() => void handleSuspend(true)}
            >
              Confirmar suspensão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="max-w-lg">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary -ml-2">
            <Link href="/dashboard/admin">← lojas</Link>
          </Button>
        </div>

        {/* Tabs: Dados | Integração VTEX | Catálogo */}
        <div className="flex gap-1 mb-4 border-b border-border pb-0">
          <span className="font-mono text-xs px-3 py-2 border-b-2 border-primary text-primary">
            Dados
          </span>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
            <Link href={`/dashboard/admin/stores/${id}/integration`}>
              <Settings2 className="h-3.5 w-3.5" />
              Integração VTEX
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
            <Link href={`/dashboard/admin/stores/${id}/catalog`}>
              <ShoppingBag className="h-3.5 w-3.5" />
              Catálogo
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
            <Link href={`/dashboard/admin/stores/${id}/installation`}>
              <Puzzle className="h-3.5 w-3.5" />
              Instalação
            </Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary gap-1.5">
            <Link href={`/dashboard/admin/stores/${id}/billing`}>
              <Receipt className="h-3.5 w-3.5" />
              Faturamento
            </Link>
          </Button>
        </div>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-mono text-lg font-bold">{store.name}</CardTitle>
            <Badge variant={STATUS_VARIANT[store.status]} className="font-mono text-xs">
              {store.status}
            </Badge>
          </CardHeader>

          <CardContent>
            {/* API Key (read-only) */}
            {store.public_api_key && (
              <div className="mb-5 flex flex-col gap-1.5">
                <Label className="font-mono text-xs text-muted-foreground tracking-widest">STORE API KEY</Label>
                <code className="block rounded bg-muted px-3 py-2 font-mono text-xs text-primary break-all select-all">
                  {store.public_api_key}
                </code>
              </div>
            )}

            <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-5">
              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name" className="font-mono text-xs text-muted-foreground tracking-widest">
                  NOME DA LOJA
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={2}
                  maxLength={100}
                  className="font-mono text-sm bg-background border-border focus-visible:ring-primary"
                />
              </div>

              {/* Domain */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="domain" className="font-mono text-xs text-muted-foreground tracking-widest">
                  DOMÍNIO <span className="normal-case tracking-normal text-muted-foreground/50">(opcional)</span>
                </Label>
                <Input
                  id="domain"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="minhaloja.com.br"
                  className="font-mono text-sm bg-background border-border focus-visible:ring-primary"
                />
              </div>

              {/* Plan + Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="font-mono text-xs text-muted-foreground tracking-widest">PLANO</Label>
                  <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                    <SelectTrigger className="font-mono text-sm bg-background border-border focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-sm bg-popover border-border">
                      {PLANS.map((p) => (
                        <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label className="font-mono text-xs text-muted-foreground tracking-widest">STATUS</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                    <SelectTrigger className="font-mono text-sm bg-background border-border focus:ring-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="font-mono text-sm bg-popover border-border">
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {status === 'suspended' && (
                    <p className="font-mono text-[10px] text-destructive">
                      ⚠ /api/generate retornará 403 para esta loja.
                    </p>
                  )}
                </div>
              </div>

              {/* Allowed Origins */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="origins" className="font-mono text-xs text-muted-foreground tracking-widest">
                  ORIGENS CORS <span className="normal-case tracking-normal text-muted-foreground/50">(uma por linha)</span>
                </Label>
                <Textarea
                  id="origins"
                  value={originsRaw}
                  onChange={(e) => setOriginsRaw(e.target.value)}
                  rows={4}
                  placeholder={"https://minhaloja.com.br\nhttps://www.minhaloja.com.br"}
                  className="font-mono text-xs bg-background border-border focus-visible:ring-primary resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2 flex-wrap">
                <Button type="submit" disabled={saving} className="font-mono font-bold tracking-wider">
                  {saving ? 'Salvando…' : 'Salvar alterações'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="font-mono border-border"
                  onClick={() => router.push('/dashboard/admin')}
                >
                  Cancelar
                </Button>
                {store.status === 'active' && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="font-mono ml-auto text-xs"
                    onClick={() => setConfirmSuspend(true)}
                    disabled={saving}
                  >
                    Suspender loja
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
