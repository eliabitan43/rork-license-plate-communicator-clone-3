import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
  Modal,
  Switch,
} from 'react-native';
import {
  Shield,
  AlertTriangle,
  Phone,
  Truck,
  MapPin,
  ChevronRight,
  Users, Heart,
  Bell,
  Lock,
  Edit3,
  Save,
  X,
  Home,
  Camera,
  Upload,
  Mail,
  MessageSquare,
  Plus,
  Video,
  FileText,
} from 'lucide-react-native';
import { router, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/constants/theme';
import { useAppStore } from '@/hooks/useAppStore';
import { useCommunityPosts } from '@/hooks/useCommunityPosts';
import { ReportSheet } from '@/components/ReportSheet';
import { EventType, IncidentReport, IncidentType } from '@/types/events';
import * as ImagePicker from 'expo-image-picker';

interface LocalEmergencyContact {
  id: string;
  name: string;
  number: string;
  type: 'police' | 'security' | 'tow' | 'custom';
  icon: string;
}

interface Community {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  isJoined: boolean;
  icon: string;
  color: string;
}

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
  method: 'push' | 'email' | 'sms';
}

interface EvidenceItem {
  id: string;
  type: 'photo' | 'video' | 'document';
  uri: string;
  timestamp: string;
  description?: string;
}

interface SafetyFeature {
  id: string;
  title: string;
  description: string;
  icon: any;
  color: string;
  action: () => void;
  badge?: string;
}

export default function SafetyCenterScreen() {
  const [locationSharing, setLocationSharing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingContact, setEditingContact] = useState<LocalEmergencyContact | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [emergencyContacts, setEmergencyContacts] = useState<LocalEmergencyContact[]>([]);
  const [personalContacts, setPersonalContacts] = useState<LocalEmergencyContact[]>([]);
  const [communities, setCommunities] = useState<Community[]>([
    { id: '1', name: 'Downtown Watch', description: 'Downtown area safety network', memberCount: 342, isJoined: false, icon: 'Building', color: '#3498DB' },
    { id: '2', name: 'Campus Safety', description: 'University campus community', memberCount: 1250, isJoined: true, icon: 'School', color: '#9B59B6' },
    { id: '3', name: 'Neighborhood Alert', description: 'Local neighborhood watch', memberCount: 89, isJoined: false, icon: 'Home', color: '#2ECC71' },
  ]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSetting[]>([
    { id: '1', title: 'Safety Alerts', description: 'Critical safety notifications', enabled: true, method: 'push' },
    { id: '2', title: 'Community Updates', description: 'Updates from your communities', enabled: true, method: 'email' },
    { id: '3', title: 'Emergency Broadcasts', description: 'Emergency situation alerts', enabled: true, method: 'sms' },
    { id: '4', title: 'Incident Reports', description: 'New incident reports in your area', enabled: false, method: 'push' },
  ]);
  const [evidenceLocker, setEvidenceLocker] = useState<EvidenceItem[]>([]);
  const [communityModalVisible, setCommunityModalVisible] = useState(false);
  const [communityReportVisible, setCommunityReportVisible] = useState<boolean>(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [evidenceModalVisible, setEvidenceModalVisible] = useState(false);
  const [_witnessMode, _setWitnessMode] = useState(false);
  const { posts, createPost, likePost, addComment, unreadCount: _unreadCount, markPostAsRead } = useCommunityPosts();
  const [newCommunityName, setNewCommunityName] = useState('');
  const [newCommunityDescription, setNewCommunityDescription] = useState('');
  const [communityPostText, setCommunityPostText] = useState<string>('');
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('2');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [notificationPhone, setNotificationPhone] = useState('');
  const { userProfile, updateEmergencyContact, addEmergencyContact: _addEmergencyContact } = useAppStore();

  // Initialize emergency contacts on mount
  React.useEffect(() => {
    const institutionalContacts: LocalEmergencyContact[] = [
      { id: 'inst-1', name: 'Police', number: '911', type: 'police', icon: 'Phone' },
      { id: 'inst-2', name: 'Building Security', number: '555-0100', type: 'security', icon: 'Shield' },
      { id: 'inst-3', name: 'Towing Company', number: '555-0200', type: 'tow', icon: 'Truck' },
    ];

    setEmergencyContacts(institutionalContacts);

    if (userProfile?.emergencyContacts?.length) {
      setPersonalContacts(userProfile.emergencyContacts.map(contact => ({
        id: contact.id,
        name: contact.name,
        number: contact.phone,
        type: 'custom' as const,
        icon: 'Phone'
      })));
    }
  }, [userProfile]);

  const handleEmergencyCall = (contact: LocalEmergencyContact) => {
    if (Platform.OS === 'web') {
      Alert.alert('Call', `Would call ${contact.name} at ${contact.number}`);
    } else {
      Alert.alert(
        'Call ' + contact.name,
        `Are you sure you want to call ${contact.number}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Call', onPress: () => console.log('Calling', contact.number) },
        ]
      );
    }
  };

  const handleEditContact = (contact: LocalEmergencyContact) => {
    if (contact.type !== 'custom') {
      Alert.alert('Cannot Edit', 'Institutional contacts cannot be edited. You can only edit personal emergency contacts.');
      return;
    }
    setEditingContact(contact);
    setEditName(contact.name);
    setEditNumber(contact.number);
    setEditModalVisible(true);
  };

  const handleSaveContact = async () => {
    if (!editName.trim() || !editNumber.trim()) {
      Alert.alert('Error', 'Please fill in both name and number');
      return;
    }

    if (editingContact) {
      // Update local state
      const updatedContacts = personalContacts.map(contact => 
        contact.id === editingContact.id 
          ? { ...contact, name: editName.trim(), number: editNumber.trim() }
          : contact
      );
      setPersonalContacts(updatedContacts);
      
      // Update in store
      await updateEmergencyContact(editingContact.id, {
        name: editName.trim(),
        phone: editNumber.trim(),
      });
    }

    setEditModalVisible(false);
    setEditingContact(null);
    setEditName('');
    setEditNumber('');
  };

  const handleCancelEdit = () => {
    setEditModalVisible(false);
    setEditingContact(null);
    setEditName('');
    setEditNumber('');
  };

  const getCommunityAuthor = (): string => {
    if (!userProfile || userProfile.isAnonymous) return 'Guest';
    return userProfile.displayName?.trim() || userProfile.email?.split('@')[0] || 'Community Member';
  };

  const getSelectedCommunityName = (): string => {
    return communities.find(community => community.id === selectedCommunityId)?.name ?? 'Community Watch';
  };

  const formatIncidentLabel = (incidentType: IncidentType): string => {
    return incidentType
      .split('_')
      .map(segment => segment ? segment[0].toUpperCase() + segment.slice(1) : segment)
      .join(' ');
  };

  const handleReportIncident = () => {
    setCommunityModalVisible(false);
    setCommunityReportVisible(true);
  };

  const handleCommunityPost = async () => {
    const trimmedPost = communityPostText.trim();
    if (!trimmedPost) {
      Alert.alert('Add a comment', 'Please write a community comment before posting.');
      return;
    }

    await createPost({
      author: getCommunityAuthor(),
      source: 'resident',
      sourceName: getCommunityAuthor(),
      content: trimmedPost,
      type: 'info',
      likes: 0,
      comments: 0,
      community: getSelectedCommunityName(),
      location: 'Community Watch',
    });

    setCommunityPostText('');
    Alert.alert('Posted', 'Your community comment has been shared.');
  };

  const handleCommunityIncidentPosted = async (report: IncidentReport) => {
    await createPost({
      author: getCommunityAuthor(),
      source: 'resident',
      sourceName: getCommunityAuthor(),
      content: `Incident report: ${formatIncidentLabel(report.incidentType)} near ${report.location.address ?? 'your community'}. ${report.note ?? ''}`.trim(),
      type: 'alert',
      likes: 0,
      comments: 0,
      community: getSelectedCommunityName(),
      location: report.location.address ?? 'Community Watch',
    });
  };

  const handleCommunityReportEvent = (_type: EventType) => {
    setCommunityReportVisible(false);
  };

  const handleJoinCommunity = (communityId: string) => {
    setCommunities(communities.map(c => 
      c.id === communityId ? { ...c, isJoined: !c.isJoined } : c
    ));
  };

  const handleCreateCommunity = () => {
    if (!newCommunityName.trim()) {
      Alert.alert('Error', 'Please enter a community name');
      return;
    }

    const newCommunity: Community = {
      id: Date.now().toString(),
      name: newCommunityName,
      description: newCommunityDescription || 'New community',
      memberCount: 1,
      isJoined: true,
      icon: 'Users',
      color: '#E74C3C',
    };

    setCommunities([...communities, newCommunity]);
    setSelectedCommunityId(newCommunity.id);
    setCommunityModalVisible(false);
    setNewCommunityName('');
    setNewCommunityDescription('');
    Alert.alert('Success', 'Community created successfully!');
  };

  const handleToggleNotification = (settingId: string) => {
    setNotificationSettings(notificationSettings.map(setting =>
      setting.id === settingId ? { ...setting, enabled: !setting.enabled } : setting
    ));
  };

  const handleSaveNotificationSettings = () => {
    Alert.alert('Success', 'Notification settings saved');
    setNotificationModalVisible(false);
  };

  const handleUploadEvidence = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    });

    if (!result.canceled && result.assets[0]) {
      const newEvidence: EvidenceItem = {
        id: Date.now().toString(),
        type: 'photo',
        uri: result.assets[0].uri,
        timestamp: new Date().toISOString(),
        description: 'Evidence photo',
      };
      setEvidenceLocker([...evidenceLocker, newEvidence]);
      Alert.alert('Success', 'Evidence uploaded to locker');
    }
  };

  const handleWitnessMode = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Mobile Feature', 'Witness mode works best on mobile devices');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is required for witness mode');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      const newEvidence: EvidenceItem = {
        id: Date.now().toString(),
        type: 'video',
        uri: result.assets[0].uri,
        timestamp: new Date().toISOString(),
        description: 'Witness recording',
      };
      setEvidenceLocker([...evidenceLocker, newEvidence]);
      Alert.alert('Recording Saved', 'Video has been saved to your evidence locker');
    }
  };

  const allEmergencyContacts: LocalEmergencyContact[] = [...emergencyContacts, ...personalContacts];

  const getContactAccentColor = (type: LocalEmergencyContact['type']): string => {
    switch (type) {
      case 'police':
        return '#FF334E';
      case 'security':
        return '#1B6EF3';
      case 'tow':
        return '#FF9F1C';
      case 'custom':
        return '#00C896';
      default:
        return theme.colors.primary;
    }
  };

  const getContactSubtitle = (type: LocalEmergencyContact['type']): string => {
    switch (type) {
      case 'police':
        return 'Emergency dispatch';
      case 'security':
        return 'On-site response';
      case 'tow':
        return 'Roadside assist';
      case 'custom':
        return 'Trusted contact';
      default:
        return 'Tap to call';
    }
  };

  const renderContactIcon = (contact: LocalEmergencyContact) => {
    const color = getContactAccentColor(contact.type);

    if (contact.type === 'police') {
      return <AlertTriangle size={24} color={color} strokeWidth={2.6} />;
    }

    if (contact.type === 'security') {
      return <Shield size={24} color={color} strokeWidth={2.6} />;
    }

    if (contact.type === 'tow') {
      return <Truck size={24} color={color} strokeWidth={2.6} />;
    }

    return <Heart size={24} color={color} strokeWidth={2.6} />;
  };

  const safetyFeatures: SafetyFeature[] = [
    {
      id: '1',
      title: 'Community Watch',
      description: 'Report incidents or post updates for your neighborhood group',
      icon: Users,
      color: '#3498DB',
      action: () => setCommunityModalVisible(true),
      badge: 'REPORT',
    },
    {
      id: '2',
      title: 'Safety Alerts',
      description: 'Configure notification preferences',
      icon: Bell,
      color: '#FFA502',
      action: () => setNotificationModalVisible(true),
    },
    {
      id: '3',
      title: 'Evidence Locker',
      description: 'Store and share photos and evidence securely',
      icon: Lock,
      color: '#00D68F',
      action: () => setEvidenceModalVisible(true),
    },
    {
      id: '4',
      title: 'Witness Mode',
      description: 'Quick record and report incidents',
      icon: Video,
      color: '#8E2DE2',
      action: handleWitnessMode,
    },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: 'COMMUNITY SAFETY CENTER',
          headerStyle: {
            backgroundColor: theme.colors.matteBlack,
          },
          headerTintColor: theme.colors.white,
        }}
      />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/(tabs)/dashboard')}
            testID="safety-header-home"
          >
            <Home size={20} color={theme.colors.white} />
            <Text style={styles.homeButtonText}>Back to Home</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.headerBadge}>
              <Shield size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.headerTitle}>COMMUNITY SAFETY CENTER</Text>
            <Text style={styles.headerSubtitle}>Shielded communities, real-time support</Text>
          </View>
        </View>

        <View style={styles.emergencySection}>
          <View style={styles.emergencySectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>EMERGENCY CONTACTS</Text>
              <Text style={styles.sectionSubtitle}>Fast-access help cards</Text>
            </View>
            <View style={styles.emergencyCountPill}>
              <Text style={styles.emergencyCountText}>{allEmergencyContacts.length}</Text>
            </View>
          </View>

          <View style={styles.contactsGrid}>
            {allEmergencyContacts.map((contact) => {
              const accentColor = getContactAccentColor(contact.type);
              const isEditable = contact.type === 'custom';

              const gradientColors = [`${accentColor}1F`, '#FFFFFF'] as const;

              return (
                <View key={contact.id} style={styles.contactCardWrapper}>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={[styles.contactCard, { borderColor: `${accentColor}35` }]}
                    onPress={() => handleEmergencyCall(contact)}
                  >
                    <LinearGradient
                      colors={gradientColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.contactCardGradient}
                    >
                      <View style={styles.contactTopRow}>
                        <View style={[styles.contactIcon, { backgroundColor: `${accentColor}18`, borderColor: `${accentColor}32` }]}> 
                          {renderContactIcon(contact)}
                        </View>
                        <View style={[styles.contactTypePill, { backgroundColor: `${accentColor}16` }]}>
                          <Text style={[styles.contactTypeText, { color: accentColor }]}>
                            {isEditable ? 'SAVED' : 'OFFICIAL'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.contactName} numberOfLines={2}>{contact.name}</Text>
                      <Text style={styles.contactSubtitle}>{getContactSubtitle(contact.type)}</Text>

                      <View style={styles.contactCallRow}>
                        <Phone size={15} color={accentColor} strokeWidth={2.5} />
                        <Text style={[styles.contactNumber, { color: accentColor }]}>{contact.number}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>

                  {isEditable && (
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditContact(contact)}
                      activeOpacity={0.8}
                    >
                      <Edit3 size={15} color={theme.colors.primary} strokeWidth={2.5} />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.locationSection}>
          <TouchableOpacity
            style={styles.locationCard}
            onPress={() => setLocationSharing(!locationSharing)}
          >
            <View style={styles.locationContent}>
              <MapPin size={24} color={theme.colors.primary} />
              <View style={styles.locationText}>
                <Text style={styles.locationTitle}>Location Sharing</Text>
                <Text style={styles.locationStatus}>
                  {locationSharing ? 'Active - Sharing with trusted contacts' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={[
              styles.locationToggle,
              locationSharing && styles.locationToggleActive
            ]}>
              <Text style={styles.toggleText}>
                {locationSharing ? 'ON' : 'OFF'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>SAFETY FEATURES</Text>
          {safetyFeatures.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={[styles.featureCard, { backgroundColor: `${feature.color}15` }]}
              onPress={feature.action}
            >
              <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                <feature.icon size={20} color={feature.color} />
              </View>
              <View style={styles.featureContent}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  {feature.badge && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{feature.badge}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
              <ChevronRight size={20} color={theme.colors.gray} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.communitySection}>
          <Text style={styles.sectionTitle}>COMMUNITY FEED</Text>
          <View style={{ gap: theme.spacing.sm }}>
            {posts.map((post) => (
              <TouchableOpacity
                key={post.id}
                style={styles.communityPost}
                activeOpacity={0.8}
                onPress={() => markPostAsRead(post.id)}
              >
                <View style={styles.postHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <View style={styles.postAvatar}><Users size={16} color={theme.colors.primary} /></View>
                    <View>
                      <Text style={styles.postAuthor}>{post.author}</Text>
                      <Text style={styles.postMeta}>{post.time} • {post.community}</Text>
                    </View>
                  </View>
                  <View style={[styles.postTypePill, { backgroundColor: post.type === 'alert' ? theme.colors.warning + '20' : post.type === 'help' ? theme.colors.success + '20' : theme.colors.info + '20' }]}>
                    <Text style={[styles.postTypePillText, { color: post.type === 'alert' ? theme.colors.warning : post.type === 'help' ? theme.colors.success : theme.colors.info }]}>{post.type}</Text>
                  </View>
                </View>
                <Text style={styles.postContent} numberOfLines={3}>{post.content}</Text>
                <View style={styles.postFooterRow}>
                  <TouchableOpacity style={styles.postAction} onPress={() => likePost(post.id)}>
                    <Heart size={16} color={post.hasLiked ? theme.colors.danger : theme.colors.gray} fill={post.hasLiked ? theme.colors.danger : 'none'} />
                    <Text style={[styles.postActionText, post.hasLiked && { color: theme.colors.danger }]}>{post.likes}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.postAction} onPress={() => addComment(post.id, { author: 'You', text: 'Thanks for sharing!', message: 'Thanks for sharing!' })}>
                    <MessageSquare size={16} color={theme.colors.gray} />
                    <Text style={styles.postActionText}>{post.comments}</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
            {posts.length === 0 && (
              <View style={styles.emptyState}> 
                <Shield size={48} color={theme.colors.lightGray} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyDescription}>Open Community Watch to post a comment or file an incident report.</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.policySection}>
          <Text style={styles.policyTitle}>Community Code of Conduct</Text>
          <View style={styles.policyCard}>
            <Text style={styles.policyText}>✓ Help, don’t harass</Text>
            <Text style={styles.policyText}>✓ Assume good intent</Text>
            <Text style={styles.policyText}>✓ Escalate safely</Text>
            <Text style={styles.policyText}>✓ No doxxing or vigilantism</Text>
            <Text style={styles.policyText}>✓ Respect privacy</Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Contact Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelEdit}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Emergency Contact</Text>
              <TouchableOpacity onPress={handleCancelEdit}>
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Contact Name</Text>
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter contact name"
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.textInput}
                value={editNumber}
                onChangeText={setEditNumber}
                placeholder="Enter phone number"
                placeholderTextColor={theme.colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveContact}
              >
                <Save size={20} color={theme.colors.white} />
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Community Modal */}
      <Modal
        visible={communityModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCommunityModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Community Watch</Text>
              <TouchableOpacity onPress={() => setCommunityModalVisible(false)}>
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.watchActionPanel}>
                <Text style={styles.watchActionTitle}>Share with {getSelectedCommunityName()}</Text>
                <Text style={styles.watchActionDescription}>
                  File an incident report for your community, or post a regular update for neighbors to discuss.
                </Text>
                <TouchableOpacity style={styles.reportIncidentButton} onPress={handleReportIncident}>
                  <AlertTriangle size={20} color={theme.colors.white} />
                  <Text style={styles.reportIncidentButtonText}>Report Incident</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.composerCard}>
                <View style={styles.composerTitleRow}>
                  <MessageSquare size={18} color={theme.colors.primary} />
                  <Text style={styles.modalSectionTitle}>Post a Comment</Text>
                </View>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={communityPostText}
                  onChangeText={setCommunityPostText}
                  placeholder="Share a safety update, question, or neighbor note..."
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={4}
                />
                <TouchableOpacity style={styles.createButton} onPress={handleCommunityPost}>
                  <Plus size={20} color={theme.colors.white} />
                  <Text style={styles.createButtonText}>Post Comment</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.modalSectionTitle}>Choose Community</Text>
              <Text style={styles.communitySelectorHint}>Reports and comments will post to the selected community.</Text>
              {communities.map((community) => (
                <TouchableOpacity
                  key={community.id}
                  style={[styles.communityCard, selectedCommunityId === community.id && styles.selectedCommunityCard]}
                  activeOpacity={0.85}
                  onPress={() => setSelectedCommunityId(community.id)}
                >
                  <View style={[styles.communityIcon, { backgroundColor: community.color + '20' }]}> 
                    <Users size={24} color={community.color} />
                  </View>
                  <View style={styles.communityInfo}>
                    <Text style={styles.communityName}>{community.name}</Text>
                    <Text style={styles.communityDescription}>{community.description}</Text>
                    <Text style={styles.communityMembers}>{community.memberCount} members</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinButton, community.isJoined && styles.joinedButton]}
                    onPress={() => handleJoinCommunity(community.id)}
                  >
                    <Text style={[styles.joinButtonText, community.isJoined && styles.joinedButtonText]}>
                      {community.isJoined ? 'Joined' : 'Join'}
                    </Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              
              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Create New Community</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Community Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={newCommunityName}
                  onChangeText={setNewCommunityName}
                  placeholder="Enter community name"
                  placeholderTextColor={theme.colors.textSecondary}
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={newCommunityDescription}
                  onChangeText={setNewCommunityDescription}
                  placeholder="Enter community description"
                  placeholderTextColor={theme.colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleCreateCommunity}
              >
                <Plus size={20} color={theme.colors.white} />
                <Text style={styles.createButtonText}>Create Community</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Notification Settings Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification Settings</Text>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionTitle}>Alert Preferences</Text>
              {notificationSettings.map((setting) => (
                <View key={setting.id} style={styles.notificationCard}>
                  <View style={styles.notificationInfo}>
                    <Text style={styles.notificationTitle}>{setting.title}</Text>
                    <Text style={styles.notificationDescription}>{setting.description}</Text>
                    <View style={styles.notificationMethod}>
                      {setting.method === 'push' && <Bell size={16} color={theme.colors.primary} />}
                      {setting.method === 'email' && <Mail size={16} color={theme.colors.primary} />}
                      {setting.method === 'sms' && <MessageSquare size={16} color={theme.colors.primary} />}
                      <Text style={styles.methodText}>
                        {setting.method === 'push' ? 'Push Notification' : 
                         setting.method === 'email' ? 'Email' : 'SMS'}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={setting.enabled}
                    onValueChange={() => handleToggleNotification(setting.id)}
                    trackColor={{ false: theme.colors.gray, true: theme.colors.primary }}
                    thumbColor={theme.colors.white}
                  />
                </View>
              ))}
              
              <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>Contact Methods</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  value={notificationEmail}
                  onChangeText={setNotificationEmail}
                  placeholder="Enter email address"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="email-address"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.textInput}
                  value={notificationPhone}
                  onChangeText={setNotificationPhone}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              
              <TouchableOpacity
                style={styles.createButton}
                onPress={handleSaveNotificationSettings}
              >
                <Save size={20} color={theme.colors.white} />
                <Text style={styles.createButtonText}>Save Settings</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Evidence Locker Modal */}
      <Modal
        visible={evidenceModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEvidenceModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.largeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Evidence Locker</Text>
              <TouchableOpacity onPress={() => setEvidenceModalVisible(false)}>
                <X size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadEvidence}
              >
                <Upload size={20} color={theme.colors.white} />
                <Text style={styles.uploadButtonText}>Upload Evidence</Text>
              </TouchableOpacity>
              
              {evidenceLocker.length === 0 ? (
                <View style={styles.emptyState}>
                  <Lock size={48} color={theme.colors.lightGray} />
                  <Text style={styles.emptyTitle}>No Evidence Stored</Text>
                  <Text style={styles.emptyDescription}>
                    Upload photos, videos, or documents to store them securely
                  </Text>
                </View>
              ) : (
                <View style={styles.evidenceGrid}>
                  {evidenceLocker.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.evidenceItem}>
                      <View style={styles.evidencePreview}>
                        {item.type === 'photo' && <Camera size={24} color={theme.colors.primary} />}
                        {item.type === 'video' && <Video size={24} color={theme.colors.primary} />}
                        {item.type === 'document' && <FileText size={24} color={theme.colors.primary} />}
                      </View>
                      <Text style={styles.evidenceDate}>
                        {new Date(item.timestamp).toLocaleDateString()}
                      </Text>
                      <Text style={styles.evidenceType}>{item.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <ReportSheet
        visible={communityReportVisible}
        initialStep="select_incident"
        onClose={() => setCommunityReportVisible(false)}
        onSelect={handleCommunityReportEvent}
        onIncidentSent={handleCommunityIncidentPosted}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingVertical: Math.round(theme.spacing.xl * 0.75),
    paddingHorizontal: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    alignItems: 'center',
    gap: Math.round(theme.spacing.xs * 0.5),
  },
  headerBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: theme.colors.matteBlack,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: theme.spacing.sm,
  },
  headerSubtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    letterSpacing: 0.75,
    textTransform: 'uppercase' as const,
    textAlign: 'center',
  },
  emergencySection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: Math.round(theme.spacing.lg * 0.75),
  },
  emergencySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700' as const,
    color: theme.colors.textSecondary,
    letterSpacing: 1,
    marginBottom: theme.spacing.md,
  },
  sectionSubtitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
    letterSpacing: 0.3,
    marginTop: -theme.spacing.sm,
  },
  emergencyCountPill: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.matteBlack,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  emergencyCountText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.sm,
    fontWeight: '900' as const,
  },
  contactsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  contactCardWrapper: {
    width: '47.8%',
    position: 'relative',
  },
  contactCard: {
    minHeight: 168,
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#07111F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 6,
    borderWidth: 1.5,
  },
  contactCardGradient: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  contactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTypePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  contactTypeText: {
    fontSize: 9,
    fontWeight: '900' as const,
    letterSpacing: 0.7,
  },
  contactName: {
    fontSize: theme.fontSize.md,
    fontWeight: '900' as const,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: theme.spacing.xs,
  },
  contactSubtitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: '600' as const,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  contactCallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  contactNumber: {
    fontSize: theme.fontSize.sm,
    fontWeight: '900' as const,
    letterSpacing: 0.2,
  },
  locationSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  locationCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  locationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: theme.spacing.md,
  },
  locationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  locationStatus: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  locationToggle: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.gray + '20',
  },
  locationToggleActive: {
    backgroundColor: theme.colors.success + '20',
  },
  toggleText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
    minHeight: 64,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  featureContent: {
    flex: 1,
  },
  featureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  featureTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: '700' as const,
    color: theme.colors.textPrimary,
  },
  featureDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#FF4757',
    paddingHorizontal: theme.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  communitySection: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  watchActionPanel: {
    backgroundColor: theme.colors.matteBlack,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  watchActionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '800' as const,
    color: theme.colors.white,
    marginBottom: theme.spacing.xs,
  },
  watchActionDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.lightGray,
    lineHeight: 20,
    marginBottom: theme.spacing.md,
  },
  reportIncidentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF4757',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  reportIncidentButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '800' as const,
    color: theme.colors.white,
    letterSpacing: 0.4,
  },
  composerCard: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  composerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  communitySelectorHint: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: -theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  selectedCommunityCard: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: theme.colors.primary + '08',
  },
  communityPost: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  postAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  postAuthor: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  postMeta: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  postTypePill: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  postTypePillText: {
    fontSize: theme.fontSize.xs,
    fontWeight: '700' as const,
  },
  postContent: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  postFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.lg,
  },
  postAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postActionText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    fontWeight: '600' as const,
  },

  policySection: {
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  policyTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  policyCard: {
    backgroundColor: theme.colors.primary + '10',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + '20',
  },
  policyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
    lineHeight: 20,
  },
  editButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 31,
    height: 31,
    borderRadius: 15.5,
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  modalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 400,
    borderWidth: 3,
    borderColor: theme.colors.matteBlack,
  },
  largeModalContent: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderWidth: 3,
    borderColor: theme.colors.matteBlack,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
  },
  modalSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  inputContainer: {
    marginBottom: theme.spacing.md,
  },
  inputLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  textInput: {
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.white,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
  },
  cancelButton: {
    backgroundColor: theme.colors.lightGray,
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  saveButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.white,
  },
  homeButton: {
    position: 'absolute',
    right: theme.spacing.lg,
    top: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    gap: theme.spacing.xs,
    borderWidth: 2,
    borderColor: theme.colors.matteBlack,
  },
  homeButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.white,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  communityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  communityDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  communityMembers: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    marginTop: 4,
  },
  joinButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary,
  },
  joinedButton: {
    backgroundColor: theme.colors.success,
  },
  joinButtonText: {
    fontSize: theme.fontSize.sm,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  joinedButtonText: {
    color: theme.colors.white,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  createButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.textPrimary,
  },
  notificationDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  notificationMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  methodText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.xs,
  },
  uploadButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: '600' as const,
    color: theme.colors.white,
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
  evidenceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  evidenceItem: {
    width: '47%',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  evidencePreview: {
    width: 60,
    height: 60,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  evidenceDate: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  evidenceType: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textPrimary,
    marginTop: 2,
  },
});