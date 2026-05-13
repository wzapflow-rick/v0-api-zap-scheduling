'use client';

import useSWR from 'swr';
import { subscriptionsApi } from '@/lib/api';
import type { SubscriptionUsage } from '@/types';

const usageFetcher = async () => {
  const res = await subscriptionsApi.getUsage();
  if (!res.success) return null;
  return res.data;
};

export function useUsage() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionUsage | null>(
    'subscription-usage',
    usageFetcher,
    { revalidateOnFocus: false }
  );

  return {
    isLoading,
    error,
    usage: data?.usage || { professionals: 0, services: 0, appointmentsThisMonth: 0 },
    limits: data?.limits || { professionals: 0, services: 0, appointments: 0 },
    canAdd: data?.canAdd || { professional: false, service: false, appointment: false },
    percentUsed: data?.percentUsed || { professionals: 0, services: 0, appointments: 0 },
    refresh: mutate,
  };
}
