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
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

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
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Bem-vindo de volta!</CardTitle>
        <CardDescription>
          Entre na sua conta para acessar o painel
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              {...register('email')}
              disabled={isLoading || isLocked}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Esqueceu a senha?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Sua senha"
                {...register('password')}
                disabled={isLoading || isLocked}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
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
              'Entrar'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Criar conta
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
