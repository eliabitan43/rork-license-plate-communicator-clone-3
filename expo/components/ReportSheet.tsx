import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, KeyboardAvoidingView, useWindowDimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme, designTokens, componentRecipes } from '@/constants/theme';
import { EventType, IncidentType, RecipientType, IncidentReport } from '@/types/events';
import { 
  TriangleAlert, X, Car, Construction, Ban,
  Shield, AlertTriangle, HelpCircle, Eye, Home, Hammer,
  Truck as TowTruck, Recycle, Wrench, CarFront,
  Search, Package, Dog, Waves as FloodIcon
} from 'lucide-react-native';
import { IncidentTypeSheet } from './IncidentTypeSheet';
import { SendToSheet } from './SendToSheet';
import { SheetContainer } from './SheetContainer';
import { PreviewSendSheet } from './PreviewSendSheet';
import { useEvents } from '@/hooks/useEvents';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

interface EventOption {
  type: EventType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  category: 'traffic' | 'vehicle' | 'safety' | 'community' | 'services';
}

// Complete list of all event types in a scrollable grid
const ALL_EVENT_OPTIONS: EventOption[] = [
  // Traffic & Road Conditions (Blue)
  { type: 'police', label: 'Police', icon: Shield, color: '#3B82F6', category: 'safety' },
  { type: 'tow_truck', label: 'Tow Truck', icon: TowTruck, color: '#3B82F6', category: 'services' },
  { type: 'trash_truck', label: 'Trash Truck', icon: Recycle, color: '#3B82F6', category: 'services' },
  { type: 'hazard', label: 'Hazard', icon: TriangleAlert, color: '#EF4444', category: 'traffic' },
  { type: 'accident', label: 'Accident', icon: AlertTriangle, color: '#EF4444', category: 'traffic' },
  { type: 'road_closure', label: 'Road Closure', icon: Ban, color: '#EF4444', category: 'traffic' },
  { type: 'traffic_enforcement', label: 'Traffic Enforcement', icon: Shield, color: '#3B82F6', category: 'safety' },
  { type: 'street_cleaning', label: 'Street Cleaning', icon: Wrench, color: '#3B82F6', category: 'services' },
  { type: 'vehicle_on_shoulder', label: 'Vehicle on Shoulder', icon: CarFront, color: '#EF4444', category: 'vehicle' },
  { type: 'suspicious_activity', label: 'Suspicious Activity', icon: Eye, color: '#EF4444', category: 'community' },
  { type: 'break_in_attempt', label: 'Break-in Attempt', icon: Home, color: '#EF4444', category: 'community' },
  { type: 'vandalism', label: 'Vandalism', icon: Hammer, color: '#EF4444', category: 'community' },
  { type: 'lost_item', label: 'Lost Item', icon: Search, color: '#10B981', category: 'community' },
  { type: 'found_item', label: 'Found Item', icon: Package, color: '#10B981', category: 'community' },
  { type: 'stray_animal', label: 'Stray Animal', icon: Dog, color: '#10B981', category: 'community' },
  { type: 'flooded_street', label: 'Flooded Street', icon: FloodIcon, color: '#EF4444', category: 'traffic' },
  { type: 'pothole', label: 'Pothole / Damaged Road', icon: TriangleAlert, color: '#EF4444', category: 'traffic' },
  { type: 'construction', label: 'Construction / Road Work', icon: Construction, color: '#3B82F6', category: 'traffic' },
  { type: 'heavy_traffic', label: 'Heavy Traffic / Congestion', icon: Car, color: '#EF4444', category: 'traffic' },
  { type: 'other', label: 'Other', icon: HelpCircle, color: '#6B7280', category: 'community' },
];

type FlowStep = 'select_event' | 'select_incident' | 'send_to' | 'preview';

interface ReportFlowState {
  step: FlowStep;
  selectedEventType?: EventType;
  selectedIncidentType?: IncidentType;
  selectedRecipients: RecipientType[];
  nearbyRadius?: number;
  report?: Partial<IncidentReport>;
  id: string;
}

export interface ReportSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: EventType) => void;
  onIncidentSent?: (report: IncidentReport) => void | Promise<void>;
  initialStep?: 'select_event' | 'select_incident';
}

export function ReportSheet({ visible, onClose, onSelect, onIncidentSent, initialStep = 'select_event' }: ReportSheetProps) {
  console.log('ReportSheet render - visible:', visible);
  
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const { submitReport } = useEvents();
  // const { userProfile } = useAppStore(); // Commented out as not used
  
  const [flowState, setFlowState] = useState<ReportFlowState>({
    step: 'select_event',
    selectedRecipients: [],
    id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  });

  // Animation for sheet opening/closing
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    if (visible) {
      setFlowState({
        step: initialStep,
        selectedRecipients: [],
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      });

      // Reset scroll position when opening. Entrance/dismiss motion is owned by SheetContainer.
      timeoutId = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
      }, 50);
    }

    return () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [visible, initialStep]);

  const handleEventSelect = (eventType: EventType) => {
    // Input validation
    if (!eventType || typeof eventType !== 'string' || eventType.trim().length === 0) {
      console.warn('Invalid event type provided');
      return;
    }
    
    console.log('Event type selected:', eventType);
    
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    
    // Check if this is a safety/incident type that needs the incident flow
    const incidentTypes: EventType[] = ['suspicious_activity', 'break_in_attempt', 'vandalism'];
    
    if (incidentTypes.includes(eventType)) {
      // Convert EventType to IncidentType for the incident flow
      const incidentType = eventType as IncidentType;
      console.log('Moving to send_to step for incident type:', incidentType);
      setFlowState(prev => ({
        ...prev,
        step: 'send_to',
        selectedEventType: eventType,
        selectedIncidentType: incidentType,
        selectedRecipients: [],
      }));
    } else {
      // For regular events, use the original flow
      console.log('Using original flow for event type:', eventType);
      onSelect(eventType);
    }
  };

  const handleIncidentSelect = (incidentType: IncidentType) => {
    console.log('Incident type selected:', incidentType);
    setFlowState(prev => ({
      ...prev,
      step: 'send_to',
      selectedIncidentType: incidentType,
    }));
  };

  const handleSendToSelect = (recipients: RecipientType[], nearbyRadius?: number) => {
    // Input validation
    if (!Array.isArray(recipients)) {
      console.warn('Invalid recipients provided');
      return;
    }
    
    if (nearbyRadius !== undefined && (typeof nearbyRadius !== 'number' || nearbyRadius < 0)) {
      console.warn('Invalid nearby radius provided');
      return;
    }
    
    console.log('Recipients selected:', recipients, 'radius:', nearbyRadius);
    console.log('Moving to preview step');
    setFlowState(prev => ({
      ...prev,
      step: 'preview',
      selectedRecipients: recipients,
      nearbyRadius,
    }));
  };

  const handleSend = async (shareToLiveMap: boolean, saveToEvidence: boolean) => {
    console.log('Sending report:', {
      incidentType: flowState.selectedIncidentType,
      recipients: flowState.selectedRecipients,
      shareToLiveMap,
      saveToEvidence,
    });

    let sentReport: IncidentReport | null = null;
    
    try {
      // Get current location with high accuracy for real-time reporting
      let location = { lat: 37.7749, lng: -122.4194, address: 'Unknown location', accuracy: 1000 };
      
      try {
        if (Platform.OS === 'web' && 'geolocation' in navigator) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve, 
              reject, 
              { 
                enableHighAccuracy: true, 
                timeout: 10000, 
                maximumAge: 5000 // Use recent location within 5 seconds
              }
            );
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            address: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
            accuracy: position.coords.accuracy || 100
          };
        } else {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const pos = await Location.getCurrentPositionAsync({ 
              accuracy: Location.Accuracy.BestForNavigation, // High accuracy for real-time alerts
              timeInterval: 1000,
              distanceInterval: 1
            });
            location = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              address: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`,
              accuracy: pos.coords.accuracy || 100
            };
          }
        }
      } catch (locationError) {
        console.log('Could not get precise location, using default:', locationError);
        // Show warning to user about location accuracy
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Location Warning', 
            'Could not get your precise location. The report will use an approximate location.',
            [{ text: 'Continue', style: 'default' }, { text: 'Cancel', style: 'cancel', onPress: () => { return; } }]
          );
        }
      }
      
      // Create incident report
      const report: IncidentReport = {
        id: flowState.id,
        incidentType: flowState.selectedIncidentType!,
        recipients: flowState.selectedRecipients,
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address,
          accuracy: location.accuracy
        },
        timestamp: new Date().toISOString(),
        note: `Report: ${flowState.selectedIncidentType} at ${location.address}`,
        media: [],
        nearbyRadius: flowState.nearbyRadius,
        isAnonymous: !flowState.selectedRecipients.includes('emergency_contacts'),
        status: 'sent',
        createdAt: new Date().toISOString(),
        sentAt: new Date().toISOString()
      };
      sentReport = report;
      
      // Execute WritePipeline with real-time location data
      const results = await Promise.allSettled([
        // 1. ALWAYS save to Live Map for real-time alerts (this is the key enhancement)
        submitReport({
          type: flowState.selectedIncidentType as EventType,
          lat: location.lat,
          lng: location.lng,
          details: {
            incidentType: flowState.selectedIncidentType,
            recipients: flowState.selectedRecipients,
            note: report.note,
            reportId: report.id,
            locationAccuracy: location.accuracy,
            timestamp: new Date().toISOString(),
            isRealTimeReport: true, // Flag for real-time processing
            urgencyLevel: ['break_in_attempt', 'violence', 'vandalism', 'suspicious_activity'].includes(flowState.selectedIncidentType!) ? 'high' : 'normal'
          }
        }),
        
        // 2. Save to Evidence Locker if selected or safety incident
        (saveToEvidence || flowState.selectedRecipients.includes('evidence_locker') || 
         ['break_in_attempt', 'violence', 'vandalism', 'suspicious_activity'].includes(flowState.selectedIncidentType!)) ?
          saveToEvidenceLocker(report) : Promise.resolve({ ok: true })
      ]);
      
      const liveMapResult = results[0];
      const evidenceResult = results[1];
      
      let successMessage = 'Report sent successfully!';
      const actions: string[] = [];
      
      if (liveMapResult.status === 'fulfilled' && (liveMapResult.value as any)?.ok) {
        const event = (liveMapResult.value as any)?.event;
        const ttlMinutes = event?.ttlMs ? Math.round(event.ttlMs / 60000) : 10;
        successMessage += ` Live on map for ${ttlMinutes} minutes at your location.`;
        actions.push('View on Live Map');
        
        // Add haptic feedback for successful real-time report
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      } else {
        console.error('Failed to add to live map:', liveMapResult);
        successMessage += ' Could not add to live map.';
      }
      
      if (evidenceResult.status === 'fulfilled' && (evidenceResult.value as any)?.ok) {
        successMessage += ' Saved to Evidence Locker.';
        actions.push('Open Evidence Locker');
      }
      
      // Show success message
      if (Platform.OS === 'web') {
        console.log(successMessage); // Use console.log instead of alert for web
      } else {
        Alert.alert('Success', successMessage, [
          { text: 'OK', style: 'default' },
          ...(actions.length > 0 ? [{ text: actions[0], onPress: () => console.log('Navigate to', actions[0]) }] : [])
        ]);
      }
      
      // Add haptic feedback
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      
    } catch (error) {
      console.error('Error sending report:', error);
      
      if (Platform.OS === 'web') {
        console.error('Could not send report. Please try again.');
      } else {
        Alert.alert('Error', 'Could not send report. Please try again.', [
          { text: 'Retry', onPress: () => handleSend(shareToLiveMap, saveToEvidence) },
          { text: 'Save Draft', onPress: () => console.log('Save draft') },
          { text: 'Cancel', style: 'cancel' }
        ]);
      }
      return;
    }
    
    if (onIncidentSent && sentReport) {
      try {
        await onIncidentSent(sentReport);
      } catch (error) {
        console.error('Error publishing incident to community:', error);
      }
    }
    
    // Close the entire flow
    handleClose();
  };
  
  // Helper function to save to evidence locker
  const saveToEvidenceLocker = async (report: IncidentReport) => {
    try {
      // For now, just log - in a real app this would save to a secure storage
      console.log('Saving to evidence locker:', report);
      return { ok: true, evidenceId: `evidence_${report.id}` };
    } catch (error) {
      console.error('Error saving to evidence locker:', error);
      return { ok: false, error };
    }
  };

  const handleClose = () => {
    // Add haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }
    
    setFlowState({
      step: 'select_event',
      selectedRecipients: [],
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    });
    onClose();
  };

  const handleBack = () => {
    switch (flowState.step) {
      case 'send_to':
        if (flowState.selectedIncidentType) {
          setFlowState(prev => ({ ...prev, step: 'select_incident' }));
        } else {
          setFlowState(prev => ({ ...prev, step: 'select_event' }));
        }
        break;
      case 'preview':
        setFlowState(prev => ({ ...prev, step: 'send_to' }));
        break;
      default:
        setFlowState(prev => ({ ...prev, step: 'select_event' }));
    }
  };
  
  // Dynamic styles that use screenHeight
  const dynamicStyles = {
    sheet: {
      maxHeight: screenHeight * 0.85,
      minHeight: screenHeight * 0.6,
      paddingHorizontal: designTokens.grid.unit * 2.5,
      paddingBottom: designTokens.grid.unit * 2.5,
    },
    scrollView: {
      maxHeight: screenHeight * 0.65,
    },
  };
  
  return (
    <>
      {/* Main Event Selection Sheet */}
      <Modal 
        visible={visible && flowState.step === 'select_event'} 
        animationType="none" 
        transparent 
        onRequestClose={handleClose}
        presentationStyle={Platform.OS === 'ios' ? 'overFullScreen' : undefined}
        statusBarTranslucent={Platform.OS === 'android'}
      >
        <SheetContainer onClose={handleClose} testID="report-sheet-shell">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top}
          >
              <View style={dynamicStyles.sheet}>
                <View style={styles.header}>
                  <Text style={styles.title}>Report an Event</Text>
                  <TouchableOpacity 
                    onPress={handleClose} 
                    accessibilityLabel="Close report" 
                    accessibilityRole="button"
                    testID="report-close"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    style={styles.closeButton}
                  >
                    <X size={22} color={theme.colors.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={styles.subtitle}>
                  Select the type of event you want to report
                </Text>
                
                <ScrollView 
                  ref={scrollRef}
                  style={[styles.scrollView, dynamicStyles.scrollView]} 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.scrollContent}
                  bounces={true}
                  contentInsetAdjustmentBehavior="automatic"
                >
                  <View style={styles.grid}>
                    {ALL_EVENT_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <TouchableOpacity 
                          key={option.type} 
                          style={[
                            styles.card,
                            { backgroundColor: option.color + '10' }
                          ]} 
                          onPress={() => handleEventSelect(option.type)} 
                          accessibilityLabel={`Report ${option.label}`} 
                          accessibilityRole="button"
                          testID={`report-${option.type}`}
                          activeOpacity={0.7}
                        >
                          <View style={[
                            styles.iconWrap,
                            { backgroundColor: option.color + '20' }
                          ]}>
                            <Icon size={20} color={option.color} />
                          </View>
                          <Text style={styles.cardText}>{option.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
          </KeyboardAvoidingView>
        </SheetContainer>
      </Modal>

      {/* Incident Type Selection */}
      <IncidentTypeSheet
        visible={visible && flowState.step === 'select_incident'}
        onClose={handleClose}
        onSelect={handleIncidentSelect}
      />

      {/* Send To Selection */}
      <SendToSheet
        visible={visible && flowState.step === 'send_to'}
        incidentType={flowState.selectedIncidentType!}
        onClose={handleClose}
        onBack={handleBack}
        onPreviewAndSend={handleSendToSelect}
      />

      {/* Preview and Send */}
      <PreviewSendSheet
        visible={visible && flowState.step === 'preview'}
        incidentType={flowState.selectedIncidentType!}
        recipients={flowState.selectedRecipients}
        nearbyRadius={flowState.nearbyRadius}
        onClose={handleClose}
        onBack={handleBack}
        onSend={handleSend}
      />
    </>
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
    backgroundColor: designTokens.scrim.backdrop,
    zIndex: 9999,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: designTokens.grid.unit * 8,
    paddingBottom: designTokens.grid.unit * 4,
    zIndex: 10000,
  },
  sheetContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10001,
  },
  sheet: { 
    ...componentRecipes.bottomSheet,
    paddingHorizontal: designTokens.grid.unit * 2.5,
    paddingBottom: designTokens.grid.unit * 2.5,
    paddingTop: designTokens.grid.unit * 2,
    width: '100%',
    marginHorizontal: designTokens.grid.unit * 2,
    borderRadius: designTokens.radius.lg,
    ...(Platform.OS === 'web' && {
      maxWidth: 600,
      alignSelf: 'center',
    }),
  },
  handleBar: {
    width: 36,
    height: 4,
    backgroundColor: designTokens.color.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: designTokens.grid.unit * 2,
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: designTokens.grid.unit,
    paddingTop: designTokens.grid.unit / 2,
  },
  closeButton: {
    padding: designTokens.grid.unit,
    borderRadius: designTokens.radius.sm,
    backgroundColor: designTokens.color.surface,
    minWidth: designTokens.tap.targetMin,
    minHeight: designTokens.tap.targetMin,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { 
    fontSize: designTokens.type.title.size,
    fontWeight: '600',
    color: designTokens.color.text,
    fontFamily: designTokens.font.family,
  },
  subtitle: {
    fontSize: designTokens.type.small.size,
    color: designTokens.color.textMuted,
    marginBottom: designTokens.grid.unit * 2.5,
    lineHeight: designTokens.type.small.lineHeight,
    fontFamily: designTokens.font.family,
  },
  scrollView: {
    flex: 1,

  },
  scrollContent: {
    paddingTop: designTokens.grid.unit,
    paddingBottom: designTokens.grid.unit * 4,
    flexGrow: 1,
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap' as const, 
    gap: designTokens.grid.unit,
    justifyContent: 'space-between',
  },
  card: { 
    width: '47%', 
    ...componentRecipes.tileCard,
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconWrap: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: designTokens.color.bg, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: designTokens.grid.unit
  },
  cardText: { 
    fontSize: designTokens.type.caption.size, 
    color: designTokens.color.text, 
    textAlign: 'center',
    lineHeight: designTokens.type.caption.lineHeight,
    fontWeight: '500',
    fontFamily: designTokens.font.family,
  },
});
