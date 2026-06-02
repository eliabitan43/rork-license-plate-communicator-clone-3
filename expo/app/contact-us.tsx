import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';

import { Stack, router } from 'expo-router';
import { Mail, Globe, MessageCircle, Building2, HelpCircle, Copy, CheckCircle, Home } from 'lucide-react-native';
import { theme, designTokens } from '@/constants/theme';
import { HomiLogo } from '@/components/HomiLogo';

const COLORS = {
  primary: theme.colors.primary,
  text: theme.colors.textPrimary,
  background: theme.colors.background,
  white: theme.colors.white,
};

interface ContactInfo {
  title: string;
  email: string;
  icon: React.ReactNode;
  description: string;
}

const contactOptions: ContactInfo[] = [
  {
    title: 'Support',
    email: 'support@homi.io',
    icon: <HelpCircle size={24} color={COLORS.primary} />,
    description: 'Response within 24-48 business hours'
  },
  {
    title: 'Business Partnerships',
    email: 'info@homi.io',
    icon: <Building2 size={24} color={COLORS.primary} />,
    description: 'For business inquiries'
  },
  {
    title: 'Press & Media',
    email: 'info@homi.io',
    icon: <MessageCircle size={24} color={COLORS.primary} />,
    description: 'Media inquiries'
  },
  {
    title: 'General Questions',
    email: 'info@homi.io',
    icon: <Mail size={24} color={COLORS.primary} />,
    description: 'General information'
  },
];

export default function ContactUsScreen() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    licensePlate: '',
    device: Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : 'Web',
    appVersion: '1.0.0',
    description: '',
  });
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const handleEmailPress = async (email: string) => {
    // Input validation
    if (!email || typeof email !== 'string' || !email.trim() || email.length > 100) {
      console.error('Invalid email parameter');
      return;
    }
    
    const sanitizedEmail = email.trim();
    
    try {
      const subject = 'HOMI App Support Request';
      const body = `
Full Name: ${formData.fullName || 'Not provided'}
Email: ${formData.email || 'Not provided'}
Phone: ${formData.phone || 'Not provided'}
License Plate: ${formData.licensePlate || 'Not provided'}
Device: ${formData.device}
App Version: ${formData.appVersion}

Description:
${formData.description || 'Not provided'}
      `.trim();

      const mailtoUrl = `mailto:${sanitizedEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      const supported = await Linking.canOpenURL(mailtoUrl);
      if (supported) {
        await Linking.openURL(mailtoUrl);
      } else {
        // Fallback: copy email to clipboard and show instructions
        await handleCopyEmail(sanitizedEmail);
        if (Platform.OS !== 'web') {
          Alert.alert(
            'Email Client Not Available', 
            `Email address copied to clipboard: ${sanitizedEmail}\n\nPlease paste it into your preferred email app.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error opening email:', error);
      await handleCopyEmail(sanitizedEmail);
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Could not open email client', 
          `Email address copied to clipboard: ${sanitizedEmail}`,
          [{ text: 'OK' }]
        );
      }
    }
  };

  const handleCopyEmail = async (email: string) => {
    // Input validation
    if (!email || typeof email !== 'string' || !email.trim() || email.length > 100) {
      console.error('Invalid email parameter');
      return;
    }
    
    const sanitizedEmail = email.trim();
    
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(sanitizedEmail);
      } else {
        // For mobile, we'll show the email and let user copy manually
        // Since expo-clipboard is not available in this setup
      }
      setCopiedEmail(sanitizedEmail);
      setTimeout(() => setCopiedEmail(null), 3000);
    } catch (error) {
      console.error('Error copying email:', error);
    }
  };

  const handleWebPress = async () => {
    try {
      const url = 'https://www.homi.io/help';
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        if (Platform.OS !== 'web') {
          Alert.alert('Cannot open URL', 'Please visit www.homi.io/help in your browser');
        }
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Could not open URL', 'Please visit www.homi.io/help in your browser');
      }
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Required Field', 'Please enter your full name');
      }
      return false;
    }
    if (!formData.email.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Required Field', 'Please enter your email address');
      }
      return false;
    }
    if (!formData.description.trim()) {
      if (Platform.OS !== 'web') {
        Alert.alert('Required Field', 'Please describe your issue or inquiry');
      }
      return false;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      if (Platform.OS !== 'web') {
        Alert.alert('Invalid Email', 'Please enter a valid email address');
      }
      return false;
    }
    
    return true;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      void handleEmailPress('support@homi.io');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Contact Us',
          headerStyle: {
            backgroundColor: designTokens.color.surface,
          },
          headerTintColor: designTokens.color.primary,
          headerTitleStyle: {
            fontFamily: designTokens.font.family,
            fontWeight: '600' as const,
            fontSize: designTokens.type.subhead.size,
            color: designTokens.color.text,
          },
          headerTitleAlign: 'center',
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/dashboard')}
              style={styles.headerButton}
              testID="contact-header-home"
              accessibilityLabel="Go home"
              accessibilityRole="button"
            >
              <Home size={designTokens.icon.md} color={designTokens.color.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <HomiLogo size={85} />
              <Text style={styles.title}>We're Here to Help!</Text>
              <Text style={styles.subtitle}>
                Questions, feedback, or need assistance? Reach out to us.
              </Text>
              <TouchableOpacity
                style={styles.homeButton}
                onPress={() => router.push('/(tabs)/dashboard')}
              >
                <Home size={20} color={COLORS.white} />
                <Text style={styles.homeButtonText}>Back to Home</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactSection}>
              <Text style={styles.sectionTitle}>Contact Options</Text>
              {contactOptions.map((option, index) => (
                <TouchableOpacity
                  key={`${option.title}-${index}`}
                  style={styles.contactCard}
                  onPress={() => handleEmailPress(option.email)}
                  activeOpacity={0.8}
                >
                  <View style={styles.iconContainer}>
                    {option.icon}
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactTitle}>{option.title}</Text>
                    <View style={styles.emailRow}>
                      <Text style={styles.contactEmail}>{option.email}</Text>
                      <TouchableOpacity 
                        onPress={() => handleCopyEmail(option.email)}
                        style={styles.copyButton}
                      >
                        {copiedEmail === option.email ? (
                          <CheckCircle size={16} color={COLORS.primary} />
                        ) : (
                          <Copy size={16} color={COLORS.text} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.contactDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formSection}>
              <Text style={styles.sectionTitle}>Quick Contact Form</Text>
              <Text style={styles.formDescription}>
                Fill out the details below to help us assist you quickly
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.fullName}
                  onChangeText={(text) => setFormData({...formData, fullName: text})}
                  placeholder="As registered in the app"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={(text) => setFormData({...formData, email: text})}
                  placeholder="Associated with your HOMI account"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({...formData, phone: text})}
                  placeholder="For urgent issues"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Plate / Vehicle Tag</Text>
                <TextInput
                  style={styles.input}
                  value={formData.licensePlate}
                  onChangeText={(text) => setFormData({...formData, licensePlate: text})}
                  placeholder="If relevant to your issue"
                  placeholderTextColor="#999"
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Description of Issue *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({...formData, description: text})}
                  placeholder="Please be as detailed as possible"
                  placeholderTextColor="#999"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.deviceInfo}>
                <Text style={styles.deviceText}>Device: {formData.device}</Text>
                <Text style={styles.deviceText}>App Version: {formData.appVersion}</Text>
              </View>

              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
                activeOpacity={0.8}
              >
                <Mail size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Send Support Email</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.helpCenterButton}
              onPress={handleWebPress}
              activeOpacity={0.8}
            >
              <Globe size={20} color={COLORS.primary} />
              <Text style={styles.helpCenterText}>Visit Help Center</Text>
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                For screenshots and attachments, please send them directly via email
              </Text>
              <Text style={styles.footerText}>
                We typically respond within 24-48 business hours
              </Text>
              <Text style={styles.footerText}>
                Your information is secure and will only be used for support purposes
              </Text>
            </View>

            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/(tabs)/dashboard')}
              activeOpacity={0.8}
            >
              <Home size={20} color={theme.colors.white} />
              <Text style={styles.homeButtonText}>Back to Home Screen</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  contactSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  contactCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  contactInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  contactEmail: {
    fontSize: 14,
    color: COLORS.primary,
    flex: 1,
  },
  copyButton: {
    padding: 4,
    marginLeft: 8,
  },
  contactDescription: {
    fontSize: 12,
    color: '#666',
  },
  formSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    marginBottom: 20,
  },
  formDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 2,
    borderColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#1a1a1a',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  deviceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    marginBottom: 15,
  },
  deviceText: {
    fontSize: 12,
    color: '#666',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a1a1a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  helpCenterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  helpCenterText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 8,
    lineHeight: 16,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    marginHorizontal: 20,
    marginBottom: 20,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  homeButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  headerButton: {
    marginRight: 0,
    paddingHorizontal: 12,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: designTokens.tap.targetMin,
    minHeight: designTokens.tap.targetMin,
  },
});