import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { designTokens } from '@/constants/theme';

interface HomiLogoProps {
  size?: number;
  onPress?: () => void;
  isClickable?: boolean;
  style?: any;
  showSlogan?: boolean;
}

export function HomiLogo({ size = 78, onPress, isClickable = false, style, showSlogan = false }: HomiLogoProps) {
  const logoUri = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/47kkmyiujuadsl2f3ecwu';
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (isClickable) {
      router.push('/(tabs)/dashboard');
    }
  };

  const scaled = Math.round(size * 1.725);

  const logoStyle = [
    styles.container,
    { width: scaled, height: scaled },
    style
  ];
  
  const imageStyle = {
    width: scaled,
    height: scaled
  } as const;
  
  if (isClickable || onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} testID="homiLogoButton">
        <View style={[logoStyle, showSlogan && styles.logoWithSlogan]} testID="homiLogoContainer">
          <Image 
            source={{ uri: logoUri }}
            style={imageStyle}
            resizeMode="contain"
            accessibilityLabel="HOMI logo"
            testID="homiLogoImage"
          />
          {showSlogan && (
            <Text style={styles.slogan} testID="homiLogoSlogan">{designTokens.brand.slogan}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[logoStyle, showSlogan && styles.logoWithSlogan]} testID="homiLogoContainer">
      <Image 
        source={{ uri: logoUri }}
        style={imageStyle}
        resizeMode="contain"
        accessibilityLabel="HOMI logo"
        testID="homiLogoImage"
      />
      {showSlogan && (
        <Text style={styles.slogan} testID="homiLogoSlogan">{designTokens.brand.slogan}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoWithSlogan: {
    gap: 8,
  },
  slogan: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
