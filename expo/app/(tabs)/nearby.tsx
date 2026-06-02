import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Animated,
} from "react-native";
import { MapPin, Navigation, AlertCircle, Clock, ChevronRight, Compass, Radio } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ActionIcon } from "@/components/ActionIcon";
import { getQuickActionIcon } from "@/constants/actionIcons";
import { designTokens } from "@/constants/theme";
import { GlassCard } from "@/components/GlassCard";
import { MessageType } from "@/types";

interface NearbyEvent {
  id: string;
  type: MessageType;
  description: string;
  distance: string;
  time: string;
}

const MOCK_NEARBY: NearbyEvent[] = [
  { id: "1", type: "parking_alert", description: "Street cleaning on Oak St", distance: "0.2 mi", time: "5m ago" },
  { id: "2", type: "blocking", description: "Double parked on Main Ave", distance: "0.4 mi", time: "12m ago" },
  { id: "3", type: "lights_on", description: "Red sedan with lights on", distance: "0.1 mi", time: "2m ago" },
  { id: "4", type: "hazard", description: "Pothole on 5th & Market", distance: "0.6 mi", time: "18m ago" },
];

export default function NearbyScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 800);
    return () => clearTimeout(timer);
  }, [fadeAnim]);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const handleOpenMap = useCallback(() => {
    router.push("/map-live");
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingPulse, { transform: [{ scale: pulseAnim }] }]}>
            <Radio size={26} color={designTokens.color.primary} strokeWidth={2} />
          </Animated.View>
          <Text style={styles.loadingText}>Finding nearby activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Animated.View style={[styles.headerRow, { opacity: fadeAnim }]}>
        <Text style={styles.headerTitle}>Nearby</Text>
        <TouchableOpacity
          style={styles.mapButton}
          onPress={handleOpenMap}
          activeOpacity={0.8}
          testID="open-map"
        >
          <Navigation size={15} color="#FFFFFF" strokeWidth={2.2} />
          <Text style={styles.mapButtonText}>Map</Text>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity activeOpacity={0.85} onPress={handleOpenMap}>
            <View style={styles.mapPreview}>
              <LinearGradient
                colors={['#1B6EF3', '#1458C7', '#0D3F94']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={styles.mapGradient}
              >
                <View style={styles.meshDot1} />
                <View style={styles.meshDot2} />
                <View style={styles.mapIconRing}>
                  <Compass size={30} color="#FFFFFF" strokeWidth={1.5} />
                </View>
                <Text style={styles.mapPreviewTitle}>Your neighborhood</Text>
                <Text style={styles.mapPreviewSubtitle}>Tap to see what's happening around you</Text>
              </LinearGradient>
              <View style={styles.expandMapButton}>
                <Text style={styles.expandMapText}>Open full map</Text>
                <ChevronRight size={15} color={designTokens.color.primary} />
              </View>
            </View>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Recent activity nearby</Text>

          <View style={styles.eventsCard}>
            {MOCK_NEARBY.map((event, index) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.eventRow, index < MOCK_NEARBY.length - 1 && styles.eventRowBorder]}
                activeOpacity={0.55}
                onPress={handleOpenMap}
              >
                <ActionIcon
                  icon={getQuickActionIcon(event.type)}
                  size={42}
                  iconSize={20}
                  style={styles.eventEmojiWrap}
                  highlight={event.type === "blocking"}
                />
                <View style={styles.eventBody}>
                  <Text style={styles.eventDescription}>{event.description}</Text>
                  <View style={styles.eventMeta}>
                    <MapPin size={11} color={designTokens.color.textLight} />
                    <Text style={styles.eventDistance}>{event.distance}</Text>
                    <Clock size={11} color={designTokens.color.textLight} />
                    <Text style={styles.eventTime}>{event.time}</Text>
                  </View>
                </View>
                <ChevronRight size={14} color={designTokens.color.textLight} />
              </TouchableOpacity>
            ))}
          </View>

          <GlassCard variant="accent" style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <AlertCircle size={15} color={designTokens.color.primary} strokeWidth={2.2} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Community powered</Text>
              <Text style={styles.infoBody}>
                Reports are shared by drivers like you. Help your neighbors by reporting what you see.
              </Text>
            </View>
          </GlassCard>

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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  loadingPulse: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: designTokens.color.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 15,
    color: designTokens.color.textMuted,
    fontWeight: "500" as const,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800" as const,
    color: designTokens.color.text,
    letterSpacing: -0.6,
  },
  mapButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: designTokens.color.primary,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 9,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 4,
  },
  mapButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 110,
  },
  mapPreview: {
    marginHorizontal: 24,
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.xxl,
    overflow: "hidden",
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
    marginBottom: 28,
  },
  mapGradient: {
    height: 190,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
  },
  meshDot1: {
    position: "absolute",
    top: -30,
    right: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  meshDot2: {
    position: "absolute",
    bottom: -20,
    left: -30,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  mapIconRing: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  mapPreviewTitle: {
    fontSize: 19,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  mapPreviewSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
  },
  expandMapButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
    backgroundColor: designTokens.color.surface,
  },
  expandMapText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: designTokens.color.primary,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: designTokens.color.textLight,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  eventsCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.xl,
    marginHorizontal: 24,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: designTokens.color.borderMuted,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  eventRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: designTokens.color.borderMuted,
  },
  eventEmojiWrap: {
    marginRight: 12,
  },
  eventBody: {
    flex: 1,
    marginRight: 8,
  },
  eventDescription: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: designTokens.color.text,
    marginBottom: 4,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventDistance: {
    fontSize: 12,
    color: designTokens.color.textLight,
    fontWeight: "500" as const,
    marginRight: 8,
  },
  eventTime: {
    fontSize: 12,
    color: designTokens.color.textLight,
    fontWeight: "500" as const,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginHorizontal: 24,
    gap: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${designTokens.color.primary}14`,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: designTokens.color.text,
    marginBottom: 4,
    letterSpacing: -0.1,
  },
  infoBody: {
    fontSize: 13,
    color: designTokens.color.textMuted,
    lineHeight: 19,
  },
  bottomSpacer: {
    height: 24,
  },
});
