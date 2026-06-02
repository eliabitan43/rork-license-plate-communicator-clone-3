import React, { useState, useMemo, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
} from 'react-native';

import {
  X,
  Phone,
  Shield,
  Building,
  Car,
  Home,
  Users,
  UserCheck,
  Wrench,
  FileText,
  PhoneCall,
  MapPin,
  Lock,
  ArrowLeft,
  Eye,
  AlertTriangle,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { IncidentType, RecipientType, RecipientOption } from '@/types/events';

// Simple slider component without PanResponder to avoid web compatibility issues
interface CustomSliderProps {
  style?: any;
  minimumValue: number;
  maximumValue: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
}

function CustomSlider({
  style,
  minimumValue,
  maximumValue,
  step,
  value,
  onValueChange,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
}: CustomSliderProps) {
  const sliderWidth = useRef<number>(200); // Default width
  const [isDragging, setIsDragging] = useState(false);

  const getValueFromPosition = (x: number): number => {
    const percentage = Math.max(0, Math.min(1, x / sliderWidth.current));
    const rawValue = minimumValue + percentage * (maximumValue - minimumValue);
    const steppedValue = Math.round(rawValue / step) * step;
    return Math.max(minimumValue, Math.min(maximumValue, steppedValue));
  };

  const getPositionFromValue = (): number => {
    const percentage = (value - minimumValue) / (maximumValue - minimumValue);
    return percentage * sliderWidth.current;
  };

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const newValue = getValueFromPosition(locationX);
    onValueChange(newValue);
  };

  const thumbPosition = getPositionFromValue();
  const trackFillWidth = thumbPosition;

  return (
    <View
      style={[sliderStyles.container, style]}
      onLayout={(event) => {
        sliderWidth.current = event.nativeEvent.layout.width - 20; // Account for thumb width
      }}
    >
      <TouchableOpacity
        style={[sliderStyles.track, { backgroundColor: maximumTrackTintColor }]}
        onPress={handlePress}
        activeOpacity={1}
      >
        <View style={[
          sliderStyles.trackFill,
          {
            width: Math.max(0, trackFillWidth),
            backgroundColor: minimumTrackTintColor,
          }
        ]} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          sliderStyles.thumb,
          {
            left: Math.max(0, thumbPosition - 10), // Center the thumb
            backgroundColor: thumbTintColor,
          },
          isDragging && { transform: [{ scale: 1.2 }] }
        ]}
        onPressIn={() => setIsDragging(true)}
        onPressOut={() => setIsDragging(false)}
        activeOpacity={0.8}
      />
    </View>
  );
}

const RECIPIENT_OPTIONS: RecipientOption[] = [
  {
    type: 'emergency_911',
    label: '911 / Emergency',
    description: 'Use only for life-threatening emergencies',
    icon: Phone,
    color: '#DC2626',
    category: 'danger',
    requiresDisclaimer: true,
    availableFor: ['violence', 'break_in_attempt'],
  },
  {
    type: 'police_non_emergency',
    label: 'Police (Non-Emergency)',
    description: 'Local police non-emergency line',
    icon: Shield,
    color: '#3B82F6',
    category: 'authority',
    defaultSelected: true,
  },
  {
    type: 'private_security',
    label: 'Private Security',
    description: 'Building or area security team',
    icon: Building,
    color: '#3B82F6',
    category: 'authority',
  },
  {
    type: 'vehicle_owner',
    label: 'Vehicle Owner',
    description: 'Send message to license plate owner',
    icon: Car,
    color: '#6B7280',
    category: 'private',
  },
  {
    type: 'property_manager',
    label: 'Property Manager / HOA',
    description: 'Building or community management',
    icon: Home,
    color: '#3B82F6',
    category: 'authority',
  },
  {
    type: 'nearby_users',
    label: 'Nearby Users',
    description: 'Alert users in the surrounding area',
    icon: Users,
    color: '#10B981',
    category: 'community',
  },
  {
    type: 'community_moderators',
    label: 'Community Moderators',
    description: 'Local community watch moderators',
    icon: UserCheck,
    color: '#10B981',
    category: 'community',
  },
  {
    type: 'road_services',
    label: 'Road/City Services',
    description: 'Municipal services and maintenance',
    icon: Wrench,
    color: '#3B82F6',
    category: 'authority',
  },
  {
    type: 'insurance_contact',
    label: 'Insurance Contact',
    description: 'Your saved insurance provider',
    icon: FileText,
    color: '#6B7280',
    category: 'private',
  },
  {
    type: 'emergency_contacts',
    label: 'Emergency Contacts',
    description: 'Your personal emergency contacts',
    icon: PhoneCall,
    color: '#6B7280',
    category: 'private',
  },
  {
    type: 'live_map_feed',
    label: 'Live Map Feed',
    description: 'Public event marker (10 min visibility)',
    icon: MapPin,
    color: '#10B981',
    category: 'community',
  },
  {
    type: 'evidence_locker',
    label: 'Evidence Locker (Private)',
    description: 'Store securely in your evidence locker',
    icon: Lock,
    color: '#6B7280',
    category: 'private',
    defaultSelected: true,
  },
];

export interface SendToSheetProps {
  visible: boolean;
  incidentType: IncidentType;
  onClose: () => void;
  onBack: () => void;
  onPreviewAndSend: (recipients: RecipientType[], nearbyRadius?: number) => void;
}

export function SendToSheet({ 
  visible, 
  incidentType, 
  onClose, 
  onBack, 
  onPreviewAndSend 
}: SendToSheetProps) {
  const [selectedRecipients, setSelectedRecipients] = useState<Set<RecipientType>>(new Set());
  const [nearbyRadius, setNearbyRadius] = useState<number>(300);
  
  // Debug logging
  React.useEffect(() => {
    console.log('SendToSheet render:', { visible, incidentType });
  }, [visible, incidentType]);


  const availableOptions = useMemo(() => {
    return RECIPIENT_OPTIONS.filter(option => {
      if (option.availableFor && !option.availableFor.includes(incidentType)) {
        return false;
      }
      return true;
    });
  }, [incidentType]);

  React.useEffect(() => {
    if (visible) {
      const defaultSelected = new Set<RecipientType>();
      
      // Apply smart defaults based on incident type
      if (incidentType === 'break_in_attempt' || incidentType === 'violence') {
        defaultSelected.add('police_non_emergency');
        defaultSelected.add('evidence_locker');
        defaultSelected.add('live_map_feed');
      } else if (incidentType === 'vandalism' || incidentType === 'suspicious_activity') {
        defaultSelected.add('nearby_users');
        defaultSelected.add('community_moderators');
        defaultSelected.add('evidence_locker');
      } else {
        // Add default selected options
        availableOptions.forEach(option => {
          if (option.defaultSelected) {
            defaultSelected.add(option.type);
          }
        });
      }
      
      setSelectedRecipients(defaultSelected);
    }
  }, [visible, incidentType, availableOptions]);

  const toggleRecipient = (type: RecipientType) => {
    const option = RECIPIENT_OPTIONS.find(opt => opt.type === type);
    
    if (option?.requiresDisclaimer && !selectedRecipients.has(type)) {
      if (Platform.OS === 'web') {
        const confirmed = confirm('Use 911 only for life-threatening emergencies. For non-emergencies, use the Police (Non-Emergency) option instead. Continue?');
        if (confirmed) {
          const newSelected = new Set(selectedRecipients);
          newSelected.add(type);
          setSelectedRecipients(newSelected);
        }
      } else {
        Alert.alert(
          'Emergency Services',
          'Use 911 only for life-threatening emergencies. For non-emergencies, use the Police (Non-Emergency) option instead.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Continue', 
              onPress: () => {
                const newSelected = new Set(selectedRecipients);
                newSelected.add(type);
                setSelectedRecipients(newSelected);
              }
            },
          ]
        );
      }
      return;
    }

    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(type)) {
      newSelected.delete(type);
    } else {
      newSelected.add(type);
    }
    setSelectedRecipients(newSelected);
  };

  const handlePreviewAndSend = () => {
    if (selectedRecipients.size === 0) {
      if (Platform.OS === 'web') {
        alert('Please select at least one recipient to send your report.');
      } else {
        Alert.alert('No Recipients', 'Please select at least one recipient to send your report.');
      }
      return;
    }

    const recipients = Array.from(selectedRecipients);
    const radius = selectedRecipients.has('nearby_users') ? nearbyRadius : undefined;
    
    console.log('Preview and send:', { recipients, radius, incidentType });
    onPreviewAndSend(recipients, radius);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'danger': return '#DC2626';
      case 'authority': return '#3B82F6';
      case 'community': return '#10B981';
      case 'private': return '#6B7280';
      default: return '#6B7280';
    }
  };

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <Pressable style={styles.backdrop} onPress={onClose} testID="sendto-backdrop">
        <View style={styles.sheetContainer}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onBack}
              accessibilityLabel="Go back"
              accessibilityRole="button"
              testID="sendto-back"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ArrowLeft size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.title}>Choose where to send</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
              testID="sendto-close"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.incidentInfo}>
            <AlertTriangle size={16} color={theme.colors.primary} />
            <Text style={styles.incidentText}>
              Reporting: {getIncidentLabel(incidentType)}
            </Text>
          </View>

          <Text style={styles.subtitle}>You can pick more than one.</Text>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {availableOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRecipients.has(option.type);
                const categoryColor = getCategoryColor(option.category);
                
                return (
                  <TouchableOpacity
                    key={option.type}
                    style={[
                      styles.recipientCard,
                      isSelected && styles.selectedCard,
                      { borderColor: isSelected ? categoryColor : theme.colors.border },
                    ]}
                    onPress={() => toggleRecipient(option.type)}
                    accessibilityLabel={`Send to ${option.label}`}
                    testID={`recipient-${option.type}`}
                  >
                    <View style={[
                      styles.iconWrap,
                      { backgroundColor: categoryColor + '20' },
                    ]}>
                      <Icon size={20} color={categoryColor} />
                    </View>
                    <Text style={styles.recipientLabel}>{option.label}</Text>
                    <Text style={styles.recipientDescription}>{option.description}</Text>
                    {isSelected && (
                      <View style={[styles.selectedIndicator, { backgroundColor: categoryColor }]} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedRecipients.has('nearby_users') && (
              <View style={styles.radiusSection}>
                <Text style={styles.radiusTitle}>Nearby Users Radius</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.radiusValue}>{nearbyRadius}m</Text>
                  <CustomSlider
                    style={styles.slider}
                    minimumValue={100}
                    maximumValue={1000}
                    step={50}
                    value={nearbyRadius}
                    onValueChange={setNearbyRadius}
                    minimumTrackTintColor={theme.colors.primary}
                    maximumTrackTintColor={theme.colors.lightGray}
                    thumbTintColor={theme.colors.primary}
                  />
                  <View style={styles.radiusLabels}>
                    <Text style={styles.radiusLabel}>100m</Text>
                    <Text style={styles.radiusLabel}>1km</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.privacyInfo}>
              <Eye size={16} color={theme.colors.textSecondary} />
              <Text style={styles.privacyText}>
                We hide your identity from public recipients. Direct messages share only your chosen profile info.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBack}
              accessibilityLabel="Go back"
              testID="footer-back"
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.previewButton,
                selectedRecipients.size === 0 && styles.disabledButton,
              ]}
              onPress={handlePreviewAndSend}
              disabled={selectedRecipients.size === 0}
              accessibilityLabel="Preview and send report"
              testID="preview-send"
            >
              <Text style={[
                styles.previewButtonText,
                selectedRecipients.size === 0 && styles.disabledButtonText,
              ]}>
                Preview & Send ({selectedRecipients.size})
              </Text>
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
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetContainer: {
    width: '100%',
    flex: 1,
    justifyContent: 'flex-end',
    ...(Platform.OS === 'web' && {
      alignSelf: 'center',
      maxWidth: 600,
      justifyContent: 'center',
      alignItems: 'center',
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
    marginBottom: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
  incidentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
    marginHorizontal: theme.spacing.xs,
    gap: theme.spacing.xs,
  },
  incidentText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
    lineHeight: 18,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.sm,
  },
  recipientCard: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    alignItems: 'center',
    minHeight: 90,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  selectedCard: {
    backgroundColor: theme.colors.primary + '05',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  recipientLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  recipientDescription: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  radiusSection: {
    marginTop: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  radiusTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.sm,
  },
  sliderContainer: {
    alignItems: 'center',
  },
  radiusValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: theme.spacing.xs,
  },
  radiusLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  privacyInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme.colors.lightGray + '50',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  privacyText: {
    flex: 1,
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    lineHeight: 16,
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
  backButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.lightGray,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  previewButton: {
    flex: 2,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  previewButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  disabledButton: {
    backgroundColor: theme.colors.lightGray,
  },
  disabledButtonText: {
    color: theme.colors.textSecondary,
  },
});

const sliderStyles = StyleSheet.create({
  container: {
    height: 40,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  track: {
    height: 4,
    borderRadius: 2,
    position: 'relative',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});