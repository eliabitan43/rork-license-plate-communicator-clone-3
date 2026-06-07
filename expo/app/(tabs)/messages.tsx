import React, { useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import {
  MessageCircle,
  Send,
  Edit,
  CheckCheck,
  Check,
} from "lucide-react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { Message } from "@/types";

type Filter = "all" | "received" | "sent" | "unread";

const TAG_META: Record<string, { label: string; bg: string; color: string }> = {
  compliment: { label: "Compliment", bg: "#E6FAF5", color: "#0A6E55" },
  blocking: { label: "Urgent", bg: "#FFF0F0", color: "#B22222" },
  safety: { label: "Safety", bg: "#FFF0F0", color: "#B22222" },
  child_pet_alert: { label: "Critical", bg: "#FFF0F0", color: "#B22222" },
  tow_warning: { label: "Tow alert", bg: "#FFF0F0", color: "#B22222" },
  hazard: { label: "Hazard", bg: "#FFF7E6", color: "#7A4F00" },
  parking_alert: { label: "Parking", bg: "#FFF7E6", color: "#7A4F00" },
  report_driver: { label: "Road alert", bg: "#FFF7E6", color: "#7A4F00" },
  flat_tire: { label: "Tyre", bg: "#EDF4FF", color: "#154DA8" },
  lights_on: { label: "Lights on", bg: "#FFF7E6", color: "#7A4F00" },
  general: { label: "Message", bg: "#EDF4FF", color: "#154DA8" },
};

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface RowProps {
  msg: Message;
  isSent: boolean;
  isMine: boolean;
  onPress: () => void;
}

function MessageRow({ msg, isSent, isMine, onPress }: RowProps) {
  const isUnread = !msg.isRead && !isSent;
  const meta = TAG_META[msg.type] ?? TAG_META.general;

  return (
    <TouchableOpacity
      style={[styles.row, isUnread && styles.rowUnread, isMine && styles.rowMine]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.rowIcon,
          isSent ? styles.rowIconSent : styles.rowIconRecv,
        ]}
      >
        {isSent ? (
          <Send size={15} color={designTokens.color.primary} strokeWidth={2.2} />
        ) : (
          <MessageCircle size={15} color="#0A6E55" strokeWidth={2.2} />
        )}
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <View style={styles.plateChip}>
            <Text style={styles.plateChipText}>
              {isSent ? msg.toPlate : msg.fromPlate || "Anonymous"}
            </Text>
          </View>
          <View style={[styles.tag, { backgroundColor: meta.bg }]}>
            <Text style={[styles.tagText, { color: meta.color }]}>
              {meta.label}
            </Text>
          </View>
          <Text style={styles.rowTime}>{formatTime(msg.timestamp)}</Text>
        </View>

        <Text
          style={[styles.rowPreview, isUnread && styles.rowPreviewBold]}
          numberOfLines={2}
        >
          {isSent ? "You: " : ""}
          {msg.content}
        </Text>

        {isSent && (
          <View style={styles.deliveryRow}>
            {msg.isRead ? (
              <>
                <CheckCheck
                  size={12}
                  color={designTokens.color.primary}
                  strokeWidth={2}
                />
                <Text
                  style={[
                    styles.deliveryText,
                    { color: designTokens.color.primary },
                  ]}
                >
                  Read
                </Text>
              </>
            ) : (
              <>
                <Check
                  size={12}
                  color={designTokens.color.textMuted}
                  strokeWidth={2}
                />
                <Text style={styles.deliveryText}>Delivered</Text>
              </>
            )}
          </View>
        )}
      </View>

      {isUnread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function MessagesScreen() {
  const { messages, userProfile, primaryVehicle, markMessageAsRead } =
    useAppStore();
  const [filter, setFilter] = useState<Filter>("all");

  const userPlates = useMemo(
    () => userProfile?.vehicles?.map((v) => v.licensePlate) ?? [],
    [userProfile]
  );

  const filtered = useMemo(() => {
    const sorted = [...messages].sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === "sent")
      return sorted.filter((m) => userPlates.includes(m.fromPlate));
    if (filter === "received")
      return sorted.filter((m) => !userPlates.includes(m.fromPlate));
    if (filter === "unread")
      return sorted.filter(
        (m) => !m.isRead && !userPlates.includes(m.fromPlate)
      );
    return sorted;
  }, [messages, filter, userPlates]);

  const handlePress = useCallback(
    async (msg: Message) => {
      Haptics.selectionAsync();
      if (
        !msg.isRead &&
        primaryVehicle &&
        msg.toPlate === primaryVehicle.licensePlate
      ) {
        await markMessageAsRead(msg.id);
      }
      router.push({
        pathname: "/message-detail",
        params: { messageId: msg.id },
      });
    },
    [primaryVehicle, markMessageAsRead]
  );

  const FILTERS: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "received", label: "Received" },
    { id: "sent", label: "Sent" },
    { id: "unread", label: "Unread" },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => router.push("/send-message")}
          accessibilityLabel="Compose new message"
        >
          <Edit size={16} color={designTokens.color.primary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterTab, filter === f.id && styles.filterTabOn]}
            onPress={() => {
              Haptics.selectionAsync();
              setFilter(f.id);
            }}
          >
            <Text
              style={[
                styles.filterText,
                filter === f.id && styles.filterTextOn,
              ]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => {
          const isSent = userPlates.includes(item.fromPlate);
          const isMine = userPlates.some(
            (p) => item.toPlate === p && !isSent
          );
          return (
            <MessageRow
              msg={item}
              isSent={isSent}
              isMine={isMine}
              onPress={() => handlePress(item)}
            />
          );
        }}
        ItemSeparatorComponent={() => (
          <View
            style={{
              height: 0.5,
              backgroundColor: designTokens.color.border,
              marginLeft: 68,
            }}
          />
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <MessageCircle
              size={36}
              color={designTokens.color.border}
              strokeWidth={1.5}
            />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyBody}>
              Send the first message to a nearby driver.
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push("/send-message")}
            >
              <Text style={styles.emptyBtnText}>Send a message</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: designTokens.color.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.7,
  },
  composeBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: designTokens.color.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },

  filters: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  filterTabOn: {
    backgroundColor: designTokens.color.primary,
    borderColor: designTokens.color.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: designTokens.color.textMuted,
  },
  filterTextOn: { color: "#fff" },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingHorizontal: 20,
    paddingVertical: 13,
    backgroundColor: designTokens.color.bg,
  },
  rowUnread: { backgroundColor: designTokens.color.primaryLight },
  rowMine: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.primary,
    paddingLeft: 17,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowIconSent: { backgroundColor: designTokens.color.primaryLight },
  rowIconRecv: { backgroundColor: "#E6FAF5" },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  plateChip: {
    backgroundColor: "#FFE234",
    borderRadius: 5,
    paddingHorizontal: 7,
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
  tag: { borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: "600" as const },
  rowTime: {
    fontSize: 11,
    color: designTokens.color.textMuted,
    marginLeft: "auto",
  },
  rowPreview: {
    fontSize: 13,
    color: designTokens.color.textMuted,
    lineHeight: 18,
  },
  rowPreviewBold: {
    color: designTokens.color.text,
    fontWeight: "500" as const,
  },
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  deliveryText: {
    fontSize: 10,
    fontWeight: "500" as const,
    color: designTokens.color.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.primary,
    flexShrink: 0,
  },

  empty: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    marginTop: 4,
  },
  emptyBody: {
    fontSize: 14,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    backgroundColor: designTokens.color.primary,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700" as const, color: "#fff" },
});
