'use client';

import useSWR from 'swr';
import { subscriptionsApi } from '@/lib/api';
import type { SubscriptionPermissions, PlanFeatures } from '@/types';

const permissionsFetcher = async () => {
  const res = await subscriptionsApi.getPermissions();
  if (!res.success) {
    // Retorna null para indicar sem assinatura (nao e um erro)
    return null;
  }
  return res.data;
};

export function useSubscription() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionPermissions | null>(
    'subscription-permissions',
    permissionsFetcher,
    { 
      revalidateOnFocus: false,
      // Nao trata como erro quando nao ha assinatura
      shouldRetryOnError: false,
    }
  );

  const defaultFeatures: PlanFeatures = {
    whatsappAutomations: 0,
    bookingPage: false,
    instagramBioLink: false,
    onlinePayment: false,
    financialDashboard: false,
    prioritySupport: false,
    recurringAppointments: false,
    paymentSplit: false,
    waitlist: false,
    advancedBI: false,
    retentionReports: false,
  };

  // Verifica se tem assinatura ativa (incluindo trial)
  const hasActiveSubscription = data?.hasActiveSubscription || false;
  
  // Verifica se esta em periodo de trial
  const isTrialing = data?.subscription?.isTrialing || false;
  const trialEndsAt = data?.subscription?.trialEndsAt || null;

  // Status da assinatura
  const subscriptionStatus = data?.subscription?.status || null;

  return {
    isLoading,
    error,
    hasActiveSubscription,
    plan: data?.plan || null,
    subscription: data?.subscription || null,
    limits: data?.limits || { maxProfessionals: 0, maxServices: 0, maxAppointments: 0 },
    features: data?.features || defaultFeatures,
    
    // Helpers
    canUseFeature: (feature: keyof PlanFeatures) => {
      if (!hasActiveSubscription) return false;
      const value = data?.features?.[feature];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      return false;
    },
    
    // Trial info
    isTrialing,
    trialEndsAt,
    subscriptionStatus,
    
    // Verifica se a assinatura esta vencida ou com problema
    isPastDue: subscriptionStatus === 'PAST_DUE',
    isCancelled: subscriptionStatus === 'CANCELLED',
    
    // Dias restantes do trial
    trialDaysRemaining: trialEndsAt 
      ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null,
    
    refresh: mutate,
  };
}
