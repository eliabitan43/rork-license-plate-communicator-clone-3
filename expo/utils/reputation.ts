import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '@/utils/eventsStore';
import { Reputation, qk } from '@/types/events';
import { analytics } from './analytics';

const REPUTATION_STORAGE_KEY = 'user_reputation_v1';
const REPUTATION_DECAY_RATE = 0.05; // 5% per week
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Reputation scoring rules
export const REPUTATION_RULES = {
  ALERT_VALIDATED: 2,
  ALERT_OVERRULED: -3,
  HELPFUL_MESSAGE: 1,
  SPAM_REPORTED: -2,
  COMMUNITY_THANKS: 1,
  VERIFIED_SELLER: 5,
  WEEKLY_DECAY: -0.05, // 5% decay per week
} as const;

export interface ReputationAction {
  type: keyof typeof REPUTATION_RULES;
  reason: string;
  timestamp: number;
  relatedId?: string;
}

export interface UserReputationData extends Reputation {
  actions: ReputationAction[];
  weeklyStats: {
    alertsCreated: number;
    alertsConfirmed: number;
    messagesHelpful: number;
    thanksReceived: number;
  };
}

class ReputationManager {
  private currentUserId: string | null = null;

  async initialize(userId: string) {
    this.currentUserId = userId;
  }

  async getUserReputation(userId: string): Promise<UserReputationData> {
    try {
      const stored = await AsyncStorage.getItem(`${REPUTATION_STORAGE_KEY}_${userId}`);
      if (stored && stored !== 'undefined' && stored !== 'null') {
        const data = safeJsonParse(stored, null, `reputation_${userId}`) as UserReputationData | null;
        if (data) {
          // Apply decay if needed
          return this.applyDecay(data);
        } else {
          // Clear corrupted data
          await AsyncStorage.removeItem(`${REPUTATION_STORAGE_KEY}_${userId}`);
        }
      }
    } catch (error) {
      console.error('Failed to load reputation:', error);
    }

    // Return default reputation
    return {
      userId,
      score: 0,
      lastUpdated: Date.now(),
      actions: [],
      weeklyStats: {
        alertsCreated: 0,
        alertsConfirmed: 0,
        messagesHelpful: 0,
        thanksReceived: 0,
      },
    };
  }

  private applyDecay(data: UserReputationData): UserReputationData {
    const now = Date.now();
    const weeksSinceUpdate = (now - data.lastUpdated) / WEEK_MS;
    
    if (weeksSinceUpdate >= 1) {
      const decayFactor = Math.pow(1 - REPUTATION_DECAY_RATE, Math.floor(weeksSinceUpdate));
      const newScore = Math.max(0, data.score * decayFactor);
      
      if (newScore !== data.score) {
        console.log(`Reputation decay applied: ${data.score} -> ${newScore}`);
        analytics.trackReputationChange(data.userId, 'weekly_decay', data.score - newScore);
      }

      return {
        ...data,
        score: newScore,
        lastUpdated: now,
      };
    }

    return data;
  }

  async updateReputation(
    userId: string,
    actionType: keyof typeof REPUTATION_RULES,
    reason: string,
    relatedId?: string
  ): Promise<UserReputationData> {
    const current = await this.getUserReputation(userId);
    const delta = REPUTATION_RULES[actionType];
    
    const action: ReputationAction = {
      type: actionType,
      reason,
      timestamp: Date.now(),
      relatedId,
    };

    const updated: UserReputationData = {
      ...current,
      score: Math.max(0, current.score + delta), // Never go below 0
      lastUpdated: Date.now(),
      actions: [...current.actions.slice(-49), action], // Keep last 50 actions
    };

    // Update weekly stats
    switch (actionType) {
      case 'ALERT_VALIDATED':
        updated.weeklyStats.alertsConfirmed++;
        break;
      case 'HELPFUL_MESSAGE':
        updated.weeklyStats.messagesHelpful++;
        break;
      case 'COMMUNITY_THANKS':
        updated.weeklyStats.thanksReceived++;
        break;
    }

    try {
      await AsyncStorage.setItem(`${REPUTATION_STORAGE_KEY}_${userId}`, JSON.stringify(updated));
      analytics.trackReputationChange(userId, reason, delta);
      console.log(`Reputation updated for ${userId}: ${current.score} -> ${updated.score} (${reason})`);
    } catch (error) {
      console.error('Failed to save reputation:', error);
    }

    return updated;
  }

  getReputationLevel(score: number): {
    level: string;
    color: string;
    description: string;
    privileges: string[];
  } {
    if (score >= 20) {
      return {
        level: 'Trusted Guardian',
        color: '#FFD700',
        description: 'Highly trusted community member',
        privileges: ['Create high-priority alerts', 'Moderate reports', 'Access beta features'],
      };
    } else if (score >= 10) {
      return {
        level: 'Community Helper',
        color: '#00C48C',
        description: 'Reliable community contributor',
        privileges: ['Weighted confirmations', 'Priority support', 'Special badges'],
      };
    } else if (score >= 5) {
      return {
        level: 'Good Neighbor',
        color: '#0056FF',
        description: 'Positive community member',
        privileges: ['Create alerts', 'Send messages', 'Rate interactions'],
      };
    } else if (score >= 0) {
      return {
        level: 'New Member',
        color: '#95A5A6',
        description: 'Welcome to the community',
        privileges: ['Basic features', 'Send messages', 'View alerts'],
      };
    } else {
      return {
        level: 'Restricted',
        color: '#FF3B30',
        description: 'Limited access due to negative behavior',
        privileges: ['View only', 'Contact support'],
      };
    }
  }

  getConfirmationWeight(reputation: number): 1 | 2 {
    return reputation >= 6 ? 2 : 1;
  }
}

// Global reputation manager
export const reputationManager = new ReputationManager();

// React Query hooks
export function useUserReputation(userId: string) {
  return useQuery({
    queryKey: qk.reputation(userId),
    queryFn: () => reputationManager.getUserReputation(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateReputation() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      userId,
      actionType,
      reason,
      relatedId,
    }: {
      userId: string;
      actionType: keyof typeof REPUTATION_RULES;
      reason: string;
      relatedId?: string;
    }) => {
      return reputationManager.updateReputation(userId, actionType, reason, relatedId);
    },
    onSuccess: (data) => {
      // Invalidate and update the reputation query
      queryClient.setQueryData(qk.reputation(data.userId), data);
      queryClient.invalidateQueries({ queryKey: qk.reputation(data.userId) });
    },
  });
}

// Helper functions
export function canCreateHighPriorityAlerts(reputation: number): boolean {
  return reputation >= 20;
}

export function canModerateReports(reputation: number): boolean {
  return reputation >= 20;
}

export function hasWeightedConfirmations(reputation: number): boolean {
  return reputation >= 10;
}

// Initialize reputation system
export async function initializeReputation(userId: string) {
  await reputationManager.initialize(userId);
}