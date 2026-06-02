import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Linking, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Shield, Heart, Bell, Info, UserCheck, AlertOctagon, ExternalLink } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '@/constants/theme';

interface GuidelineItem {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: 'heart' | 'alert' | 'info' | 'bell' | 'shield' | 'user' | 'ban';
}

const items: GuidelineItem[] = [
  { id: 'respect', title: 'Respect Others', description: 'Treat everyone with courtesy and kindness. No harassment, hate speech, or personal attacks.', color: '#2563EB', icon: 'heart' },
  { id: 'safety', title: 'Keep It Safe', description: 'Share safety information that protects the community. No false alarms, hoaxes, or harmful content.', color: '#DC2626', icon: 'shield' },
  { id: 'relevant', title: 'Stay Relevant & Helpful', description: 'Post useful updates (traffic, incidents, tips). No spam, ads, or irrelevant promotions.', color: '#D97706', icon: 'info' },
  { id: 'privacy', title: 'Protect Privacy', description: 'Don’t share personal info (addresses, phone numbers). Respect private property in photos/videos.', color: '#059669', icon: 'user' },
  { id: 'report', title: 'Report Responsibly', description: 'Use “Report Incident” only for real concerns. Urgent emergencies → contact authorities directly.', color: '#7C3AED', icon: 'bell' },
  { id: 'trust', title: 'Build Trust', description: 'Share honest, accurate information. Avoid exaggerated or fear-driven posts.', color: '#0EA5E9', icon: 'heart' },
  { id: 'zero', title: 'Zero Tolerance Violations', description: 'Harassment, threats, or criminal activity can lead to suspension or ban. Misusing reporting tools may lead to restrictions.', color: '#F97316', icon: 'ban' },
];

function IconByName({ name, color }: { name: GuidelineItem['icon']; color: string }) {
  switch (name) {
    case 'heart':
      return <Heart color={color} size={22} />;
    case 'alert':
      return <AlertOctagon color={color} size={22} />;
    case 'info':
      return <Info color={color} size={22} />;
    case 'bell':
      return <Bell color={color} size={22} />;
    case 'shield':
      return <Shield color={color} size={22} />;
    case 'user':
      return <UserCheck color={color} size={22} />;
    case 'ban':
      return <AlertOctagon color={color} size={22} />;
    default:
      return <Info color={color} size={22} />;
  }
}

export default function CommunityGuidelines() {
  const router = useRouter();
  const [agree, setAgree] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onOpen = useCallback(async (url: string) => {
    try {
      if (Platform.OS === 'web') {
        window.open(url, '_blank');
        return;
      }
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
    } catch (e: any) {
      console.log('Failed to open URL', e?.message ?? e);
      Alert.alert('Unable to open link');
    }
  }, []);

  const footerLinks = useMemo(() => [
    { key: 'terms', label: 'Terms & Conditions', url: 'https://rork.com/terms' },
    { key: 'privacy', label: 'Privacy Policy', url: 'https://rork.com/privacy' },
    { key: 'code', label: 'Community Code of Conduct', url: 'https://rork.com/code' },
  ], []);

  const handleAgree = useCallback(async () => {
    if (saving) return;
    if (!agree) {
      setError('Please agree to the terms to continue.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await AsyncStorage.setItem('community_guidelines_accepted', JSON.stringify(true));
      try {
        router.back();
      } catch {
        router.replace('/(tabs)/dashboard');
      }
    } catch (e: any) {
      setError('Failed to save your agreement. Please try again.');
      console.log('Save agree error', e?.message ?? e);
    } finally {
      setSaving(false);
    }
  }, [agree, saving, router]);

  return (
    <View style={styles.container} testID="community-guidelines-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Shield color={theme.colors.primary} size={28} />
          <Text style={styles.title} accessibilityRole="header">Community Guidelines</Text>
          <Text style={styles.subtitle}>Help keep everyone safe, informed, and respected.</Text>
        </View>

        {items.map((it) => (
          <View key={it.id} style={styles.card} testID={`guideline-${it.id}`}>
            <View style={[styles.badge, { backgroundColor: `${it.color}14` }]}> 
              <IconByName name={it.icon} color={it.color} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{it.title}</Text>
              <Text style={styles.cardDesc}>{it.description}</Text>
            </View>
          </View>
        ))}

        <View style={styles.checkboxRow}>
          <TouchableOpacity
            onPress={() => setAgree(!agree)}
            activeOpacity={0.8}
            style={[styles.checkbox, agree && styles.checkboxOn]}
            testID="agree-checkbox"
            accessibilityRole="checkbox"
            accessibilityState={{ checked: agree }}
          >
            {agree ? <CheckCircle2 color={theme.colors.white} size={18} /> : <View style={styles.checkboxDot} />}
          </TouchableOpacity>
          <Text style={styles.checkboxLabel}>
            I have read and agree to the terms and conditions, privacy policy and Community Code of Conduct.
          </Text>
        </View>

        <View style={styles.links}>
          {footerLinks.map((l) => (
            <TouchableOpacity key={l.key} style={styles.linkItem} onPress={() => onOpen(l.url)} testID={`link-${l.key}`}>
              <ExternalLink color={theme.colors.primary} size={18} />
              <Text style={styles.linkText}>{l.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {error ? (
          <View style={styles.errorBox} testID="agree-error">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          onPress={handleAgree}
          activeOpacity={0.9}
          style={styles.cta}
          testID="agree-submit"
          accessibilityRole="button"
        >
          <Text style={styles.ctaText}>{saving ? 'Saving…' : 'I Agree'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxl },
  header: { alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  title: { fontSize: theme.fontSize.xl, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: theme.fontSize.md, color: theme.colors.textSecondary },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, marginTop: theme.spacing.lg },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.white,
  },
  checkboxOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  checkboxDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary },
  checkboxLabel: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fontSize.md },

  links: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, marginTop: theme.spacing.md },
  linkItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linkText: { color: theme.colors.primary, fontSize: theme.fontSize.md, textDecorationLine: 'underline' },

  errorBox: { backgroundColor: '#FEE2E2', borderRadius: theme.borderRadius.md, padding: theme.spacing.md, marginTop: theme.spacing.md },
  errorText: { color: theme.colors.danger, fontSize: theme.fontSize.md },

  cta: {
    height: 52,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: theme.spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  ctaText: { color: theme.colors.white, fontSize: theme.fontSize.lg, fontWeight: '700' },
});
