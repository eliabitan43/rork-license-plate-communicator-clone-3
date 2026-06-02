import React from "react";
export type AlertType = "PARKING_ENF" | "SPEED_RADAR" | "TOW_TRUCK" | "HAZARD" | "ACCIDENT" | "ROAD_CLOSURE" | "TRAFFIC_ENF" | "STREET_CLEANING" | "OTHER";
export type EventType = 
  // Traffic & Road Conditions
  | 'heavy_traffic' | 'construction' | 'pothole' | 'flooded_street' | 'icy_conditions'
  // Vehicle & Driver Situations  
  | 'disabled_vehicle' | 'vehicle_blocking' | 'illegal_parking' | 'abandoned_vehicle'
  // Safety & Law Enforcement
  | 'checkpoint' | 'unmarked_police' | 'emergency_vehicle'
  // Community & Environment
  | 'lost_item' | 'found_item' | 'stray_animal' | 'fallen_tree' | 'downed_power_line' | 'water_main_break'
  // Services & Assistance
  | 'gas_shortage' | 'parking_update' | 'rest_area_closed' | 'free_tow_nearby'
  // Community Engagement
  | 'good_neighbor' | 'suspicious_activity' | 'help_request'
  // New Incident Types
  | 'traffic_enforcement_new' | 'road_hazard' | 'road_closure_new' | 'vehicle_on_shoulder'
  // Safety/Security Incidents (also available as IncidentType)
  | 'break_in_attempt' | 'vandalism'
  // Legacy types (keeping for compatibility)
  | 'police' | 'tow_truck' | 'trash_truck' | 'hazard' | 'accident' | 'road_closure' | 'traffic_enforcement' | 'street_cleaning' | 'other';

export type IncidentType = 
  | 'suspicious_activity'
  | 'break_in_attempt'
  | 'vandalism'
  | 'violence'
  | 'theft'
  | 'harassment'
  | 'noise_complaint'
  | 'other';

export type RecipientType = 
  | 'emergency_911'
  | 'police_non_emergency'
  | 'private_security'
  | 'vehicle_owner'
  | 'property_manager'
  | 'nearby_users'
  | 'community_moderators'
  | 'road_services'
  | 'insurance_contact'
  | 'emergency_contacts'
  | 'live_map_feed'
  | 'evidence_locker';

export interface IncidentReport {
  id: string;
  incidentType: IncidentType;
  recipients: RecipientType[];
  location: {
    lat: number;
    lng: number;
    address?: string;
    accuracy?: number;
  };
  timestamp: string;
  note?: string;
  media: {
    type: 'photo' | 'video';
    uri: string;
  }[];
  vehicleInfo?: {
    plate?: string;
    description?: string;
  };
  nearbyRadius?: number; // for nearby_users recipient
  isAnonymous: boolean;
  status: 'draft' | 'sent' | 'delivered' | 'failed';
  createdAt: string;
  sentAt?: string;
}

export interface RecipientOption {
  type: RecipientType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  category: 'danger' | 'authority' | 'community' | 'private';
  requiresDisclaimer?: boolean;
  defaultSelected?: boolean;
  availableFor?: IncidentType[];
}
export type ConfirmWeight = 1 | 2; // 2 for high-rep users

export interface Alert {
  id: string;
  type: AlertType;
  lat: number;
  lng: number;
  geohash: string;          // precision 7–8
  createdAt: number;        // epoch ms
  ttlMs: number;            // e.g., 60 * 60 * 1000
  confirmations: number;    // sum of weights
  reporterId: string;
  reporterRep: number;      // snapshot to seed confidence
  details?: Record<string, unknown>;
}

export interface Reputation {
  userId: string;
  score: number;            // starts 0; +2 validated; -3 overruled; decay 5%/week
  lastUpdated: number;
}

export interface EventItem {
  id: string;
  type: EventType;
  lat: number;
  lng: number;
  geohash: string;
  details: Record<string, unknown>;
  confidence: number;
  reports_count: number;
  expires_at: string;
  created_at: string;
  created_by?: string;
  reporterRep?: number;
  ttlMs?: number;
}

export interface EventsDiagnostics {
  subscribedChannels: number;
  eventsInMemory: number;
  lastCameraCenter?: { lat: number; lng: number };
  batteryImpactEstimate: 'low' | 'medium' | 'high';
  errors: string[];
  subscribedList?: string[];
}

// Query keys for React Query
export const qk = {
  nearbyAlerts: (geohash: string) => ["alerts", "nearby", geohash] as const,
  alert: (id: string) => ["alert", id] as const,
  reputation: (userId: string) => ["reputation", userId] as const,
};

// Visibility rules
export function isAlertVisibleToUser(alert: Alert, viewerRep: number): boolean {
  const ageOk = Date.now() - alert.createdAt < alert.ttlMs;
  if (!ageOk) return false;

  if (viewerRep >= 6) return true;
  if (alert.reporterRep >= 6) return true;
  return alert.confirmations >= 1; // require 1 confirm for broad visibility
}

// Convert legacy EventItem to new Alert format
export function eventToAlert(event: EventItem): Alert {
  const alertTypeMap: Record<EventType, AlertType> = {
    // Traffic & Road Conditions
    heavy_traffic: "OTHER",
    construction: "ROAD_CLOSURE",
    pothole: "HAZARD",
    flooded_street: "HAZARD",
    icy_conditions: "HAZARD",
    // Vehicle & Driver Situations
    disabled_vehicle: "HAZARD",
    vehicle_blocking: "HAZARD",
    illegal_parking: "PARKING_ENF",
    abandoned_vehicle: "OTHER",
    // Safety & Law Enforcement
    checkpoint: "TRAFFIC_ENF",
    unmarked_police: "PARKING_ENF",
    emergency_vehicle: "OTHER",
    // Community & Environment
    lost_item: "OTHER",
    found_item: "OTHER",
    stray_animal: "HAZARD",
    fallen_tree: "HAZARD",
    downed_power_line: "HAZARD",
    water_main_break: "HAZARD",
    // Services & Assistance
    gas_shortage: "OTHER",
    parking_update: "OTHER",
    rest_area_closed: "OTHER",
    free_tow_nearby: "TOW_TRUCK",
    // Community Engagement
    good_neighbor: "OTHER",
    suspicious_activity: "OTHER",
    help_request: "OTHER",
    // New Incident Types
    traffic_enforcement_new: "TRAFFIC_ENF",
    road_hazard: "HAZARD",
    road_closure_new: "ROAD_CLOSURE",
    vehicle_on_shoulder: "HAZARD",
    // Safety/Security Incidents
    break_in_attempt: "OTHER",
    vandalism: "OTHER",
    // Legacy types
    police: "PARKING_ENF",
    tow_truck: "TOW_TRUCK",
    trash_truck: "OTHER",
    hazard: "HAZARD",
    accident: "ACCIDENT",
    road_closure: "ROAD_CLOSURE",
    traffic_enforcement: "TRAFFIC_ENF",
    street_cleaning: "STREET_CLEANING",
    other: "OTHER",
  };

  return {
    id: event.id,
    type: alertTypeMap[event.type] || "OTHER",
    lat: event.lat,
    lng: event.lng,
    geohash: event.geohash,
    createdAt: new Date(event.created_at).getTime(),
    ttlMs: event.ttlMs || (60 * 60 * 1000), // default 1 hour
    confirmations: event.reports_count - 1, // subtract original report
    reporterId: event.created_by || "anonymous",
    reporterRep: event.reporterRep || 0,
    details: event.details,
  };
}