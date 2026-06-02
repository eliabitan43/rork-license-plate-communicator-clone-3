// Minimal inspector file to resolve import errors
import React from 'react';
import { View } from 'react-native';

// Placeholder components to satisfy imports
export default function DebuggingOverlay() {
  return <View />;
}

export function useSubscribeToDebuggingOverlayRegistry() {
  return null;
}

export interface InspectorData {
  // Placeholder interface
}