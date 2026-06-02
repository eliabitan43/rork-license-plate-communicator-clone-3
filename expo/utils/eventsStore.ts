import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventItem, EventType, EventsDiagnostics } from '@/types/events';
import { encodeGeohash, neighbors } from '@/utils/geohash';

// Global flag to prevent infinite loops during corruption cleanup
let isCleaningStorage = false;

const EVENTS_KEY = 'events_store_v1';

export type EventsFilters = Partial<Record<EventType, boolean>>;

export interface EventsState {
  events: Record<string, EventItem>;
  filters: EventsFilters;
  diagnostics: EventsDiagnostics;
}

const defaultFilters: EventsFilters = {
  police: true,
  tow_truck: true,
  trash_truck: true,
  hazard: true,
  accident: true,
  road_closure: true,
  traffic_enforcement: true,
  street_cleaning: true,
  // New incident types
  traffic_enforcement_new: true,
  road_hazard: true,
  road_closure_new: true,
  vehicle_on_shoulder: true,
  other: true,
};

// Safe JSON parse helper with corruption detection - exported for use across the app
export function safeJsonParse(data: string | null, fallback: any = null, debugContext?: string) {
  if (!data || typeof data !== 'string' || data.trim() === '') {
    if (debugContext) console.log(`[${debugContext}] Empty or invalid data, using fallback`);
    return fallback;
  }
  
  try {
    const trimmedData = data.trim();
    
    // Handle boolean strings specially
    if (trimmedData === 'true') return true;
    if (trimmedData === 'false') return false;
    
    // CRITICAL: Immediate check for the "o" character corruption that causes JSON parse errors
    if (trimmedData === 'o') {
      console.error(`[${debugContext || 'safeJsonParse'}] CRITICAL: Single "o" character corruption detected - clearing all storage immediately`);
      // Immediately clear storage and reload
      clearStorageAndReload();
      return fallback;
    }
    
    // Comprehensive corruption check including other patterns
    const corruptedPatterns = [
      'object', 'undefined', 'null', '[object Object]', 'NaN',
      'function', 'symbol', 'bigint', 'Object', 'Array',
      'Promise', 'Error', 'TypeError', 'SyntaxError', 'ReferenceError'
    ];
    
    if (corruptedPatterns.includes(trimmedData)) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Detected corrupted data pattern:`, trimmedData);
      clearStorageAndReload();
      return fallback;
    }
    
    // Check for single character corruption (common issue)
    if (trimmedData.length === 1 && !/[\{\["\d\-tf]/.test(trimmedData)) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Single character corruption detected:`, trimmedData);
      clearStorageAndReload();
      return fallback;
    }
    
    // Check for incomplete JSON strings
    if (trimmedData.length < 3 && !['{}', '[]', '""', 'true', 'false'].includes(trimmedData) && isNaN(Number(trimmedData))) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Incomplete JSON string detected:`, trimmedData);
      return fallback;
    }
    
    // Check for non-JSON strings that might be corrupted
    if (!/^[\{\["\d\-tf]/.test(trimmedData)) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Non-JSON string detected:`, trimmedData.substring(0, 20));
      return fallback;
    }
    
    // Validate JSON structure before parsing
    const firstChar = trimmedData[0];
    const lastChar = trimmedData[trimmedData.length - 1];
    
    if ((firstChar === '{' && lastChar !== '}') ||
        (firstChar === '[' && lastChar !== ']') ||
        (firstChar === '"' && lastChar !== '"')) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Incomplete JSON structure detected`);
      return fallback;
    }
    
    // Try to parse
    const parsed = JSON.parse(trimmedData);
    
    // Additional validation for parsed result
    if (parsed === null || parsed === undefined) {
      console.warn(`[${debugContext || 'safeJsonParse'}] Parsed to null/undefined, using fallback`);
      return fallback;
    }
    
    return parsed;
  } catch (error: any) {
    console.error(`[${debugContext || 'safeJsonParse'}] JSON parse error:`, error?.message, 'Data preview:', data?.substring(0, 50));
    
    // If it's any JSON parse error with unexpected characters, clear the corrupted data immediately
    if (error?.message?.includes('Unexpected character') || 
        error?.message?.includes('JSON Parse error') ||
        error?.message?.includes('Unexpected token') ||
        error?.message?.includes('Unexpected end of JSON input')) {
      console.error(`[${debugContext || 'safeJsonParse'}] Critical: JSON corruption detected, clearing all data`);
      clearStorageAndReload();
      return fallback;
    }
    return fallback;
  }
}

// Helper function to clear storage and reload - extracted for reuse
function clearStorageAndReload() {
  // Prevent infinite loops
  if (isCleaningStorage) {
    console.log('clearStorageAndReload: Already cleaning storage, skipping...');
    return;
  }
  
  isCleaningStorage = true;
  console.log('clearStorageAndReload: Starting storage cleanup...');
  
  // Use setTimeout to avoid blocking the current execution
  setTimeout(() => {
    import('@react-native-async-storage/async-storage').then(({ default: AsyncStorage }) => {
      AsyncStorage.clear().then(() => {
        console.log('Storage cleared due to JSON corruption');
        
        // On web, try to reload the page
        if (typeof window !== 'undefined' && window.location) {
          setTimeout(() => {
            try {
              console.log('Attempting to reload page...');
              window.location.reload();
            } catch (reloadError) {
              console.error('Failed to reload:', reloadError);
              // Try alternative reload methods
              try {
                window.location.href = window.location.href;
              } catch (e) {
                console.error('All reload methods failed:', e);
              }
            }
          }, 100);
        } else {
          // On mobile, we can't force reload, so just log
          console.log('Mobile platform detected - storage cleared, app will reset on next launch');
          // Reset the flag after a delay to allow retry
          setTimeout(() => {
            isCleaningStorage = false;
          }, 5000);
        }
      }).catch((clearError) => {
        console.error('Failed to clear storage:', clearError);
        isCleaningStorage = false;
      });
    }).catch((importError) => {
      console.error('Failed to import AsyncStorage:', importError);
      isCleaningStorage = false;
    });
  }, 0);
}

export async function loadEvents(): Promise<EventsState> {
  try {
    const raw = await AsyncStorage.getItem(EVENTS_KEY);
    if (!raw || raw === 'undefined' || raw === 'null' || raw === 'o' || raw.trim() === 'o') {
      console.log('loadEvents: Invalid or corrupted data detected, clearing and resetting');
      try {
        await AsyncStorage.removeItem(EVENTS_KEY);
      } catch {}
      return {
        events: {},
        filters: defaultFilters,
        diagnostics: { subscribedChannels: 0, eventsInMemory: 0, batteryImpactEstimate: 'low', errors: [] },
      };
    }
    
    const parsed = safeJsonParse(raw, null, 'events_store');
    if (!parsed || typeof parsed !== 'object') {
      console.log('Invalid events data, resetting to defaults');
      try {
        await AsyncStorage.removeItem(EVENTS_KEY);
      } catch {}
      return {
        events: {},
        filters: defaultFilters,
        diagnostics: { subscribedChannels: 0, eventsInMemory: 0, batteryImpactEstimate: 'low', errors: ['corrupted_data'] },
      };
    }
    
    const eventsState: EventsState = {
      events: parsed.events && typeof parsed.events === 'object' ? parsed.events : {},
      filters: parsed.filters && typeof parsed.filters === 'object' ? parsed.filters : defaultFilters,
      diagnostics: parsed.diagnostics && typeof parsed.diagnostics === 'object' ? parsed.diagnostics : { subscribedChannels: 0, eventsInMemory: 0, batteryImpactEstimate: 'low', errors: [] },
    };
    
    return eventsState;
  } catch (e: any) {
    console.error('loadEvents critical error:', e?.message || e);
    try {
      await AsyncStorage.removeItem(EVENTS_KEY);
    } catch {}
    return {
      events: {},
      filters: defaultFilters,
      diagnostics: { subscribedChannels: 0, eventsInMemory: 0, batteryImpactEstimate: 'low', errors: ['parse_error'] },
    };
  }
}

export async function saveEvents(state: EventsState) {
  try {
    await AsyncStorage.setItem(EVENTS_KEY, JSON.stringify(state));
  } catch (e) {
    console.log('saveEvents error', e);
  }
}

export function upsertEvent(current: Record<string, EventItem>, incoming: EventItem) {
  const existing = current[incoming.id];
  const updated: Record<string, EventItem> = { ...current };
  if (existing) {
    updated[incoming.id] = { ...existing, ...incoming };
  } else {
    updated[incoming.id] = incoming;
  }
  return updated;
}

export function computeGeohash6(lat: number, lng: number) {
  return encodeGeohash(lat, lng, 6);
}

export function computeNeighborChannels(centerLat: number, centerLng: number) {
  const center = computeGeohash6(centerLat, centerLng);
  const neigh = neighbors(center);
  return [center, ...neigh];
}
