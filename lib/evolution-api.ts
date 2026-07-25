// Evolution API Client
// Server-side only - never expose API key to client

interface EvolutionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Helper to get env vars at runtime (not at module load time)
function getEvolutionConfig() {
  return {
    // Aceita EVOLUTION_API_URL (atual) ou EVOLUTION_URL (padrão do outro SaaS)
    apiUrl: process.env.EVOLUTION_API_URL || process.env.EVOLUTION_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
  };
}

/**
 * Nome canônico da instância Evolution para um estabelecimento.
 *
 * IMPORTANTE: usamos o ID único e imutável do estabelecimento (não o slug).
 * O slug pode ser reaproveitado entre contas (ex.: conta de teste apagada e
 * recriada com o mesmo nome), o que fazia uma conta nova "herdar" uma instância
 * antiga que ficou aberta no servidor Evolution. O ID nunca se repete, então
 * cada estabelecimento tem sempre a sua própria instância isolada.
 */
export function getInstanceName(establishmentId: string): string {
  return `ZapFlow-Agenda_${establishmentId}`;
}

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<EvolutionResponse<T>> {
  const { apiUrl, apiKey } = getEvolutionConfig();
  
  if (!apiUrl || !apiKey) {
    return {
      success: false,
      error: 'Evolution API não configurada. Verifique as variáveis de ambiente EVOLUTION_API_URL e EVOLUTION_API_KEY.',
    };
  }

  try {
    const url = `${apiUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'apikey': apiKey,
        ...options.headers,
      },
    });

    const text = await response.text();
    let data: T | undefined;
    
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        // Response is not JSON
      }
    }

    if (!response.ok) {
      const errorData = data as { message?: string } | undefined;
      return {
        success: false,
        error: errorData?.message || `Erro ${response.status}: ${response.statusText}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro de conexão',
    };
  }
}

// Instance Management

export async function createInstance(instanceName: string) {
  return evolutionFetch('/instance/create', {
    method: 'POST',
    body: JSON.stringify({
      instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
    }),
  });
}

export async function connectInstance(instanceName: string) {
  return evolutionFetch<{
    pairingCode?: string;
    code?: string;
    base64?: string;
    count?: number;
  }>(`/instance/connect/${instanceName}`, {
    method: 'GET',
  });
}

export async function getInstanceStatus(instanceName: string) {
  // A Evolution pode responder o estado aninhado em `instance.state`
  // ou direto na raiz como `state`, dependendo da versão.
  return evolutionFetch<{
    instance?: { instanceName?: string; state?: 'open' | 'close' | 'connecting' };
    state?: 'open' | 'close' | 'connecting';
  }>(`/instance/connectionState/${instanceName}`, {
    method: 'GET',
  });
}

// A Evolution v1 retorna { instance: {...} } e a v2 retorna um ARRAY de instâncias
// com campos diferentes (connectionStatus, profileName, profilePicUrl, ownerJid).
// Tipamos como `unknown` e normalizamos em quem consome (rota de status).
export async function getInstanceInfo(instanceName: string) {
  return evolutionFetch<unknown>(
    `/instance/fetchInstances?instanceName=${instanceName}`,
    {
      method: 'GET',
    }
  );
}

/**
 * Normaliza a resposta de fetchInstances entre Evolution v1 e v2.
 * Retorna null quando a instância não é encontrada.
 */
export function normalizeInstanceInfo(
  data: unknown,
  instanceName: string
): {
  connectionStatus?: 'open' | 'close' | 'connecting';
  profileName?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
} | null {
  if (!data) return null;

  // v2: array de instâncias — encontramos a nossa pelo nome
  if (Array.isArray(data)) {
    const found = data.find((item) => {
      const it = item as { name?: string; instanceName?: string };
      return it?.name === instanceName || it?.instanceName === instanceName;
    }) as
      | {
          connectionStatus?: 'open' | 'close' | 'connecting';
          state?: 'open' | 'close' | 'connecting';
          profileName?: string;
          profilePicUrl?: string;
          profilePictureUrl?: string;
          ownerJid?: string;
          owner?: string;
          number?: string;
        }
      | undefined;

    if (!found) return null;

    return {
      connectionStatus: found.connectionStatus || found.state,
      profileName: found.profileName,
      profilePictureUrl: found.profilePicUrl || found.profilePictureUrl,
      phoneNumber: found.ownerJid || found.owner || found.number,
    };
  }

  // v1: { instance: {...} }
  const nested = (data as { instance?: Record<string, unknown> }).instance;
  if (nested) {
    return {
      connectionStatus: (nested.state || nested.connectionStatus) as
        | 'open'
        | 'close'
        | 'connecting'
        | undefined,
      profileName: nested.profileName as string | undefined,
      profilePictureUrl: nested.profilePictureUrl as string | undefined,
      phoneNumber: nested.owner as string | undefined,
    };
  }

  return null;
}

export async function deleteInstance(instanceName: string) {
  return evolutionFetch(`/instance/delete/${instanceName}`, {
    method: 'DELETE',
  });
}

export async function logoutInstance(instanceName: string) {
  return evolutionFetch(`/instance/logout/${instanceName}`, {
    method: 'DELETE',
  });
}

// Message Sending

export async function sendTextMessage(
  instanceName: string,
  number: string,
  text: string
) {
  return evolutionFetch(`/message/sendText/${instanceName}`, {
    method: 'POST',
    body: JSON.stringify({
      number,
      text,
    }),
  });
}

// Export as object for easier imports
export const evolutionApi = {
  createInstance,
  connectInstance,
  getInstanceStatus,
  getInstanceInfo,
  deleteInstance,
  logoutInstance,
  sendTextMessage,
};
