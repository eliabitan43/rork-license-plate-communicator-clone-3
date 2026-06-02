import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Alert, Platform, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Truck, Droplets, Fuel, Camera, MapPin, Zap, Utensils } from 'lucide-react-native';
import { theme } from '@/constants/theme';
import { fetchServiceRegistry, serviceQk, Service } from '@/types/services';


const iconMap = {
  truck: Truck,
  droplets: Droplets,
  fuel: Fuel,
  camera: Camera,
  'map-pin': MapPin,
  zap: Zap,
  utensils: Utensils,
};

const categoryColors = {
  help: theme.colors.danger,
  perks: theme.colors.success,
  info: theme.colors.primary,
  safety: theme.colors.warning,
};

interface ServiceTileProps {
  service: Service;
  onPress: () => void;
}

function ServiceTile({ service, onPress }: ServiceTileProps) {
  const IconComponent = iconMap[service.icon as keyof typeof iconMap] || Camera;
  const categoryColor = categoryColors[service.category];

  return (
    <TouchableOpacity 
      style={styles.serviceTile} 
      onPress={onPress} 
      testID={`service-${service.slug}`}
      accessibilityRole="button"
      accessibilityLabel={`${service.name}. ${service.description ?? ''}`.trim()}
    >
      <View style={[styles.iconContainer, { backgroundColor: categoryColor + '20' }]}>
        <IconComponent size={24} color={categoryColor} />
      </View>
      <View style={styles.serviceContent}>
        <Text style={styles.serviceName}>{service.name}</Text>
        <Text style={styles.serviceDescription}>{service.description}</Text>
        <View style={styles.capabilitiesContainer}>
          {service.capabilities.slice(0, 3).map((capability, index) => (
            <View key={`capability-${service.slug}-${index}-${capability}`} style={styles.capabilityTag}>
              <Text style={styles.capabilityText}>{capability}</Text>
            </View>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const { data: registry, isLoading, error } = useQuery({
    queryKey: serviceQk.registry(),
    queryFn: fetchServiceRegistry,
  });

  const handleServicePress = async (service: Service) => {
    try {
      console.log('Service pressed:', service.slug);
      const openSearch = async (query: string) => {
        const apple = `http://maps.apple.com/?q=${encodeURIComponent(query)}`;
        const google = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
        const url = Platform.OS === 'ios' ? apple : google;
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Map not available', 'Unable to open maps on this device.');
        }
      };

      switch (service.slug) {
        case 'food-places':
          await openSearch('restaurants near me');
          return;
        case 'fuel':
          await openSearch('gas stations near me');
          return;
        case 'carwash':
          await openSearch('car wash near me');
          return;
        case 'parking':
          await openSearch('parking near me');
          return;
        case 'electric-charging':
          await openSearch('ev charging stations near me');
          return;
        default:
          Alert.alert('Coming soon', 'This service will be available shortly.');
          return;
      }
    } catch (err) {
      console.error('Error handling service press:', err);
      Alert.alert('Error', 'Something went wrong opening this service.');
    }
  };

  const groupedServices = React.useMemo(() => {
    if (!registry?.services) return {};
    
    return registry.services.reduce((acc, service) => {
      if (!acc[service.category]) {
        acc[service.category] = [];
      }
      acc[service.category].push(service);
      return acc;
    }, {} as Record<string, Service[]>);
  }, [registry]);

  const handleBack = () => {
    try {
      router.back();
    } catch {
      router.replace('/(tabs)/dashboard');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton} 
          testID="back-button"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={24} color={theme.colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Services</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading services...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load services</Text>
          </View>
        )}

        {registry && Object.entries(groupedServices).map(([category, services]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
            {services.map((service) => (
              <ServiceTile
                key={service.slug}
                service={service}
                onPress={() => handleServicePress(service)}
              />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            More services coming soon. Have a suggestion?
          </Text>
          <TouchableOpacity onPress={() => router.push('/contact-us')} testID="suggest-service">
            <Text style={styles.footerLink}>Let us know</Text>
          </TouchableOpacity>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
  },
  loadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.danger,
  },
  categorySection: {
    marginTop: theme.spacing.lg,
  },
  categoryTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  serviceTile: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cardBg,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.md,
  },
  serviceContent: {
    flex: 1,
  },
  serviceName: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  serviceDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  capabilitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
  },
  capabilityTag: {
    backgroundColor: theme.colors.primary + '20',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  capabilityText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  footerText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  footerLink: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: '600',
  },
});