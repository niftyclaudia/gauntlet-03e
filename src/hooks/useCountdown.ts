/**
 * Custom hook for countdown timers
 * 
 * Provides a countdown value that decreases from a given duration
 * and automatically resets when the duration changes.
 */

import { useState, useEffect, useRef } from 'react';

export interface UseCountdownResult {
  /** Current countdown value in seconds */
  countdown: number;
  /** Whether the countdown is active */
  isActive: boolean;
}

export function useCountdown(duration: number, isActive: boolean): UseCountdownResult {
  const [countdown, setCountdown] = useState(duration);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isActive && duration > 0) {
      setCountdown(duration);
      
      intervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(0);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [duration, isActive]);

  return {
    countdown,
    isActive: isActive && countdown > 0,
  };
}
