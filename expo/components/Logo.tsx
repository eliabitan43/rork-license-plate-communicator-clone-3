import React from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';

interface LogoProps {
  size?: number;
  color?: string;
  gradient?: boolean;
  onPress?: () => void;
  isClickable?: boolean;
}

export function Logo({ size = 75, color = '#000000', gradient = false, onPress, isClickable = false }: LogoProps) {
  const width = Math.round(size * 1.725);
  const height = Math.round(size * 1.725);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (isClickable) {
      router.push('/(tabs)/profile');
    }
  };

  const logoUri = 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/47kkmyiujuadsl2f3ecwu';
  
  if (isClickable || onPress) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7} testID="logoButton">
        <View style={[styles.container, { width, height }]} testID="logoContainer">
          <Image 
            source={{ uri: logoUri }}
            style={[styles.image, { width, height }]}
            resizeMode="contain"
            accessibilityLabel="HOMI logo"
            testID="logoImage"
          />
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { width, height }]} testID="logoContainer">
      <Image 
        source={{ uri: logoUri }}
        style={[styles.image, { width, height }]}
        resizeMode="contain"
        accessibilityLabel="HOMI logo"
        testID="logoImage"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
  },
});
