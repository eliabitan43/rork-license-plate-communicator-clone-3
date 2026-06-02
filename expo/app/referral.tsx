import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Copy,
  Share2,
  Gift,
  Check,
  Users,
  Sparkles,
  Crown,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { designTokens } from '@/constants/theme';
import { useReferral } from '@/hooks/useReferral';
import { useToast } from '@/hooks/useToast';

export default function ReferralScreen() {
  const referral = useReferral();
  const { showToast } = useToast();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fadeAnim, slideAnim, pulseAnim]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }
    await referral.share();
    showToast('Invite ready to send', 'success', 1800);
  }, [referral, showToast]);

  const handleCopyCode = useCallback(async () => {
    await referral.copyCode();
    showToast(`Code ${referral.code} copied`, 'success', 1600);
  }, [referral, showToast]);

  const handleCopyLink = useCallback(async () => {
    await referral.copyLink();
    showToast('Invite link copied', 'success', 1600);
  }, [referral, showToast]);

  const progress = useMemo(() => {
    const target = referral.nextTier?.count ?? referral.tiers[referral.tiers.length - 1].count;
    return Math.min(1, referral.invitesClaimed / target);
  }, [referral.invitesClaimed, referral.nextTier, referral.tiers]);

  return (
    <SafeAreaView style={styles.container} testID="referral-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.6} testID="referral-back">
          <ArrowLeft size={20} color={designTokens.color.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite & Earn</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Animated.View style={[styles.heroCard, { transform: [{ scale: pulseAnim }] }]}>
            <LinearGradient
              colors={["#0B1A3C", "#1B6EF3", "#2ED3B7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroOrb1} />
            <View style={styles.heroOrb2} />
            <View style={styles.heroIcon}>
              <Gift size={28} color="#FFD789" strokeWidth={2.4} />
            </View>
            <Text style={styles.heroTitle}>Give a month, get a month</Text>
            <Text style={styles.heroSub}>
              Invite a driver. When they claim their plate, you both unlock HOMI Plus.
            </Text>
          </Animated.View>

          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Your invite code</Text>
            <View style={styles.codeRow}>
              <Text style={styles.codeText} testID="referral-code">{referral.code || '••••••'}</Text>
              <TouchableOpacity onPress={handleCopyCode} style={styles.copyBtn} activeOpacity={0.7} testID="copy-code">
                <Copy size={14} color={designTokens.color.primary} strokeWidth={2.4} />
                <Text style={styles.copyText}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleCopyLink} style={styles.linkRow} activeOpacity={0.6} testID="copy-link">
              <Text style={styles.linkText} numberOfLines={1}>{referral.inviteLink}</Text>
              <Copy size={12} color={designTokens.color.textLight} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShare}
            activeOpacity={0.92}
            testID="share-invite"
          >
            <LinearGradient
              colors={["#1B6EF3", "#2ED3B7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.shareBtnText}>Share invite</Text>
          </TouchableOpacity>

          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressIcon}>
                <Users size={14} color={designTokens.color.primary} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.progressTitle}>
                  {referral.invitesClaimed} of {referral.nextTier?.count ?? '—'} friends joined
                </Text>
                <Text style={styles.progressSub}>
                  {referral.nextTier
                    ? `Next reward: ${referral.nextTier.reward}`
                    : 'You unlocked every reward 🎉'}
                </Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: `${progress * 100}%` }]}>
                <LinearGradient
                  colors={["#1B6EF3", "#2ED3B7"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Rewards</Text>
          <View style={styles.tierList}>
            {referral.tiers.map((tier) => {
              const unlocked = referral.unlockedTiers.includes(tier.count);
              const Icon = tier.count >= 10 ? Crown : tier.count >= 3 ? Sparkles : Zap;
              return (
                <View key={tier.count} style={[styles.tierRow, unlocked && styles.tierRowDone]}>
                  <View style={[styles.tierIcon, unlocked && styles.tierIconDone]}>
                    {unlocked ? (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Icon size={14} color={designTokens.color.primary} strokeWidth={2.4} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierTitle}>{tier.count} friend{tier.count > 1 ? 's' : ''}</Text>
                    <Text style={styles.tierReward}>{tier.reward}</Text>
                  </View>
                  {unlocked ? (
                    <Text style={styles.tierBadgeDone}>UNLOCKED</Text>
                  ) : (
                    <Text style={styles.tierBadge}>{tier.count - referral.invitesClaimed} to go</Text>
                  )}
                </View>
              );
            })}
          </View>

          <View style={styles.howCard}>
            <Text style={styles.howTitle}>How it works</Text>
            <View style={styles.howRow}>
              <View style={styles.howNum}><Text style={styles.howNumText}>1</Text></View>
              <Text style={styles.howText}>Share your code or link with a driver friend.</Text>
            </View>
            <View style={styles.howRow}>
              <View style={styles.howNum}><Text style={styles.howNumText}>2</Text></View>
              <Text style={styles.howText}>They install HOMI and claim their license plate.</Text>
            </View>
            <View style={styles.howRow}>
              <View style={styles.howNum}><Text style={styles.howNumText}>3</Text></View>
              <Text style={styles.howText}>You both get HOMI Plus, instantly.</Text>
            </View>
          </View>

          {__DEV__ ? (
            <TouchableOpacity
              onPress={() => referral.simulateClaim()}
              style={styles.devBtn}
              activeOpacity={0.7}
              testID="dev-simulate-claim"
            >
              <Text style={styles.devBtnText}>DEV: simulate friend joined</Text>
            </TouchableOpacity>
          ) : null}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: designTokens.color.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: designTokens.color.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: designTokens.color.text,
    letterSpacing: -0.2,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  heroCard: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
  },
  heroOrb1: {
    position: 'absolute',
    top: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroOrb2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 20,
  },

  codeCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    marginBottom: 12,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: designTokens.color.textLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: designTokens.color.text,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: `${designTokens.color.primary}14`,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: designTokens.color.primary,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: designTokens.color.borderMuted,
    gap: 8,
  },
  linkText: {
    flex: 1,
    fontSize: 12,
    color: designTokens.color.textMuted,
  },

  shareBtn: {
    height: 56,
    borderRadius: 18,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  shareBtnText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  progressCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    marginBottom: 18,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  progressIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${designTokens.color.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: designTokens.color.text,
  },
  progressSub: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.borderMuted,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
    overflow: 'hidden',
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: designTokens.color.textLight,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
    marginLeft: 4,
  },
  tierList: { gap: 10, marginBottom: 18 },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.surface,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    borderRadius: 16,
    padding: 14,
  },
  tierRowDone: {
    borderColor: `${designTokens.color.success}55`,
    backgroundColor: `${designTokens.color.success}08`,
  },
  tierIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${designTokens.color.primary}14`,
  },
  tierIconDone: {
    backgroundColor: designTokens.color.success,
  },
  tierTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: designTokens.color.text,
  },
  tierReward: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  tierBadge: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: designTokens.color.textLight,
  },
  tierBadgeDone: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: designTokens.color.success,
    letterSpacing: 1,
  },

  howCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border,
  },
  howTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: designTokens.color.text,
    marginBottom: 12,
  },
  howRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 10,
  },
  howNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: `${designTokens.color.primary}14`,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  howNumText: {
    fontSize: 11,
    fontWeight: '800' as const,
    color: designTokens.color.primary,
  },
  howText: {
    flex: 1,
    fontSize: 13,
    color: designTokens.color.textMuted,
    lineHeight: 19,
  },

  devBtn: {
    marginTop: 18,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: designTokens.color.border,
    alignItems: 'center',
  },
  devBtnText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: designTokens.color.textLight,
    letterSpacing: 1,
  },
});
