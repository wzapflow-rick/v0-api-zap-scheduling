import { z } from 'zod';

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
