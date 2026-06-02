import React, { memo, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path, Rect } from "react-native-svg";

export type MinimalIconComponent = React.ComponentType<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}>;

export type ActionIconGlyph = MinimalIconComponent | "parking" | "window";

type ActionIconShape = "circle" | "capsule";

interface ActionIconProps {
  icon: ActionIconGlyph;
  size?: number;
  iconSize?: number;
  shape?: ActionIconShape;
  active?: boolean;
  highlight?: boolean;
  style?: StyleProp<ViewStyle>;
  iconColor?: string;
  borderColor?: string;
  testID?: string;
}

const BRAND_PRIMARY = "#4FB6FF";
const BRAND_SECONDARY = "#F4F6F8";
const ACCENT = "#2ED3B7";
const HIGHLIGHT = "#FF7A6E";
const DEFAULT_BORDER = "rgba(79, 182, 255, 0.14)";

function ParkingGlyph({ size = 18, color = ACCENT, strokeWidth = 1.9 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 18V6H13C15.761 6 18 8.239 18 11C18 13.761 15.761 16 13 16H8"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 11.5H13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WindowGlyph({ size = 18, color = ACCENT, strokeWidth = 1.9 }: { size?: number; color?: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="5"
        y="6"
        width="14"
        height="12"
        rx="2.5"
        stroke={color}
        strokeWidth={strokeWidth}
      />
      <Path
        d="M5.5 10H18.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <Path
        d="M12 6.5V17.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export const ActionIcon = memo(function ActionIcon({
  icon,
  size = 36,
  iconSize = 18,
  shape = "circle",
  active = false,
  highlight = true,
  style,
  iconColor = ACCENT,
  borderColor = DEFAULT_BORDER,
  testID,
}: ActionIconProps) {
  const isCapsule = shape === "capsule";
  const width = isCapsule ? Math.round(size * 1.55) : size;
  const radius = isCapsule ? Math.round(size / 2) : Math.round(size / 2);

  const gradientColors = useMemo(() => {
    if (active) {
      return [BRAND_PRIMARY, "#DFF2FF", BRAND_SECONDARY] as const;
    }

    return ["#EAF7FF", BRAND_SECONDARY] as const;
  }, [active]);

  const renderGlyph = () => {
    if (icon === "parking") {
      return <ParkingGlyph size={iconSize} color={iconColor} strokeWidth={1.95} />;
    }

    if (icon === "window") {
      return <WindowGlyph size={iconSize} color={iconColor} strokeWidth={1.85} />;
    }

    const IconComponent = icon;
    return <IconComponent size={iconSize} color={iconColor} strokeWidth={2} />;
  };

  return (
    <View
      testID={testID}
      style={[
        styles.shadowWrap,
        {
          width,
          height: size,
          borderRadius: radius,
          shadowOpacity: active ? 0.2 : 0.12,
          elevation: active ? 5 : 3,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          {
            borderRadius: radius,
            borderColor,
          },
        ]}
      >
        <View style={styles.iconWrap}>{renderGlyph()}</View>
        <View style={[styles.sheen, isCapsule ? styles.sheenCapsule : null]} />
        {highlight ? <View style={styles.highlightDot} /> : null}
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  shadowWrap: {
    shadowColor: BRAND_PRIMARY,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
  },
  gradient: {
    flex: 1,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    backgroundColor: BRAND_SECONDARY,
  },
  iconWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  sheen: {
    position: "absolute",
    top: 1,
    left: 2,
    right: 2,
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.42)",
  },
  sheenCapsule: {
    left: 6,
    right: 6,
  },
  highlightDot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: HIGHLIGHT,
    shadowColor: HIGHLIGHT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
  },
});
