import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';

export interface CommunityPost {
  id: string;
  author: string;
  time: string;
  content: string;
  type: 'alert' | 'help' | 'info';
  likes: number;
  comments: number;
  community: string;
  hasLiked?: boolean;
  commentList?: Comment[];
  location?: string;
  source?: 'resident' | 'security' | 'admin';
  sourceName?: string;
  timestamp?: string;
  images?: string[];
  isRead?: boolean;
}

export interface Comment {
  id: string;
  author: string;
  text: string;
  time: string;
  message?: string;
  timestamp?: string;
  likes?: number;
  hasLiked?: boolean;
}

const STORAGE_KEY = 'community_posts';

function useCommunityPostsLogic() {
  const [posts, setPosts] = useState<CommunityPost[]>([
    { 
      id: 'f1', 
      type: 'alert', 
      source: 'resident', 
      sourceName: 'A. Patel', 
      author: 'A. Patel',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(), 
      time: '5m ago',
      content: 'Unknown person checking door handles near Lot C. Saw them around 8:30 PM, wearing dark hoodie. Already reported to security.',
      location: 'Parking Lot C, Building 3',
      likes: 12,
      hasLiked: false,
      comments: 2,
      community: 'Downtown Watch',
      commentList: [
        { id: 'c1', author: 'M. Johnson', text: 'Thanks for the heads up! I\'ll keep an eye out.', message: 'Thanks for the heads up! I\'ll keep an eye out.', time: '3m ago', timestamp: new Date(Date.now() - 3 * 60 * 1000).toISOString(), likes: 3, hasLiked: false },
        { id: 'c2', author: 'Security Team', text: 'We\'ve increased patrols in that area. Please report any further sightings.', message: 'We\'ve increased patrols in that area. Please report any further sightings.', time: '2m ago', timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(), likes: 8, hasLiked: false }
      ],
      isRead: false
    },
    { 
      id: 'f2', 
      type: 'info', 
      source: 'resident', 
      sourceName: 'L. Nguyen', 
      author: 'L. Nguyen',
      timestamp: new Date(Date.now() - 20 * 60 * 1000).toISOString(), 
      time: '20m ago',
      content: 'Tip: Mark your bike and register the serial for faster recovery. I use a UV pen to mark mine in hidden spots. Also, take photos of your bike from multiple angles.',
      location: 'Bike Storage Area',
      likes: 24,
      hasLiked: true,
      comments: 2,
      community: 'Neighborhood Alert',
      commentList: [
        { id: 'c3', author: 'R. Davis', text: 'Great tip! Where did you get the UV pen?', message: 'Great tip! Where did you get the UV pen?', time: '15m ago', timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), likes: 2, hasLiked: false },
        { id: 'c4', author: 'L. Nguyen', text: 'Got it from the hardware store for $3. Works great!', message: 'Got it from the hardware store for $3. Works great!', time: '10m ago', timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(), likes: 5, hasLiked: true }
      ],
      isRead: true
    },
    { 
      id: 'f3', 
      type: 'alert', 
      source: 'security', 
      sourceName: 'Building Security', 
      author: 'Building Security',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(), 
      time: '1h ago',
      content: 'Lobby camera maintenance from 2-3 PM today. Temporary blind spot near south entrance. Extra security personnel will be stationed during this time.',
      location: 'Main Lobby & South Entrance',
      likes: 8,
      hasLiked: false,
      comments: 1,
      community: 'Campus Safety',
      commentList: [
        { id: 'c5', author: 'T. Wilson', text: 'Thanks for the notice!', message: 'Thanks for the notice!', time: '45m ago', timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(), likes: 1, hasLiked: false }
      ],
      isRead: true
    }
  ]);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPosts(parsed);
        }
      }
    } catch (error) {
      console.error('Error loading community posts:', error);
    }
  };

  const savePosts = async (newPosts: CommunityPost[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newPosts));
      setPosts(newPosts);
    } catch (error) {
      console.error('Error saving community posts:', error);
    }
  };

  const createPost = useCallback(async (post: Omit<CommunityPost, 'id' | 'time' | 'timestamp'>) => {
    const newPost: CommunityPost = {
      ...post,
      id: Date.now().toString(),
      time: 'Just now',
      timestamp: new Date().toISOString(),
      hasLiked: false,
      commentList: [],
      isRead: false
    };
    
    const updatedPosts = [newPost, ...posts];
    await savePosts(updatedPosts);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }, [posts]);

  const likePost = useCallback(async (postId: string) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        const hasLiked = post.hasLiked || false;
        return {
          ...post,
          hasLiked: !hasLiked,
          likes: hasLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    });
    
    await savePosts(updatedPosts);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }, [posts]);

  const addComment = useCallback(async (postId: string, comment: Omit<Comment, 'id' | 'time' | 'timestamp'>) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      ...comment,
      text: comment.text || comment.message || '',
      message: comment.text || comment.message || '',
      time: 'Just now',
      timestamp: new Date().toISOString(),
      likes: 0,
      hasLiked: false
    };
    
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          comments: post.comments + 1,
          commentList: [...(post.commentList || []), newComment]
        };
      }
      return post;
    });
    
    await savePosts(updatedPosts);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }, [posts]);

  const markPostAsRead = useCallback(async (postId: string) => {
    const updatedPosts = posts.map(post => 
      post.id === postId ? { ...post, isRead: true } : post
    );
    await savePosts(updatedPosts);
  }, [posts]);

  const likeComment = useCallback(async (postId: string, commentId: string) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId && post.commentList) {
        const updatedComments = post.commentList.map(comment => {
          if (comment.id === commentId) {
            const hasLiked = comment.hasLiked || false;
            return {
              ...comment,
              hasLiked: !hasLiked,
              likes: hasLiked ? (comment.likes || 1) - 1 : (comment.likes || 0) + 1
            };
          }
          return comment;
        });
        return {
          ...post,
          commentList: updatedComments
        };
      }
      return post;
    });
    
    await savePosts(updatedPosts);
    
    if (Platform.OS !== 'web') {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        console.log('Haptics not available:', error);
      }
    }
  }, [posts]);

  const unreadCount = posts.filter(p => !p.isRead).length;

  return {
    posts,
    createPost,
    likePost,
    addComment,
    markPostAsRead,
    likeComment,
    unreadCount
  };
}

export const [CommunityPostsProvider, useCommunityPosts] = createContextHook(useCommunityPostsLogic);
