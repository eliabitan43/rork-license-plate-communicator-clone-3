import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { theme } from '@/constants/theme';
import { MapViewType } from './MapViewSelector';
import { 
  Map, 
  Satellite, 
  Navigation, 
  Eye, 
  Zap, 
  Activity,
  Users,
  Shield
} from 'lucide-react-native';

interface QuickMapViewToggleProps {
  selectedView: MapViewType;
  onViewChange: (view: MapViewType) => void;
}

const QUICK_VIEWS: Array<{
  id: MapViewType;
  name: string;
  icon: React.ComponentType<any>;
  color: string;
}> = [
  {
    id: 'standard',
    name: 'Standard',
    icon: Map,
    color: theme.colors.primary,
  },
  {
    id: 'satellite',
    name: 'Satellite',
    icon: Satellite,
    color: '#4A90E2',
  },
  {
    id: 'realtime',
    name: 'Live',
    icon: Zap,
    color: theme.colors.primary,
  },
  {
    id: 'traffic',
    name: 'Traffic',
    icon: Navigation,
    color: '#FF6B35',
  },
  {
    id: 'community',
    name: 'Community',
    icon: Users,
    color: '#2ED573',
  },
  {
    id: 'safety',
    name: 'Safety',
    icon: Shield,
    color: '#FF3838',
  },
];

export function QuickMapViewToggle({ selectedView, onViewChange }: QuickMapViewToggleProps) {
  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {QUICK_VIEWS.map((view) => {
          const isSelected = selectedView === view.id;
          const IconComponent = view.icon;
          
          return (
            <TouchableOpacity
              key={view.id}
              style={[
                styles.viewButton,
                isSelected && styles.viewButtonSelected,
                isSelected && { borderColor: view.color }
              ]}
              onPress={() => onViewChange(view.id)}
              activeOpacity={0.7}
            >
              <View style={[
                styles.iconContainer,
                isSelected && { backgroundColor: view.color + '20' }
              ]}>
                <IconComponent 
                  size={12} 
                  color={isSelected ? view.color : theme.colors.textSecondary} 
                />
              </View>
              <Text style={[
                styles.viewText,
                isSelected && { color: view.color }
              ]}>
                {view.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 400,
    width: 56,
    alignItems: 'center',
  },
  scrollContent: {
    paddingVertical: theme.spacing.xs,
    gap: theme.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    width: 45,
  },
  viewButtonSelected: {
    backgroundColor: theme.colors.background,
    borderWidth: 1,
  },
  iconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  viewText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default QuickMapViewToggle;