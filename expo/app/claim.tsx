import React, { useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Easing,
  Platform,
  ScrollView,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, MailOpen, ShieldCheck, Sparkles, Lock, Car } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { designTokens } from '@/constants/theme';
import { usePlateClaims } from '@/hooks/usePlateClaims';
import { useAppStore } from '@/hooks/useAppStore';

export default function ClaimScreen() {
  const params = useLocalSearchParams<{ plate?: string; from?: string }>();
  const plate = (params.plate ?? '').toString().toUpperCase().trim();
  const claims = usePlateClaims();
  const { userProfile, primaryVehicle } = useAppStore();

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(20)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 460, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start();
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.05, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade, slide, pulse]);

  const pending = useMemo(() => (plate ? claims.getPendingInvite(plate) : null), [claims, plate]);

  const userOwnsPlate = useMemo(() => {
    if (!plate || !userProfile?.vehicles) return false;
    return userProfile.vehicles.some((v) => v.licensePlate.toUpperCase() === plate);
  }, [plate, userProfile?.vehicles]);

  const handleClaim = async () => {
    if (Platform.OS !== 'web') {
      try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    }
    if (userOwnsPlate) {
      await claims.claimPlate(plate);
      router.replace('/(tabs)/messages');
      return;
    }
    if (!userProfile || (userProfile.vehicles?.length ?? 0) === 0) {
      router.replace({ pathname: '/onboarding', params: { claimPlate: plate } });
    } else {
      router.replace({ pathname: '/vehicle-management', params: { addPlate: plate } });
    }
  };

  const samplePreview = useMemo(() => {
    if (!pending) return null;
    const m = pending.sampleMessage || '';
    return m.length > 140 ? `${m.slice(0, 140)}…` : m;
  }, [pending]);

  return (
    <SafeAreaView style={styles.container} testID="claim-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7} testID="claim-back">
          <ArrowLeft size={20} color={designTokens.color.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Claim plate</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          <Animated.View style={[styles.hero, { transform: [{ scale: pulse }] }]}>
            <LinearGradient
              colors={["#0B1A3C", "#1B6EF3", "#2ED3B7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />

            <View style={styles.envelopeWrap}>
              <View style={styles.envelopeIcon}>
                <MailOpen size={26} color="#FFD789" strokeWidth={2.4} />
              </View>
              {pending && pending.count > 1 ? (
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{pending.count}</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.plateChip}>
              <Text style={styles.plateChipText}>{plate || '— — —'}</Text>
            </View>

            <Text style={styles.heroTitle}>
              {pending
                ? pending.count === 1
                  ? 'A driver left you a message'
                  : `${pending.count} messages waiting`
                : 'Claim your license plate'}
            </Text>
            <Text style={styles.heroSub}>
              {pending
                ? 'Claim this plate to read it. Free, takes 30 seconds, fully private.'
                : 'Activate your plate so people can reach you with parking alerts, compliments and emergencies.'}
            </Text>
          </Animated.View>

          {pending && samplePreview ? (
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <View style={styles.previewIcon}>
                  <Lock size={12} color={designTokens.color.primary} strokeWidth={2.6} />
                </View>
                <Text style={styles.previewLabel}>Locked preview</Text>
              </View>
              <Text style={styles.previewBody} numberOfLines={3}>"{samplePreview}"</Text>
              <Text style={styles.previewFrom}>
                from {pending.fromName ?? `plate ${pending.fromPlate}`}
              </Text>
            </View>
          ) : null}

          <View style={styles.benefitsCard}>
            <Text style={styles.sectionLabel}>What you get</Text>
            <Benefit
              icon={<MailOpen size={16} color={designTokens.color.primary} strokeWidth={2.4} />}
              title="Read messages instantly"
              sub="Parking alerts, lights left on, compliments — no spam."
            />
            <Benefit
              icon={<ShieldCheck size={16} color={designTokens.color.success} strokeWidth={2.4} />}
              title="Stay anonymous"
              sub="Your phone, email, and address stay hidden."
            />
            <Benefit
              icon={<Sparkles size={16} color={designTokens.color.warning} strokeWidth={2.4} />}
              title="Earn community trust"
              sub="Verified plates get a trust badge and more replies."
            />
          </View>

          <TouchableOpacity style={styles.cta} onPress={handleClaim} activeOpacity={0.92} testID="claim-cta">
            <LinearGradient
              colors={["#1B6EF3", "#2ED3B7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Car size={18} color="#FFFFFF" strokeWidth={2.6} />
            <Text style={styles.ctaText}>
              {userOwnsPlate ? 'Open messages' : `Claim ${plate || 'plate'}`}
            </Text>
          </TouchableOpacity>

          <Text style={styles.fineprint}>
            By claiming, you confirm this is your vehicle. Misuse can result in account suspension.
          </Text>

          {primaryVehicle ? (
            <Text style={styles.alreadyText}>
              Signed in as {primaryVehicle.licensePlate}
            </Text>
          ) : null}

          <View style={{ height: 32 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <View style={styles.benefitRow}>
      <View style={styles.benefitIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitSub}>{sub}</Text>
      </View>
    </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: designTokens.color.text, letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  hero: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
    minHeight: 240,
  },
  heroBlob1: {
    position: 'absolute',
    top: -50, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroBlob2: {
    position: 'absolute',
    bottom: -40, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  envelopeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  envelopeIcon: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  countBadge: {
    minWidth: 28, height: 28, paddingHorizontal: 8, borderRadius: 14,
    backgroundColor: '#FFD789', alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 13, fontWeight: '800' as const, color: '#0B1A3C' },
  plateChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  plateChipText: {
    fontSize: 18, fontWeight: '800' as const, color: '#0B1A3C',
    letterSpacing: 3, fontVariant: ['tabular-nums'],
  },
  heroTitle: {
    fontSize: 24, fontWeight: '800' as const, color: '#FFFFFF',
    letterSpacing: -0.5, marginBottom: 6,
  },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.88)', lineHeight: 20 },

  previewCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    marginBottom: 16,
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  previewIcon: {
    width: 22, height: 22, borderRadius: 7,
    backgroundColor: `${designTokens.color.primary}14`,
    alignItems: 'center', justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 10, fontWeight: '800' as const,
    color: designTokens.color.textLight, letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  previewBody: {
    fontSize: 15, color: designTokens.color.text,
    lineHeight: 21, fontStyle: 'italic',
    marginBottom: 8,
  },
  previewFrom: {
    fontSize: 12, color: designTokens.color.textMuted, fontWeight: '600' as const,
  },

  sectionLabel: {
    fontSize: 11, fontWeight: '800' as const,
    color: designTokens.color.textLight, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 12,
  },
  benefitsCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: designTokens.color.border,
    marginBottom: 18,
  },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  benefitIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: designTokens.color.surfaceWarm,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  benefitTitle: { fontSize: 14, fontWeight: '700' as const, color: designTokens.color.text },
  benefitSub: { fontSize: 12, color: designTokens.color.textMuted, marginTop: 2, lineHeight: 17 },

  cta: {
    height: 56, borderRadius: 18, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, marginBottom: 12,
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 6,
  },
  ctaText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.2 },

  fineprint: {
    fontSize: 11, color: designTokens.color.textLight,
    textAlign: 'center', lineHeight: 16, paddingHorizontal: 16,
  },
  alreadyText: {
    fontSize: 12, color: designTokens.color.textMuted,
    textAlign: 'center', marginTop: 8,
  },
});
