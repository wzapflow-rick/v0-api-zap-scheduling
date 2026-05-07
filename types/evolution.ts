// Evolution API Types

export interface EvolutionInstance {
  instanceName: string;
  instanceId?: string;
  status: 'open' | 'close' | 'connecting';
}

export interface EvolutionQRCode {
  pairingCode?: string;
  code?: string;
  base64?: string;
  count?: number;
}

export interface EvolutionConnectionState {
  instance: string;
  state: 'open' | 'close' | 'connecting';
}

export interface EvolutionInstanceInfo {
  instance: {
    instanceName: string;
    instanceId: string;
    status: string;
    serverUrl: string;
    apikey: string;
  };
}

// Automatic Messages Types

export type MessageTrigger = 
  | 'appointment_created'
  | 'reminder_24h'
  | 'reminder_1h'
  | 'appointment_completed'
  | 'client_birthday'
  | 'no_show'
  | 'client_inactive'
  | 'appointment_cancelled'
  | 'waitlist_available'
  | 'promotion';

export interface AutomaticMessage {
  id: string;
  name: string;
  description: string;
  trigger: MessageTrigger;
  template: string;
  variables: string[];
  category: 'agendamento' | 'relacionamento' | 'marketing';
}

export interface AutoMessageConfig {
  establishmentId: string;
  whatsappConnected: boolean;
  whatsappNumber: string | null;
  instanceName: string | null;
  activeMessages: string[];
  planLimit: number;
  updatedAt: string;
}

// Predefined automatic messages
export const AUTOMATIC_MESSAGES: AutomaticMessage[] = [
  {
    id: 'confirmation',
    name: 'Confirmação de Agendamento',
    description: 'Enviada quando um agendamento é criado',
    trigger: 'appointment_created',
    category: 'agendamento',
    template: `Olá {nome_cliente}! 👋

Seu agendamento foi confirmado:
📅 Data: {data}
⏰ Horário: {horario}
💈 Serviço: {servico}
👤 Profissional: {profissional}

Endereço: {endereco}

Até lá! 🎉`,
    variables: ['nome_cliente', 'data', 'horario', 'servico', 'profissional', 'endereco'],
  },
  {
    id: 'reminder_24h',
    name: 'Lembrete 24h Antes',
    description: 'Enviada 24 horas antes do agendamento',
    trigger: 'reminder_24h',
    category: 'agendamento',
    template: `Olá {nome_cliente}! 

Lembrete: você tem um agendamento amanhã!
📅 {data} às {horario}
💈 {servico} com {profissional}

Precisa remarcar? Responda esta mensagem.`,
    variables: ['nome_cliente', 'data', 'horario', 'servico', 'profissional'],
  },
  {
    id: 'reminder_1h',
    name: 'Lembrete 1h Antes',
    description: 'Enviada 1 hora antes do agendamento',
    trigger: 'reminder_1h',
    category: 'agendamento',
    template: `{nome_cliente}, seu horário é em 1 hora! ⏰

📍 {nome_estabelecimento}
{endereco}

Estamos te esperando!`,
    variables: ['nome_cliente', 'nome_estabelecimento', 'endereco'],
  },
  {
    id: 'thank_you',
    name: 'Agradecimento Pós-Atendimento',
    description: 'Enviada após conclusão do atendimento',
    trigger: 'appointment_completed',
    category: 'relacionamento',
    template: `Obrigado pela visita, {nome_cliente}! 🙏

Esperamos que tenha gostado do serviço.

Até a próxima! 💈`,
    variables: ['nome_cliente'],
  },
  {
    id: 'birthday',
    name: 'Aniversário do Cliente',
    description: 'Enviada no dia do aniversário',
    trigger: 'client_birthday',
    category: 'relacionamento',
    template: `Feliz aniversário, {nome_cliente}! 🎂🎉

Como presente, você ganhou 10% de desconto no seu próximo serviço!

Use o código: NIVER10
Válido por 30 dias.`,
    variables: ['nome_cliente'],
  },
  {
    id: 'no_show',
    name: 'Cliente Ausente',
    description: 'Enviada quando cliente não comparece',
    trigger: 'no_show',
    category: 'agendamento',
    template: `Olá {nome_cliente},

Notamos que você não pôde comparecer ao agendamento de hoje.

Aconteceu algum imprevisto? Podemos remarcar para outro horário.

Responda esta mensagem para reagendar.`,
    variables: ['nome_cliente'],
  },
  {
    id: 'reactivation',
    name: 'Reativação de Cliente Inativo',
    description: 'Enviada para clientes sem visita há 30+ dias',
    trigger: 'client_inactive',
    category: 'marketing',
    template: `Sentimos sua falta, {nome_cliente}! 

Faz um tempo que você não nos visita. 
Que tal agendar um horário?

Acesse: {link_agendamento}

Estamos te esperando! 💈`,
    variables: ['nome_cliente', 'link_agendamento'],
  },
  {
    id: 'cancellation',
    name: 'Cancelamento Confirmado',
    description: 'Enviada quando agendamento é cancelado',
    trigger: 'appointment_cancelled',
    category: 'agendamento',
    template: `{nome_cliente}, seu agendamento foi cancelado.

📅 {data} às {horario}
💈 {servico}

Deseja reagendar? Acesse: {link_agendamento}`,
    variables: ['nome_cliente', 'data', 'horario', 'servico', 'link_agendamento'],
  },
  {
    id: 'waitlist',
    name: 'Lista de Espera Disponível',
    description: 'Enviada quando abre vaga na lista de espera',
    trigger: 'waitlist_available',
    category: 'agendamento',
    template: `Boa notícia, {nome_cliente}! 🎉

Abriu uma vaga para o horário que você queria:
📅 {data} às {horario}

Deseja confirmar? Responda SIM.`,
    variables: ['nome_cliente', 'data', 'horario'],
  },
  {
    id: 'promotion',
    name: 'Promoção/Novidade',
    description: 'Enviada manualmente ou em datas programadas',
    trigger: 'promotion',
    category: 'marketing',
    template: `Novidade na {nome_estabelecimento}! 🔥

{mensagem_promocao}

Agende agora: {link_agendamento}`,
    variables: ['nome_estabelecimento', 'mensagem_promocao', 'link_agendamento'],
  },
];

// Helper to get messages by category
export function getMessagesByCategory(category: AutomaticMessage['category']) {
  return AUTOMATIC_MESSAGES.filter(msg => msg.category === category);
}

// Helper to get sample preview with fake data
export function getMessagePreview(message: AutomaticMessage): string {
  const sampleData: Record<string, string> = {
    nome_cliente: 'João Silva',
    data: '15 de maio de 2026',
    horario: '14:00',
    servico: 'Corte Masculino',
    profissional: 'Carlos',
    endereco: 'Rua das Flores, 123 - Centro',
    nome_estabelecimento: 'Barbearia do Zé',
    link_agendamento: 'zapflow.com/agendar/barbearia',
    mensagem_promocao: 'Corte + Barba por apenas R$50!',
  };

  let preview = message.template;
  message.variables.forEach(variable => {
    preview = preview.replace(new RegExp(`\\{${variable}\\}`, 'g'), sampleData[variable] || `{${variable}}`);
  });

  return preview;
}
