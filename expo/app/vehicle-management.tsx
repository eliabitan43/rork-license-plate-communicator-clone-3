import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { 
  Car, Plus, Trash2, CheckCircle, Clock, X, Star, ChevronLeft, ChevronDown, 
  Globe, MapPin, Camera, Truck, Ship, Bike, Home, Edit2, ShieldCheck
} from "lucide-react-native";
import { theme } from "@/constants/theme";
import { HomiLogo } from "@/components/HomiLogo";
import { useAppStore } from "@/hooks/useAppStore";
import { Vehicle } from "@/types";
import { COUNTRIES, getRegionsByCountry, getCountryByCode, getRegionByCode } from "@/constants/regions";
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

const { width: _screenWidth } = Dimensions.get('window');

const vehicleTypeIcons = {
  car: Car,
  truck: Truck,
  motorcycle: Bike,
  boat: Ship,
  rv: Home,
  trailer: Truck,
  offroad: Car,
};

const vehicleTypes = [
  { value: 'car', label: 'Car', icon: Car },
  { value: 'truck', label: 'Truck', icon: Truck },
  { value: 'motorcycle', label: 'Motorcycle', icon: Bike },
  { value: 'boat', label: 'Boat', icon: Ship },
  { value: 'rv', label: 'RV', icon: Home },
  { value: 'trailer', label: 'Trailer', icon: Truck },
  { value: 'offroad', label: 'Off-Road', icon: Car },
] as const;

type VehicleType = 'car' | 'truck' | 'motorcycle' | 'boat' | 'rv' | 'trailer' | 'offroad';

const vehicleTabs = [
  { id: 'all', label: 'All', icon: null },
  { id: 'car', label: 'Cars', icon: Car },
  { id: 'truck', label: 'Trucks', icon: Truck },
  { id: 'motorcycle', label: 'Motorcycles', icon: Bike },
  { id: 'boat', label: 'Boats', icon: Ship },
  { id: 'rv', label: 'RVs', icon: Home },
  { id: 'trailer', label: 'Trailers', icon: Truck },
  { id: 'offroad', label: 'Off-Road', icon: Car },
];

export default function VehicleManagementScreen() {
  const { userProfile, addVehicle, removeVehicle, setPrimaryVehicle, saveProfile, isLoading: appLoading } = useAppStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [newPlate, setNewPlate] = useState("");
  const [newCountry, setNewCountry] = useState("US");
  const [newState, setNewState] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newNickname, setNewNickname] = useState("");
  const [newVehicleType, setNewVehicleType] = useState<VehicleType>('car');
  const [plateImage, setPlateImage] = useState<string | undefined>();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [selectedTab, setSelectedTab] = useState('all');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const _scrollViewRef = useRef<ScrollView>(null);
  const tabScrollRef = useRef<ScrollView>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const currentYear = new Date().getFullYear();

  // Initialize page with retry logic
  useEffect(() => {
    const initializePage = async () => {
      try {
        console.log('Vehicle Management: Initializing page...');
        setPageLoading(true);
        
        // Check if we have user profile and app store
        if (!userProfile) {
          console.log('Vehicle Management: No user profile found, waiting...');
          // Wait a bit for the app store to load
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log('Vehicle Management: Page initialized successfully');
        setPageLoading(false);
        setRetryCount(0);
      } catch (error) {
        console.error('Vehicle Management: Page initialization error:', error);
        if (retryCount < MAX_RETRIES) {
          setRetryCount(prev => prev + 1);
          console.log(`Vehicle Management: Retrying initialization (${retryCount + 1}/${MAX_RETRIES})`);
          setTimeout(initializePage, 1000);
        } else {
          setPageLoading(false);
          Alert.alert('Error', 'Failed to load vehicle management page. Please try again.');
        }
      }
    };

    void initializePage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  // Filter vehicles based on selected tab
  const filteredVehicles = useMemo(() => {
    if (!Array.isArray(userProfile?.vehicles)) return [];
    if (selectedTab === 'all') return userProfile.vehicles;
    return userProfile.vehicles.filter(v => v.type === selectedTab);
  }, [userProfile?.vehicles, selectedTab]);

  // Validate form inputs
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    
    // Required fields
    if (!newPlate.trim()) {
      errors.plate = 'License plate is required';
    } else {
      // Validate plate format (alphanumeric, 2-10 characters)
      const plateRegex = /^[A-Z0-9\s]{2,10}$/;
      if (!plateRegex.test(newPlate.toUpperCase().trim())) {
        errors.plate = 'Invalid plate format (2-10 alphanumeric characters)';
      }
    }
    
    if (!newCountry) {
      errors.country = 'Country is required';
    }
    
    const regions = getRegionsByCountry(newCountry);
    if (regions.length > 0 && !newState) {
      errors.state = 'State/Region is required';
    }
    
    // Year validation
    if (newYear) {
      const year = parseInt(newYear);
      if (isNaN(year) || year < 1900 || year > currentYear + 1) {
        errors.year = `Year must be between 1900 and ${currentYear + 1}`;
      }
    }
    
    // Check for duplicate plate
    const currentVehicles = Array.isArray(userProfile?.vehicles) ? userProfile.vehicles : [];
    const isDuplicate = currentVehicles.some(v => {
      if (editingVehicle && v.id === editingVehicle.id) return false;
      return v.licensePlate.toUpperCase() === newPlate.toUpperCase().trim();
    });
    
    if (isDuplicate) {
      errors.plate = 'This license plate is already registered';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [newPlate, newCountry, newState, newYear, currentYear, userProfile?.vehicles, editingVehicle]);

  const handleAddVehicle = async () => {
    if (isSubmitting) return;
    
    console.log('handleAddVehicle called');
    
    // Validate form
    if (!validateForm()) {
      const firstError = Object.values(validationErrors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Ensure vehicles is an array
      const currentVehicles = Array.isArray(userProfile?.vehicles) ? userProfile.vehicles : [];
      
      // Check vehicle limit
      if (!editingVehicle && currentVehicles.length >= 8) {
        Alert.alert("Limit Reached", "You can only add up to 8 vehicles");
        setIsSubmitting(false);
        return;
      }

      const vehicleData: Vehicle = editingVehicle ? {
        ...editingVehicle,
        licensePlate: newPlate.toUpperCase().trim(),
        country: newCountry,
        state: newState || undefined,
        nickname: newNickname.trim() || undefined,
        make: newMake.trim() || undefined,
        model: newModel.trim() || undefined,
        year: newYear || undefined,
        color: newColor.trim() || undefined,
        type: newVehicleType,
        plateImage: plateImage || editingVehicle.plateImage,
      } : {
        id: Date.now().toString(),
        licensePlate: newPlate.toUpperCase().trim(),
        country: newCountry,
        state: newState || undefined,
        nickname: newNickname.trim() || undefined,
        make: newMake.trim() || undefined,
        model: newModel.trim() || undefined,
        year: newYear || undefined,
        color: newColor.trim() || undefined,
        type: newVehicleType,
        isPrimary: currentVehicles.length === 0,
        isActive: true,
        verificationStatus: 'pending',
        addedAt: new Date().toISOString(),
        plateImage: plateImage,
      };

      console.log('Saving vehicle:', vehicleData);
      
      if (editingVehicle) {
        // Update existing vehicle
        const updatedVehicles = currentVehicles.map(v => 
          v.id === editingVehicle.id ? vehicleData : v
        );
        // Save through profile update
        if (userProfile) {
          await saveProfile({ ...userProfile, vehicles: updatedVehicles });
        }
      } else {
        // Add new vehicle
        await addVehicle(vehicleData);
      }
      
      console.log('Vehicle saved successfully');
      
      // Optimistic UI update
      setShowAddModal(false);
      setShowEditModal(false);
      resetForm();
      
      // Show success toast
      Alert.alert(
        "Success", 
        editingVehicle ? "Vehicle updated successfully!" : "Vehicle added successfully!",
        [{ text: "OK", onPress: () => {
          // Navigate to the tab of the added vehicle
          setSelectedTab(newVehicleType);
        }}]
      );
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      Alert.alert(
        "Error", 
        error.message || "Failed to save vehicle. Please try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Retry", onPress: handleAddVehicle }
        ]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewPlate("");
    setNewCountry("US");
    setNewState("");
    setNewNickname("");
    setNewMake("");
    setNewModel("");
    setNewYear("");
    setNewColor("");
    setNewVehicleType('car');
    setPlateImage(undefined);
    setValidationErrors({});
    setEditingVehicle(null);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setNewPlate(vehicle.licensePlate);
    setNewCountry(vehicle.country);
    setNewState(vehicle.state || "");
    setNewNickname(vehicle.nickname || "");
    setNewMake(vehicle.make || "");
    setNewModel(vehicle.model || "");
    setNewYear(vehicle.year || "");
    setNewColor(vehicle.color || "");
    setNewVehicleType(vehicle.type || 'car');
    setPlateImage(vehicle.plateImage);
    setShowEditModal(true);
  };

  const handleCameraCapture = async () => {
    Alert.alert(
      "Scan License Plate",
      "Choose how to capture your license plate for easier registration",
      [
        {
          text: "Take Photo",
          onPress: async () => {
            if (Platform.OS === 'web') {
              Alert.alert("Mobile Feature", "Camera scanning works best on mobile devices. Please use the mobile app or type the license plate manually.");
              return;
            }
            if (!cameraPermission?.granted) {
              const result = await requestCameraPermission();
              if (!result.granted) {
                Alert.alert("Camera Access", "Camera permission is required to scan your license plate. Please enable camera access in your device settings.");
                return;
              }
            }
            setShowCamera(true);
          }
        },
        {
          text: "Choose from Photos",
          onPress: async () => {
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              aspect: [4, 3],
              quality: 0.8,
              allowsMultipleSelection: false,
            });

            if (!result.canceled && result.assets[0]) {
              setPlateImage(result.assets[0].uri);
              Alert.alert(
                "Photo Added",
                "License plate photo has been saved! Please enter the plate number in the text field above."
              );
            }
          }
        },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleRemoveVehicle = (vehicle: Vehicle) => {
    const vehicles = Array.isArray(userProfile?.vehicles) ? userProfile.vehicles : [];
    
    // Check if trying to remove the only primary vehicle
    if (vehicle.isPrimary && vehicles.length > 1) {
      Alert.alert(
        "Primary Vehicle",
        "Please set another vehicle as primary before removing this one.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Set Another Primary",
            onPress: () => {
              // Find first non-primary vehicle
              const nextVehicle = vehicles.find(v => !v.isPrimary);
              if (nextVehicle) {
                void handleSetPrimary(nextVehicle.id);
              }
            }
          }
        ]
      );
      return;
    }

    Alert.alert(
      "Remove Vehicle",
      `Are you sure you want to remove ${vehicle.nickname || vehicle.licensePlate}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeVehicle(vehicle.id);
              Alert.alert("Success", "Vehicle removed successfully!");
              
              // If no vehicles left in current tab, switch to 'all'
              const remainingInTab = vehicles.filter(v => 
                v.id !== vehicle.id && (selectedTab === 'all' || v.type === selectedTab)
              );
              if (remainingInTab.length === 0 && selectedTab !== 'all') {
                setSelectedTab('all');
              }
            } catch (error: any) {
              Alert.alert(
                "Error", 
                error.message || "Failed to remove vehicle. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = async (vehicleId: string) => {
    try {
      await setPrimaryVehicle(vehicleId);
      Alert.alert("Success", "Primary vehicle updated");
    } catch (error: any) {
      Alert.alert(
        "❌ Error", 
        error.message || "Failed to update primary vehicle. Please try again."
      );
    }
  };

  // Render loading state
  if (pageLoading || appLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen 
          options={{ 
            headerShown: true,
            headerTitle: () => <HomiLogo size={42} />,
            headerTitleAlign: 'center',
          }} 
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading vehicles...</Text>
          {retryCount > 0 && (
            <Text style={styles.retryText}>Retry attempt {retryCount}/{MAX_RETRIES}</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          headerShown: true,
          headerTitle: () => <HomiLogo size={42} />,
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity onPress={() => {
              console.log('Header back button pressed');
              try {
                router.back();
              } catch {
                router.replace('/(tabs)/profile');
              }
            }}>
              <ChevronLeft size={24} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          ),
        }} 
      />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>MY VEHICLES</Text>
          <Text style={styles.vehicleCount}>
            {Array.isArray(userProfile?.vehicles) ? userProfile.vehicles.length : 0}/8 vehicles registered
          </Text>
        </View>

        {/* Compact Vehicle Type Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView 
            ref={tabScrollRef}
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabsContent}
          >
            {vehicleTabs.map((tab) => {
              const vehicleCount = tab.id === 'all' 
                ? userProfile?.vehicles?.length || 0
                : userProfile?.vehicles?.filter(v => v.type === tab.id).length || 0;
              
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.tab,
                    selectedTab === tab.id && styles.tabActive
                  ]}
                  onPress={() => setSelectedTab(tab.id)}
                  testID={`tab-${tab.id}`}
                >
                  <Text style={[
                    styles.tabLabel,
                    selectedTab === tab.id && styles.tabLabelActive
                  ]}>
                    {tab.label}
                  </Text>
                  {vehicleCount > 0 && (
                    <View style={[
                      styles.tabBadge,
                      selectedTab === tab.id && styles.tabBadgeActive
                    ]}>
                      <Text style={[
                        styles.tabBadgeText,
                        selectedTab === tab.id && styles.tabBadgeTextActive
                      ]}>
                        {vehicleCount}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Vehicle List */}
        <View style={styles.section}>
          {filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <View key={vehicle.id} style={[
                styles.vehicleCard,
                vehicle.isPrimary && styles.primaryVehicleCard
              ]}>
                <View style={styles.vehicleHeader}>
                  <View style={[
                    styles.vehicleIcon,
                    vehicle.isPrimary && styles.primaryVehicleIcon
                  ]}>
                    {(() => {
                      const IconComponent = vehicleTypeIcons[vehicle.type || 'car'];
                      return <IconComponent size={24} color={vehicle.isPrimary ? theme.colors.white : theme.colors.primary} />;
                    })()}
                  </View>
                  <View style={styles.vehicleInfo}>
                    <View style={styles.plateRow}>
                      <Text style={styles.licensePlate}>{vehicle.licensePlate}</Text>
                      {vehicle.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Star size={12} color={theme.colors.white} fill={theme.colors.white} />
                          <Text style={styles.primaryBadgeText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.locationRow}>
                      <Text style={styles.locationText}>
                        {getCountryByCode(vehicle.country)?.flag} {vehicle.state || getCountryByCode(vehicle.country)?.name}
                      </Text>
                    </View>
                    {vehicle.nickname && (
                      <Text style={styles.vehicleNickname}>"{vehicle.nickname}"</Text>
                    )}
                    {vehicle.make && (
                      <Text style={styles.vehicleDetails}>
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </Text>
                    )}
                    {vehicle.color && (
                      <Text style={styles.vehicleColor}>Color: {vehicle.color}</Text>
                    )}
                  </View>
                </View>

                <View style={styles.vehicleActions}>
                  <View style={styles.vehicleStatus}>
                    {vehicle.verificationStatus === 'verified' ? (
                      <View style={[styles.statusBadge, styles.verifiedBadge]}>
                        <CheckCircle size={16} color={theme.colors.success} />
                        <Text style={[styles.statusText, styles.verifiedText]}>Verified</Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[styles.statusBadge, styles.verifyCta]}
                        onPress={() => router.push({ pathname: '/verify-plate', params: { vehicleId: vehicle.id } })}
                        testID={`verify-${vehicle.id}`}
                        activeOpacity={0.85}
                      >
                        <ShieldCheck size={14} color={theme.colors.primary} />
                        <Text style={[styles.statusText, styles.verifyCtaText]}>Verify plate</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditVehicle(vehicle)}
                      testID={`edit-${vehicle.id}`}
                    >
                      <Edit2 size={16} color={theme.colors.primary} />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>

                    {!vehicle.isPrimary && userProfile && Array.isArray(userProfile?.vehicles) && userProfile.vehicles.length > 1 && (
                      <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={() => handleSetPrimary(vehicle.id)}
                        testID={`set-primary-${vehicle.id}`}
                      >
                        <Star size={16} color={theme.colors.primary} />
                        <Text style={styles.primaryButtonText}>Set Primary</Text>
                      </TouchableOpacity>
                    )}
                    
                    {(!vehicle.isPrimary || (userProfile && Array.isArray(userProfile?.vehicles) && userProfile.vehicles.length === 1)) && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleRemoveVehicle(vehicle)}
                        testID={`delete-${vehicle.id}`}
                      >
                        <Trash2 size={18} color={theme.colors.danger} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              {selectedTab === 'all' ? (
                <>
                  <Car size={64} color={theme.colors.lightGray} />
                  <Text style={styles.emptyTitle}>No Vehicles Added</Text>
                  <Text style={styles.emptyDescription}>
                    Add your first vehicle to start receiving messages
                  </Text>
                </>
              ) : (
                <>
                  {(() => {
                    const tab = vehicleTabs.find(t => t.id === selectedTab);
                    const IconComponent = tab?.icon || Car;
                    return <IconComponent size={64} color={theme.colors.lightGray} />;
                  })()}
                  <Text style={styles.emptyTitle}>No {vehicleTabs.find(t => t.id === selectedTab)?.label}</Text>
                  <Text style={styles.emptyDescription}>
                    Add a {selectedTab === 'offroad' ? 'off-road vehicle' : selectedTab} to get started
                  </Text>
                </>
              )}
            </View>
          )}
        </View>

        {/* Add Vehicle Button */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            const vehicleCount = Array.isArray(userProfile?.vehicles) ? userProfile.vehicles.length : 0;
            console.log('Add vehicle button pressed, current vehicle count:', vehicleCount);
            if (vehicleCount >= 8) {
              Alert.alert("Limit Reached", "You can only add up to 8 vehicles");
              return;
            }
            setShowAddModal(true);
          }}
          testID="add-vehicle-button"
        >
          <Plus size={20} color={theme.colors.white} />
          <Text style={styles.addButtonText}>
            {(Array.isArray(userProfile?.vehicles) && userProfile.vehicles.length >= 8) ? 'Vehicle Limit Reached' : 'Add New Vehicle'}
          </Text>
        </TouchableOpacity>

        {/* Back to Home Button */}
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => {
            console.log('Navigating back to home');
            router.push('/(tabs)/dashboard');
          }}
          testID="back-to-home"
        >
          <Home size={20} color={theme.colors.white} />
          <Text style={styles.homeButtonText}>Back to Home Screen</Text>
        </TouchableOpacity>

        {/* Add/Edit Vehicle Modal */}
        <Modal
          visible={showAddModal || showEditModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (showCountryPicker || showStatePicker) {
              setShowCountryPicker(false);
              setShowStatePicker(false);
            } else {
              setShowAddModal(false);
              setShowEditModal(false);
              resetForm();
            }
          }}
        >
          <KeyboardAvoidingView 
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingVehicle ? 'EDIT VEHICLE' : 'ADD NEW VEHICLE'}
                </Text>
                <TouchableOpacity onPress={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}>
                  <X size={24} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {showCountryPicker ? (
                <View style={styles.inlinePickerContainer}>
                  <View style={styles.inlinePickerHeader}>
                    <Text style={styles.inlinePickerTitle}>SELECT COUNTRY</Text>
                    <TouchableOpacity onPress={() => setShowCountryPicker(false)}>
                      <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={COUNTRIES}
                    keyExtractor={(item) => item.code}
                    showsVerticalScrollIndicator={true}
                    style={styles.inlinePickerList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          item.code === newCountry && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          console.log('Country selected:', item.name);
                          setNewCountry(item.code);
                          setNewState("");
                          setShowCountryPicker(false);
                        }}
                        activeOpacity={0.7}
                        testID={`country-${item.code}`}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          item.code === newCountry && styles.pickerItemTextSelected
                        ]}>
                          {item.flag} {item.name}
                        </Text>
                        {item.code === newCountry && (
                          <CheckCircle size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : showStatePicker ? (
                <View style={styles.inlinePickerContainer}>
                  <View style={styles.inlinePickerHeader}>
                    <Text style={styles.inlinePickerTitle}>
                      SELECT {newCountry === 'US' ? 'STATE' : newCountry === 'CA' ? 'PROVINCE' : 'STATE/REGION'}
                    </Text>
                    <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                      <X size={24} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={getRegionsByCountry(newCountry)}
                    keyExtractor={(item) => item.code}
                    showsVerticalScrollIndicator={true}
                    style={styles.inlinePickerList}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.pickerItem,
                          item.code === newState && styles.pickerItemSelected
                        ]}
                        onPress={() => {
                          console.log('State selected:', item.name);
                          setNewState(item.code);
                          setShowStatePicker(false);
                        }}
                        activeOpacity={0.7}
                        testID={`region-${item.code}`}
                      >
                        <Text style={[
                          styles.pickerItemText,
                          item.code === newState && styles.pickerItemTextSelected
                        ]}>
                          {item.name}
                        </Text>
                        {item.code === newState && (
                          <CheckCircle size={20} color={theme.colors.primary} />
                        )}
                      </TouchableOpacity>
                    )}
                  />
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <View style={styles.locationSection}>
                    <Text style={styles.inputLabel}>Country *</Text>
                    <TouchableOpacity 
                      style={[styles.pickerButton, validationErrors.country && styles.inputError]}
                      onPress={() => {
                        console.log('Country picker button pressed');
                        setShowCountryPicker(true);
                      }}
                      activeOpacity={0.6}
                      testID="country-picker-button"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View style={styles.pickerContent}>
                        <Globe size={20} color={theme.colors.textSecondary} />
                        <Text style={styles.pickerText}>
                          {getCountryByCode(newCountry)?.flag} {getCountryByCode(newCountry)?.name}
                        </Text>
                      </View>
                      <ChevronDown size={20} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    {validationErrors.country && (
                      <Text style={styles.errorText}>{validationErrors.country}</Text>
                    )}

                    {getRegionsByCountry(newCountry).length > 0 && (
                      <>
                        <Text style={styles.inputLabel}>
                          {newCountry === 'US' ? 'State' : newCountry === 'CA' ? 'Province' : 'State/Region'} *
                        </Text>
                        <TouchableOpacity 
                          style={[styles.pickerButton, validationErrors.state && styles.inputError]}
                          onPress={() => {
                            console.log('State picker button pressed');
                            setShowStatePicker(true);
                          }}
                          activeOpacity={0.6}
                          testID="state-picker-button"
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <View style={styles.pickerContent}>
                            <MapPin size={20} color={theme.colors.textSecondary} />
                            <Text style={styles.pickerText}>
                              {newState ? getRegionByCode(newState, newCountry)?.name : 'Select...'}
                            </Text>
                          </View>
                          <ChevronDown size={20} color={theme.colors.textSecondary} />
                        </TouchableOpacity>
                        {validationErrors.state && (
                          <Text style={styles.errorText}>{validationErrors.state}</Text>
                        )}
                      </>
                    )}
                  </View>

                  <Text style={styles.inputLabel}>Vehicle Type *</Text>
                  <View style={styles.vehicleTypeGrid}>
                    {vehicleTypes.map((type) => {
                      const IconComponent = type.icon;
                      return (
                        <TouchableOpacity
                          key={type.value}
                          style={[
                            styles.vehicleTypeButton,
                            newVehicleType === type.value && styles.vehicleTypeButtonActive
                          ]}
                          onPress={() => setNewVehicleType(type.value as VehicleType)}
                        >
                          <IconComponent 
                            size={24} 
                            color={newVehicleType === type.value ? theme.colors.white : theme.colors.primary} 
                          />
                          <Text style={[
                            styles.vehicleTypeLabel,
                            newVehicleType === type.value && styles.vehicleTypeLabelActive
                          ]}>
                            {type.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.inputLabel}>License Plate *</Text>
                  <View style={styles.plateSection}>
                    <View style={styles.plateInputContainer}>
                      <TouchableOpacity 
                        style={styles.cameraButton}
                        onPress={handleCameraCapture}
                      >
                        <Camera size={20} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TextInput
                        style={[styles.input, styles.plateInput, validationErrors.plate && styles.inputError]}
                        placeholder={newVehicleType === 'boat' ? "Add plate here..." : "Add plate here..."}
                        placeholderTextColor={theme.colors.gray}
                        value={newPlate}
                        onChangeText={(text) => {
                          setNewPlate(text);
                          if (validationErrors.plate) {
                            setValidationErrors(prev => ({ ...prev, plate: '' }));
                          }
                        }}
                        autoCapitalize="characters"
                        maxLength={10}
                      />
                    </View>
                    {validationErrors.plate && (
                      <Text style={styles.errorText}>{validationErrors.plate}</Text>
                    )}
                    
                    {plateImage && (
                      <View style={styles.plateImagePreview}>
                        <Text style={styles.plateImageText}>License plate photo captured</Text>
                        <TouchableOpacity 
                          style={styles.removeImageButton}
                          onPress={() => setPlateImage(undefined)}
                        >
                          <X size={16} color={theme.colors.danger} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <Text style={styles.inputLabel}>Nickname (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., Family Car, Work Truck"
                    placeholderTextColor={theme.colors.gray}
                    value={newNickname}
                    onChangeText={setNewNickname}
                    maxLength={30}
                  />

                  <Text style={styles.inputLabel}>{newVehicleType === 'boat' ? 'Boat' : 'Vehicle'} Details (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder={newVehicleType === 'boat' ? "Make (e.g., Sea Ray)" : "Make (e.g., Toyota)"}
                    placeholderTextColor={theme.colors.gray}
                    value={newMake}
                    onChangeText={setNewMake}
                  />

                  <TextInput
                    style={styles.input}
                    placeholder={newVehicleType === 'boat' ? "Model (e.g., Sundancer)" : "Model (e.g., Camry)"}
                    placeholderTextColor={theme.colors.gray}
                    value={newModel}
                    onChangeText={setNewModel}
                  />

                  <TextInput
                    style={[styles.input, validationErrors.year && styles.inputError]}
                    placeholder="Year (e.g., 2022)"
                    placeholderTextColor={theme.colors.gray}
                    value={newYear}
                    onChangeText={(text) => {
                      setNewYear(text);
                      if (validationErrors.year) {
                        setValidationErrors(prev => ({ ...prev, year: '' }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={4}
                  />
                  {validationErrors.year && (
                    <Text style={styles.errorText}>{validationErrors.year}</Text>
                  )}

                  <TextInput
                    style={styles.input}
                    placeholder="Color (e.g., Silver)"
                    placeholderTextColor={theme.colors.gray}
                    value={newColor}
                    onChangeText={setNewColor}
                  />

                  <View style={styles.modalButtons}>
                    <TouchableOpacity 
                      style={styles.cancelButton} 
                      onPress={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        resetForm();
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.saveButton} 
                      onPress={() => {
                        if (!newPlate.trim()) {
                          Alert.alert("Plate required", "Enter a license plate to continue.");
                          return;
                        }
                        handleAddVehicle();
                      }}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={theme.colors.white} />
                      ) : (
                        <Text style={styles.saveButtonText}>
                          {editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* Camera Modal */}
        {showCamera && Platform.OS !== 'web' && (
          <Modal
            visible={showCamera}
            transparent={false}
            animationType="slide"
            onRequestClose={() => setShowCamera(false)}
          >
            <View style={styles.cameraContainer}>
              <CameraView 
                style={styles.camera} 
                facing="back"
              >
                <View style={styles.cameraOverlay}>
                  <Text style={styles.cameraTitle}>Scan License Plate</Text>
                  <View style={styles.cameraFrame}>
                    <View style={[styles.frameCorner, styles.topLeft]} />
                    <View style={[styles.frameCorner, styles.topRight]} />
                    <View style={[styles.frameCorner, styles.bottomLeft]} />
                    <View style={[styles.frameCorner, styles.bottomRight]} />
                  </View>
                  <Text style={styles.cameraHint}>Position license plate within the frame</Text>
                  <Text style={styles.cameraSubHint}>Make sure the plate is clearly visible and well-lit</Text>
                </View>
                <View style={styles.cameraControls}>
                  <TouchableOpacity 
                    style={styles.cameraCancelButton}
                    onPress={() => setShowCamera(false)}
                  >
                    <X size={24} color={theme.colors.white} />
                    <Text style={styles.cameraButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cameraCaptureButton}
                    onPress={() => {
                      setPlateImage('captured_' + Date.now());
                      Alert.alert(
                        "Photo Captured",
                        "License plate photo has been saved successfully! Please enter the plate number in the text field.",
                        [{ text: "Got it", onPress: () => setShowCamera(false) }]
                      );
                    }}
                  >
                    <Camera size={32} color={theme.colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.cameraFlipButton}
                    onPress={() => {
                      Alert.alert("Tip", "Use the back camera for best results when scanning license plates");
                    }}
                  >
                    <Text style={styles.cameraButtonText}>Flip</Text>
                  </TouchableOpacity>
                </View>
              </CameraView>
            </View>
          </Modal>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  loadingText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  retryText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.warning,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    letterSpacing: 1,
  },
  vehicleCount: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  tabsContainer: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tabsContent: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderRadius: 999,
    backgroundColor: theme.colors.background,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  tabLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
  },
  tabLabelActive: {
    color: theme.colors.white,
  },
  tabBadge: {
    marginLeft: theme.spacing.xs,
    backgroundColor: theme.colors.lightGray,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold' as const,
    color: theme.colors.textSecondary,
  },
  tabBadgeTextActive: {
    color: theme.colors.white,
  },
  section: {
    padding: theme.spacing.lg,
  },
  vehicleCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  primaryVehicleCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
  },
  vehicleHeader: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryVehicleIcon: {
    backgroundColor: theme.colors.primary,
  },
  plateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: 'bold' as const,
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  vehicleInfo: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  licensePlate: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
  },
  vehicleNickname: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
    marginBottom: theme.spacing.xs,
  },
  vehicleDetails: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  vehicleColor: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  vehicleActions: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  vehicleStatus: {
    flexDirection: 'row',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  verifiedBadge: {
    backgroundColor: `${theme.colors.success}15`,
  },
  pendingBadge: {
    backgroundColor: `${theme.colors.warning}15`,
  },
  verifiedText: {
    color: theme.colors.success,
  },
  pendingText: {
    color: theme.colors.warning,
  },
  verifyCta: {
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  verifyCtaText: {
    color: theme.colors.primary,
  },
  statusText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  editButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    gap: theme.spacing.xs,
  },
  primaryButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  deleteButton: {
    backgroundColor: theme.colors.background,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.danger,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
    gap: theme.spacing.md,
  },
  emptyTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
  },
  emptyDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: 999,
    gap: theme.spacing.sm,
  },
  addButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    padding: theme.spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    marginBottom: theme.spacing.md,
    color: theme.colors.textPrimary,
  },
  inputError: {
    borderColor: theme.colors.danger,
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.xl,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    color: theme.colors.textSecondary,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  saveButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  locationSection: {
    marginBottom: theme.spacing.lg,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
    minHeight: 48,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  pickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
  },
  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerModalBackdrop: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  pickerModalContent: {
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    maxHeight: '75%',
    minHeight: 350,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.white,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
  },
  pickerModalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
    flex: 1,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  pickerListContent: {
    paddingBottom: theme.spacing.lg,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    minHeight: 56,
    backgroundColor: theme.colors.white,
  },
  pickerItemSelected: {
    backgroundColor: `${theme.colors.primary}15`,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  pickerItemText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  pickerItemTextSelected: {
    color: theme.colors.primary,
    fontWeight: '600' as const,
  },
  vehicleTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  vehicleTypeButton: {
    width: '30%',
    alignItems: 'center',
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.white,
  },
  vehicleTypeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  vehicleTypeLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginTop: 4,
    fontWeight: '600' as const,
  },
  vehicleTypeLabelActive: {
    color: theme.colors.white,
  },
  plateSection: {
    marginBottom: theme.spacing.md,
  },
  plateInputContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  plateInput: {
    flex: 1,
    marginBottom: 0,
  },
  cameraButton: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: 280,
    height: 80,
    borderWidth: 2,
    borderColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    backgroundColor: 'transparent',
  },
  cameraHint: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    marginTop: theme.spacing.md,
    textAlign: 'center' as const,
  },
  cameraControls: {
    position: 'absolute' as const,
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  cameraCancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.borderRadius.md,
  },
  cameraButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  cameraCaptureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.textSecondary,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
  },
  homeButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
  },
  plateImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: `${theme.colors.success}15`,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.success,
  },
  plateImageText: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
  },
  removeImageButton: {
    padding: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.white,
  },
  cameraTitle: {
    color: theme.colors.white,
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold' as const,
    marginBottom: theme.spacing.lg,
    textAlign: 'center' as const,
  },
  cameraSubHint: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    textAlign: 'center' as const,
    opacity: 0.8,
  },
  frameCorner: {
    position: 'absolute' as const,
    width: 20,
    height: 20,
    borderColor: theme.colors.primary,
  },
  topLeft: {
    top: -2,
    left: -2,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: -2,
    right: -2,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: -2,
    left: -2,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: -2,
    right: -2,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  cameraFlipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: theme.borderRadius.md,
  },
  inlinePickerContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.lg,
    maxHeight: 400,
  },
  inlinePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  inlinePickerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: 'bold' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 0.5,
  },
  inlinePickerList: {
    maxHeight: 340,
  },
});