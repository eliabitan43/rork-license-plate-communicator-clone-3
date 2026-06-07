import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Modal,
  FlatList,
} from "react-native";
import { X, Send, MapPin, User, Globe, ChevronDown, CheckCircle, Car, Zap, Bike, Truck, Caravan, Sailboat, Bus, Container } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { formatCountryLabel } from "@/constants/actionIcons";
import { theme, designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { Message, MessageType } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { COUNTRIES, getRegionsByCountry, getCountryByCode, getRegionByCode } from "@/constants/regions";
import { useToast } from "@/hooks/useToast";
import { usePlateClaims } from "@/hooks/usePlateClaims";

type QuickActionItem = {
  id: string;
  label: string;
  emoji: string;
  tint: string;
  gradient: readonly [string, string];
  type: MessageType;
  prefilledMessage: string;
};

type VehicleType = {
  id: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
};

const VEHICLE_TYPES: VehicleType[] = [
  { id: "car", label: "Car", Icon: Car },
  { id: "motorcycle", label: "Motorcycle", Icon: Bike },
  { id: "truck", label: "Truck", Icon: Truck },
  { id: "rv", label: "RV", Icon: Caravan },
  { id: "trailer", label: "Trailer", Icon: Container },
  { id: "boat", label: "Boat", Icon: Sailboat },
  { id: "bus", label: "Bus", Icon: Bus },
];

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "blocking",
    label: "Blocking me",
    emoji: "\uD83D\uDE97",
    tint: "#FF7A6E",
    gradient: ["#FF8A80", "#FF4757"] as const,
    type: "blocking",
    prefilledMessage: "Hi! Your vehicle is blocking me. Could you please move it when you get a chance? Thanks!",
  },
  {
    id: "lights",
    label: "Lights on",
    emoji: "\uD83D\uDCA1",
    tint: "#F5A623",
    gradient: ["#FFD86B", "#F5A623"] as const,
    type: "lights_on",
    prefilledMessage: "Hi! Just a heads up \u2014 your headlights seem to be on. Wanted to save you a dead battery.",
  },
  {
    id: "window",
    label: "Window open",
    emoji: "\uD83E\uDE9F",
    tint: "#4FB6FF",
    gradient: ["#7DD3FC", "#4FB6FF"] as const,
    type: "window_open",
    prefilledMessage: "Hi! It looks like one of your windows is open. Thought you'd want to know.",
  },
  {
    id: "parking",
    label: "Parking",
    emoji: "\u26A0\uFE0F",
    tint: "#F26530",
    gradient: ["#FFB36B", "#F26530"] as const,
    type: "parking_alert",
    prefilledMessage: "Hi! Just a quick note about where your vehicle is currently parked.",
  },
  {
    id: "keys",
    label: "Keys visible",
    emoji: "\uD83D\uDD11",
    tint: "#7E5BF0",
    gradient: ["#A78BFA", "#7E5BF0"] as const,
    type: "keys_visible",
    prefilledMessage: "Hi! It looks like your keys may be visible from outside. Wanted to flag it.",
  },
  {
    id: "compliment",
    label: "Nice ride",
    emoji: "\u2764\uFE0F",
    tint: "#2ED3B7",
    gradient: ["#5EEAD4", "#14B8A6"] as const,
    type: "compliment",
    prefilledMessage: "Hey! Just wanted to say your car looks amazing. Nice ride!",
  },
  {
    id: "towing",
    label: "Being towed",
    emoji: "\uD83D\uDEA8",
    tint: "#FF4757",
    gradient: ["#FF6B6B", "#C81E2C"] as const,
    type: "general",
    prefilledMessage: "\u26A0\uFE0F Your vehicle is about to be towed. Please return immediately if possible!",
  },
  {
    id: "flat_tire",
    label: "Flat tire",
    emoji: "\uD83D\uDEE0\uFE0F",
    tint: "#8E2DE2",
    gradient: ["#B57BFF", "#7B2BD6"] as const,
    type: "general",
    prefilledMessage: "Heads up \u2014 looks like one of your tires is flat. Wanted to let you know.",
  },
  {
    id: "low_tire",
    label: "Low tire",
    emoji: "\uD83D\uDEDE",
    tint: "#3498DB",
    gradient: ["#60A5FA", "#2563EB"] as const,
    type: "general",
    prefilledMessage: "Hi! One of your tires looks low on air. Thought you'd want to check it.",
  },
];

interface QuickActionsGridProps {
  selectedId: string;
  onSelect: (item: QuickActionItem) => void;
  hasPlateInput: boolean;
}

function QuickActionsGrid({ selectedId, onSelect, hasPlateInput }: QuickActionsGridProps) {
  const handlePress = async (item: QuickActionItem) => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onSelect(item);
  };

  return (
    <View style={styles.quickContainer}>
      <View style={styles.quickHeader}>
        <View style={styles.quickHeaderLeft}>
          <Zap size={14} color={designTokens.color.primary} strokeWidth={2.4} fill={designTokens.color.primary} />
          <Text style={styles.quickHeaderText}>One-tap message</Text>
        </View>
        <Text style={styles.quickHeaderHint}>{hasPlateInput ? 'Tap to fill' : 'Tap to use'}</Text>
      </View>

      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.quickTile, isSelected && styles.quickTileSelected]}
              activeOpacity={0.82}
              onPress={() => void handlePress(item)}
              testID={`quick-action-${item.id}`}
            >
              <LinearGradient
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.quickEmojiWrap, { shadowColor: item.tint }]}
              >
                <Text style={styles.quickEmoji}>{item.emoji}</Text>
              </LinearGradient>
              <Text style={styles.quickLabel} numberOfLines={1}>
                {item.label}
              </Text>
              {isSelected ? (
                <View style={styles.quickSelectedDot}>
                  <CheckCircle size={14} color={designTokens.color.primary} />
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

type SendMessageDraftV1 = {
  version: 1;
  recipientPlate: string;
  recipientCountry: string;
  recipientState?: string;
  message: string;
  location?: string;
  sendAnonymously: boolean;
  goodNeighborType?: string;
  messageType: MessageType;
  updatedAt: number;
};

function getDraftKey(recipientPlate: string, messageType: MessageType) {
  return `send_message_draft_v1:${recipientPlate || "_"}:${messageType}`;
}

export default function SendMessageScreen() {
  const params = useLocalSearchParams();
  const { toPlate, type, prefilledMessage, actionTitle } = params as {
    toPlate?: string;
    type: MessageType;
    prefilledMessage?: string;
    actionTitle?: string;
  };

  const { userProfile, sendMessage } = useAppStore();
  const { showToast } = useToast();
  const plateClaims = usePlateClaims();

  const messageType = (type as MessageType) ?? "general";

  const [message, setMessage] = useState<string>(prefilledMessage || "");
  const [location, setLocation] = useState<string>("");
  const [sendAnonymously, setSendAnonymously] = useState<boolean>(userProfile?.isAnonymous ?? true);
  const [recipientCountry, setRecipientCountry] = useState<string>("US");
  const [recipientState, setRecipientState] = useState<string>("");
  const [recipientVehicleType, setRecipientVehicleType] = useState<string>("car");
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [showStatePicker, setShowStatePicker] = useState<boolean>(false);
  const [goodNeighborType, setGoodNeighborType] = useState<string>("");
  const [recipientPlate, setRecipientPlate] = useState<string>((toPlate ?? "").toString().toUpperCase());

  const didHydrateDraftRef = useRef(false);
  const saveDraftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey = useMemo(() => getDraftKey(recipientPlate.trim().toUpperCase(), messageType), [recipientPlate, messageType]);

  useEffect(() => {
    let isMounted = true;

    const hydrateDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem(draftKey);
        if (!isMounted) return;

        if (!stored || stored === 'undefined' || stored === 'null' || stored === 'o' || stored === 'object') {
          didHydrateDraftRef.current = true;
          return;
        }

        const parsed = JSON.parse(stored) as SendMessageDraftV1;
        if (!parsed || parsed.version !== 1) {
          didHydrateDraftRef.current = true;
          return;
        }

        const hasPrefilled = Boolean((prefilledMessage ?? '').trim());
        if (hasPrefilled) {
          didHydrateDraftRef.current = true;
          return;
        }

        console.log('SendMessage: hydrating draft', { draftKey, updatedAt: parsed.updatedAt });

        setRecipientPlate((prev) => (parsed.recipientPlate || prev).toUpperCase());
        setRecipientCountry(parsed.recipientCountry || 'US');
        setRecipientState(parsed.recipientState || '');
        setMessage(parsed.message || '');
        setLocation(parsed.location || '');
        setSendAnonymously(Boolean(parsed.sendAnonymously));
        setGoodNeighborType(parsed.goodNeighborType || '');

        didHydrateDraftRef.current = true;
      } catch (e) {
        console.log('SendMessage: failed to hydrate draft', e);
        didHydrateDraftRef.current = true;
      }
    };

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, [draftKey, prefilledMessage]);

  useEffect(() => {
    if (!didHydrateDraftRef.current) return;

    if (saveDraftTimeoutRef.current) {
      clearTimeout(saveDraftTimeoutRef.current);
      saveDraftTimeoutRef.current = null;
    }

    const shouldSave = Boolean(
      recipientPlate.trim() ||
        message.trim() ||
        location.trim() ||
        recipientState.trim() ||
        goodNeighborType.trim()
    );

    if (!shouldSave) {
      void AsyncStorage.removeItem(draftKey).catch(() => {});
      return;
    }

    const draft: SendMessageDraftV1 = {
      version: 1,
      recipientPlate: recipientPlate.trim().toUpperCase(),
      recipientCountry,
      recipientState: recipientState.trim() || undefined,
      message,
      location: location.trim() || undefined,
      sendAnonymously,
      goodNeighborType: goodNeighborType.trim() || undefined,
      messageType,
      updatedAt: Date.now(),
    };

    saveDraftTimeoutRef.current = setTimeout(() => {
      console.log('SendMessage: saving draft', { draftKey, updatedAt: draft.updatedAt });
      AsyncStorage.setItem(draftKey, JSON.stringify(draft)).catch(() => {});
    }, 450);

    return () => {
      if (saveDraftTimeoutRef.current) {
        clearTimeout(saveDraftTimeoutRef.current);
        saveDraftTimeoutRef.current = null;
      }
    };
  }, [draftKey, goodNeighborType, location, message, messageType, recipientCountry, recipientPlate, recipientState, sendAnonymously]);

  const clearDraft = async () => {
    try {
      console.log('SendMessage: clearing draft', { draftKey });
      await AsyncStorage.removeItem(draftKey);
      setMessage('');
      setLocation('');
      setRecipientState('');
      setGoodNeighborType('');
      showToast('Draft cleared', 'success', 1200);
    } catch (e) {
      console.log('SendMessage: failed to clear draft', e);
      showToast('Failed to clear draft', 'error', 1600);
    }
  };

  const handleSend = async () => {
    if (!recipientPlate.trim()) {
      showToast("Please enter the recipient's license plate", "error");
      return;
    }
    if (!message.trim()) {
      showToast("Please enter a message", "error");
      return;
    }

    const newMessage: Message = {
      id: Date.now().toString(),
      fromPlate: userProfile?.vehicles.find(v => v.isPrimary)?.licensePlate || "UNKNOWN",
      toPlate: recipientPlate.trim().toUpperCase(),
      toCountry: recipientCountry,
      toState: recipientState || undefined,
      fromName: sendAnonymously ? undefined : userProfile?.displayName,
      content: message,
      type: messageType,
      isAnonymous: sendAnonymously,
      timestamp: new Date().toISOString(),
      isRead: false,
      location: location || undefined,
      metadata: {
        good_neighbor_type: goodNeighborType || undefined,
      },
    };

    try {
      await sendMessage(newMessage);
      try {
        await AsyncStorage.removeItem(draftKey);
      } catch {}

      try {
        const recipientPlateKey = recipientPlate.trim().toUpperCase();
        const userOwnsRecipient = (userProfile?.vehicles ?? []).some(
          (v) => v.licensePlate.toUpperCase() === recipientPlateKey
        );
        if (!userOwnsRecipient && !plateClaims.claimedPlates[recipientPlateKey]) {
          await plateClaims.recordPendingInvite({
            toPlate: recipientPlateKey,
            country: recipientCountry,
            state: recipientState || undefined,
            fromPlate: newMessage.fromPlate,
            fromName: sendAnonymously ? undefined : userProfile?.displayName,
            sampleMessage: message.trim(),
          });
        }
      } catch (claimErr) {
        console.log('SendMessage: failed to record pending invite', claimErr);
      }

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      // Show success notification
      showToast("✅ Message sent!", "success", 2000);
      
      // Send a local notification for confirmation
      try {
        if (Platform.OS === 'web') {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification('HOMI - Message Sent', {
              body: `Your message to ${recipientPlate.trim().toUpperCase()} has been delivered successfully.`,
              icon: '/favicon.png',
              tag: 'message-sent',
            });
          }
        } else {
          const { status } = await import('expo-notifications').then(n => n.getPermissionsAsync());
          if (status === 'granted') {
            await import('expo-notifications').then(n => n.scheduleNotificationAsync({
              content: {
                title: 'HOMI - Message Sent',
                body: `Your message to ${recipientPlate.trim().toUpperCase()} has been delivered successfully.`,
                data: { type: 'message-sent', plate: recipientPlate.trim().toUpperCase() },
              },
              trigger: null,
            }));
          }
        }
      } catch (notificationError) {
        console.log('Could not send confirmation notification:', notificationError);
      }
      
      // Navigate back quickly
      setTimeout(() => {
        try {
          router.back();
        } catch {
          router.replace('/(tabs)/dashboard');
        }
      }, 500);
    } catch {
      showToast("Failed to send message. Please try again.", "error");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => {
          try {
            router.back();
          } catch {
            router.replace('/(tabs)/dashboard');
          }
        }}>
          <X size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{actionTitle || 'Send Message'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.recipientCard}>
            <Text style={styles.recipientLabel}>To License Plate</Text>

            <View style={styles.caPlateOuter}>
              <View style={styles.caPlateInner}>
                <View style={styles.caPlateBoltTL} />
                <View style={styles.caPlateBoltTR} />
                <View style={styles.caPlateBoltBL} />
                <View style={styles.caPlateBoltBR} />

                <View style={styles.caPlateStickerWrap}>
                  <View style={styles.caPlateStickerMonth}>
                    <Text style={styles.caPlateStickerMonthText}>04</Text>
                  </View>
                  <View style={styles.caPlateStickerYear}>
                    <Text style={styles.caPlateStickerYearText}>26</Text>
                  </View>
                </View>

                <TextInput
                  style={[styles.caPlateInput, Platform.OS === 'web' ? styles.caPlateInputWeb : null]}
                  placeholder="ABC1234"
                  placeholderTextColor="rgba(0, 51, 135, 0.22)"
                  value={recipientPlate}
                  onChangeText={(t) => setRecipientPlate(t.toUpperCase())}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  spellCheck={false}
                  maxLength={8}
                  selectionColor="#003F87"
                  testID="recipient-plate-input"
                />

                <Text style={styles.caPlateBottom}>
                  {(getRegionByCode(recipientState, recipientCountry)?.name) || (getCountryByCode(recipientCountry)?.name) || 'dmv.gov'}
                </Text>
              </View>
            </View>

            <View style={styles.locationSelectors}>
              <TouchableOpacity 
                style={styles.countrySelector}
                onPress={() => setShowCountryPicker(true)}
              >
                <Globe size={18} color={theme.colors.white} />
                <Text style={styles.selectorText}>
                  {formatCountryLabel(recipientCountry, getCountryByCode(recipientCountry)?.name)}
                </Text>
                <ChevronDown size={18} color={theme.colors.white} />
              </TouchableOpacity>
              
              {getRegionsByCountry(recipientCountry).length > 0 && (
                <TouchableOpacity 
                  style={styles.stateSelector}
                  onPress={() => setShowStatePicker(true)}
                >
                  <MapPin size={18} color={theme.colors.white} />
                  <Text style={styles.selectorText}>
                    {recipientState ? getRegionByCode(recipientState, recipientCountry)?.name : 'Select State/Region'}
                  </Text>
                  <ChevronDown size={18} color={theme.colors.white} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.vehicleTypeSection}>
              <View style={styles.vehicleTypeHeader}>
                <Text style={styles.vehicleTypeLabel}>Vehicle Type</Text>
                <Text style={styles.vehicleTypeHint}>Recognized worldwide</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vehicleTypeRow}
              >
                {VEHICLE_TYPES.map((vt) => {
                  const isSelected = recipientVehicleType === vt.id;
                  const Icon = vt.Icon;
                  return (
                    <TouchableOpacity
                      key={vt.id}
                      style={[styles.vehicleTypeChip, isSelected && styles.vehicleTypeChipSelected]}
                      onPress={async () => {
                        if (Platform.OS !== 'web') {
                          await Haptics.selectionAsync().catch(() => {});
                        }
                        setRecipientVehicleType(vt.id);
                      }}
                      activeOpacity={0.8}
                      testID={`vehicle-type-${vt.id}`}
                    >
                      <Icon
                        size={18}
                        color={isSelected ? '#FFFFFF' : designTokens.color.primary}
                        strokeWidth={2.2}
                      />
                      <Text style={[styles.vehicleTypeChipText, isSelected && styles.vehicleTypeChipTextSelected]}>
                        {vt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.inputLabel}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message here..."
              placeholderTextColor={theme.colors.gray}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.optionsCard}>
            <Text style={styles.inputLabel}>Additional Options</Text>
            
            <View style={styles.locationContainer}>
              <MapPin size={20} color={theme.colors.gray} />
              <TextInput
                style={styles.locationInput}
                placeholder="Location (optional)"
                placeholderTextColor={theme.colors.gray}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.anonymousContainer}>
              <View style={styles.anonymousInfo}>
                <User size={20} color={theme.colors.primary} />
                <View style={styles.anonymousText}>
                  <Text style={styles.anonymousLabel}>Send Anonymously</Text>
                  <Text style={styles.anonymousDescription}>
                    Hide your name from the recipient
                  </Text>
                </View>
              </View>
              <Switch
                value={sendAnonymously}
                onValueChange={setSendAnonymously}
                trackColor={{ false: theme.colors.gray, true: theme.colors.primary }}
              />
            </View>
          </View>

          <View style={styles.senderInfo}>
            <Text style={styles.senderLabel}>From:</Text>
            <Text style={styles.senderValue}>
              {sendAnonymously ? 'Anonymous' : userProfile?.displayName || userProfile?.vehicles.find(v => v.isPrimary)?.licensePlate}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearDraftButton}
          onPress={clearDraft}
          testID="clear-draft"
          accessibilityLabel="Clear draft"
        >
          <Text style={styles.clearDraftText}>Clear draft</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={handleSend} testID="send-message-submit">
          <Send size={20} color={theme.colors.white} />
          <Text style={styles.sendButtonText}>Send Message</Text>
        </TouchableOpacity>
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>SELECT COUNTRY</Text>
              <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    item.code === recipientCountry && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setRecipientCountry(item.code);
                    setRecipientState("");
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    item.code === recipientCountry && styles.pickerItemTextSelected
                  ]}>
                    {formatCountryLabel(item.code, item.name)}
                  </Text>
                  {item.code === recipientCountry && (
                    <CheckCircle size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* State/Region Picker Modal */}
      <Modal
        visible={showStatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.pickerModalOverlay}>
          <View style={styles.pickerModalContent}>
            <View style={styles.pickerModalHeader}>
              <Text style={styles.pickerModalTitle}>
                SELECT {recipientCountry === 'US' ? 'STATE' : recipientCountry === 'CA' ? 'PROVINCE' : 'STATE/REGION'}
              </Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={getRegionsByCountry(recipientCountry)}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.pickerItem,
                    item.code === recipientState && styles.pickerItemSelected
                  ]}
                  onPress={() => {
                    setRecipientState(item.code);
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[
                    styles.pickerItemText,
                    item.code === recipientState && styles.pickerItemTextSelected
                  ]}>
                    {item.name}
                  </Text>
                  {item.code === recipientState && (
                    <CheckCircle size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: Math.round(theme.spacing.md * 0.75),
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: Math.round(60 * 0.75),
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
  },
  recipientCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  recipientLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginBottom: 4,
    fontWeight: '700' as const,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  plateOuter: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: 18,
    padding: 4,
    backgroundColor: '#0A0A0A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
    alignSelf: 'stretch',
  },
  plateInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 14,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
    position: 'relative',
    overflow: 'hidden',
  },
  plateStateLabel: {
    color: theme.colors.primary,
    fontSize: 13,
    fontWeight: '800' as const,
    letterSpacing: 3,
    textTransform: 'uppercase' as const,
    marginBottom: 4,
  },
  plateBottomLabel: {
    color: '#1B1B1B',
    fontSize: 10,
    fontWeight: '700' as const,
    letterSpacing: 2,
    marginTop: 4,
    opacity: 0.7,
  },
  recipientPlateInput: {
    color: '#0E1116',
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '900' as const,
    letterSpacing: 6,
    textAlign: 'center',
    paddingVertical: 0,
    minWidth: 220,
    ...(Platform.OS === 'web' ? { fontFamily: 'Impact, "Arial Black", system-ui' as any } : {}),
  },
  plateBoltTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.45,
  },
  plateBoltTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.45,
  },
  plateBoltBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.45,
  },
  plateBoltBR: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.45,
  },
  messageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  inputLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    minHeight: 120,
  },
  optionsCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  locationInput: {
    flex: 1,
    marginLeft: theme.spacing.sm,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  anonymousContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  anonymousInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  anonymousText: {
    flex: 1,
  },
  anonymousLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  anonymousDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  senderLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginRight: theme.spacing.sm,
  },
  senderValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  footer: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  clearDraftButton: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.lightGray,
  },
  clearDraftText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  sendButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  headerSpacer: {
    width: 40,
  },
  locationSelectors: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    minHeight: 44,
  },
  stateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.borderRadius.sm,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
    minHeight: 44,
  },
  selectorText: {
    flex: 1,
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : theme.spacing.lg,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerModalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 56,
  },
  pickerItemSelected: {
    backgroundColor: `${theme.colors.primary}10`,
  },
  pickerItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  pickerItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  heroInputCard: {
    backgroundColor: '#F8FAFD',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(79, 182, 255, 0.6)',
    padding: 8,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    shadowColor: '#4FB6FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 3,
  },
  plateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(79, 182, 255, 0.14)',
    marginRight: 10,
  },
  plateInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800' as const,
    letterSpacing: 3.2,
    color: designTokens.color.text,
    paddingVertical: 10,
  },
  plateInputWeb: {
    textTransform: 'uppercase' as const,
  },
  plateRegionHint: {
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
    color: designTokens.color.textLight,
    marginTop: 6,
    marginLeft: 12,
  },
  quickContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  quickHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  quickHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickHeaderText: {
    fontSize: 13,
    fontWeight: '800' as const,
    color: designTokens.color.text,
    letterSpacing: 0.2,
  },
  quickHeaderHint: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: designTokens.color.textLight,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickTile: {
    width: '31.5%',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(21, 42, 72, 0.08)',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#0B1F3A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickTileSelected: {
    borderColor: designTokens.color.primary,
    backgroundColor: 'rgba(79, 182, 255, 0.08)',
  },
  quickEmojiWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  quickEmoji: {
    fontSize: 24,
  },
  caPlateOuter: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: 14,
    padding: 4,
    backgroundColor: '#0A0A0A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
    alignSelf: 'stretch',
  },
  caPlateInner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  caPlateInput: {
    color: '#003F87',
    fontSize: 52,
    lineHeight: 60,
    fontWeight: '900' as const,
    letterSpacing: 6,
    textAlign: 'center' as const,
    paddingVertical: 0,
    minWidth: 220,
    textShadowColor: 'rgba(0, 51, 135, 0.18)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  caPlateInputWeb: {
    textTransform: 'uppercase' as const,
  },
  caPlateBottom: {
    color: '#003F87',
    fontSize: 11,
    fontWeight: '800' as const,
    letterSpacing: 2,
    marginTop: 6,
    opacity: 0.7,
    textTransform: 'uppercase' as const,
  },
  caPlateStickerWrap: {
    position: 'absolute',
    top: 8,
    right: 10,
    flexDirection: 'row',
    gap: 4,
  },
  caPlateStickerMonth: {
    backgroundColor: '#E63946',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1B1B1B',
    minWidth: 26,
    alignItems: 'center',
  },
  caPlateStickerMonthText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  caPlateStickerYear: {
    backgroundColor: '#F4B400',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#1B1B1B',
    minWidth: 26,
    alignItems: 'center',
  },
  caPlateStickerYearText: {
    color: '#1B1B1B',
    fontSize: 10,
    fontWeight: '900' as const,
    letterSpacing: 0.5,
  },
  caPlateBoltTL: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.55,
  },
  caPlateBoltTR: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.55,
  },
  caPlateBoltBL: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.55,
  },
  caPlateBoltBR: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#1B1B1B',
    opacity: 0.55,
  },
  vehicleTypeSection: {
    marginTop: theme.spacing.md,
    gap: 8,
  },
  vehicleTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTypeLabel: {
    fontSize: 12,
    fontWeight: '800' as const,
    color: theme.colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  vehicleTypeHint: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
  },
  vehicleTypeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  vehicleTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 182, 255, 0.35)',
    minHeight: 40,
  },
  vehicleTypeChipSelected: {
    backgroundColor: designTokens.color.primary,
    borderColor: designTokens.color.primary,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  vehicleTypeChipText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: designTokens.color.primary,
    letterSpacing: 0.2,
  },
  vehicleTypeChipTextSelected: {
    color: '#FFFFFF',
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: designTokens.color.text,
    textAlign: 'center' as const,
  },
  quickSelectedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  goodNeighborTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  tilesScrollView: {
    flex: 1,
  },
  tilesGrid: {
    gap: theme.spacing.sm,
  },
  actionTile: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  actionTileSelected: {
    backgroundColor: theme.colors.primary + '08',
    borderColor: theme.colors.primary + '30',
    transform: [{ scale: 0.98 }],
  },
  tileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  tileIconContainer: {
    marginRight: 2,
  },
  tileBadge: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tileBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as const,
  },
  tileContent: {
    flex: 1,
  },
  tileTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  tileTitleSelected: {
    color: theme.colors.primary,
  },
  tileDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  tileDescriptionSelected: {
    color: theme.colors.textPrimary,
  },
  selectedIndicator: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  tabChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: '#F25A1C20',
    borderWidth: 1,
    borderColor: '#F25A1C',
    gap: theme.spacing.xs,
    minHeight: 44,
  },
  tabChipSelected: {
    backgroundColor: '#F25A1C',
    borderColor: '#F25A1C',
  },
  tabChipText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '500' as const,
    color: '#F25A1C',
  },
  tabChipTextSelected: {
    color: theme.colors.white,
    fontWeight: '600' as const,
  },
});