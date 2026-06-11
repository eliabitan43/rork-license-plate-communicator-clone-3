import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, Check, ChevronLeft, Gift, Send } from 'lucide-react-native';
import { designTokens, getShadowStyle } from '@/constants/theme';
import { useAppStore } from '@/hooks/useAppStore';
import { useToast } from '@/hooks/useToast';
import {
  INTENT_LABELS,
  INTENT_ORDER,
  QUICK_ACTIONS_BY_INTENT,
  QuickActionIntent,
  QuickActionItem,
} from '@/constants/quickActions';
import { Message, MessageIntent } from '@/types';

const MAX_CHARS = 160;
const WARN_AT = 130;
const MIN_PLATE_CHARS = 3;

const INTENT_TO_MESSAGE_INTENT: Record<QuickActionIntent, MessageIntent> = {
  critical: 'emergency',
  car: 'vehicle_condition',
  road: 'safety_alert',
  community: 'courtesy_notice',
};

function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

type SendParams = {
  toPlate?: string;
  plate?: string;
  type?: string;
  actionId?: string;
  prefilledMessage?: string;
  message?: string;
  actionTitle?: string;
};

export default function SendMessageScreen() {
  const params = useLocalSearchParams<SendParams>();
  const appStore = useAppStore();
  const { showToast } = useToast();

  // Accept both v2 (`plate`/`message`) and legacy (`toPlate`/`prefilledMessage`) param names.
  const initialPlate = normalizePlate(params.toPlate ?? params.plate ?? '');
  const initialBody = params.prefilledMessage ?? params.message ?? '';

  const [plate, setPlate] = useState(initialPlate);
  const [body, setBody] = useState(initialBody);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(
    params.actionId ?? null,
  );
  const [anonymous, setAnonymous] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const selectedAction = useMemo<QuickActionItem | null>(() => {
    if (!selectedActionId) return null;
    for (const intent of INTENT_ORDER) {
      const found = QUICK_ACTIONS_BY_INTENT[intent].find((a) => a.id === selectedActionId);
      if (found) return found;
    }
    return null;
  }, [selectedActionId]);

  // If we deep-linked in with only a MessageType (scan flow), resolve to an action once.
  useEffect(() => {
    if (selectedActionId || !params.type) return;
    for (const intent of INTENT_ORDER) {
      const found = QUICK_ACTIONS_BY_INTENT[intent].find((a) => a.type === params.type);
      if (found) {
        setSelectedActionId(found.id);
        if (!initialBody) setBody(found.prefilledMessage);
        break;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleActionTap = useCallback((action: QuickActionItem) => {
    if (Platform.OS !== 'web') void Haptics.selectionAsync();
    setSelectedActionId(action.id);
    setBody(action.prefilledMessage);
  }, []);

  const plateReady = plate.length >= MIN_PLATE_CHARS;
  const bodyReady = body.trim().length > 0;
  const charCount = body.length;
  const counterColor =
    charCount >= MAX_CHARS
      ? designTokens.color.error
      : charCount >= WARN_AT
        ? designTokens.color.warning
        : designTokens.color.textLight;

  const handleSend = useCallback(async () => {
    if (sending) return;
    if (!plateReady) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Add a plate', 'Enter the license plate you want to message.');
      return;
    }
    if (!bodyReady) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Empty message', 'Pick a quick action or write a message.');
      return;
    }

    setSending(true);
    try {
      const message: Message = {
        id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        fromPlate:
          appStore?.primaryVehicle?.licensePlate ??
          (anonymous ? 'ANONYMOUS' : 'UNREGISTERED'),
        toPlate: plate,
        content: body.trim(),
        type: selectedAction?.type ?? 'general',
        isAnonymous: anonymous,
        timestamp: new Date().toISOString(),
        isRead: false,
        intent: selectedAction ? INTENT_TO_MESSAGE_INTENT[selectedAction.intent] : undefined,
        priority: selectedAction?.highPriority ? 'urgent' : 'medium',
        metadata: selectedAction ? { actionId: selectedAction.id } : undefined,
      };

      await appStore?.sendMessage?.(message);

      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setSent(true);
    } catch (error) {
      console.error('Send failed:', error);
      showToast('Could not send — try again', 'error');
    } finally {
      setSending(false);
    }
  }, [anonymous, appStore, body, bodyReady, plate, plateReady, selectedAction, sending, showToast]);

  if (sent) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.successWrap} testID="send-success">
          <View style={styles.successIcon}>
            <Check size={42} color={designTokens.color.primaryOn} strokeWidth={3} />
          </View>
          <Text style={styles.successTitle} accessibilityRole="header">
            Message sent
          </Text>
          <Text style={styles.successBody}>
            {anonymous ? 'Sent anonymously to ' : 'Sent to '}
            <Text style={styles.successPlate}>{plate}</Text>
            {`.\nThey'll get it the moment they're reachable.`}
          </Text>

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              router.replace('/referral');
            }}
            accessibilityRole="button"
            accessibilityLabel="Invite friends to HOMI"
            style={({ pressed }) => [styles.referralCta, pressed && styles.pressed]}
            testID="success-referral-cta"
          >
            <Gift size={20} color={designTokens.color.primaryOn} />
            <Text style={styles.referralCtaText}>
              Know the driver? Invite friends → free HOMI+
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              router.replace('/(tabs)/dashboard');
            }}
            accessibilityRole="button"
            accessibilityLabel="Back to home"
            style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
            testID="success-done"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') void Haptics.selectionAsync();
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backButton}
            hitSlop={8}
          >
            <ChevronLeft size={24} color={designTokens.color.text} />
          </Pressable>
          <Text style={styles.topTitle} accessibilityRole="header">
            New message
          </Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Plate */}
          <Text style={styles.fieldLabel}>TO PLATE</Text>
          <View style={styles.plateRow}>
            <View style={styles.plateFlag}>
              <Text style={styles.plateFlagText}>🇮🇱</Text>
            </View>
            <TextInput
              style={styles.plateInput}
              value={plate}
              onChangeText={(v) => setPlate(normalizePlate(v).slice(0, 10))}
              placeholder="12-345-67"
              placeholderTextColor={designTokens.plate.border}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={10}
              accessibilityLabel="Recipient license plate"
              testID="send-plate-input"
            />
          </View>

          {/* 19-action grid, grouped by intent */}
          {INTENT_ORDER.map((intent) => (
            <View key={intent}>
              <Text style={styles.fieldLabel}>{INTENT_LABELS[intent].toUpperCase()}</Text>
              {intent === 'critical' && (
                <View style={styles.criticalBanner} testID="critical-banner">
                  <AlertTriangle size={16} color={designTokens.color.error} />
                  <Text style={styles.criticalBannerText}>
                    Critical alerts are delivered immediately — including by SMS if the
                    driver doesn't have HOMI yet.
                  </Text>
                </View>
              )}
              <View style={styles.actionGrid}>
                {QUICK_ACTIONS_BY_INTENT[intent].map((action) => {
                  const selected = action.id === selectedActionId;
                  return (
                    <Pressable
                      key={action.id}
                      onPress={() => handleActionTap(action)}
                      accessibilityRole="button"
                      accessibilityLabel={action.label}
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [
                        styles.actionTile,
                        selected && styles.actionTileSelected,
                        selected &&
                          intent === 'critical' &&
                          styles.actionTileSelectedCritical,
                        pressed && styles.pressed,
                      ]}
                      testID={`action-${action.id}`}
                    >
                      <Text style={styles.actionEmoji}>{action.emoji}</Text>
                      <Text style={styles.actionLabel} numberOfLines={2}>
                        {action.label}
                      </Text>
                      {action.isNew && (
                        <View style={styles.newBadge}>
                          <Text style={styles.newBadgeText}>New</Text>
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          {/* Body */}
          <View style={styles.bodyHeader}>
            <Text style={styles.fieldLabel}>MESSAGE</Text>
            <Text style={[styles.counter, { color: counterColor }]} testID="char-counter">
              {charCount}/{MAX_CHARS}
            </Text>
          </View>
          <TextInput
            style={styles.bodyInput}
            value={body}
            onChangeText={(v) => setBody(v.slice(0, MAX_CHARS))}
            placeholder="Pick a quick action above, or write your own…"
            placeholderTextColor={designTokens.color.textLight}
            multiline
            maxLength={MAX_CHARS}
            accessibilityLabel="Message body"
            testID="send-body-input"
          />

          {/* Anonymous toggle */}
          <View style={styles.anonRow}>
            <View style={styles.flex}>
              <Text style={styles.anonTitle}>Send anonymously</Text>
              <Text style={styles.anonBody}>
                The driver never sees who you are. Recommended.
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={(v) => {
                if (Platform.OS !== 'web') void Haptics.selectionAsync();
                setAnonymous(v);
              }}
              trackColor={{
                false: designTokens.color.border,
                true: designTokens.color.primary,
              }}
              thumbColor={designTokens.color.surface}
              accessibilityLabel="Send anonymously"
              testID="anon-toggle"
            />
          </View>

          <Pressable
            onPress={handleSend}
            disabled={sending || !plateReady || !bodyReady}
            accessibilityRole="button"
            accessibilityLabel={anonymous ? 'Send anonymously' : 'Send message'}
            accessibilityState={{ disabled: sending || !plateReady || !bodyReady }}
            style={({ pressed }) => [
              styles.sendButton,
              (!plateReady || !bodyReady) && styles.sendButtonDisabled,
              pressed && styles.pressed,
            ]}
            testID="send-button"
          >
            <Send size={18} color={designTokens.color.primaryOn} />
            <Text style={styles.sendButtonText}>
              {sending ? 'Sending…' : anonymous ? 'Send anonymously' : 'Send message'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: designTokens.type.title.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  fieldLabel: {
    fontSize: designTokens.type.overline.size,
    fontWeight: designTokens.type.overline.weight as '700',
    letterSpacing: designTokens.type.overline.letterSpacing,
    color: designTokens.color.textMuted,
    marginTop: 18,
    marginBottom: 8,
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
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: designTokens.plate.border,
  },
  plateFlagText: {
    fontSize: 16,
  },
  plateInput: {
    flex: 1,
    paddingHorizontal: 14,
    minHeight: 50,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: designTokens.plate.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  criticalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designTokens.color.errorSoft,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  criticalBannerText: {
    flex: 1,
    fontSize: designTokens.type.small.size,
    lineHeight: 17,
    color: designTokens.color.error,
    fontWeight: '600',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
  actionTile: {
    width: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: designTokens.color.surface,
    borderWidth: 1.5,
    borderColor: designTokens.color.borderMuted,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: 12,
    minHeight: 52,
  },
  actionTileSelected: {
    borderColor: designTokens.color.primary,
    backgroundColor: designTokens.color.infoSoft,
  },
  actionTileSelectedCritical: {
    borderColor: designTokens.color.error,
    backgroundColor: designTokens.color.errorSoft,
  },
  actionEmoji: {
    fontSize: 18,
  },
  actionLabel: {
    flex: 1,
    fontSize: designTokens.type.small.size,
    fontWeight: '600',
    color: designTokens.color.text,
  },
  newBadge: {
    position: 'absolute',
    top: -6,
    right: 8,
    backgroundColor: designTokens.color.accent,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  newBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  bodyHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  counter: {
    fontSize: designTokens.type.small.size,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  bodyInput: {
    backgroundColor: designTokens.color.surfaceWarm,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 110,
    fontSize: designTokens.type.body.size,
    lineHeight: designTokens.type.body.lineHeight,
    color: designTokens.color.text,
    textAlignVertical: 'top',
  },
  anonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.surface,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
    borderRadius: designTokens.radius.lg,
    padding: 14,
    marginTop: 16,
  },
  anonTitle: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  anonBody: {
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.lg,
    minHeight: 56,
    marginTop: 16,
    ...getShadowStyle('md'),
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
  successWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: designTokens.color.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    ...getShadowStyle('md'),
    shadowColor: designTokens.color.success,
  },
  successTitle: {
    fontSize: designTokens.type.h2.size,
    fontWeight: designTokens.type.h2.weight as '700',
    color: designTokens.color.text,
  },
  successBody: {
    fontSize: designTokens.type.body.size,
    lineHeight: designTokens.type.body.lineHeight,
    color: designTokens.color.textMuted,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 28,
  },
  successPlate: {
    fontWeight: '700',
    color: designTokens.color.text,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  referralCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 18,
    minHeight: 54,
    width: '100%',
    justifyContent: 'center',
    ...getShadowStyle('md'),
    shadowColor: designTokens.color.primary,
  },
  referralCtaText: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
    flexShrink: 1,
  },
  doneButton: {
    minHeight: 50,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
  },
  doneButtonText: {
    fontSize: designTokens.type.subheadSmall.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
