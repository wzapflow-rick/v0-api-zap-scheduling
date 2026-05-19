'use client';

import useSWR from 'swr';
import { subscriptionsApi } from '@/lib/api';
import type { SubscriptionPermissions, PlanFeatures, TrialEligibility } from '@/types';

const permissionsFetcher = async () => {
  const res = await subscriptionsApi.getPermissions();
  console.log('[v0] Permissions API response:', res);
  if (!res.success) {
    return null;
  }
  return res.data;
};

const trialEligibilityFetcher = async () => {
  const res = await subscriptionsApi.checkTrialEligibility();
  if (!res.success) {
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

  // Status da assinatura
  const subscriptionStatus = data?.subscription?.status || null;
  
  // Verifica se esta em periodo de trial
  const isTrialing = data?.subscription?.isTrialing || subscriptionStatus === 'TRIALING';
  const trialEndsAt = data?.subscription?.trialEndsAt || null;

  // Verifica se o trial expirou
  const isTrialExpired = subscriptionStatus === 'TRIAL_EXPIRED';

  // Verifica se tem assinatura ativa (incluindo trial)
  // hasActiveSubscription e true se: API diz que tem OU status e ACTIVE/TRIALING
  const hasActiveSubscription = data?.hasActiveSubscription || 
    subscriptionStatus === 'ACTIVE' || 
    subscriptionStatus === 'TRIALING' ||
    isTrialing;

  console.log('[v0] useSubscription state:', { 
    hasActiveSubscription, 
    subscriptionStatus, 
    isTrialing, 
    isTrialExpired,
    rawData: data 
  });

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
    isTrialExpired,
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

export function useTrialEligibility() {
  const { data, error, isLoading, mutate } = useSWR<TrialEligibility | null>(
    'trial-eligibility',
    trialEligibilityFetcher,
    { 
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  return {
    isLoading,
    error,
    canTrial: data?.canTrial || false,
    reason: data?.reason || null,
    availablePlans: data?.availablePlans || [],
    previousTrials: data?.previousTrials || [],
    currentSubscription: data?.currentSubscription || null,
    refresh: mutate,
  };
}
