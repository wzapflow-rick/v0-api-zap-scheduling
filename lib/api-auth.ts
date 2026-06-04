// API Authentication helpers for Next.js API routes
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export interface AuthResult {
  authenticated: boolean;
  token?: string;
  error?: string;
}

/**
 * Verify authentication from cookies
 * Returns the auth token if valid, null otherwise
 */
export async function verifyAuth(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return { authenticated: false, error: 'Token não encontrado' };
    }

    // Token exists - for now we trust it
    // In production, you might want to verify the token with your backend
    return { authenticated: true, token };
  } catch {
    return { authenticated: false, error: 'Erro ao verificar autenticação' };
  }
}

/**
 * Create an unauthorized response
 */
export function unauthorizedResponse(message = 'Não autorizado') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  );
}

/**
 * Create a rate limit exceeded response
 */
export function rateLimitResponse(resetIn: number) {
  const resetInSeconds = Math.ceil(resetIn / 1000);
  return NextResponse.json(
    { 
      success: false, 
      error: `Limite de requisições excedido. Tente novamente em ${resetInSeconds} segundos.`,
      retryAfter: resetInSeconds,
    },
    { 
      status: 429,
      headers: {
        'Retry-After': String(resetInSeconds),
        'X-RateLimit-Reset': String(Date.now() + resetIn),
      },
    }
  );
}

/**
 * Create a bad request response
 */
export function badRequestResponse(message: string) {
  return NextResponse.json(
    { success: false, error: message },
    { status: 400 }
  );
}

/**
 * Create an internal error response
 */
export function internalErrorResponse(message = 'Erro interno do servidor') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 500 }
  );
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  // Remove non-numeric characters
  const numbers = phone.replace(/\D/g, '');
  // Must have 10-13 digits (with or without country code)
  return numbers.length >= 10 && numbers.length <= 13;
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength = 1000): string {
  if (!input || typeof input !== 'string') return '';
  return input.trim().slice(0, maxLength);
}

/**
 * Validate establishment slug format
 */
export function validateSlug(slug: string): boolean {
  if (!slug || typeof slug !== 'string') return false;
  // Slug should be alphanumeric with hyphens, 3-50 chars
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug);
}
