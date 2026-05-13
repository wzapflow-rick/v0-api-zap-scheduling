'use client';

import { useState, useEffect } from 'react';
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
import { Loader2, ArrowLeft, Phone, KeyRound, Lock, CheckCircle, Check, X, Eye, EyeOff } from 'lucide-react';
import { authApi } from '@/lib/api';
import { getPasswordRequirements, getPasswordStrength, isPasswordValid, passwordSchema } from '@/lib/validators';
import { cn } from '@/lib/utils';

// Step 1: Phone number
const phoneSchema = z.object({
  phone: z.string().min(10, 'Telefone inválido').max(11, 'Telefone inválido'),
});

// Step 3: New password with OWASP requirements
const newPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
});

type PhoneFormData = z.infer<typeof phoneSchema>;
type PasswordFormData = z.infer<typeof newPasswordSchema>;

type Step = 'phone' | 'code' | 'password' | 'success';

const strengthConfig = {
  fraca: { label: 'Fraca', color: 'bg-red-500', width: 'w-1/3' },
  media: { label: 'Média', color: 'bg-yellow-500', width: 'w-2/3' },
  forte: { label: 'Forte', color: 'bg-green-500', width: 'w-full' },
};

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  const passwordValue = passwordForm.watch('password') || '';
  const requirements = getPasswordRequirements(passwordValue);
  const strength = getPasswordStrength(passwordValue);
  const strengthInfo = strengthConfig[strength];
  const passwordIsValid = isPasswordValid(passwordValue);

  // Countdown effect for rate limiting
  useEffect(() => {
    if (!isLocked) return;
    
    const interval = setInterval(() => {
      setLockTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsLocked(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked]);

  // Step 1: Submit phone number
  const onSubmitPhone = async (data: PhoneFormData) => {
    if (isLocked) {
      toast.error(`Aguarde ${lockTime} segundos`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(data.phone);
      if (result.success) {
        setPhone(data.phone);
        setStep('code');
        toast.success('Código enviado para seu WhatsApp!');
      } else {
        // Check for rate limiting
        if (result.retryAfter) {
          const seconds = result.retryAfter;
          setIsLocked(true);
          setLockTime(seconds);
          toast.error(`Muitas tentativas. Aguarde ${seconds} segundos.`);
        } else {
          toast.error(result.error || 'Erro ao enviar código');
        }
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
    if (isLocked) {
      toast.error(`Aguarde ${lockTime} segundos`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await authApi.forgotPassword(phone);
      if (result.success) {
        toast.success('Código reenviado!');
      } else {
        // Check for rate limiting
        if (result.retryAfter) {
          const seconds = result.retryAfter;
          setIsLocked(true);
          setLockTime(seconds);
          toast.error(`Muitas tentativas. Aguarde ${seconds} segundos.`);
        } else {
          toast.error(result.error || 'Erro ao reenviar código');
        }
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
                  disabled={isLoading || isLocked}
                />
                {phoneForm.formState.errors.phone && (
                  <p className="text-sm text-destructive">
                    {phoneForm.formState.errors.phone.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isLocked}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : isLocked ? (
                  `Aguarde ${lockTime}s`
                ) : (
                  'Enviar Código'
                )}
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
                disabled={isLoading || isLocked}
                className="text-primary hover:underline disabled:opacity-50"
              >
                {isLocked ? `Aguarde ${lockTime}s` : 'Reenviar código'}
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
              Crie uma senha forte para sua conta
            </CardDescription>
          </CardHeader>
          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Crie uma senha forte"
                    {...passwordForm.register('password')}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password strength indicator */}
                {passwordValue.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full transition-all duration-300', strengthInfo.color, strengthInfo.width)}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha: <span className="font-medium">{strengthInfo.label}</span>
                    </p>
                    
                    {/* Password requirements */}
                    <ul className="space-y-1 text-sm">
                      {requirements.map((req) => (
                        <li key={req.label} className="flex items-center gap-2">
                          {req.met ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <X size={14} className="text-red-500" />
                          )}
                          <span className={req.met ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>
                            {req.label}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {passwordForm.formState.errors.password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar senha</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Digite novamente"
                    {...passwordForm.register('confirmPassword')}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || !passwordIsValid}
              >
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
