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
    apiUrl: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
  };
}

async function evolutionFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<EvolutionResponse<T>> {
  const { apiUrl, apiKey } = getEvolutionConfig();
  
  if (!apiUrl || !apiKey) {
    console.log('[v0] Evolution API config missing:', { apiUrl: !!apiUrl, apiKey: !!apiKey });
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
  return evolutionFetch<{
    instance: string;
    state: 'open' | 'close' | 'connecting';
  }>(`/instance/connectionState/${instanceName}`, {
    method: 'GET',
  });
}

export async function getInstanceInfo(instanceName: string) {
  return evolutionFetch<{
    instance: {
      instanceName: string;
      instanceId: string;
      owner: string;
      profileName: string;
      profilePictureUrl: string;
      profileStatus: string;
      status: string;
      serverUrl: string;
      apikey: string;
      integration: string;
    };
  }>(`/instance/fetchInstances?instanceName=${instanceName}`, {
    method: 'GET',
  });
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

// Message Sending (for future use by backend)

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
