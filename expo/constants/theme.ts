interface TypeScale {
  size: number;
  weight: string;
  lineHeight: number;
  letterSpacing: number;
}

interface GlassConfig {
  background: string;
  backgroundSolid: string;
  border: string;
  shadowColor: string;
  shadowOpacity: number;
  blurIntensity: number;
}

interface DesignTokens {
  brand: {
    slogan: string;
    name: string;
  };

  color: {
    primary: string;
    primaryLight: string;
    primarySoft: string;
    primaryOn: string;
    secondary: string;
    secondaryOn: string;
    accent: string;
    accentSoft: string;
    accentPurple: string;
    accentTeal: string;
    bg: string;
    surface: string;
    surfaceElevated: string;
    surfaceWarm: string;
    text: string;
    textMuted: string;
    textLight: string;
    border: string;
    borderMuted: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    error: string;
    errorSoft: string;
    info: string;
    infoSoft: string;
    mapAccent: string;
  };

  dark: {
    primary: string;
    primaryOn: string;
    secondary: string;
    secondaryOn: string;
    accent: string;
    accentPurple: string;
    accentTeal: string;
    bg: string;
    surface: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    textLight: string;
    border: string;
    borderMuted: string;
  };

  glass: {
    light: GlassConfig;
    dark: GlassConfig;
    accent: GlassConfig;
  };

  scrim: {
    backdrop: string;
  };

  font: {
    family: string;
    familyMono: string;
  };

  type: {
    h1: TypeScale;
    h2: TypeScale;
    h3: TypeScale;
    title: TypeScale;
    subhead: TypeScale;
    subheadSmall: TypeScale;
    body: TypeScale;
    bodySmall: TypeScale;
    small: TypeScale;
    caption: TypeScale;
    overline: TypeScale;
  };

  grid: {
    unit: number;
  };

  radius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
    full: number;
  };

  elevation: {
    sm: number;
    md: number;
    lg: number;
  };

  icon: {
    sm: number;
    md: number;
    lg: number;
  };

  tap: {
    targetMin: number;
  };

  motion: {
    fast: number;
    std: number;
    slow: number;
    easing: string;
  };

  state: {
    hover: { opacity: number };
    pressed: { opacity: number };
    disabled: { opacity: number };
  };

  focus: {
    ring: string;
    ringOffset: string;
  };
}

export const designTokens: DesignTokens = {
  brand: {
    slogan: 'Send a quick message to any driver',
    name: 'HOMI',
  },

  color: {
    primary: '#1B6EF3',
    primaryLight: '#EDF4FF',
    primarySoft: '#B8D4FF',
    primaryOn: '#FFFFFF',
    secondary: '#151518',
    secondaryOn: '#FFFFFF',
    accent: '#F26530',
    accentSoft: '#FFF2ED',
    accentPurple: '#7E5BF0',
    accentTeal: '#00C896',
    bg: '#F5F5FA',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    surfaceWarm: '#F8F8FC',
    text: '#111114',
    textMuted: '#6E6E82',
    textLight: '#A0A0B2',
    border: '#E2E2EC',
    borderMuted: '#EDEDF5',
    success: '#22C55E',
    successSoft: '#E7FAF0',
    warning: '#F5A623',
    warningSoft: '#FFF6E5',
    error: '#EF4444',
    errorSoft: '#FEE9E9',
    info: '#1B6EF3',
    infoSoft: '#EDF4FF',
    mapAccent: '#1B6EF3',
  },

  dark: {
    primary: '#4D94FF',
    primaryOn: '#FFFFFF',
    secondary: '#E2E2EC',
    secondaryOn: '#151518',
    accent: '#F26530',
    accentPurple: '#9B7EFF',
    accentTeal: '#34D8A0',
    bg: '#0C0C10',
    surface: '#1A1A22',
    surfaceElevated: '#262630',
    text: '#F0F0F5',
    textMuted: '#8888A0',
    textLight: '#555568',
    border: '#2E2E3C',
    borderMuted: '#22222E',
  },

  glass: {
    light: {
      background: 'rgba(255, 255, 255, 0.68)',
      backgroundSolid: '#FFFFFFAD',
      border: 'rgba(255, 255, 255, 0.55)',
      shadowColor: '#000000',
      shadowOpacity: 0.08,
      blurIntensity: 50,
    },
    dark: {
      background: 'rgba(20, 20, 28, 0.72)',
      backgroundSolid: '#14141CB8',
      border: 'rgba(255, 255, 255, 0.1)',
      shadowColor: '#000000',
      shadowOpacity: 0.24,
      blurIntensity: 60,
    },
    accent: {
      background: 'rgba(27, 110, 243, 0.06)',
      backgroundSolid: '#1B6EF30F',
      border: 'rgba(27, 110, 243, 0.12)',
      shadowColor: '#1B6EF3',
      shadowOpacity: 0.06,
      blurIntensity: 30,
    },
  },

  scrim: {
    backdrop: 'rgba(0,0,0,0.45)',
  },

  font: {
    family: 'System',
    familyMono: 'System',
  },

  type: {
    h1: { size: 34, weight: '800', lineHeight: 40, letterSpacing: -0.6 },
    h2: { size: 26, weight: '700', lineHeight: 32, letterSpacing: -0.4 },
    h3: { size: 21, weight: '700', lineHeight: 27, letterSpacing: -0.2 },
    title: { size: 18, weight: '600', lineHeight: 24, letterSpacing: -0.1 },
    subhead: { size: 16, weight: '600', lineHeight: 22, letterSpacing: 0 },
    subheadSmall: { size: 14, weight: '600', lineHeight: 20, letterSpacing: 0 },
    body: { size: 16, weight: '400', lineHeight: 24, letterSpacing: 0.1 },
    bodySmall: { size: 14, weight: '400', lineHeight: 21, letterSpacing: 0.1 },
    small: { size: 12, weight: '400', lineHeight: 18, letterSpacing: 0.1 },
    caption: { size: 12, weight: '600', lineHeight: 16, letterSpacing: 0.4 },
    overline: { size: 11, weight: '700', lineHeight: 14, letterSpacing: 1 },
  },

  grid: {
    unit: 8,
  },

  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 22,
    xxl: 28,
    full: 999,
  },

  elevation: {
    sm: 2,
    md: 6,
    lg: 12,
  },

  icon: {
    sm: 18,
    md: 22,
    lg: 28,
  },

  tap: {
    targetMin: 48,
  },

  motion: {
    fast: 100,
    std: 200,
    slow: 340,
    easing: 'ease-out',
  },

  state: {
    hover: { opacity: 0.06 },
    pressed: { opacity: 0.1 },
    disabled: { opacity: 0.38 },
  },

  focus: {
    ring: '2px solid #1B6EF3',
    ringOffset: '2px',
  },
};

export const componentRecipes = {
  buttonPrimary: {
    backgroundColor: designTokens.color.primary,
    color: designTokens.color.primaryOn,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: designTokens.elevation.md,
    fontSize: designTokens.type.body.size,
    fontWeight: '600',
    fontFamily: designTokens.font.family,
  },

  buttonSecondary: {
    backgroundColor: designTokens.color.secondary,
    color: designTokens.color.secondaryOn,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: designTokens.elevation.sm,
    fontSize: designTokens.type.body.size,
    fontWeight: '600',
    fontFamily: designTokens.font.family,
  },

  buttonAccent: {
    backgroundColor: designTokens.color.accent,
    color: '#FFFFFF',
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 16,
    shadowColor: designTokens.color.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: designTokens.elevation.md,
    fontSize: designTokens.type.body.size,
    fontWeight: '600',
    fontFamily: designTokens.font.family,
  },

  buttonOutline: {
    backgroundColor: 'transparent',
    color: designTokens.color.text,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 16,
    fontSize: designTokens.type.body.size,
    fontWeight: '600',
    fontFamily: designTokens.font.family,
  },

  chipFilter: {
    backgroundColor: designTokens.color.surface,
    color: designTokens.color.text,
    borderRadius: designTokens.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: designTokens.type.bodySmall.size,
    fontWeight: designTokens.type.bodySmall.weight,
    fontFamily: designTokens.font.family,
  },

  chipFilterSelected: {
    backgroundColor: designTokens.color.primary,
    borderWidth: 0,
    color: '#FFFFFF',
  },

  tileCard: {
    backgroundColor: designTokens.color.surface,
    borderRadius: designTokens.radius.xl,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: designTokens.elevation.sm,
  },

  glassCard: {
    backgroundColor: designTokens.glass.light.background,
    borderRadius: designTokens.radius.xl,
    borderWidth: 1,
    borderColor: designTokens.glass.light.border,
    padding: 16,
    shadowColor: designTokens.glass.light.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: designTokens.glass.light.shadowOpacity,
    shadowRadius: 16,
    elevation: designTokens.elevation.sm,
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: designTokens.color.primary,
    shadowColor: designTokens.color.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: designTokens.elevation.lg,
    position: 'absolute' as const,
    bottom: 24,
    right: 24,
  },

  input: {
    backgroundColor: designTokens.color.surfaceWarm,
    borderWidth: 1.5,
    borderColor: designTokens.color.border,
    borderRadius: designTokens.radius.lg,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: designTokens.type.body.size,
    fontWeight: designTokens.type.body.weight,
    fontFamily: designTokens.font.family,
    color: designTokens.color.text,
  },

  bottomSheet: {
    backgroundColor: designTokens.color.surface,
    borderTopLeftRadius: designTokens.radius.xxl,
    borderTopRightRadius: designTokens.radius.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 25,
  },
} as const;

export const theme = {
  colors: {
    primary: designTokens.color.primary,
    primaryDark: '#1458C7',
    primaryLight: designTokens.color.primaryLight,

    secondary: designTokens.color.secondary,
    secondaryDark: '#0A0A0C',
    secondaryLight: '#2A2A32',

    accent: designTokens.color.accent,
    accentPurple: designTokens.color.accentPurple,
    accentTeal: designTokens.color.accentTeal,

    danger: designTokens.color.error,
    success: designTokens.color.success,
    warning: designTokens.color.warning,
    info: designTokens.color.info,

    dark: designTokens.color.text,
    gray: designTokens.color.textMuted,
    lightGray: '#E2E2EC',
    white: '#FFFFFF',
    background: designTokens.color.bg,
    surface: designTokens.color.surface,
    surfaceElevated: designTokens.color.surfaceElevated,
    cardBg: designTokens.color.surface,

    textPrimary: designTokens.color.text,
    textSecondary: designTokens.color.textMuted,
    textLight: designTokens.color.textLight,

    border: designTokens.color.border,
    borderMuted: designTokens.color.borderMuted,

    matteBlack: '#151518',
    orange: designTokens.color.accent,
    fieryOrange: designTokens.color.accent,
    brandOrange: designTokens.color.accent,
    brandBlack: '#151518',
  },
  gradients: {
    primary: ['#1B6EF3', '#1458C7'] as const,
    primarySoft: ['#B8D4FF', '#1B6EF3'] as const,

    secondary: ['#2A2A32', '#151518'] as const,
    secondarySoft: ['#44444E', '#2A2A32'] as const,

    accent: ['#F26530', '#D95525'] as const,
    purple: ['#7E5BF0', '#6842E0'] as const,
    teal: ['#00C896', '#1B6EF3'] as const,

    success: ['#22C55E', '#1DA750'] as const,
    danger: ['#EF4444', '#D63939'] as const,
    warning: ['#F5A623', '#E09318'] as const,
    info: ['#1B6EF3', '#1458C7'] as const,

    glass: ['rgba(255,255,255,0.92)', 'rgba(255,255,255,0.65)'] as const,
    glassDark: ['rgba(20,20,28,0.85)', 'rgba(20,20,28,0.55)'] as const,

    heroMesh: ['#1B6EF3', '#1458C7', '#0D3F94'] as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: designTokens.radius.sm,
    md: designTokens.radius.md,
    lg: designTokens.radius.lg,
    xl: designTokens.radius.xl,
    xxl: designTokens.radius.xxl,
    round: designTokens.radius.full,
  },
  fontSize: {
    xs: designTokens.type.caption.size,
    sm: designTokens.type.bodySmall.size,
    md: designTokens.type.body.size,
    lg: designTokens.type.subheadSmall.size,
    xl: designTokens.type.title.size,
    xxl: designTokens.type.h1.size,
    h1: designTokens.type.h1.size,
    h3: designTokens.type.h3.size,
  },
  typography: {
    h1: {
      fontSize: designTokens.type.h1.size,
      fontWeight: designTokens.type.h1.weight as any,
      color: designTokens.color.text,
      lineHeight: designTokens.type.h1.lineHeight,
      letterSpacing: designTokens.type.h1.letterSpacing,
      fontFamily: designTokens.font.family,
    },
    h2: {
      fontSize: designTokens.type.h2.size,
      fontWeight: designTokens.type.h2.weight as any,
      color: designTokens.color.text,
      lineHeight: designTokens.type.h2.lineHeight,
      letterSpacing: designTokens.type.h2.letterSpacing,
      fontFamily: designTokens.font.family,
    },
    h3: {
      fontSize: designTokens.type.h3.size,
      fontWeight: designTokens.type.h3.weight as any,
      color: designTokens.color.text,
      lineHeight: designTokens.type.h3.lineHeight,
      letterSpacing: designTokens.type.h3.letterSpacing,
      fontFamily: designTokens.font.family,
    },
    body: {
      fontSize: designTokens.type.body.size,
      fontWeight: designTokens.type.body.weight as any,
      color: designTokens.color.text,
      lineHeight: designTokens.type.body.lineHeight,
      letterSpacing: designTokens.type.body.letterSpacing,
      fontFamily: designTokens.font.family,
    },
    bodySecondary: {
      fontSize: designTokens.type.body.size,
      fontWeight: designTokens.type.body.weight as any,
      color: designTokens.color.textMuted,
      lineHeight: designTokens.type.body.lineHeight,
      letterSpacing: designTokens.type.body.letterSpacing,
      fontFamily: designTokens.font.family,
    },
    caption: {
      fontSize: designTokens.type.caption.size,
      fontWeight: designTokens.type.caption.weight as any,
      color: designTokens.color.textMuted,
      lineHeight: designTokens.type.caption.lineHeight,
      letterSpacing: designTokens.type.caption.letterSpacing,
      fontFamily: designTokens.font.family,
    },
  },
  buttons: {
    cta: componentRecipes.buttonPrimary,
    ctaActive: {
      ...componentRecipes.buttonPrimary,
      backgroundColor: '#1458C7',
    },

    secondary: componentRecipes.buttonSecondary,
    secondaryActive: {
      ...componentRecipes.buttonSecondary,
      backgroundColor: '#22222A',
    },

    accent: componentRecipes.buttonAccent,
    outline: componentRecipes.buttonOutline,
  },
} as const;

export const getStateStyle = (state: 'hover' | 'pressed' | 'disabled') => {
  return {
    opacity: designTokens.state[state].opacity,
  };
};

export const getShadowStyle = (elevation: 'sm' | 'md' | 'lg') => {
  const elevationValue = designTokens.elevation[elevation];
  return {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: elevationValue / 2 },
    shadowOpacity: elevation === 'sm' ? 0.04 : elevation === 'md' ? 0.08 : 0.14,
    shadowRadius: elevation === 'lg' ? 20 : elevationValue * 2,
    elevation: elevationValue,
  };
};

export const getGlassStyle = (variant: 'light' | 'dark' | 'accent' = 'light') => {
  const glass = designTokens.glass[variant];
  return {
    backgroundColor: glass.backgroundSolid,
    borderWidth: 1,
    borderColor: glass.border,
    shadowColor: glass.shadowColor,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: glass.shadowOpacity,
    shadowRadius: 20,
    elevation: 3,
  };
};

export const getSpacing = (multiplier: number) => {
  return designTokens.grid.unit * multiplier;
};

export type ColorScheme = 'light' | 'dark';
export const getActiveColors = (scheme?: ColorScheme | null) => {
  const resolved: ColorScheme =
    scheme ??
    (typeof window !== 'undefined' &&
    (window as any).matchMedia &&
      (window as any).matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light');
  return resolved === 'dark' ? designTokens.dark : designTokens.color;
};

export const createTextStyle = (scale: keyof typeof designTokens.type, color?: string) => {
  const typeScale = designTokens.type[scale];
  return {
    fontSize: typeScale.size,
    fontWeight: typeScale.weight as any,
    lineHeight: typeScale.lineHeight,
    letterSpacing: typeScale.letterSpacing,
    color: color || designTokens.color.text,
    fontFamily: designTokens.font.family,
  };
};
