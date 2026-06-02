import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import React, { useEffect, Component, ReactNode, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AppProvider } from "@/hooks/useAppStore";
import { CommunityPostsProvider } from "@/hooks/useCommunityPosts";
import { PremiumProvider } from "@/hooks/usePremium";
import { ReferralProvider } from "@/hooks/useReferral";
import { PlateClaimsProvider } from "@/hooks/usePlateClaims";
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, LogBox } from "react-native";
import { theme, designTokens } from "@/constants/theme";
import BrandHeaderTitle from "@/components/BrandHeaderTitle";
import { AlertTriangle, RefreshCw } from "lucide-react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc, trpcClient } from "@/lib/trpc";
import { ToastProvider, ToastContainer } from "@/hooks/useToast";

void SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, _errorInfo: any) {
    const isCorruptionError = error.message.includes('AsyncStorage') || 
        error.message.includes('JSON') || 
        error.message.includes('Unexpected character: o') ||
        error.message.includes('JSON Parse error') ||
        error.message.includes('Unexpected character') ||
        error.message.includes('corruption detected') ||
        error.message.includes('parse error') ||
        error.message.includes('app will restart');
    
    if (isCorruptionError) {
      console.log('Storage corruption detected - clearing and restarting');
      AsyncStorage.clear().then(() => {
        console.log('Storage cleared');
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          setTimeout(() => window.location.reload(), 100);
        }
      }).catch(() => {});
    } else {
      console.error('App Error:', error.message);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <AlertTriangle size={64} color={theme.colors.danger} />
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            The app encountered an unexpected error. Please try restarting.
          </Text>
          <TouchableOpacity 
            style={errorStyles.button}
            onPress={() => {
              console.log('ErrorBoundary: Try Again pressed');
              this.setState({ hasError: false, error: undefined });
            }}
            testID="error-try-again"
          >
            <RefreshCw size={20} color={theme.colors.white} />
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[errorStyles.button, { marginTop: theme.spacing.md }]}
            onPress={async () => {
              console.log('ErrorBoundary: Reset App pressed');
              try {
                await AsyncStorage.clear();
                console.log('ErrorBoundary: AsyncStorage cleared');
              } catch (e) {
                console.error('ErrorBoundary: Failed clearing storage', e);
              }
              this.setState({ hasError: false, error: undefined });
              if (Platform.OS === 'web') {
                try {
                  if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
                    window.location.reload();
                  } else if (typeof location !== 'undefined' && typeof location.reload === 'function') {
                    location.reload();
                  } else {
                    // Last resort - navigate to root
                    window.location.href = '/';
                  }
                } catch (reloadError) {
                  console.log('ErrorBoundary: All reload methods failed', reloadError);
                  // Try to at least reset the component state
                  this.setState({ hasError: false, error: undefined });
                }
              }
            }}
            testID="error-reset-app"
          >
            <RefreshCw size={20} color={theme.colors.white} />
            <Text style={errorStyles.buttonText}>Reset App</Text>
          </TouchableOpacity>
          {__DEV__ && this.state.error && (
            <Text style={errorStyles.errorText}>
              {this.state.error.toString()}
            </Text>
          )}

        </View>
      );
    }

    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
    lineHeight: 24,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.sm,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  errorText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.danger,
    marginTop: theme.spacing.lg,
    textAlign: 'center',
  },
  hintText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

const rootStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

const prefix = Linking.createURL("/");
const _linking = {
  prefixes: [prefix, "homi://", "https://homi.app"],
  config: {
    screens: {
      "(tabs)": {
        screens: {
          dashboard: "dashboard",
          scan: "scan",
          messages: "messages",
          nearby: "nearby",
          profile: "profile",
        },
      },
      "message-detail": "message",
      "map-live": "alert",
      "send-message": "compose",
      "services": "services",
      "claim": "i/:plate",
      "verify-plate": "verify",
    },
  },
};

function RootLayoutNav() {
  const router = useRouter();

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as any;
      console.log('Push notification tapped:', data);
      
      // Expect pushes to include type + ids + a `deeplink` fallback
      if (data?.deeplink) {
        router.push(data.deeplink);
      } else if (data?.type === "alert" && data?.id) {
        router.push({ pathname: "/map-live", params: { id: data.id }});
      } else if (data?.type === "message" && data?.plate) {
        router.push({ pathname: "/message-detail", params: { plate: data.plate }});
      } else {
        router.push("/(tabs)/dashboard");
      }
    });
    return () => sub.remove();
  }, [router]);

  return (
    <Stack
      screenOptions={{
        headerTitleAlign: 'center',
        headerTitle: () => <BrandHeaderTitle size={28} />,
        headerStyle: { backgroundColor: designTokens.color.surface },
        headerTintColor: designTokens.color.primary,
        headerShadowVisible: true,
        headerTitleStyle: {
          fontFamily: designTokens.font.family,
          fontWeight: '600' as const,
          fontSize: designTokens.type.subhead.size,
          color: designTokens.color.text,
        },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="send-message" 
        options={{ 
          presentation: "modal",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="message-detail" 
        options={{ 
          presentation: "modal",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="vehicle-management" 
        options={{ 
          presentation: "card",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="safety-center" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="contact-us" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="map-live" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="services" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="dev-server-status" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="notification-test" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="notification-system-test" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="community-guidelines" 
        options={{ 
          title: "Community Code of Conduct",
        }} 
      />
      <Stack.Screen 
        name="debug-startup" 
        options={{ 
          title: "Debug Startup",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="refresh" 
        options={{ 
          title: "Refresh",
        }} 
      />
      <Stack.Screen 
        name="paywall" 
        options={{ 
          presentation: "modal",
          headerShown: false,
          animation: "slide_from_bottom",
        }} 
      />
      <Stack.Screen 
        name="system-test" 
        options={{ 
          title: "System Test",
          headerShown: false,
        }} 
      />
      <Stack.Screen
        name="referral"
        options={{
          presentation: "card",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="claim"
        options={{
          presentation: "card",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
      <Stack.Screen
        name="verify-plate"
        options={{
          presentation: "card",
          headerShown: false,
          animation: "slide_from_right",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    // Suppress React Native LogBox for JSON parse errors
    LogBox.ignoreLogs([
      'JSON Parse error',
      'Unexpected character',
      'JSON parse error',
      'parse error',
    ]);
    
    // Global error handler to suppress JSON parse errors in the UI
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      if (message.includes('JSON Parse error') || 
          message.includes('Unexpected character: o') ||
          message.includes('Unexpected character') ||
          message.includes('parse error')) {
        originalConsoleError('[Suppressed]', 'Storage corruption detected and handled');
        return;
      }
      originalConsoleError(...args);
    };
    
    // CRITICAL: Check and clear corrupted storage BEFORE initializing anything
    const initializeStorage = async () => {
      try {
        console.log('Starting BLOCKING corruption check...');
        const allKeys = await AsyncStorage.getAllKeys();
        let foundCorruption = false;
        
        // Check for critical "o" character corruption and other patterns
        for (const key of allKeys) {
          try {
            const data = await AsyncStorage.getItem(key);
            
            // CRITICAL: Check for the specific "o" character corruption
            if (data === 'o' || data === 'object' || data === 'undefined' || 
                data === 'null' || data === '[object Object]' || data === 'NaN') {
              console.error(`Corruption detected in ${key}: "${data}", clearing ALL storage`);
              await AsyncStorage.clear();
              foundCorruption = true;
              
              // Force reload on web
              if (Platform.OS === 'web' && typeof window !== 'undefined') {
                setTimeout(() => {
                  try {
                    window.location.reload();
                  } catch {
                    window.location.reload();
                  }
                }, 100);
              }
              return; // Exit early
            }
            
            // Try to parse JSON to detect corruption
            if (data && data.trim() !== '' && data !== 'true' && data !== 'false') {
              try {
                // Silently test parse - don't let errors bubble up
                JSON.parse(data);
              } catch (parseError: any) {
                // Only log to console, don't throw or display the error
                if (parseError.message?.includes('Unexpected character') || 
                    parseError.message?.includes('JSON Parse error')) {
                  console.error(`JSON parse error in ${key}, clearing ALL storage`);
                  try {
                    await AsyncStorage.clear();
                    foundCorruption = true;
                    
                    if (Platform.OS === 'web' && typeof window !== 'undefined') {
                      setTimeout(() => {
                        try {
                          window.location.reload();
                        } catch {}
                      }, 100);
                    }
                  } catch (clearError) {
                    console.error('Failed to clear storage:', clearError);
                  }
                  return;
                }
              }
            }
          } catch (error) {
            console.error(`Error checking key ${key}:`, error);
            await AsyncStorage.removeItem(key).catch(() => {});
            foundCorruption = true;
          }
        }
        
        if (foundCorruption) {
          console.log('Corruption cleared, storage is now clean');
        } else {
          console.log('No corruption detected, storage is clean');
        }
        
        if (isMounted) {
          setIsStorageReady(true);
        }
      } catch (error: any) {
        console.error('Critical error during storage initialization:', error);
        // Clear everything as a safety measure
        try {
          await AsyncStorage.clear();
          console.log('Cleared all storage due to initialization error');
        } catch {}
        
        if (isMounted) {
          setStorageError(error?.message || 'Storage initialization failed');
          setIsStorageReady(true); // Allow app to continue with clean storage
        }
      }
    };
    
    // Run initialization immediately and block until complete
    void initializeStorage();
    
    // Hide splash screen after a short delay
    setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 500);
    
    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: any) => {
      const error = event.reason || event.detail?.reason;
      if (error && typeof error === 'object' && error.message) {
        if (error.message.includes('JSON Parse error') || 
            error.message.includes('Unexpected character') ||
            error.message.includes('Unexpected token')) {
          console.error('Global: JSON parse error detected, clearing storage');
          AsyncStorage.clear().catch(() => {});
          if (Platform.OS === 'web' && typeof window !== 'undefined') {
            setTimeout(() => window.location.reload(), 100);
          }
        }
      }
    };
    
    // Add global error listeners
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
      window.addEventListener('error', (event) => {
        if (event.error && event.error.message && 
            (event.error.message.includes('JSON Parse error') || 
             event.error.message.includes('Unexpected character'))) {
          console.error('Global: JSON parse error in window error handler');
          AsyncStorage.clear().catch(() => {});
          setTimeout(() => window.location.reload(), 100);
        }
      });
    }
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Restore original console.error
      console.error = originalConsoleError;
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      }
    };
  }, []);
  
  // Show loading screen while checking storage
  if (!isStorageReady) {
    return (
      <View style={errorStyles.container}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={errorStyles.message}>Initializing app...</Text>
      </View>
    );
  }

  // Show error if storage initialization failed
  if (storageError) {
    return (
      <View style={errorStyles.container}>
        <AlertTriangle size={64} color={theme.colors.warning} />
        <Text style={errorStyles.title}>Storage Cleared</Text>
        <Text style={errorStyles.message}>
          Corrupted data was detected and cleared. The app will now start fresh.
        </Text>
        <TouchableOpacity 
          style={errorStyles.button}
          onPress={() => {
            setStorageError(null);
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              window.location.reload();
            }
          }}
        >
          <RefreshCw size={20} color={theme.colors.white} />
          <Text style={errorStyles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>
          <AppProvider>
            <CommunityPostsProvider>
              <PremiumProvider>
              <ReferralProvider>
              <PlateClaimsProvider>
              <ToastProvider>
                <GestureHandlerRootView style={rootStyles.container}>
                  <RootLayoutNav />
                  <ToastContainer />
                </GestureHandlerRootView>
              </ToastProvider>
              </PlateClaimsProvider>
              </ReferralProvider>
              </PremiumProvider>
            </CommunityPostsProvider>
          </AppProvider>
        </QueryClientProvider>
      </trpc.Provider>
    </ErrorBoundary>
  );
}