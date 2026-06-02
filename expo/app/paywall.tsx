import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, X, Sparkles, Crown, Zap } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { designTokens } from '@/constants/theme';
import { usePremium, PLANS, PLUS_FEATURES, PlanId } from '@/hooks/usePremium';
import { useToast } from '@/hooks/useToast';

export default function PaywallScreen() {
  const premium = usePremium();
  const toast = useToast();
  const [selected, setSelected] = useState<PlanId>('annual');
  const [busy, setBusy] = useState<boolean>(false);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;
  const shine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, [fade, slide, shine]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
  }, []);

  const handleSelect = useCallback((id: PlanId) => {
    triggerHaptic();
    setSelected(id);
  }, [triggerHaptic]);

  const handleSubscribe = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setBusy(true);
    try {
      await premium.subscribe(selected);
      toast.showToast('Welcome to HOMI Plus!', 'success');
      setTimeout(() => router.back(), 600);
    } catch (e) {
      console.log('subscribe error', e);
      toast.showToast('Something went wrong. Try again.', 'error');
    } finally {
      setBusy(false);
    }
  }, [premium, selected, toast]);

  const handleStartTrial = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    setBusy(true);
    try {
      await premium.startTrial();
      toast.showToast('7-day free trial started', 'success');
      setTimeout(() => router.back(), 600);
    } finally {
      setBusy(false);
    }
  }, [premium, toast]);

  const handleRestore = useCallback(async () => {
    triggerHaptic();
    const ok = await premium.restore();
    toast.showToast(
      ok ? 'Subscription restored' : 'No active subscription found',
      ok ? 'success' : 'info'
    );
  }, [premium, toast, triggerHaptic]);

  const shineTranslate = useMemo(
    () =>
      shine.interpolate({
        inputRange: [0, 1],
        outputRange: [-220, 320],
      }),
    [shine]
  );

  return (
    <View style={styles.root} testID="paywall-screen">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      <LinearGradient
        colors={['#0B1A3C', '#102C66', '#1B6EF3']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow1} />
      <View style={styles.glow2} />

      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.topBar}>
          <View style={styles.brandRow}>
            <Crown size={18} color="#FFD789" strokeWidth={2.4} />
            <Text style={styles.brandText}>HOMI PLUS</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.closeBtn}
            hitSlop={12}
            testID="paywall-close"
          >
            <X size={20} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fade,
              transform: [{ translateY: slide }],
            }}
          >
            <View style={styles.heroIconWrap}>
              <LinearGradient
                colors={['#FFD789', '#F5A623', '#F26530']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.heroIcon}
              >
                <Sparkles size={32} color="#FFFFFF" strokeWidth={2.4} />
              </LinearGradient>
              <Animated.View
                style={[
                  styles.shine,
                  { transform: [{ translateX: shineTranslate }, { rotate: '20deg' }] },
                ]}
                pointerEvents="none"
              />
            </View>

            <Text style={styles.title}>Unlock the full HOMI experience</Text>
            <Text style={styles.subtitle}>
              Reach any driver instantly. No limits. No ads. Just connection.
            </Text>

            <View style={styles.featuresCard}>
              {PLUS_FEATURES.map((f, i) => (
                <View
                  key={f.title}
                  style={[
                    styles.featureRow,
                    i !== PLUS_FEATURES.length - 1 && styles.featureRowBorder,
                  ]}
                >
                  <View style={styles.featureIcon}>
                    <Text style={styles.featureEmoji}>{f.emoji}</Text>
                  </View>
                  <View style={styles.featureText}>
                    <Text style={styles.featureTitle}>{f.title}</Text>
                    <Text style={styles.featureDesc}>{f.description}</Text>
                  </View>
                  <View style={styles.featureCheck}>
                    <Check size={14} color="#2ED3B7" strokeWidth={3} />
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.plansRow}>
              {PLANS.map((p) => {
                const active = selected === p.id;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => handleSelect(p.id)}
                    style={({ pressed }) => [
                      styles.planCard,
                      active && styles.planCardActive,
                      pressed && styles.planCardPressed,
                    ]}
                    testID={`plan-${p.id}`}
                  >
                    {p.badge ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{p.badge}</Text>
                      </View>
                    ) : null}
                    <Text style={[styles.planTitle, active && styles.planTitleActive]}>
                      {p.title}
                    </Text>
                    <Text style={[styles.planPrice, active && styles.planPriceActive]}>
                      {p.price}
                    </Text>
                    <Text style={[styles.planCadence, active && styles.planCadenceActive]}>
                      {p.cadence}
                    </Text>
                    {p.savings ? (
                      <View style={styles.savings}>
                        <Text style={styles.savingsText}>{p.savings}</Text>
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={handleSubscribe}
              disabled={busy}
              style={styles.ctaWrap}
              testID="paywall-subscribe"
            >
              <LinearGradient
                colors={['#4FB6FF', '#1B6EF3', '#2ED3B7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cta}
              >
                {busy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Zap size={18} color="#FFFFFF" strokeWidth={2.6} fill="#FFFFFF" />
                    <Text style={styles.ctaText}>
                      Continue with {PLANS.find((p) => p.id === selected)?.title}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleStartTrial}
              activeOpacity={0.7}
              style={styles.trialBtn}
              testID="paywall-trial"
            >
              <Text style={styles.trialText}>Start 7-day free trial</Text>
            </TouchableOpacity>

            <View style={styles.footerRow}>
              <TouchableOpacity onPress={handleRestore} hitSlop={8}>
                <Text style={styles.footerLink}>Restore purchases</Text>
              </TouchableOpacity>
              <View style={styles.footerDot} />
              <Text style={styles.footerHint}>Cancel anytime</Text>
            </View>

            <Text style={styles.legal}>
              Auto-renews until canceled. Manage in your account settings.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0B1A3C',
  },
  safe: {
    flex: 1,
  },
  glow1: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 215, 137, 0.25)',
  },
  glow2: {
    position: 'absolute',
    bottom: -150,
    left: -120,
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(46, 211, 183, 0.22)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  brandText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800' as const,
    letterSpacing: 1.6,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingBottom: 40,
  },
  heroIconWrap: {
    alignSelf: 'center',
    marginTop: 16,
    marginBottom: 22,
    overflow: 'hidden',
    borderRadius: 26,
  },
  heroIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 22,
    elevation: 10,
  },
  shine: {
    position: 'absolute',
    top: -20,
    left: 0,
    width: 60,
    height: 140,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  title: {
    fontSize: 30,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.6,
    marginBottom: 10,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.78)',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  featuresCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: designTokens.radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  featureRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: '#FFFFFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
  },
  featureCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(46,211,183,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plansRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  planCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: designTokens.radius.xl,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.16)',
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: 'center',
    position: 'relative',
  },
  planCardActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFD789',
    shadowColor: '#FFD789',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  planCardPressed: {
    transform: [{ scale: 0.97 }],
  },
  badge: {
    position: 'absolute',
    top: -10,
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  planTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    marginBottom: 6,
  },
  planTitleActive: {
    color: '#102C66',
  },
  planPrice: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },
  planPriceActive: {
    color: '#0B1A3C',
  },
  planCadence: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 2,
  },
  planCadenceActive: {
    color: '#5A6685',
  },
  savings: {
    marginTop: 8,
    backgroundColor: '#2ED3B7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  ctaWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 22,
    elevation: 12,
    marginBottom: 12,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  trialBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  trialText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFD789',
    textDecorationLine: 'underline',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 10,
  },
  footerLink: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600' as const,
  },
  footerDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  footerHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
  },
  legal: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 8,
    paddingHorizontal: 24,
  },
});
