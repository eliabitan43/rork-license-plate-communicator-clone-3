import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { X, Award } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { StarRating } from './StarRating';
import { UserRating } from '@/types';
import { useAppStore } from '@/hooks/useAppStore';

interface RatingModalProps {
  visible: boolean;
  onClose: () => void;
  targetPlate: string;
  targetName?: string;
  messageId?: string;
  interactionType: 'message' | 'marketplace' | 'service' | 'general';
}

export function RatingModal({
  visible,
  onClose,
  targetPlate,
  targetName,
  messageId,
  interactionType,
}: RatingModalProps) {
  const { userProfile, rateUser, awardBadge } = useAppStore();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!userProfile) return;

    setIsSubmitting(true);
    try {
      const userRating: UserRating = {
        id: Date.now().toString(),
        fromPlate: userProfile.vehicles.find(v => v.isPrimary)?.licensePlate || userProfile.vehicles[0]?.licensePlate || '',
        toPlate: targetPlate,
        rating,
        comment: comment.trim() || undefined,
        messageId,
        interactionType,
        timestamp: new Date().toISOString(),
        isAnonymous: userProfile.isAnonymous,
      };

      await rateUser(userRating);

      // Award badges based on rating behavior
      if (rating >= 4) {
        const goodNeighborBadge = {
          id: Date.now().toString() + '_badge',
          type: 'good_neighbor' as const,
          title: 'Good Neighbor',
          description: 'Recognizes positive community interactions',
          icon: 'House',
          color: theme.colors.success,
          earnedAt: new Date().toISOString(),
        };
        await awardBadge(goodNeighborBadge);
      }

      console.log('Rating submitted successfully');
      onClose();

      setRating(5);
      setComment('');
    } catch {
      console.error('Failed to submit rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(5);
    setComment('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Rate This Driver</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.driverInfo}>
            <View style={styles.plateContainer}>
              <Text style={styles.plateText}>{targetPlate}</Text>
            </View>
            {targetName && (
              <Text style={styles.driverName}>{targetName}</Text>
            )}
          </View>

          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>How was your interaction?</Text>
            <View style={styles.starsContainer}>
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size={40}
              />
            </View>
            <Text style={styles.ratingText}>
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </Text>
          </View>

          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Add a comment (optional)</Text>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Share your experience..."
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.characterCount}>{comment.length}/200</Text>
          </View>

          <View style={styles.communityMessage}>
            <Award size={20} color={theme.colors.primary} />
            <Text style={styles.communityText}>
              Your rating helps build a safer, more helpful community
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  driverInfo: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  plateContainer: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
  },
  plateText: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.white,
    letterSpacing: 2,
  },
  driverName: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.textSecondary,
  },
  ratingSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  starsContainer: {
    marginBottom: theme.spacing.sm,
  },
  ratingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  commentSection: {
    marginBottom: theme.spacing.xl,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  characterCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: theme.spacing.xs,
  },
  communityMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  communityText: {
    flex: 1,
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
});