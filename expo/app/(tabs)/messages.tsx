import React, { useCallback, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  AlertCircle,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  SmartphoneNfc,
} from 'lucide-react-native';
import { designTokens } from '@/constants/theme';
import { enterUp, springs, usePulse } from '@/lib/motion';
import { PressableScale } from '@/components/PressableScale';
import { SkeletonCard } from '@/components/Skeleton';
import { useAppStore } from '@/hooks/useAppStore';
import { Message } from '@/types';

type Filter = 'all' | 'received' | 'sent' | 'unread';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'received', label: 'Received' },
  { id: 'sent', label: 'Sent' },
  { id: 'unread', label: 'Unread' },
];

const TAB_BAR_CLEARANCE = 120;

function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

function formatRelativeTime(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function DeliveryIcon({ message }: { message: Message }) {
  const state = message.deliveryState ?? 'delivered';
  const muted = designTokens.color.textLight;
  switch (state) {
    case 'sending':
      return <Clock size={14} color={muted} />;
    case 'read':
      return <CheckCheck size={15} color={designTokens.color.primary} />;
    case 'not_downloaded':
      return <SmartphoneNfc size={14} color={muted} />;
    case 'failed':
      return <AlertCircle size={14} color={designTokens.color.error} />;
    case 'delivered':
    default:
      return <Check size={15} color={muted} />;
  }
}

interface MessageRowProps {
  message: Message;
  isReceived: boolean;
  onPress: (message: Message) => void;
}

function UnreadDot() {
  const { animatedStyle } = usePulse(true);
  return <Animated.View style={[styles.unreadDot, animatedStyle]} />;
}

function MessageRow({ message, isReceived, onPress }: MessageRowProps) {
  const unread = isReceived && !message.isRead;
  return (
    <PressableScale
      onPress={() => onPress(message)}
      accessibilityRole="button"
      accessibilityLabel={`${isReceived ? 'Received' : 'Sent'} message ${
        unread ? ', unread' : ''
      }: ${message.content}`}
      style={[
        styles.row,
        isReceived && styles.rowMine,
        unread && styles.rowUnread,
      ]}
      testID={`message-row-${message.id}`}
    >
      <View style={styles.rowTop}>
        <View style={styles.platePill}>
          <Text style={styles.platePillText}>
            {isReceived ? message.fromPlate : message.toPlate}
          </Text>
        </View>
        {isReceived && (
          <View style={styles.minePill}>
            <Text style={styles.minePillText}>That's you!</Text>
          </View>
        )}
        <View style={styles.rowMeta}>
          {!isReceived && <DeliveryIcon message={message} />}
          <Text style={styles.rowTime}>{formatRelativeTime(message.timestamp)}</Text>
          {unread && <UnreadDot />}
        </View>
      </View>
      <Text style={[styles.rowContent, unread && styles.rowContentUnread]} numberOfLines={2}>
        {message.content}
      </Text>
    </PressableScale>
  );
}

export default function MessagesScreen() {
  const appStore = useAppStore();
  const [filter, setFilter] = useState<Filter>('all');

  const messages = useMemo(() => appStore?.messages ?? [], [appStore?.messages]);
  const userProfile = appStore?.userProfile ?? null;

  const myPlates = useMemo(
    () =>
      new Set(
        (userProfile?.vehicles ?? []).map((v) => normalizePlate(v.licensePlate)),
      ),
    [userProfile?.vehicles],
  );

  const isReceived = useCallback(
    (msg: Message) => myPlates.has(normalizePlate(msg.toPlate)),
    [myPlates],
  );

  const filtered = useMemo(() => {
    const sorted = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    switch (filter) {
      case 'received':
        return sorted.filter(isReceived);
      case 'sent':
        return sorted.filter((m) => !isReceived(m));
      case 'unread':
        return sorted.filter((m) => isReceived(m) && !m.isRead);
      case 'all':
      default:
        return sorted;
    }
  }, [filter, isReceived, messages]);

  const unreadCount = useMemo(
    () => messages.filter((m) => isReceived(m) && !m.isRead).length,
    [isReceived, messages],
  );

  const handleFilter = useCallback((next: Filter) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setFilter(next);
  }, []);

  const handleOpen = useCallback(
    (message: Message) => {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      if (isReceived(message) && !message.isRead) {
        void appStore?.markMessageAsRead?.(message.id);
      }
      router.push({ pathname: '/message-detail', params: { messageId: message.id } });
    },
    [appStore, isReceived],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Messages
        </Text>
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = filter === f.id;
          return (
            <Pressable
              key={f.id}
              onPress={() => handleFilter(f.id)}
              accessibilityRole="button"
              accessibilityLabel={`Filter ${f.label}`}
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, active && styles.filterChipActive]}
              testID={`filter-${f.id}`}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!appStore?.hydrated ? (
        <View style={styles.list} testID="messages-skeleton">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </View>
      ) : (
      <Animated.FlatList
        data={filtered}
        keyExtractor={(item: Message) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        itemLayoutAnimation={LinearTransition.springify()
          .damping(springs.gentle.damping)
          .stiffness(springs.gentle.stiffness)}
        renderItem={({ item, index }: { item: Message; index: number }) => (
          <Animated.View entering={enterUp(Math.min(index, 8) * 40)}>
            <MessageRow message={item} isReceived={isReceived(item)} onPress={handleOpen} />
          </Animated.View>
        )}
        ListEmptyComponent={
          <View style={styles.empty} testID="messages-empty">
            <MessageCircle size={36} color={designTokens.color.textLight} />
            <Text style={styles.emptyTitle}>
              {filter === 'unread' ? 'All caught up' : 'No messages yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {filter === 'sent'
                ? 'Messages you send will appear here.'
                : 'Send your first message from the Home tab.'}
            </Text>
          </View>
        }
      />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: designTokens.color.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: designTokens.type.h2.size,
    fontWeight: designTokens.type.h2.weight as '700',
    color: designTokens.color.text,
  },
  headerBadge: {
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  headerBadgeText: {
    fontSize: designTokens.type.small.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  filterChip: {
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
    backgroundColor: designTokens.color.surface,
    borderWidth: 1,
    borderColor: designTokens.color.border,
  },
  filterChipActive: {
    backgroundColor: designTokens.color.primary,
    borderColor: designTokens.color.primary,
  },
  filterText: {
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: '600',
    color: designTokens.color.text,
  },
  filterTextActive: {
    color: designTokens.color.primaryOn,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: TAB_BAR_CLEARANCE,
    flexGrow: 1,
  },
  row: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    padding: 14,
    marginBottom: 9,
  },
  rowMine: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.success,
  },
  rowUnread: {
    backgroundColor: designTokens.color.infoSoft,
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.primary,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  platePill: {
    backgroundColor: designTokens.plate.background,
    borderWidth: 1,
    borderColor: designTokens.plate.border,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  platePillText: {
    color: designTokens.plate.text,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  minePill: {
    backgroundColor: designTokens.color.successSoft,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  minePillText: {
    fontSize: designTokens.type.small.size,
    fontWeight: '700',
    color: designTokens.color.success,
  },
  rowMeta: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rowTime: {
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.primary,
  },
  rowContent: {
    fontSize: designTokens.type.bodySmall.size,
    lineHeight: designTokens.type.bodySmall.lineHeight,
    color: designTokens.color.textMuted,
  },
  rowContentUnread: {
    color: designTokens.color.text,
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: designTokens.type.subhead.size,
    fontWeight: '700',
    color: designTokens.color.text,
    marginTop: 6,
  },
  emptyBody: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
