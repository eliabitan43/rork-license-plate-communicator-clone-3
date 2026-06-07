import { MessageType, MessageTemplate, QuickReply } from '@/types';

export type QuickActionIntent = 'critical' | 'car' | 'road' | 'community';

export interface QuickActionItem {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  type: MessageType;
  intent: QuickActionIntent;
  prefilledMessage: string;
  isNew?: boolean;
  /** SMS sent immediately even if recipient hasn't downloaded HOMI */
  highPriority?: boolean;
}

export const QUICK_ACTIONS: QuickActionItem[] = [
  // ── CRITICAL ─────────────────────────────────────────────────────────────
  {
    id: 'fire',
    label: 'Smoke / fire',
    emoji: '🔥',
    tint: '#FF2D2D',
    type: 'safety',
    intent: 'critical',
    highPriority: true,
    prefilledMessage:
      'Your car is smoking or smells like burning. Please pull over safely and check your engine right away. Do not ignore this.',
  },
  {
    id: 'child_pet',
    label: 'Child / pet inside',
    emoji: '🚨',
    tint: '#FF2D2D',
    type: 'child_pet_alert',
    intent: 'critical',
    isNew: true,
    highPriority: true,
    prefilledMessage:
      'There appears to be a child or pet left alone in your car. Temperatures inside a car rise dangerously fast. Please return immediately.',
  },
  {
    id: 'leak',
    label: 'Fluid leaking',
    emoji: '💧',
    tint: '#FF2D2D',
    type: 'leaking_fluid',
    intent: 'critical',
    isNew: true,
    highPriority: true,
    prefilledMessage:
      'Your vehicle appears to be leaking fluid underneath. This could be a fire risk — please check your car before moving it.',
  },
  {
    id: 'tow',
    label: 'Being towed',
    emoji: '🚨',
    tint: '#FF4757',
    type: 'tow_warning',
    intent: 'critical',
    highPriority: true,
    prefilledMessage:
      'Your car is about to be towed! Please return to it immediately if you possibly can.',
  },

  // ── CAR ──────────────────────────────────────────────────────────────────
  {
    id: 'blocking',
    label: 'Blocking me',
    emoji: '🚗',
    tint: '#FF7A6E',
    type: 'blocking',
    intent: 'car',
    prefilledMessage:
      "Hi! Your vehicle is blocking mine. Could you please move it when you get a chance? Thanks so much!",
  },
  {
    id: 'lights',
    label: 'Lights on',
    emoji: '💡',
    tint: '#F5A623',
    type: 'lights_on',
    intent: 'car',
    prefilledMessage:
      "Hi! Just a heads up — your headlights are still on. Saving you a dead battery!",
  },
  {
    id: 'door_open',
    label: 'Door / boot open',
    emoji: '🚪',
    tint: '#F26530',
    type: 'trunk_open',
    intent: 'car',
    isNew: true,
    prefilledMessage:
      "Hi! It looks like your car door or boot might still be open. Just wanted to give you a heads up!",
  },
  {
    id: 'window',
    label: 'Window open',
    emoji: '🪟',
    tint: '#4FB6FF',
    type: 'window_open',
    intent: 'car',
    prefilledMessage:
      "Hi! One of your windows looks open — thought you'd want to know before it rains!",
  },
  {
    id: 'tire',
    label: 'Low tyre',
    emoji: '🛞',
    tint: '#4FB6FF',
    type: 'flat_tire',
    intent: 'car',
    prefilledMessage:
      "Hi! One of your tyres looks low on air. Might be worth a quick check before you head off!",
  },
  {
    id: 'keys',
    label: 'Keys visible',
    emoji: '🔑',
    tint: '#7E5BF0',
    type: 'keys_visible',
    intent: 'car',
    prefilledMessage:
      "Hi! Your keys appear to be visible inside your car. Might be worth tucking them out of sight.",
  },
  {
    id: 'sticker',
    label: 'Expired sticker',
    emoji: '📋',
    tint: '#4FB6FF',
    type: 'general',
    intent: 'car',
    isNew: true,
    prefilledMessage:
      "Hi! Your registration or inspection sticker looks like it might have expired. Wanted to flag it before you get pulled over!",
  },
  {
    id: 'hit',
    label: 'Hit & run',
    emoji: '💥',
    tint: '#FF4757',
    type: 'hazard',
    intent: 'car',
    prefilledMessage:
      "Hi — I think your car may have been hit while parked. I witnessed it and wanted to let you know right away. Check for damage.",
  },

  // ── ROAD ─────────────────────────────────────────────────────────────────
  {
    id: 'debris',
    label: 'Road debris',
    emoji: '⚠️',
    tint: '#1B6EF3',
    type: 'hazard',
    intent: 'road',
    isNew: true,
    prefilledMessage:
      "Heads up — there's debris or an obstacle on the road ahead. Take it slow and keep an eye out.",
  },
  {
    id: 'erratic',
    label: 'Erratic driving',
    emoji: '🚗',
    tint: '#F5A623',
    type: 'report_driver',
    intent: 'road',
    isNew: true,
    prefilledMessage:
      "Hi — I noticed some concerning driving behaviour. Just a friendly heads up to take extra care on the road today. Stay safe.",
  },
  {
    id: 'phone',
    label: 'Phone at wheel',
    emoji: '📱',
    tint: '#F5A623',
    type: 'report_driver',
    intent: 'road',
    isNew: true,
    prefilledMessage:
      "Hi — I noticed you may have been on your phone while driving. Just a friendly reminder to stay focused on the road. Drive safe!",
  },
  {
    id: 'parking',
    label: 'Parking issue',
    emoji: '⚠️',
    tint: '#F26530',
    type: 'parking_alert',
    intent: 'road',
    prefilledMessage:
      "Hi! Just a quick note — the spot you're in may be ticketed soon. Worth double-checking the sign!",
  },
  {
    id: 'spot',
    label: 'Spot opening up',
    emoji: '🅿️',
    tint: '#2ED3B7',
    type: 'general',
    intent: 'road',
    isNew: true,
    prefilledMessage:
      "Hey! I'm leaving this parking spot in the next couple of minutes if you need it. Happy to wait while you reverse in.",
  },

  // ── COMMUNITY ────────────────────────────────────────────────────────────
  {
    id: 'thanks_merge',
    label: 'Thank you for merging',
    emoji: '🤝',
    tint: '#2ED3B7',
    type: 'compliment',
    intent: 'community',
    isNew: true,
    prefilledMessage:
      "Hey! Just wanted to say a genuine thank you for letting me in. That small gesture made my whole commute. Really appreciated.",
  },
  {
    id: 'nice_ride',
    label: 'Nice ride',
    emoji: '❤️',
    tint: '#2ED3B7',
    type: 'compliment',
    intent: 'community',
    prefilledMessage:
      "Hey! Just wanted to say — your car looks absolutely amazing. Nice ride! 🤙",
  },
];

export const QUICK_ACTIONS_BY_INTENT = {
  critical: QUICK_ACTIONS.filter((a) => a.intent === 'critical'),
  car: QUICK_ACTIONS.filter((a) => a.intent === 'car'),
  road: QUICK_ACTIONS.filter((a) => a.intent === 'road'),
  community: QUICK_ACTIONS.filter((a) => a.intent === 'community'),
} as const;

// ── Legacy exports preserved ───────────────────────────────────────────────

export const quickActions = QUICK_ACTIONS.map((a) => ({
  id: a.id,
  type: a.type,
  title: a.label,
  icon: a.emoji,
  color: a.tint,
  message: a.prefilledMessage,
}));

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
