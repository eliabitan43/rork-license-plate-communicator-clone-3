import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Camera,
  ChevronRight,
  Gift,
  MapPin,
  Send,
  X,
} from 'lucide-react-native';
import { designTokens, getShadowStyle } from '@/constants/theme';
import { useAppStore } from '@/hooks/useAppStore';
import {
  DASHBOARD_QUICK_ACTIONS,
  QuickActionItem,
} from '@/constants/quickActions';
import { Message } from '@/types';

const WELCOME_BANNER_KEY = 'welcome_banner_dismissed';
const MIN_PLATE_CHARS = 3;
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

interface FeedCardProps {
  message: Message;
  isMine: boolean;
  onPress: (message: Message) => void;
}

function FeedCard({ message, isMine, onPress }: FeedCardProps) {
  return (
    <Pressable
      onPress={() => onPress(message)}
      accessibilityRole="button"
      accessibilityLabel={`Message ${isMine ? 'to your plate' : `to ${message.toPlate}`}: ${message.content}`}
      style={({ pressed }) => [
        styles.feedCard,
        isMine && styles.feedCardMine,
        !message.isRead && !isMine && styles.feedCardUnread,
        pressed && styles.pressed,
      ]}
      testID={`feed-card-${message.id}`}
    >
      <View style={styles.feedCardTop}>
        <View style={styles.platePill}>
          <Text style={styles.platePillText}>{message.toPlate}</Text>
        </View>
        {isMine && (
          <View style={styles.minePill}>
            <Text style={styles.minePillText}>That's you!</Text>
          </View>
        )}
        <Text style={styles.feedTime}>{formatRelativeTime(message.timestamp)}</Text>
      </View>
      <Text style={styles.feedContent} numberOfLines={2}>
        {message.content}
      </Text>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const appStore = useAppStore();
  const [plateInput, setPlateInput] = useState('');
  const [bannerVisible, setBannerVisible] = useState(false);

  const userProfile = appStore?.userProfile ?? null;
  const messages = useMemo(() => appStore?.messages ?? [], [appStore?.messages]);
  const primaryVehicle = appStore?.primaryVehicle ?? null;

  const myPlates = useMemo(
    () =>
      new Set(
        (userProfile?.vehicles ?? []).map((v) => normalizePlate(v.licensePlate)),
      ),
    [userProfile?.vehicles],
  );

  const recentPlates = useMemo(() => {
    const seen = new Set<string>();
    const plates: string[] = [];
    const sorted = [...messages].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    for (const msg of sorted) {
      const plate = normalizePlate(msg.toPlate);
      if (plate && !myPlates.has(plate) && !seen.has(plate)) {
        seen.add(plate);
        plates.push(msg.toPlate);
      }
      if (plates.length >= 5) break;
    }
    return plates;
  }, [messages, myPlates]);

  const feed = useMemo(
    () =>
      [...messages]
        .sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        )
        .slice(0, 12),
    [messages],
  );

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(WELCOME_BANNER_KEY).then((dismissed) => {
      if (mounted && !dismissed) setBannerVisible(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const dismissBanner = useCallback(() => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setBannerVisible(false);
    void AsyncStorage.setItem(WELCOME_BANNER_KEY, 'true');
  }, []);

  const plateReady = normalizePlate(plateInput).length >= MIN_PLATE_CHARS;

  const handleSend = useCallback(() => {
    if (!plateReady) return;
    if (Platform.OS !== 'web') {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: '/send-message',
      params: { toPlate: normalizePlate(plateInput) },
    });
  }, [plateInput, plateReady]);

  const handleQuickAction = useCallback((action: QuickActionItem) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push({
      pathname: '/send-message',
      params: {
        type: action.type,
        actionId: action.id,
        prefilledMessage: action.prefilledMessage,
        actionTitle: action.label,
      },
    });
  }, []);

  const handleRecentPlate = useCallback((plate: string) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    router.push({
      pathname: '/send-message',
      params: { toPlate: normalizePlate(plate) },
    });
  }, []);

  const handleFeedPress = useCallback(
    (message: Message) => {
      if (Platform.OS !== 'web') void Haptics.selectionAsync();
      void appStore?.markMessageAsRead?.(message.id);
      router.push({ pathname: '/message-detail', params: { messageId: message.id } });
    },
    [appStore],
  );

  const greetingName = userProfile?.displayName
    ? userProfile.displayName
    : userProfile?.isAnonymous
      ? 'Ghost driver'
      : 'Driver';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.greeting}>Hi, {greetingName} 👋</Text>
            <Text style={styles.tagline}>{designTokens.brand.slogan}</Text>
          </View>
          {primaryVehicle && (
            <View style={styles.myPlateChip} accessibilityLabel={`Your plate ${primaryVehicle.licensePlate}`}>
              <Text style={styles.myPlateText}>{primaryVehicle.licensePlate}</Text>
            </View>
          )}
        </View>

        {bannerVisible && (
          <View style={styles.welcomeBanner} testID="welcome-banner">
            <View style={styles.flex}>
              <Text style={styles.welcomeTitle}>You're in! 🎉</Text>
              <Text style={styles.welcomeBody}>
                Send your first message — type any plate below.
              </Text>
            </View>
            <Pressable
              onPress={dismissBanner}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Dismiss welcome banner"
              testID="welcome-banner-dismiss"
            >
              <X size={18} color={designTokens.color.textMuted} />
            </Pressable>
          </View>
        )}

        {/* Hero — plate input is the #1 element on this screen */}
        <View style={styles.heroCard} testID="plate-hero">
          <Text style={styles.heroLabel}>MESSAGE A DRIVER</Text>
          <View style={styles.plateRow}>
            <View style={styles.plateFlag}>
              <Text style={styles.plateFlagText}>🇮🇱</Text>
            </View>
            <TextInput
              style={styles.plateInput}
              value={plateInput}
              onChangeText={(v) => setPlateInput(normalizePlate(v).slice(0, 10))}
              placeholder="12-345-67"
              placeholderTextColor={designTokens.plate.border}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              accessibilityLabel="License plate number"
              testID="plate-input"
            />
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                router.push('/(tabs)/scan');
              }}
              style={styles.cameraButton}
              accessibilityRole="button"
              accessibilityLabel="Scan plate with camera"
              hitSlop={6}
            >
              <Camera size={20} color={designTokens.plate.text} />
            </Pressable>
          </View>
          <Pressable
            onPress={handleSend}
            disabled={!plateReady}
            accessibilityRole="button"
            accessibilityLabel="Send message to this plate"
            accessibilityState={{ disabled: !plateReady }}
            style={({ pressed }) => [
              styles.sendButton,
              !plateReady && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
            testID="hero-send-button"
          >
            <Send size={18} color={designTokens.color.primaryOn} />
            <Text style={styles.sendButtonText}>Send message</Text>
          </Pressable>

          {recentPlates.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentRow}
            >
              {recentPlates.map((plate) => (
                <Pressable
                  key={plate}
                  onPress={() => handleRecentPlate(plate)}
                  style={({ pressed }) => [styles.recentChip, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Message ${plate} again`}
                >
                  <Text style={styles.recentChipText}>{plate}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Quick actions — 6 + "All 19" */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              router.push('/send-message');
            }}
            accessibilityRole="button"
            accessibilityLabel="See all 19 quick actions"
            hitSlop={8}
          >
            <Text style={styles.sectionLink}>All 19 →</Text>
          </Pressable>
        </View>
        <View style={styles.quickGrid}>
          {DASHBOARD_QUICK_ACTIONS.map((action) => (
            <Pressable
              key={action.id}
              onPress={() => handleQuickAction(action)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
              style={({ pressed }) => [styles.quickTile, pressed && styles.pressed]}
              testID={`quick-action-${action.id}`}
            >
              <View style={[styles.quickEmojiWrap, { backgroundColor: `${action.tint}1A` }]}>
                <Text style={styles.quickEmoji}>{action.emoji}</Text>
              </View>
              <Text style={styles.quickLabel} numberOfLines={1}>
                {action.label}
              </Text>
              {action.isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Map strip */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            router.push('/map-live');
          }}
          accessibilityRole="button"
          accessibilityLabel="Open live map"
          style={({ pressed }) => [styles.mapStrip, pressed && styles.pressed]}
          testID="map-strip"
        >
          <View style={styles.mapIconWrap}>
            <MapPin size={20} color={designTokens.color.primary} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.mapTitle}>Live map</Text>
            <Text style={styles.mapSubtitle}>Road events & nearby drivers</Text>
          </View>
          <ChevronRight size={18} color={designTokens.color.textLight} />
        </Pressable>

        {/* Neighborhood feed */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>NEIGHBORHOOD FEED</Text>
        </View>
        {feed.length === 0 ? (
          <View style={styles.emptyFeed} testID="empty-feed">
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyBody}>
              Messages you send and receive will show up here.
            </Text>
          </View>
        ) : (
          feed.map((msg) => (
            <FeedCard
              key={msg.id}
              message={msg}
              isMine={myPlates.has(normalizePlate(msg.toPlate))}
              onPress={handleFeedPress}
            />
          ))
        )}

        {/* Referral card */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') void Haptics.selectionAsync();
            router.push('/referral');
          }}
          accessibilityRole="button"
          accessibilityLabel="Invite friends, earn HOMI Plus"
          style={({ pressed }) => [styles.referralCard, pressed && styles.pressed]}
          testID="referral-card"
        >
          <View style={styles.referralIconWrap}>
            <Gift size={22} color={designTokens.color.primaryOn} />
          </View>
          <View style={styles.flex}>
            <Text style={styles.referralTitle}>Invite 3 friends → 1 month free</Text>
            <Text style={styles.referralBody}>
              Friends who register their plate unlock HOMI+ for you.
            </Text>
          </View>
          <ChevronRight size={18} color={designTokens.color.primaryLight} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: designTokens.color.bg,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: TAB_BAR_CLEARANCE,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  greeting: {
    fontSize: designTokens.type.h3.size,
    fontWeight: designTokens.type.h3.weight as '700',
    color: designTokens.color.text,
  },
  tagline: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  myPlateChip: {
    backgroundColor: designTokens.plate.background,
    borderWidth: 1,
    borderColor: designTokens.plate.border,
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  myPlateText: {
    color: designTokens.plate.text,
    fontWeight: '700',
    fontSize: designTokens.type.small.size,
    letterSpacing: 1.5,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  welcomeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.successSoft,
    borderRadius: designTokens.radius.lg,
    padding: 14,
    marginBottom: 14,
  },
  welcomeTitle: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  welcomeBody: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  heroCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    borderColor: designTokens.glass.accent.border,
    padding: 18,
    marginBottom: 20,
    ...getShadowStyle('md'),
  },
  heroLabel: {
    fontSize: designTokens.type.overline.size,
    fontWeight: designTokens.type.overline.weight as '700',
    letterSpacing: designTokens.type.overline.letterSpacing,
    color: designTokens.color.textMuted,
    marginBottom: 12,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designTokens.plate.background,
    borderWidth: 1.5,
    borderColor: designTokens.plate.border,
    borderRadius: designTokens.radius.md,
    overflow: 'hidden',
  },
  plateFlag: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: designTokens.plate.border,
  },
  plateFlagText: {
    fontSize: 18,
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: 14,
    minHeight: 56,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3,
    color: designTokens.plate.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  cameraButton: {
    width: 48,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: designTokens.plate.border,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.lg,
    minHeight: 52,
    marginTop: 12,
    ...getShadowStyle('sm'),
    shadowColor: designTokens.color.primary,
  },
  sendButtonDisabled: {
    opacity: designTokens.state.disabled.opacity,
  },
  sendButtonText: {
    fontSize: designTokens.type.subhead.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  recentRow: {
    gap: 8,
    marginTop: 14,
  },
  recentChip: {
    backgroundColor: designTokens.color.surfaceWarm,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 14,
    minHeight: 36,
    justifyContent: 'center',
  },
  recentChipText: {
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: '600',
    color: designTokens.color.text,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: designTokens.type.overline.size,
    fontWeight: designTokens.type.overline.weight as '700',
    letterSpacing: designTokens.type.overline.letterSpacing,
    color: designTokens.color.textMuted,
  },
  sectionLink: {
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: '700',
    color: designTokens.color.primary,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  quickTile: {
    width: '31%',
    flexGrow: 1,
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    minHeight: 92,
    ...getShadowStyle('sm'),
  },
  quickEmojiWrap: {
    width: 40,
    height: 40,
    borderRadius: designTokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickEmoji: {
    fontSize: 20,
  },
  quickLabel: {
    fontSize: designTokens.type.small.size,
    fontWeight: '600',
    color: designTokens.color.text,
    textAlign: 'center',
  },
  newBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: designTokens.color.accent,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  mapStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    padding: 14,
    marginBottom: 20,
    ...getShadowStyle('sm'),
  },
  mapIconWrap: {
    width: 40,
    height: 40,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.color.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  mapSubtitle: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.textMuted,
    marginTop: 1,
  },
  feedCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    padding: 14,
    marginBottom: 9,
  },
  feedCardMine: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.success,
  },
  feedCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: designTokens.color.primary,
    backgroundColor: designTokens.color.infoSoft,
  },
  feedCardTop: {
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
  feedTime: {
    marginLeft: 'auto',
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textLight,
  },
  feedContent: {
    fontSize: designTokens.type.bodySmall.size,
    lineHeight: designTokens.type.bodySmall.lineHeight,
    color: designTokens.color.text,
  },
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 8,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  emptyBody: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  referralCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.xl,
    padding: 16,
    marginTop: 12,
    ...getShadowStyle('md'),
    shadowColor: designTokens.color.primary,
  },
  referralIconWrap: {
    width: 44,
    height: 44,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.glass.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  referralTitle: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  referralBody: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.primaryLight,
    marginTop: 2,
  },
  pressed: {
    opacity: 0.85,
  },
});
