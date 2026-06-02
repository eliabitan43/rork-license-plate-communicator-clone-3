import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { usePremium } from '@/hooks/usePremium';
import { useAppStore } from '@/hooks/useAppStore';

const STORAGE_KEY = 'homi_referral_v1';

const APP_URL = 'https://homi.app';

export interface ReferralState {
  code: string;
  invitesSent: number;
  invitesClaimed: number;
  unlockedTiers: number[];
  pendingCodeFromInviter: string | null;
  lastSharedAt: number | null;
}

const TIERS: { count: number; reward: string; days: number }[] = [
  { count: 1, reward: 'Anonymous Mode unlocked', days: 0 },
  { count: 3, reward: '1 month of HOMI Plus', days: 30 },
  { count: 10, reward: '1 year of HOMI Plus', days: 365 },
];

function generateCode(seed?: string): string {
  const base = (seed || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9]/g, '');
  const hash = base.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let n = Math.abs(hash);
  let out = '';
  for (let i = 0; i < 6; i++) {
    out += alphabet[n % alphabet.length];
    n = Math.floor(n / alphabet.length) + (i + 1) * 7;
  }
  return out;
}

const defaultState: ReferralState = {
  code: '',
  invitesSent: 0,
  invitesClaimed: 0,
  unlockedTiers: [],
  pendingCodeFromInviter: null,
  lastSharedAt: null,
};

export const [ReferralProvider, useReferral] = createContextHook(() => {
  const [state, setState] = useState<ReferralState>(defaultState);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const premium = usePremium();
  const { userProfile, primaryVehicle } = useAppStore();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        let next: ReferralState = defaultState;
        if (raw) {
          const parsed = JSON.parse(raw) as ReferralState;
          next = { ...defaultState, ...parsed };
        }
        if (!next.code) {
          const seed = primaryVehicle?.licensePlate || userProfile?.id;
          next = { ...next, code: generateCode(seed) };
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        }
        if (mounted) setState(next);
      } catch (e) {
        console.log('[Referral] hydrate failed', e);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [primaryVehicle?.licensePlate, userProfile?.id]);

  const persist = useCallback(async (next: ReferralState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('[Referral] persist failed', e);
    }
  }, []);

  const inviteLink = useMemo(() => {
    if (!state.code) return APP_URL;
    return `${APP_URL}/i/${state.code}`;
  }, [state.code]);

  const shareMessage = useMemo(() => {
    return `I'm using HOMI to message any car by license plate. Use my code ${state.code} and we both unlock a free month of HOMI Plus → ${inviteLink}`;
  }, [state.code, inviteLink]);

  const checkUnlocks = useCallback(
    async (claimed: number) => {
      const tiersHit = TIERS.filter((t) => claimed >= t.count).map((t) => t.count);
      const newTiers = tiersHit.filter((c) => !state.unlockedTiers.includes(c));
      if (newTiers.length === 0) return;

      const biggest = TIERS.filter((t) => newTiers.includes(t.count)).sort((a, b) => b.days - a.days)[0];
      if (biggest && biggest.days > 0 && !premium.isActive) {
        try {
          await premium.subscribe('monthly');
          console.log(`[Referral] Unlocked ${biggest.reward}`);
        } catch (e) {
          console.log('[Referral] failed to apply premium reward', e);
        }
      }
      const next: ReferralState = {
        ...state,
        invitesClaimed: claimed,
        unlockedTiers: [...state.unlockedTiers, ...newTiers],
      };
      await persist(next);
    },
    [state, premium, persist]
  );

  const recordShare = useCallback(async () => {
    const next: ReferralState = {
      ...state,
      invitesSent: state.invitesSent + 1,
      lastSharedAt: Date.now(),
    };
    await persist(next);
  }, [state, persist]);

  const simulateClaim = useCallback(async () => {
    const claimed = state.invitesClaimed + 1;
    await checkUnlocks(claimed);
  }, [state.invitesClaimed, checkUnlocks]);

  const share = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        try { await Haptics.selectionAsync(); } catch {}
      }
      if (Platform.OS === 'web') {
        const nav = (typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }) : undefined);
        if (nav?.share) {
          await nav.share({ title: 'HOMI', text: shareMessage, url: inviteLink });
        } else {
          await Clipboard.setStringAsync(shareMessage);
        }
      } else {
        await Share.share({ message: shareMessage });
      }
      await recordShare();
    } catch (e) {
      console.log('[Referral] share cancelled or failed', e);
    }
  }, [shareMessage, inviteLink, recordShare]);

  const copyCode = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(state.code);
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } catch (e) {
      console.log('[Referral] copy failed', e);
    }
  }, [state.code]);

  const copyLink = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(inviteLink);
      if (Platform.OS !== 'web') {
        try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
      }
    } catch (e) {
      console.log('[Referral] copy link failed', e);
    }
  }, [inviteLink]);

  const setPendingInviterCode = useCallback(
    async (code: string | null) => {
      const next: ReferralState = { ...state, pendingCodeFromInviter: code };
      await persist(next);
    },
    [state, persist]
  );

  const nextTier = useMemo(() => {
    return TIERS.find((t) => state.invitesClaimed < t.count) ?? null;
  }, [state.invitesClaimed]);

  return useMemo(
    () => ({
      ...state,
      isHydrated,
      inviteLink,
      shareMessage,
      tiers: TIERS,
      nextTier,
      share,
      copyCode,
      copyLink,
      simulateClaim,
      setPendingInviterCode,
    }),
    [state, isHydrated, inviteLink, shareMessage, nextTier, share, copyCode, copyLink, simulateClaim, setPendingInviterCode]
  );
});
