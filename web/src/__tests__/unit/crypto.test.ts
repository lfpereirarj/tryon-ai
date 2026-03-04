/**
 * QA-S2-01 — Testes unitários: Criptografia AES-256-GCM
 *
 * Cobre:
 * - encrypt() produz formato correto
 * - decrypt() reverte encrypt() corretamente
 * - Round-trip com unicode e caracteres especiais
 * - maskSecret() mascara corretamente
 * - encrypt() gera IVs únicos (sem repetição)
 * - decrypt() lança em formato inválido
 * - getKey() lança se ENCRYPTION_KEY ausente ou com tamanho errado
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { encrypt, decrypt, maskSecret } from '@/lib/utils/crypto';

// Chave de 64 chars hex = 32 bytes (válida para AES-256)
const VALID_KEY = 'a'.repeat(64);

describe('crypto', () => {
  const original = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY;
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = original;
  });

  // ---------------------------------------------------------------------------
  // encrypt
  // ---------------------------------------------------------------------------

  describe('encrypt()', () => {
    it('produz string com formato iv:ciphertext:tag', () => {
      const result = encrypt('minha-senha-secreta');
      const parts = result.split(':');
      expect(parts).toHaveLength(3);
    });

    it('IV tem 24 chars hex (12 bytes)', () => {
      const result = encrypt('test');
      const [iv] = result.split(':');
      expect(iv).toHaveLength(24); // 12 bytes → 24 hex chars
    });

    it('auth tag tem 32 chars hex (16 bytes)', () => {
      const result = encrypt('test');
      const parts = result.split(':');
      const tag = parts[2];
      expect(tag).toHaveLength(32); // 16 bytes → 32 hex chars
    });

    it('gera IVs distintos em chamadas diferentes (segurança)', () => {
      const r1 = encrypt('mesmo-texto');
      const r2 = encrypt('mesmo-texto');
      const iv1 = r1.split(':')[0];
      const iv2 = r2.split(':')[0];
      expect(iv1).not.toBe(iv2);
    });

    it('gera ciphertexts distintos com mesmo plaintext (random IV)', () => {
      const r1 = encrypt('mesmo-texto');
      const r2 = encrypt('mesmo-texto');
      expect(r1).not.toBe(r2);
    });
  });

  // ---------------------------------------------------------------------------
  // decrypt
  // ---------------------------------------------------------------------------

  describe('decrypt()', () => {
    it('round-trip com string ASCII simples', () => {
      const plaintext = 'minha-api-key-12345';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('round-trip com string unicode', () => {
      const plaintext = 'chave-com-caracteres-especiais-çãõíé-🔐';
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('round-trip com string vazia', () => {
      expect(decrypt(encrypt(''))).toBe('');
    });

    it('round-trip com string longa (1000 chars)', () => {
      const plaintext = 'x'.repeat(1000);
      expect(decrypt(encrypt(plaintext))).toBe(plaintext);
    });

    it('lança se formato não tem 3 partes', () => {
      expect(() => decrypt('parteUm:parteDois')).toThrow(
        /Formato inválido/,
      );
    });

    it('lança se tamper no ciphertext (auth tag falha)', () => {
      const token = encrypt('segredo');
      const [iv, , tag] = token.split(':');
      const tampered = `${iv}:deadbeef:${tag}`;
      expect(() => decrypt(tampered)).toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // getKey — validação de ENCRYPTION_KEY
  // ---------------------------------------------------------------------------

  describe('getKey() (via encrypt)', () => {
    it('lança se ENCRYPTION_KEY ausente', () => {
      delete process.env.ENCRYPTION_KEY;
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/);
    });

    it('lança se ENCRYPTION_KEY tem tamanho errado (< 64 chars)', () => {
      process.env.ENCRYPTION_KEY = 'curta';
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/);
    });

    it('lança se ENCRYPTION_KEY tem tamanho errado (> 64 chars)', () => {
      process.env.ENCRYPTION_KEY = 'a'.repeat(65);
      expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY/);
    });
  });

  // ---------------------------------------------------------------------------
  // maskSecret
  // ---------------------------------------------------------------------------

  describe('maskSecret()', () => {
    it('preserva os 4 primeiros caracteres', () => {
      const masked = maskSecret('xG9kABCDEFGHIJ');
      expect(masked.startsWith('xG9k')).toBe(true);
    });

    it('substitui o restante por bullets', () => {
      const masked = maskSecret('xG9kABCDEFGHIJ');
      expect(masked.slice(4)).toMatch(/^•+$/);
    });

    it('strings com <= 4 chars sempre retornam bullets', () => {
      // Comportamento real: value.length <= 4 retorna sempre '....'
      expect(maskSecret('abc')).toBe('••••');
      expect(maskSecret('1234')).toBe('••••');
    });

    it('string vazia retorna bullets', () => {
      expect(maskSecret('')).toBe('••••');
    });
  });
});
