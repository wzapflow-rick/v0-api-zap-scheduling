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
  send_confirmation_request: 'confirmation_request',
  send_confirmation_reminder: 'confirmation_reminder',
  cancel_no_confirmation: 'confirmation_cancelled',
  send_final_reminder: 'final_reminder',
};

// Aceita o formato achatado do backend (clientName, serviceName, ...)
// e também um eventual objeto `vars` aninhado, por robustez.
interface PendingWorkItem {
  appointmentId: string;
  action: string;
  // identificação da instância Evolution
  establishmentSlug?: string;
  slug?: string;
  instanceName?: string;
  // contato
  clientPhone?: string;
  // seleção de modelo + token do link
  templateId?: string;
  confirmationToken?: string;
  // campos achatados (contrato do backend)
  clientName?: string;
  serviceName?: string;
  professionalName?: string;
  establishmentName?: string;
  date?: string;
  startTime?: string;
  // formato alternativo (aninhado)
  vars?: TemplateVariables;
}

// Monta as variáveis do modelo a partir do item, cobrindo ambos os formatos.
function extractVars(item: PendingWorkItem): TemplateVariables {
  return {
    cliente: item.vars?.cliente ?? item.clientName,
    servico: item.vars?.servico ?? item.serviceName,
    profissional: item.vars?.profissional ?? item.professionalName,
    data: item.vars?.data ?? item.date,
    hora: item.vars?.hora ?? item.startTime,
    estabelecimento: item.vars?.estabelecimento ?? item.establishmentName,
  };
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
    const res = await fetch(`${API_BASE_URL}/service/confirmations/due-actions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${serviceToken}`,
      },
    });

    // Lê como texto primeiro para não quebrar se o backend responder HTML (404/erro)
    const raw = await res.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      const snippet = raw.slice(0, 120).replace(/\s+/g, ' ');
      console.error('[cron/confirmations] resposta não-JSON do backend', res.status, snippet);
      return NextResponse.json(
        {
          success: false,
          error: `Backend respondeu ${res.status} sem JSON (verifique a URL /service/confirmations/due-actions e o CONFIRMATION_SERVICE_TOKEN). Início: ${snippet}`,
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const errObj = data as { error?: string } | null;
      return NextResponse.json(
        { success: false, error: errObj?.error || `Erro ${res.status} ao buscar trabalho pendente` },
        { status: 502 }
      );
    }

    const payload = data as { data?: { items?: PendingWorkItem[] }; items?: PendingWorkItem[] } | null;
    items = (payload?.data?.items || payload?.items || []) as PendingWorkItem[];

    // Modo diagnóstico: ?debug=1 mostra o que o backend devolveu, sem enviar nada.
    if (req.nextUrl.searchParams.get('debug') === '1') {
      return NextResponse.json({
        success: true,
        debug: true,
        backendStatus: res.status,
        // resposta crua do backend, exatamente como veio
        backendResponse: data,
        // onde o cron encontrou (ou não) os itens
        itemsFound: items.length,
        items,
        // a chave esperada caso esteja vazio
        hint:
          items.length === 0
            ? 'O backend nao retornou itens em data.items nem em items. Verifique se o due-actions esta considerando o agendamento (status pending, token gerado, enabled=true, janela de horas e fuso).'
            : undefined,
      });
    }
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
      const vars: TemplateVariables = extractVars(item);
      if (item.confirmationToken) {
        vars.link_confirmacao = buildConfirmationLink(req, item.confirmationToken);
      }

      const slug = item.establishmentSlug || item.slug || '';
      const body = renderTemplate(resolveTemplateBody(messageType, item.templateId), vars);
      const instanceName = item.instanceName || `ZapFlow-Agenda_${slug}`;
      const phone = formatPhoneForWhatsApp(item.clientPhone || '');

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
      await fetch(`${API_BASE_URL}/service/confirmations/report`, {
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
