import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Modal, Platform } from 'react-native';
import { theme } from '@/constants/theme';
import { 
  Map, 
  Satellite, 
  Navigation, 
  Eye, 
  Layers, 
  Zap, 
  Users,
  Activity,
  Shield,
  Car,
  Building
} from 'lucide-react-native';

export type MapViewType = 
  | 'standard'
  | 'satellite' 
  | 'hybrid'
  | 'terrain'
  | 'traffic'
  | 'realtime'
  | 'heatmap'
  | 'community'
  | 'safety'
  | 'navigation'
  | 'ar';

export interface MapViewOption {
  id: MapViewType;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  premium?: boolean;
  beta?: boolean;
}

const MAP_VIEW_OPTIONS: MapViewOption[] = [
  {
    id: 'standard',
    name: 'Standard',
    description: 'Clean street map view',
    icon: Map,
    color: theme.colors.primary,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    description: 'Aerial imagery view',
    icon: Satellite,
    color: '#4A90E2',
  },
  {
    id: 'hybrid',
    name: 'Hybrid',
    description: 'Satellite with street labels',
    icon: Layers,
    color: '#7B68EE',
  },
  {
    id: 'terrain',
    name: 'Terrain',
    description: 'Topographic features',
    icon: Building,
    color: '#8B4513',
  },
  {
    id: 'traffic',
    name: 'Traffic',
    description: 'Live traffic conditions',
    icon: Car,
    color: '#FF6B35',
  },
  {
    id: 'realtime',
    name: 'Real-Time',
    description: 'Live events & alerts',
    icon: Zap,
    color: theme.colors.primary,
    beta: true,
  },
  {
    id: 'heatmap',
    name: 'Heat Map',
    description: 'Event density visualization',
    icon: Activity,
    color: '#FF4757',
    premium: true,
  },
  {
    id: 'community',
    name: 'Community',
    description: 'User reports & interactions',
    icon: Users,
    color: '#2ED573',
  },
  {
    id: 'safety',
    name: 'Safety',
    description: 'Security & emergency focus',
    icon: Shield,
    color: '#FF3838',
  },
  {
    id: 'navigation',
    name: 'Navigation',
    description: 'Turn-by-turn ready',
    icon: Navigation,
    color: '#1E90FF',
  },
  {
    id: 'ar',
    name: 'AR View',
    description: 'Augmented reality overlay',
    icon: Eye,
    color: '#9C27B0',
    premium: true,
    beta: true,
  },
];

interface MapViewSelectorProps {
  selectedView: MapViewType;
  onViewChange: (view: MapViewType) => void;
  visible: boolean;
  onClose: () => void;
}

export function MapViewSelector({ selectedView, onViewChange, visible, onClose }: MapViewSelectorProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  const handleViewSelect = (viewType: MapViewType) => {
    onViewChange(viewType);
    onClose();
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          onPress={onClose}
          activeOpacity={1}
        />
        
        <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.handle} />
          <Text style={styles.title}>Map View Options</Text>
          <Text style={styles.subtitle}>Choose your preferred map style</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.grid}>
            {MAP_VIEW_OPTIONS.map((option) => {
              const isSelected = selectedView === option.id;
              const IconComponent = option.icon;
              
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.optionCard,
                    isSelected && styles.optionCardSelected,
                    isSelected && { borderColor: option.color }
                  ]}
                  onPress={() => handleViewSelect(option.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionHeader}>
                    <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                      <IconComponent 
                        size={24} 
                        color={isSelected ? option.color : theme.colors.textSecondary} 
                      />
                    </View>
                    
                    <View style={styles.badges}>
                      {option.premium && (
                        <View style={styles.premiumBadge}>
                          <Text style={styles.badgeText}>PRO</Text>
                        </View>
                      )}
                      {option.beta && (
                        <View style={styles.betaBadge}>
                          <Text style={styles.badgeText}>BETA</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <Text style={[
                    styles.optionName,
                    isSelected && { color: option.color }
                  ]}>
                    {option.name}
                  </Text>
                  
                  <Text style={styles.optionDescription}>
                    {option.description}
                  </Text>
                  
                  {isSelected && (
                    <View style={[styles.selectedIndicator, { backgroundColor: option.color }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Platform.OS === 'web' ? '90%' : '92%',
    height: Platform.OS === 'web' ? 'auto' : '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 25,
  },
  header: {
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    position: 'relative',
    minHeight: 120,
  },
  optionCardSelected: {
    backgroundColor: theme.colors.primary + '08',
    borderWidth: 2,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badges: {
    flexDirection: 'column',
    gap: 4,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  betaBadge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  optionName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  optionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  selectedIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  closeButton: {
    backgroundColor: theme.colors.cardBg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export { MAP_VIEW_OPTIONS };