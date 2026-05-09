'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Loader2, ArrowLeft, Phone, KeyRound, Lock, CheckCircle } from 'lucide-react';
import { authApi } from '@/lib/api';

// Step 1: Phone number
const phoneSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido').max(11, 'Telefone inválido'),
});

// Step 3: New password
const passwordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

type Step = 'phone' | 'code' | 'password' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  // Step 1: Submit phone number
  const onSubmitPhone = async (data: PhoneFormData) => {
    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(data.phone);
      if (result.success) {
        setPhone(data.phone);
        setStep('code');
        toast.success('Código enviado para seu WhatsApp!');
      } else {
        toast.error(result.error || 'Erro ao enviar código');
      }
    } catch {
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code
  const onSubmitCode = async () => {
    if (code.length !== 6) {
      toast.error('Digite o código completo');
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.verifyResetToken(phone, code);
      if (result.success && result.data?.valid) {
        setStep('password');
      } else {
        toast.error('Código inválido ou expirado');
      }
    } catch {
      toast.error('Erro ao verificar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const onSubmitPassword = async (data: PasswordFormData) => {
    setIsLoading(true);
    try {
      const result = await authApi.resetPassword(phone, code, data.password);
      if (result.success) {
        setStep('success');
        toast.success('Senha alterada com sucesso!');
      } else {
        toast.error(result.error || 'Erro ao alterar senha');
      }
    } catch {
      toast.error('Erro ao alterar senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const resendCode = async () => {
    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(phone);
      if (result.success) {
        toast.success('Código reenviado!');
      } else {
        toast.error(result.error || 'Erro ao reenviar código');
      }
    } catch {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      {/* Step 1: Phone */}
      {step === 'phone' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Phone className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Recuperar Senha</CardTitle>
            <CardDescription>
              Digite seu número de telefone para receber um código de verificação via WhatsApp
            </CardDescription>
          </CardHeader>
          <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (com DDD)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="11999999999"
                  {...phoneForm.register('phone')}
                  disabled={isLoading}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Código
              </Button>
              <Link
                href="/login"
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar para o login
              </Link>
            </CardFooter>
          </form>
        </>
      )}

      {/* Step 2: Code verification */}
      {step === 'code' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Digite o Código</CardTitle>
            <CardDescription>
              Enviamos um código de 6 dígitos para seu WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Não recebeu?{' '}
              <button
                type="button"
                onClick={resendCode}
                disabled={isLoading}
                className="text-primary hover:underline disabled:opacity-50"
              >
                Reenviar código
              </button>
            </p>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              onClick={onSubmitCode}
              className="w-full"
              disabled={isLoading || code.length !== 6}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verificar Código
            </Button>
            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </button>
          </CardFooter>
        </>
      )}

      {/* Step 3: New password */}
      {step === 'password' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Nova Senha</CardTitle>
            <CardDescription>
              Digite sua nova senha
            </CardDescription>
          </CardHeader>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  {...passwordForm.register('password')}
                  disabled={isLoading}
                />
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite novamente"
                  {...passwordForm.register('confirmPassword')}
                  disabled={isLoading}
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Alterar Senha
              </Button>
              <button
                type="button"
                onClick={() => setStep('code')}
                className="flex items-center justify-center gap-1 text-sm text-muted-foreground hover:text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            </CardFooter>
          </form>
        </>
      )}

      {/* Step 4: Success */}
      {step === 'success' && (
        <>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Senha Alterada!</CardTitle>
            <CardDescription>
              Sua senha foi alterada com sucesso. Agora você pode fazer login com sua nova senha.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push('/login')} className="w-full">
              Ir para o Login
            </Button>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
