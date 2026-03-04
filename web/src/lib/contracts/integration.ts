/**
 * integration.ts — Contratos Zod para integrações de plataforma por loja
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// VTEX
// ---------------------------------------------------------------------------

export const VTEX_PLATFORMS = ['vtex', 'shopify', 'nuvemshop'] as const;
export type VtexPlatform = (typeof VTEX_PLATFORMS)[number];

export const INTEGRATION_STATUSES = ['pending', 'active', 'error'] as const;
export type IntegrationStatus = (typeof INTEGRATION_STATUSES)[number];

/**
 * Payload para criar ou atualizar integração VTEX.
 * `appToken` é obrigatório apenas na criação; na atualização pode ser omitido
 * para manter o valor existente.
 */
export const SaveIntegrationSchema = z.object({
  platform: z.enum(VTEX_PLATFORMS).default('vtex'),
  account: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Conta VTEX: apenas letras minúsculas, números e hífens.'),
  appKey: z
    .string()
    .min(1)
    .max(255)
    .describe('VTEX appKey (ex: vtexappkey-minhaconta-XXXXXX)'),
  appToken: z
    .string()
    .min(1)
    .max(1000)
    .optional()
    .describe('VTEX appToken — obrigatório na criação; omitir para manter o existente.'),
});

export type SaveIntegrationInput = z.infer<typeof SaveIntegrationSchema>;

/**
 * Resposta pública de integração (segredo mascarado).
 */
export interface IntegrationPublicRow {
  id: string;
  storeId: string;
  platform: VtexPlatform;
  account: string;
  appKey: string;        // valor real (não é token)
  appTokenMasked: string; // ex: "xG9k••••••••••••"
  status: IntegrationStatus;
  errorMessage: string | null;
  testedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
