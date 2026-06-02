import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'homi_plate_claims_v1';

export interface PendingInvite {
  toPlate: string;
  country?: string;
  state?: string;
  fromPlate: string;
  fromName?: string;
  sampleMessage: string;
  count: number;
  firstAt: number;
  lastAt: number;
}

export interface PlateClaimRecord {
  plate: string;
  country?: string;
  state?: string;
  claimedAt: number;
  verified: boolean;
  verifiedAt?: number;
  verificationImage?: string;
}

interface PlateClaimsState {
  pendingByPlate: Record<string, PendingInvite>;
  claimedPlates: Record<string, PlateClaimRecord>;
}

const defaultState: PlateClaimsState = {
  pendingByPlate: {},
  claimedPlates: {},
};

function plateKey(plate: string): string {
  return plate.trim().toUpperCase();
}

export const [PlateClaimsProvider, usePlateClaims] = createContextHook(() => {
  const [state, setState] = useState<PlateClaimsState>(defaultState);
  const [isHydrated, setIsHydrated] = useState<boolean>(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && mounted) {
          const parsed = JSON.parse(raw) as PlateClaimsState;
          setState({ ...defaultState, ...parsed });
        }
      } catch (e) {
        console.log('[PlateClaims] hydrate failed', e);
      } finally {
        if (mounted) setIsHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const persist = useCallback(async (next: PlateClaimsState) => {
    setState(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.log('[PlateClaims] persist failed', e);
    }
  }, []);

  const recordPendingInvite = useCallback(
    async (params: {
      toPlate: string;
      country?: string;
      state?: string;
      fromPlate: string;
      fromName?: string;
      sampleMessage: string;
    }) => {
      const key = plateKey(params.toPlate);
      if (!key) return;
      const now = Date.now();
      const existing = state.pendingByPlate[key];
      const next: PendingInvite = existing
        ? {
            ...existing,
            count: existing.count + 1,
            lastAt: now,
            sampleMessage: params.sampleMessage || existing.sampleMessage,
            fromName: params.fromName ?? existing.fromName,
            country: params.country ?? existing.country,
            state: params.state ?? existing.state,
          }
        : {
            toPlate: key,
            country: params.country,
            state: params.state,
            fromPlate: params.fromPlate,
            fromName: params.fromName,
            sampleMessage: params.sampleMessage,
            count: 1,
            firstAt: now,
            lastAt: now,
          };

      const newState: PlateClaimsState = {
        ...state,
        pendingByPlate: { ...state.pendingByPlate, [key]: next },
      };
      await persist(newState);
      console.log('[PlateClaims] pending invite recorded', { plate: key, count: next.count });
    },
    [state, persist]
  );

  const getPendingInvite = useCallback(
    (plate: string): PendingInvite | null => {
      const key = plateKey(plate);
      return state.pendingByPlate[key] ?? null;
    },
    [state.pendingByPlate]
  );

  const claimPlate = useCallback(
    async (plate: string, country?: string, regionState?: string) => {
      const key = plateKey(plate);
      if (!key) return null;
      const pending = state.pendingByPlate[key] ?? null;
      const record: PlateClaimRecord = state.claimedPlates[key] ?? {
        plate: key,
        country,
        state: regionState,
        claimedAt: Date.now(),
        verified: false,
      };
      const { [key]: _removed, ...remainingPending } = state.pendingByPlate;
      const newState: PlateClaimsState = {
        pendingByPlate: remainingPending,
        claimedPlates: { ...state.claimedPlates, [key]: record },
      };
      await persist(newState);
      console.log('[PlateClaims] plate claimed', { plate: key, hadPending: pending?.count ?? 0 });
      return pending;
    },
    [state, persist]
  );

  const markVerified = useCallback(
    async (plate: string, imageUri?: string) => {
      const key = plateKey(plate);
      if (!key) return;
      const existing = state.claimedPlates[key] ?? {
        plate: key,
        claimedAt: Date.now(),
        verified: false,
      };
      const next: PlateClaimRecord = {
        ...existing,
        verified: true,
        verifiedAt: Date.now(),
        verificationImage: imageUri ?? existing.verificationImage,
      };
      const newState: PlateClaimsState = {
        ...state,
        claimedPlates: { ...state.claimedPlates, [key]: next },
      };
      await persist(newState);
      console.log('[PlateClaims] plate verified', { plate: key });
    },
    [state, persist]
  );

  const isVerified = useCallback(
    (plate: string): boolean => {
      const key = plateKey(plate);
      return Boolean(state.claimedPlates[key]?.verified);
    },
    [state.claimedPlates]
  );

  const totalPending = useMemo(() => {
    return Object.keys(state.pendingByPlate).length;
  }, [state.pendingByPlate]);

  return useMemo(
    () => ({
      isHydrated,
      pendingByPlate: state.pendingByPlate,
      claimedPlates: state.claimedPlates,
      totalPending,
      recordPendingInvite,
      getPendingInvite,
      claimPlate,
      markVerified,
      isVerified,
    }),
    [isHydrated, state.pendingByPlate, state.claimedPlates, totalPending, recordPendingInvite, getPendingInvite, claimPlate, markVerified, isVerified]
  );
});
