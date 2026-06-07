import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Platform,
  Keyboard,
} from "react-native";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { ArrowRight, Phone, Ghost } from "lucide-react-native";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";

type Step = "welcome" | "phone" | "otp";

export default function OnboardingScreen() {
  const { completeOnboarding, setUserAsAnonymous } = useAppStore();
  const [step, setStep] = useState<Step>("welcome");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");

  const handleGhost = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (setUserAsAnonymous) {
      await setUserAsAnonymous();
    }
    if (completeOnboarding) {
      await completeOnboarding();
    }
    router.replace("/(tabs)/dashboard");
  };

  const handleApple = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Apple Sign In flow — wire to your auth handler
    if (completeOnboarding) {
      await completeOnboarding();
    }
    router.replace("/(tabs)/dashboard");
  };

  const handlePhoneContinue = () => {
    if (phone.replace(/\D/g, "").length < 9) return;
    Haptics.selectionAsync();
    Keyboard.dismiss();
    setStep("otp");
  };

  const handleVerify = async () => {
    if (otp.length < 6) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // Verify OTP via your Supabase auth handler
    if (completeOnboarding) {
      await completeOnboarding();
    }
    router.replace("/(tabs)/dashboard");
  };

  if (step === "phone") {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setStep("welcome")}
        >
          <ArrowRight
            size={18}
            color={designTokens.color.textMuted}
            strokeWidth={2}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>
        <View style={styles.inner}>
          <Text style={styles.stepTitle}>Your phone number</Text>
          <Text style={styles.stepSub}>
            We'll text you a one-time code. No password. No email.
          </Text>
          <View style={styles.phoneRow}>
            <View style={styles.countryCode}>
              <Text style={{ fontSize: 20 }}>🇮🇱</Text>
            </View>
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="050 000 0000"
              placeholderTextColor={designTokens.color.textLight}
              keyboardType="phone-pad"
              maxLength={15}
              autoFocus
            />
          </View>
          <TouchableOpacity
            style={[
              styles.primaryBtn,
              phone.replace(/\D/g, "").length < 9 && styles.btnDisabled,
            ]}
            onPress={handlePhoneContinue}
            disabled={phone.replace(/\D/g, "").length < 9}
          >
            <Text style={styles.primaryBtnText}>Send code</Text>
            <ArrowRight size={17} color="#fff" strokeWidth={2.2} />
          </TouchableOpacity>
          <View style={styles.securityNote}>
            <Text style={styles.securityText}>
              Your number is only used to deliver messages to you. It's never
              shown to other drivers.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (step === "otp") {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => setStep("phone")}
        >
          <ArrowRight
            size={18}
            color={designTokens.color.textMuted}
            strokeWidth={2}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>
        <View style={styles.inner}>
          <Text style={styles.stepTitle}>Enter the code</Text>
          <Text style={styles.stepSub}>Sent to {phone}</Text>
          <View style={styles.otpRow}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[
                  styles.otpBox,
                  otp.length === i && styles.otpBoxActive,
                  otp.length > i && styles.otpBoxFilled,
                ]}
              >
                <Text style={styles.otpChar}>{otp[i] ?? ""}</Text>
              </View>
            ))}
            <TextInput
              style={styles.otpHidden}
              value={otp}
              onChangeText={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, otp.length < 6 && styles.btnDisabled]}
            onPress={handleVerify}
            disabled={otp.length < 6}
          >
            <Text style={styles.primaryBtnText}>Verify</Text>
          </TouchableOpacity>
          <Text style={styles.resendText}>
            Didn't get it?{" "}
            <Text
              style={{ color: designTokens.color.primary, fontWeight: "600" as const }}
              onPress={() => setStep("phone")}
            >
              Resend
            </Text>
          </Text>
          <View style={styles.securityNote}>
            <Text style={styles.securityText}>
              On iPhone the code auto-fills from your SMS — you don't even have
              to type it.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Welcome screen
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>HM</Text>
          </View>
          <Text style={styles.logoName}>HOMI</Text>
        </View>
        <Text style={styles.headline}>
          Message any driver.{"\n"}Anywhere. Instantly.
        </Text>
        <Text style={styles.tagline}>
          No account needed to get started.
        </Text>

        {/* Ghost mode hero */}
        <TouchableOpacity
          style={styles.ghostCard}
          onPress={handleGhost}
          activeOpacity={0.85}
        >
          <View style={styles.ghostCardTop}>
            <View style={styles.ghostIcon}>
              <Ghost
                size={20}
                color={designTokens.color.primary}
                strokeWidth={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ghostTitle}>Continue anonymously</Text>
              <Text style={styles.ghostSub}>
                No sign-up. Send a message right now.
              </Text>
            </View>
            <ArrowRight
              size={16}
              color={designTokens.color.textMuted}
              strokeWidth={2}
            />
          </View>
          <View style={styles.ghostDemo}>
            <View style={styles.demoPlate}>
              <Text style={styles.demoPlateText}>TK·6821</Text>
            </View>
            <ArrowRight
              size={14}
              color={designTokens.color.textMuted}
              strokeWidth={2}
            />
            <Text style={styles.demoMsg} numberOfLines={1}>
              Hi! Your lights are on — saving you a dead battery
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or sign in to receive replies</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.authList}>
          <TouchableOpacity style={styles.authRow} onPress={handleApple}>
            <View style={[styles.authIcon, { backgroundColor: "#000" }]}>
              <Text style={{ color: "#fff", fontSize: 18 }}>🍎</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authTitle}>Continue with Apple</Text>
              <Text style={styles.authSub}>
                Face ID · one tap · 8 seconds
              </Text>
            </View>
            <View style={styles.fastBadge}>
              <Text style={styles.fastBadgeText}>Fastest</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.authRow}
            onPress={() => {
              Haptics.selectionAsync();
              setStep("phone");
            }}
          >
            <View
              style={[
                styles.authIcon,
                { backgroundColor: designTokens.color.primaryLight },
              ]}
            >
              <Phone
                size={18}
                color={designTokens.color.primary}
                strokeWidth={2}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.authTitle}>Continue with phone</Text>
              <Text style={styles.authSub}>
                SMS code · no password · 20 seconds
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our Terms. Your plate number is never
          required to use HOMI.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: designTokens.color.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  backBtn: {
    margin: 20,
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: designTokens.color.surface,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
  },

  logoWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 18,
  },
  logoMark: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: designTokens.color.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoMarkText: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#fff",
    letterSpacing: -0.5,
  },
  logoName: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.8,
  },

  headline: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.8,
    lineHeight: 34,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    marginBottom: 24,
  },

  ghostCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    padding: 14,
    marginBottom: 16,
  },
  ghostCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  ghostIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: designTokens.color.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  ghostTitle: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: designTokens.color.text,
  },
  ghostSub: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginTop: 1,
  },
  ghostDemo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: designTokens.color.bg,
    borderRadius: 10,
    padding: 9,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  demoPlate: {
    backgroundColor: "#FFE234",
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: "#D4B800",
    flexShrink: 0,
  },
  demoPlateText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#1A1600",
    letterSpacing: 1.5,
  },
  demoMsg: {
    flex: 1,
    fontSize: 12,
    color: designTokens.color.textMuted,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: designTokens.color.border,
  },
  dividerText: { fontSize: 12, color: designTokens.color.textMuted },

  authList: { gap: 8, marginBottom: 16 },
  authRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: designTokens.color.surface,
    borderRadius: 14,
    padding: 13,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  authIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  authTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: designTokens.color.text,
  },
  authSub: {
    fontSize: 11,
    color: designTokens.color.textMuted,
    marginTop: 1,
  },
  fastBadge: {
    backgroundColor: "#E6FAF5",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  fastBadgeText: { fontSize: 10, fontWeight: "700" as const, color: "#0A6E55" },
  terms: {
    fontSize: 11,
    color: designTokens.color.textLight,
    textAlign: "center" as const,
    lineHeight: 16,
    marginTop: "auto" as any,
    paddingBottom: 16,
  },

  // Phone step
  stepTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  stepSub: {
    fontSize: 14,
    color: designTokens.color.textMuted,
    marginBottom: 24,
  },
  phoneRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  countryCode: {
    width: 56,
    backgroundColor: designTokens.color.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: designTokens.color.surface,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: "600" as const,
    color: designTokens.color.text,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: designTokens.color.primary,
    borderRadius: 14,
    paddingVertical: 15,
    marginBottom: 14,
  },
  btnDisabled: { opacity: 0.35 },
  primaryBtnText: { fontSize: 16, fontWeight: "700" as const, color: "#fff" },

  // OTP step
  otpRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    position: "relative" as const,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
    backgroundColor: designTokens.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  otpBoxActive: {
    borderColor: designTokens.color.primary,
    borderWidth: 2,
    backgroundColor: designTokens.color.primaryLight,
  },
  otpBoxFilled: {
    borderColor: designTokens.color.primarySoft,
    backgroundColor: designTokens.color.primaryLight,
  },
  otpChar: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 22,
    fontWeight: "700" as const,
    color: designTokens.color.text,
  },
  otpHidden: {
    position: "absolute",
    opacity: 0,
    width: "100%",
    height: "100%",
  },
  resendText: {
    textAlign: "center" as const,
    fontSize: 13,
    color: designTokens.color.textMuted,
    marginBottom: 16,
  },
  securityNote: {
    backgroundColor: designTokens.color.surface,
    borderRadius: 10,
    padding: 11,
    borderWidth: 0.5,
    borderColor: designTokens.color.border,
  },
  securityText: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    lineHeight: 17,
  },
});
