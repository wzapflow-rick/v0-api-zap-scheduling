// Modelos de mensagem do fluxo de Confirmação de Agendamento
// As mensagens são enviadas via Evolution API (no frontend).
// O estabelecimento escolhe, nas Configurações, qual modelo usar para cada etapa.

export type ConfirmationMessageType =
  | 'reservation_created'
  | 'confirmation_request'
  | 'confirmation_reminder'
  | 'confirmation_cancelled'
  | 'final_reminder';

export interface ConfirmationTemplate {
  id: string;
  label: string;
  body: string;
}

export interface ConfirmationMessageGroup {
  type: ConfirmationMessageType;
  title: string;
  description: string;
  /** Indica se o modelo deve conter o link de confirmação. */
  usesLink: boolean;
  templates: ConfirmationTemplate[];
}

/** Variáveis disponíveis para interpolação nos modelos. */
export const TEMPLATE_VARIABLES = [
  { token: '{{cliente}}', description: 'Nome do cliente' },
  { token: '{{servico}}', description: 'Nome do serviço' },
  { token: '{{profissional}}', description: 'Nome do profissional' },
  { token: '{{data}}', description: 'Data do atendimento (ex.: 12/06/2026)' },
  { token: '{{hora}}', description: 'Horário do atendimento (ex.: 14:30)' },
  { token: '{{estabelecimento}}', description: 'Nome do estabelecimento' },
  { token: '{{link_confirmacao}}', description: 'Link único para o cliente confirmar' },
] as const;

export interface TemplateVariables {
  cliente?: string;
  servico?: string;
  profissional?: string;
  data?: string;
  hora?: string;
  estabelecimento?: string;
  link_confirmacao?: string;
}

/** Substitui as variáveis {{...}} pelo conteúdo fornecido. */
export function renderTemplate(body: string, vars: TemplateVariables): string {
  return body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
    const value = (vars as Record<string, string | undefined>)[key];
    return value ?? '';
  });
}

export const CONFIRMATION_MESSAGE_GROUPS: ConfirmationMessageGroup[] = [
  {
    type: 'reservation_created',
    title: 'Reserva realizada',
    description: 'Enviada logo após o cliente agendar, avisando que o horário foi reservado.',
    usesLink: false,
    templates: [
      {
        id: 'reservation_created_1',
        label: 'Acolhedora',
        body: `Olá, {{cliente}}! Seu horário foi reservado com sucesso. 🎉

📅 {{data}} às {{hora}}
💇 {{servico}}
👤 {{profissional}}

Em breve enviaremos um link para você confirmar a sua presença. Até logo!`,
      },
      {
        id: 'reservation_created_2',
        label: 'Direta',
        body: `{{cliente}}, recebemos o seu agendamento!

{{servico}} com {{profissional}}
{{data}} às {{hora}}

Mais perto do horário enviaremos um link para confirmar. 😉`,
      },
      {
        id: 'reservation_created_3',
        label: 'Formal',
        body: `Prezado(a) {{cliente}}, o seu agendamento no {{estabelecimento}} foi registrado.

Serviço: {{servico}}
Profissional: {{profissional}}
Data: {{data}} às {{hora}}

Você receberá um link para confirmar a presença. Agradecemos a preferência.`,
      },
    ],
  },
  {
    type: 'confirmation_request',
    title: 'Pedido de confirmação',
    description: 'Enviada algumas horas antes com o link para o cliente confirmar a presença.',
    usesLink: true,
    templates: [
      {
        id: 'confirmation_request_1',
        label: 'Amigável',
        body: `Oi, {{cliente}}! Seu atendimento está chegando. 😊

{{servico}} com {{profissional}}
{{data}} às {{hora}}

Você confirma a sua presença? Toque no link abaixo:
{{link_confirmacao}}

Se não confirmar, o horário será liberado para outra pessoa.`,
      },
      {
        id: 'confirmation_request_2',
        label: 'Objetiva',
        body: `{{cliente}}, confirme o seu horário de {{data}} às {{hora}} ({{servico}}).

Confirmar: {{link_confirmacao}}`,
      },
      {
        id: 'confirmation_request_3',
        label: 'Com aviso de prazo',
        body: `Olá, {{cliente}}! Para garantir o seu atendimento de {{servico}} no dia {{data}} às {{hora}}, confirme a presença:

{{link_confirmacao}}

⚠️ Sem a confirmação, a reserva poderá ser cancelada automaticamente.`,
      },
    ],
  },
  {
    type: 'confirmation_reminder',
    title: 'Lembrete para confirmar',
    description: 'Enviada quando o cliente ainda não confirmou após o pedido inicial.',
    usesLink: true,
    templates: [
      {
        id: 'confirmation_reminder_1',
        label: 'Gentil',
        body: `Oi, {{cliente}}! Ainda não recebemos a sua confirmação para o atendimento de {{data}} às {{hora}}.

Confirme aqui: {{link_confirmacao}}

Conta pra gente se você vem? 🙏`,
      },
      {
        id: 'confirmation_reminder_2',
        label: 'Urgente',
        body: `{{cliente}}, falta confirmar o seu horário de {{hora}} ({{servico}}). Sem confirmação a reserva será cancelada em breve.

Confirmar agora: {{link_confirmacao}}`,
      },
      {
        id: 'confirmation_reminder_3',
        label: 'Curta',
        body: `{{cliente}}, podemos contar com você {{data}} às {{hora}}? Confirme: {{link_confirmacao}}`,
      },
    ],
  },
  {
    type: 'confirmation_cancelled',
    title: 'Aviso de cancelamento',
    description: 'Enviada quando o agendamento é cancelado por falta de confirmação.',
    usesLink: false,
    templates: [
      {
        id: 'confirmation_cancelled_1',
        label: 'Compreensiva',
        body: `Olá, {{cliente}}. Como não recebemos a sua confirmação, o agendamento de {{data}} às {{hora}} foi cancelado.

Se ainda quiser ser atendido(a), é só agendar novamente. Esperamos você! 💚`,
      },
      {
        id: 'confirmation_cancelled_2',
        label: 'Direta',
        body: `{{cliente}}, o seu horário de {{data}} às {{hora}} foi cancelado por falta de confirmação. Para reagendar, entre em contato com o {{estabelecimento}}.`,
      },
      {
        id: 'confirmation_cancelled_3',
        label: 'Formal',
        body: `Prezado(a) {{cliente}}, informamos que o agendamento de {{servico}} em {{data}} às {{hora}} foi cancelado devido à ausência de confirmação. Permanecemos à disposição para um novo agendamento.`,
      },
    ],
  },
  {
    type: 'final_reminder',
    title: 'Lembrete final (1h antes)',
    description: 'Enviada cerca de 1 hora antes do atendimento já confirmado.',
    usesLink: false,
    templates: [
      {
        id: 'final_reminder_1',
        label: 'Animada',
        body: `Oi, {{cliente}}! Seu atendimento é daqui a pouco. ⏰

{{servico}} com {{profissional}}
Hoje às {{hora}}

Estamos te esperando! 🙌`,
      },
      {
        id: 'final_reminder_2',
        label: 'Objetiva',
        body: `{{cliente}}, lembrete: seu horário de {{servico}} é às {{hora}}. Até já!`,
      },
      {
        id: 'final_reminder_3',
        label: 'Com endereço',
        body: `Olá, {{cliente}}! Faltando 1 hora para o seu atendimento de {{servico}} às {{hora}} no {{estabelecimento}}. Nos vemos em breve! 😊`,
      },
    ],
  },
];

/** Retorna o grupo de modelos de um tipo. */
export function getMessageGroup(type: ConfirmationMessageType): ConfirmationMessageGroup | undefined {
  return CONFIRMATION_MESSAGE_GROUPS.find((g) => g.type === type);
}

/** Retorna o id do primeiro modelo (default) de cada tipo. */
export function getDefaultTemplateSelection(): Record<ConfirmationMessageType, string> {
  return CONFIRMATION_MESSAGE_GROUPS.reduce((acc, group) => {
    acc[group.type] = group.templates[0].id;
    return acc;
  }, {} as Record<ConfirmationMessageType, string>);
}

/** Resolve o corpo do modelo a partir do tipo e do id selecionado (com fallback). */
export function resolveTemplateBody(
  type: ConfirmationMessageType,
  templateId?: string
): string {
  const group = getMessageGroup(type);
  if (!group) return '';
  const template = group.templates.find((t) => t.id === templateId) ?? group.templates[0];
  return template.body;
}
