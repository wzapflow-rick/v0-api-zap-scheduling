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
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const router = useRouter();
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

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

  const onSubmit = async (data: LoginFormData) => {
    if (isLocked) {
      toast.error(`Aguarde ${lockTime} segundos`);
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(data);
      if (result.success) {
        toast.success('Login realizado com sucesso!');
        router.push('/dashboard');
      } else {
        // Check for rate limiting
        if (result.retryAfter) {
          const seconds = result.retryAfter;
          setIsLocked(true);
          setLockTime(seconds);
          toast.error(`Muitas tentativas. Aguarde ${seconds} segundos.`);
        } else {
          toast.error(result.error || 'Erro ao fazer login');
        }
      }
    } catch {
      toast.error('Erro ao conectar com o servidor. Verifique sua conexão.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Entrar na conta
        </h1>
        <p className="text-muted-foreground">
          Digite suas credenciais para acessar o painel
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <Label 
            htmlFor="email" 
            className={cn(
              'text-sm font-medium transition-colors',
              focusedField === 'email' ? 'text-emerald-500' : 'text-foreground'
            )}
          >
            E-mail
          </Label>
          <div className="relative">
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
              focusedField === 'email' ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              <Mail className="h-5 w-5" />
            </div>
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
          </div>
          {errors.email && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label 
              htmlFor="password"
              className={cn(
                'text-sm font-medium transition-colors',
                focusedField === 'password' ? 'text-emerald-500' : 'text-foreground'
              )}
            >
              Senha
            </Label>
            <Link
              href="/forgot-password"
              className="text-sm text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <div className={cn(
              'absolute left-3 top-1/2 -translate-y-1/2 transition-colors',
              focusedField === 'password' ? 'text-emerald-500' : 'text-muted-foreground'
            )}>
              <Lock className="h-5 w-5" />
            </div>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
              {errors.password.message}
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
          disabled={isLoading || isLocked}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Entrando...
            </>
          ) : isLocked ? (
            `Aguarde ${lockTime}s`
          ) : (
            <>
              Entrar
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
            Novo por aqui?
          </span>
        </div>
      </div>

      {/* Register Link */}
      <div className="text-center">
        <Link 
          href="/register" 
          className={cn(
            'inline-flex items-center justify-center w-full h-12 px-6',
            'text-base font-medium text-emerald-500',
            'border-2 border-emerald-500/30 rounded-lg',
            'hover:bg-emerald-500/10 hover:border-emerald-500/50',
            'transition-all group'
          )}
        >
          Criar conta gratuita
          <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </div>
  );
}
