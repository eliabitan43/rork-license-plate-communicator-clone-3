import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  RefreshControl,
  TextInput,
  Platform,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  ArrowUpRight,
  Camera,
  Car,
  ChevronRight,
  Send,
  Zap,
  Globe,
  MapPin,
  ChevronDown,
  CheckCircle,
  X,
  Bike,
  Truck,
  Caravan,
  Sailboat,
  Bus,
  Container,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Modal, FlatList } from "react-native";
import { ActionIcon, ActionIconGlyph } from "@/components/ActionIcon";
import { getQuickActionIcon, formatCountryLabel } from "@/constants/actionIcons";
import { designTokens, theme } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { Message, MessageType } from "@/types";
import { useToast } from "@/hooks/useToast";
import { COUNTRIES, getRegionsByCountry, getCountryByCode, getRegionByCode } from "@/constants/regions";

type QuickActionItem = {
  id: string;
  icon: ActionIconGlyph;
  label: string;
  emoji: string;
  tint: string;
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

const MAX_PLATE_LENGTH = 12;
const EMPTY_MESSAGES: Message[] = [];

function normalizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_PLATE_LENGTH);
}

const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: "blocking",
    icon: getQuickActionIcon("blocking"),
    label: "Blocking me",
    emoji: "🚗",
    tint: "#FF7A6E",
    type: "blocking",
    prefilledMessage: "Hi! Your vehicle is blocking me. Could you please move it when you get a chance? Thanks!",
  },
  {
    id: "lights",
    icon: getQuickActionIcon("lights_on"),
    label: "Lights on",
    emoji: "💡",
    tint: "#F5A623",
    type: "lights_on",
    prefilledMessage: "Hi! Just a heads up — your headlights seem to be on. Wanted to save you a dead battery.",
  },
  {
    id: "window",
    icon: getQuickActionIcon("window_open"),
    label: "Window open",
    emoji: "🪟",
    tint: "#4FB6FF",
    type: "window_open",
    prefilledMessage: "Hi! It looks like one of your windows is open. Thought you'd want to know.",
  },
  {
    id: "parking",
    icon: getQuickActionIcon("parking_alert"),
    label: "Parking",
    emoji: "⚠️",
    tint: "#F26530",
    type: "parking_alert",
    prefilledMessage: "Hi! Just a quick note about where your vehicle is currently parked.",
  },
  {
    id: "keys",
    icon: getQuickActionIcon("keys_visible"),
    label: "Keys visible",
    emoji: "🔑",
    tint: "#7E5BF0",
    type: "keys_visible",
    prefilledMessage: "Hi! It looks like your keys may be visible from outside. Wanted to flag it.",
  },
  {
    id: "compliment",
    icon: getQuickActionIcon("compliment"),
    label: "Nice ride",
    emoji: "❤️",
    tint: "#2ED3B7",
    type: "compliment",
    prefilledMessage: "Hey! Just wanted to say your car looks amazing. Nice ride!",
  },
  {
    id: "towing",
    icon: getQuickActionIcon("hazard"),
    label: "Being towed",
    emoji: "🚨",
    tint: "#FF4757",
    type: "general",
    prefilledMessage: "⚠️ Your vehicle is about to be towed. Please return immediately if possible!",
  },
  {
    id: "hit_and_run",
    icon: getQuickActionIcon("hazard"),
    label: "Hit & run",
    emoji: "💥",
    tint: "#8E2DE2",
    type: "general",
    prefilledMessage: "Heads up — your vehicle appears to have been hit. I have details and may have witnessed it. Please check ASAP.",
  },
  {
    id: "low_tire",
    icon: getQuickActionIcon("hazard"),
    label: "Low tire",
    emoji: "🛞",
    tint: "#3498DB",
    type: "general",
    prefilledMessage: "Hi! One of your tires looks low on air. Thought you'd want to check it.",
  },
];

export default function DashboardScreen() {
  const appStore = useAppStore();
  const userProfile = appStore?.userProfile ?? null;
  const primaryVehicle = appStore?.primaryVehicle ?? null;
  const messages = appStore?.messages ?? EMPTY_MESSAGES;
  const sendMessage = appStore?.sendMessage;
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [plateInput, setPlateInput] = useState<string>("");
  const [inputFocused, setInputFocused] = useState<boolean>(false);
  const [sendingActionId, setSendingActionId] = useState<string | null>(null);
  const [helperVisible, setHelperVisible] = useState<boolean>(false);
  const [recipientCountry, setRecipientCountry] = useState<string>("US");
  const [recipientState, setRecipientState] = useState<string>("");
  const [recipientVehicleType, setRecipientVehicleType] = useState<string>("car");
  const [showCountryPicker, setShowCountryPicker] = useState<boolean>(false);
  const [showStatePicker, setShowStatePicker] = useState<boolean>(false);

  const plateInputRef = useRef<TextInput | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const heroSlideAnim = useRef(new Animated.Value(20)).current;
  const inputGlow = useRef(new Animated.Value(0)).current;
  const inputShake = useRef(new Animated.Value(0)).current;
  const sendScale = useRef(new Animated.Value(1)).current;

  const shakeInput = useCallback(() => {
    setHelperVisible(true);
    inputShake.setValue(0);
    Animated.sequence([
      Animated.timing(inputShake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 0.6, duration: 55, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: -0.4, duration: 55, useNativeDriver: true }),
      Animated.timing(inputShake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setHelperVisible(false), 2400);
  }, [inputShake]);

  useEffect(() => {
    console.log("Dashboard: mount animation");
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(heroSlideAnim, { toValue: 0, tension: 58, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, heroSlideAnim]);

  useEffect(() => {
    Animated.timing(inputGlow, {
      toValue: inputFocused ? 1 : 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [inputFocused, inputGlow]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const recentMessages = useMemo<Message[]>(() => {
    return messages
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 4);
  }, [messages]);

  const userPlates = useMemo<string[]>(
    () => userProfile?.vehicles?.map((v) => v.licensePlate) ?? [],
    [userProfile?.vehicles]
  );

  const recentPlates = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const m of messages
      .slice()
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())) {
      const plate = userPlates.includes(m.fromPlate) ? m.toPlate : m.fromPlate;
      if (!plate || userPlates.includes(plate)) continue;
      if (seen.has(plate)) continue;
      seen.add(plate);
      out.push(plate);
      if (out.length >= 4) break;
    }
    return out;
  }, [messages, userPlates]);

  const normalizedPlateInput = normalizePlateInput(plateInput);
  const hasPlateInput = normalizedPlateInput.length > 0;

  const triggerImpact = useCallback(async (style: Haptics.ImpactFeedbackStyle) => {
    try {
      await Haptics.impactAsync(style);
    } catch {}
  }, []);

  const triggerNotify = useCallback(async (type: Haptics.NotificationFeedbackType) => {
    try {
      await Haptics.notificationAsync(type);
    } catch {}
  }, []);

  const playSendAnimation = useCallback(() => {
    sendScale.setValue(1);
    Animated.sequence([
      Animated.spring(sendScale, { toValue: 1.08, tension: 180, friction: 6, useNativeDriver: true }),
      Animated.spring(sendScale, { toValue: 1, tension: 140, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [sendScale]);

  const handlePlateInputChange = useCallback((text: string) => {
    setPlateInput(text);
  }, []);

  const handlePlateInputBlur = useCallback(() => {
    setInputFocused(false);
    setPlateInput(normalizePlateInput(plateInput));
  }, [plateInput]);

  const handleOpenCompose = useCallback(async () => {
    const trimmedPlate = normalizePlateInput(plateInput);
    if (!trimmedPlate) {
      plateInputRef.current?.focus();
      shakeInput();
      await triggerImpact(Haptics.ImpactFeedbackStyle.Light);
      return;
    }
    await triggerImpact(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/send-message",
      params: {
        toPlate: trimmedPlate,
        type: "general",
        prefilledMessage: "",
        actionTitle: "Send Message",
      },
    });
  }, [plateInput, triggerImpact, shakeInput]);

  const handleQuickAction = useCallback(
    async (item: QuickActionItem) => {
      const trimmedPlate = normalizePlateInput(plateInput);
      if (!trimmedPlate) {
        plateInputRef.current?.focus();
        shakeInput();
        await triggerImpact(Haptics.ImpactFeedbackStyle.Light);
        return;
      }

      if (!sendMessage) {
        console.log("Dashboard: sendMessage not available");
        return;
      }

      Keyboard.dismiss();
      setSendingActionId(item.id);
      playSendAnimation();
      await triggerImpact(Haptics.ImpactFeedbackStyle.Medium);

      const outgoing: Message = {
        id: Date.now().toString(),
        fromPlate: primaryVehicle?.licensePlate || "UNKNOWN",
        toPlate: trimmedPlate,
        toCountry: primaryVehicle?.country,
        fromName: userProfile?.isAnonymous ? undefined : userProfile?.displayName,
        content: item.prefilledMessage,
        type: item.type,
        isAnonymous: userProfile?.isAnonymous ?? true,
        timestamp: new Date().toISOString(),
        isRead: false,
        metadata: { good_neighbor_type: item.id },
      };

      try {
        await sendMessage(outgoing);
        await triggerNotify(Haptics.NotificationFeedbackType.Success);
        showToast(`${item.emoji} Sent to ${trimmedPlate}`, "success", 1800);
        setPlateInput("");
      } catch (e) {
        console.log("Dashboard: quick send failed", e);
        showToast("Couldn't send. Try again.", "error", 1800);
      } finally {
        setSendingActionId(null);
      }
    },
    [plateInput, sendMessage, primaryVehicle, userProfile, triggerImpact, triggerNotify, shakeInput, playSendAnimation, showToast]
  );

  const handleCameraPress = useCallback(async () => {
    await triggerImpact(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/scan");
  }, [triggerImpact]);

  const handleRecentPlatePress = useCallback(
    async (plate: string) => {
      await triggerImpact(Haptics.ImpactFeedbackStyle.Light);
      setPlateInput(plate);
      plateInputRef.current?.focus();
    },
    [triggerImpact]
  );

  const handleMessagesPress = useCallback(async () => {
    await triggerImpact(Haptics.ImpactFeedbackStyle.Light);
    router.push("/(tabs)/messages");
  }, [triggerImpact]);

  const borderColorInterp = inputGlow.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(79, 182, 255, 0.24)", "rgba(79, 182, 255, 0.95)"],
  });

  const inputShadowOpacity = inputGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.22],
  });

  return (
    <SafeAreaView style={styles.container} testID="dashboard-screen">
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={designTokens.color.primary} />
        }
      >
        <View style={styles.contentWrap}>
          <Animated.View
            style={[
              styles.heroBlock,
              {
                opacity: fadeAnim,
                transform: [{ translateY: heroSlideAnim }, { scale: sendScale }],
              },
            ]}
            testID="home-hero"
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>Message any plate</Text>
                <Text style={styles.heroTitle}>Who do you want to reach?</Text>
              </View>
              {primaryVehicle?.licensePlate ? (
                <View style={styles.myPlateChip} testID="my-plate-chip">
                  <Text style={styles.myPlateLabel}>You</Text>
                  <Text style={styles.myPlateText}>{primaryVehicle.licensePlate}</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.claimChip}
                  onPress={() => {
                    void triggerImpact(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/onboarding");
                  }}
                  activeOpacity={0.8}
                  testID="claim-plate-chip"
                >
                  <Text style={styles.claimChipLabel}>Claim plate</Text>
                  <Text style={styles.claimChipHint}>to receive replies</Text>
                </TouchableOpacity>
              )}
            </View>

            <Animated.View
              style={{
                transform: [
                  {
                    translateX: inputShake.interpolate({
                      inputRange: [-1, 1],
                      outputRange: [-8, 8],
                    }),
                  },
                ],
              }}
            >
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

                  <TouchableOpacity
                    style={styles.caPlateCameraButton}
                    onPress={handleCameraPress}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    testID="camera-button"
                  >
                    <Camera size={16} color="#FFFFFF" strokeWidth={2.2} />
                  </TouchableOpacity>

                  <TextInput
                    ref={plateInputRef}
                    style={[styles.caPlateInput, Platform.OS === "web" ? styles.caPlateInputWeb : null]}
                    placeholder="ABC1234"
                    placeholderTextColor="rgba(0, 51, 135, 0.22)"
                    value={plateInput}
                    onChangeText={handlePlateInputChange}
                    onFocus={() => setInputFocused(true)}
                    onBlur={handlePlateInputBlur}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    spellCheck={false}
                    returnKeyType="send"
                    onSubmitEditing={handleOpenCompose}
                    maxLength={8}
                    selectionColor="#003F87"
                    testID="plate-input"
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
                  testID="home-country-selector"
                >
                  <Globe size={16} color="#FFFFFF" />
                  <Text style={styles.selectorText} numberOfLines={1}>
                    {formatCountryLabel(recipientCountry, getCountryByCode(recipientCountry)?.name)}
                  </Text>
                  <ChevronDown size={16} color="#FFFFFF" />
                </TouchableOpacity>

                {getRegionsByCountry(recipientCountry).length > 0 && (
                  <TouchableOpacity
                    style={styles.stateSelector}
                    onPress={() => setShowStatePicker(true)}
                    testID="home-state-selector"
                  >
                    <MapPin size={16} color="#FFFFFF" />
                    <Text style={styles.selectorText} numberOfLines={1}>
                      {recipientState ? getRegionByCode(recipientState, recipientCountry)?.name : 'State / Region'}
                    </Text>
                    <ChevronDown size={16} color="#FFFFFF" />
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
                        testID={`home-vehicle-type-${vt.id}`}
                      >
                        <Icon
                          size={16}
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

              {helperVisible ? (
                <Text style={styles.helperAlert} testID="plate-helper-alert">
                  Enter a plate to continue
                </Text>
              ) : null}
            </Animated.View>

            {recentPlates.length > 0 ? (
              <View style={styles.recentPlatesWrap}>
                <Text style={styles.recentPlatesLabel}>Recent</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recentPlatesRow}
                >
                  {recentPlates.map((plate) => (
                    <TouchableOpacity
                      key={plate}
                      style={styles.recentPlateChip}
                      onPress={() => void handleRecentPlatePress(plate)}
                      activeOpacity={0.75}
                      testID={`recent-plate-${plate}`}
                    >
                      <Text style={styles.recentPlateText}>{plate}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.quickHeader}>
              <View style={styles.quickHeaderLeft}>
                <Zap size={14} color={designTokens.color.primary} strokeWidth={2.4} fill={designTokens.color.primary} />
                <Text style={styles.quickHeaderText}>One-tap message</Text>
              </View>
              <Text style={styles.quickHeaderHint}>{hasPlateInput ? "Tap to send now" : "Type a plate first"}</Text>
            </View>

            <View style={styles.quickGrid}>
              {QUICK_ACTIONS.map((item) => {
                const isSending = sendingActionId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.quickTile, isSending && styles.quickTileSending]}
                    activeOpacity={0.82}
                    onPress={() => void handleQuickAction(item)}
                    disabled={isSending}
                    testID={`quick-action-${item.id}`}
                  >
                    <View style={[styles.quickEmojiWrap, { backgroundColor: `${item.tint}1A` }]}>
                      <Text style={styles.quickEmoji}>{item.emoji}</Text>
                    </View>
                    <Text style={styles.quickLabel} numberOfLines={1}>
                      {item.label}
                    </Text>
                    {isSending ? (
                      <View style={styles.quickSendingDot} />
                    ) : (
                      <ActionIcon icon={item.icon} size={22} iconSize={11} style={styles.quickIconGhost} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.composeButton}
              activeOpacity={0.85}
              onPress={() => void handleOpenCompose()}
              testID="open-message-button"
            >
              <LinearGradient
                colors={["#4FB6FF", "#2ED3B7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.composeGradient}
              >
                <Send size={16} color="#FFFFFF" strokeWidth={2.4} />
                <Text style={styles.composeText}>Write a custom message</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Recent activity</Text>
              <Text style={styles.sectionSubtitle}>Your latest plate conversations</Text>
            </View>
            {messages.length > 0 ? (
              <TouchableOpacity
                style={styles.seeAllButton}
                onPress={() => void handleMessagesPress()}
                activeOpacity={0.75}
                testID="see-all-messages"
              >
                <Text style={styles.seeAllText}>See all</Text>
                <ArrowUpRight size={13} color={designTokens.color.primary} strokeWidth={2.3} />
              </TouchableOpacity>
            ) : null}
          </View>

          {recentMessages.length > 0 ? (
            <View style={styles.messagesCard}>
              {recentMessages.map((message, index) => (
                <MessageRow
                  key={message.id}
                  msg={message}
                  index={index}
                  isLast={index === recentMessages.length - 1}
                  userPlates={userPlates}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyCard} testID="home-empty-state">
              <View style={styles.emptyIconWrap}>
                <Send size={22} color={designTokens.color.primary} strokeWidth={2.1} />
              </View>
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Type any plate above and tap one of the quick actions to send your first message.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

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
                  style={[styles.pickerItem, item.code === recipientCountry && styles.pickerItemSelected]}
                  onPress={() => {
                    setRecipientCountry(item.code);
                    setRecipientState("");
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.code === recipientCountry && styles.pickerItemTextSelected]}>
                    {formatCountryLabel(item.code, item.name)}
                  </Text>
                  {item.code === recipientCountry && <CheckCircle size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
                  style={[styles.pickerItem, item.code === recipientState && styles.pickerItemSelected]}
                  onPress={() => {
                    setRecipientState(item.code);
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, item.code === recipientState && styles.pickerItemTextSelected]}>
                    {item.name}
                  </Text>
                  {item.code === recipientState && <CheckCircle size={20} color={theme.colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function MessageRow({
  msg,
  index,
  isLast,
  userPlates,
}: {
  msg: Message;
  index: number;
  isLast: boolean;
  userPlates: string[];
}) {
  const isSent = userPlates.includes(msg.fromPlate);
  const isUnread = !msg.isRead && !isSent;

  return (
    <TouchableOpacity
      style={[styles.messageRow, !isLast && styles.messageRowBorder]}
      onPress={() => {
        router.push({ pathname: "/message-detail", params: { messageId: msg.id } });
      }}
      activeOpacity={0.7}
      testID={`message-preview-${index}`}
    >
      <View style={[styles.messageAvatar, isSent ? styles.messageAvatarSent : styles.messageAvatarReceived]}>
        <Text style={styles.messageAvatarText}>{isSent ? "↑" : "↓"}</Text>
      </View>
      <View style={styles.messageBody}>
        <View style={styles.messageTopRow}>
          <Text style={[styles.messagePlate, isUnread && styles.messagePlateUnread]} numberOfLines={1}>
            {isSent ? msg.toPlate : msg.fromPlate}
          </Text>
          <Text style={styles.messageTime}>{formatRelativeTime(msg.timestamp)}</Text>
        </View>
        <Text style={[styles.messagePreview, isUnread && styles.messagePreviewUnread]} numberOfLines={1}>
          {msg.content}
        </Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
      <ChevronRight size={14} color={designTokens.color.textLight} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FB",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  contentWrap: {
    paddingHorizontal: 18,
    paddingTop: 10,
    gap: 22,
  },
  heroBlock: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 18,
    borderWidth: 1,
    borderColor: "rgba(21, 42, 72, 0.06)",
    shadowColor: "#0B1F3A",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.08,
    shadowRadius: 26,
    elevation: 6,
    gap: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  heroEyebrow: {
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase" as const,
    color: designTokens.color.primary,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.6,
    lineHeight: 28,
  },
  myPlateChip: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#152A48",
    borderRadius: 14,
  },
  myPlateLabel: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 1,
    textTransform: "uppercase" as const,
  },
  myPlateText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 1.6,
    marginTop: 2,
  },
  claimChip: {
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(46, 211, 183, 0.14)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(46, 211, 183, 0.5)",
  },
  claimChipLabel: {
    fontSize: 12,
    fontWeight: "800" as const,
    color: "#159A7E",
    letterSpacing: 0.2,
  },
  claimChipHint: {
    fontSize: 10,
    fontWeight: "600" as const,
    color: "#159A7E",
    marginTop: 1,
    opacity: 0.85,
  },
  heroInputCard: {
    backgroundColor: "#F8FAFD",
    borderRadius: 20,
    borderWidth: 2,
    padding: 8,
    shadowColor: "#4FB6FF",
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 3,
  },
  plateInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  plateIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(79, 182, 255, 0.14)",
    marginRight: 10,
  },
  plateIconWrapFocused: {
    backgroundColor: "#4FB6FF",
  },
  plateInput: {
    flex: 1,
    fontSize: 26,
    fontWeight: "800" as const,
    letterSpacing: 3.2,
    color: designTokens.color.text,
    paddingVertical: 10,
  },
  plateInputWeb: {
    textTransform: "uppercase" as const,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#152A48",
  },
  helperAlert: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#F26530",
    marginTop: 8,
    marginLeft: 12,
  },
  recentPlatesWrap: {
    gap: 8,
  },
  recentPlatesLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
    color: designTokens.color.textLight,
  },
  recentPlatesRow: {
    gap: 8,
    paddingRight: 8,
  },
  recentPlateChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(79, 182, 255, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(79, 182, 255, 0.28)",
  },
  recentPlateText: {
    fontSize: 13,
    fontWeight: "800" as const,
    letterSpacing: 1.4,
    color: "#1B3A64",
  },
  quickHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  quickHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  quickHeaderText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: 0.2,
  },
  quickHeaderHint: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: designTokens.color.textLight,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10,
  },
  quickTile: {
    width: "31.5%",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(21, 42, 72, 0.08)",
    alignItems: "center",
    gap: 6,
    shadowColor: "#0B1F3A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  quickTileSending: {
    borderColor: designTokens.color.primary,
    backgroundColor: "rgba(79, 182, 255, 0.08)",
  },
  quickEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickEmoji: {
    fontSize: 22,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    textAlign: "center" as const,
  },
  quickIconGhost: {
    opacity: 0,
    height: 0,
  },
  quickSendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: designTokens.color.primary,
  },
  composeButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4FB6FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  composeGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 50,
  },
  composeText: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: designTokens.color.primary,
  },
  messagesCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(21, 42, 72, 0.06)",
    overflow: "hidden",
    shadowColor: "#0B1F3A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(21, 42, 72, 0.08)",
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  messageAvatarSent: {
    backgroundColor: "rgba(79, 182, 255, 0.16)",
  },
  messageAvatarReceived: {
    backgroundColor: "rgba(46, 211, 183, 0.14)",
  },
  messageAvatarText: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: designTokens.color.text,
  },
  messageBody: {
    flex: 1,
    marginRight: 8,
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
    gap: 10,
  },
  messagePlate: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: 0.6,
  },
  messagePlateUnread: {
    color: designTokens.color.primary,
  },
  messageTime: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: designTokens.color.textLight,
  },
  messagePreview: {
    fontSize: 13,
    color: designTokens.color.textMuted,
  },
  messagePreviewUnread: {
    color: designTokens.color.text,
    fontWeight: "600" as const,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.primary,
    marginRight: 8,
  },
  emptyCard: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 34,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(21, 42, 72, 0.06)",
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(79, 182, 255, 0.14)",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    marginBottom: 6,
    textAlign: "center" as const,
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
  },
  caPlateOuter: {
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 16,
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
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 2,
    borderColor: '#1B1B1B',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 150,
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
  caPlateCameraButton: {
    position: 'absolute',
    bottom: 10,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#152A48',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  locationSelectors: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  countrySelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152A48',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    minHeight: 42,
  },
  stateSelector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#152A48',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    minHeight: 42,
  },
  selectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  vehicleTypeSection: {
    marginTop: 12,
    gap: 8,
  },
  vehicleTypeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vehicleTypeLabel: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: designTokens.color.primary,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  vehicleTypeHint: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: designTokens.color.textLight,
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: 'rgba(79, 182, 255, 0.35)',
    minHeight: 36,
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
    fontSize: 12,
    fontWeight: '700' as const,
    color: designTokens.color.primary,
    letterSpacing: 0.2,
  },
  vehicleTypeChipTextSelected: {
    color: '#FFFFFF',
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 42, 72, 0.08)',
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: designTokens.color.text,
    letterSpacing: 0.5,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(21, 42, 72, 0.06)',
    minHeight: 56,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(79, 182, 255, 0.08)',
  },
  pickerItemText: {
    fontSize: 15,
    color: designTokens.color.text,
  },
  pickerItemTextSelected: {
    color: designTokens.color.primary,
    fontWeight: '700' as const,
  },
});
