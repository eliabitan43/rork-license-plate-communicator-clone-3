import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";

// Create a safe superjson transformer that handles corruption
const safeSuperjson = {
  serialize: (data: any) => {
    try {
      return superjson.serialize(data);
    } catch (error) {
      console.error('Superjson serialize error:', error);
      return { json: data, meta: undefined };
    }
  },
  deserialize: (data: any) => {
    try {
      // Check for corrupted data before deserializing
      if (typeof data === 'string' && (data === 'o' || data === 'object' || data === 'undefined')) {
        console.error('Corrupted superjson data detected:', data);
        return null;
      }
      return superjson.deserialize(data);
    } catch (error) {
      console.error('Superjson deserialize error:', error);
      return data?.json || data;
    }
  },
  stringify: (data: any) => {
    try {
      return superjson.stringify(data);
    } catch (error) {
      console.error('Superjson stringify error:', error);
      return JSON.stringify(data);
    }
  },
  parse: (data: string) => {
    try {
      // Check for corrupted data patterns
      if (data === 'o' || data === 'object' || data === 'undefined' || data === 'null' || data === '[object Object]') {
        console.error('Corrupted superjson string detected:', data);
        throw new Error('Corrupted data detected');
      }
      return superjson.parse(data);
    } catch (error) {
      console.error('Superjson parse error:', error);
      // Try regular JSON parse as fallback
      try {
        return JSON.parse(data);
      } catch {
        throw error;
      }
    }
  },
};

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  // For development, use the current host
  if (typeof window !== 'undefined') {
    // Web environment - use current origin
    return window.location.origin;
  }
  
  // For mobile development, use the Rork development server
  if (process.env.EXPO_PUBLIC_RORK_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  }
  
  // Try to detect the current development server URL from the bundle URL
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    // In development, try to use the current development server
    const devUrl = "https://fpalntr3egyjh33wsmwjp.rork.live";
    console.log('Using development server URL:', devUrl);
    return devUrl;
  }
  
  // Fallback to the current Rork development URL
  return "https://fpalntr3egyjh33wsmwjp.rork.live";
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: safeSuperjson,
      fetch: async (url, options) => {
        try {
          // Validate URL input
          if (!url || typeof url !== 'string') {
            throw new Error('Invalid URL provided');
          }
          
          const response = await fetch(url, options);
          
          // Additional protection against JSON parse errors
          if (response.ok) {
            try {
              const text = await response.clone().text();
              // Check for corrupted response data
              if (text === 'o' || text === 'object' || text === 'undefined' || text === 'null' || text === '[object Object]') {
                console.error('Corrupted response detected:', text);
                return new Response(JSON.stringify({ error: 'Corrupted response' }), {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
                });
              }
            } catch (textError) {
              console.warn('Could not read response text:', textError);
            }
          }
          
          return response;
        } catch (error) {
          console.warn('tRPC request failed:', error);
          // Return a mock response for development
          return new Response(JSON.stringify({ error: 'Connection failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    }),
  ],
});