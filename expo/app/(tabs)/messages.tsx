import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Animated,
} from "react-native";
import { MessageCircle, Send, ChevronRight, Plus, Inbox } from "lucide-react-native";
import { router } from "expo-router";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { Message } from "@/types";

type FilterType = "all" | "received" | "sent";

export default function MessagesScreen() {
  const { messages, userProfile, primaryVehicle, markMessageAsRead } = useAppStore();
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const userPlates = useMemo(
    () => userProfile?.vehicles?.map((v) => v.licensePlate) || [],
    [userProfile?.vehicles]
  );

  const sortedMessages = useMemo(() => {
    const sorted = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (activeFilter === "received") {
      return sorted.filter((m) => !userPlates.includes(m.fromPlate));
    }
    if (activeFilter === "sent") {
      return sorted.filter((m) => userPlates.includes(m.fromPlate));
    }
    return sorted;
  }, [messages, activeFilter, userPlates]);

  const handleMessagePress = useCallback(
    async (message: Message) => {
      if (!message.isRead && primaryVehicle && message.toPlate === primaryVehicle.licensePlate) {
        await markMessageAsRead(message.id);
      }
      router.push({
        pathname: "/message-detail",
        params: { messageId: message.id },
      });
    },
    [primaryVehicle, markMessageAsRead]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isSent = userPlates.includes(item.fromPlate);
      const isUnread = !item.isRead && !isSent;

      return (
        <TouchableOpacity
          style={styles.messageCard}
          onPress={() => handleMessagePress(item)}
          activeOpacity={0.55}
          testID={`message-${item.id}`}
        >
          <View style={[styles.avatarCircle, isSent ? styles.avatarSent : styles.avatarReceived]}>
            {isSent ? (
              <Send size={15} color={designTokens.color.primary} strokeWidth={2.2} />
            ) : (
              <MessageCircle size={15} color={designTokens.color.success} strokeWidth={2.2} />
            )}
          </View>

          <View style={styles.messageBody}>
            <View style={styles.messageTopRow}>
              <Text style={[styles.plateName, isUnread && styles.plateNameUnread]} numberOfLines={1}>
                {isSent ? item.toPlate : item.fromPlate}
              </Text>
              <Text style={styles.timeText}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={[styles.preview, isUnread && styles.previewUnread]} numberOfLines={2}>
              {isSent ? "You: " : ""}
              {item.content}
            </Text>
          </View>

          <View style={styles.messageRight}>
            {isUnread && <View style={styles.unreadDot} />}
            <ChevronRight size={14} color={designTokens.color.textLight} />
          </View>
        </TouchableOpacity>
      );
    },
    [userPlates, handleMessagePress]
  );

  const keyExtractor = useCallback((item: Message) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity
          style={styles.newButton}
          onPress={() => router.push("/(tabs)/dashboard" as any)}
          testID="compose-message"
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </Animated.View>

      <View style={styles.filterRow}>
        {(["all", "received", "sent"] as FilterType[]).map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => setActiveFilter(filter)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}
            >
              {filter === "all" ? "All" : filter === "received" ? "Received" : "Sent"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sortedMessages}
        renderItem={renderMessage}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrap}>
              <Inbox size={26} color={designTokens.color.primary} strokeWidth={1.8} />
            </View>
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              When you send or receive a message,{'\n'}it will show up here
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => router.push("/(tabs)/dashboard" as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.emptyActionText}>Send your first message</Text>
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={designTokens.color.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
}

function formatTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.bg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.6,
  },
  newButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: designTokens.color.primary,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: designTokens.radius.full,
    backgroundColor: designTokens.color.surface,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
  },
  filterChipActive: {
    backgroundColor: designTokens.color.text,
    borderColor: designTokens.color.text,
  },
  filterText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: designTokens.color.textMuted,
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 110,
    flexGrow: 1,
  },
  messageCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  avatarSent: {
    backgroundColor: designTokens.color.primaryLight,
  },
  avatarReceived: {
    backgroundColor: designTokens.color.successSoft,
  },
  messageBody: {
    flex: 1,
    marginRight: 8,
  },
  messageTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  plateName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    letterSpacing: 0.5,
  },
  plateNameUnread: {
    fontWeight: "700" as const,
    color: designTokens.color.text,
  },
  timeText: {
    fontSize: 13,
    color: designTokens.color.textLight,
    fontWeight: "500" as const,
  },
  preview: {
    fontSize: 14,
    color: designTokens.color.textMuted,
    lineHeight: 20,
  },
  previewUnread: {
    color: designTokens.color.text,
    fontWeight: "500" as const,
  },
  messageRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.primary,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: designTokens.color.borderMuted,
    marginLeft: 60,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: designTokens.color.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  emptyText: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    textAlign: "center" as const,
    lineHeight: 22,
    marginBottom: 28,
  },
  emptyAction: {
    backgroundColor: designTokens.color.text,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 28,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyActionText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    letterSpacing: 0.1,
  },
});
