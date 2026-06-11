/**
 * HOMI motion vocabulary — the single source of animation truth.
 *
 * Rules:
 * - Everything runs on the UI thread (worklets / Reanimated layout animations).
 * - No setState-driven animation loops.
 * - Reduced motion is respected: Reanimated layout animations default to
 *   ReduceMotion.System, and the hooks below check useReducedMotion().
 */
import { useCallback, useEffect } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type WithSpringConfig,
} from 'react-native-reanimated';

export const springs = {
  /** Taps, toggles, active-state recovery. */
  snappy: { damping: 18, stiffness: 220 } satisfies WithSpringConfig,
  /** Layout shifts, entrances, sheets. */
  gentle: { damping: 22, stiffness: 140 } satisfies WithSpringConfig,
  /** Success icons — visible overshoot. */
  bouncy: { damping: 12, stiffness: 180 } satisfies WithSpringConfig,
} as const;

export const durations = {
  fast: 120,
  base: 180,
  enter: 240,
  slow: 280,
} as const;

/**
 * Entrance: translateY 14 → 0 + fade, 240ms. Staggerable via `delay`.
 * Usage: <Animated.View entering={enterUp(index * 40)}>
 */
export function enterUp(delay = 0) {
  return FadeInDown.duration(durations.enter)
    .delay(delay)
    .easing(Easing.out(Easing.cubic))
    .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] });
}

/** Plain fade entrance for low-emphasis surfaces. */
export function enterFade(delay = 0) {
  return FadeIn.duration(durations.base).delay(delay);
}

/** Scale-to-0.97 press feedback. Spread the handlers onto a Pressable. */
export function usePressScale(scaleTo = 0.97) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  const onPressIn = useCallback(() => {
    scale.value = reduced ? 1 : withSpring(scaleTo, springs.snappy);
  }, [reduced, scale, scaleTo]);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, springs.snappy);
  }, [scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle, onPressIn, onPressOut };
}

/** Horizontal shake for validation errors (plate input). Call `shake()` to fire. */
export function useShake() {
  const offset = useSharedValue(0);
  const reduced = useReducedMotion();

  const shake = useCallback(() => {
    if (reduced) return;
    cancelAnimation(offset);
    offset.value = withSequence(
      withTiming(-7, { duration: 50 }),
      withTiming(7, { duration: 50 }),
      withTiming(-5, { duration: 50 }),
      withTiming(5, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [offset, reduced]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return { animatedStyle, shake };
}

/** Infinite soft pulse for live dots and critical badges. */
export function usePulse(active = true) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: durations.fast });
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.25, { duration: 600, easing: Easing.inOut(Easing.sin) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
    return () => cancelAnimation(scale);
  }, [active, reduced, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
}

/** Spring scale for the focused tab icon: 1 → 1.12 → settle. */
export function useTabFocusScale(focused: boolean) {
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      scale.value = 1;
      return;
    }
    if (focused) {
      scale.value = withSequence(
        withTiming(1.12, { duration: durations.fast, easing: Easing.out(Easing.quad) }),
        withSpring(1, springs.snappy),
      );
    } else {
      scale.value = withSpring(1, springs.snappy);
    }
  }, [focused, reduced, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { animatedStyle };
}
