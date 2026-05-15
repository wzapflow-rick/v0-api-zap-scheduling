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
import { Loader2, Check, X, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { getPasswordRequirements, getPasswordStrength, isPasswordValid, passwordSchema } from '@/lib/validators';
import { cn } from '@/lib/utils';

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
  forte: { label: 'Forte', color: 'bg-green-500', width: 'w-full' },
};

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTime, setLockTime] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
      });
      
      if (result.success) {
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

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Criar Conta</CardTitle>
        <CardDescription>
          Comece a gerenciar seus agendamentos agora
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Seu Nome</Label>
            <Input
              id="name"
              placeholder="João Silva"
              {...register('name')}
              disabled={isLoading || isLocked}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

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
            <Label htmlFor="phone">Telefone/WhatsApp</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              {...register('phone')}
              disabled={isLoading || isLocked}
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="establishmentName">Nome do Estabelecimento</Label>
            <Input
              id="establishmentName"
              placeholder="Barbearia do João"
              {...register('establishmentName')}
              disabled={isLoading || isLocked}
            />
            {errors.establishmentName && (
              <p className="text-sm text-destructive">{errors.establishmentName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Crie uma senha forte"
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
            
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repita a senha"
                {...register('confirmPassword')}
                disabled={isLoading || isLocked}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading || isLocked}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading || isLocked || !passwordIsValid}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isLocked ? (
              `Aguarde ${lockTime}s`
            ) : (
              'Criar Conta'
            )}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
