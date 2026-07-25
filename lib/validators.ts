import { z } from 'zod';

/* -------------------------------------------------------------------------- */
/*                          Telefone / WhatsApp (BR)                          */
/* -------------------------------------------------------------------------- */

/** Remove tudo que não é dígito. Também descarta o prefixo 55 do país. */
export function normalizePhone(value: string): string {
  let digits = (value || '').replace(/\D/g, '');

  // Usuário pode digitar com o código do país (55). Removemos para
  // trabalharmos sempre com DDD + número (10 ou 11 dígitos).
  if (digits.length > 11 && digits.startsWith('55')) {
    digits = digits.slice(2);
  }

  return digits.slice(0, 11);
}

/** Aplica a máscara (11) 99999-9999 conforme o usuário digita. */
export function formatPhoneBR(value: string): string {
  const digits = normalizePhone(value);
  if (!digits) return '';

  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  // Celular (11 dígitos): (11) 99999-9999 | Fixo (10): (11) 9999-9999
  const split = digits.length > 10 ? 7 : 6;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`;
}

/**
 * Valida um telefone brasileiro e explica o motivo exato da recusa.
 * Regras: 10 ou 11 dígitos, DDD válido (11–99) e, em celulares (11 dígitos),
 * o primeiro dígito do número precisa ser 9.
 */
export function validatePhoneBR(value: string): { valid: boolean; error?: string } {
  const digits = normalizePhone(value);

  if (!digits) return { valid: false, error: 'Informe seu telefone' };

  if (digits.length < 10) {
    return {
      valid: false,
      error: `Telefone incompleto: faltam ${10 - digits.length} dígito(s). Use DDD + número`,
    };
  }

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) {
    return { valid: false, error: 'DDD inválido. Use um DDD entre 11 e 99' };
  }

  if (digits.length === 11 && digits[2] !== '9') {
    return { valid: false, error: 'Celular com 11 dígitos deve começar com 9 após o DDD' };
  }

  // Rejeita sequências repetidas como (11) 11111-1111
  if (/^(\d)\1+$/.test(digits)) {
    return { valid: false, error: 'Telefone inválido' };
  }

  return { valid: true };
}

/** Schema Zod reutilizável: valida e já entrega o telefone só com dígitos. */
export const phoneSchema = z
  .string()
  .transform(normalizePhone)
  .superRefine((digits, ctx) => {
    const result = validatePhoneBR(digits);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  });

// Password validation schema following OWASP guidelines
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter pelo menos 8 caracteres')
  .max(128, 'Senha muito longa')
  .refine((password) => /[a-z]/.test(password), {
    message: 'Senha deve conter letra minúscula',
  })
  .refine((password) => /[A-Z]/.test(password), {
    message: 'Senha deve conter letra maiúscula',
  })
  .refine((password) => /[0-9]/.test(password), {
    message: 'Senha deve conter número',
  });

// Password requirements check
export interface PasswordRequirement {
  label: string;
  met: boolean;
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
    { label: 'Letra maiúscula (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Letra minúscula (a-z)', met: /[a-z]/.test(password) },
    { label: 'Número (0-9)', met: /[0-9]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  const requirements = getPasswordRequirements(password);
  return requirements.every((r) => r.met);
}

// Password strength indicator
export type PasswordStrength = 'fraca' | 'media' | 'forte';

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++; // special characters (bonus)

  if (score <= 3) return 'fraca';
  if (score <= 5) return 'media';
  return 'forte';
}

// Validate password and return errors
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (password.length > 128) {
    errors.push('Senha muito longa');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter letra minúscula');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter letra maiúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter número');
  }

  return { valid: errors.length === 0, errors };
}
