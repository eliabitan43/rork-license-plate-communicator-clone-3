import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { theme } from '@/constants/theme';
import { useEvents } from '@/hooks/useEvents';
import { EventType } from '@/types/events';
import { AlertCircle, MapPin, Navigation, Plus, ThumbsDown, ThumbsUp, ArrowLeft, Settings } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { enterUp } from '@/lib/motion';
import { ReportSheet } from '@/components/ReportSheet';
import { ThanksButton } from '@/components/ThanksButton';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useDebouncedCallback } from 'use-debounce';
import { gh } from '@/utils/geohash';
// import { trackEvent } from '@/utils/analytics';

function useInitialRegion() {
  const [region, setRegion] = useState<{ lat: number; lng: number; zoom: number }>({ lat: 37.7749, lng: -122.4194, zoom: 12 });
  const [locationError, setLocationError] = useState<string | null>(null);
  
  useEffect(() => {
    const getLocation = async () => {
      try {
        if (Platform.OS === 'web' && 'geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setRegion({ lat: p.coords.latitude, lng: p.coords.longitude, zoom: 13 });
              setLocationError(null);
            },
            (error) => {
              console.log('Web geolocation error:', error);
              setLocationError('Location access denied. Using default location.');
            },
            { timeout: 10000, enableHighAccuracy: false }
          );
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setRegion({ 
              lat: location.coords.latitude, 
              lng: location.coords.longitude, 
              zoom: 13 
            });
            setLocationError(null);
          } else {
            setLocationError('Location permission denied. Using default location.');
          }
        }
      } catch (error) {
        console.log('Location error:', error);
        setLocationError('Unable to get location. Using default location.');
      }
    };
    
    void getLocation();
  }, []);
  
  return { region, locationError };
}

const TTL_MS = 10 * 60 * 1000; // 10 minutes to match legend
const SUB_PRECISION = 7;

const LABELS: Partial<Record<EventType, string>> = {
  police: 'Speed radar',
  tow_truck: 'Tow truck',
  trash_truck: 'Sanitation',
  hazard: 'Hazard',
  accident: 'Accident',
  road_closure: 'Road closure',
  traffic_enforcement: 'Traffic enforcement',
  street_cleaning: 'Street cleaning',
  other: 'Other',
};

const formatEventLabel = (type: EventType): string => {
  if (LABELS[type]) {
    return LABELS[type] as string;
  }

  return type
    .split('_')
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(' ');
};

export default function MapLive() {
  const { events, filters, setFilter, submitReport, upvote, downvote, subscribeForCenter, diagnostics } = useEvents();
  const { region: initial, locationError } = useInitialRegion();
  const [sheetOpen, setSheetOpen] = useState<boolean>(false);
  const [driving, setDriving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [pendingVotes, setPendingVotes] = useState<Record<string, number>>({});
  const { id } = useLocalSearchParams<{id?:string}>();

  const debouncedSubscribe = useDebouncedCallback((lat:number,lng:number)=>{
    const _bucket = gh.encodeToPrecision(lat, lng, SUB_PRECISION);
    subscribeForCenter(lat, lng);
  }, 400);

  useEffect(() => {
    // trackEvent.mapView();
    debouncedSubscribe(initial.lat, initial.lng);
  }, [initial.lat, initial.lng, debouncedSubscribe]);

  useEffect(() => {
    if (!id) return;
    // optionally scroll to / highlight alert with that id
    console.log('Deep link to alert:', id);
  }, [id]);

  const onSelectType = useCallback(async (t: EventType) => {
    setSheetOpen(false);
    setIsSubmitting(true);
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const mapCenter = initial;
      const result = await submitReport({ 
        type: t, 
        lat: mapCenter.lat, 
        lng: mapCenter.lng, 
        details: {} 
      });
      
      if (result.ok) {
        // trackEvent.alertCreate(t, gh.encodeToPrecision(mapCenter.lat, mapCenter.lng, 6), TTL_MS);
        Alert.alert('Reported', 'Thanks for helping the community.');
      } else if (result.reason === 'rate_limited') {
        Alert.alert('Rate limited', 'Please wait before reporting again.');
      } else {
        Alert.alert('Error', 'Failed to report event.');
      }
    } catch {
      Alert.alert('Error', 'Failed to report event.');
    } finally {
      setIsSubmitting(false);
    }
  }, [initial, submitReport]);

  const vote = useCallback(async (id: string, dir: 1|-1) => {
    if (pendingVotes[id]) return; // throttle per-id
    setPendingVotes(p => ({...p, [id]: dir}));
    try {
      if (dir === 1) {
        // trackEvent.alertConfirm(id, 1);
        upvote(id);
      } else {
        downvote(id);
      }
    } finally {
      setPendingVotes(p => { const { [id]:_, ...rest } = p; return rest; });
    }
  }, [upvote, downvote, pendingVotes]);

  const setFilterDebounced = useDebouncedCallback((t:EventType, val:boolean)=>setFilter(t,val), 150);

  const filtered = useMemo(() => {
    return events.filter(e => filters[e.type] !== false);
  }, [events, filters]);

  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} testID="map-live-screen">
      <Stack.Screen options={{ title: 'Live Map', headerShown: false }} />
      
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            try {
              router.back();
            } catch {
              router.replace('/(tabs)/dashboard' as any);
            }
          }}
          testID="back-button"
        >
          <ArrowLeft size={24} color={theme.colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Map</Text>
        <TouchableOpacity 
          style={styles.settingsButton}
          onPress={() => {
            Alert.alert('Settings', 'Map settings coming soon!');
          }}
          testID="settings-button"
        >
          <Settings size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.mapArea} testID="map-area">
        <View style={styles.mapPlaceholder}>
          <MapPin size={48} color={theme.colors.primary} />
          <Text style={styles.mapText}>Live Map View</Text>
          <Text style={styles.mapSubtext}>
            Real-time community events near you
          </Text>
          {locationError && (
            <View style={styles.locationError}>
              <AlertCircle size={16} color={theme.colors.warning} />
              <Text style={styles.locationErrorText}>{locationError}</Text>
            </View>
          )}
          <Text style={styles.coordinatesText}>
            Coordinates {initial.lat.toFixed(4)}, {initial.lng.toFixed(4)}
          </Text>
        </View>
      </View>

      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }}>
          {(['police','tow_truck','trash_truck','hazard','accident','road_closure','traffic_enforcement','street_cleaning','other'] as EventType[]).map(t => (
            <TouchableOpacity key={t} style={[styles.pill, filters[t] === false && styles.pillOff]} onPress={() => setFilterDebounced(t, !(filters[t] !== false))} testID={`filter-${t}`}>
              <Text style={[styles.pillText, filters[t] === false && styles.pillTextOff]}>{formatEventLabel(t)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.legend}>
        <AlertCircle size={16} color={theme.colors.textSecondary} />
        <Text style={styles.legendText}>
          New events pulse for {TTL_MS/60000} minutes. Tap markers to confirm/clear.
        </Text>
      </View>

      <View style={styles.eventsList}>
        <ScrollView>
          {filtered.filter(e => e.id && e.id.trim()).map((e, index) => (
            <View key={`${e.id}-${index}`} style={styles.eventItem} testID={`event-${e.id}`}>
              <MapPin size={18} color={theme.colors.primary} />
              <Text style={styles.eventText}>
                {formatEventLabel(e.type)} • conf {e.confidence.toFixed(2)} • {Math.round((Date.now()-new Date(e.created_at).getTime())/60000)}m ago
              </Text>
              <ThanksButton 
                onPress={() => console.log('Thanks for event:', e.id)} 
                alertId={e.id}
              />
              <TouchableOpacity onPress={() => vote(e.id, 1)} style={styles.voteBtn} testID={`upvote-${e.id}`}>
                <ThumbsUp size={16} color={theme.colors.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => vote(e.id, -1)} style={styles.voteBtn} testID={`downvote-${e.id}`}>
                <ThumbsDown size={16} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          ))}
          {filtered.length === 0 && (
            <Animated.View entering={enterUp(0)} style={styles.emptyWrap} testID="map-empty">
              <MapPin size={28} color={theme.colors.textLight} />
              <Text style={styles.emptyTitle}>All quiet nearby</Text>
              <Text style={styles.empty}>Spot something on the road? Be the first to report it.</Text>
              <TouchableOpacity
                onPress={() => !isSubmitting && setSheetOpen(true)}
                style={styles.emptyCta}
                accessibilityRole="button"
                accessibilityLabel="Report an event"
              >
                <Text style={styles.emptyCtaText}>Report an event</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </ScrollView>
      </View>

      <View style={styles.fabRow}>
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => !isSubmitting && setSheetOpen(true)} 
          accessibilityLabel="Report" 
          testID="fab-report"
        >
          <Plus size={22} color={theme.colors.white} />
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.fab, styles.fabSecondary, driving && styles.fabDriving]} 
          onPress={() => setDriving(!driving)} 
          accessibilityLabel="I'm driving mode" 
          testID="fab-driving"
        >
          <Navigation size={20} color={driving ? theme.colors.white : theme.colors.textPrimary} />
          <Text style={[styles.fabLabel, driving && { color: theme.colors.white }]}>Driving</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.diagnostics}>
        <Text style={styles.dText}>
          GH: {gh.encodeToPrecision(initial.lat, initial.lng, SUB_PRECISION)} •
          Subs: {diagnostics.subscribedChannels} • Events: {diagnostics.eventsInMemory} • Battery: {diagnostics.batteryImpactEstimate}
        </Text>
      </View>

      <ReportSheet visible={sheetOpen} onClose={() => setSheetOpen(false)} onSelect={onSelectType} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapArea: { flex: 1 },
  mapPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#E8EEF9',
    padding: theme.spacing.xl,
  },
  mapText: { 
    color: theme.colors.textPrimary, 
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: theme.spacing.md,
  },
  mapSubtext: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  coordinatesText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warning + '20',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  locationErrorText: {
    color: theme.colors.warning,
    fontSize: theme.fontSize.sm,
    flex: 1,
  },
  filterRow: { position: 'absolute', top: 80, left: 0, right: 0 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.white, borderWidth: 1, borderColor: theme.colors.border },
  pillOff: { backgroundColor: '#EEE' },
  pillText: { color: theme.colors.textPrimary, fontSize: theme.fontSize.sm },
  pillTextOff: { color: theme.colors.gray },
  legend: { position: 'absolute', top: 50, left: 16, right: 16, backgroundColor: theme.colors.cardBg, padding: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: theme.colors.border },
  legendText: { marginLeft: 8, color: theme.colors.textSecondary, fontSize: 12 },
  eventsList: { height: 160, backgroundColor: theme.colors.cardBg, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1, borderColor: theme.colors.border },
  eventItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  eventText: { flex: 1, color: theme.colors.textPrimary },
  voteBtn: { padding: 8 },
  empty: { padding: 12, color: theme.colors.textSecondary, textAlign: 'center' as const },
  emptyWrap: {
    alignItems: 'center' as const,
    paddingVertical: 24,
    gap: 4,
  },
  emptyTitle: {
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    fontSize: theme.fontSize.md,
    marginTop: 6,
  },
  emptyCta: {
    marginTop: 6,
    minHeight: 44,
    justifyContent: 'center' as const,
    paddingHorizontal: 18,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.primary,
  },
  emptyCtaText: {
    color: theme.colors.white,
    fontWeight: '700' as const,
  },
  fabRow: { position: 'absolute', bottom: 180, right: 16, flexDirection: 'column', gap: 12 },
  fab: { width: 52, height: 52, borderRadius: 26, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3 },
  fabSecondary: { width: 120, flexDirection: 'row', gap: 8, justifyContent: 'center', backgroundColor: theme.colors.cardBg, borderWidth: 1, borderColor: theme.colors.border },
  fabDriving: { backgroundColor: theme.colors.success },
  fabLabel: { color: theme.colors.textPrimary, fontWeight: '600' },
  diagnostics: { position: 'absolute', bottom: 148, left: 0, right: 0, alignItems: 'center' },
  dText: { 
    color: theme.colors.textSecondary, 
    fontSize: 12,
    backgroundColor: theme.colors.cardBg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
});
