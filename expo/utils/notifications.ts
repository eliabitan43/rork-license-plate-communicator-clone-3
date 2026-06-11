import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface PushPermissionResult {
  status: PermissionStatus;
  token?: string;
}

export const PUSH_COPY = {
  title: 'When your car needs to talk.',
  bodies: {
    newMessage: "Someone messaged your car's number — tap to reply.",
    towNearby: "Tow truck spotted near your car. Don't miss the call.",
    buyerInquiry: "New buyer inquiry on your car's phone number.",
    speedRadar: "Speed radar ahead",
    parkingEnforcement: "Parking enforcement nearby",
    hazard: "Road hazard reported",
  },
} as const;

// Deep link helpers
export const deeplinks = {
  alert: (id: string) => `homi://alert?id=${encodeURIComponent(id)}`,
  message: (plate: string) => `homi://message?plate=${encodeURIComponent(plate)}`,
  service: (slug: string) => `homi://services?slug=${encodeURIComponent(slug)}`,
  home: () => 'homi://home',
  marketplace: () => 'homi://marketplace',
};

export async function requestPushPermissions(): Promise<PushPermissionResult> {
  try {
    if (Platform.OS === 'web') {
      if (typeof Notification === 'undefined') {
        return { status: 'unavailable' };
      }
      const permission = await Notification.requestPermission();
      return { status: permission as PermissionStatus };
    }

    // For mobile platforms
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus === 'granted') {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      return { status: finalStatus as PermissionStatus, token };
    }
    
    return { status: finalStatus as PermissionStatus };
  } catch {
    return { status: 'unavailable' };
  }
}

// Configure notification handling
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Android notification channels. Must match the channelIds used by the
 * send-message / push Edge Functions: 'critical-alerts' (MAX — tow, child/pet,
 * fire) and 'messages' (HIGH — everything else). Call once at app start.
 */
export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('critical-alerts', {
      name: 'Critical alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      bypassDnd: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Messages',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  } catch (e) {
    console.warn('Failed to set notification channels', e);
  }
}