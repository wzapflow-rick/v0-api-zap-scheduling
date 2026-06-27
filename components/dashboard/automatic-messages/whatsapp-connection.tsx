'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, RefreshCw, LogOut, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { automaticMessagesApi } from '@/lib/api';

interface WhatsAppConnectionProps {
  /** ID único e imutável do estabelecimento (base do nome da instância Evolution). */
  establishmentId: string;
  onConnectionChange?: (connected: boolean) => void;
}

interface ConnectionStatus {
  instanceName: string;
  state: 'open' | 'close' | 'connecting';
  connected: boolean;
  profileName?: string;
  profilePictureUrl?: string;
  phoneNumber?: string;
}

interface QRCodeData {
  base64?: string | null;
  code?: string | null;
  pairingCode?: string | null;
}

export function WhatsAppConnection({ establishmentId, onConnectionChange }: WhatsAppConnectionProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  // Evita persistir repetidamente o mesmo estado no backend
  const savedConnectedRef = useRef(false);

  const persistConnection = useCallback(async (connected: boolean, phoneNumber?: string | null) => {
    try {
      await automaticMessagesApi.updateWhatsAppConnection({
        connected,
        phone: phoneNumber || null,
      });
    } catch {
      // Endpoint do backend pode não existir ainda — falha silenciosa
    }
  }, []);

  // Verifica o estado real da instância no servidor Evolution.
  // Como a instância é nomeada pelo ID único do estabelecimento, "open" significa
  // que ESTE estabelecimento está de fato conectado (sem herdar instâncias antigas).
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/evolution/status?establishmentId=${establishmentId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const connected = result.data.connected === true;
        setStatus(result.data);
        onConnectionChange?.(connected);

        if (connected) {
          setQrCode(null);
          setConnecting(false);
          if (!savedConnectedRef.current) {
            savedConnectedRef.current = true;
            persistConnection(true, result.data.phoneNumber);
          }
        } else {
          savedConnectedRef.current = false;
        }
      }
    } catch {
      // Falha silenciosa — mantém o estado atual
    } finally {
      setLoading(false);
    }
  }, [establishmentId, onConnectionChange, persistConnection]);

  const fetchQRCode = useCallback(async (): Promise<QRCodeData | null> => {
    try {
      const response = await fetch(`/api/evolution/qrcode?establishmentId=${establishmentId}`);
      const result = await response.json();
      if (result.success && result.data) {
        setQrCode(result.data);
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [establishmentId]);

  const handleConnect = async () => {
    setConnecting(true);
    setQrCode(null);

    try {
      // 1. Cria (ou recupera) a instância deste estabelecimento
      const createResponse = await fetch('/api/evolution/instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ establishmentId }),
      });
      const createResult = await createResponse.json();
      if (!createResult.success) {
        throw new Error(createResult.error || 'Falha ao criar a instância');
      }

      // 2. Busca o QR Code para escanear
      const qr = await fetchQRCode();

      // 3. Se não veio QR, pode já estar conectado — confere o status
      if (!qr?.base64) {
        await checkStatus();
        if (!status?.connected) {
          toast.message('Aguarde um instante e tente atualizar o QR Code.');
        }
      } else {
        toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);

    try {
      const response = await fetch(
        `/api/evolution/instance?establishmentId=${establishmentId}&action=logout`,
        { method: 'DELETE' }
      );
      const result = await response.json();

      if (result.success) {
        toast.success('WhatsApp desconectado');
        setStatus((prev) => (prev ? { ...prev, connected: false, state: 'close' } : null));
        setQrCode(null);
        setConnecting(false);
        savedConnectedRef.current = false;
        onConnectionChange?.(false);
        persistConnection(false, null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao desconectar');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefreshQR = async () => {
    setQrCode(null);
    await fetchQRCode();
  };

  // Verificação inicial do status
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Enquanto aguarda a leitura do QR, faz polling do status a cada 3s
  useEffect(() => {
    if (!connecting || !qrCode?.base64) return;

    const interval = setInterval(() => {
      checkStatus();
    }, 3000);

    return () => clearInterval(interval);
  }, [connecting, qrCode, checkStatus]);

  // Atualiza o QR automaticamente a cada 45s enquanto estiver visível
  useEffect(() => {
    if (!qrCode?.base64) return;

    const timeout = setTimeout(() => {
      handleRefreshQR();
    }, 45000);

    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrCode]);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isConnected = status?.connected === true;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Conexão WhatsApp</CardTitle>
              <CardDescription>
                Conecte seu WhatsApp para enviar mensagens automáticas
              </CardDescription>
            </div>
          </div>
          <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3" />
                Conectado
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                Desconectado
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex items-center gap-3">
              {status?.profilePictureUrl ? (
                <img
                  src={status.profilePictureUrl || "/placeholder.svg"}
                  alt="Foto do perfil do WhatsApp"
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                  <Wifi className="h-6 w-6 text-primary" />
                </div>
              )}
              <div>
                <p className="font-medium">{status?.profileName || 'WhatsApp Conectado'}</p>
                {status?.phoneNumber && (
                  <p className="text-sm text-muted-foreground">{status.phoneNumber}</p>
                )}
              </div>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="mr-2 h-4 w-4" />
              )}
              Desconectar
            </Button>
          </div>
        ) : qrCode?.base64 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-center text-sm text-muted-foreground">
              Escaneie o QR Code com seu WhatsApp para conectar
            </p>
            <div className="relative rounded-lg border-2 border-dashed border-primary/30 bg-white p-4">
              <img src={qrCode.base64 || "/placeholder.svg"} alt="QR Code do WhatsApp" className="h-48 w-48" />
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando leitura do QR Code...
            </p>
            {qrCode.pairingCode && (
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Ou use o código de pareamento:</p>
                <p className="mt-1 font-mono text-lg font-bold tracking-wider">{qrCode.pairingCode}</p>
              </div>
            )}
            <Button variant="outline" size="sm" onClick={handleRefreshQR}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar QR Code
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-full bg-muted p-4">
              <Smartphone className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Conecte seu WhatsApp para começar a enviar mensagens automáticas
            </p>
            <Button onClick={handleConnect} disabled={connecting}>
              {connecting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Smartphone className="mr-2 h-4 w-4" />
              )}
              Conectar WhatsApp
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
