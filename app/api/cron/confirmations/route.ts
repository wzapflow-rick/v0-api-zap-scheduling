import { NextRequest, NextResponse } from 'next/server';
import { evolutionApi } from '@/lib/evolution-api';
import { formatPhoneForWhatsApp } from '@/lib/message-service';
import {
  resolveTemplateBody,
  renderTemplate,
  type ConfirmationMessageType,
  type TemplateVariables,
} from '@/lib/message-templates';

// Backend real (mesmo destino do proxy)
const API_BASE_URL = 'https://api.agenda.wzapflow.com.br/api';

// Ação que o backend pede para o cron executar -> tipo de mensagem do catálogo
const ACTION_TO_MESSAGE_TYPE: Record<string, ConfirmationMessageType> = {
  send_reservation: 'reservation_created',
  send_link: 'confirmation_request',
  send_reminder: 'confirmation_reminder',
  cancel: 'confirmation_cancelled',
  send_final_reminder: 'final_reminder',
};

interface PendingWorkItem {
  appointmentId: string;
  action: keyof typeof ACTION_TO_MESSAGE_TYPE;
  slug: string;
  instanceName?: string;
  clientPhone: string;
  templateId?: string;
  confirmationToken?: string;
  vars: TemplateVariables;
}

interface ProcessedResult {
  appointmentId: string;
  action: string;
  success: boolean;
  error?: string;
}

function buildConfirmationLink(req: NextRequest, token: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin;
  return `${base}/confirmar/${token}`;
}

async function handle(req: NextRequest) {
  // 1. Autorização: a VPS precisa enviar o CRON_SECRET
  const cronSecret = process.env.CRON_SECRET;
  const serviceToken = process.env.CONFIRMATION_SERVICE_TOKEN;

  if (!cronSecret || !serviceToken) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET ou CONFIRMATION_SERVICE_TOKEN não configurados' },
      { status: 500 }
    );
  }

  const provided =
    req.headers.get('x-cron-secret') ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  if (provided !== cronSecret) {
    return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
  }

  // 2. Busca o trabalho pendente no backend (autenticação serviço-a-serviço)
  let items: PendingWorkItem[] = [];
  try {
    const res = await fetch(`${API_BASE_URL}/confirmations/pending-work`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Erro ao buscar trabalho pendente' },
        { status: 502 }
      );
    }
    items = (data?.data?.items || data?.items || []) as PendingWorkItem[];
  } catch (error) {
    console.error('[cron/confirmations] erro ao buscar trabalho pendente', error);
    return NextResponse.json(
      { success: false, error: 'Falha ao conectar ao backend' },
      { status: 502 }
    );
  }

  // 3. Processa cada item: renderiza o modelo e envia via Evolution
  const results: ProcessedResult[] = [];

  for (const item of items) {
    const messageType = ACTION_TO_MESSAGE_TYPE[item.action];
    if (!messageType) {
      results.push({
        appointmentId: item.appointmentId,
        action: item.action,
        success: false,
        error: `Ação desconhecida: ${item.action}`,
      });
      continue;
    }

    try {
      const vars: TemplateVariables = { ...item.vars };
      if (item.confirmationToken) {
        vars.link_confirmacao = buildConfirmationLink(req, item.confirmationToken);
      }

      const body = renderTemplate(resolveTemplateBody(messageType, item.templateId), vars);
      const instanceName = item.instanceName || `ZapFlow-Agenda_${item.slug}`;
      const phone = formatPhoneForWhatsApp(item.clientPhone);

      const sendResult = await evolutionApi.sendTextMessage(instanceName, phone, body);

      results.push({
        appointmentId: item.appointmentId,
        action: item.action,
        success: sendResult.success,
        error: sendResult.success ? undefined : sendResult.error,
      });
    } catch (error) {
      results.push({
        appointmentId: item.appointmentId,
        action: item.action,
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar',
      });
    }
  }

  // 4. Reporta os resultados ao backend (que atualiza timestamps/status de forma idempotente)
  if (results.length > 0) {
    try {
      await fetch(`${API_BASE_URL}/confirmations/processed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceToken}`,
        },
        body: JSON.stringify({ results }),
      });
    } catch (error) {
      console.error('[cron/confirmations] erro ao reportar resultados', error);
    }
  }

  const sent = results.filter((r) => r.success).length;
  return NextResponse.json({
    success: true,
    data: { total: results.length, sent, failed: results.length - sent, results },
  });
}

// A VPS pode chamar via GET (cron simples) ou POST
export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
