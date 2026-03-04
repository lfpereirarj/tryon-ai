/**
 * admin.ts — Zod schemas para operações administrativas (Sprint 2)
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Lojas
// ---------------------------------------------------------------------------

export const STORE_STATUSES = ['active', 'suspended', 'cancelled'] as const;
export const STORE_PLANS = ['free', 'starter', 'pro', 'enterprise'] as const;

export type StoreStatus = (typeof STORE_STATUSES)[number];
export type StorePlan = (typeof STORE_PLANS)[number];

export const CreateStoreSchema = z.object({
  name: z.string().min(2).max(100),
  domain: z.string().max(255).optional(),
  plan: z.enum(STORE_PLANS).default('free'),
});

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;

export const UpdateStoreSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  domain: z.string().max(255).nullish(),
  plan: z.enum(STORE_PLANS).optional(),
  status: z.enum(STORE_STATUSES).optional(),
  allowedOrigins: z.array(z.string().url()).optional(),
});

export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;

// ---------------------------------------------------------------------------
// Usuários de loja
// ---------------------------------------------------------------------------

export const USER_ROLES = ['super_admin', 'store_owner', 'store_manager'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const AddStoreUserSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(USER_ROLES).default('store_owner'),
});

export type AddStoreUserInput = z.infer<typeof AddStoreUserSchema>;
