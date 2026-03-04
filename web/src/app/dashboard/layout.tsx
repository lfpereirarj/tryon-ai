/**
 * Dashboard Layout — shell mínimo
 *
 * Não contém sidebar. Cada sub-rota tem seu próprio layout:
 *   /dashboard/admin/*          → app/dashboard/admin/layout.tsx  (super_admin)
 *   /dashboard/store/[storeId]  → app/dashboard/store/[storeId]/layout.tsx  (lojista)
 */
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: 'TryOn AI',
  description: 'Plataforma TryOn AI',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
      <Toaster richColors position="bottom-right" />
    </div>
  );
}
