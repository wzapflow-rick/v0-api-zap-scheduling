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
import { Loader2, Check, X, Eye, EyeOff, Mail, Lock, User, Phone, Building2, ArrowRight, Scissors, Sparkles, Dumbbell, Stethoscope, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getPasswordRequirements, getPasswordStrength, isPasswordValid, passwordSchema } from '@/lib/validators';
import { cn } from '@/lib/utils';
import { analytics, AnalyticsEvent } from '@/lib/analytics';
import type { BusinessTypeId } from '@/types';

const businessTypeOptions: { id: BusinessTypeId; label: string; icon: React.ElementType }[] = [
  { id: 'BARBERSHOP', label: 'Barbearia', icon: Scissors },
  { id: 'BEAUTY_SALON', label: 'Salão de Beleza', icon: Sparkles },
  { id: 'PERSONAL_TRAINER', label: 'Personal Trainer', icon: Dumbbell },
  { id: 'CLINIC', label: 'Clínica', icon: Stethoscope },
  { id: 'OTHER', label: 'Outro', icon: Store },
];

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  establishmentName: z.string().min(2, 'Nome do estabelecimento é obrigatório'),
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas não conferem',
  path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const strengthConfig = {
  fraca: { label: 'Fraca', color: 'bg-red-500', width: 'w-1/3' },
  media: { label: 'Média', color: 'bg-yellow-500', width: 'w-2/3' },
  forte: { label: 'Forte', color: 'bg-emerald-500', width: 'w-full' },
};

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessTypeId>('BARBERSHOP');
  const router = useRouter();
  const { register: registerUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password') || '';
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

  const onSubmit = async (data: RegisterFormData) => {
    if (isLocked) {
      toast.error(`Aguarde ${lockTime} segundos`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        establishmentName: data.establishmentName,
        businessType,
      });
      
      if (result.success) {
        analytics.track(AnalyticsEvent.BUSINESS_TYPE_SELECTED, { businessType });
        toast.success('Conta criada com sucesso!');
        router.push('/dashboard');
      } else {
        // Check for rate limiting
        if (result.retryAfter) {
          const seconds = result.retryAfter;
          setIsLocked(true);
          setLockTime(seconds);
          toast.error(`Muitas tentativas. Aguarde ${seconds} segundos.`);
        } else {
          toast.error(result.error || 'Erro ao criar conta');
        }
      }
    } catch {
      toast.error('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  const InputWrapper = ({ 
    name, 
    label, 
    icon: Icon, 
    children 
  }: { 
    name: string; 
    label: string; 
    icon: React.ElementType; 
    children: React.ReactNode;
  }) => (
    <div className="space-y-2">
      <Label 
        htmlFor={name}
        className={cn(
          'text-sm font-medium transition-colors',
          focusedField === name ? 'text-emerald-500' : 'text-foreground'
        )}
      >
        {label}
      </Label>
      <div className="relative">
        <div className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10',
          focusedField === name ? 'text-emerald-500' : 'text-muted-foreground'
        )}>
          <Icon className="h-5 w-5" />
        </div>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Criar conta
        </h1>
        <p className="text-muted-foreground">
          Preencha os dados abaixo para começar
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Name Field */}
        <InputWrapper name="name" label="Seu nome" icon={User}>
          <Input
            id="name"
            placeholder="João Silva"
            {...register('name')}
            disabled={isLoading || isLocked}
            onFocus={() => setFocusedField('name')}
            onBlur={() => setFocusedField(null)}
            className={cn(
              'h-12 pl-11 bg-muted/50 border-border transition-all',
              'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
              errors.name && 'border-destructive focus:border-destructive'
            )}
          />
        </InputWrapper>
        {errors.name && (
          <p className="text-sm text-destructive -mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {errors.name.message}
          </p>
        )}

        {/* Email Field */}
        <InputWrapper name="email" label="E-mail" icon={Mail}>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            {...register('email')}
            disabled={isLoading || isLocked}
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
            className={cn(
              'h-12 pl-11 bg-muted/50 border-border transition-all',
              'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
              errors.email && 'border-destructive focus:border-destructive'
            )}
          />
        </InputWrapper>
        {errors.email && (
          <p className="text-sm text-destructive -mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {errors.email.message}
          </p>
        )}

        {/* Phone Field */}
        <InputWrapper name="phone" label="Telefone/WhatsApp" icon={Phone}>
          <Input
            id="phone"
            placeholder="(11) 99999-9999"
            {...register('phone')}
            disabled={isLoading || isLocked}
            onFocus={() => setFocusedField('phone')}
            onBlur={() => setFocusedField(null)}
            className={cn(
              'h-12 pl-11 bg-muted/50 border-border transition-all',
              'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
              errors.phone && 'border-destructive focus:border-destructive'
            )}
          />
        </InputWrapper>
        {errors.phone && (
          <p className="text-sm text-destructive -mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {errors.phone.message}
          </p>
        )}

        {/* Establishment Field */}
        <InputWrapper name="establishmentName" label="Nome do estabelecimento" icon={Building2}>
          <Input
            id="establishmentName"
            placeholder="Barbearia do João"
            {...register('establishmentName')}
            disabled={isLoading || isLocked}
            onFocus={() => setFocusedField('establishmentName')}
            onBlur={() => setFocusedField(null)}
            className={cn(
              'h-12 pl-11 bg-muted/50 border-border transition-all',
              'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
              errors.establishmentName && 'border-destructive focus:border-destructive'
            )}
          />
        </InputWrapper>
        {errors.establishmentName && (
          <p className="text-sm text-destructive -mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            {errors.establishmentName.message}
          </p>
        )}

        {/* Business Type Selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground">
            Qual é o seu negócio?
          </Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {businessTypeOptions.map((option) => {
              const Icon = option.icon;
              const selected = businessType === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setBusinessType(option.id)}
                  disabled={isLoading || isLocked}
                  aria-pressed={selected}
                  className={cn(
                    'flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-4 text-center transition-all',
                    'hover:border-emerald-500/50 disabled:opacity-50',
                    selected
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-500'
                      : 'border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  <Icon className="h-6 w-6" />
                  <span className="text-xs font-medium leading-tight text-balance">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label 
            htmlFor="password"
            className={cn(
              'text-sm font-medium transition-colors',
              focusedField === 'password' ? 'text-emerald-500' : 'text-foreground'
            )}
          >
            Senha
          </Label>
          <div className="relative">
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10',
              focusedField === 'password' ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              <Lock className="h-5 w-5" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Crie uma senha forte"
              {...register('password')}
              disabled={isLoading || isLocked}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                'h-12 pl-11 pr-11 bg-muted/50 border-border transition-all',
                'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
                errors.password && 'border-destructive focus:border-destructive'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading || isLocked}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors z-10"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          
          {/* Password strength indicator */}
          {passwordValue.length > 0 && (
            <div className="space-y-3 pt-1 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1.5">
                <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn('h-full transition-all duration-300', strengthInfo.color, strengthInfo.width)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Força da senha: <span className="font-medium">{strengthInfo.label}</span>
                </p>
              </div>
              
              {/* Password requirements */}
              <div className="grid grid-cols-2 gap-2">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2 text-sm">
                    {req.met ? (
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={cn(
                      'text-xs',
                      req.met ? 'text-emerald-500' : 'text-muted-foreground'
                    )}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
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
          <div className="relative">
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 transition-colors z-10',
              focusedField === 'confirmPassword' ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              <Lock className="h-5 w-5" />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              {...register('confirmPassword')}
              disabled={isLoading || isLocked}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              className={cn(
                'h-12 pl-11 pr-11 bg-muted/50 border-border transition-all',
                'focus:border-emerald-500 focus:ring-emerald-500/20 focus:bg-background',
                errors.confirmPassword && 'border-destructive focus:border-destructive'
              )}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              disabled={isLoading || isLocked}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors z-10"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button 
          type="submit" 
          className={cn(
            'w-full h-12 text-base font-semibold transition-all',
            'bg-emerald-500 hover:bg-emerald-600 text-white',
            'shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40',
            'group'
          )}
          disabled={isLoading || isLocked || !passwordIsValid}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Criando conta...
            </>
          ) : isLocked ? (
            `Aguarde ${lockTime}s`
          ) : (
            <>
              Criar conta
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-background px-4 text-muted-foreground">
            Já tem uma conta?
          </span>
        </div>
      </div>

      {/* Login Link */}
      <div className="text-center">
        <Link 
          href="/login" 
          className={cn(
            'inline-flex items-center justify-center w-full h-12 px-6',
            'text-base font-medium text-emerald-500',
            'border-2 border-emerald-500/30 rounded-lg',
            'hover:bg-emerald-500/10 hover:border-emerald-500/50',
            'transition-all group'
          )}
        >
          Fazer login
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
