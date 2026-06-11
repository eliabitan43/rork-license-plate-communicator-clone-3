export interface Vehicle {
  id: string;
  licensePlate: string;
  country: string;
  state?: string;
  make?: string;
  model?: string;
  color?: string;
  year?: string;
  nickname?: string;
  type?: 'car' | 'truck' | 'motorcycle' | 'boat' | 'rv' | 'trailer' | 'offroad';
  isPrimary: boolean;
  isActive: boolean;
  verificationStatus: VerificationStatus;
  addedAt: string;
  plateImage?: string;
}

export interface NotificationPreferences {
  enabled: boolean;
  messages: boolean;
  listings: boolean;
  general: boolean;
  pushToken?: string;
  platform?: 'ios' | 'android' | 'web' | 'unknown';
  lastPromptAt?: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  displayName?: string;
  avatar?: string;
  isAnonymous: boolean;
  createdAt: string;
  allowNotifications: boolean;
  notificationPreferences?: NotificationPreferences;
  rating: number;
  reviewCount: number;
  communityScore: number;
  badges: UserBadge[];
  verificationStatus: VerificationStatus;
  accountType: AccountType;
  blockedUsers: string[];
  trustedContacts: string[];
  emergencyContacts: EmergencyContact[];
  doNotContactWindows?: TimeWindow[];
  preferredLanguage: string;
  organizationId?: string;
  vehicles: Vehicle[];
  primaryVehicleId?: string;
  termsAccepted: boolean;
  termsAcceptedAt?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship: string;
  isPrimary: boolean;
}

export interface Message {
  id: string;
  fromPlate: string;
  toPlate: string;
  toCountry?: string;
  toState?: string;
  fromName?: string;
  content: string;
  type: MessageType;
  isAnonymous: boolean;
  timestamp: string;
  isRead: boolean;
  /** Sender-side delivery progress. Additive — absent on legacy messages (treat as 'delivered'). */
  deliveryState?: 'sending' | 'delivered' | 'read' | 'not_downloaded' | 'failed';
  location?: string;
  rating?: number;
  hasBeenRated?: boolean;
  intent?: MessageIntent;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  attachments?: MessageAttachment[];
  quickReplyUsed?: string;
  geofenceId?: string;
  isModerated?: boolean;
  reportCount?: number;
  metadata?: {
    good_neighbor_type?: string;
    [key: string]: any;
  };
}

export type MessageType = 
  | 'parking_alert'
  | 'blocking'
  | 'window_open'
  | 'lights_on'
  | 'for_sale'
  | 'general'
  | 'compliment'
  | 'safety'
  | 'marketplace'
  | 'service_ad'
  | 'keys_visible'
  | 'trunk_open'
  | 'gas_cap'
  | 'flat_tire'
  | 'brake_light'
  | 'hazard'
  | 'child_pet_alert'
  | 'break_in_alert'
  | 'tow_warning'
  | 'street_cleaning'
  | 'event_notice'
  | 'community_watch'
  | 'report_driver'
  | 'car_alarm'
  | 'vehicle_alarm'
  | 'leaking_fluid';

export interface QuickAction {
  id: string;
  type: MessageType;
  title: string;
  icon: string;
  color: string;
  message: string;
}

export interface RecentActivity {
  id: string;
  type: 'sent' | 'received';
  message: Message;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerPlate: string;
  sellerName?: string;
  title: string;
  description: string;
  price: number;
  category: MarketplaceCategory;
  condition: 'new' | 'used' | 'refurbished';
  images: string[];
  location?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  contactMethod: 'plate' | 'anonymous';
}

export type MarketplaceCategory = 
  | 'whole_car'
  | 'engine_parts'
  | 'body_parts'
  | 'interior'
  | 'wheels_tires'
  | 'electronics'
  | 'accessories'
  | 'tools'
  | 'services';

export interface ServiceProvider {
  id: string;
  businessName: string;
  ownerPlate: string;
  description: string;
  services: ServiceType[];
  location: string;
  contactInfo: {
    phone?: string;
    email?: string;
    website?: string;
    plateContact: boolean;
  };
  rating: number;
  reviewCount: number;
  images: string[];
  isVerified: boolean;
  operatingHours: {
    [key: string]: { open: string; close: string; closed?: boolean };
  };
  createdAt: string;
}

export type ServiceType = 
  | 'body_shop'
  | 'tire_service'
  | 'oil_change'
  | 'window_repair'
  | 'detailing'
  | 'mechanic'
  | 'towing'
  | 'inspection'
  | 'insurance'
  | 'parts_dealer';

export interface MarketplaceFilter {
  category?: MarketplaceCategory;
  minPrice?: number;
  maxPrice?: number;
  condition?: 'new' | 'used' | 'refurbished';
  location?: string;
  searchQuery?: string;
}

export interface UserRating {
  id: string;
  fromPlate: string;
  toPlate: string;
  rating: number;
  comment?: string;
  messageId?: string;
  interactionType: 'message' | 'marketplace' | 'service' | 'general';
  timestamp: string;
  isAnonymous: boolean;
}

export type PlateRating = UserRating;

export interface UserBadge {
  id: string;
  type: BadgeType;
  title: string;
  description: string;
  icon: string;
  color: string;
  earnedAt: string;
  level?: number;
}

export type BadgeType = 
  | 'good_neighbor'
  | 'helpful_driver'
  | 'safety_hero'
  | 'community_guardian'
  | 'marketplace_star'
  | 'verified_seller'
  | 'quick_responder'
  | 'parking_helper'
  | 'car_enthusiast'
  | 'trusted_member';

export interface CommunityStats {
  totalUsers: number;
  messagesExchanged: number;
  parkingIssuesResolved: number;
  carsHelped: number;
  averageResponseTime: number;
}

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'trusted';

export type AccountType = 
  | 'personal'
  | 'fleet'
  | 'business'
  | 'municipal'
  | 'property_manager'
  | 'event_organizer'
  | 'campus';

export interface TimeWindow {
  startTime: string;
  endTime: string;
  days: string[];
  timezone: string;
}

export type MessageIntent = 
  | 'safety_alert'
  | 'courtesy_notice'
  | 'parking_issue'
  | 'vehicle_condition'
  | 'community_notice'
  | 'marketplace'
  | 'emergency'
  | 'urgent_notice';

export interface MessageAttachment {
  id: string;
  type: 'image' | 'location' | 'evidence';
  url?: string;
  coordinates?: { lat: number; lng: number };
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface QuickReply {
  id: string;
  emoji: string;
  text: string;
  action?: 'acknowledge' | 'on_my_way' | 'not_my_car' | 'call_security' | 'thanks';
}

export interface Geofence {
  id: string;
  name: string;
  type: 'parking_lot' | 'neighborhood' | 'campus' | 'event' | 'building';
  coordinates: { lat: number; lng: number }[];
  radius?: number;
  organizationId?: string;
  isActive: boolean;
  rules: GeofenceRule[];
}

export interface GeofenceRule {
  id: string;
  type: 'rate_limit' | 'time_restriction' | 'user_type' | 'message_type';
  value: any;
  action: 'allow' | 'deny' | 'moderate';
}

export interface Organization {
  id: string;
  name: string;
  type: AccountType;
  adminPlates: string[];
  memberPlates: string[];
  geofences: string[];
  settings: OrganizationSettings;
  verificationMethod: 'email_domain' | 'access_code' | 'manual' | 'decal';
  createdAt: string;
}

export interface OrganizationSettings {
  allowAnonymousMessages: boolean;
  requireMemberVerification: boolean;
  moderationLevel: 'none' | 'light' | 'strict';
  customTemplates: MessageTemplate[];
  broadcastEnabled: boolean;
  integrations: Integration[];
}

export interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  intent: MessageIntent;
  icon: string;
  organizationId?: string;
}

export interface Integration {
  type: 'parking_system' | 'security_desk' | 'tow_operator' | 'municipal_system';
  isActive: boolean;
  config: Record<string, any>;
}

export interface SafetyReport {
  id: string;
  reporterPlate: string;
  targetPlate?: string;
  type: 'suspicious_activity' | 'break_in' | 'vandalism' | 'abandoned_vehicle' | 'other';
  description: string;
  location: { lat: number; lng: number };
  attachments: MessageAttachment[];
  status: 'pending' | 'reviewed' | 'forwarded' | 'resolved';
  createdAt: string;
  forwardedTo?: string[];
}

export interface AppVariant {
  id: string;
  name: string;
  type: 'plateping' | 'lotlink' | 'fleetrelay' | 'eventtag' | 'safecity';
  features: string[];
  targetAudience: string;
  pricing?: PricingTier;
}

export interface PricingTier {
  name: string;
  price: number;
  interval: 'monthly' | 'yearly' | 'one_time';
  features: string[];
  limits: Record<string, number>;
}