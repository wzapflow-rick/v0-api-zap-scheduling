'use client';

import { useState } from 'react';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { getPasswordRequirements, getPasswordStrength, type PasswordStrength } from '@/lib/validators';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  showRequirements?: boolean;
  showStrength?: boolean;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

const strengthConfig: Record<PasswordStrength, { label: string; color: string; width: string }> = {
  fraca: { label: 'Fraca', color: 'bg-red-500', width: 'w-1/3' },
  media: { label: 'Média', color: 'bg-yellow-500', width: 'w-2/3' },
  forte: { label: 'Forte', color: 'bg-green-500', width: 'w-full' },
};

export function PasswordInput({
  value,
  onChange,
  showRequirements = true,
  showStrength = true,
  placeholder = 'Digite sua senha',
  disabled = false,
  id,
  name,
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  const requirements = getPasswordRequirements(value);
  const strength = getPasswordStrength(value);
  const strengthInfo = strengthConfig[strength];

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          disabled={disabled}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {showStrength && value.length > 0 && (
        <div className="space-y-1">
          <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn('h-full transition-all duration-300', strengthInfo.color, strengthInfo.width)}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Força da senha: <span className="font-medium">{strengthInfo.label}</span>
          </p>
        </div>
      )}

      {showRequirements && value.length > 0 && (
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
      )}
    </div>
  );
}
