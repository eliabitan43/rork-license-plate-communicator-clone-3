import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeJsonParse } from '@/utils/eventsStore';

const STORAGE_KEYS = {
  USER_PROFILE: 'user_profile',
  MESSAGES: 'messages',
  RECENT_ACTIVITY: 'recent_activity',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  USER_RATINGS: 'user_ratings',
  DATA_VERSION: 'data_version',
};

const CURRENT_DATA_VERSION = '1.0.3';

export async function checkAndRecoverData(): Promise<boolean> {
  try {
    console.log('Checking data integrity...');
    
    // First, do an immediate check for the "o" character corruption
    const allKeys = await AsyncStorage.getAllKeys();
    let foundOCharacterCorruption = false;
    
    for (const key of allKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (data === 'o' || data === 'object' || data === 'undefined') {
          console.error(`Critical corruption found in ${key}: "${data}"`);
          foundOCharacterCorruption = true;
          break;
        }
      } catch (error) {
        console.error(`Error checking key ${key}:`, error);
      }
    }
    
    // If we found the "o" character corruption, immediately clear all data
    if (foundOCharacterCorruption) {
      console.error('Critical: "o" character corruption detected, clearing all storage immediately');
      await AsyncStorage.clear();
      await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
      return true;
    }
    
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<boolean>((_, reject) => {
      setTimeout(() => reject(new Error('Data recovery timeout')), 5000);
    });
    
    const recoveryPromise = (async () => {
      // Check data version
      const dataVersion = await AsyncStorage.getItem(STORAGE_KEYS.DATA_VERSION);
      
      if (dataVersion !== CURRENT_DATA_VERSION) {
        console.log('Data version mismatch, performing recovery...');
        
        // Check each key for corruption
        const keysToCheck = [
          STORAGE_KEYS.USER_PROFILE,
          STORAGE_KEYS.MESSAGES,
          STORAGE_KEYS.RECENT_ACTIVITY,
          STORAGE_KEYS.ONBOARDING_COMPLETE,
          STORAGE_KEYS.USER_RATINGS,
        ];
        
        for (const key of keysToCheck) {
          try {
            const data = await AsyncStorage.getItem(key);
            if (data) {
              // Check for common corruption patterns
              if (isCorrupted(data)) {
                console.warn(`Corrupted data found in ${key}, removing...`);
                await AsyncStorage.removeItem(key);
              } else {
                // Try to parse to verify it's valid JSON using safe parser
                const parsed = safeJsonParse(data, null, `data_recovery_${key}`);
                if (parsed === null) {
                  console.warn(`Invalid JSON in ${key}, removing...`);
                  // If safeJsonParse returns null, it means the data is corrupted
                  await AsyncStorage.removeItem(key);
                }
              }
            }
          } catch (error) {
            console.error(`Error checking ${key}:`, error);
            try {
              await AsyncStorage.removeItem(key);
            } catch {
              // Ignore removal errors
            }
          }
        }
        
        // Update data version
        await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
        console.log('Data recovery complete');
        return true;
      }
      
      console.log('Data integrity check passed');
      return false;
    })();
    
    return await Promise.race([recoveryPromise, timeoutPromise]);
  } catch (error) {
    console.error('Error in data recovery:', error);
    // In case of severe error, clear all data
    try {
      console.error('Critical error in data recovery, clearing all data');
      await AsyncStorage.clear();
      await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    } catch (clearError) {
      console.error('Failed to clear data:', clearError);
    }
    return true;
  }
}

function isCorrupted(data: string): boolean {
  const trimmed = data.trim();
  
  // Check for common corruption patterns including single 'o' character
  const corruptedPatterns = [
    'object', 'undefined', 'null', '[object Object]', 'NaN',
    'function', 'symbol', 'bigint', 'o', 'Object', 'Array', // Add more corruption patterns
    'Promise', 'Error', 'TypeError', 'SyntaxError', 'ReferenceError'
  ];
  
  if (corruptedPatterns.includes(trimmed)) {
    console.warn('Corruption pattern detected:', trimmed);
    return true;
  }
  
  // Special check for the "o" character issue that causes JSON parse errors
  if (trimmed === 'o') {
    console.error('Critical: Single "o" character corruption detected');
    return true;
  }
  
  // Check for single character corruption (common issue)
  if (trimmed.length === 1 && !/[\{\["\d\-tf]/.test(trimmed)) {
    console.warn('Single character corruption detected:', trimmed);
    return true;
  }
  
  // Check for incomplete JSON strings
  if (trimmed.length < 3 && !['{}', '[]', '""', 'true', 'false'].includes(trimmed) && isNaN(Number(trimmed))) {
    console.warn('Incomplete JSON string detected:', trimmed);
    return true;
  }
  
  // Check for non-JSON strings that might be corrupted
  if (!/^[\{\["\d\-tf]/.test(trimmed)) {
    console.warn('Non-JSON string detected:', trimmed.substring(0, 20));
    return true;
  }
  
  // Check for incomplete JSON
  if (trimmed.length > 0) {
    const firstChar = trimmed[0];
    const lastChar = trimmed[trimmed.length - 1];
    
    if ((firstChar === '{' && lastChar !== '}') ||
        (firstChar === '[' && lastChar !== ']') ||
        (firstChar === '"' && lastChar !== '"')) {
      console.warn('Incomplete JSON structure detected');
      return true;
    }
  }
  
  return false;
}

export async function clearAllAppData(): Promise<void> {
  try {
    await AsyncStorage.clear();
    await AsyncStorage.setItem(STORAGE_KEYS.DATA_VERSION, CURRENT_DATA_VERSION);
    console.log('All app data cleared successfully');
  } catch (error) {
    console.error('Error clearing app data:', error);
    throw error;
  }
}