'use client';

import useSWR from 'swr';
import { subscriptionsApi } from '@/lib/api';
import type { SubscriptionPermissions, PlanFeatures } from '@/types';

const permissionsFetcher = async () => {
  const res = await subscriptionsApi.getPermissions();
  if (!res.success) return null;
  return res.data;
};

export function useSubscription() {
  const { data, error, isLoading, mutate } = useSWR<SubscriptionPermissions | null>(
    'subscription-permissions',
    permissionsFetcher,
    { revalidateOnFocus: false }
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

  return {
    isLoading,
    error,
    hasActiveSubscription: data?.hasActiveSubscription || false,
    plan: data?.plan || null,
    subscription: data?.subscription || null,
    limits: data?.limits || { maxProfessionals: 0, maxServices: 0, maxAppointments: 0 },
    features: data?.features || defaultFeatures,
    
    // Helpers
    canUseFeature: (feature: keyof PlanFeatures) => {
      const value = data?.features?.[feature];
      if (typeof value === 'boolean') return value;
      if (typeof value === 'number') return value > 0;
      return false;
    },
    
    isTrialing: data?.subscription?.isTrialing || false,
    trialEndsAt: data?.subscription?.trialEndsAt || null,
    
    refresh: mutate,
  };
}
