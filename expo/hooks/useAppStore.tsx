import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Platform } from 'react-native';
import { UserProfile, Message, MessageType, RecentActivity, UserRating, PlateRating, UserBadge, Vehicle, EmergencyContact, NotificationPreferences } from '@/types';
import { safeJsonParse } from '@/utils/eventsStore';
import { reputationManager } from '@/utils/reputation';
import { supabase, isSupabaseConfigured, normalizePlate, registerDeviceToken } from '@/lib/supabase';

const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  MESSAGES: 'messages',
  RECENT_ACTIVITY: 'recent_activity',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  USER_RATINGS: 'user_ratings',
  NOTIFICATION_PREFS: 'notification_prefs',
  PENDING_SENDS: 'pending_sends',
};

interface RemoteMessagePayload {
  from_user_id: string;
  to_plate_normalized: string;
  to_country_code: string;
  category: string;
  action_id: string | null;
  body: string;
  is_anonymous: boolean;
  high_priority: boolean;
}

interface PendingSend {
  localId: string;
  payload: RemoteMessagePayload;
}

function isNetworkError(message: string): boolean {
  return /network request failed|failed to fetch|fetch failed|timeout/i.test(message);
}

export type RatingTotals = {
  averageRating: number;
  count: number;
  sum: number;
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function computeRatingTotals(ratings: readonly PlateRating[]): RatingTotals {
  const distribution: RatingTotals['distribution'] = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  const sum = ratings.reduce((acc, rating) => {
    const normalized = Math.max(1, Math.min(5, Math.round(rating.rating))) as 1 | 2 | 3 | 4 | 5;
    distribution[normalized] = (distribution[normalized] ?? 0) + 1;
    return acc + rating.rating;
  }, 0);

  const count = ratings.length;
  const averageRating = count > 0 ? sum / count : 0;

  return {
    averageRating,
    count,
    sum,
    distribution,
  };
}

export function computeCommunityScoreFromRatings(ratings: readonly PlateRating[]): number {
  return ratings.reduce((total, r) => {
    const basePoints = 10;
    const ratingBonus = r.rating * 5;
    return total + basePoints + ratingBonus;
  }, 0);
}

function useAppStoreLogic() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [userRatings, setUserRatings] = useState<UserRating[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // True once the initial AsyncStorage hydration finished (success or failure).
  // Gate skeleton loaders on this — isLoading is legacy and never flips.
  const [hydrated, setHydrated] = useState(false);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });


  // Using shared safeJsonParse from eventsStore - no need for local implementation

  useEffect(() => {
    let isMounted = true;
    
    setIsLoading(false);
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        let onboardingData = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETE);
        
        if (onboardingData === 'o' || onboardingData === 'object' || onboardingData === 'undefined' || onboardingData === 'null' || onboardingData === '') {
          console.error('Corrupted onboarding data detected, clearing all storage');
          await AsyncStorage.clear();
          if (isMounted) {
            setOnboardingComplete(false);
            setUserProfile(null);
            setMessages([]);
            setRecentActivity([]);
            setUserRatings([]);
            setNotificationPrefs({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
          }
          return;
        }
        
        const onboardingStatus = onboardingData ? safeJsonParse(onboardingData, false, 'onboarding_status') : false;
        
        if (!isMounted) return;
        setOnboardingComplete(Boolean(onboardingStatus));
        
        const [profileData, msgData, actData, ratingData, notifData] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.MESSAGES),
          AsyncStorage.getItem(STORAGE_KEYS.RECENT_ACTIVITY),
          AsyncStorage.getItem(STORAGE_KEYS.USER_RATINGS),
          AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATION_PREFS)
        ]);
        
        if (!isMounted) return;
        
        if (profileData === 'o' || msgData === 'o' || actData === 'o' || ratingData === 'o' || notifData === 'o' ||
            profileData === 'object' || msgData === 'object' || actData === 'object' || ratingData === 'object' || notifData === 'object' ||
            profileData === 'undefined' || msgData === 'undefined' || actData === 'undefined' || ratingData === 'undefined' || notifData === 'undefined' ||
            profileData === 'null' || msgData === 'null' || actData === 'null' || ratingData === 'null' || notifData === 'null' ||
            profileData === '' || msgData === '' || actData === '' || ratingData === '' || notifData === '') {
          console.error('Corrupted data detected in storage, clearing all');
          await AsyncStorage.clear();
          if (isMounted) {
            setUserProfile(null);
            setMessages([]);
            setRecentActivity([]);
            setUserRatings([]);
            setNotificationPrefs({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
            setOnboardingComplete(false);
          }
          return;
        }
        
        const profile = profileData ? safeJsonParse(profileData, null, 'user_profile') : null;
        const msgs = msgData ? safeJsonParse(msgData, [], 'messages') : [];
        const activity = actData ? safeJsonParse(actData, [], 'recent_activity') : [];
        const ratings = ratingData ? safeJsonParse(ratingData, [], 'user_ratings') : [];
        const notifPrefs = notifData ? safeJsonParse(notifData, { enabled: false, messages: true, listings: true, general: false, platform: 'unknown' }, 'notification_prefs') : { enabled: false, messages: true, listings: true, general: false, platform: 'unknown' };
        
        setUserProfile(profile && typeof profile === 'object' ? profile : null);
        setMessages(Array.isArray(msgs) ? msgs : []);
        setRecentActivity(Array.isArray(activity) ? activity : []);
        setUserRatings(Array.isArray(ratings) ? ratings : []);
        setNotificationPrefs(notifPrefs && typeof notifPrefs === 'object' ? notifPrefs : { enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
        
        console.log('App data loaded successfully');
      } catch (error: any) {
        console.error('Error loading app data:', error?.message || error);
        if (error?.message?.includes('JSON Parse error') || error?.message?.includes('Unexpected character')) {
          console.error('JSON parse error detected, clearing all storage');
          try {
            await AsyncStorage.clear();
          } catch {}
        }
        if (isMounted) {
          setOnboardingComplete(false);
          setUserProfile(null);
          setMessages([]);
          setRecentActivity([]);
          setUserRatings([]);
          setNotificationPrefs({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
        }
      }
    };

    setTimeout(async () => {
      try {
        await loadData();
      } finally {
        if (isMounted) setHydrated(true);
      }
    }, 50);

    return () => {
      isMounted = false;
    };
  }, []);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, JSON.stringify(true));
    setOnboardingComplete(true);
  }, []);

  const setUserAsAnonymous = useCallback(async () => {
    // Ghost mode: create a minimal local anonymous profile. Never clobber an
    // existing profile (e.g. a registered user re-running onboarding).
    if (userProfile) return;

    // Real anonymous session when Supabase is configured; ghost mode must still
    // work fully offline, so auth failure falls back to a local-only id.
    let authId: string | null = null;
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!error) authId = data.user?.id ?? null;
        else console.warn('Anonymous sign-in failed, continuing local-only:', error.message);
      } catch (e) {
        console.warn('Anonymous sign-in threw, continuing local-only:', e);
      }
    }

    const now = new Date().toISOString();
    const anonProfile: UserProfile = {
      id: authId ?? `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      isAnonymous: true,
      createdAt: now,
      allowNotifications: false,
      rating: 0,
      reviewCount: 0,
      communityScore: 0,
      badges: [],
      verificationStatus: 'unverified',
      accountType: 'personal',
      blockedUsers: [],
      trustedContacts: [],
      emergencyContacts: [],
      preferredLanguage: 'en',
      vehicles: [],
      termsAccepted: true,
      termsAcceptedAt: now,
      emailVerified: false,
      phoneVerified: false,
    };

    // Persist directly instead of via saveProfile() so the onboarding flag is
    // only flipped by the explicit completeOnboarding() call in the flow.
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(anonProfile));
    setUserProfile(anonProfile);
  }, [userProfile]);

  const saveProfile = useCallback(async (profile: UserProfile) => {
    try {
      console.log('saveProfile called with:', { 
        profileId: profile.id, 
        email: profile.email, 
        phone: profile.phone,
        vehicleCount: profile.vehicles?.length || 0,
        termsAccepted: profile.termsAccepted
      });
      
      // Ensure profile has default values if not set
      const profileWithDefaults = {
        ...profile,
        rating: profile.rating ?? 0,
        reviewCount: profile.reviewCount ?? 0,
        communityScore: profile.communityScore ?? 0,
        badges: Array.isArray(profile.badges) ? profile.badges : [],
        vehicles: Array.isArray(profile.vehicles) ? profile.vehicles : [],
        blockedUsers: Array.isArray(profile.blockedUsers) ? profile.blockedUsers : [],
        trustedContacts: Array.isArray(profile.trustedContacts) ? profile.trustedContacts : [],
        emergencyContacts: Array.isArray(profile.emergencyContacts) ? profile.emergencyContacts : [],
        preferredLanguage: profile.preferredLanguage ?? 'en',
        termsAccepted: profile.termsAccepted ?? false,
        emailVerified: profile.emailVerified ?? false,
        phoneVerified: profile.phoneVerified ?? false,
        verificationStatus: profile.verificationStatus ?? 'unverified',
        accountType: profile.accountType ?? 'personal',
      };
      
      console.log('Profile with defaults:', {
        id: profileWithDefaults.id,
        vehicleCount: profileWithDefaults.vehicles.length,
        termsAccepted: profileWithDefaults.termsAccepted,
        primaryVehicleId: profileWithDefaults.primaryVehicleId
      });
      
      // Validate before saving
      if (typeof profileWithDefaults !== 'object' || profileWithDefaults === null) {
        console.error('Invalid profile object');
        throw new Error('Invalid profile data');
      }
      
      // Validate required fields
      if (!profileWithDefaults.id) {
        console.error('Profile missing required ID');
        throw new Error('Profile must have an ID');
      }
      
      // Vehicles are optional — users can sign up without a license plate and add one later.
      
      // Simple save with error handling
      const profileJson = JSON.stringify(profileWithDefaults);
      
      // Validate JSON string
      if (!profileJson || profileJson === 'undefined' || profileJson === 'null') {
        console.error('Failed to stringify profile');
        throw new Error('Failed to save profile data');
      }
      
      console.log('Saving profile to AsyncStorage...');
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, profileJson);
      console.log('Profile saved to AsyncStorage successfully');
      
      // Update state
      setUserProfile(profileWithDefaults);
      console.log('Profile state updated');
      
      // Mark onboarding as complete - use JSON.stringify for boolean
      console.log('Marking onboarding as complete...');
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETE, JSON.stringify(true));
      setOnboardingComplete(true);
      console.log('Onboarding marked as complete');
      
      console.log('saveProfile completed successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error.message || error);
      console.error('Error stack:', error.stack);
      throw error;
    }
  }, []);

  const persistMessages = useCallback(async (next: Message[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(next));
    } catch (e) {
      console.error('Failed to persist messages', e);
    }
  }, []);

  const markDeliveryState = useCallback(
    (localId: string, state: NonNullable<Message['deliveryState']>) => {
      let next: Message[] = [];
      setMessages(prev => {
        next = prev.map(m => (m.id === localId ? { ...m, deliveryState: state } : m));
        return next;
      });
      void persistMessages(next);
    },
    [persistMessages],
  );

  const enqueuePendingSend = useCallback(async (item: PendingSend) => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SENDS);
      const queue: PendingSend[] = raw ? safeJsonParse(raw, [], 'pending_sends') : [];
      queue.push(item);
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SENDS, JSON.stringify(queue));
    } catch (e) {
      console.error('Failed to enqueue pending send', e);
    }
  }, []);

  const isFlushingRef = useRef(false);

  // Flush queued offline sends. Network failures keep items queued for the
  // next reconnect; hard server rejections mark the local message failed.
  const flushPendingSends = useCallback(async () => {
    if (!supabase || isFlushingRef.current) return;
    isFlushingRef.current = true;
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SENDS);
      const queue: PendingSend[] = raw ? safeJsonParse(raw, [], 'pending_sends') : [];
      if (queue.length === 0) return;

      const remaining: PendingSend[] = [];
      for (const item of queue) {
        const { error } = await supabase.from('messages').insert(item.payload);
        if (!error) {
          markDeliveryState(item.localId, 'delivered');
        } else if (isNetworkError(error.message)) {
          remaining.push(item);
        } else {
          console.error('Queued send rejected:', error.message);
          markDeliveryState(item.localId, 'failed');
        }
      }
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SENDS, JSON.stringify(remaining));
    } catch (e) {
      console.error('flushPendingSends failed', e);
    } finally {
      isFlushingRef.current = false;
    }
  }, [markDeliveryState]);

  // Flush whenever connectivity returns.
  useEffect(() => {
    if (!supabase) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) void flushPendingSends();
    });
    return unsubscribe;
  }, [flushPendingSends]);

  const sendMessage = useCallback(async (message: Message) => {
    // Optimistic local insert (functional updates — safe under rapid sends).
    const optimistic: Message = {
      ...message,
      deliveryState: isSupabaseConfigured ? 'sending' : (message.deliveryState ?? 'delivered'),
    };

    let nextMessages: Message[] = [];
    setMessages(prev => {
      nextMessages = [...prev, optimistic];
      return nextMessages;
    });
    void persistMessages(nextMessages);

    const activity: RecentActivity = {
      id: Date.now().toString(),
      type: 'sent',
      message: optimistic,
    };
    let nextActivity: RecentActivity[] = [];
    setRecentActivity(prev => {
      nextActivity = [activity, ...prev].slice(0, 50);
      return nextActivity;
    });
    void AsyncStorage.setItem(STORAGE_KEYS.RECENT_ACTIVITY, JSON.stringify(nextActivity)).catch(() => {});

    if (!supabase) return;

    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return; // Local-only session (e.g. ghost before Supabase was configured).

    const payload: RemoteMessagePayload = {
      from_user_id: userId,
      // to_user_id stays null — resolved server-side by the send-message Edge Function.
      to_plate_normalized: normalizePlate(message.toPlate),
      to_country_code: message.toCountry ?? 'IL',
      category: message.type,
      action_id: typeof message.metadata?.actionId === 'string' ? message.metadata.actionId : null,
      body: message.content,
      is_anonymous: message.isAnonymous,
      high_priority: message.priority === 'urgent',
    };

    // Offline: queue and keep the optimistic message in 'sending'.
    const net = await NetInfo.fetch();
    if (net.isConnected === false) {
      await enqueuePendingSend({ localId: message.id, payload });
      return;
    }

    const { error } = await supabase.from('messages').insert(payload);

    if (error && isNetworkError(error.message)) {
      // Connectivity flapped mid-request: queue instead of failing the send.
      await enqueuePendingSend({ localId: message.id, payload });
      return;
    }

    if (error) {
      // Rollback the optimistic insert so the UI can surface the failure honestly.
      console.error('Remote send failed, rolling back:', error.message);
      let rolledBack: Message[] = [];
      setMessages(prev => {
        rolledBack = prev.filter(m => m.id !== message.id);
        return rolledBack;
      });
      void persistMessages(rolledBack);
      setRecentActivity(prev => prev.filter(a => a.message.id !== message.id));
      throw new Error(error.message);
    }

    markDeliveryState(message.id, 'delivered');
  }, [enqueuePendingSend, markDeliveryState, persistMessages]);

  // Realtime: keep threads fresh — new rows addressed to me appear instantly.
  // Re-subscribes on every auth change: at first mount there is no session yet
  // (ghost/OTP sign-in happens later in onboarding), so a one-shot subscribe
  // would never connect on fresh installs.
  useEffect(() => {
    if (!supabase) return;

    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;
    let cancelled = false;

    const teardown = () => {
      if (channel) {
        void supabase!.removeChannel(channel);
        channel = null;
      }
    };

    const subscribe = (userId: string | undefined) => {
      teardown();
      if (!userId || cancelled) return;

      channel = supabase!
        .channel(`messages-to-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `to_user_id=eq.${userId}`,
          },
          (payload) => {
            const row = payload.new as {
              id: string;
              to_plate_normalized: string;
              category: string;
              body: string;
              is_anonymous: boolean;
              high_priority: boolean;
              created_at: string;
            };
            const incoming: Message = {
              id: row.id,
              fromPlate: row.is_anonymous ? 'ANONYMOUS' : 'DRIVER',
              toPlate: row.to_plate_normalized,
              content: row.body,
              type: row.category as MessageType,
              isAnonymous: row.is_anonymous,
              timestamp: row.created_at,
              isRead: false,
              priority: row.high_priority ? 'urgent' : 'medium',
            };
            let next: Message[] = [];
            setMessages(prev => {
              if (prev.some(m => m.id === incoming.id)) {
                next = prev;
                return prev;
              }
              next = [...prev, incoming];
              return next;
            });
            void persistMessages(next);
          },
        )
        .subscribe();
    };

    void supabase.auth.getUser().then(({ data }) => subscribe(data.user?.id));
    const { data: authSub } = supabase.auth.onAuthStateChange((_event, session) => {
      subscribe(session?.user?.id);
    });

    return () => {
      cancelled = true;
      authSub.subscription.unsubscribe();
      teardown();
    };
  }, [persistMessages]);

  const markMessageAsRead = useCallback(async (messageId: string) => {
    try {
      const updatedMessages = messages.map(msg => 
        msg.id === messageId ? { ...msg, isRead: true } : msg
      );
      await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
      setMessages(updatedMessages);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }, [messages]);

  const clearAllData = useCallback(async () => {
    try {
      await AsyncStorage.clear();
      setUserProfile(null);
      setMessages([]);
      setRecentActivity([]);
      setUserRatings([]);
      setOnboardingComplete(false);
      setNotificationPrefs({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
      console.log('All data cleared successfully');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isFileNotFoundError = errorMessage.includes('No such file or directory') || 
                                   errorMessage.includes('couldn\'t be removed') ||
                                   error?.code === 'ENOENT' ||
                                   error?.code === 4;
      
      if (isFileNotFoundError) {
        console.log('Storage directory not found (already cleared or never created), continuing...');
        setUserProfile(null);
        setMessages([]);
        setRecentActivity([]);
        setUserRatings([]);
        setOnboardingComplete(false);
        setNotificationPrefs({ enabled: false, messages: true, listings: true, general: false, platform: 'unknown' });
      } else {
        console.error('Error clearing data:', error);
        throw error;
      }
    }
  }, []);

  const addVehicle = useCallback(async (vehicle: Vehicle) => {
    console.log('addVehicle called with:', vehicle);
    
    if (!userProfile) {
      console.error('No user profile found');
      throw new Error('No user profile found');
    }
    
    // Ensure vehicles array exists and is an array
    const currentVehicles = Array.isArray(userProfile.vehicles) ? userProfile.vehicles : [];
    console.log('Current vehicles count:', currentVehicles.length);
    
    // Check for duplicates
    const exists = currentVehicles.some(v => 
      v.licensePlate.toUpperCase() === vehicle.licensePlate.toUpperCase()
    );
    
    if (exists) {
      console.error('Vehicle already exists:', vehicle.licensePlate);
      throw new Error('Vehicle with this license plate already exists');
    }
    
    // Check vehicle limit
    if (currentVehicles.length >= 8) {
      console.error('Vehicle limit reached');
      throw new Error('Maximum of 8 vehicles allowed');
    }
    
    const updatedProfile = {
      ...userProfile,
      vehicles: [...currentVehicles, vehicle]
    };
    
    console.log('Saving updated profile with vehicles:', updatedProfile.vehicles.length);
    await saveProfile(updatedProfile);
    console.log('Vehicle added successfully');
  }, [userProfile, saveProfile]);

  const removeVehicle = useCallback(async (vehicleId: string) => {
    console.log('removeVehicle called with:', vehicleId);
    
    if (!userProfile || !Array.isArray(userProfile.vehicles)) {
      console.error('No user profile or vehicles array');
      throw new Error('No user profile or vehicles found');
    }
    
    const vehicleToRemove = userProfile.vehicles.find(v => v.id === vehicleId);
    if (!vehicleToRemove) {
      console.error('Vehicle not found:', vehicleId);
      throw new Error('Vehicle not found');
    }
    
    // Check if this is the last vehicle - cannot remove
    if (userProfile.vehicles.length === 1) {
      console.error('Cannot remove last vehicle');
      throw new Error('Cannot remove the last vehicle. Profile must have at least one vehicle.');
    }
    
    const updatedProfile = {
      ...userProfile,
      vehicles: userProfile.vehicles.filter(v => v.id !== vehicleId)
    };
    
    // If removing primary vehicle, set another as primary
    if (userProfile.primaryVehicleId === vehicleId && updatedProfile.vehicles.length > 0) {
      updatedProfile.primaryVehicleId = updatedProfile.vehicles[0].id;
      updatedProfile.vehicles[0].isPrimary = true;
      console.log('Set new primary vehicle:', updatedProfile.vehicles[0].licensePlate);
    }
    
    console.log('Saving updated profile, vehicles remaining:', updatedProfile.vehicles.length);
    await saveProfile(updatedProfile);
    console.log('Vehicle removed successfully');
  }, [userProfile, saveProfile]);

  const setPrimaryVehicle = useCallback(async (vehicleId: string) => {
    console.log('setPrimaryVehicle called with:', vehicleId);
    
    if (!userProfile || !Array.isArray(userProfile.vehicles)) {
      console.error('No user profile or vehicles array');
      throw new Error('No user profile or vehicles found');
    }
    
    const vehicleExists = userProfile.vehicles.some(v => v.id === vehicleId);
    if (!vehicleExists) {
      console.error('Vehicle not found:', vehicleId);
      throw new Error('Vehicle not found');
    }
    
    const updatedProfile = {
      ...userProfile,
      primaryVehicleId: vehicleId,
      vehicles: userProfile.vehicles.map(v => ({
        ...v,
        isPrimary: v.id === vehicleId
      }))
    };
    
    console.log('Setting primary vehicle:', vehicleId);
    await saveProfile(updatedProfile);
    console.log('Primary vehicle updated successfully');
  }, [userProfile, saveProfile]);

  const primaryVehicle = useMemo(() => {
    if (!userProfile || !Array.isArray(userProfile.vehicles)) return null;
    return userProfile.vehicles.find(v => v.isPrimary) || userProfile.vehicles[0] || null;
  }, [userProfile]);

  const unreadCount = useMemo(() => {
    if (!primaryVehicle) return 0;
    return messages.filter(msg => 
      !msg.isRead && msg.toPlate === primaryVehicle.licensePlate
    ).length;
  }, [messages, primaryVehicle]);

  const rateUser = useCallback(async (rating: UserRating) => {
    try {
      const newRatings = [...userRatings, rating];
      await AsyncStorage.setItem(STORAGE_KEYS.USER_RATINGS, JSON.stringify(newRatings));
      setUserRatings(newRatings);

      // Update message as rated if it's a message rating
      if (rating.messageId) {
        const updatedMessages = messages.map(msg => 
          msg.id === rating.messageId ? { ...msg, hasBeenRated: true, rating: rating.rating } : msg
        );
        await AsyncStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(updatedMessages));
        setMessages(updatedMessages);
      }

      // Give reputation points to the user who GAVE the rating (for being helpful/engaged)
      if (userProfile && userProfile.id) {
        await reputationManager.updateReputation(
          userProfile.id,
          'HELPFUL_MESSAGE',
          `Rated ${rating.toPlate} with ${rating.rating} stars`,
          rating.id
        );
        console.log('Reputation points awarded for giving rating');
      }

      // Update community score and reputation if this rating is for the current user's vehicle
      if (userProfile && userProfile.vehicles) {
        const isRatingForCurrentUser = userProfile.vehicles.some(v => v.licensePlate === rating.toPlate);
        if (isRatingForCurrentUser) {
          // Calculate new community score based on all ratings for this user
          const userRatingsForCurrentUser = newRatings.filter(r => 
            userProfile.vehicles.some(v => v.licensePlate === r.toPlate)
          );
          
          const communityScore = computeCommunityScoreFromRatings(userRatingsForCurrentUser);
          
          // Also update reputation system based on rating received
          if (rating.rating >= 4) {
            await reputationManager.updateReputation(
              userProfile.id,
              'COMMUNITY_THANKS',
              `Received ${rating.rating}-star rating from ${rating.fromPlate}`,
              rating.id
            );
          }
          
          const { averageRating, count } = computeRatingTotals(userRatingsForCurrentUser);

          const updatedProfile = {
            ...userProfile,
            communityScore,
            rating: averageRating,
            reviewCount: count,
          };
          
          await saveProfile(updatedProfile);
          console.log(`Community score updated: ${userProfile.communityScore || 0} -> ${communityScore}`);
          console.log(`Reputation points awarded for receiving rating`);

          try {
            const allowNotif = Boolean(notificationPrefs?.enabled ?? updatedProfile.allowNotifications);
            const allowRatingNotif = Boolean(notificationPrefs?.general ?? notificationPrefs?.messages ?? true);
            if (allowNotif && allowRatingNotif) {
              const title = 'New rating received';
              const body = `${rating.fromPlate} rated you ${rating.rating}★`;

              if (Platform.OS === 'web') {
                if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                  new Notification(title, { body, tag: 'rating-received' });
                }
              } else {
                const expoNotifications = await import('expo-notifications');
                const perm = await expoNotifications.getPermissionsAsync();
                if (perm.status === 'granted') {
                  await expoNotifications.scheduleNotificationAsync({
                    content: {
                      title,
                      body,
                      data: { type: 'rating-received', fromPlate: rating.fromPlate, rating: rating.rating },
                    },
                    trigger: null,
                  });
                }
              }

              console.log('Rating received notification triggered');
            }
          } catch (e) {
            console.log('Failed to trigger rating received notification', e);
          }
        }
      }
    } catch (error) {
      console.error('Error saving rating:', error);
      throw error;
    }
  }, [messages, notificationPrefs?.enabled, notificationPrefs?.general, notificationPrefs?.messages, saveProfile, userProfile, userRatings]);

  const calculateUserRating = useCallback((licensePlate: string) => {
    const userRatingsForPlate = userRatings.filter(r => r.toPlate === licensePlate);
    const { averageRating, count } = computeRatingTotals(userRatingsForPlate);

    return {
      rating: averageRating,
      count,
    };
  }, [userRatings]);

  const awardBadge = useCallback(async (badge: UserBadge) => {
    if (!userProfile) return;
    
    const existingBadge = userProfile.badges.find(b => b.type === badge.type);
    if (existingBadge) return; // Badge already earned
    
    const updatedProfile = {
      ...userProfile,
      badges: [...userProfile.badges, badge]
    };
    
    await saveProfile(updatedProfile);
  }, [userProfile, saveProfile]);

  const updateAvatar = useCallback(async (avatarUrl: string) => {
    if (!userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      avatar: avatarUrl
    };
    
    await saveProfile(updatedProfile);
  }, [userProfile, saveProfile]);

  const addEmergencyContact = useCallback(async (contact: EmergencyContact) => {
    if (!userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      emergencyContacts: [...(userProfile.emergencyContacts || []), contact]
    };
    
    await saveProfile(updatedProfile);
  }, [userProfile, saveProfile]);

  const updateEmergencyContact = useCallback(async (contactId: string, updates: Partial<EmergencyContact>) => {
    if (!userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      emergencyContacts: (userProfile.emergencyContacts || []).map(c => 
        c.id === contactId ? { ...c, ...updates } : c
      )
    };
    
    await saveProfile(updatedProfile);
  }, [userProfile, saveProfile]);

  const removeEmergencyContact = useCallback(async (contactId: string) => {
    if (!userProfile) return;
    
    const updatedProfile = {
      ...userProfile,
      emergencyContacts: (userProfile.emergencyContacts || []).filter(c => c.id !== contactId)
    };
    
    await saveProfile(updatedProfile);
  }, [userProfile, saveProfile]);

  const saveNotificationPrefs = useCallback(async (prefs: NotificationPreferences) => {
    try {
      const merged: NotificationPreferences = { ...notificationPrefs, ...prefs };
      await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATION_PREFS, JSON.stringify(merged));
      setNotificationPrefs(merged);

      // Route pushes server-side: keep the devices table in sync with this token.
      if (merged.enabled && merged.pushToken && merged.platform && merged.platform !== 'unknown') {
        void registerDeviceToken(merged.pushToken, merged.platform);
      }
      if (userProfile) {
        const updatedProfile = { ...userProfile, allowNotifications: merged.enabled, notificationPreferences: merged } as UserProfile;
        await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(updatedProfile));
        setUserProfile(updatedProfile);
      }
    } catch (e) {
      console.error('Failed to save notification prefs', e);
    }
  }, [notificationPrefs, userProfile]);

  return {
    userProfile,
    messages,
    recentActivity,
    userRatings,
    isLoading,
    hydrated,
    onboardingComplete,
    unreadCount,
    primaryVehicle,
    notificationPrefs,
    saveNotificationPrefs,
    completeOnboarding,
    setUserAsAnonymous,
    saveProfile,
    sendMessage,
    markMessageAsRead,
    rateUser,
    calculateUserRating,
    awardBadge,
    addVehicle,
    removeVehicle,
    setPrimaryVehicle,
    updateAvatar,
    addEmergencyContact,
    updateEmergencyContact,
    removeEmergencyContact,
    clearAllData,
  };
}

export const [AppProvider, useAppStore] = createContextHook(useAppStoreLogic);

export function useUnreadMessages() {
  const appStore = useAppStore();
  
  return useMemo(() => {
    if (!appStore || !appStore.primaryVehicle) return [];
    const primaryVehicle = appStore.primaryVehicle;
    return appStore.messages.filter(msg => 
      !msg.isRead && msg.toPlate === primaryVehicle.licensePlate
    );
  }, [appStore]);
}

export function useSentMessages() {
  const appStore = useAppStore();
  
  return useMemo(() => {
    if (!appStore || !appStore.userProfile || !Array.isArray(appStore.userProfile.vehicles)) return [];
    const userPlates = appStore.userProfile.vehicles.map(v => v.licensePlate);
    return appStore.messages.filter(msg => userPlates.includes(msg.fromPlate));
  }, [appStore]);
}