import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Switch,
} from 'react-native';
import {
  X,
  ArrowLeft,
  MapPin,
  Clock,

  Send,
  Edit3,
  CheckCircle,
  Share,
  Lock,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { IncidentType, RecipientType } from '@/types/events';

export interface PreviewSendSheetProps {
  visible: boolean;
  incidentType: IncidentType;
  recipients: RecipientType[];
  nearbyRadius?: number;
  onClose: () => void;
  onBack: () => void;
  onSend: (shareToLiveMap: boolean, saveToEvidence: boolean) => void;
}

export function PreviewSendSheet({
  visible,
  incidentType,
  recipients,
  nearbyRadius,
  onClose,
  onBack,
  onSend,
}: PreviewSendSheetProps) {
  const [shareToLiveMap, setShareToLiveMap] = useState<boolean>(
    recipients.includes('live_map_feed')
  );
  const [saveToEvidence, setSaveToEvidence] = useState<boolean>(
    recipients.includes('evidence_locker') || 
    ['break_in_attempt', 'violence', 'vandalism', 'suspicious_activity'].includes(incidentType)
  );

  const getIncidentLabel = (type: IncidentType) => {
    const labels: Record<IncidentType, string> = {
      suspicious_activity: 'Suspicious Activity',
      break_in_attempt: 'Break-in Attempt',
      vandalism: 'Vandalism',
      violence: 'Violence/Assault',
      theft: 'Theft',
      harassment: 'Harassment',
      noise_complaint: 'Noise Complaint',
      other: 'Other',
    };
    return labels[type] || 'Incident';
  };

  const getRecipientLabel = (type: RecipientType) => {
    const labels: Record<RecipientType, string> = {
      emergency_911: '911 / Emergency',
      police_non_emergency: 'Police (Non-Emergency)',
      private_security: 'Private Security',
      vehicle_owner: 'Vehicle Owner',
      property_manager: 'Property Manager / HOA',
      nearby_users: 'Nearby Users',
      community_moderators: 'Community Moderators',
      road_services: 'Road/City Services',
      insurance_contact: 'Insurance Contact',
      emergency_contacts: 'Emergency Contacts',
      live_map_feed: 'Live Map Feed',
      evidence_locker: 'Evidence Locker',
    };
    return labels[type] || type;
  };

  const getCurrentLocation = () => {
    // Mock location for preview
    return {
      address: '123 Main St, Downtown',
      coordinates: '40.7128, -74.0060',
    };
  };

  const getCurrentTime = () => {
    return new Date().toLocaleString();
  };

  const handleSend = () => {
    console.log('Sending incident report:', {
      incidentType,
      recipients,
      nearbyRadius,
      shareToLiveMap,
      saveToEvidence,
    });
    onSend(shareToLiveMap, saveToEvidence);
  };

  const location = getCurrentLocation();
  const timestamp = getCurrentTime();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="preview-backdrop">
        <View style={styles.sheetContainer}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              testID="preview-back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Preview Report</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              testID="preview-close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Incident Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Incident Summary</Text>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Type:</Text>
                  <Text style={styles.summaryValue}>{getIncidentLabel(incidentType)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <MapPin size={16} color={theme.colors.textSecondary} />
                  <View style={styles.locationInfo}>
                    <Text style={styles.summaryValue}>{location.address}</Text>
                    <Text style={styles.coordinates}>{location.coordinates}</Text>
                  </View>
                </View>
                <View style={styles.summaryRow}>
                  <Clock size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.summaryValue}>{timestamp}</Text>
                </View>
              </View>
            </View>

            {/* Recipients */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Recipients ({recipients.length})
              </Text>
              <View style={styles.recipientsList}>
                {recipients.map((recipient, index) => (
                  <View key={recipient} style={styles.recipientItem}>
                    <CheckCircle size={16} color={theme.colors.success} />
                    <Text style={styles.recipientText}>
                      {getRecipientLabel(recipient)}
                      {recipient === 'nearby_users' && nearbyRadius && (
                        <Text style={styles.radiusText}> ({nearbyRadius}m radius)</Text>
                      )}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Message Preview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Message Preview</Text>
              <View style={styles.messageCard}>
                <Text style={styles.messageText}>
                  Report: {getIncidentLabel(incidentType)} at {location.address} ({location.coordinates}) at {timestamp}.
                  {'\n\n'}
                  This report was sent through the community safety network.
                  {'\n\n'}
                  Media: 0 attachments
                  {'\n'}
                  Notes: None provided
                </Text>
              </View>
            </View>

            {/* Additional Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Options</Text>
              
              <View style={styles.optionCard}>
                <View style={styles.optionRow}>
                  <Share size={20} color={theme.colors.primary} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Share to Live Map</Text>
                    <Text style={styles.optionDescription}>
                      Show as public event marker for 10 minutes
                    </Text>
                  </View>
                  <Switch
                    value={shareToLiveMap}
                    onValueChange={setShareToLiveMap}
                    trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              </View>

              <View style={styles.optionCard}>
                <View style={styles.optionRow}>
                  <Lock size={20} color={theme.colors.primary} />
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Save to Evidence Locker</Text>
                    <Text style={styles.optionDescription}>
                      Store securely in your private evidence locker
                    </Text>
                  </View>
                  <Switch
                    value={saveToEvidence}
                    onValueChange={setSaveToEvidence}
                    trackColor={{ false: theme.colors.lightGray, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyNotice}>
              <Text style={styles.privacyText}>
                Your identity is protected. Public recipients will see an anonymous report. 
                Direct messages share only your chosen profile information.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={onBack}
              accessibilityLabel="Edit report"
              testID="edit-report"
            >
              <Edit3 size={18} color={theme.colors.textPrimary} />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSend}
              accessibilityLabel="Send report"
              testID="send-report"
            >
              <Send size={18} color={theme.colors.white} />
              <Text style={styles.sendButtonText}>Send Report</Text>
            </TouchableOpacity>
          </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    ...(Platform.OS === 'web' && {
      alignSelf: 'center',
      maxWidth: 600,
      justifyContent: 'center',
    }),
  },
  sheet: {
    backgroundColor: theme.colors.cardBg,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    width: '100%',
    maxHeight: '95%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 25,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
      borderRadius: theme.borderRadius.xl,
      marginHorizontal: theme.spacing.lg,
      padding: theme.spacing.lg,
    }),
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: theme.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  section: {
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  summaryCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  summaryLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    minWidth: 50,
  },
  summaryValue: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  locationInfo: {
    flex: 1,
  },
  coordinates: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  recipientsList: {
    gap: theme.spacing.xs,
  },
  recipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    gap: theme.spacing.sm,
  },
  recipientText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  radiusText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.xs,
  },
  messageCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  messageText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  optionCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  optionDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  privacyNotice: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginTop: theme.spacing.md,
  },
  privacyText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    lineHeight: 16,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    gap: theme.spacing.xs,
  },
  editButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  sendButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  sendButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },

});