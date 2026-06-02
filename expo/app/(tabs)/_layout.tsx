import { Tabs } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { tabIcons } from "@/constants/actionIcons";
import { designTokens } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";

const GOLD = '#FFD700';
const GOLD_INACTIVE = 'rgba(255, 215, 0, 0.55)';
const TAB_ICON_SIZE = 28;
const TAB_BAR_HEIGHT = 72;

export default function TabLayout() {
  const appStore = useAppStore();
  const unreadCount = appStore?.unreadCount ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: GOLD,
        tabBarInactiveTintColor: GOLD_INACTIVE,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Platform.OS === 'web'
            ? 'rgba(255, 255, 255, 0.92)'
            : 'rgba(255, 255, 255, 0.88)',
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
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 24,
            },
            android: {
              elevation: 20,
            },
            default: {
              borderWidth: 1,
              borderColor: 'rgba(226, 226, 236, 0.6)',
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
          tabBarIcon: ({ focused }) => {
            const HomeIcon = tabIcons.home;
            return (
              <View style={styles.iconWrap} testID="icon-home">
                <HomeIcon
                  size={TAB_ICON_SIZE}
                  color={focused ? GOLD : GOLD_INACTIVE}
                  strokeWidth={focused ? 2.4 : 2}
                />
              </View>
            );
          },
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ focused }) => {
            const MessagesIcon = tabIcons.messages;
            return (
              <View style={styles.iconWrap} testID="icon-messages">
                <MessagesIcon
                  size={TAB_ICON_SIZE}
                  color={focused ? GOLD : GOLD_INACTIVE}
                  strokeWidth={focused ? 2.4 : 2}
                />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </View>
            );
          },
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
          tabBarIcon: ({ focused }) => {
            const ProfileIcon = tabIcons.profile;
            return (
              <View style={styles.iconWrap} testID="icon-profile">
                <ProfileIcon
                  size={TAB_ICON_SIZE}
                  color={focused ? GOLD : GOLD_INACTIVE}
                  strokeWidth={focused ? 2.4 : 2}
                />
              </View>
            );
          },
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
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700' as const,
  },
});
