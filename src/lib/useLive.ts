import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { subscribeToCommunities } from './api';

/**
 * While this screen is on top, calls onChange (at most about twice a
 * second) whenever anyone in these communities logs something.
 * Stops listening when you leave the screen, to save battery.
 */
export function useCommunityLive(communityIds: string[], onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  const key = communityIds.join(',');

  useFocusEffect(
    useCallback(() => {
      if (!key) return undefined;
      let timer: ReturnType<typeof setTimeout> | null = null;
      const stop = subscribeToCommunities(key.split(','), () => {
        if (timer) return;
        timer = setTimeout(() => {
          timer = null;
          cb.current();
        }, 500);
      });
      return () => {
        if (timer) clearTimeout(timer);
        stop();
      };
    }, [key]),
  );
}
