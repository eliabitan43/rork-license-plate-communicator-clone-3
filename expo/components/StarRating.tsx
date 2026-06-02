import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { theme } from '@/constants/theme';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
  maxRating?: number;
}

export function StarRating({ 
  rating, 
  onRatingChange, 
  size = 20, 
  readonly = false,
  maxRating = 5 
}: StarRatingProps) {
  const handleStarPress = (starIndex: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(starIndex + 1);
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: maxRating }, (_, index) => {
        const isFilled = index < Math.floor(rating);
        const isHalfFilled = index < rating && index >= Math.floor(rating);
        
        return (
          <TouchableOpacity
            key={index}
            onPress={() => handleStarPress(index)}
            disabled={readonly}
            style={styles.starButton}
          >
            <Star
              size={size}
              color={isFilled || isHalfFilled ? theme.colors.warning : theme.colors.gray}
              fill={isFilled || isHalfFilled ? theme.colors.warning : 'transparent'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starButton: {
    marginRight: 2,
  },
});