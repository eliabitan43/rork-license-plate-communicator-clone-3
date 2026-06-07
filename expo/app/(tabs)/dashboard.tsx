import React, { useState, useRef, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Keyboard,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import {
  Send,
  Camera,
  MapPin,
  ChevronRight,
  X,
  Check,
  Gift,
  Zap,
} from "lucide-react-native";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { QUICK_ACTIONS, QUICK_ACTIONS_BY_INTENT } from "@/constants/quickActions";
import { Message } from "@/types";

const MAX_PLATE = 10;

function normalizePlate(v: string) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_PLATE);
}

function timeAgo(ts: string) {
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TAG_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  compliment: { bg: "#E6FAF5", text: "#0A6E55", label: "Compliment" },
  blocking: { bg: "#FFF0F0", text: "#B22222", label: "Urgent" },
  parking_alert: { bg: "#FFF7E6", text: "#7A4F00", label: "Parking" },
  safety: { bg: "#FFF0F0", text: "#B22222", label: "Safety alert" },
  child_pet_alert: { bg: "#FFF0F0", text: "#B22222", label: "Critical" },
  hazard: { bg: "#FFF7E6", text: "#7A4F00", label: "Hazard" },
  general: { bg: "#EDF4FF", text: "#154DA8", label: "Message" },
};

function MessageTag({ type }: { type: string }) {
  const s = TAG_STYLES[type] ?? TAG_STYLES.general;
  return (
    <View style={[styles.tag, { backgroundColor: s.bg }]}>
      <Text style={[styles.tagText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function FeedCard({ msg, userPlates }: { msg: Message; userPlates: string[] }) {
  const isMine = userPlates.some(
    (p) => msg.toPlate === p && msg.fromPlate !== p
  );
  const [confirmed, setConfirmed] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.feedCard, isMine && styles.feedCardHighlight]}
      onPress={() => {
        Haptics.selectionAsync();
        router.push({ pathname: "/message-detail", params: { messageId: msg.id } });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.feedCardTop}>
        <View style={styles.plateChip}>
          <Text style={styles.plateChipText}>
            {msg.fromPlate || "Anonymous"}
          </Text>
        </View>
        <MessageTag type={msg.type} />
        <Text style={styles.feedTime}>{timeAgo(msg.timestamp)}</Text>
        {!msg.isRead && isMine && <View style={styles.unreadDot} />}
      </View>
      <Text style={styles.feedBody} numberOfLines={2}>
        {msg.content}
      </Text>
      <View style={styles.reactRow}>
        <TouchableOpacity
          style={[styles.reactBtn, confirmed && styles.reactBtnOn]}
          onPress={(e) => {
            e.stopPropagation?.();
            Haptics.selectionAsync();
            setConfirmed(!confirmed);
          }}
        >
          <Text style={confirmed ? styles.reactTextOn : styles.reactText}>
            {confirmed ? "✓ Confirmed" : "Confirm"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.reactBtn}
          onPress={() =>
            router.push({
              pathname: "/send-message",
              params: { plate: msg.fromPlate },
            })
          }
        >
          <Text style={styles.reactText}>Reply</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { userProfile, messages, primaryVehicle } = useAppStore();
  const [plate, setPlate] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const inputRef = useRef<TextInput>(null);
  const scrollRef = useRef<ScrollView>(null);

  const userPlates = useMemo(
    () => userProfile?.vehicles?.map((v) => v.licensePlate) ?? [],
    [userProfile]
  );

  const recentMessages = useMemo(
    () =>
      [...messages]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )
        .slice(0, 4),
    [messages]
  );

  const recentPlates = useMemo(() => {
    const seen = new Set<string>();
    return messages
      .filter((m) => m.fromPlate && userPlates.includes(m.fromPlate))
      .map((m) => m.toPlate)
      .filter((p) => {
        if (seen.has(p)) return false;
        seen.add(p);
        return true;
      })
      .slice(0, 4);
  }, [messages, userPlates]);

  const handleSend = useCallback(() => {
    if (plate.length < 2) {
      inputRef.current?.focus();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    router.push({ pathname: "/send-message", params: { plate } });
  }, [plate]);

  const handleQuickAction = useCallback(
    (actionId: string) => {
      Haptics.selectionAsync();
      if (!plate || plate.length < 2) {
        inputRef.current?.focus();
        return;
      }
      const action = QUICK_ACTIONS.find((a) => a.id === actionId);
      if (!action) return;
      router.push({
        pathname: "/send-message",
        params: {
          plate,
          type: action.type,
          message: action.prefilledMessage,
        },
      });
    },
    [plate]
  );

  const justRegistered =
    showBanner &&
    userProfile &&
    !userProfile.isAnonymous &&
    primaryVehicle;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>
              Good morning
              {userProfile?.displayName
                ? `, ${userProfile.displayName.split(" ")[0]}`
                : ""}
            </Text>
            <Text style={styles.brandName}>HOMI</Text>
          </View>
          <View style={styles.headerRight}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Tel Aviv</Text>
            </View>
            <TouchableOpacity
              style={styles.avatar}
              onPress={() => router.push("/(tabs)/profile")}
            >
              <Text style={styles.avatarText}>
                {userProfile?.displayName?.slice(0, 2).toUpperCase() ?? "YA"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Welcome banner (post-onboarding only) ── */}
        {justRegistered && (
          <View style={styles.banner}>
            <Check size={18} color="#0A6E55" strokeWidth={2.5} />
            <View style={styles.bannerBody}>
              <Text style={styles.bannerTitle}>You're registered!</Text>
              <Text style={styles.bannerSub}>
                Plate{" "}
                <Text style={styles.bannerPlate}>
                  {primaryVehicle.licensePlate}
                </Text>{" "}
                is live — drivers can now reach you.
              </Text>
            </View>
            <TouchableOpacity onPress={() => setShowBanner(false)}>
              <X size={16} color="#0A6E55" strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── Send hero ── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>Send a message to</Text>
          <View style={styles.plateRow}>
            <View style={styles.plateInputWrap}>
              <Text style={styles.flagEmoji}>🇮🇱</Text>
              <TextInput
                ref={inputRef}
                style={styles.plateInput}
                value={plate}
                onChangeText={(v) => setPlate(normalizePlate(v))}
                placeholder="ABC · 1234"
                placeholderTextColor="rgba(26,22,0,0.3)"
                autoCapitalize="characters"
                maxLength={MAX_PLATE}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                accessibilityLabel="Plate number input"
              />
            </View>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/scan")}
              accessibilityLabel="Scan plate"
            >
              <Camera size={20} color={designTokens.color.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          <View style={styles.sendRow}>
            <TouchableOpacity
              style={[styles.sendBtn, plate.length < 2 && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={plate.length < 2}
            >
              <Send size={16} color="#fff" strokeWidth={2.2} />
              <Text style={styles.sendBtnText}>Send message</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/map-live")}
              accessibilityLabel="Nearby drivers"
            >
              <MapPin size={20} color={designTokens.color.textMuted} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {recentPlates.length > 0 && (
            <View style={styles.recentSection}>
              <Text style={styles.recentLabel}>Recent</Text>
              <View style={styles.recentChips}>
                {recentPlates.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={styles.recentChip}
                    onPress={() => {
                      setPlate(p);
                      Haptics.selectionAsync();
                    }}
                  >
                    <Text style={styles.recentChipText}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* ── Quick actions (top 4 shown, link to all) ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <TouchableOpacity onPress={() => router.push("/send-message")}>
            <Text style={styles.sectionLink}>All 19 →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.qaGrid}>
          {[
            QUICK_ACTIONS_BY_INTENT.critical[3], // being towed
            QUICK_ACTIONS_BY_INTENT.car[0], // blocking
            QUICK_ACTIONS_BY_INTENT.car[1], // lights on
            QUICK_ACTIONS_BY_INTENT.community[0], // thank you for merging
          ].map((action) => (
            <TouchableOpacity
              key={action.id}
              style={styles.qaItem}
              onPress={() => handleQuickAction(action.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.qaIcon,
                  { backgroundColor: action.tint + "18" },
                ]}
              >
                <Text style={styles.qaEmoji}>{action.emoji}</Text>
              </View>
              <View style={styles.qaBody}>
                <Text style={styles.qaTitle} numberOfLines={1}>
                  {action.label}
                </Text>
                {action.isNew && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Map strip ── */}
        <TouchableOpacity
          style={styles.mapStrip}
          onPress={() => router.push("/map-live")}
          activeOpacity={0.85}
        >
          <View style={styles.mapStripLeft}>
            <Text style={styles.mapStripTitle}>Tel Aviv · live map</Text>
            <Text style={styles.mapStripSub}>
              17 drivers nearby · 2 active alerts
            </Text>
          </View>
          <View style={styles.mapStripRight}>
            <Text style={styles.mapStripLink}>Open</Text>
            <ChevronRight
              size={14}
              color={designTokens.color.primary}
              strokeWidth={2.2}
            />
          </View>
        </TouchableOpacity>

        {/* ── Neighborhood feed ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Neighborhood feed</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/messages")}>
            <Text style={styles.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>
        {recentMessages.length === 0 ? (
          <View style={styles.emptyFeed}>
            <Zap size={28} color={designTokens.color.border} strokeWidth={1.5} />
            <Text style={styles.emptyText}>
              No messages yet — send the first one!
            </Text>
          </View>
        ) : (
          recentMessages.map((m) => (
            <FeedCard key={m.id} msg={m} userPlates={userPlates} />
          ))
        )}

        {/* ── Referral card ── */}
        <TouchableOpacity
          style={styles.referralCard}
          onPress={() => router.push("/referral")}
          activeOpacity={0.8}
        >
          <View style={styles.referralIcon}>
            <Gift size={18} color={designTokens.color.primary} strokeWidth={2} />
          </View>
          <View style={styles.referralBody}>
            <Text style={styles.referralTitle}>
              Invite friends, get HOMI+ free
            </Text>
            <Text style={styles.referralSub}>
              Invite 3 → 1 month Pro free
            </Text>
          </View>
          <ChevronRight
            size={16}
            color={designTokens.color.textMuted}
            strokeWidth={2}
          />
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: designTokens.color.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  greeting: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginBottom: 1,
  },
  brandName: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.8,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#E6FAF5",
    borderRadius: 20,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0A6E55",
  },
  liveText: { fontSize: 11, fontWeight: "600" as const, color: "#0A6E55" },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: designTokens.color.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: designTokens.color.primary,
  },

  // Banner
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: "#E6FAF5",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#9FE1CB",
  },
  bannerBody: { flex: 1 },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: "#0A6E55",
    marginBottom: 2,
  },
  bannerSub: { fontSize: 11, color: "#0A6E55", opacity: 0.8 },
  bannerPlate: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    letterSpacing: 1,
  },

  // Hero send card
  heroCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: designTokens.color.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    overflow: "hidden",
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: designTokens.color.textMuted,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  plateRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 10,
  },
  plateInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFE234",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 0.5,
    borderColor: "#D4B800",
  },
  flagEmoji: { fontSize: 18 },
  plateInput: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#1A1600",
    letterSpacing: 3,
    padding: 0,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: designTokens.color.bg,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  sendRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 14,
    marginBottom: 0,
  },
  sendBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: designTokens.color.primary,
    borderRadius: 10,
    paddingVertical: 12,
  },
  sendBtnDisabled: { opacity: 0.38 },
  sendBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
  recentSection: {
    borderTopWidth: 0.5,
    borderTopColor: designTokens.color.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  recentLabel: {
    fontSize: 10,
    fontWeight: "700" as const,
    color: designTokens.color.textMuted,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
    marginBottom: 7,
  },
  recentChips: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  recentChip: {
    backgroundColor: "#FFE234",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 0.5,
    borderColor: "#D4B800",
  },
  recentChipText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#1A1600",
    letterSpacing: 1.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 9,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: designTokens.color.textMuted,
    letterSpacing: 0.7,
    textTransform: "uppercase" as const,
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.primary,
  },

  // Quick actions
  qaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
  },
  qaItem: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  qaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  qaEmoji: { fontSize: 18 },
  qaBody: { flex: 1 },
  qaTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    marginBottom: 2,
  },
  newBadge: {
    alignSelf: "flex-start",
    backgroundColor: designTokens.color.primaryLight,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: "700" as const,
    color: designTokens.color.primary,
  },

  // Map strip
  mapStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginTop: 14,
    padding: 14,
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  mapStripLeft: {},
  mapStripTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    marginBottom: 2,
  },
  mapStripSub: { fontSize: 12, color: designTokens.color.textMuted },
  mapStripRight: { flexDirection: "row", alignItems: "center", gap: 2 },
  mapStripLink: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.primary,
  },

  // Feed
  feedCard: {
    marginHorizontal: 20,
    marginBottom: 8,
    padding: 14,
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  feedCardHighlight: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.primary,
    borderRadius: 14,
  },
  feedCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 7,
  },
  plateChip: {
    backgroundColor: "#FFE234",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 0.5,
    borderColor: "#D4B800",
  },
  plateChipText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#1A1600",
    letterSpacing: 1.5,
  },
  tag: {
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagText: { fontSize: 11, fontWeight: "600" as const },
  feedTime: {
    fontSize: 11,
    color: designTokens.color.textMuted,
    marginLeft: "auto",
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: designTokens.color.primary,
  },
  feedBody: {
    fontSize: 13,
    color: designTokens.color.text,
    lineHeight: 19,
    marginBottom: 9,
  },
  reactRow: { flexDirection: "row", gap: 7 },
  reactBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: designTokens.color.bg,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  reactBtnOn: {
    backgroundColor: designTokens.color.primaryLight,
    borderColor: designTokens.color.primarySoft,
  },
  reactText: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: designTokens.color.textMuted,
  },
  reactTextOn: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: designTokens.color.primary,
  },

  emptyFeed: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
  },

  // Referral
  referralCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    marginTop: 8,
    padding: 14,
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  referralIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: designTokens.color.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  referralBody: { flex: 1 },
  referralTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    marginBottom: 1,
  },
  referralSub: { fontSize: 11, color: designTokens.color.textMuted },
});
