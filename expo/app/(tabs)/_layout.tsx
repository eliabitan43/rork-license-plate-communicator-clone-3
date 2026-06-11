import { Tabs } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import Animated from "react-native-reanimated";
import { tabIcons } from "@/constants/actionIcons";
import { designTokens } from "@/constants/theme";
import { useTabFocusScale } from "@/lib/motion";
import { useAppStore } from "@/hooks/useAppStore";

const TAB_ICON_SIZE = 28;
const TAB_BAR_HEIGHT = 72;

const ACTIVE = designTokens.color.primary;
const INACTIVE = designTokens.color.textLight;

type TabIconComponent = (typeof tabIcons)[keyof typeof tabIcons];

interface AnimatedTabIconProps {
  Icon: TabIconComponent;
  focused: boolean;
  testID: string;
  badgeCount?: number;
}

function AnimatedTabIcon({ Icon, focused, testID, badgeCount = 0 }: AnimatedTabIconProps) {
  const { animatedStyle } = useTabFocusScale(focused);
  return (
    <Animated.View style={[styles.iconWrap, animatedStyle]} testID={testID}>
      <Icon
        size={TAB_ICON_SIZE}
        color={focused ? ACTIVE : INACTIVE}
        strokeWidth={focused ? 2.4 : 2}
      />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </View>
      )}
    </Animated.View>
  );
}

export default function TabLayout() {
  const appStore = useAppStore();
  const unreadCount = appStore?.unreadCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ACTIVE,
        tabBarInactiveTintColor: INACTIVE,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web'
            ? designTokens.glass.light.background
            : designTokens.glass.light.backgroundSolid,
          borderTopWidth: 0,
          position: 'absolute' as const,
          left: 16,
          right: 16,
          marginHorizontal: 16,
          bottom: 16,
          height: TAB_BAR_HEIGHT,
          paddingTop: 10,
          paddingBottom: 10,
          borderRadius: 24,
          ...Platform.select({
            ios: {
              shadowColor: designTokens.glass.light.shadowColor,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
            },
            android: {
              elevation: 20,
            },
            default: {
              borderWidth: 1,
              borderColor: designTokens.color.borderMuted,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 11.5,
          fontWeight: '600' as const,
          marginTop: 4,
          letterSpacing: 0.3,
          textAlign: 'center' as const,
        },
        tabBarIconStyle: {
          marginTop: 0,
          alignSelf: 'center' as const,
        },
        tabBarItemStyle: {
          justifyContent: 'center' as const,
          alignItems: 'center' as const,
          paddingVertical: 4,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={tabIcons.home} focused={focused} testID="icon-home" />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              Icon={tabIcons.messages}
              focused={focused}
              testID="icon-messages"
              badgeCount={unreadCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="nearby"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon Icon={tabIcons.profile} focused={focused} testID="icon-profile" />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    position: 'relative' as const,
    width: TAB_ICON_SIZE + 8,
    height: TAB_ICON_SIZE + 4,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: designTokens.color.accent,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: designTokens.color.surface,
  },
  badgeText: {
    color: designTokens.color.primaryOn,
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
