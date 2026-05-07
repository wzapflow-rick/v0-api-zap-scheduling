'use client';

import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import type { WorkingHours } from '@/types';

// Generate time options from 06:00 to 23:00 in 30-minute intervals
const generateTimeOptions = () => {
  const options: string[] = [];
  for (let hour = 6; hour < 24; hour++) {
    const hourStr = hour.toString().padStart(2, '0');
    options.push(`${hourStr}:00`);
    options.push(`${hourStr}:30`);
  }
  return options;
};

const timeOptions = generateTimeOptions();

const daysOfWeek = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

// Local format for working hours
export interface WorkingHoursLocal {
  [day: string]: {
    enabled: boolean;
    open: string;
    close: string;
  };
}

// Default working hours (all days disabled)
export const defaultWorkingHours: WorkingHoursLocal = {
  monday: { enabled: false, open: '09:00', close: '18:00' },
  tuesday: { enabled: false, open: '09:00', close: '18:00' },
  wednesday: { enabled: false, open: '09:00', close: '18:00' },
  thursday: { enabled: false, open: '09:00', close: '18:00' },
  friday: { enabled: false, open: '09:00', close: '18:00' },
  saturday: { enabled: false, open: '09:00', close: '13:00' },
  sunday: { enabled: false, open: '09:00', close: '13:00' },
};

// Convert API format to local format
export function apiToLocalWorkingHours(apiHours?: WorkingHours): WorkingHoursLocal {
  if (!apiHours) return { ...defaultWorkingHours };
  
  const localHours: WorkingHoursLocal = {};
  daysOfWeek.forEach(day => {
    const apiDay = apiHours[day.key];
    if (apiDay) {
      localHours[day.key] = {
        enabled: apiDay.isOpen,
        open: apiDay.openTime || '09:00',
        close: apiDay.closeTime || '18:00',
      };
    } else {
      localHours[day.key] = { ...defaultWorkingHours[day.key] };
    }
  });
  return localHours;
}

// Convert local format to API format
export function localToApiWorkingHours(localHours: WorkingHoursLocal): WorkingHours {
  const apiHours: WorkingHours = {};
  daysOfWeek.forEach(day => {
    const hours = localHours[day.key];
    apiHours[day.key] = {
      isOpen: hours.enabled,
      openTime: hours.open,
      closeTime: hours.close,
    };
  });
  return apiHours;
}

interface WorkingHoursEditorProps {
  value: WorkingHoursLocal;
  onChange: (hours: WorkingHoursLocal) => void;
  disabled?: boolean;
  compact?: boolean;
}

export function WorkingHoursEditor({ value, onChange, disabled = false, compact = false }: WorkingHoursEditorProps) {
  const updateHour = (day: string, field: 'enabled' | 'open' | 'close', newValue: boolean | string) => {
    onChange({
      ...value,
      [day]: {
        ...value[day],
        [field]: newValue,
      },
    });
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Horários de Trabalho</Label>
      <p className="text-xs text-muted-foreground mb-3">
        Configure os dias e horários que este profissional trabalha. Se não configurado, usará os horários do estabelecimento.
      </p>
      <div className={`space-y-2 ${compact ? 'max-h-60 overflow-y-auto pr-1' : ''}`}>
        {daysOfWeek.map((day) => {
          const dayHours = value[day.key] || defaultWorkingHours[day.key];
          return (
            <div 
              key={day.key} 
              className={`flex items-center gap-3 rounded-lg border p-3 ${compact ? 'py-2' : ''}`}
            >
              <div className="flex items-center gap-2 min-w-[140px]">
                <Switch
                  checked={dayHours.enabled}
                  onCheckedChange={(checked) => updateHour(day.key, 'enabled', checked)}
                  disabled={disabled}
                />
                <span className={`font-medium ${compact ? 'text-sm' : ''}`}>
                  {compact ? day.label.slice(0, 3) : day.label}
                </span>
              </div>
              
              {dayHours.enabled ? (
                <div className="flex items-center gap-2 flex-1">
                  <Select
                    value={dayHours.open}
                    onValueChange={(v) => updateHour(day.key, 'open', v)}
                    disabled={disabled}
                  >
                    <SelectTrigger className={compact ? 'w-20 h-8 text-xs' : 'w-24'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-muted-foreground text-sm">até</span>
                  <Select
                    value={dayHours.close}
                    onValueChange={(v) => updateHour(day.key, 'close', v)}
                    disabled={disabled}
                  >
                    <SelectTrigger className={compact ? 'w-20 h-8 text-xs' : 'w-24'}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={time} value={time}>{time}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <span className="text-muted-foreground text-sm">Não trabalha</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
