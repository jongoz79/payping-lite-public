import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { addCaptureListener } from '@/native/capture';

const refreshListeners = new Set<() => void>();

export function notifyCapturesChanged(): void {
  refreshListeners.forEach((refresh) => refresh());
}

export function useCaptureRefresh(onRefresh: () => void): void {
  const refresh = useRef(onRefresh);

  useEffect(() => {
    refresh.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const run = () => refresh.current();
    refreshListeners.add(run);
    run();
    const removeCaptureListener = addCaptureListener(run);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });

    return () => {
      refreshListeners.delete(run);
      removeCaptureListener();
      appState.remove();
    };
  }, []);
}
