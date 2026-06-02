import React, { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import Toast, { ToastType } from '@/components/Toast';

export const [ToastProvider, useToast] = createContextHook(() => {
  const [toast, setToast] = useState<{
    visible: boolean;
    message: string;
    type: ToastType;
    duration: number;
  }>({
    visible: false,
    message: '',
    type: 'success',
    duration: 3000,
  });

  const showToast = useCallback((message: string, type: ToastType = 'success', duration: number = 3000) => {
    setToast({
      visible: true,
      message,
      type,
      duration,
    });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }));
  }, []);

  return useMemo(() => ({
    showToast,
    toast,
    hideToast,
  }), [showToast, toast, hideToast]);
});

export function ToastContainer() {
  const { toast, hideToast } = useToast();
  
  return (
    <Toast
      visible={toast.visible}
      message={toast.message}
      type={toast.type}
      duration={toast.duration}
      onHide={hideToast}
    />
  );
}