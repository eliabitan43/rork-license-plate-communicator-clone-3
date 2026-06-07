import React, { useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Switch,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Send, X, Flame } from "lucide-react-native";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import {
  QUICK_ACTIONS,
  QUICK_ACTIONS_BY_INTENT,
  QuickActionItem,
} from "@/constants/quickActions";
import { MessageType } from "@/types";
import { useToast } from "@/hooks/useToast";

const MAX_CHARS = 160;

type Intent = "critical" | "car" | "road" | "community";

const INTENT_META: Record<Intent, { label: string; icon: string; color: string }> = {
  critical: { label: "Critical — act now", icon: "🚨", color: "#FF2D2D" },
  car: { label: "Your car needs attention", icon: "🚗", color: "#F5A623" },
  road: { label: "Road & driving", icon: "🛣️", color: designTokens.color.primary },
  community: {
    label: "Community & kindness",
    icon: "❤️",
    color: "#2ED3B7",
  },
};

const INTENTS: Intent[] = ["critical", "car", "road", "community"];

function normalizePlate(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

export default function SendMessageScreen() {
  const params = useLocalSearchParams<{
    plate?: string;
    type?: string;
    message?: string;
  }>();
  const { userProfile, primaryVehicle, sendMessage } = useAppStore();
  const { showToast } = useToast();

  const defaultAction =
    QUICK_ACTIONS.find((a) => a.type === (params.type as MessageType)) ??
    QUICK_ACTIONS_BY_INTENT.car[0];

  const [plate, setPlate] = useState(params.plate ?? "");
  const [selected, setSelected] = useState<QuickActionItem>(defaultAction);
  const [body, setBody] = useState(
    params.message ?? defaultAction.prefilledMessage
  );
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const plateRef = useRef<TextInput>(null);

  const charsLeft = MAX_CHARS - body.length;
  const canSend =
    plate.length >= 2 && body.length > 0 && body.length <= MAX_CHARS;

  const selectAction = useCallback((action: QuickActionItem) => {
    Haptics.selectionAsync();
    setSelected(action);
    setBody(action.prefilledMessage);
  }, []);

  const handleSend = useCallback(async () => {
    if (!canSend) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const fromPlate = anonymous
        ? "Anonymous"
        : primaryVehicle?.licensePlate ?? "Anonymous";
      const msg = {
        id: Date.now().toString(),
        fromPlate,
        toPlate: plate,
        content: body,
        type: selected.type,
        isAnonymous: anonymous,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      await sendMessage(msg);
      showToast("Message sent!", "success", 2000);
      router.back();
    } catch {
      showToast("Failed to send — please try again", "error", 3000);
    } finally {
      setSending(false);
    }
  }, [
    canSend,
    plate,
    body,
    selected,
    anonymous,
    primaryVehicle,
    sendMessage,
    showToast,
  ]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <ArrowLeft
              size={18}
              color={designTokens.color.textMuted}
              strokeWidth={2}
            />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Send message</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* To plate */}
          <View style={styles.toCard}>
            <Text style={styles.fieldLabel}>To plate</Text>
            <View style={styles.plateRow}>
              <View style={styles.plateInputWrap}>
                <Text style={styles.flagEmoji}>🇮🇱</Text>
                <TextInput
                  ref={plateRef}
                  style={styles.plateInput}
                  value={plate}
                  onChangeText={(v) => setPlate(normalizePlate(v))}
                  placeholder="ABC · 1234"
                  placeholderTextColor="rgba(26,22,0,0.28)"
                  autoCapitalize="characters"
                  maxLength={10}
                  returnKeyType="next"
                  accessibilityLabel="Plate number"
                />
              </View>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => {
                  setPlate("");
                  plateRef.current?.focus();
                }}
                accessibilityLabel="Clear plate"
              >
                <X
                  size={15}
                  color={designTokens.color.textMuted}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Action grid by category */}
          {INTENTS.map((intent) => {
            const meta = INTENT_META[intent];
            const actions = QUICK_ACTIONS_BY_INTENT[intent];
            return (
              <View key={intent}>
                <View style={styles.catHeader}>
                  <Text style={styles.catEmoji}>{meta.icon}</Text>
                  <Text style={[styles.catLabel, { color: meta.color }]}>
                    {meta.label}
                  </Text>
                </View>
                {intent === "critical" && (
                  <View style={styles.criticalBanner}>
                    <Flame size={14} color="#B22222" strokeWidth={2} />
                    <Text style={styles.criticalText}>
                      These messages are delivered via SMS immediately — even
                      if the recipient doesn't have HOMI yet.
                    </Text>
                  </View>
                )}
                <View style={styles.actionGrid}>
                  {actions.map((action) => {
                    const isSel = action.id === selected.id;
                    return (
                      <TouchableOpacity
                        key={action.id}
                        style={[
                          styles.actionItem,
                          isSel && styles.actionItemSel,
                        ]}
                        onPress={() => selectAction(action)}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.actionIcon,
                            { backgroundColor: action.tint + "18" },
                          ]}
                        >
                          <Text style={styles.actionEmoji}>{action.emoji}</Text>
                        </View>
                        <View style={styles.actionBody}>
                          <Text
                            style={[
                              styles.actionLabel,
                              isSel && styles.actionLabelSel,
                            ]}
                            numberOfLines={2}
                          >
                            {action.label}
                          </Text>
                          {action.isNew && (
                            <Text style={styles.newTag}>New</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Message composer */}
          <View style={styles.composeSection}>
            <View style={styles.composeHeader}>
              <Text style={styles.fieldLabel}>Your message</Text>
              <Text
                style={[
                  styles.charCount,
                  charsLeft < 30 && { color: "#F5A623" },
                  charsLeft < 0 && { color: "#FF2D2D" },
                ]}
              >
                {body.length} / {MAX_CHARS}
              </Text>
            </View>
            <TextInput
              style={styles.composeInput}
              value={body}
              onChangeText={setBody}
              placeholder="Write your message…"
              placeholderTextColor={designTokens.color.textLight}
              multiline
              numberOfLines={4}
              maxLength={MAX_CHARS + 20}
              textAlignVertical="top"
              accessibilityLabel="Message body"
            />
          </View>

          {/* Anonymous toggle */}
          <View style={styles.anonRow}>
            <View style={styles.anonInfo}>
              <Text style={styles.anonTitle}>
                {anonymous ? "Anonymous mode" : "Identified mode"}
              </Text>
              <Text style={styles.anonSub}>
                {anonymous
                  ? "Your plate won't be shown"
                  : `Recipient sees ${primaryVehicle?.licensePlate ?? "your plate"}`}
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={(v) => {
                Haptics.selectionAsync();
                setAnonymous(v);
              }}
              trackColor={{
                true: designTokens.color.primary,
                false: designTokens.color.border,
              }}
              thumbColor="#fff"
            />
          </View>

          {/* Send button */}
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend || sending}
          >
            <Send size={17} color="#fff" strokeWidth={2.2} />
            <Text style={styles.sendBtnText}>
              {sending
                ? "Sending…"
                : anonymous
                  ? "Send anonymously"
                  : `Send as ${primaryVehicle?.licensePlate ?? "me"}`}
            </Text>
          </TouchableOpacity>

          <Text style={styles.sendNote}>
            The recipient gets an SMS notification with a link to read your
            message in HOMI.
          </Text>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: designTokens.color.bg },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: designTokens.color.surface,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.3,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4 },

  toCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 16,
    padding: 13,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: designTokens.color.textMuted,
    letterSpacing: 0.7,
    textTransform: "uppercase" as const,
    marginBottom: 7,
  },
  plateRow: { flexDirection: "row", gap: 8 },
  plateInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFE234",
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 0.5,
    borderColor: "#D4B800",
  },
  flagEmoji: { fontSize: 16 },
  plateInput: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#1A1600",
    letterSpacing: 3,
    padding: 0,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 9,
    backgroundColor: designTokens.color.bg,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },

  catHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  catEmoji: { fontSize: 14 },
  catLabel: {
    fontSize: 11,
    fontWeight: "700" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  criticalBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#FECACA",
  },
  criticalText: {
    flex: 1,
    fontSize: 11,
    color: "#B22222",
    lineHeight: 16,
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginBottom: 8,
  },
  actionItem: {
    width: "47.5%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: designTokens.color.surface,
    borderRadius: 12,
    padding: 10,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  actionItemSel: {
    borderWidth: 2,
    borderColor: designTokens.color.primary,
    backgroundColor: designTokens.color.primaryLight,
  },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionEmoji: { fontSize: 18 },
  actionBody: { flex: 1 },
  actionLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    lineHeight: 16,
  },
  actionLabelSel: { color: designTokens.color.primary },
  newTag: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: designTokens.color.primary,
    marginTop: 2,
  },

  composeSection: { marginTop: 4, marginBottom: 12 },
  composeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  charCount: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: designTokens.color.textMuted,
  },
  composeInput: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    padding: 13,
    fontSize: 14,
    color: designTokens.color.text,
    lineHeight: 21,
    minHeight: 100,
  },

  anonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    padding: 13,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    marginBottom: 13,
  },
  anonInfo: { flex: 1 },
  anonTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    marginBottom: 2,
  },
  anonSub: { fontSize: 11, color: designTokens.color.textMuted },

  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: designTokens.color.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 10,
  },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { fontSize: 15, fontWeight: "700" as const, color: "#fff" },
  sendNote: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
    lineHeight: 17,
  },
});
