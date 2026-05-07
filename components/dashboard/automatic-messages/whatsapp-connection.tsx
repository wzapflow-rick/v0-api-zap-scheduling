'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Smartphone, RefreshCw, LogOut, CheckCircle2, XCircle, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { automaticMessagesApi } from '@/lib/api';

interface WhatsAppConnectionProps {
  slug: string;
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
  base64?: string;
  code?: string;
  pairingCode?: string;
}

export function WhatsAppConnection({ slug, onConnectionChange }: WhatsAppConnectionProps) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [qrCode, setQrCode] = useState<QRCodeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savedToBackend, setSavedToBackend] = useState(false);

  const saveConnectionToBackend = useCallback(async (connected: boolean, phoneNumber?: string | null) => {
    if (savedToBackend && connected) return; // Already saved as connected
    
    try {
      await automaticMessagesApi.updateWhatsAppConnection({
        connected,
        phone: phoneNumber || null,
      });
      if (connected) setSavedToBackend(true);
    } catch {
      // Backend endpoint may not exist yet - silently fail
    }
  }, [savedToBackend]);

  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/evolution/status?slug=${slug}`);
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
        onConnectionChange?.(result.data.connected);
        
        // If connected, clear QR code
        if (result.data.connected) {
          setQrCode(null);
          setConnecting(false);
          
          // Save to backend only once
          saveConnectionToBackend(true, result.data.phoneNumber);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [slug, onConnectionChange, saveConnectionToBackend]);

  const createInstance = async () => {
    const response = await fetch('/api/evolution/instance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ establishmentId, slug }),
    });
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    return result.data;
  };

  const getQRCode = async () => {
    try {
      const response = await fetch(`/api/evolution/qrcode?slug=${slug}`);
      const result = await response.json();
      
      if (result.success && result.data) {
        setQrCode(result.data);
        return result.data;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setQrCode(null);
    
    try {
      // First, create/get instance
      await createInstance();
      
      // Then get QR code
      const qr = await getQRCode();
      
      if (!qr?.base64) {
        // If no QR code, maybe already connected - check status
        await checkStatus();
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
        `/api/evolution/instance?slug=${slug}&action=logout`,
        { method: 'DELETE' }
      );
      const result = await response.json();
      
      if (result.success) {
        toast.success('WhatsApp desconectado');
        setStatus(prev => prev ? { ...prev, connected: false, state: 'close' } : null);
        setQrCode(null);
        onConnectionChange?.(false);
        setSavedToBackend(false);
        
        // Save disconnection to backend
        saveConnectionToBackend(false, null);
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
    await getQRCode();
  };

  // Initial status check
  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Poll for status when connecting (waiting for QR scan)
  useEffect(() => {
    if (!connecting || !qrCode) return;

    const interval = setInterval(async () => {
      await checkStatus();
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [connecting, qrCode, checkStatus]);

  // Auto-refresh QR code every 45 seconds when showing
  useEffect(() => {
    if (!qrCode?.base64) return;

    const timeout = setTimeout(() => {
      handleRefreshQR();
    }, 45000);

    return () => clearTimeout(timeout);
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

  const isConnected = status?.connected;

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
                  src={status.profilePictureUrl}
                  alt="Profile"
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
                  <p className="text-sm text-muted-foreground">
                    {status.phoneNumber}
                  </p>
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
              <img
                src={qrCode.base64}
                alt="QR Code WhatsApp"
                className="h-48 w-48"
              />
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
