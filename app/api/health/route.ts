import { NextResponse } from 'next/server';

// URL da API real (mesma usada pelo proxy)
const API_BASE_URL = 'https://api.agenda.wzapflow.com.br/api';

// Health check endpoint para o sync engine offline.
// Alem de confirmar que o app Next esta de pe, faz um ping real
// ao backend para detectar quedas do servidor/banco de dados.
export async function GET() {
  let backendAvailable = false;
  let backendStatus: number | null = null;

  try {
    // O backend nao expoe /health, entao usamos /auth/me como sentinela:
    // ele responde 401 sem token (servidor vivo) e so retorna 5xx/timeout
    // quando o servidor ou o banco estao fora. Timeout curto para nao
    // travar a UI quando o servidor estiver indisponivel.
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });

    backendStatus = res.status;
    // Qualquer resposta abaixo de 500 indica que o backend esta
    // respondendo (mesmo um 401/404). 5xx significa servidor/banco fora.
    backendAvailable = res.status < 500;
  } catch {
    // Timeout, DNS, conexao recusada => backend indisponivel.
    backendAvailable = false;
  }

  return NextResponse.json(
    {
      status: 'ok', // o app Next esta sempre de pe se chegou aqui
      backend: backendAvailable,
      backendStatus,
      timestamp: Date.now(),
    },
    {
      // Nunca cachear: precisamos do estado real a cada checagem.
      headers: { 'Cache-Control': 'no-store, max-age=0' },
    }
  );
}
