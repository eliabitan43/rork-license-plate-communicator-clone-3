import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import { EventItem, EventType, EventsDiagnostics } from '@/types/events';
import { computeGeohash6, computeNeighborChannels, loadEvents, saveEvents, upsertEvent } from '@/utils/eventsStore';
import { encodeGeohash, neighborsOf } from '@/utils/geohash';

export interface SubmitEventInput {
  type: EventType;
  lat: number;
  lng: number;
  details?: Record<string, unknown>;
}

export interface UseEventsResult {
  events: EventItem[];
  filters: Partial<Record<EventType, boolean>>;
  setFilter: (t: EventType, val: boolean) => void;
  submitReport: (input: SubmitEventInput) => Promise<{ ok: boolean; reason?: string; event?: EventItem }>;
  upvote: (id: string) => void;
  downvote: (id: string) => void;
  subscribeForCenter: (lat: number, lng: number) => void;
  diagnostics: EventsDiagnostics;
}

const TYPE_EXPIRY_MINUTES: Record<EventType, number> = {
  // Traffic & Road Conditions
  heavy_traffic: 60,
  construction: 120,
  pothole: 120,
  flooded_street: 120,
  icy_conditions: 120,
  // Vehicle & Driver Situations
  disabled_vehicle: 60,
  vehicle_blocking: 60,
  illegal_parking: 60,
  abandoned_vehicle: 120,
  // Safety & Law Enforcement
  checkpoint: 90,
  unmarked_police: 60,
  emergency_vehicle: 30,
  // Community & Environment
  lost_item: 120,
  found_item: 120,
  stray_animal: 60,
  fallen_tree: 180,
  downed_power_line: 240,
  water_main_break: 240,
  // Services & Assistance
  gas_shortage: 120,
  parking_update: 60,
  rest_area_closed: 120,
  free_tow_nearby: 60,
  // Community Engagement
  good_neighbor: 60,
  suspicious_activity: 60,
  help_request: 60,
  break_in_attempt: 90,
  vandalism: 120,
  // New incident types with specific TTL
  traffic_enforcement_new: 15, // 15 minutes
  road_hazard: 30, // 30 minutes
  road_closure_new: 60, // 60 minutes (extendable)
  vehicle_on_shoulder: 20, // 20 minutes
  // Legacy types
  police: 60,
  tow_truck: 60,
  trash_truck: 25,
  hazard: 120,
  accident: 120,
  road_closure: 120,
  traffic_enforcement: 90,
  street_cleaning: 180,
  other: 60,
} as const;

const RATE_LIMIT_SECONDS = 30;

const lastReportMap = new Map<string, number>(); // key = `${type}:${gh}`
let notifiedRef: Record<string, number> = {}; // id -> timestamp

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const sin1 = Math.sin(dLat / 2);
  const sin2 = Math.sin(dLon / 2);
  const a = sin1 * sin1 + Math.cos(lat1) * Math.cos(lat2) * sin2 * sin2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const now = () => Date.now();
const clamp = (v: number, lo = -1, hi = 1) => Math.max(lo, Math.min(hi, v));

const isVisible = (e: EventItem, viewerRep = 0) => {
  const fresh = now() < new Date(e.expires_at).getTime();
  if (!fresh) return false;
  
  // Show all events that are not expired and have reasonable confidence
  // This makes events more visible on the live map
  if (e.confidence < -0.9) return false; // Only hide extremely downvoted events
  
  // Show real-time alerts immediately
  if (e.details?.isRealTimeAlert) return true;
  
  // Show all events with any reports (including the original report)
  // This is more permissive to ensure events are visible on live map
  return (e.reports_count ?? 0) >= 0; // Show all events, even with 0 reports
};

function nowIso() { return new Date().toISOString(); }

function addMinutes(baseIso: string, mins: number) {
  const d = new Date(baseIso);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

function clampExpiry(baseIso: string) {
  const d = new Date(baseIso);
  const max = new Date();
  max.setHours(max.getHours() + 2);
  return d > max ? max.toISOString() : d.toISOString();
}

export function useEvents(): UseEventsResult {
  const [state, setState] = useState<{ events: Record<string, EventItem>; filters: Partial<Record<EventType, boolean>>; diagnostics: EventsDiagnostics }>({ events: {}, filters: { police: true, tow_truck: true, trash_truck: true, hazard: true, accident: true, road_closure: true, traffic_enforcement: true, street_cleaning: true, traffic_enforcement_new: true, road_hazard: true, road_closure_new: true, vehicle_on_shoulder: true, other: true }, diagnostics: { subscribedChannels: 0, eventsInMemory: 0, batteryImpactEstimate: 'low', errors: [] } });
  const subscribed = useRef<Set<string>>(new Set());
  const headingRef = useRef<number | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  const networkSub = useRef<{subscribe:(c:string)=>void; unsubscribe:(c:string)=>void} | null>(null);
  const SUB_PRECISION = 7;

  useEffect(() => {
    (async () => {
      const loaded = await loadEvents();
      setState(prev => ({ ...prev, events: loaded.events, filters: loaded.filters, diagnostics: loaded.diagnostics }));
      
      // Always add some recent mock events for demo purposes to ensure events are visible
      // This helps with testing and ensures users see activity on the map
      const hasRecentEvents = Object.values(loaded.events).some(e => 
        new Date(e.created_at).getTime() > Date.now() - 10 * 60 * 1000 // 10 minutes
      );
      
      // Always add mock events if we have fewer than 3 events or no recent events
      if (Object.keys(loaded.events).length < 3 || !hasRecentEvents) {
        const mockEvents: EventItem[] = [
          {
            id: 'demo-police-1',
            type: 'police',
            lat: 37.7849,
            lng: -122.4094,
            geohash: encodeGeohash(37.7849, -122.4094, 6),
            details: { isRealTimeAlert: true, reportedFromLiveMap: true },
            confidence: 0.8,
            reports_count: 3,
            created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
            expires_at: new Date(Date.now() + 58 * 60 * 1000).toISOString(), // 58 minutes from now
          },
          {
            id: 'demo-hazard-1',
            type: 'hazard',
            lat: 37.7649,
            lng: -122.4294,
            geohash: encodeGeohash(37.7649, -122.4294, 6),
            details: { isRealTimeAlert: true, reportedFromLiveMap: true },
            confidence: 0.6,
            reports_count: 2,
            created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
            expires_at: new Date(Date.now() + 119 * 60 * 1000).toISOString(), // 119 minutes from now
          },
          {
            id: 'demo-tow-1',
            type: 'tow_truck',
            lat: 37.7949,
            lng: -122.3994,
            geohash: encodeGeohash(37.7949, -122.3994, 6),
            details: { isRealTimeAlert: true, reportedFromLiveMap: true },
            confidence: 0.7,
            reports_count: 2,
            created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
            expires_at: new Date(Date.now() + 57 * 60 * 1000).toISOString(), // 57 minutes from now
          },
          {
            id: 'demo-traffic-enforcement-1',
            type: 'traffic_enforcement',
            lat: 37.7749,
            lng: -122.4194,
            geohash: encodeGeohash(37.7749, -122.4194, 6),
            details: { isRealTimeAlert: true, reportedFromLiveMap: true },
            confidence: 0.7,
            reports_count: 2,
            created_at: new Date(Date.now() - 4 * 60 * 1000).toISOString(), // 4 minutes ago
            expires_at: new Date(Date.now() + 86 * 60 * 1000).toISOString(), // 86 minutes from now
          },
          {
            id: 'demo-street-cleaning-1',
            type: 'street_cleaning',
            lat: 37.7549,
            lng: -122.4394,
            geohash: encodeGeohash(37.7549, -122.4394, 6),
            details: { isRealTimeAlert: false, reportedFromLiveMap: false },
            confidence: 0.9,
            reports_count: 4,
            created_at: new Date(Date.now() - 8 * 60 * 1000).toISOString(), // 8 minutes ago
            expires_at: new Date(Date.now() + 172 * 60 * 1000).toISOString(), // 172 minutes from now
          },
          // New incident types demo events
          {
            id: 'demo-traffic-enforcement-new-1',
            type: 'traffic_enforcement_new',
            lat: 37.7799,
            lng: -122.4144,
            geohash: encodeGeohash(37.7799, -122.4144, 6),
            details: { subtype: 'speed_radar', verified: true },
            confidence: 0.8,
            reports_count: 3,
            created_at: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
            expires_at: new Date(Date.now() + 14 * 60 * 1000).toISOString(), // 14 minutes from now
          },
          {
            id: 'demo-road-hazard-1',
            type: 'road_hazard',
            lat: 37.7699,
            lng: -122.4244,
            geohash: encodeGeohash(37.7699, -122.4244, 6),
            details: { subtype: 'debris', hasPhoto: true },
            confidence: 0.7,
            reports_count: 2,
            created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
            expires_at: new Date(Date.now() + 28 * 60 * 1000).toISOString(), // 28 minutes from now
          },
          {
            id: 'demo-road-closure-new-1',
            type: 'road_closure_new',
            lat: 37.7899,
            lng: -122.4044,
            geohash: encodeGeohash(37.7899, -122.4044, 6),
            details: { planned: false, detour: 'Use alternate route via Main St' },
            confidence: 0.9,
            reports_count: 5,
            created_at: new Date(Date.now() - 6 * 60 * 1000).toISOString(), // 6 minutes ago
            expires_at: new Date(Date.now() + 54 * 60 * 1000).toISOString(), // 54 minutes from now
          },
          {
            id: 'demo-vehicle-on-shoulder-1',
            type: 'vehicle_on_shoulder',
            lat: 37.7599,
            lng: -122.4344,
            geohash: encodeGeohash(37.7599, -122.4344, 6),
            details: { needsHelp: true, vehicleType: 'sedan' },
            confidence: 0.6,
            reports_count: 2,
            created_at: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
            expires_at: new Date(Date.now() + 17 * 60 * 1000).toISOString(), // 17 minutes from now
          },
        ];
        
        const mockEventsMap: Record<string, EventItem> = {};
        mockEvents.forEach(event => {
          mockEventsMap[event.id] = event;
        });
        
        setState(prev => ({ 
          ...prev, 
          events: { ...prev.events, ...mockEventsMap }, // Merge with existing events
          diagnostics: { ...prev.diagnostics, eventsInMemory: Object.keys({ ...prev.events, ...mockEventsMap }).length }
        }));
        
        console.log('✅ Added mock events for live map visibility:', mockEvents.length, 'events');
      }
    })();
  }, []);

  useEffect(() => {
    saveEvents({ events: state.events, filters: state.filters, diagnostics: state.diagnostics }).catch(() => {});
  }, [state.events, state.filters, state.diagnostics]);

  const setFilter = useCallback((t: EventType, val: boolean) => {
    setState(prev => ({ ...prev, filters: { ...prev.filters, [t]: val } }));
  }, []);

  const maintenancePurge = useCallback(() => {
    const nowMs = now();
    setState(prev => {
      const next: Record<string, EventItem> = {};
      for (const e of Object.values(prev.events)) {
        if (new Date(e.expires_at).getTime() > nowMs && e.confidence > -0.6) next[e.id] = e;
      }
      return { ...prev, events: next, diagnostics: { ...prev.diagnostics, eventsInMemory: Object.keys(next).length } };
    });
  }, []);

  useEffect(() => {
    const t = setInterval(maintenancePurge, 60 * 1000);
    return () => clearInterval(t);
  }, [maintenancePurge]);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'web' && 'geolocation' in navigator) {
        navigator.geolocation.watchPosition(p => {
          headingRef.current = (p as any)?.heading ?? null;
        }, () => {}, { enableHighAccuracy: false, maximumAge: 120000, timeout: 10000 });
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationWatchRef.current = await Location.watchHeadingAsync(h => {
            headingRef.current = h.trueHeading ?? h.magHeading ?? null;
          });
        }
      }
    })();
    return () => {
      locationWatchRef.current?.remove();
    };
  }, []);

  const sendProximityNotification = useCallback(async (event: EventItem) => {
    try {
      if (!isVisible(event)) return; // respect visibility rules
      // dedupe per event every 30 min
      const lastAt = notifiedRef[event.id] ?? 0;
      if (now() - lastAt < 30 * 60 * 1000) return;

      const settings = await Notifications.getPermissionsAsync();
      if (!settings.granted) return;
      let userPos: { latitude: number; longitude: number; heading?: number | null } | null = null;
      if (Platform.OS === 'web' && 'geolocation' in navigator) {
        // best-effort last position
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => { userPos = { latitude: p.coords.latitude, longitude: p.coords.longitude, heading: (p as any)?.heading ?? null }; resolve(); },
            () => resolve(),
            { maximumAge: 120000, timeout: 5000 }
          );
        });
      } else {
        const last = await Location.getLastKnownPositionAsync();
        if (last) userPos = { latitude: last.coords.latitude, longitude: last.coords.longitude, heading: headingRef.current };
      }
      if (!userPos) return;
      const dist = distanceMeters(userPos.latitude, userPos.longitude, event.lat, event.lng);
      if (dist > 2000) return;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const toDeg = (r: number) => (r * 180) / Math.PI;
      const y = Math.sin(toRad(event.lng - userPos.longitude)) * Math.cos(toRad(event.lat));
      const x = Math.cos(toRad(userPos.latitude)) * Math.sin(toRad(event.lat)) - Math.sin(toRad(userPos.latitude)) * Math.cos(toRad(event.lat)) * Math.cos(toRad(event.lng - userPos.longitude));
      let bearing = (toDeg(Math.atan2(y, x)) + 360) % 360;
      const head = (userPos.heading ?? headingRef.current ?? 0) % 360;
      let diff = Math.abs(bearing - head);
      if (diff > 180) diff = 360 - diff;
      if (diff > 30) return;
      
      notifiedRef[event.id] = now();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Homi',
          body: `${event.type.replace('_', ' ')} ahead • ${(dist/1000).toFixed(1)} km`,
          data: { type: 'alert', id: event.id, deeplink: `homi://alert?id=${encodeURIComponent(event.id)}` }
        },
        trigger: null,
      });
    } catch {}
  }, []);

  const onIncomingEvent = useCallback((incoming: EventItem) => {
    setState(prev => {
      const merged = upsertEvent(prev.events, incoming);
      return { ...prev, events: merged, diagnostics: { ...prev.diagnostics, eventsInMemory: Object.keys(merged).length } };
    });
    if (incoming.confidence >= 0.6) {
      sendProximityNotification(incoming).catch(() => {});
    }
  }, [sendProximityNotification]);

  const applySubscriptions = useCallback((next: Set<string>) => {
    // unsubscribe old
    subscribed.current.forEach(c => { if (!next.has(c)) networkSub.current?.unsubscribe?.(c); });
    // subscribe new
    next.forEach(c => { if (!subscribed.current.has(c)) networkSub.current?.subscribe?.(c); });
    subscribed.current = next;
    setState(prev => ({
      ...prev,
      diagnostics: {
        ...prev.diagnostics,
        subscribedChannels: next.size,
        subscribedList: Array.from(next) // optional for debugging UI
      }
    }));
  }, []);

  const subscribeForCenter = useCallback((lat: number, lng: number) => {
    const center = encodeGeohash(lat, lng, SUB_PRECISION);
    const ring = neighborsOf(center);
    const next = new Set<string>([center, ...ring]);
    applySubscriptions(next);
    setState(prev => ({ ...prev, diagnostics: { ...prev.diagnostics, lastCameraCenter: { lat, lng } } }));
  }, [applySubscriptions]);

  const submitReport = useCallback(async (input: SubmitEventInput) => {
    const gh6 = encodeGeohash(input.lat, input.lng, 6);
    const key = `${input.type}:${gh6}`;
    const nowMs = now();
    const last = lastReportMap.get(key) ?? 0;
    if (nowMs - last < RATE_LIMIT_SECONDS * 1000) {
      return { ok: false, reason: 'rate_limited' };
    }
    lastReportMap.set(key, nowMs);

    const createdAt = nowIso();
    const ttlMinutes = TYPE_EXPIRY_MINUTES[input.type] || 60;
    const expiresAt = addMinutes(createdAt, ttlMinutes);
    const gh = encodeGeohash(input.lat, input.lng, 6);

    const newEvent: EventItem = {
      id: `${input.type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      type: input.type,
      lat: input.lat,
      lng: input.lng,
      geohash: gh,
      details: {
        ...input.details,
        locationAccuracy: (input.details as any)?.locationAccuracy || 1000,
        isRealTimeAlert: (input.details as any)?.isRealTimeAlert || false,
        reportedFromLiveMap: (input.details as any)?.reportedFromLiveMap || false
      },
      confidence: (input.details as any)?.isRealTimeAlert ? 0.3 : 0, // Higher initial confidence for real-time reports
      reports_count: 1,
      created_at: createdAt,
      expires_at: expiresAt,
      ttlMs: ttlMinutes * 60 * 1000, // Add TTL in milliseconds for client use
    };

    const MERGE_WINDOW_SECONDS = 45;
    const MERGE_RADIUS_METERS = 350;
    const GH_PRECISION_FOR_MERGE = 7;

    setState(prev => {
      let found: EventItem | null = null;
      const createdAtMs = new Date(createdAt).getTime();
      const newGh = encodeGeohash(input.lat, input.lng, GH_PRECISION_FOR_MERGE);

      for (const e of Object.values(prev.events)) {
        if (e.type !== input.type) continue;
        const dt = Math.abs(new Date(e.created_at).getTime() - createdAtMs) / 1000;
        if (dt > MERGE_WINDOW_SECONDS) continue;
        const dist = distanceMeters(e.lat, e.lng, input.lat, input.lng);
        const sameBucket = e.geohash?.slice(0, GH_PRECISION_FOR_MERGE) === newGh;
        if (dist <= MERGE_RADIUS_METERS || sameBucket) { found = e; break; }
      }

      const next = { ...prev.events };
      if (found) {
        const updated: EventItem = {
          ...found,
          reports_count: (found.reports_count ?? 0) + 1,
          confidence: clamp(found.confidence + 0.2),
          expires_at: clampExpiry(addMinutes(found.expires_at, 5))
        };
        next[found.id] = updated;
      } else {
        next[newEvent.id] = newEvent;
      }
      return { ...prev, events: next, diagnostics: { ...prev.diagnostics, eventsInMemory: Object.keys(next).length } };
    });

    // Log successful real-time report
    if ((input.details as any)?.isRealTimeAlert) {
      console.log(`✅ Real-time ${input.type} report created:`, {
        id: newEvent.id,
        location: `${input.lat.toFixed(6)}, ${input.lng.toFixed(6)}`,
        accuracy: (input.details as any)?.locationAccuracy,
        ttlMinutes,
        expiresAt
      });
    }
    
    return { ok: true, event: newEvent };
  }, []);

  const upvote = useCallback((id: string) => {
    setState(prev => {
      const e = prev.events[id];
      if (!e) return prev;
      const updated: EventItem = {
        ...e,
        reports_count: (e.reports_count ?? 0) + 1,
        confidence: clamp(e.confidence + 0.15)
      };
      return { ...prev, events: { ...prev.events, [id]: updated } };
    });
  }, []);

  const downvote = useCallback((id: string) => {
    setState(prev => {
      const e = prev.events[id];
      if (!e) return prev;
      const conf = clamp(e.confidence - 0.3);
      const next = { ...prev.events };
      // hide when very low confidence OR expired; else keep with reduced confidence
      if (conf < -0.6) delete next[id];
      else next[id] = { ...e, confidence: conf };
      return { ...prev, events: next };
    });
  }, []);

  const events = useMemo(() => {
    const f = state.filters;
    return Object.values(state.events)
      .filter(e => f[e.type] !== false)
      .filter(e => isVisible(e))
      .sort((a,b) => b.confidence - a.confidence); // strongest first
  }, [state.events, state.filters]);

  return { events, filters: state.filters, setFilter, submitReport, upvote, downvote, subscribeForCenter, diagnostics: state.diagnostics };
}
