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
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Loader2,
  ArrowLeft,
  ArrowRight,
  Phone,
  KeyRound,
  Lock,
  CheckCircle2,
  Check,
  X,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authApi } from '@/lib/api';
import {
  getPasswordRequirements,
  getPasswordStrength,
  isPasswordValid,
  passwordSchema,
  phoneSchema,
  formatPhoneBR,
  normalizePhone,
  validatePhoneBR,
} from '@/lib/validators';
import { cn } from '@/lib/utils';

// Etapa 1: telefone (mesma validação do cadastro)
const phoneFormSchema = z.object({
  phone: phoneSchema,
});

// Etapa 3: nova senha com requisitos OWASP
const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type PhoneFormData = z.infer<typeof phoneFormSchema>;
type PasswordFormData = z.infer<typeof newPasswordSchema>;

type Step = 'phone' | 'code' | 'password' | 'success';

const strengthConfig = {
  fraca: { label: 'Fraca', color: 'bg-red-500', width: 'w-1/3' },
  media: { label: 'Média', color: 'bg-yellow-500', width: 'w-2/3' },
  forte: { label: 'Forte', color: 'bg-emerald-500', width: 'w-full' },
};

const stepMeta: Record<Exclude<Step, 'success'>, { index: number; label: string }> = {
  phone: { index: 1, label: 'Telefone' },
  code: { index: 2, label: 'Código' },
  password: { index: 3, label: 'Nova senha' },
};

/** Campo de input com ícone à esquerda, no mesmo padrão visual do login. */
function IconField({
  icon: Icon,
  focused,
  children,
}: {
  icon: React.ElementType;
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          'absolute left-3 top-1/2 z-10 -translate-y-1/2 transition-colors',
          focused ? 'text-emerald-500' : 'text-muted-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      {children}
    </div>
  );
}

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
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const phoneForm = useForm<PhoneFormData>({
    resolver: zodResolver(phoneFormSchema),
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(newPasswordSchema),
  });

  const phoneRegister = phoneForm.register('phone');
  const phoneDigits = normalizePhone(phoneForm.watch('phone') || '');
  const phoneCheck = validatePhoneBR(phoneDigits);
  const phoneIsValid = phoneCheck.valid;

  const passwordValue = passwordForm.watch('password') || '';
  const requirements = getPasswordRequirements(passwordValue);
  const strength = getPasswordStrength(passwordValue);
  const strengthInfo = strengthConfig[strength];
  const passwordIsValid = isPasswordValid(passwordValue);

  // Countdown do rate limit
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

  const handleRateLimit = (retryAfter?: number, fallback?: string) => {
    if (retryAfter) {
      setIsLocked(true);
      setLockTime(retryAfter);
      toast.error(`Muitas tentativas. Aguarde ${retryAfter} segundos.`);
      return;
    }
    toast.error(fallback || 'Não foi possível concluir. Tente novamente.');
  };

  // Etapa 1: envia o telefone
  const onSubmitPhone = async (data: PhoneFormData) => {
    if (isLocked) {
      toast.error(`Aguarde ${lockTime} segundos`);
      return;
    }

    setIsLoading(true);
    try {
      // data.phone já vem normalizado (somente dígitos) pelo schema
      const result = await authApi.forgotPassword(data.phone);
      if (result.success) {
        setPhone(data.phone);
        setStep('code');
        toast.success('Código enviado para seu WhatsApp!');
      } else {
        handleRateLimit(result.retryAfter, result.error || 'Erro ao enviar código');
      }
    } catch {
      toast.error('Erro ao enviar código. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Etapa 2: verifica o código
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

  // Etapa 3: redefine a senha
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
        handleRateLimit(result.retryAfter, result.error || 'Erro ao reenviar código');
      }
    } catch {
      toast.error('Erro ao reenviar código');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClass = (hasError: boolean) =>
    cn(
      'h-12 pl-11 bg-muted/50 border-border transition-all',
      'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
      hasError && 'border-destructive focus:border-destructive'
    );

  const current = step === 'success' ? null : stepMeta[step];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Indicador de etapas */}
      {current && (
        <div className="flex items-center gap-2" aria-hidden="true">
          {(Object.keys(stepMeta) as Array<keyof typeof stepMeta>).map((key) => {
            const meta = stepMeta[key];
            const done = meta.index < current.index;
            const active = meta.index === current.index;
            return (
              <div key={key} className="flex flex-1 flex-col gap-2">
                <div
                  className={cn(
                    'h-1 rounded-full transition-colors duration-300',
                    done || active ? 'bg-emerald-500' : 'bg-border'
                  )}
                />
                <span
                  className={cn(
                    'text-xs font-medium transition-colors',
                    active ? 'text-emerald-500' : 'text-muted-foreground'
                  )}
                >
                  {meta.label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Etapa 1: telefone */}
      {step === 'phone' && (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Recuperar senha
            </h1>
            <p className="text-muted-foreground">
              Enviaremos um código de 6 dígitos para o seu WhatsApp.
            </p>
          </div>

          <form onSubmit={phoneForm.handleSubmit(onSubmitPhone)} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="phone"
                className={cn(
                  'text-sm font-medium transition-colors',
                  focusedField === 'phone' ? 'text-emerald-500' : 'text-foreground'
                )}
              >
                Telefone/WhatsApp
              </Label>
              <IconField icon={Phone} focused={focusedField === 'phone'}>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={15}
                  placeholder="(11) 99999-9999"
                  {...phoneRegister}
                  onChange={(e) => {
                    e.target.value = formatPhoneBR(e.target.value);
                    phoneRegister.onChange(e);
                  }}
                  disabled={isLoading || isLocked}
                  onFocus={() => setFocusedField('phone')}
                  onBlur={(e) => {
                    setFocusedField(null);
                    phoneRegister.onBlur(e);
                  }}
                  aria-invalid={!!phoneForm.formState.errors.phone}
                  aria-describedby="phone-hint"
                  className={inputClass(!!phoneForm.formState.errors.phone)}
                />
              </IconField>
              <p
                id="phone-hint"
                className={cn(
                  'text-sm',
                  phoneForm.formState.errors.phone || (phoneDigits.length > 0 && !phoneIsValid)
                    ? 'text-destructive'
                    : 'text-muted-foreground'
                )}
              >
                {phoneForm.formState.errors.phone?.message ||
                  (phoneDigits.length > 0 && !phoneIsValid
                    ? phoneCheck.error
                    : 'Use o mesmo número cadastrado, com DDD.')}
              </p>
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full h-12 text-base font-semibold transition-all group',
                'bg-emerald-500 hover:bg-emerald-600 text-white',
                'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              )}
              disabled={isLoading || isLocked || !phoneIsValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Enviando...
                </>
              ) : isLocked ? (
                `Aguarde ${lockTime}s`
              ) : (
                <>
                  Enviar código
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-emerald-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para o login
          </Link>
        </>
      )}

      {/* Etapa 2: código */}
      {step === 'code' && (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Digite o código
            </h1>
            <p className="text-muted-foreground">
              Enviamos um código de 6 dígitos para{' '}
              <span className="font-medium text-foreground">{formatPhoneBR(phone)}</span>.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode} disabled={isLoading}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-12 text-lg" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Não recebeu?{' '}
              <button
                type="button"
                onClick={resendCode}
                disabled={isLoading || isLocked}
                className="font-medium text-emerald-500 transition-colors hover:text-emerald-400 disabled:opacity-50"
              >
                {isLocked ? `Aguarde ${lockTime}s` : 'Reenviar código'}
              </button>
            </p>

            <Button
              onClick={onSubmitCode}
              className={cn(
                'w-full h-12 text-base font-semibold transition-all group',
                'bg-emerald-500 hover:bg-emerald-600 text-white',
                'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              )}
              disabled={isLoading || code.length !== 6}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  Verificar código
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="flex w-full items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-emerald-500"
            >
              <ArrowLeft className="h-4 w-4" />
              Usar outro número
            </button>
          </div>
        </>
      )}

      {/* Etapa 3: nova senha */}
      {step === 'password' && (
        <>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
              Nova senha
            </h1>
            <p className="text-muted-foreground">Crie uma senha forte para sua conta.</p>
          </div>

          <form onSubmit={passwordForm.handleSubmit(onSubmitPassword)} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="password"
                className={cn(
                  'text-sm font-medium transition-colors',
                  focusedField === 'password' ? 'text-emerald-500' : 'text-foreground'
                )}
              >
                Nova senha
              </Label>
              <IconField icon={Lock} focused={focusedField === 'password'}>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Crie uma senha forte"
                  {...passwordForm.register('password')}
                  disabled={isLoading}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    inputClass(!!passwordForm.formState.errors.password),
                    'pr-11'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </IconField>

              {passwordValue.length > 0 && (
                <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          strengthInfo.color,
                          strengthInfo.width
                        )}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Força da senha:{' '}
                      <span className="font-medium">{strengthInfo.label}</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {requirements.map((req) => (
                      <div key={req.label} className="flex items-center gap-2">
                        {req.met ? (
                          <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span
                          className={cn(
                            'text-xs',
                            req.met ? 'text-emerald-500' : 'text-muted-foreground'
                          )}
                        >
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {passwordForm.formState.errors.password && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className={cn(
                  'text-sm font-medium transition-colors',
                  focusedField === 'confirmPassword' ? 'text-emerald-500' : 'text-foreground'
                )}
              >
                Confirmar senha
              </Label>
              <IconField icon={Lock} focused={focusedField === 'confirmPassword'}>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Digite novamente"
                  {...passwordForm.register('confirmPassword')}
                  disabled={isLoading}
                  onFocus={() => setFocusedField('confirmPassword')}
                  onBlur={() => setFocusedField(null)}
                  className={cn(
                    inputClass(!!passwordForm.formState.errors.confirmPassword),
                    'pr-11'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </IconField>
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full h-12 text-base font-semibold transition-all group',
                'bg-emerald-500 hover:bg-emerald-600 text-white',
                'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
              )}
              disabled={isLoading || !passwordIsValid}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Alterando...
                </>
              ) : (
                <>
                  Alterar senha
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>
        </>
      )}

      {/* Etapa 4: sucesso */}
      {step === 'success' && (
        <div className="space-y-8 text-center">
          <div className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
              <CheckCircle2 className="h-8 w-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                Senha alterada!
              </h1>
              <p className="text-muted-foreground text-pretty">
                Tudo pronto. Agora você já pode entrar com a sua nova senha.
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push('/login')}
            className={cn(
              'w-full h-12 text-base font-semibold transition-all group',
              'bg-emerald-500 hover:bg-emerald-600 text-white',
              'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40'
            )}
          >
            Ir para o login
            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
