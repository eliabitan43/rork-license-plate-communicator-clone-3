import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
  Animated,
  Easing,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  ShieldCheck,
  Check,
  X,
  AlertCircle,
  FileText,
  Eye,
  Lock,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { designTokens } from '@/constants/theme';
import { useAppStore } from '@/hooks/useAppStore';
import { usePlateClaims } from '@/hooks/usePlateClaims';
import { useToast } from '@/hooks/useToast';
import { Vehicle, UserBadge } from '@/types';

type Step = 'intro' | 'capture' | 'review' | 'submitting' | 'done';

export default function VerifyPlateScreen() {
  const params = useLocalSearchParams<{ vehicleId?: string; plate?: string }>();
  const { userProfile, saveProfile, awardBadge } = useAppStore();
  const claims = usePlateClaims();
  const { showToast } = useToast();

  const vehicle: Vehicle | null = useMemo(() => {
    if (!userProfile?.vehicles) return null;
    if (params.vehicleId) {
      return userProfile.vehicles.find((v) => v.id === params.vehicleId) ?? null;
    }
    if (params.plate) {
      const target = params.plate.toString().toUpperCase();
      return userProfile.vehicles.find((v) => v.licensePlate.toUpperCase() === target) ?? null;
    }
    return userProfile.vehicles.find((v) => v.isPrimary) ?? userProfile.vehicles[0] ?? null;
  }, [userProfile?.vehicles, params.vehicleId, params.plate]);

  const [step, setStep] = useState<Step>('intro');
  const [docImage, setDocImage] = useState<string | null>(null);

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(16)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 60, friction: 11, useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  useEffect(() => {
    if (step === 'done') {
      Animated.spring(checkScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }).start();
    } else {
      checkScale.setValue(0);
    }
  }, [step, checkScale]);

  const pickFromLibrary = useCallback(async () => {
    try {
      if (Platform.OS !== 'web') {
        try { await Haptics.selectionAsync(); } catch {}
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setDocImage(result.assets[0].uri);
        setStep('review');
      }
    } catch (e) {
      console.log('[VerifyPlate] library pick failed', e);
      showToast('Could not load image', 'error', 1800);
    }
  }, [showToast]);

  const captureWithCamera = useCallback(async () => {
    try {
      if (Platform.OS === 'web') {
        showToast('Camera capture is mobile-only. Choose from library.', 'error', 2400);
        return;
      }
      try { await Haptics.selectionAsync(); } catch {}
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        showToast('Camera permission denied', 'error', 1800);
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });
      if (!result.canceled && result.assets[0]) {
        setDocImage(result.assets[0].uri);
        setStep('review');
      }
    } catch (e) {
      console.log('[VerifyPlate] camera failed', e);
      showToast('Could not open camera', 'error', 1800);
    }
  }, [showToast]);

  const handleSubmit = useCallback(async () => {
    if (!vehicle || !userProfile || !docImage) return;
    setStep('submitting');
    if (Platform.OS !== 'web') {
      try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    }

    await new Promise((r) => setTimeout(r, 1400));

    try {
      const updatedVehicles = userProfile.vehicles.map((v) =>
        v.id === vehicle.id
          ? { ...v, verificationStatus: 'verified' as const, plateImage: docImage }
          : v
      );
      await saveProfile({ ...userProfile, vehicles: updatedVehicles });
      await claims.markVerified(vehicle.licensePlate, docImage);

      const hasBadge = userProfile.badges?.some((b) => b.type === 'trusted_member');
      if (!hasBadge) {
        const badge: UserBadge = {
          id: `verified-${vehicle.id}-${Date.now()}`,
          type: 'trusted_member',
          title: 'Verified Plate',
          description: `Confirmed ownership of ${vehicle.licensePlate}`,
          icon: 'shield-check',
          color: designTokens.color.success,
          earnedAt: new Date().toISOString(),
        };
        await awardBadge(badge);
      }

      setStep('done');
      showToast('Plate verified', 'success', 2000);
    } catch (e) {
      console.log('[VerifyPlate] submit failed', e);
      setStep('review');
      showToast('Verification failed. Try again.', 'error', 2200);
    }
  }, [vehicle, userProfile, docImage, saveProfile, claims, awardBadge, showToast]);

  const goBack = useCallback(() => {
    try { router.back(); } catch { router.replace('/vehicle-management'); }
  }, []);

  return (
    <SafeAreaView style={styles.container} testID="verify-plate-screen">
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} activeOpacity={0.7} testID="verify-back">
          <ArrowLeft size={20} color={designTokens.color.text} strokeWidth={2.4} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify plate</Text>
        <View style={styles.backBtn} />
      </View>

      {!vehicle ? (
        <View style={styles.emptyWrap}>
          <AlertCircle size={32} color={designTokens.color.textLight} />
          <Text style={styles.emptyText}>No vehicle selected</Text>
        </View>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
            <View style={styles.heroCard}>
              <LinearGradient
                colors={["#0B1A3C", "#1B6EF3"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroIconWrap}>
                <ShieldCheck size={26} color="#FFD789" strokeWidth={2.4} />
              </View>
              <View style={styles.plateChip}>
                <Text style={styles.plateChipText}>{vehicle.licensePlate}</Text>
              </View>
              <Text style={styles.heroTitle}>Get your trusted plate badge</Text>
              <Text style={styles.heroSub}>
                Snap your registration card or insurance document. We use it once to confirm
                ownership — it&apos;s never shared.
              </Text>
            </View>

            <Stepper step={step} />

            {step === 'intro' ? (
              <>
                <View style={styles.howCard}>
                  <Text style={styles.sectionLabel}>How it works</Text>
                  <HowRow num={1} text={`Photograph a document showing plate ${vehicle.licensePlate}.`} />
                  <HowRow num={2} text="We confirm the plate matches and approve it." />
                  <HowRow num={3} text="You unlock the Verified Plate badge & higher reply rates." />
                </View>

                <View style={styles.privacyCard}>
                  <View style={styles.privacyRow}>
                    <Lock size={14} color={designTokens.color.success} strokeWidth={2.4} />
                    <Text style={styles.privacyText}>
                      Stored privately on your device. Deleted after review.
                    </Text>
                  </View>
                  <View style={styles.privacyRow}>
                    <Eye size={14} color={designTokens.color.success} strokeWidth={2.4} />
                    <Text style={styles.privacyText}>
                      We never display your address or full name.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.cta}
                  onPress={() => setStep('capture')}
                  activeOpacity={0.92}
                  testID="verify-start"
                >
                  <LinearGradient
                    colors={["#1B6EF3", "#2ED3B7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <ShieldCheck size={18} color="#FFFFFF" strokeWidth={2.6} />
                  <Text style={styles.ctaText}>Start verification</Text>
                </TouchableOpacity>
              </>
            ) : null}

            {step === 'capture' ? (
              <>
                <View style={styles.captureCard}>
                  <FileText size={28} color={designTokens.color.primary} strokeWidth={2.2} />
                  <Text style={styles.captureTitle}>Add your document</Text>
                  <Text style={styles.captureSub}>
                    Registration, title, or insurance card showing {vehicle.licensePlate}.
                  </Text>

                  <TouchableOpacity style={styles.primaryBtn} onPress={captureWithCamera} activeOpacity={0.9} testID="verify-camera">
                    <Camera size={18} color="#FFFFFF" strokeWidth={2.4} />
                    <Text style={styles.primaryBtnText}>Take photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary} activeOpacity={0.85} testID="verify-library">
                    <ImageIcon size={18} color={designTokens.color.primary} strokeWidth={2.4} />
                    <Text style={styles.secondaryBtnText}>Choose from library</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}

            {step === 'review' && docImage ? (
              <>
                <View style={styles.reviewCard}>
                  <Image source={{ uri: docImage }} style={styles.reviewImage} resizeMode="cover" />
                  <View style={styles.reviewActions}>
                    <TouchableOpacity style={styles.secondaryBtn} onPress={() => { setDocImage(null); setStep('capture'); }} activeOpacity={0.85} testID="verify-retake">
                      <X size={16} color={designTokens.color.primary} strokeWidth={2.4} />
                      <Text style={styles.secondaryBtnText}>Retake</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cta} onPress={handleSubmit} activeOpacity={0.92} testID="verify-submit">
                      <LinearGradient
                        colors={["#1B6EF3", "#2ED3B7"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <Check size={18} color="#FFFFFF" strokeWidth={2.6} />
                      <Text style={styles.ctaText}>Submit</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}

            {step === 'submitting' ? (
              <View style={styles.submittingCard}>
                <ActivityIndicator size="large" color={designTokens.color.primary} />
                <Text style={styles.submittingTitle}>Verifying ownership…</Text>
                <Text style={styles.submittingSub}>This usually takes a few seconds.</Text>
              </View>
            ) : null}

            {step === 'done' ? (
              <View style={styles.doneCard}>
                <Animated.View style={[styles.doneIcon, { transform: [{ scale: checkScale }] }]}>
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Check size={36} color="#FFFFFF" strokeWidth={3.2} />
                </Animated.View>
                <Text style={styles.doneTitle}>You&apos;re verified</Text>
                <Text style={styles.doneSub}>
                  {vehicle.licensePlate} now shows a Verified Plate badge across HOMI.
                </Text>
                <TouchableOpacity
                  style={[styles.cta, { marginTop: 18 }]}
                  onPress={goBack}
                  activeOpacity={0.92}
                  testID="verify-done-close"
                >
                  <LinearGradient
                    colors={["#1B6EF3", "#2ED3B7"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <Text style={styles.ctaText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={{ height: 32 }} />
          </Animated.View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Stepper({ step }: { step: Step }) {
  const idx = step === 'intro' ? 0 : step === 'capture' ? 1 : step === 'review' || step === 'submitting' ? 2 : 3;
  const items = ['Intro', 'Capture', 'Review', 'Verified'];
  return (
    <View style={styles.stepper}>
      {items.map((label, i) => {
        const active = i <= idx;
        return (
          <View key={label} style={styles.stepperItem}>
            <View style={[styles.stepperDot, active && styles.stepperDotActive]}>
              {i < idx ? (
                <Check size={10} color="#FFFFFF" strokeWidth={3.2} />
              ) : (
                <Text style={[styles.stepperNum, active && styles.stepperNumActive]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stepperLabel, active && styles.stepperLabelActive]}>{label}</Text>
            {i < items.length - 1 ? <View style={[styles.stepperLine, active && styles.stepperLineActive]} /> : null}
          </View>
        );
      })}
    </View>
  );
}

function HowRow({ num, text }: { num: number; text: string }) {
  return (
    <View style={styles.howRow}>
      <View style={styles.howNum}>
        <Text style={styles.howNumText}>{num}</Text>
      </View>
      <Text style={styles.howText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: designTokens.color.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: designTokens.color.surface,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' as const, color: designTokens.color.text, letterSpacing: -0.2 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 14, color: designTokens.color.textLight },

  heroCard: {
    borderRadius: 24, padding: 22, overflow: 'hidden', marginBottom: 16,
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  plateChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 9, marginBottom: 12,
  },
  plateChipText: {
    fontSize: 16, fontWeight: '800' as const, color: '#0B1A3C',
    letterSpacing: 2.5, fontVariant: ['tabular-nums'],
  },
  heroTitle: { fontSize: 22, fontWeight: '800' as const, color: '#FFFFFF', letterSpacing: -0.4, marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 },

  stepper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  stepperItem: { flex: 1, alignItems: 'center', position: 'relative' },
  stepperDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: designTokens.color.borderMuted,
    alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  stepperDotActive: { backgroundColor: designTokens.color.primary },
  stepperNum: { fontSize: 11, fontWeight: '800' as const, color: designTokens.color.textLight },
  stepperNumActive: { color: '#FFFFFF' },
  stepperLabel: {
    fontSize: 10, fontWeight: '700' as const,
    color: designTokens.color.textLight, marginTop: 6, letterSpacing: 0.6,
  },
  stepperLabelActive: { color: designTokens.color.text },
  stepperLine: {
    position: 'absolute', top: 11, right: '-50%', width: '100%', height: 2,
    backgroundColor: designTokens.color.borderMuted, zIndex: 1,
  },
  stepperLineActive: { backgroundColor: designTokens.color.primary },

  sectionLabel: {
    fontSize: 11, fontWeight: '800' as const,
    color: designTokens.color.textLight, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 12,
  },
  howCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 18, padding: 18, borderWidth: 1,
    borderColor: designTokens.color.border, marginBottom: 12,
  },
  howRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  howNum: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: `${designTokens.color.primary}14`,
    alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  howNumText: { fontSize: 11, fontWeight: '800' as const, color: designTokens.color.primary },
  howText: { flex: 1, fontSize: 13, color: designTokens.color.textMuted, lineHeight: 19 },

  privacyCard: {
    backgroundColor: designTokens.color.successSoft,
    borderRadius: 16, padding: 14, marginBottom: 18,
    gap: 8,
  },
  privacyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  privacyText: { flex: 1, fontSize: 12, color: '#0B5C28', lineHeight: 17, fontWeight: '500' as const },

  cta: {
    height: 54, borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingHorizontal: 20,
    shadowColor: '#1B6EF3', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28, shadowRadius: 18, elevation: 6,
    flex: 1,
  },
  ctaText: { fontSize: 16, fontWeight: '700' as const, color: '#FFFFFF', letterSpacing: 0.2 },

  captureCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20, padding: 22,
    borderWidth: 1, borderColor: designTokens.color.border,
    alignItems: 'center', gap: 10, marginBottom: 16,
  },
  captureTitle: { fontSize: 18, fontWeight: '700' as const, color: designTokens.color.text, marginTop: 4 },
  captureSub: { fontSize: 13, color: designTokens.color.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 8 },

  primaryBtn: {
    width: '100%', height: 52, borderRadius: 14,
    backgroundColor: designTokens.color.primary,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  primaryBtnText: { fontSize: 15, fontWeight: '700' as const, color: '#FFFFFF' },

  secondaryBtn: {
    flex: 1,
    height: 48, borderRadius: 14,
    backgroundColor: `${designTokens.color.primary}10`,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' as const, color: designTokens.color.primary },

  reviewCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20, padding: 14,
    borderWidth: 1, borderColor: designTokens.color.border,
    marginBottom: 16,
  },
  reviewImage: {
    width: '100%', aspectRatio: 4 / 3,
    borderRadius: 14, marginBottom: 14,
    backgroundColor: designTokens.color.borderMuted,
  },
  reviewActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  submittingCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 20, padding: 36,
    borderWidth: 1, borderColor: designTokens.color.border,
    alignItems: 'center', gap: 12, marginBottom: 16,
  },
  submittingTitle: { fontSize: 16, fontWeight: '700' as const, color: designTokens.color.text },
  submittingSub: { fontSize: 13, color: designTokens.color.textMuted },

  doneCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 24, padding: 28,
    borderWidth: 1, borderColor: `${designTokens.color.success}40`,
    alignItems: 'center', gap: 6, marginBottom: 16,
  },
  doneIcon: {
    width: 80, height: 80, borderRadius: 40,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.36,
    shadowRadius: 20,
    elevation: 8,
  },
  doneTitle: { fontSize: 22, fontWeight: '800' as const, color: designTokens.color.text, letterSpacing: -0.3 },
  doneSub: { fontSize: 14, color: designTokens.color.textMuted, textAlign: 'center', lineHeight: 20 },
});
