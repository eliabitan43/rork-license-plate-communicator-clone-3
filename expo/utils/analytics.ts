import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId?: string;
  buildInfo: {
    platform: 'ios' | 'android' | 'web' | 'unknown';
    version: string;
  };
}

export interface AnalyticsSession {
  id: string;
  startTime: number;
  endTime?: number;
  events: AnalyticsEvent[];
}

// Event names (flat, easy to query)
export const ANALYTICS_EVENTS = {
  SESSION_START: 'session_start',
  MAP_VIEW: 'map_view',
  ALERT_CREATE: 'alert_create',
  ALERT_CONFIRM: 'alert_confirm',
  ALERT_EXPIRE: 'alert_expire',
  MESSAGE_SEND: 'message_send',
  MESSAGE_OPEN: 'message_open',
  MESSAGE_REPLY: 'message_reply',
  REP_INCREASE: 'rep_increase',
  REP_DECREASE: 'rep_decrease',
  SERVICE_VIEW: 'service_view',
  SERVICE_REQUEST: 'service_request',
  OFFER_REDEEM: 'offer_redeem',
  PUSH_PERMISSION_REQUESTED: 'push_permission_requested',
  PUSH_PERMISSION_GRANTED: 'push_permission_granted',
  LOCATION_PERMISSION_REQUESTED: 'location_permission_requested',
  LOCATION_PERMISSION_GRANTED: 'location_permission_granted',
} as const;

class AnalyticsManager {
  private currentSession: AnalyticsSession | null = null;
  private userId: string | null = null;
  private eventQueue: AnalyticsEvent[] = [];
  private isInitialized = false;

  async initialize(userId?: string) {
    if (this.isInitialized) return;
    
    this.userId = userId || await this.getOrCreateUserId();
    this.currentSession = await this.createNewSession();
    this.isInitialized = true;
    
    // Track session start
    this.track(ANALYTICS_EVENTS.SESSION_START, {
      platform: this.getPlatform(),
      timestamp: Date.now(),
    });
    
    console.log('Analytics initialized for user:', this.userId);
  }

  private async getOrCreateUserId(): Promise<string> {
    try {
      let userId = await AsyncStorage.getItem('analytics_user_id');
      if (!userId) {
        userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem('analytics_user_id', userId);
      }
      return userId;
    } catch {
      return `temp_${Date.now()}`;
    }
  }

  private async createNewSession(): Promise<AnalyticsSession> {
    const session: AnalyticsSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: Date.now(),
      events: [],
    };
    return session;
  }

  private getPlatform(): 'ios' | 'android' | 'web' | 'unknown' {
    if (Platform.OS === 'ios') return 'ios';
    if (Platform.OS === 'android') return 'android';
    if (Platform.OS === 'web') return 'web';
    return 'unknown';
  }

  private hashPlate(plate: string): string {
    // Simple hash function for privacy
    let hash = 0;
    for (let i = 0; i < plate.length; i++) {
      const char = plate.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `plate_${Math.abs(hash).toString(36)}`;
  }

  track(eventName: string, properties?: Record<string, any>) {
    if (!this.isInitialized || !this.currentSession) {
      console.warn('Analytics not initialized, queuing event:', eventName);
      this.eventQueue.push({
        name: eventName,
        properties,
        timestamp: Date.now(),
        sessionId: 'pending',
        userId: this.userId || 'unknown',
        buildInfo: {
          platform: this.getPlatform(),
          version: '1.0.0',
        },
      });
      return;
    }

    // Hash any plate numbers for privacy
    const sanitizedProperties = { ...properties };
    if (sanitizedProperties.plate) {
      sanitizedProperties.plateHash = this.hashPlate(sanitizedProperties.plate);
      delete sanitizedProperties.plate;
    }
    if (sanitizedProperties.fromPlate) {
      sanitizedProperties.fromPlateHash = this.hashPlate(sanitizedProperties.fromPlate);
      delete sanitizedProperties.fromPlate;
    }
    if (sanitizedProperties.toPlate) {
      sanitizedProperties.toPlateHash = this.hashPlate(sanitizedProperties.toPlate);
      delete sanitizedProperties.toPlate;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: sanitizedProperties,
      timestamp: Date.now(),
      sessionId: this.currentSession.id,
      userId: this.userId || 'unknown',
      buildInfo: {
        platform: this.getPlatform(),
        version: '1.0.0',
      },
    };

    this.currentSession.events.push(event);
    
    // In production, you would send this to your analytics service
    console.log('Analytics Event:', {
      event: eventName,
      properties: sanitizedProperties,
      session: this.currentSession.id,
      user: this.userId,
    });

    // Flush events periodically or when queue gets large
    if (this.currentSession.events.length >= 10) {
      this.flush();
    }
  }

  // Convenience methods for common events
  trackAlertCreate(type: string, geohash: string, ttlMs: number) {
    this.track(ANALYTICS_EVENTS.ALERT_CREATE, { type, geohash, ttlMs });
  }

  trackAlertConfirm(alertId: string, weight: number) {
    this.track(ANALYTICS_EVENTS.ALERT_CONFIRM, { alertId, weight });
  }

  trackMessageSend(plateHash: string, preset?: string) {
    this.track(ANALYTICS_EVENTS.MESSAGE_SEND, { plateHash, preset });
  }

  trackServiceView(slug: string) {
    this.track(ANALYTICS_EVENTS.SERVICE_VIEW, { slug });
  }

  trackReputationChange(userId: string, reason: string, delta: number) {
    const eventName = delta > 0 ? ANALYTICS_EVENTS.REP_INCREASE : ANALYTICS_EVENTS.REP_DECREASE;
    this.track(eventName, { userId, reason, delta: Math.abs(delta) });
  }

  private async flush() {
    if (!this.currentSession || this.currentSession.events.length === 0) return;

    try {
      // In production, send events to your analytics service
      console.log('Flushing analytics events:', this.currentSession.events.length);
      
      // Clear events after successful send
      this.currentSession.events = [];
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
    }
  }

  async endSession() {
    if (!this.currentSession) return;

    this.currentSession.endTime = Date.now();
    await this.flush();
    
    console.log('Analytics session ended:', this.currentSession.id);
    this.currentSession = null;
  }
}

// Global analytics instance
export const analytics = new AnalyticsManager();

// Helper hooks and functions
export function useAnalytics() {
  return {
    track: analytics.track.bind(analytics),
    trackAlertCreate: analytics.trackAlertCreate.bind(analytics),
    trackAlertConfirm: analytics.trackAlertConfirm.bind(analytics),
    trackMessageSend: analytics.trackMessageSend.bind(analytics),
    trackServiceView: analytics.trackServiceView.bind(analytics),
    trackReputationChange: analytics.trackReputationChange.bind(analytics),
  };
}

// Initialize analytics when app starts
export async function initializeAnalytics(userId?: string) {
  await analytics.initialize(userId);
}