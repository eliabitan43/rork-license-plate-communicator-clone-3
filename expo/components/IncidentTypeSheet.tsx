import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Animated,
  KeyboardAvoidingView,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  Eye,
  Home,
  Hammer,
  Zap,
  ShoppingBag,
  Volume2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { IncidentType } from '@/types/events';
import * as Haptics from 'expo-haptics';

interface IncidentOption {
  type: IncidentType;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
}

const INCIDENT_OPTIONS: IncidentOption[] = [
  {
    type: 'suspicious_activity',
    label: 'Suspicious Activity',
    description: 'Unusual behavior or activity in the area',
    icon: Eye,
    color: '#EF4444',
  },
  {
    type: 'break_in_attempt',
    label: 'Break-in Attempt',
    description: 'Attempted unauthorized entry',
    icon: Home,
    color: '#DC2626',
  },
  {
    type: 'vandalism',
    label: 'Vandalism',
    description: 'Property damage or defacement',
    icon: Hammer,
    color: '#F59E0B',
  },
  {
    type: 'violence',
    label: 'Violence/Assault',
    description: 'Physical altercation or threat',
    icon: Zap,
    color: '#DC2626',
  },
  {
    type: 'theft',
    label: 'Theft',
    description: 'Stolen property or attempted theft',
    icon: ShoppingBag,
    color: '#EF4444',
  },
  {
    type: 'harassment',
    label: 'Harassment',
    description: 'Unwanted behavior or intimidation',
    icon: AlertTriangle,
    color: '#F59E0B',
  },
  {
    type: 'noise_complaint',
    label: 'Noise Complaint',
    description: 'Excessive or disruptive noise',
    icon: Volume2,
    color: '#3B82F6',
  },
  {
    type: 'other',
    label: 'Other',
    description: 'Other safety or security concern',
    icon: HelpCircle,
    color: '#6B7280',
  },
];

export interface IncidentTypeSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: IncidentType) => void;
}

export function IncidentTypeSheet({ visible, onClose, onSelect }: IncidentTypeSheetProps) {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Animation for sheet opening/closing
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    if (visible) {
      // Reset scroll position when opening
      timeoutId = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
      
      // Animate sheet in from bottom
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      // Animate sheet out to bottom
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    
    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [visible, slideAnim]);

  const handleSelect = (type: IncidentType) => {
    console.log('Incident type selected:', type);
    
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    
    onSelect(type);
  };

  const handleClose = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    onClose();
  };
  
  // Dynamic styles that use screenHeight
  const dynamicStyles = {
    sheet: {
      maxHeight: screenHeight * 0.95,
      minHeight: screenHeight * 0.75,
      ...(Platform.OS === 'web' && {
        maxHeight: screenHeight * 0.95,
        minHeight: screenHeight * 0.75,
      }),
    },
    scrollView: {
      maxHeight: screenHeight * 0.65,
    },
  };

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
      presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.modalContainer}>
        <Pressable style={styles.backdrop} onPress={handleClose} testID="incident-backdrop" />
        
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoidingView}
          keyboardVerticalOffset={insets.top}
        >
          <Animated.View 
            style={[
              styles.sheetContainer,
              {
                transform: [{
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [300, 0], // Slide from center
                  })
                }],
                opacity: slideAnim
              }
            ]}
          >
            <Pressable style={[styles.sheet, dynamicStyles.sheet]} onPress={(e) => e.stopPropagation()}>
              {/* Handle bar for visual feedback */}
              <View style={styles.handleBar} />
              
              <View style={styles.header}>
                <Text style={styles.title}>Report Incident</Text>
                <TouchableOpacity
                  onPress={handleClose}
                  accessibilityLabel="Close incident report"
                  accessibilityRole="button"
                  testID="incident-close"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={styles.closeButton}
                >
                  <X size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.subtitle}>What type of incident would you like to report?</Text>

              <ScrollView 
                ref={scrollRef}
                style={[styles.scrollView, dynamicStyles.scrollView]} 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                bounces={true}
                contentInsetAdjustmentBehavior="automatic"
              >
                <View style={styles.grid}>
                  {INCIDENT_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <TouchableOpacity
                        key={option.type}
                        style={[
                          styles.card,
                          { backgroundColor: option.color + '10' },
                        ]}
                        onPress={() => handleSelect(option.type)}
                        accessibilityLabel={`Report ${option.label}`}
                        accessibilityRole="button"
                        testID={`incident-${option.type}`}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.iconWrap,
                          { backgroundColor: option.color + '20' },
                        ]}>
                          <Icon size={24} color={option.color} />
                        </View>
                        <Text style={styles.cardTitle}>{option.label}</Text>
                        <Text style={styles.cardDescription}>{option.description}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 9999,
    elevation: 24,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl,
    zIndex: 10000,
  },
  sheetContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  sheet: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.xl,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 25,
    width: '100%',
    marginHorizontal: theme.spacing.lg,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
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
  },
  closeButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
    flexGrow: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap' as const,
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  card: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  cardDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});