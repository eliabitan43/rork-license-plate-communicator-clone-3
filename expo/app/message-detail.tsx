import React from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { X, User, Car, MapPin, Clock, Star } from "lucide-react-native";
import { router, useLocalSearchParams } from "expo-router";
import { theme } from "@/constants/theme";
import { useAppStore } from "@/hooks/useAppStore";
import { RatingModal } from "@/components/RatingModal";

export default function MessageDetailScreen() {
  const { messageId } = useLocalSearchParams();
  const { messages, userProfile } = useAppStore();
  const [showRatingModal, setShowRatingModal] = React.useState(false);
  
  const message = messages.find(m => m.id === messageId);
  const userPlates = userProfile?.vehicles?.map((vehicle) => vehicle.licensePlate) ?? [];

  if (!message) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={() => {
            try {
              router.back();
            } catch {
              router.replace('/(tabs)/messages');
            }
          }}>
            <X size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Message Not Found</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>This message could not be found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isSent = userPlates.includes(message.fromPlate);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => {
          try {
            router.back();
          } catch {
            router.replace('/(tabs)/messages');
          }
        }}>
          <X size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Message Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.messageCard, isSent ? styles.sentCard : styles.receivedCard]}>
          <View style={styles.messageHeader}>
            <View style={styles.plateInfo}>
              <Car size={20} color={isSent ? theme.colors.primary : theme.colors.success} />
              <View>
                <Text style={styles.plateLabel}>
                  {isSent ? 'To' : 'From'}
                </Text>
                <Text style={styles.plateNumber}>
                  {isSent ? message.toPlate : message.fromPlate}
                </Text>
              </View>
            </View>
            
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {message.type.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.messageBody}>
            <Text style={styles.messageContent}>{message.content}</Text>
          </View>

          <View style={styles.messageFooter}>
            {message.isAnonymous ? (
              <View style={styles.footerItem}>
                <User size={16} color={theme.colors.gray} />
                <Text style={styles.footerText}>Anonymous</Text>
              </View>
            ) : message.fromName ? (
              <View style={styles.footerItem}>
                <User size={16} color={theme.colors.gray} />
                <Text style={styles.footerText}>{message.fromName}</Text>
              </View>
            ) : null}

            {message.location && (
              <View style={styles.footerItem}>
                <MapPin size={16} color={theme.colors.gray} />
                <Text style={styles.footerText}>{message.location}</Text>
              </View>
            )}

            <View style={styles.footerItem}>
              <Clock size={16} color={theme.colors.gray} />
              <Text style={styles.footerText}>
                {new Date(message.timestamp).toLocaleDateString()} at{' '}
                {new Date(message.timestamp).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <View style={styles.ratingCard}>
            <View style={styles.ratingCardHeader}>
              <Star size={20} color={theme.colors.warning} fill={message.hasBeenRated ? theme.colors.warning : 'transparent'} />
              <Text style={styles.ratingCardTitle}>
                {message.hasBeenRated ? 'Your Rating' : 'Rate This Driver'}
              </Text>
            </View>
            
            {message.hasBeenRated ? (
              <View style={styles.ratedContent}>
                <View style={styles.ratingStars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={20}
                      color={theme.colors.warning}
                      fill={star <= (message.rating || 0) ? theme.colors.warning : 'transparent'}
                    />
                  ))}
                </View>
                <Text style={styles.ratedSubtext}>Thank you for building our community!</Text>
                <TouchableOpacity
                  style={styles.changeRatingButton}
                  onPress={() => setShowRatingModal(true)}
                >
                  <Text style={styles.changeRatingText}>Update Rating</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.unratedContent}>
                <Text style={styles.ratingPrompt}>
                  Help build a safer community by rating your interaction
                </Text>
                <TouchableOpacity
                  style={styles.rateButtonLarge}
                  onPress={() => setShowRatingModal(true)}
                >
                  <Star size={20} color={theme.colors.white} fill={theme.colors.white} />
                  <Text style={styles.rateButtonLargeText}>Rate This Driver</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isSent && (
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => {
                router.push({
                  pathname: "/send-message",
                  params: {
                    toPlate: message.fromPlate,
                    type: 'general',
                    prefilledMessage: '',
                    actionTitle: 'Reply to Message',
                  },
                });
              }}
            >
              <Text style={styles.replyButtonText}>Reply to Message</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <RatingModal
          visible={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          targetPlate={isSent ? message.toPlate : message.fromPlate}
          targetName={isSent ? undefined : message.fromName}
          messageId={message.id}
          interactionType="message"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  messageCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sentCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  receivedCard: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.lg,
  },
  plateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  plateLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  plateNumber: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  badge: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  badgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  messageBody: {
    marginBottom: theme.spacing.lg,
  },
  messageContent: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    lineHeight: 24,
  },
  messageFooter: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  actionButtons: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  ratingCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.warning + '30',
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ratingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  ratingCardTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  ratedContent: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  ratingStars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: theme.spacing.xs,
  },
  ratedSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  changeRatingButton: {
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
  },
  changeRatingText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  unratedContent: {
    alignItems: 'center',
  },
  ratingPrompt: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  rateButtonLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.warning,
    borderRadius: theme.borderRadius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    gap: theme.spacing.sm,
    shadowColor: theme.colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  rateButtonLargeText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '700',
  },
  replyButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  replyButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
});