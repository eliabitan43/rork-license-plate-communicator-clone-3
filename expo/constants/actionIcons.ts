import {
  AlertTriangle,
  Bell,
  Heart,
  House,
  Key,
  Lightbulb,
  Lock,
  MapPin,
  MessageCircle,
  Shield,
  User,
} from "lucide-react-native";
import { ActionIconGlyph } from "@/components/ActionIcon";
import { MessageType } from "@/types";

export const actionIconPalette = {
  primary: "#4FB6FF",
  secondary: "#F4F6F8",
  accent: "#2ED3B7",
  highlight: "#FF7A6E",
  border: "rgba(79, 182, 255, 0.14)",
} as const;

export const tabIcons = {
  home: House,
  messages: MessageCircle,
  nearby: MapPin,
  profile: User,
} as const;

export function getQuickActionIcon(type: MessageType): ActionIconGlyph {
  switch (type) {
    case "blocking":
      return Lock;
    case "lights_on":
      return Lightbulb;
    case "window_open":
      return "window";
    case "parking_alert":
      return "parking";
    case "keys_visible":
      return Key;
    case "compliment":
      return Heart;
    case "break_in_alert":
      return Shield;
    case "car_alarm":
    case "vehicle_alarm":
      return Bell;
    case "hazard":
      return AlertTriangle;
    default:
      return MessageCircle;
  }
}

export function getIntentIcon(intent: string): ActionIconGlyph {
  switch (intent) {
    case "emergency":
      return Shield;
    case "safety_alert":
      return Key;
    case "urgent_notice":
      return Bell;
    case "parking_issue":
      return Lock;
    case "courtesy_notice":
      return Lightbulb;
    default:
      return MessageCircle;
  }
}

export function getIntentLabel(intent: string): string {
  switch (intent) {
    case "emergency":
      return "Emergency";
    case "safety_alert":
      return "Safety";
    case "urgent_notice":
      return "Urgent";
    case "parking_issue":
      return "Parking";
    case "courtesy_notice":
      return "Courtesy";
    default:
      return "Notice";
  }
}

export function formatCountryLabel(countryCode: string | undefined, countryName: string | undefined): string {
  if (!countryCode && !countryName) {
    return "Global";
  }

  if (!countryCode) {
    return countryName ?? "Global";
  }

  if (!countryName) {
    return countryCode;
  }

  return `${countryCode} · ${countryName}`;
}
