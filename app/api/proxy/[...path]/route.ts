import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// URL da API fixa
const API_BASE_URL = 'https://api.agenda.wzapflow.com.br/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleProxy(request, resolvedParams);
}

async function handleProxy(
  request: NextRequest,
  params: { path: string[] }
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const targetUrl = `${API_BASE_URL}/${path}${searchParams ? `?${searchParams}` : ''}`;

    // Try to get token from Authorization header first, then fall back to cookie
    let token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value;
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let body: string | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    // Handle empty responses or non-JSON responses
    const responseText = await response.text();
    let data;
    
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        // If response is not valid JSON, wrap it
        data = { success: response.ok, message: responseText };
      }
    } else {
      // Empty response - create a default response
      data = { success: response.ok, message: response.ok ? 'Operacao realizada com sucesso' : 'Erro na operacao' };
    }

    return NextResponse.json(data, {
      status: response.status,
    });
  } catch (error) {
    console.error('[v0] Proxy handler error:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao conectar com o servidor' },
      { status: 500 }
    );
  }
}
