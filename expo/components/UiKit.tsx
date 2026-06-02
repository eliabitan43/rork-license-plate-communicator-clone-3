import React, { memo, PropsWithChildren, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, GestureResponderEvent, ViewStyle, TextStyle, useWindowDimensions, Animated, Easing, useColorScheme } from 'react-native';
import { designTokens, componentRecipes, getShadowStyle } from '@/constants/theme';

export type Spacing = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6;

function useGutter() {
  const { width } = useWindowDimensions();
  const base = designTokens.grid.unit * 2;
  if (width >= 1200) return base * 3;
  if (width >= 768) return base * 2.5;
  if (width >= 420) return base * 2;
  return base * 1.5;
}

export const Container = memo(function Container({ children, style, testID }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[]; testID?: string }>) {
  const gutter = useGutter();
  const containerStyle = useMemo(() => [uiStyles.containerBase, { paddingHorizontal: gutter }, style] as const, [gutter, style]);
  return (
    <View style={containerStyle as any} testID={testID ?? 'ui-container'}>
      {children}
    </View>
  );
});

export const Stack = memo(function Stack({ children, gap = 2, style, testID }: PropsWithChildren<{ gap?: Spacing; style?: ViewStyle | ViewStyle[]; testID?: string }>) {
  const spacing = designTokens.grid.unit * gap;
  const childArray = React.Children.toArray(children);
  return (
    <View style={style} testID={testID ?? 'ui-stack'}>
      {childArray.map((child, i) => (
        <View key={`stack-${i}`} style={i < childArray.length - 1 ? [uiStyles.stackSpacer, { marginBottom: spacing }] : uiStyles.stackSpacerNone}>
          {child as any}
        </View>
      ))}
    </View>
  );
});

export const Row = memo(function Row({ children, gap = 1, align = 'center', justify = 'flex-start', wrap = false, style, testID }: PropsWithChildren<{ gap?: Spacing; align?: ViewStyle['alignItems']; justify?: ViewStyle['justifyContent']; wrap?: boolean; style?: ViewStyle | ViewStyle[]; testID?: string }>) {
  const spacing = designTokens.grid.unit * gap;
  const childArray = React.Children.toArray(children);
  return (
    <View style={[uiStyles.rowBase, { alignItems: align, justifyContent: justify, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]} testID={testID ?? 'ui-row'}>
      {childArray.map((child, i) => (
        <View key={`row-${i}`} style={i < childArray.length - 1 ? [uiStyles.rowSpacer, { marginRight: spacing }] : uiStyles.rowSpacerNone}>
          {child as any}
        </View>
      ))}
    </View>
  );
});

const textBase: TextStyle = {
  color: designTokens.color.text,
  fontFamily: designTokens.font.family,
};

export const H1 = memo(function H1({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-h1'} style={[textBase, uiStyles.h1, style]}>{children}</Text>
  );
});

export const H2 = memo(function H2({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-h2'} style={[textBase, uiStyles.h2, style]}>{children}</Text>
  );
});

export const H3 = memo(function H3({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-h3'} style={[textBase, uiStyles.h3, style]}>{children}</Text>
  );
});

export const Title = memo(function Title({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-title'} style={[textBase, uiStyles.title, style]}>{children}</Text>
  );
});

export const Body = memo(function Body({ children, muted = false, style, testID }: PropsWithChildren<{ muted?: boolean; style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-body'} style={[textBase, uiStyles.body, muted ? uiStyles.bodyMuted : null, style]}>{children}</Text>
  );
});

export const Small = memo(function Small({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-small'} style={[textBase, uiStyles.small, style]}>{children}</Text>
  );
});

export const Caption = memo(function Caption({ children, style, testID }: PropsWithChildren<{ style?: TextStyle | TextStyle[]; testID?: string }>) {
  return (
    <Text testID={testID ?? 'typography-caption'} style={[textBase, uiStyles.caption, style]}>{children}</Text>
  );
});

export const Divider = memo(function Divider({ inset = 0, style, testID }: { inset?: number; style?: ViewStyle | ViewStyle[]; testID?: string }) {
  return <View testID={testID ?? 'ui-divider'} style={[uiStyles.divider, { marginLeft: inset }, style]} />;
});

export const Card = memo(function Card({ children, style, testID }: PropsWithChildren<{ style?: ViewStyle | ViewStyle[]; testID?: string }>) {
  return (
    <View testID={testID ?? 'ui-card'} style={[styles.card, style]}>
      {children}
    </View>
  );
});

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'accent';

function getButtonRecipe(variant: ButtonVariant): ViewStyle {
  switch (variant) {
    case 'secondary':
      return componentRecipes.buttonSecondary as unknown as ViewStyle;
    case 'outline':
      return componentRecipes.buttonOutline as unknown as ViewStyle;
    case 'accent':
      return componentRecipes.buttonAccent as unknown as ViewStyle;
    default:
      return componentRecipes.buttonPrimary as unknown as ViewStyle;
  }
}

export const Button = memo(function Button({ title, onPress, variant = 'primary', disabled = false, testID, style, textStyle }: { title: string; onPress?: (e: GestureResponderEvent) => void; variant?: ButtonVariant; disabled?: boolean; testID?: string; style?: ViewStyle | ViewStyle[]; textStyle?: TextStyle | TextStyle[]; }) {
  const scheme = useColorScheme();
  const recipe = getButtonRecipe(variant);
  const base: ViewStyle = {
    height: recipe.height ?? 48,
    backgroundColor: (recipe as any).backgroundColor ?? (scheme === 'dark' ? designTokens.dark.primary : designTokens.color.primary),
    borderRadius: recipe.borderRadius ?? designTokens.radius.lg,
    paddingHorizontal: recipe.paddingHorizontal ?? designTokens.grid.unit * 3,
    borderWidth: (recipe as any).borderWidth ?? 0,
    borderColor: (recipe as any).borderColor ?? 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: disabled ? designTokens.state.disabled.opacity : 1,
  };
  const textBaseStyle: TextStyle = {
    color: (recipe as any).color ?? designTokens.color.primaryOn,
    fontSize: (recipe as any).fontSize ?? designTokens.type.body.size,
    fontWeight: (recipe as any).fontWeight as any ?? '700',
    fontFamily: designTokens.font.family,
  };
  const scale = useRef(new Animated.Value(1)).current;
  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.98, duration: 80, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true, easing: Easing.out(Easing.quad) }).start();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.8} onPress={disabled ? undefined : onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={[base, getShadowStyle('sm'), style]} testID={testID ?? `btn-${variant}`}>
        <Text style={[textBase, textBaseStyle, textStyle]}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

export const IconBadge = memo(function IconBadge({ children, color = designTokens.color.surface, size = 36, testID }: PropsWithChildren<{ color?: string; size?: number; testID?: string }>) {
  return (
    <View testID={testID ?? 'ui-icon-badge'} style={[uiStyles.iconBadge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
      {children}
    </View>
  );
});

export const Screen = memo(function Screen({ children, background = 'bg', testID, style }: PropsWithChildren<{ background?: 'bg' | 'surface'; testID?: string; style?: ViewStyle | ViewStyle[] }>) {
  const scheme = useColorScheme();
  const bg = scheme === 'dark' ? (background === 'surface' ? designTokens.dark.surface : designTokens.dark.bg) : (background === 'surface' ? designTokens.color.surface : designTokens.color.bg);
  return (
    <View testID={testID ?? 'ui-screen'} style={[uiStyles.screenBase, { backgroundColor: bg }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    ...componentRecipes.tileCard,
  } as ViewStyle,
});

const uiStyles = StyleSheet.create({
  containerBase: {
    paddingVertical: designTokens.grid.unit * 2,
  },
  stackSpacer: {
    width: '100%',
  },
  stackSpacerNone: {
    width: '100%',
  },
  rowBase: {
    flexDirection: 'row',
  },
  rowSpacer: {
    height: '100%',
  },
  rowSpacerNone: {
    height: '100%',
  },
  h1: {
    fontSize: designTokens.type.h1.size,
    fontWeight: designTokens.type.h1.weight as any,
    lineHeight: designTokens.type.h1.lineHeight,
  },
  h2: {
    fontSize: designTokens.type.h2.size,
    fontWeight: designTokens.type.h2.weight as any,
    lineHeight: designTokens.type.h2.lineHeight,
  },
  h3: {
    fontSize: designTokens.type.h3.size,
    fontWeight: designTokens.type.h3.weight as any,
    lineHeight: designTokens.type.h3.lineHeight,
  },
  title: {
    fontSize: designTokens.type.title.size,
    fontWeight: designTokens.type.title.weight as any,
    lineHeight: designTokens.type.title.lineHeight,
  },
  body: {
    fontSize: designTokens.type.body.size,
    fontWeight: designTokens.type.body.weight as any,
    lineHeight: designTokens.type.body.lineHeight,
    color: designTokens.color.text,
  },
  bodyMuted: {
    color: designTokens.color.textMuted,
  },
  small: {
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: designTokens.type.bodySmall.weight as any,
    lineHeight: designTokens.type.bodySmall.lineHeight,
    color: designTokens.color.textMuted,
  },
  caption: {
    fontSize: designTokens.type.caption.size,
    fontWeight: designTokens.type.caption.weight as any,
    lineHeight: designTokens.type.caption.lineHeight,
    color: designTokens.color.textLight,
    textTransform: 'uppercase',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: designTokens.color.border,
    marginVertical: designTokens.grid.unit * 2,
  },

  iconBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: designTokens.color.border,
  },
  screenBase: {
    flex: 1,
  },
});
