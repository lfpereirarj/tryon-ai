'use client';

/**
 * /login — Página de autenticação
 * Supabase email + password → redirect /dashboard
 */
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/clients/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = getSupabaseBrowser();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError('E-mail ou senha inválidos.');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm border-border">
        <CardHeader className="space-y-1 pb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-sm font-bold text-primary tracking-widest">
              TRYON
            </span>
            <span className="font-mono text-xs text-muted-foreground tracking-widest">
              AI
            </span>
          </div>
          <CardTitle className="text-lg font-semibold">Entrar</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Acesso ao painel administrativo
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                E-mail
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="admin@tryon.ai"
                className="font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Senha
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                placeholder="••••••••"
                className="font-mono text-sm"
              />
            </div>

            {error && (
              <p className="text-xs text-destructive font-mono">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-mono text-xs tracking-widest uppercase"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
