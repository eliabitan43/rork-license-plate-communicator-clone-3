import { MessageTemplate, MessageType, QuickReply } from '@/types';
import { designTokens } from '@/constants/theme';

export type QuickActionIntent = 'critical' | 'car' | 'road' | 'community';

export interface QuickActionItem {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  type: MessageType;
  intent: QuickActionIntent;
  prefilledMessage: string;
  /** Shows a "New" badge in grids. */
  isNew?: boolean;
  /** Critical action — delivery pipeline must dispatch SMS immediately, bypassing any batching. */
  highPriority?: boolean;
}

const tint = designTokens.color;

export const QUICK_ACTIONS: QuickActionItem[] = [
  // ── Critical — act now ──────────────────────────────────────────────
  {
    id: 'fire',
    label: 'Smoke / fire',
    emoji: '🔥',
    tint: tint.error,
    // DECISION: no dedicated 'fire' MessageType exists and types/index.ts is additive-only
    // this session; 'hazard' is the closest existing semantic. Revisit if a server-side
    // taxonomy ever needs to distinguish fire from generic hazards.
    type: 'hazard',
    intent: 'critical',
    prefilledMessage:
      'Your car is smoking or smells like burning. Please pull over safely and check your engine right away.',
    highPriority: true,
  },
  {
    id: 'child_pet',
    label: 'Child / pet inside',
    emoji: '🚨',
    tint: tint.error,
    type: 'child_pet_alert',
    intent: 'critical',
    prefilledMessage:
      'There appears to be a child or pet left alone in your car. Temperatures rise dangerously fast. Please return immediately.',
    isNew: true,
    highPriority: true,
  },
  {
    id: 'leak',
    label: 'Fluid leaking',
    emoji: '💧',
    tint: tint.info,
    type: 'leaking_fluid',
    intent: 'critical',
    prefilledMessage:
      'Your vehicle appears to be leaking fluid underneath. This could be a fire risk — check before moving it.',
    highPriority: true,
  },
  {
    id: 'tow',
    label: 'Being towed',
    emoji: '🚨',
    tint: tint.error,
    type: 'tow_warning',
    intent: 'critical',
    prefilledMessage:
      'Your car is about to be towed! Please return immediately if you possibly can.',
    highPriority: true,
  },

  // ── Your car needs attention ────────────────────────────────────────
  {
    id: 'blocking',
    label: 'Blocking me',
    emoji: '🚗',
    tint: tint.warning,
    type: 'blocking',
    intent: 'car',
    prefilledMessage:
      'Hi! Your vehicle is blocking mine. Could you please move it when you get a chance? Thanks so much!',
  },
  {
    id: 'lights',
    label: 'Lights on',
    emoji: '💡',
    tint: tint.warning,
    type: 'lights_on',
    intent: 'car',
    prefilledMessage:
      'Hi! Just a heads up — your headlights are still on. Saving you a dead battery!',
  },
  {
    id: 'door_open',
    label: 'Door / boot open',
    emoji: '🚪',
    tint: tint.accentTeal,
    // DECISION: mapped to 'trunk_open' (door/boot ajar) rather than 'window_open' —
    // closest existing MessageType to the door/boot condition.
    type: 'trunk_open',
    intent: 'car',
    prefilledMessage:
      "Hi! It looks like your car door or boot might still be open. Just wanted to give you a heads up!",
    isNew: true,
  },
  {
    id: 'window',
    label: 'Window open',
    emoji: '🪟',
    tint: tint.info,
    type: 'window_open',
    intent: 'car',
    prefilledMessage:
      "Hi! One of your windows looks open — thought you'd want to know before it rains!",
  },
  {
    id: 'tire',
    label: 'Low tyre',
    emoji: '🛞',
    tint: tint.warning,
    type: 'flat_tire',
    intent: 'car',
    prefilledMessage:
      'Hi! One of your tyres looks low on air. Might be worth a quick check before you head off!',
  },
  {
    id: 'keys',
    label: 'Keys visible',
    emoji: '🔑',
    tint: tint.accentPurple,
    type: 'keys_visible',
    intent: 'car',
    prefilledMessage:
      'Hi! Your keys appear to be visible inside your car. Might be worth tucking them out of sight.',
  },
  {
    id: 'sticker',
    label: 'Expired sticker',
    emoji: '📋',
    tint: tint.textMuted,
    // DECISION: no registration/inspection MessageType exists; 'general' keeps the
    // union untouched. The action id carries the analytics signal.
    type: 'general',
    intent: 'car',
    prefilledMessage:
      'Hi! Your registration or inspection sticker looks like it might have expired. Wanted to flag it before you get pulled over!',
    isNew: true,
  },
  {
    id: 'hit',
    label: 'Hit & run',
    emoji: '💥',
    tint: tint.error,
    type: 'hazard',
    intent: 'car',
    prefilledMessage:
      'Hi — I think your car may have been hit while parked. I witnessed it and wanted to let you know right away.',
  },

  // ── Road & driving ──────────────────────────────────────────────────
  {
    id: 'debris',
    label: 'Road debris',
    emoji: '⚠️',
    tint: tint.warning,
    type: 'hazard',
    intent: 'road',
    prefilledMessage:
      "Heads up — there's debris or an obstacle on the road ahead. Take it slow.",
    isNew: true,
  },
  {
    id: 'erratic',
    label: 'Erratic driving',
    emoji: '🚗',
    tint: tint.error,
    type: 'report_driver',
    intent: 'road',
    prefilledMessage:
      'Hi — I noticed some concerning driving behaviour. Just a friendly heads up to take extra care on the road today.',
    isNew: true,
  },
  {
    id: 'phone',
    label: 'Phone at wheel',
    emoji: '📱',
    tint: tint.accentPurple,
    type: 'report_driver',
    intent: 'road',
    prefilledMessage:
      'Hi — I noticed you may have been on your phone while driving. Just a friendly reminder to stay focused. Drive safe!',
    isNew: true,
  },
  {
    id: 'parking',
    label: 'Parking issue',
    emoji: '⚠️',
    tint: tint.warning,
    type: 'parking_alert',
    intent: 'road',
    prefilledMessage:
      "Hi! Just a quick note — the spot you're in may be ticketed soon. Worth double-checking the sign!",
  },
  {
    id: 'spot',
    label: 'Spot opening up',
    emoji: '🅿️',
    tint: tint.primary,
    // DECISION: 'general' rather than 'parking_alert' — this is a courtesy offer,
    // not an alert about the recipient's parking.
    type: 'general',
    intent: 'road',
    prefilledMessage:
      "Hey! I'm leaving this parking spot in the next couple of minutes if you need it. Happy to wait while you reverse in.",
    isNew: true,
  },

  // ── Community & kindness ────────────────────────────────────────────
  {
    id: 'thanks_merge',
    label: 'Thank you for merging',
    emoji: '🤝',
    tint: tint.success,
    type: 'compliment',
    intent: 'community',
    prefilledMessage:
      'Hey! Just wanted to say a genuine thank you for letting me in. That small gesture made my whole commute. Really appreciated.',
    isNew: true,
  },
  {
    id: 'nice_ride',
    label: 'Nice ride',
    emoji: '❤️',
    tint: tint.success,
    type: 'compliment',
    intent: 'community',
    prefilledMessage:
      'Hey! Just wanted to say — your car looks absolutely amazing. Nice ride! 🤙',
  },
];

export const INTENT_ORDER: QuickActionIntent[] = ['critical', 'car', 'road', 'community'];

export const INTENT_LABELS: Record<QuickActionIntent, string> = {
  critical: 'Critical — act now',
  car: 'Your car needs attention',
  road: 'Road & driving',
  community: 'Community & kindness',
};

export const QUICK_ACTIONS_BY_INTENT: Record<QuickActionIntent, QuickActionItem[]> =
  QUICK_ACTIONS.reduce(
    (acc, action) => {
      acc[action.intent].push(action);
      return acc;
    },
    { critical: [], car: [], road: [], community: [] } as Record<QuickActionIntent, QuickActionItem[]>,
  );

/** Top actions for the dashboard grid (6 shown + "All 19 →"). */
export const DASHBOARD_QUICK_ACTIONS: QuickActionItem[] = [
  'blocking',
  'lights',
  'tow',
  'window',
  'child_pet',
  'nice_ride',
]
  .map((id) => QUICK_ACTIONS.find((a) => a.id === id))
  .filter((a): a is QuickActionItem => Boolean(a));

export const goodNeighborTemplates: MessageTemplate[] = [
  {
    id: 'gn1',
    title: 'Window Open',
    content: 'Your rear window is open.',
    type: 'window_open',
    intent: 'courtesy_notice',
    icon: 'Wind',
  },
  {
    id: 'gn2',
    title: 'Keys Spotted',
    content: 'Keys spotted on roof/hood.',
    type: 'keys_visible',
    intent: 'safety_alert',
    icon: 'Key',
  },
  {
    id: 'gn3',
    title: 'Interior Light On',
    content: 'Interior light on - might drain battery.',
    type: 'lights_on',
    intent: 'courtesy_notice',
    icon: 'Lightbulb',
  },
  {
    id: 'gn4',
    title: 'Suspicious Activity',
    content: 'Someone tugging door handles - security notified.',
    type: 'break_in_alert',
    intent: 'emergency',
    icon: 'Shield',
  },
  {
    id: 'gn5',
    title: 'Parking Meter Expiring',
    content: 'Your parking meter is about to expire.',
    type: 'parking_alert',
    intent: 'courtesy_notice',
    icon: 'Clock',
  },
  {
    id: 'gn6',
    title: 'Blocking Driveway',
    content: 'Your vehicle is blocking a driveway.',
    type: 'blocking',
    intent: 'parking_issue',
    icon: 'Ban',
  },
  {
    id: 'gn7',
    title: 'Car Alarm',
    content: 'Your car alarm is going off.',
    type: 'car_alarm',
    intent: 'urgent_notice',
    icon: 'AlertTriangle',
  },
  {
    id: 'gn8',
    title: 'About to Be Towed',
    content: 'Heads up — a tow truck is hooking up to your vehicle right now. Move ASAP!',
    type: 'tow_warning',
    intent: 'emergency',
    icon: 'Truck',
  },
  {
    id: 'gn9',
    title: 'Flat Tire',
    content: 'Your tire looks flat or low on air. You may want to check it before driving.',
    type: 'flat_tire',
    intent: 'safety_alert',
    icon: 'AlertCircle',
  },
  {
    id: 'gn10',
    title: 'Headlights Left On',
    content: 'Your headlights are still on — your battery may drain.',
    type: 'lights_on',
    intent: 'courtesy_notice',
    icon: 'Lightbulb',
  },
  {
    id: 'gn11',
    title: 'Trunk / Hatch Open',
    content: 'Your trunk/hatch is open or not fully closed.',
    type: 'trunk_open',
    intent: 'courtesy_notice',
    icon: 'Package',
  },
  {
    id: 'gn12',
    title: 'Gas Cap Open',
    content: 'Your gas cap is open or missing.',
    type: 'gas_cap',
    intent: 'courtesy_notice',
    icon: 'Fuel',
  },
  {
    id: 'gn13',
    title: 'Leaking Fluid',
    content: 'Your vehicle appears to be leaking fluid underneath.',
    type: 'leaking_fluid',
    intent: 'safety_alert',
    icon: 'Droplets',
  },
  {
    id: 'gn14',
    title: 'Brake Light Out',
    content: 'One of your brake lights appears to be out.',
    type: 'brake_light',
    intent: 'safety_alert',
    icon: 'Zap',
  },
  {
    id: 'gn15',
    title: 'Child / Pet in Car',
    content: 'URGENT: A child or pet is alone in your vehicle. Please return immediately.',
    type: 'child_pet_alert',
    intent: 'emergency',
    icon: 'Heart',
  },
  {
    id: 'gn16',
    title: 'Lights Left On',
    content: 'Your interior or parking lights are still on.',
    type: 'lights_on',
    intent: 'courtesy_notice',
    icon: 'Lightbulb',
  },
  {
    id: 'gn17',
    title: 'Street Cleaning',
    content: 'Street cleaning is scheduled here soon — you may get ticketed.',
    type: 'street_cleaning',
    intent: 'urgent_notice',
    icon: 'Droplets',
  },
  {
    id: 'gn18',
    title: 'Door Not Closed',
    content: 'One of your doors is open or not fully shut.',
    type: 'window_open',
    intent: 'courtesy_notice',
    icon: 'Wind',
  },
  {
    id: 'gn19',
    title: 'Nice Park Job',
    content: 'Just wanted to say — great parking job!',
    type: 'compliment',
    intent: 'courtesy_notice',
    icon: 'Heart',
  },
  {
    id: 'gn20',
    title: 'Hit & Run Witness',
    content: 'Your vehicle appears to have been hit. I have details if you need them.',
    type: 'hazard',
    intent: 'urgent_notice',
    icon: 'AlertTriangle',
  },
];

export const quickReplies: QuickReply[] = [
  {
    id: 'qr1',
    emoji: 'ON',
    text: 'On my way',
    action: 'on_my_way',
  },
  {
    id: 'qr2',
    emoji: 'TY',
    text: 'Thanks',
    action: 'thanks',
  },
  {
    id: 'qr3',
    emoji: 'ID',
    text: 'Not my car',
    action: 'not_my_car',
  },
  {
    id: 'qr4',
    emoji: 'SOS',
    text: 'Call security',
    action: 'call_security',
  },
  {
    id: 'qr5',
    emoji: 'OK',
    text: 'Got it',
    action: 'acknowledge',
  },
];

export const appVariants = [
  {
    id: 'plateping',
    name: 'PlatePing',
    description: 'Consumer app for anonymous vehicle communication',
    features: [
      'Claim your plate',
      'Receive anonymous messages',
      'Quick action replies',
      'Good neighbor alerts',
    ],
  },
  {
    id: 'lotlink',
    name: 'LotLink',
    description: 'Property & campus parking management',
    features: [
      'Parking lot management',
      'Resident registration',
      'Visitor passes',
      'Automated notices',
    ],
  },
  {
    id: 'fleetrelay',
    name: 'FleetRelay',
    description: 'Business fleet communication',
    features: [
      'Fleet registration',
      'Real-time feedback',
      'Driver safety reports',
      'Route optimization',
    ],
  },
  {
    id: 'eventtag',
    name: 'EventTag',
    description: 'Temporary event parking',
    features: [
      'QR code decals',
      'Time-bound messaging',
      'Event coordination',
      'Tailgate meetups',
    ],
  },
  {
    id: 'safecity',
    name: 'SafeCity Relay',
    description: 'Municipal parking alerts',
    features: [
      'Street sweeping alerts',
      'Towing warnings',
      'Break-in cluster alerts',
      'City partnerships',
    ],
  },
];
