import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Switch,
  Platform,
  Image,
  Animated,
} from "react-native";
import {
  Bell,
  Shield,
  LogOut,
  Car,
  ChevronRight,
  Camera,
  Star,
  Award,
  HelpCircle,
  FileText,
  TrendingUp,
  Crown,
  Sparkles,
  Gift,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { GlassCard } from "@/components/GlassCard";
import * as ImagePicker from "expo-image-picker";
import { usePremium } from "@/hooks/usePremium";

export default function ProfileScreen() {
  const appStore = useAppStore();
  const {
    userProfile,
    primaryVehicle,
    clearAllData,
    updateAvatar,
    notificationPrefs,
    saveNotificationPrefs,
    userRatings,
  } = appStore;

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    notificationPrefs?.enabled ?? false
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 55, friction: 10, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const userPlates = useMemo(
    () => userProfile?.vehicles?.map((v) => v.licensePlate) ?? [],
    [userProfile?.vehicles]
  );

  const ratingStats = useMemo(() => {
    const received = (userRatings ?? []).filter(
      (r) => typeof r?.toPlate === "string" && userPlates.includes(r.toPlate)
    );
    const count = received.length;
    const sum = received.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = count > 0 ? sum / count : 0;
    return { avg, count };
  }, [userRatings, userPlates]);

  const vehicleCount = userProfile?.vehicles?.length ?? 0;
  const premium = usePremium();

  const handleToggleNotifications = useCallback(
    async (value: boolean) => {
      setNotificationsEnabled(value);
      await saveNotificationPrefs({ ...notificationPrefs!, enabled: value });
    },
    [notificationPrefs, saveNotificationPrefs]
  );

  const handleChangePhoto = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await updateAvatar(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
    }
  }, [updateAvatar]);

  const handleLogout = useCallback(() => {
    const doLogout = async () => {
      try {
        console.log("Logout: clearing data...");
        await clearAllData();
        if (Platform.OS === "web" && typeof window !== "undefined") {
          try { localStorage.clear(); } catch {}
          try { sessionStorage.clear(); } catch {}
        }
        try {
          router.replace("/onboarding");
        } catch {
          try { router.push("/onboarding"); } catch {}
        }
        if (Platform.OS === "web" && typeof window !== "undefined") {
          setTimeout(() => {
            try { window.location.replace("/"); } catch {}
          }, 50);
        }
      } catch (err) {
        console.error("Logout error:", err);
        Alert.alert("Error", "Failed to logout. Please try again.");
      }
    };

    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm("Are you sure you want to logout?")
          : true;
      if (confirmed) void doLogout();
      return;
    }

    Alert.alert("Logout", "Are you sure you want to logout? This will clear all your data.", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => void doLogout() },
    ]);
  }, [clearAllData]);

  const menuSections = [
    {
      title: "Account",
      items: [
        {
          icon: Car,
          label: "My Vehicles",
          detail: `${vehicleCount} vehicle${vehicleCount !== 1 ? "s" : ""}`,
          color: designTokens.color.accent,
          onPress: () => router.push("/vehicle-management"),
        },
        {
          icon: Shield,
          label: "Safety Center",
          color: designTokens.color.error,
          onPress: () => router.push("/safety-center"),
        },
        {
          icon: Bell,
          label: "Notifications",
          color: designTokens.color.primary,
          toggle: true,
          value: notificationsEnabled,
          onToggle: handleToggleNotifications,
        },
      ],
    },
    {
      title: "Earn rewards",
      items: [
        {
          icon: Gift,
          label: "Invite friends",
          detail: "Get HOMI Plus free",
          color: "#F5A623",
          onPress: () => router.push("/referral"),
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          icon: HelpCircle,
          label: "Contact Us",
          color: designTokens.color.success,
          onPress: () => router.push("/contact-us"),
        },
        {
          icon: FileText,
          label: "Community Guidelines",
          color: designTokens.color.accentTeal,
          onPress: () => router.push("/community-guidelines"),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Profile</Text>
          </View>

          {(() => {
            const isGuest = !!userProfile?.isAnonymous;
            const fullName = (userProfile?.displayName || (isGuest ? 'GUEST' : 'DRIVER')).toUpperCase();
            const username = userProfile?.email
              ? `@${userProfile.email.split('@')[0]}`
              : userProfile?.phone
              ? `@${userProfile.phone.replace(/[^0-9]/g, '').slice(-6)}`
              : isGuest
              ? '@guest'
              : '@driver';
            const vehicles = userProfile?.vehicles ?? [];
            const issued = userProfile?.createdAt
              ? new Date(userProfile.createdAt)
              : new Date();
            const issuedStr = `${String(issued.getMonth() + 1).padStart(2, '0')}/${String(issued.getDate()).padStart(2, '0')}/${issued.getFullYear()}`;
            const expires = new Date(issued.getFullYear() + 8, issued.getMonth(), issued.getDate());
            const expiresStr = `${String(expires.getMonth() + 1).padStart(2, '0')}/${String(expires.getDate()).padStart(2, '0')}/${expires.getFullYear()}`;
            const dlNumber = (userProfile?.id || 'GUEST000000').replace(/[^A-Za-z0-9]/g, '').slice(-8).toUpperCase().padStart(8, '0');
            const primaryV = vehicles.find((v) => v.isPrimary) || vehicles[0];
            const vehicleLine = primaryV
              ? [primaryV.year, primaryV.make, primaryV.model].filter(Boolean).join(' ').trim() || (primaryV.type ? primaryV.type.toUpperCase() : 'VEHICLE')
              : 'NO VEHICLE';

            return (
              <View style={styles.licenseCard} testID="profile-license-card">
                <LinearGradient
                  colors={["#1B6EF3", "#1458C7", "#0D3F94"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.licenseGuilloche}>
                  <View style={styles.guillocheCircle1} />
                  <View style={styles.guillocheCircle2} />
                  <View style={styles.guillocheCircle3} />
                  <View style={styles.diagonalStripe} />
                </View>

                <View style={styles.licenseHeader}>
                  <View style={styles.licenseHeaderLeft}>
                    <Text style={styles.licenseStateText}>HOMI</Text>
                    <Text style={styles.licenseTitle}>DRIVER IDENTIFICATION</Text>
                  </View>
                  <View style={styles.licenseSeal}>
                    <ShieldCheck size={14} color="#FFD789" strokeWidth={2.4} />
                    <Text style={styles.licenseSealText}>USA</Text>
                  </View>
                </View>

                <View style={styles.licenseDivider} />

                <View style={styles.licenseBody}>
                  <TouchableOpacity
                    style={styles.licensePhotoWrap}
                    onPress={isGuest ? undefined : handleChangePhoto}
                    activeOpacity={isGuest ? 1 : 0.85}
                    disabled={isGuest}
                  >
                    {userProfile?.avatar && !isGuest ? (
                      <Image source={{ uri: userProfile.avatar }} style={styles.licensePhoto} />
                    ) : (
                      <View style={styles.licensePhotoFallback}>
                        {isGuest ? (
                          <UserIcon size={30} color="rgba(255,255,255,0.85)" strokeWidth={1.6} />
                        ) : (
                          <Text style={styles.licensePhotoInitial}>
                            {(userProfile?.displayName || "D")[0].toUpperCase()}
                          </Text>
                        )}
                      </View>
                    )}
                    {!isGuest && (
                      <View style={styles.licensePhotoCamera}>
                        <Camera size={9} color="#FFFFFF" strokeWidth={2.6} />
                      </View>
                    )}
                    <View style={styles.licensePhotoFrame} pointerEvents="none" />
                  </TouchableOpacity>

                  <View style={styles.licenseFields}>
                    <View style={styles.licenseRow}>
                      <Text style={styles.licenseFieldLabel}>DL</Text>
                      <Text style={styles.licenseDl}>{isGuest ? 'GUEST-PASS' : dlNumber}</Text>
                    </View>
                    <View style={styles.licenseRow}>
                      <Text style={styles.licenseFieldLabel}>1 NAME</Text>
                      <Text style={styles.licenseName} numberOfLines={1}>{fullName}</Text>
                    </View>
                    {!isGuest && (
                      <View style={styles.licenseRow}>
                        <Text style={styles.licenseFieldLabel}>2 USER</Text>
                        <Text style={styles.licenseUsername} numberOfLines={1}>{username}</Text>
                      </View>
                    )}
                    <View style={styles.licenseRow}>
                      <Text style={styles.licenseFieldLabel}>3 VEH</Text>
                      <Text style={styles.licenseVehicle} numberOfLines={1}>
                        {isGuest ? 'ANONYMOUS' : vehicleLine.toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.licenseDatesRow}>
                      <View>
                        <Text style={styles.licenseFieldLabelTiny}>4 ISS</Text>
                        <Text style={styles.licenseDateValue}>{issuedStr}</Text>
                      </View>
                      <View>
                        <Text style={styles.licenseFieldLabelTiny}>4b EXP</Text>
                        <Text style={styles.licenseDateValue}>{expiresStr}</Text>
                      </View>
                      <View>
                        <Text style={styles.licenseFieldLabelTiny}>CLASS</Text>
                        <Text style={styles.licenseDateValue}>{isGuest ? 'G' : 'C'}</Text>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.licenseFooter}>
                  <Text style={styles.licenseFooterLabel}>
                    {isGuest
                      ? 'GUEST PASS'
                      : vehicles.length > 1
                      ? `REGISTERED PLATES (${vehicles.length})`
                      : 'REGISTERED PLATE'}
                  </Text>
                  {isGuest ? (
                    <View style={styles.licensePlateChipsRow}>
                      <View style={styles.licensePlateChip}>
                        <Text style={styles.licensePlateChipState}>ANON</Text>
                        <Text style={styles.licensePlateChipText}>GUEST</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.licensePlateChipsRow}>
                      {vehicles.slice(0, 3).map((v) => (
                        <View key={v.id} style={styles.licensePlateChip}>
                          <Text style={styles.licensePlateChipState}>
                            {(v.state || v.country || 'US').slice(0, 3).toUpperCase()}
                          </Text>
                          <Text style={styles.licensePlateChipText}>{v.licensePlate}</Text>
                        </View>
                      ))}
                      {vehicles.length > 3 && (
                        <View style={[styles.licensePlateChip, styles.licensePlateChipMore]}>
                          <Text style={styles.licensePlateChipText}>+{vehicles.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>

                <View style={styles.licenseSignatureRow}>
                  <Text style={styles.licenseSignatureText}>
                    {isGuest ? 'guest' : (userProfile?.displayName || 'driver').toLowerCase()}
                  </Text>
                  <Text style={styles.licenseSignatureLabel}>SIGNATURE</Text>
                </View>
              </View>
            );
          })()}

          <View style={styles.statsRow}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F5A62314' }]}>
                <Star size={15} color="#F5A623" strokeWidth={2.2} />
              </View>
              <Text style={styles.statValue}>{ratingStats.avg.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: `${designTokens.color.accentPurple}14` }]}>
                <Award size={15} color={designTokens.color.accentPurple} strokeWidth={2.2} />
              </View>
              <Text style={styles.statValue}>{userProfile?.communityScore ?? 0}</Text>
              <Text style={styles.statLabel}>Score</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIconWrap, { backgroundColor: `${designTokens.color.success}14` }]}>
                <TrendingUp size={15} color={designTokens.color.success} strokeWidth={2.2} />
              </View>
              <Text style={styles.statValue}>{ratingStats.count}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </GlassCard>
          </View>

          {!premium.isActive ? (
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => router.push('/paywall')}
              style={styles.plusBannerWrap}
              testID="profile-plus-banner"
            >
              <LinearGradient
                colors={["#0B1A3C", "#1B6EF3", "#2ED3B7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.plusBanner}
              >
                <View style={styles.plusBannerLeft}>
                  <View style={styles.plusBannerIcon}>
                    <Crown size={18} color="#FFD789" strokeWidth={2.4} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.plusBannerTitle}>HOMI Plus</Text>
                    <Text style={styles.plusBannerSub}>
                      Unlimited vehicles, priority delivery & more
                    </Text>
                  </View>
                </View>
                <View style={styles.plusBannerCta}>
                  <Sparkles size={14} color="#0B1A3C" strokeWidth={2.6} />
                  <Text style={styles.plusBannerCtaText}>Upgrade</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push('/paywall')}
              style={styles.plusActiveCard}
              testID="profile-plus-active"
            >
              <View style={styles.plusActiveIcon}>
                <Crown size={16} color="#F5A623" strokeWidth={2.4} fill="#FFD789" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plusActiveTitle}>HOMI Plus active</Text>
                <Text style={styles.plusActiveSub}>
                  {premium.isOnTrial
                    ? `Trial — ${premium.trialDaysLeft} day${premium.trialDaysLeft === 1 ? '' : 's'} left`
                    : `${premium.plan === 'lifetime' ? 'Lifetime' : premium.plan === 'annual' ? 'Annual' : 'Monthly'} plan`}
                </Text>
              </View>
              <ChevronRight size={14} color={designTokens.color.textLight} />
            </TouchableOpacity>
          )}

          {menuSections.map((section) => (
            <View key={section.title} style={styles.menuSection}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.menuCard}>
                {section.items.map((item, index) => {
                  const IconComp = item.icon;
                  const isLast = index === section.items.length - 1;
                  return (
                    <TouchableOpacity
                      key={item.label}
                      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
                      onPress={item.toggle ? undefined : item.onPress}
                      activeOpacity={item.toggle ? 1 : 0.55}
                      testID={`menu-${item.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      <View style={[styles.menuIconBg, { backgroundColor: `${item.color}12` }]}>
                        <IconComp size={16} color={item.color} strokeWidth={2.2} />
                      </View>
                      <Text style={styles.menuLabel}>{item.label}</Text>
                      {item.toggle ? (
                        <Switch
                          value={item.value}
                          onValueChange={item.onToggle}
                          trackColor={{
                            false: designTokens.color.border,
                            true: designTokens.color.primary,
                          }}
                        />
                      ) : (
                        <View style={styles.menuRight}>
                          {item.detail && <Text style={styles.menuDetail}>{item.detail}</Text>}
                          <ChevronRight size={14} color={designTokens.color.textLight} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7} testID="logout-button">
            <LogOut size={16} color={designTokens.color.error} strokeWidth={2.2} />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={styles.version}>HOMI v3.0</Text>

          <View style={styles.bottomSpacer} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: designTokens.color.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 110,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.6,
  },
  profileCard: {
    borderRadius: designTokens.radius.xxl,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
  },
  licenseCard: {
    borderRadius: 18,
    overflow: "hidden",
    marginBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255,215,137,0.55)",
    shadowColor: "#0D3F94",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.32,
    shadowRadius: 26,
    elevation: 10,
    backgroundColor: "#1458C7",
  },
  licenseGuilloche: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  guillocheCircle1: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  guillocheCircle2: {
    position: "absolute",
    top: -40,
    right: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  guillocheCircle3: {
    position: "absolute",
    bottom: -70,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "rgba(255,215,137,0.10)",
  },
  diagonalStripe: {
    position: "absolute",
    top: 30,
    right: -80,
    width: 260,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
    transform: [{ rotate: "-18deg" }],
  },
  licenseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  licenseHeaderLeft: {
    flex: 1,
  },
  licenseStateText: {
    fontSize: 22,
    fontWeight: "900" as const,
    color: "#FFD789",
    letterSpacing: 4,
    lineHeight: 24,
  },
  licenseTitle: {
    fontSize: 9.5,
    fontWeight: "800" as const,
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 2,
    marginTop: 1,
  },
  licenseSeal: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.22)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,215,137,0.5)",
  },
  licenseSealText: {
    fontSize: 10,
    fontWeight: "900" as const,
    color: "#FFD789",
    letterSpacing: 1.5,
  },
  licenseDivider: {
    height: 1,
    backgroundColor: "rgba(255,215,137,0.45)",
    marginTop: 8,
    marginBottom: 12,
  },
  licenseBody: {
    flexDirection: "row",
    gap: 14,
  },
  licensePhotoWrap: {
    width: 78,
    height: 96,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.55)",
  },
  licensePhoto: {
    width: "100%" as const,
    height: "100%" as const,
  },
  licensePhotoFallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  licensePhotoInitial: {
    fontSize: 36,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  licensePhotoCamera: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  licensePhotoFrame: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(255,215,137,0.35)",
    borderRadius: 6,
    margin: 2,
  },
  licenseFields: {
    flex: 1,
    gap: 6,
  },
  licenseRow: {
    flexDirection: "column",
  },
  licenseFieldLabel: {
    fontSize: 8.5,
    fontWeight: "800" as const,
    color: "rgba(255,215,137,0.95)",
    letterSpacing: 1.4,
    marginBottom: 1,
  },
  licenseFieldLabelTiny: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: "rgba(255,215,137,0.95)",
    letterSpacing: 1.2,
    marginBottom: 1,
  },
  licenseDl: {
    fontSize: 14,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 2,
    fontVariant: ["tabular-nums"],
  },
  licenseName: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.6,
  },
  licenseUsername: {
    fontSize: 12.5,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.3,
  },
  licenseVehicle: {
    fontSize: 12.5,
    fontWeight: "700" as const,
    color: "rgba(255,255,255,0.92)",
    letterSpacing: 0.6,
  },
  licenseDatesRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 4,
  },
  licenseDateValue: {
    fontSize: 11.5,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.8,
    fontVariant: ["tabular-nums"],
  },
  licenseFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,215,137,0.35)",
  },
  licenseFooterLabel: {
    fontSize: 8.5,
    fontWeight: "800" as const,
    color: "rgba(255,215,137,0.95)",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  licensePlateChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap" as const,
    gap: 6,
  },
  licensePlateChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 5,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  licensePlateChipMore: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.35)",
  },
  licensePlateChipState: {
    fontSize: 9,
    fontWeight: "900" as const,
    color: "#FFFFFF",
    backgroundColor: "#0D3F94",
    paddingHorizontal: 6,
    paddingVertical: 4,
    letterSpacing: 1,
  },
  licensePlateChipText: {
    fontSize: 12,
    fontWeight: "900" as const,
    color: "#0D3F94",
    paddingHorizontal: 8,
    paddingVertical: 3,
    letterSpacing: 1.5,
  },
  licenseSignatureRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  licenseSignatureText: {
    fontSize: 18,
    color: "#FFFFFF",
    fontStyle: "italic" as const,
    fontWeight: "600" as const,
    letterSpacing: 0.5,
    transform: [{ skewX: "-8deg" }],
  },
  licenseSignatureLabel: {
    fontSize: 8,
    fontWeight: "800" as const,
    color: "rgba(255,215,137,0.85)",
    letterSpacing: 1.5,
  },
  profileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  meshOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  meshCircle1: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  meshCircle2: {
    position: "absolute",
    bottom: -15,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  profileContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 22,
  },
  avatarContainer: {
    position: "relative",
    marginRight: 16,
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarPlaceholder: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  avatarInitial: {
    fontSize: 26,
    fontWeight: "800" as const,
    color: "#FFFFFF",
  },
  cameraOverlay: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  email: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 10,
  },
  plateBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  plateBadgeText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 6,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: designTokens.color.textMuted,
  },
  menuSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: designTokens.color.textLight,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    marginBottom: 10,
    paddingLeft: 4,
  },
  menuCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: designTokens.color.borderMuted,
  },
  menuIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500" as const,
    color: designTokens.color.text,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  menuDetail: {
    fontSize: 14,
    color: designTokens.color.textLight,
    fontWeight: "500" as const,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    backgroundColor: designTokens.color.errorSoft,
    borderRadius: designTokens.radius.lg,
    borderWidth: 1,
    borderColor: `${designTokens.color.error}18`,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: designTokens.color.error,
  },
  version: {
    textAlign: "center" as const,
    fontSize: 13,
    color: designTokens.color.textLight,
    marginTop: 20,
    fontWeight: "500" as const,
  },
  bottomSpacer: {
    height: 24,
  },
  plusBannerWrap: {
    borderRadius: designTokens.radius.xxl,
    overflow: "hidden",
    marginBottom: 20,
    shadowColor: "#1B6EF3",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 8,
  },
  plusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  plusBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  plusBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  plusBannerTitle: {
    fontSize: 16,
    fontWeight: "800" as const,
    color: "#FFFFFF",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  plusBannerSub: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.82)",
    lineHeight: 16,
  },
  plusBannerCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFD789",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  plusBannerCtaText: {
    fontSize: 13,
    fontWeight: "800" as const,
    color: "#0B1A3C",
    letterSpacing: 0.2,
  },
  plusActiveCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#FFF8E8",
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    borderColor: "#FFE2A0",
    marginBottom: 20,
  },
  plusActiveIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE2A0",
  },
  plusActiveTitle: {
    fontSize: 15,
    fontWeight: "800" as const,
    color: "#7A4D00",
    marginBottom: 2,
  },
  plusActiveSub: {
    fontSize: 12.5,
    color: "#A87A2A",
    fontWeight: "600" as const,
  },
});
