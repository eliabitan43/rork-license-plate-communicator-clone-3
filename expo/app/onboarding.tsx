import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ghost, Phone, ChevronLeft, Apple } from 'lucide-react-native';
import { designTokens, getShadowStyle } from '@/constants/theme';
import { HomiLogo } from '@/components/HomiLogo';
import { useAppStore } from '@/hooks/useAppStore';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';

type OnboardingStep = 'welcome' | 'phone' | 'otp';

const IL_DIAL_CODE = '+972';
const OTP_LENGTH = 6;

function normalizePhoneDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function isValidIlPhone(digits: string): boolean {
  // Local Israeli mobile numbers: 8–10 digits (e.g. 0501234567 or 501234567).
  return digits.length >= 8 && digits.length <= 10;
}

function toE164(digits: string): string {
  const local = digits.startsWith('0') ? digits.slice(1) : digits;
  return `${IL_DIAL_CODE}${local}`;
}

type OtpFlow = 'sms' | 'phone_change' | 'stub';

// DECISION: when Supabase isn't configured (pre-provisioning builds) the OTP flow
// degrades to a local stub (any 6-digit code verifies) so onboarding stays testable.
async function requestOtpCode(
  phoneE164: string,
): Promise<{ ok: boolean; error?: string; flow: OtpFlow }> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true, flow: 'stub' };
  }

  // Anonymous → registered upgrade is identity linking on the SAME auth row:
  // updateUser({ phone }) sends the code and a later verifyOtp(type: 'phone_change')
  // flips is_anonymous while preserving message history and referral attribution.
  const { data } = await supabase.auth.getUser();
  if (data.user?.is_anonymous) {
    const { error } = await supabase.auth.updateUser({ phone: phoneE164 });
    if (error) return { ok: false, error: error.message, flow: 'phone_change' };
    return { ok: true, flow: 'phone_change' };
  }

  const { error } = await supabase.auth.signInWithOtp({ phone: phoneE164 });
  if (error) return { ok: false, error: error.message, flow: 'sms' };
  return { ok: true, flow: 'sms' };
}

async function verifyOtpCode(
  phoneE164: string,
  code: string,
  flow: OtpFlow,
): Promise<{ ok: boolean; error?: string; userId?: string }> {
  if (code.length !== OTP_LENGTH) {
    return { ok: false, error: 'Enter the 6-digit code.' };
  }
  if (!supabase || flow === 'stub') {
    await new Promise((r) => setTimeout(r, 600));
    return { ok: true };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: code,
    type: flow === 'phone_change' ? 'phone_change' : 'sms',
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, userId: data.user?.id };
}

export default function OnboardingScreen() {
  const appStore = useAppStore();
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [phoneDigits, setPhoneDigits] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFlow, setOtpFlow] = useState<OtpFlow>('stub');
  const [busy, setBusy] = useState<'ghost' | 'phone' | 'otp' | null>(null);
  const otpInputRef = useRef<TextInput>(null);

  const phoneE164 = useMemo(() => toE164(normalizePhoneDigits(phoneDigits)), [phoneDigits]);

  const handleGhostMode = useCallback(async () => {
    if (busy) return;
    setBusy('ghost');
    try {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      await appStore?.setUserAsAnonymous?.();
      await appStore?.completeOnboarding?.();
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Ghost mode failed:', error);
      Alert.alert('Something went wrong', 'Please try again.');
      setBusy(null);
    }
  }, [appStore, busy]);

  const handleApple = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    // DECISION: expo-apple-authentication is not installed and Apple SSO needs
    // a paid Apple Developer capability — shipping the entry point now, wiring later.
    Alert.alert(
      'Apple Sign-In is coming soon',
      'Use ghost mode or your phone number for now — you can link Apple later without losing anything.',
    );
  }, []);

  const handleSendCode = useCallback(async () => {
    if (busy) return;
    const digits = normalizePhoneDigits(phoneDigits);
    if (!isValidIlPhone(digits)) {
      if (Platform.OS !== 'web') {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      Alert.alert('Check the number', 'Enter a valid Israeli mobile number.');
      return;
    }
    setBusy('phone');
    try {
      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const res = await requestOtpCode(toE164(digits));
      if (!res.ok) {
        Alert.alert('Could not send code', res.error ?? 'Please try again.');
        return;
      }
      setOtpFlow(res.flow);
      setOtp('');
      setStep('otp');
      setTimeout(() => otpInputRef.current?.focus(), 350);
    } finally {
      setBusy(null);
    }
  }, [busy, phoneDigits]);

  const handleVerify = useCallback(async () => {
    if (busy) return;
    setBusy('otp');
    try {
      const res = await verifyOtpCode(phoneE164, otp, otpFlow);
      if (!res.ok) {
        if (Platform.OS !== 'web') {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        Alert.alert('Invalid code', res.error ?? 'Please try again.');
        return;
      }

      if (Platform.OS !== 'web') {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const now = new Date().toISOString();
      // Identity linking: an upgrading ghost user keeps their existing local
      // profile (vehicles, badges, history) — only identity fields change.
      const existing = appStore?.userProfile ?? null;
      const profile: UserProfile = {
        createdAt: now,
        allowNotifications: false,
        rating: 0,
        reviewCount: 0,
        communityScore: 0,
        badges: [],
        accountType: 'personal',
        blockedUsers: [],
        trustedContacts: [],
        emergencyContacts: [],
        preferredLanguage: 'en',
        vehicles: [],
        emailVerified: false,
        ...(existing ?? {}),
        id: res.userId ?? existing?.id ?? `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        phone: phoneE164,
        isAnonymous: false,
        phoneVerified: true,
        verificationStatus: 'verified',
        termsAccepted: true,
        termsAcceptedAt: existing?.termsAcceptedAt ?? now,
      };
      // saveProfile persists the profile and marks onboarding complete.
      await appStore?.saveProfile?.(profile);
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('OTP verify failed:', error);
      Alert.alert('Something went wrong', 'Please try again.');
    } finally {
      setBusy(null);
    }
  }, [appStore, busy, otp, phoneE164]);

  const handleResend = useCallback(async () => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    const res = await requestOtpCode(phoneE164);
    if (res.ok) setOtpFlow(res.flow);
    Alert.alert(
      res.ok ? 'Code sent' : 'Could not resend',
      res.ok ? `We sent a new code to ${phoneE164}.` : (res.error ?? 'Please try again.'),
    );
  }, [phoneE164]);

  const goBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      void Haptics.selectionAsync();
    }
    setStep((prev) => (prev === 'otp' ? 'phone' : 'welcome'));
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'welcome' && (
            <View style={styles.stepWrap} testID="onboarding-welcome">
              <View style={styles.logoWrap}>
                <HomiLogo size={64} />
              </View>
              <Text style={styles.headline} accessibilityRole="header">
                Message any driver.{'\n'}Anywhere. Instantly.
              </Text>
              <Text style={styles.subhead}>No account needed.</Text>

              <Pressable
                onPress={handleGhostMode}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel="Continue anonymously, no sign-up needed"
                style={({ pressed }) => [
                  styles.ghostCard,
                  pressed && styles.pressed,
                  busy === 'ghost' && styles.busyCard,
                ]}
                testID="ghost-mode-cta"
              >
                <View style={styles.ghostHeader}>
                  <View style={styles.ghostIconWrap}>
                    <Ghost size={26} color={designTokens.color.primaryOn} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.ghostTitle}>Continue anonymously</Text>
                    <Text style={styles.ghostSubtitle}>No sign-up. Send in seconds.</Text>
                  </View>
                  {busy === 'ghost' && (
                    <ActivityIndicator color={designTokens.color.primaryOn} />
                  )}
                </View>
                <View style={styles.demoRow}>
                  <Text style={styles.demoFlag}>🇮🇱</Text>
                  <View style={styles.demoPlate}>
                    <Text style={styles.demoPlateText}>TK·6821</Text>
                  </View>
                  <Text style={styles.demoMessage} numberOfLines={1}>
                    “Hi! Your headlights are still on…”
                  </Text>
                </View>
              </Pressable>

              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or sign in</Text>
                <View style={styles.dividerLine} />
              </View>

              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={handleApple}
                  accessibilityRole="button"
                  accessibilityLabel="Sign in with Apple"
                  style={({ pressed }) => [styles.authButton, pressed && styles.pressed]}
                  testID="apple-sso-cta"
                >
                  <Apple size={20} color={designTokens.color.text} />
                  <Text style={styles.authButtonText}>Continue with Apple</Text>
                  <Text style={styles.authButtonHint}>Fastest</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') void Haptics.selectionAsync();
                  setStep('phone');
                }}
                accessibilityRole="button"
                accessibilityLabel="Sign in with phone number"
                style={({ pressed }) => [styles.authButton, pressed && styles.pressed]}
                testID="phone-cta"
              >
                <Phone size={20} color={designTokens.color.text} />
                <Text style={styles.authButtonText}>Continue with phone</Text>
                <Text style={styles.authButtonHint}>20 seconds</Text>
              </Pressable>

              <Text style={styles.terms}>
                By continuing you agree to HOMI's Terms and acknowledge the Privacy Policy.
              </Text>
            </View>
          )}

          {step === 'phone' && (
            <View style={styles.stepWrap} testID="onboarding-phone">
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.backButton}
                hitSlop={8}
              >
                <ChevronLeft size={24} color={designTokens.color.text} />
              </Pressable>

              <Text style={styles.stepTitle} accessibilityRole="header">
                Your phone number
              </Text>
              <Text style={styles.stepSubtitle}>
                We'll text you a one-time code. No password. No email.
              </Text>

              <View style={styles.phoneRow}>
                <View style={styles.dialChip}>
                  <Text style={styles.dialChipText}>🇮🇱 {IL_DIAL_CODE}</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  value={phoneDigits}
                  onChangeText={(v) => setPhoneDigits(normalizePhoneDigits(v))}
                  placeholder="050 000 0000"
                  placeholderTextColor={designTokens.color.textLight}
                  keyboardType="phone-pad"
                  textContentType="telephoneNumber"
                  autoComplete="tel"
                  autoFocus
                  maxLength={10}
                  accessibilityLabel="Phone number"
                  testID="phone-input"
                />
              </View>

              <Pressable
                onPress={handleSendCode}
                disabled={busy !== null}
                accessibilityRole="button"
                accessibilityLabel="Send verification code"
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.pressed,
                  busy === 'phone' && styles.busyCard,
                ]}
                testID="send-code-cta"
              >
                {busy === 'phone' ? (
                  <ActivityIndicator color={designTokens.color.primaryOn} />
                ) : (
                  <Text style={styles.primaryButtonText}>Send code →</Text>
                )}
              </Pressable>

              <Text style={styles.securityNote}>
                Your number is only used to deliver messages to you. It is never shown to
                other drivers.
              </Text>
            </View>
          )}

          {step === 'otp' && (
            <View style={styles.stepWrap} testID="onboarding-otp">
              <Pressable
                onPress={goBack}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={styles.backButton}
                hitSlop={8}
              >
                <ChevronLeft size={24} color={designTokens.color.text} />
              </Pressable>

              <Text style={styles.stepTitle} accessibilityRole="header">
                Enter the code
              </Text>
              <Text style={styles.stepSubtitle}>Sent to {phoneE164}</Text>

              <Pressable
                onPress={() => otpInputRef.current?.focus()}
                accessibilityLabel="One-time code input"
              >
                <View style={styles.otpRow} pointerEvents="none">
                  {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                    <View
                      key={i}
                      style={[styles.otpBox, i === otp.length && styles.otpBoxActive]}
                    >
                      <Text style={styles.otpDigit}>{otp[i] ?? ''}</Text>
                    </View>
                  ))}
                </View>
              </Pressable>
              <TextInput
                ref={otpInputRef}
                style={styles.hiddenInput}
                value={otp}
                onChangeText={(v) => setOtp(normalizePhoneDigits(v).slice(0, OTP_LENGTH))}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                maxLength={OTP_LENGTH}
                testID="otp-input"
              />

              <Pressable
                onPress={handleVerify}
                disabled={busy !== null || otp.length !== OTP_LENGTH}
                accessibilityRole="button"
                accessibilityLabel="Verify code"
                accessibilityState={{ disabled: otp.length !== OTP_LENGTH }}
                style={({ pressed }) => [
                  styles.primaryButton,
                  otp.length !== OTP_LENGTH && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
                testID="verify-cta"
              >
                {busy === 'otp' ? (
                  <ActivityIndicator color={designTokens.color.primaryOn} />
                ) : (
                  <Text style={styles.primaryButtonText}>Verify</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleResend}
                accessibilityRole="button"
                accessibilityLabel="Resend code"
                style={styles.resendButton}
              >
                <Text style={styles.resendText}>Didn't get it? Resend</Text>
              </Pressable>

              <Text style={styles.securityNote}>
                On iPhone the code auto-fills from SMS automatically.
              </Text>
            </View>
          )}
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  stepWrap: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headline: {
    fontSize: designTokens.type.h2.size,
    fontWeight: designTokens.type.h1.weight as '800',
    lineHeight: designTokens.type.h2.lineHeight,
    letterSpacing: designTokens.type.h2.letterSpacing,
    color: designTokens.color.text,
    textAlign: 'center',
  },
  subhead: {
    fontSize: designTokens.type.subhead.size,
    fontWeight: '500',
    color: designTokens.color.textMuted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  ghostCard: {
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.xl,
    padding: 18,
    ...getShadowStyle('md'),
    shadowColor: designTokens.color.primary,
  },
  ghostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ghostIconWrap: {
    width: 46,
    height: 46,
    borderRadius: designTokens.radius.md,
    backgroundColor: designTokens.glass.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostTitle: {
    fontSize: designTokens.type.title.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  ghostSubtitle: {
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.primaryLight,
    marginTop: 2,
  },
  demoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: designTokens.glass.dark.border,
    borderRadius: designTokens.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  demoFlag: {
    fontSize: 16,
  },
  demoPlate: {
    backgroundColor: designTokens.plate.background,
    borderWidth: 1,
    borderColor: designTokens.plate.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  demoPlateText: {
    color: designTokens.plate.text,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  demoMessage: {
    flex: 1,
    fontSize: designTokens.type.bodySmall.size,
    color: designTokens.color.primaryLight,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: designTokens.color.border,
  },
  dividerText: {
    fontSize: designTokens.type.caption.size,
    fontWeight: '600',
    color: designTokens.color.textLight,
    textTransform: 'uppercase',
    letterSpacing: designTokens.type.overline.letterSpacing,
  },
  authButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: designTokens.color.surface,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 18,
    minHeight: 56,
    marginBottom: 12,
  },
  authButtonText: {
    flex: 1,
    fontSize: designTokens.type.subhead.size,
    fontWeight: '600',
    color: designTokens.color.text,
  },
  authButtonHint: {
    fontSize: designTokens.type.caption.size,
    fontWeight: '600',
    color: designTokens.color.primary,
  },
  terms: {
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textLight,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: designTokens.radius.md,
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: designTokens.type.h2.size,
    fontWeight: designTokens.type.h2.weight as '700',
    color: designTokens.color.text,
  },
  stepSubtitle: {
    fontSize: designTokens.type.body.size,
    color: designTokens.color.textMuted,
    marginTop: 8,
    marginBottom: 28,
    lineHeight: designTokens.type.body.lineHeight,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  dialChip: {
    backgroundColor: designTokens.color.surfaceWarm,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dialChipText: {
    fontSize: designTokens.type.body.size,
    fontWeight: '600',
    color: designTokens.color.text,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: designTokens.color.surfaceWarm,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 16,
    minHeight: 56,
    fontSize: designTokens.type.title.size,
    fontWeight: '600',
    color: designTokens.color.text,
    letterSpacing: 0.5,
  },
  primaryButton: {
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.lg,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    ...getShadowStyle('md'),
    shadowColor: designTokens.color.primary,
  },
  primaryButtonText: {
    fontSize: designTokens.type.subhead.size,
    fontWeight: '700',
    color: designTokens.color.primaryOn,
  },
  disabledButton: {
    opacity: designTokens.state.disabled.opacity,
  },
  securityNote: {
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textLight,
    marginTop: 20,
    lineHeight: 18,
    textAlign: 'center',
  },
  otpRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 24,
  },
  otpBox: {
    width: 46,
    height: 56,
    borderRadius: designTokens.radius.md,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    backgroundColor: designTokens.color.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: designTokens.color.primary,
  },
  otpDigit: {
    fontSize: designTokens.type.h3.size,
    fontWeight: '700',
    color: designTokens.color.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },
  resendButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  resendText: {
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: '600',
    color: designTokens.color.primary,
  },
  pressed: {
    opacity: 0.85,
  },
  busyCard: {
    opacity: 0.8,
  },
});
