import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';

const STORAGE_KEY = 'homi_plus_subscription_v1';

export type PlanId = 'monthly' | 'annual' | 'lifetime';

export interface PremiumState {
  isActive: boolean;
  plan: PlanId | null;
  startedAt: number | null;
  trialEndsAt: number | null;
  source: 'mock' | null;
}

const defaultState: PremiumState = {
  isActive: false,
  plan: null,
  startedAt: null,
  trialEndsAt: null,
  source: null,
};

export const PLANS: {
  id: PlanId;
  title: string;
  price: string;
  cadence: string;
  badge?: string;
  highlight?: boolean;
  savings?: string;
}[] = [
  {
    id: 'monthly',
    title: 'Monthly',
    price: '$4.99',
    cadence: 'per month',
  },
  {
    id: 'annual',
    title: 'Annual',
    price: '$29.99',
    cadence: 'per year',
    badge: 'BEST VALUE',
    highlight: true,
    savings: 'Save 50%',
  },
  {
    id: 'lifetime',
    title: 'Lifetime',
    price: '$79.99',
    cadence: 'one-time',
  },
];

export const PLUS_FEATURES: { title: string; description: string; emoji: string }[] = [
  {
    emoji: '🚗',
    title: 'Unlimited Vehicles',
    description: 'Add every car, bike, boat or fleet vehicle you own.',
  },
  {
    emoji: '⚡',
    title: 'Priority Delivery',
    description: 'Your messages reach drivers first, instantly.',
  },
  {
    emoji: '🛡️',
    title: 'Anonymous Mode',
    description: 'Send messages without revealing your plate.',
  },
  {
    emoji: '📍',
    title: 'Live Location Sharing',
    description: 'Share precise location for emergencies & meetups.',
  },
  {
    emoji: '🎨',
    title: 'Custom Plate Themes',
    description: 'Stand out with premium plate badges & colors.',
  },
  {
    emoji: '📊',
    title: 'Advanced Insights',
    description: 'See who pinged you, response times & trends.',
  },
  {
    emoji: '🚫',
    title: 'No Ads, Ever',
    description: 'A clean, distraction-free experience.',
  },
];

export const [PremiumProvider, usePremium] = createContextHook(() => {
  const [state, setState] = useState<PremiumState>(defaultState);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as PremiumState;
          setState({ ...defaultState, ...parsed });
        }
      } catch (e) {
        console.log('[Premium] hydrate failed', e);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: PremiumState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('[Premium] persist failed', e);
    }
  }, []);

  const subscribe = useCallback(
    async (plan: PlanId): Promise<void> => {
      console.log('[Premium] mock subscribe', plan);
      await persist({
        isActive: true,
        plan,
        startedAt: Date.now(),
        trialEndsAt: null,
        source: 'mock',
      });
    },
    [persist]
  );

  const startTrial = useCallback(async (): Promise<void> => {
    console.log('[Premium] starting 7-day trial');
    const sevenDays = 1000 * 60 * 60 * 24 * 7;
    await persist({
      isActive: true,
      plan: 'monthly',
      startedAt: Date.now(),
      trialEndsAt: Date.now() + sevenDays,
      source: 'mock',
    });
  }, [persist]);

  const restore = useCallback(async (): Promise<boolean> => {
    console.log('[Premium] mock restore');
    return state.isActive;
  }, [state.isActive]);

  const cancel = useCallback(async (): Promise<void> => {
    console.log('[Premium] cancel subscription');
    await persist(defaultState);
  }, [persist]);

  const isOnTrial = useMemo(() => {
    return !!state.trialEndsAt && state.trialEndsAt > Date.now();
  }, [state.trialEndsAt]);

  const trialDaysLeft = useMemo(() => {
    if (!state.trialEndsAt) return 0;
    const diff = state.trialEndsAt - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [state.trialEndsAt]);

  return useMemo(
    () => ({
      ...state,
      isHydrated,
      isOnTrial,
      trialDaysLeft,
      subscribe,
      startTrial,
      restore,
      cancel,
    }),
    [state, isHydrated, isOnTrial, trialDaysLeft, subscribe, startTrial, restore, cancel]
  );
});
