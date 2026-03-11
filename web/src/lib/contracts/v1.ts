import { z } from 'zod';

export const IMAGE_ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const StorefrontContextSchema = z.object({
  platform: z.string().min(1).max(50),
  storeApiKey: z.string().uuid('storeApiKey deve ser um UUID válido'),
  skuId: z.string().min(1).max(255),
  productId: z.string().min(1).max(255),
  productImageUrl: z.string().url('productImageUrl deve ser uma URL válida'),
  currency: z.string().length(3).optional(),
  price: z.number().positive().optional(),
});

export type StorefrontContext = z.infer<typeof StorefrontContextSchema>;

export const TryOnGenerationRequestSchema = z.object({
  storeApiKey: z.string().uuid('storeApiKey deve ser um UUID válido'),
  sessionId: z.string().min(1).max(255),
  skuId: z.string().min(1).max(255),
  productImageUrl: z.string().url('productImageUrl deve ser uma URL válida').optional(),
  productName: z.string().max(255).optional(),
});

export type TryOnGenerationRequest = z.infer<typeof TryOnGenerationRequestSchema>;

export const TryOnGenerationResponseSchema = z.object({
  success: z.boolean(),
  generatedImageBase64: z.string().optional(),
  sessionDbId: z.string().uuid().optional(),
  generationTimeMs: z.number().int().optional(),
});

export type TryOnGenerationResponse = z.infer<typeof TryOnGenerationResponseSchema>;

export const TRACKING_EVENT_NAMES = [
  'tryon_view',
  'tryon_upload',
  'tryon_generated',
  'tryon_add_to_cart',
  'order_completed',
  'influenced_order',
] as const;

export type TrackingEventName = (typeof TRACKING_EVENT_NAMES)[number];

export const TrackingEventSchema = z.object({
  eventName: z.enum(TRACKING_EVENT_NAMES),
  storeId: z.string().uuid(),
  sessionId: z.string().min(1).max(255),
  skuId: z.string().min(1).max(255),
  timestamp: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackingEvent = z.infer<typeof TrackingEventSchema>;

export const TrackingEventHttpSchema = z.object({
  storeApiKey: z.string().uuid('storeApiKey deve ser um UUID válido'),
  sessionId: z.string().min(1).max(255),
  skuId: z.string().min(1).max(255),
  eventName: z.enum(TRACKING_EVENT_NAMES),
  timestamp: z.string().datetime().optional().default(() => new Date().toISOString()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type TrackingEventHttp = z.infer<typeof TrackingEventHttpSchema>;

export const KpiRequestSchema = z.object({
  from: z.string().datetime('from deve ser ISO 8601'),
  to: z.string().datetime('to deve ser ISO 8601'),
});

export type KpiRequest = z.infer<typeof KpiRequestSchema>;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  const mime = file.type as (typeof IMAGE_ALLOWED_MIME_TYPES)[number];

  if (!(IMAGE_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido. Use: ${IMAGE_ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }

  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo permitido: ${IMAGE_MAX_SIZE_BYTES / 1024 / 1024}MB`,
    };
  }

  void mime;
  return { valid: true };
}
