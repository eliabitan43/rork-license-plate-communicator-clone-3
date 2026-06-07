import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Switch,
  Modal,
  Animated,
  Image,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Apple, Mail, Shield, Check, Globe, ChevronDown, MapPin, CheckCircle, Bell, ArrowRight, UserX, Phone } from "lucide-react-native";
import { HomiLogo } from "@/components/HomiLogo";

import { router } from "expo-router";
import { formatCountryLabel } from "@/constants/actionIcons";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { UserProfile, Vehicle } from "@/types";
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, getLanguageName } from "@/constants/languages";
import { COUNTRIES, getRegionsByCountry, getCountryByCode, getRegionByCode } from "@/constants/regions";

const MAX_PLATE_LENGTH = 12;
const VERIFICATION_CODE_LENGTH = 6;

function normalizePlateInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, MAX_PLATE_LENGTH);
}

function normalizeVerificationCode(value: string): string {
  return value.replace(/\D/g, "").slice(0, VERIFICATION_CODE_LENGTH);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function hasValidPhoneDigits(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7;
}

const HOMI_PIGEON_URI = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/47kkmyiujuadsl2f3ecwu';
const BG_BLUR_URI = 'https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=1200&q=60&blur=80';

export default function OnboardingScreen() {
  const appStore = useAppStore();
  const [step, setStep] = useState<0 | 1 | 2>(0);

  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  const [country, setCountry] = useState("US");
  const [state, setState] = useState("");
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);

  const [termsAccepted, setTermsAccepted] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardFade = useRef(new Animated.Value(0)).current;
  const pigeonY = useRef(new Animated.Value(0)).current;
  const pigeonRotate = useRef(new Animated.Value(0)).current;
  const pigeonScale = useRef(new Animated.Value(1)).current;
  const pigeonGlow = useRef(new Animated.Value(0.4)).current;
  const plateInputRef = useRef<TextInput | null>(null);
  const verificationInputRef = useRef<TextInput | null>(null);
  const displayNameInputRef = useRef<TextInput | null>(null);

  const saveProfile = appStore?.saveProfile;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardFade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardSlide, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, [fadeAnim, slideAnim, cardFade, cardSlide]);

  useEffect(() => {
    cardFade.setValue(0);
    cardSlide.setValue(30);
    Animated.parallel([
      Animated.timing(cardFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.spring(cardSlide, { toValue: 0, tension: 65, friction: 9, useNativeDriver: true }),
    ]).start();
  }, [step, cardFade, cardSlide]);

  useEffect(() => {
    pigeonY.setValue(0);
    pigeonRotate.setValue(0);
    pigeonScale.setValue(1);
    pigeonGlow.setValue(0.6);
  }, [pigeonY, pigeonRotate, pigeonScale, pigeonGlow]);

  const handleSocialAuth = (provider: 'apple' | 'google') => {
    console.log(`Starting ${provider} sign-in flow`);
    Alert.alert(
      `Continue with ${provider === 'apple' ? 'Apple' : 'Google'}`,
      'Social sign-in is not yet wired up. Continuing to account setup.',
      [
        {
          text: 'Continue',
          onPress: () => {
            setContactMethod('email');
            setStep(1);
          },
        },
      ],
    );
  };

  const handleEmailFlow = (mode: 'signup' | 'login') => {
    console.log(`Email ${mode} pressed`);
    setContactMethod('email');
    setStep(1);
  };

  if (!appStore || !saveProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#1B6EF3', '#1458C7', '#0D3F94']}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.3, y: 1 }}
        />
        <View style={styles.loadingWrap}>
          <HomiLogo size={100} showSlogan={false} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const sendVerificationCode = async () => {
    const contact = contactMethod === 'email' ? email.trim() : phone.trim();

    if (!contact) {
      Alert.alert("Required", `Please enter your ${contactMethod === 'email' ? 'email' : 'phone number'}.`);
      return;
    }

    if (contactMethod === 'email' && !isValidEmail(contact)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }

    if (contactMethod === 'phone' && !hasValidPhoneDigits(contact)) {
      Alert.alert("Invalid Phone", "Please enter a valid phone number.");
      return;
    }

    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      const demoCode = "123456";
      setVerificationCode(demoCode);
      verificationInputRef.current?.focus();
      Alert.alert("Code Sent", `Verification code sent to ${contact}. For demo purposes, code has been auto-filled.`);
    }, 1500);
  };

  const handleNext = () => {
    if (step === 1) {
      const contact = contactMethod === 'email' ? email.trim() : phone.trim();
      const normalizedCode = normalizeVerificationCode(verificationCode);

      if (!contact) {
        Alert.alert("Required", `Please enter your ${contactMethod === 'email' ? 'email' : 'phone number'}.`);
        return;
      }

      if (contactMethod === 'email' && !isValidEmail(contact)) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
      }

      if (contactMethod === 'phone' && !hasValidPhoneDigits(contact)) {
        Alert.alert("Invalid Phone", "Please enter a valid phone number.");
        return;
      }

      if (normalizedCode.length !== VERIFICATION_CODE_LENGTH) {
        Alert.alert("Required", "Please enter the 6-digit verification code.");
        return;
      }

      setVerificationCode(normalizedCode);
      setShowNotificationPrompt(true);
    }
  };

  const notifChoiceInFlightRef = useRef(false);
  const handleNotificationChoice = async (enableNotifications: boolean) => {
    // Idempotency guard: OS permission prompts can cause re-fires via onRequestClose.
    if (notifChoiceInFlightRef.current) {
      console.log('Notification choice already in progress, ignoring duplicate call');
      return;
    }
    notifChoiceInFlightRef.current = true;
    setShowNotificationPrompt(false);

    try {
      if (enableNotifications) {
        try {
          const { requestPushPermissions } = await import('@/utils/notifications');
          const res = await requestPushPermissions();
          if (res.status === 'granted') {
            await appStore?.saveNotificationPrefs?.({
              enabled: true,
              messages: true,
              listings: true,
              general: false,
              pushToken: res.token,
              platform: Platform.OS as any,
              lastPromptAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.log('Notification permission error:', error);
        }
      } else {
        try {
          await appStore?.saveNotificationPrefs?.({
            enabled: false,
            messages: true,
            listings: true,
            general: false,
            platform: Platform.OS as any,
            lastPromptAt: new Date().toISOString(),
          });
        } catch (error) {
          console.log('Save notification prefs error:', error);
        }
      }
    } catch (error) {
      console.log('Notification choice error:', error);
    }

    console.log('Advancing to step 2');
    setStep(2);
    // Reset guard after a tick so a fresh future invocation (shouldn't happen) can run.
    setTimeout(() => { notifChoiceInFlightRef.current = false; }, 500);
  };

  const handleAnonymousContinue = async () => {
    if (isCompleting) return;
    setIsCompleting(true);
    try {
      console.log('Creating anonymous guest profile...');
      const guestId = `guest_${Date.now()}`;
      const guestVehicle: Vehicle = {
        id: `${Date.now()}_v`,
        licensePlate: 'GUEST',
        country: 'US',
        isPrimary: true,
        isActive: true,
        verificationStatus: 'pending',
        addedAt: new Date().toISOString(),
      };
      const guestProfile: UserProfile = {
        id: guestId,
        displayName: 'Guest',
        isAnonymous: true,
        createdAt: new Date().toISOString(),
        allowNotifications: false,
        rating: 0,
        reviewCount: 0,
        communityScore: 0,
        badges: [],
        verificationStatus: 'unverified',
        accountType: 'personal',
        blockedUsers: [],
        trustedContacts: [],
        emergencyContacts: [],
        preferredLanguage: DEFAULT_LANGUAGE,
        vehicles: [guestVehicle],
        primaryVehicleId: guestVehicle.id,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        emailVerified: false,
        phoneVerified: false,
      };
      await saveProfile(guestProfile);
      console.log('Guest profile saved, navigating to dashboard');
      await new Promise((resolve) => setTimeout(resolve, 150));
      router.replace('/(tabs)/dashboard');
    } catch (error) {
      console.error('Error creating guest profile:', error);
      Alert.alert('Error', 'Failed to continue as guest. Please try again.');
      setIsCompleting(false);
    }
  };

  const handleComplete = async () => {
    if (isCompleting) {
      console.log('Already completing onboarding, ignoring duplicate call');
      return;
    }

    if (!termsAccepted) {
      Alert.alert("Terms Required", "Please accept the terms and conditions to continue");
      return;
    }

    const contact = contactMethod === 'email' ? email.trim() : phone.trim();
    const normalizedPlate = normalizePlateInput(licensePlate);
    const normalizedCode = normalizeVerificationCode(verificationCode);

    if (!contact || normalizedCode.length !== VERIFICATION_CODE_LENGTH) {
      Alert.alert("Required Fields", "Please verify your contact information before continuing.");
      return;
    }

    setIsCompleting(true);

    try {
      console.log('Starting onboarding completion...');

      // License plate is optional during onboarding; users can add one later in Vehicle Management.
      const vehicles: Vehicle[] = normalizedPlate
        ? [{
            id: Date.now().toString(),
            licensePlate: normalizedPlate,
            country,
            state: state || undefined,
            isPrimary: true,
            isActive: true,
            verificationStatus: 'pending',
            addedAt: new Date().toISOString(),
          }]
        : [];

      const profile: UserProfile = {
        id: Date.now().toString(),
        email: contactMethod === 'email' ? contact : undefined,
        phone: contactMethod === 'phone' ? contact : undefined,
        displayName: displayName.trim() || undefined,
        isAnonymous,
        createdAt: new Date().toISOString(),
        allowNotifications: true,
        rating: 0,
        reviewCount: 0,
        communityScore: 0,
        badges: [],
        verificationStatus: 'pending',
        accountType: 'personal',
        blockedUsers: [],
        trustedContacts: [],
        emergencyContacts: [],
        preferredLanguage: selectedLanguage,
        vehicles,
        primaryVehicleId: vehicles[0]?.id,
        termsAccepted: true,
        termsAcceptedAt: new Date().toISOString(),
        emailVerified: contactMethod === 'email',
        phoneVerified: contactMethod === 'phone',
      };

      console.log('Saving profile...', { profileId: profile.id, vehicleCount: profile.vehicles.length });
      await saveProfile(profile);
      console.log('Profile saved successfully');

      await new Promise(resolve => setTimeout(resolve, 200));

      console.log('Navigating to home...');
      router.replace("/(tabs)/dashboard");
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert("Error", "Failed to complete setup. Please try again.");
      setIsCompleting(false);
    }
  };

  if (step === 0) {
    const rotateInterpolate = pigeonRotate.interpolate({
      inputRange: [-1, 1],
      outputRange: ['-8deg', '8deg'],
    });
    return (
      <View style={styles.welcomeContainer}>
        <Image
          source={{ uri: BG_BLUR_URI }}
          style={StyleSheet.absoluteFillObject}
          blurRadius={Platform.OS === 'web' ? 30 : 18}
          resizeMode="cover"
        />
        <View style={styles.welcomeDarkOverlay} pointerEvents="none" />
        <LinearGradient
          colors={[ 'rgba(7,12,28,0.55)', 'rgba(7,12,28,0.85)', 'rgba(7,12,28,0.98)' ]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
        <View style={styles.welcomeAccentGlow} pointerEvents="none" />

        <SafeAreaView style={styles.welcomeSafe}>
          <View style={styles.welcomeTopArea}>
            <Animated.View
              style={[
                styles.pigeonGlowWrap,
                {
                  opacity: pigeonGlow,
                },
              ]}
              pointerEvents="none"
            >
              <View style={styles.pigeonGlow} />
            </Animated.View>

            <Animated.View
              style={[
                styles.pigeonWrap,
                {
                  transform: [
                    { translateY: pigeonY },
                    { rotate: rotateInterpolate },
                    { scale: pigeonScale },
                  ],
                },
              ]}
            >
              <Image
                source={{ uri: HOMI_PIGEON_URI }}
                style={styles.pigeonImage}
                resizeMode="contain"
              />
              <View style={styles.pigeonBlueTint} pointerEvents="none" />
            </Animated.View>
          </View>

          <Animated.View style={[styles.welcomeBrandWrap, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.brandRow}>
              <View style={styles.brandIcon}>
                <Text style={styles.brandIconText}>h</Text>
              </View>
              <Text style={styles.brandName}>Homi</Text>
            </View>
            <Text style={styles.brandTagline}>Communicate through license plates</Text>
          </Animated.View>

          <Animated.View style={[styles.welcomeBottom, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
            <Text style={styles.welcomeTerms}>
              By signing up for Homi, you agree to our{' '}
              <Text style={styles.welcomeTermsLink}>Terms of Service</Text>
              {' '}and acknowledge our{' '}
              <Text style={styles.welcomeTermsLink}>Privacy Policy</Text>
            </Text>

            {Platform.OS !== 'android' && (
              <TouchableOpacity
                style={styles.appleButton}
                onPress={() => handleSocialAuth('apple')}
                activeOpacity={0.85}
                testID="welcome-apple-button"
              >
                <Apple size={19} color="#000" fill="#000" strokeWidth={0} />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.darkButton}
              onPress={() => handleSocialAuth('google')}
              activeOpacity={0.8}
              testID="welcome-google-button"
            >
              <View style={styles.googleIcon}>
                <Text style={styles.googleIconText}>G</Text>
              </View>
              <Text style={styles.darkButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.darkButton}
              onPress={() => handleEmailFlow('signup')}
              activeOpacity={0.8}
              testID="welcome-signup-email"
            >
              <Mail size={17} color="#FFFFFF" strokeWidth={2.2} />
              <Text style={styles.darkButtonText}>Sign up with email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.darkButton}
              onPress={() => handleEmailFlow('login')}
              activeOpacity={0.8}
              testID="welcome-login-email"
            >
              <Text style={styles.darkButtonText}>Log in with email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.guestLink}
              onPress={handleAnonymousContinue}
              activeOpacity={0.7}
              disabled={isCompleting}
              testID="welcome-guest"
            >
              <UserX size={14} color="rgba(255,255,255,0.65)" strokeWidth={2.2} />
              <Text style={styles.guestLinkText}>
                {isCompleting ? 'Setting up...' : 'Continue as guest'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={['#1B6EF3', '#1458C7', '#0D3F94']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.3, y: 1 }}
      />

      <View style={styles.meshOverlay} pointerEvents="none">
        <View style={styles.meshCircle1} />
        <View style={styles.meshCircle2} />
        <View style={styles.meshCircle3} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <HomiLogo size={90} showSlogan={false} />
            <Text style={styles.stepLabel}>
              {step === 1 ? 'Create your account' : 'Almost there'}
            </Text>
          </Animated.View>

          <Animated.View style={[styles.card, { opacity: cardFade, transform: [{ translateY: cardSlide }] }]}>
            {step === 1 && (
              <>
                <Text style={styles.cardTitle}>Create your{'\n'}account</Text>
                <Text style={styles.cardSubtitle}>Sign up with email or phone — add your license plate later (optional).</Text>

                <View style={styles.contactMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.contactMethodButton,
                      contactMethod === 'email' && styles.contactMethodButtonActive
                    ]}
                    onPress={() => setContactMethod('email')}
                    activeOpacity={0.7}
                  >
                    <Mail size={17} color={contactMethod === 'email' ? '#FFFFFF' : designTokens.color.primary} strokeWidth={2.2} />
                    <Text style={[
                      styles.contactMethodText,
                      contactMethod === 'email' && styles.contactMethodTextActive
                    ]}>Email</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.contactMethodButton,
                      contactMethod === 'phone' && styles.contactMethodButtonActive
                    ]}
                    onPress={() => setContactMethod('phone')}
                    activeOpacity={0.7}
                  >
                    <Phone size={17} color={contactMethod === 'phone' ? '#FFFFFF' : designTokens.color.primary} strokeWidth={2.2} />
                    <Text style={[
                      styles.contactMethodText,
                      contactMethod === 'phone' && styles.contactMethodTextActive
                    ]}>Phone</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder={contactMethod === 'email' ? 'your@email.com' : '+1 (555) 123-4567'}
                  placeholderTextColor={designTokens.color.textLight}
                  value={contactMethod === 'email' ? email : phone}
                  onChangeText={contactMethod === 'email' ? setEmail : setPhone}
                  keyboardType={contactMethod === 'email' ? 'email-address' : 'phone-pad'}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => plateInputRef.current?.focus()}
                  testID="onboarding-contact-input"
                />

                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={sendVerificationCode}
                  activeOpacity={0.7}
                  testID="onboarding-send-code-button"
                >
                  <Text style={styles.verifyButtonText}>
                    {isVerifying ? 'Sending...' : 'Send verification code'}
                  </Text>
                </TouchableOpacity>

                <TextInput
                  ref={verificationInputRef}
                  style={styles.input}
                  placeholder="Enter verification code"
                  placeholderTextColor={designTokens.color.textLight}
                  value={verificationCode}
                  onChangeText={(text) => setVerificationCode(normalizeVerificationCode(text))}
                  keyboardType="numeric"
                  maxLength={VERIFICATION_CODE_LENGTH}
                  returnKeyType="done"
                  onSubmitEditing={handleNext}
                  testID="onboarding-verification-input"
                />
              </>
            )}

            {step === 2 && (
              <>
                <Text style={styles.cardTitle}>Set your preferences</Text>
                <Text style={styles.cardSubtitle}>Customize your experience and accept our terms</Text>

                <TouchableOpacity
                  style={styles.languageSelector}
                  onPress={() => setShowLanguageModal(true)}
                  activeOpacity={0.7}
                >
                  <Globe size={17} color={designTokens.color.primary} />
                  <Text style={styles.languageSelectorText}>
                    Language: {getLanguageName(selectedLanguage)}
                  </Text>
                  <ChevronDown size={17} color={designTokens.color.textLight} />
                </TouchableOpacity>

                <TextInput
                  ref={displayNameInputRef}
                  style={styles.input}
                  placeholder="Display name (optional)"
                  placeholderTextColor={designTokens.color.textLight}
                  value={displayName}
                  onChangeText={setDisplayName}
                  returnKeyType="next"
                  testID="onboarding-display-name-input"
                />

                <Text style={styles.optionalSectionLabel}>License plate (optional)</Text>
                <Text style={styles.optionalSectionHint}>
                  Add now to send and receive messages tied to your car. You can skip and add it later.
                </Text>

                <View style={styles.locationSection}>
                  <TouchableOpacity
                    style={styles.pickerButton}
                    onPress={() => setShowCountryPicker(true)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.pickerContent}>
                      <Globe size={17} color={designTokens.color.textMuted} />
                      <Text style={styles.pickerText}>
                        {formatCountryLabel(country, getCountryByCode(country)?.name)}
                      </Text>
                    </View>
                    <ChevronDown size={17} color={designTokens.color.textLight} />
                  </TouchableOpacity>

                  {getRegionsByCountry(country).length > 0 && (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowStatePicker(true)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.pickerContent}>
                        <MapPin size={17} color={designTokens.color.textMuted} />
                        <Text style={styles.pickerText}>
                          {state ? getRegionByCode(state, country)?.name : `Select ${country === 'US' ? 'State' : country === 'CA' ? 'Province' : 'State/Region'}...`}
                        </Text>
                      </View>
                      <ChevronDown size={17} color={designTokens.color.textLight} />
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  ref={plateInputRef}
                  style={[styles.input, styles.plateInput]}
                  placeholder="LICENSE PLATE"
                  placeholderTextColor={designTokens.color.textLight}
                  value={licensePlate}
                  onChangeText={(text) => setLicensePlate(normalizePlateInput(text))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={MAX_PLATE_LENGTH}
                  returnKeyType="done"
                  testID="onboarding-plate-input"
                />

                <View style={styles.privacyContainer}>
                  <View style={styles.privacyInfo}>
                    <View style={styles.privacyIconWrap}>
                      <Shield size={15} color={designTokens.color.primary} strokeWidth={2.2} />
                    </View>
                    <View style={styles.privacyText}>
                      <Text style={styles.privacyLabel}>Anonymous Mode</Text>
                      <Text style={styles.privacyDescription}>
                        Hide your name when sending messages
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={isAnonymous}
                    onValueChange={setIsAnonymous}
                    trackColor={{ false: designTokens.color.border, true: designTokens.color.primary }}
                  />
                </View>

                <TouchableOpacity
                  style={styles.termsContainer}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.checkbox,
                    termsAccepted && styles.checkboxChecked
                  ]}>
                    {termsAccepted && <Check size={13} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                  <Text style={styles.termsText}>
                    I accept the{' '}
                    <Text style={styles.termsLink}>Terms & Conditions</Text>
                    {' '}and{' '}
                    <Text style={styles.termsLink}>Privacy Policy</Text>
                    {'. I understand this app is for communication purposes only and waive any liability from its use.'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.progressContainer}>
              {[1, 2].map((i) => (
                <View
                  key={`progress-${i}`}
                  style={[
                    styles.progressDot,
                    i === step && styles.progressDotActive,
                    i < step && styles.progressDotCompleted,
                  ]}
                />
              ))}
            </View>

            {step < 2 ? (
              <TouchableOpacity style={styles.ctaButton} onPress={handleNext} activeOpacity={0.85} testID="onboarding-continue-button">
                <LinearGradient
                  colors={['#1B6EF3', '#1458C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>Continue</Text>
                  <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleComplete}
                activeOpacity={0.85}
                testID="onboarding-get-started-button"
              >
                <LinearGradient
                  colors={['#1B6EF3', '#1458C7']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaGradient}
                >
                  <Text style={styles.ctaText}>
                    {isCompleting ? 'Setting up...' : 'Get Started'}
                  </Text>
                  <ArrowRight size={17} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setStep(step === 2 ? 1 : 0)}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showLanguageModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Language</Text>
            <ScrollView>
              {SUPPORTED_LANGUAGES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.optionRow,
                    selectedLanguage === item.code && styles.optionRowSelected
                  ]}
                  onPress={() => {
                    setSelectedLanguage(item.code);
                    setShowLanguageModal(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text style={styles.optionName}>{item.nativeName}</Text>
                  {selectedLanguage === item.code && (
                    <Check size={17} color={designTokens.color.primary} strokeWidth={2.5} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowLanguageModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCountryPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Country</Text>
            <ScrollView>
              {COUNTRIES.map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.optionRow,
                    item.code === country && styles.optionRowSelected
                  ]}
                  onPress={() => {
                    setCountry(item.code);
                    setState("");
                    setShowCountryPicker(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.optionFlag}>{item.flag}</Text>
                  <Text style={styles.optionName}>{item.name}</Text>
                  {item.code === country && (
                    <CheckCircle size={17} color={designTokens.color.primary} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCountryPicker(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showStatePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStatePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              Select {country === 'US' ? 'State' : country === 'CA' ? 'Province' : 'Region'}
            </Text>
            <ScrollView>
              {getRegionsByCountry(country).map((item) => (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.optionRow,
                    item.code === state && styles.optionRowSelected
                  ]}
                  onPress={() => {
                    setState(item.code);
                    setShowStatePicker(false);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={styles.optionName}>{item.name}</Text>
                  {item.code === state && (
                    <CheckCircle size={17} color={designTokens.color.primary} strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStatePicker(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showNotificationPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => handleNotificationChoice(false)}
      >
        <View style={styles.notificationOverlay}>
          <View style={styles.notificationCard}>
            <View style={styles.notifIconWrap}>
              <Bell size={22} color={designTokens.color.primary} strokeWidth={2} />
            </View>
            <Text style={styles.notificationTitle}>Stay Connected</Text>
            <Text style={styles.notificationSubtitle}>
              Get notified instantly when someone messages your car or replies to your listing.
            </Text>
            <TouchableOpacity
              style={styles.notifPrimary}
              onPress={() => handleNotificationChoice(true)}
              activeOpacity={0.85}
              testID="notification-yes"
            >
              <LinearGradient
                colors={['#1B6EF3', '#1458C7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.notifPrimaryGradient}
              >
                <Text style={styles.notifPrimaryText}>Enable notifications</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifSecondary}
              onPress={() => handleNotificationChoice(false)}
              activeOpacity={0.7}
              testID="notification-later"
            >
              <Text style={styles.notifSecondaryText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  meshOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  meshCircle1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  meshCircle2: {
    position: 'absolute',
    bottom: 100,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  meshCircle3: {
    position: 'absolute',
    top: '40%' as any,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500' as const,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  stepLabel: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 8,
    letterSpacing: 0.1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radius.xxl,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.18,
    shadowRadius: 32,
    elevation: 12,
  },
  cardTitle: {
    fontSize: 25,
    fontWeight: '800' as const,
    color: designTokens.color.text,
    letterSpacing: -0.5,
    lineHeight: 31,
    marginBottom: 6,
  },
  cardSubtitle: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    marginBottom: 24,
    lineHeight: 21,
  },
  contactMethodContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 10,
  },
  contactMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    gap: 6,
    backgroundColor: designTokens.color.surfaceWarm,
  },
  contactMethodButtonActive: {
    backgroundColor: designTokens.color.primary,
    borderColor: designTokens.color.primary,
  },
  contactMethodText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: designTokens.color.text,
  },
  contactMethodTextActive: {
    color: '#FFFFFF',
  },
  input: {
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
    color: designTokens.color.text,
    backgroundColor: designTokens.color.surfaceWarm,
  },
  plateInput: {
    letterSpacing: 3,
    fontWeight: '700' as const,
    fontSize: 18,
    textAlign: 'center' as const,
  },
  locationSection: {
    marginBottom: 4,
  },
  optionalSectionLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: designTokens.color.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as const,
    marginTop: 8,
    marginBottom: 4,
  },
  optionalSectionHint: {
    fontSize: 13,
    color: designTokens.color.textLight,
    lineHeight: 18,
    marginBottom: 12,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 14,
    backgroundColor: designTokens.color.surfaceWarm,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pickerText: {
    fontSize: 16,
    color: designTokens.color.text,
  },
  verifyButton: {
    backgroundColor: designTokens.color.surfaceWarm,
    borderRadius: designTokens.radius.lg,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: designTokens.color.primary,
  },
  verifyButtonText: {
    color: designTokens.color.primary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    marginBottom: 14,
    gap: 10,
    backgroundColor: designTokens.color.surfaceWarm,
  },
  languageSelectorText: {
    flex: 1,
    fontSize: 16,
    color: designTokens.color.text,
  },
  privacyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: designTokens.color.surfaceWarm,
    borderRadius: designTokens.radius.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  privacyIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: `${designTokens.color.primary}12`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyText: {
    flex: 1,
  },
  privacyLabel: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: designTokens.color.text,
  },
  privacyDescription: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    marginTop: 2,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: designTokens.color.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: designTokens.color.primary,
    borderColor: designTokens.color.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: designTokens.color.textMuted,
    lineHeight: 19,
  },
  termsLink: {
    color: designTokens.color.primary,
    fontWeight: '600' as const,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 20,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: designTokens.color.border,
  },
  progressDotActive: {
    width: 28,
    backgroundColor: designTokens.color.primary,
    borderRadius: 4,
  },
  progressDotCompleted: {
    backgroundColor: designTokens.color.success,
  },
  ctaButton: {
    borderRadius: designTokens.radius.lg,
    overflow: 'hidden',
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 17,
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: 0.2,
  },
  buttonDisabled: {
    opacity: 0.42,
  },
  backButton: {
    marginTop: 14,
    alignItems: 'center',
  },
  backButtonText: {
    color: designTokens.color.textMuted,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 14,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: designTokens.color.border,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: designTokens.color.textLight,
    letterSpacing: 1,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    backgroundColor: designTokens.color.surfaceWarm,
    gap: 8,
    marginBottom: 8,
  },
  guestButtonText: {
    color: designTokens.color.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  guestHint: {
    fontSize: 12,
    color: designTokens.color.textMuted,
    textAlign: 'center' as const,
    lineHeight: 17,
    paddingHorizontal: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: designTokens.radius.xxl,
    borderTopRightRadius: designTokens.radius.xxl,
    padding: 24,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: designTokens.color.border,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: designTokens.color.text,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.2,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: designTokens.radius.md,
    marginBottom: 4,
    gap: 14,
  },
  optionRowSelected: {
    backgroundColor: designTokens.color.primaryLight,
  },
  optionFlag: {
    fontSize: 22,
  },
  optionName: {
    flex: 1,
    fontSize: 16,
    color: designTokens.color.text,
    fontWeight: '500' as const,
  },
  modalCloseButton: {
    backgroundColor: designTokens.color.text,
    borderRadius: designTokens.radius.lg,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 16,
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  notificationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
  },
  notificationCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: designTokens.radius.xxl,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 32,
    elevation: 14,
  },
  notifIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: designTokens.color.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  notificationTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: designTokens.color.text,
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  notificationSubtitle: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    marginBottom: 24,
    lineHeight: 22,
    textAlign: 'center' as const,
  },
  notifPrimary: {
    width: '100%',
    borderRadius: designTokens.radius.lg,
    overflow: 'hidden',
    marginBottom: 10,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  notifPrimaryGradient: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  notifPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700' as const,
    fontSize: 16,
  },
  notifSecondary: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
  },
  notifSecondaryText: {
    color: designTokens.color.textMuted,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: '#070C1C',
  },
  welcomeDarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,12,28,0.35)',
  },
  welcomeAccentGlow: {
    position: 'absolute',
    top: '18%' as any,
    alignSelf: 'center',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(27,110,243,0.22)',
  },
  welcomeSafe: {
    flex: 1,
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 18,
  },
  welcomeTopArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  pigeonGlowWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigeonGlow: {
    width: 416,
    height: 416,
    borderRadius: 208,
    backgroundColor: 'rgba(27,110,243,0.45)',
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
  },
  pigeonWrap: {
    width: 288,
    height: 288,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pigeonImage: {
    width: 288,
    height: 288,
  },
  pigeonBlueTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27,110,243,0.18)',
    borderRadius: 144,
  },
  welcomeBrandWrap: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1B6EF3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1B6EF3',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 8,
  },
  brandIconText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '900' as const,
    lineHeight: 30,
    letterSpacing: -1,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 42,
    fontWeight: '800' as const,
    letterSpacing: -1,
  },
  brandTagline: {
    color: '#3FE0D0',
    fontSize: 18,
    fontWeight: '700' as const,
    fontStyle: 'italic' as const,
    marginTop: 12,
    textAlign: 'center' as const,
    textShadowColor: 'rgba(63,224,208,0.45)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  welcomeBottom: {
    width: '100%' as const,
  },
  welcomeTerms: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: 'center' as const,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  welcomeTermsLink: {
    color: '#FFFFFF',
    textDecorationLine: 'underline' as const,
    fontWeight: '600' as const,
  },
  appleButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
  },
  appleButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  darkButton: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  darkButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600' as const,
  },
  googleIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIconText: {
    color: '#1B6EF3',
    fontSize: 13,
    fontWeight: '900' as const,
    lineHeight: 15,
  },
  guestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    marginTop: 4,
  },
  guestLinkText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500' as const,
  },
});
