import React, { useState, useRef, useCallback } from "react";
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
  Alert,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
  ScanLine,
  Send,
  ChevronRight,
} from "lucide-react-native";
import { ActionIcon, ActionIconGlyph } from "@/components/ActionIcon";
import { getQuickActionIcon } from "@/constants/actionIcons";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { quickActions } from "@/constants/quickActions";

const QUICK_TEMPLATES: { id: string; icon: ActionIconGlyph; label: string; type: string }[] = [
  { id: "blocking", icon: getQuickActionIcon("blocking"), label: "Blocking", type: "blocking" },
  { id: "lights", icon: getQuickActionIcon("lights_on"), label: "Lights On", type: "lights_on" },
  { id: "window", icon: getQuickActionIcon("window_open"), label: "Window Open", type: "window_open" },
  { id: "parking", icon: getQuickActionIcon("parking_alert"), label: "Parking", type: "parking_alert" },
  { id: "keys", icon: getQuickActionIcon("keys_visible"), label: "Keys Visible", type: "keys_visible" },
];

export default function ScanScreen() {
  const [plateInput, setPlateInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [helperVisible, setHelperVisible] = useState<boolean>(false);
  const inputRef = useRef<TextInput>(null);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = useCallback(() => {
    setHelperVisible(true);
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0.6, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -0.4, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
    setTimeout(() => setHelperVisible(false), 2800);
    inputRef.current?.focus();
  }, [shakeAnim]);
  const appStore = useAppStore();
  const primaryVehicle = appStore?.primaryVehicle;

  const handlePlateSubmit = useCallback(() => {
    const trimmed = plateInput.trim().toUpperCase();
    if (!trimmed) {
      triggerShake();
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    router.push({
      pathname: "/send-message",
      params: {
        toPlate: trimmed,
        type: "general",
        prefilledMessage: "",
        actionTitle: "Send Message",
      },
    });
  }, [plateInput, triggerShake]);

  const handleQuickTemplate = useCallback(
    (type: string) => {
      const trimmed = plateInput.trim().toUpperCase();
      if (!trimmed) {
        triggerShake();
        if (Platform.OS !== "web") {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        return;
      }

      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      const action = quickActions.find((a) => a.type === type);
      router.push({
        pathname: "/send-message",
        params: {
          toPlate: trimmed,
          type: type,
          prefilledMessage: action?.message || "",
          actionTitle: action?.title || "Send Message",
        },
      });
    },
    [plateInput, triggerShake]
  );

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={styles.iconRow}>
              <View style={styles.scanIconBg}>
                <ScanLine size={28} color={designTokens.color.primary} strokeWidth={2} />
              </View>
            </View>
            <Text style={styles.title}>Message a Driver</Text>
            <Text style={styles.subtitle}>
              Enter a license plate to send a message, alert, or thank you
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.95}
            onPress={() => inputRef.current?.focus()}
          >
            <Animated.View
              style={[
                styles.plateOuter,
                isFocused && styles.plateOuterFocused,
                {
                  transform: [
                    {
                      translateX: shakeAnim.interpolate({
                        inputRange: [-1, 1],
                        outputRange: [-8, 8],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={styles.plateBoltTL} />
              <View style={styles.plateBoltTR} />
              <View style={styles.plateBoltBL} />
              <View style={styles.plateBoltBR} />

              <View style={styles.plateInner}>
                <Text style={styles.plateState}>HOMI</Text>
                <View style={styles.plateMainRow}>
                  <View style={styles.plateStickerYear}>
                    <Text style={styles.plateStickerYearText}>26</Text>
                  </View>
                  <TextInput
                    ref={inputRef}
                    style={styles.plateTextInput}
                    placeholder="ABC1234"
                    placeholderTextColor="#9DB4D6"
                    value={plateInput}
                    onChangeText={(t) => setPlateInput(t.toUpperCase())}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="send"
                    onSubmitEditing={handlePlateSubmit}
                    maxLength={8}
                    selectionColor={designTokens.color.primary}
                    testID="plate-input"
                  />
                  <View style={styles.plateStickerMonth}>
                    <Text style={styles.plateStickerMonthText}>04</Text>
                  </View>
                </View>
                <Text style={styles.plateMotto}>The Connected State</Text>
              </View>

              {plateInput.length > 0 && (
                <TouchableOpacity
                  onPress={() => setPlateInput("")}
                  style={styles.clearButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearText}>Clear</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
          </TouchableOpacity>
          {helperVisible ? (
            <Text style={styles.helperText}>Enter a plate to continue</Text>
          ) : null}

          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handlePlateSubmit}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              activeOpacity={0.9}
              testID="send-message-button"
            >
              <LinearGradient
                colors={["#4FB6FF", "#2ED3B7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <Send size={20} color="#FFFFFF" />
                <Text style={styles.sendButtonText}>
                  Send Message
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Quick Actions</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.templatesGrid}>
            {QUICK_TEMPLATES.map((template) => {
              return (
                <TouchableOpacity
                  key={template.id}
                  style={styles.templateCard}
                  onPress={() => handleQuickTemplate(template.type)}
                  activeOpacity={0.7}
                  testID={`quick-${template.id}`}
                >
                  <ActionIcon
                    icon={template.icon}
                    size={40}
                    iconSize={20}
                    style={styles.templateIcon}
                    highlight={template.id === "blocking"}
                  />
                  <Text style={styles.templateLabel}>{template.label}</Text>
                  <ChevronRight size={14} color={designTokens.color.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          {primaryVehicle && (
            <View style={styles.yourPlateSection}>
              <Text style={styles.yourPlateLabel}>Your plate</Text>
              <View style={styles.yourPlateCard}>
                <View style={styles.yourPlateBadge}>
                  <Text style={styles.yourPlateText}>{primaryVehicle.licensePlate}</Text>
                </View>
                <Text style={styles.yourPlateHint}>
                  Others can message you using this plate
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 28,
  },
  iconRow: {
    marginBottom: 16,
  },
  scanIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${designTokens.color.primary}12`,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
    lineHeight: 21,
    paddingHorizontal: 20,
  },
  plateOuter: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 3,
    borderColor: "#0A2540",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 6,
    aspectRatio: 2,
    justifyContent: "center",
  },
  plateOuterFocused: {
    borderColor: designTokens.color.primary,
    shadowOpacity: 0.25,
  },
  plateInner: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#0A2540",
    borderStyle: "dashed",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  plateState: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#0A2540",
    letterSpacing: 4,
    textTransform: "uppercase" as const,
    marginBottom: 2,
  },
  plateMainRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 8,
  },
  plateStickerYear: {
    backgroundColor: "#F4B400",
    borderRadius: 6,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0A2540",
  },
  plateStickerYearText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#0A2540",
  },
  plateStickerMonth: {
    backgroundColor: "#E63946",
    borderRadius: 6,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#0A2540",
  },
  plateStickerMonthText: {
    fontSize: 16,
    fontWeight: "900" as const,
    color: "#FFFFFF",
  },
  plateTextInput: {
    flex: 1,
    fontSize: 42,
    fontWeight: "900" as const,
    color: "#0A2540",
    letterSpacing: 4,
    textAlign: "center" as const,
    paddingVertical: Platform.OS === "ios" ? 6 : 0,
    textShadowColor: "rgba(10, 37, 64, 0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  plateMotto: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: "#0A2540",
    letterSpacing: 2,
    textTransform: "uppercase" as const,
    marginTop: 2,
    opacity: 0.75,
  },
  plateBoltTL: {
    position: "absolute",
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0A2540",
    opacity: 0.55,
  },
  plateBoltTR: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0A2540",
    opacity: 0.55,
  },
  plateBoltBL: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0A2540",
    opacity: 0.55,
  },
  plateBoltBR: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#0A2540",
    opacity: 0.55,
  },
  clearButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: designTokens.color.text,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  clearText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  sendButton: {
    borderRadius: designTokens.radius.lg,
    overflow: "hidden",
    marginBottom: 28,
  },
  helperText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#F26530",
    marginTop: -6,
    marginBottom: 10,
    marginLeft: 4,
  },
  sendButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: designTokens.radius.lg,
    gap: 10,
  },
  sendButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.color.border,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.textMuted,
    paddingHorizontal: 14,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  templatesGrid: {
    gap: 8,
    marginBottom: 28,
  },
  templateCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  templateIcon: {
    marginRight: 14,
  },
  templateLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600" as const,
    color: designTokens.color.text,
  },
  yourPlateSection: {
    marginBottom: 16,
  },
  yourPlateLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  yourPlateCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.md,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  yourPlateBadge: {
    backgroundColor: designTokens.color.text,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  yourPlateText: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: designTokens.color.bg,
    letterSpacing: 1.5,
  },
  yourPlateHint: {
    flex: 1,
    fontSize: 13,
    color: designTokens.color.textMuted,
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 24,
  },
});
