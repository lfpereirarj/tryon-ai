'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';

const PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;
type Plan = (typeof PLANS)[number];

export default function NewStorePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { session } } = await getSupabaseBrowser().auth.getSession();
      if (!session) { toast.error('Sessão expirada. Faça login novamente.'); return; }

      const res = await fetch('/api/admin/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name: name.trim(), domain: domain.trim() || undefined, plan }),
      });

      const json = await res.json() as { error?: string };

      if (!res.ok) {
        toast.error(json.error ?? `Erro ${res.status}`);
        return;
      }

      toast.success('Loja criada com sucesso!');
      router.push('/dashboard/admin');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao criar loja.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Button asChild variant="ghost" size="sm" className="font-mono text-xs text-muted-foreground hover:text-primary -ml-2">
          <Link href="/dashboard/admin">← lojas</Link>
        </Button>
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-mono text-lg font-bold">Nova loja</CardTitle>
          <CardDescription className="font-mono text-xs">
            A storeApiKey será gerada automaticamente.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5">
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
                placeholder="Ex: Moda Feminina XYZ"
                className="font-mono text-sm bg-background border-border focus-visible:ring-primary"
              />
            </div>

            {/* Domain */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="domain" className="font-mono text-xs text-muted-foreground tracking-widest">
                DOMÍNIO <span className="text-muted-foreground/50 normal-case tracking-normal">(opcional)</span>
              </Label>
              <Input
                id="domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="minhaloja.com.br"
                className="font-mono text-sm bg-background border-border focus-visible:ring-primary"
              />
            </div>

            {/* Plan */}
            <div className="flex flex-col gap-1.5">
              <Label className="font-mono text-xs text-muted-foreground tracking-widest">PLANO</Label>
              <Select value={plan} onValueChange={(v) => setPlan(v as Plan)}>
                <SelectTrigger className="font-mono text-sm bg-background border-border focus:ring-primary w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="font-mono text-sm bg-popover border-border">
                  {PLANS.map((p) => (
                    <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="font-mono font-bold tracking-wider"
              >
                {loading ? 'Criando…' : 'Criar loja'}
              </Button>
              <Button asChild variant="outline" className="font-mono border-border">
                <Link href="/dashboard/admin">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
