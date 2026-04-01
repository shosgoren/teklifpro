'use client';

import { useEffect, useRef } from 'react';

/**
 * Invisible component that tracks how long a customer views a proposal.
 * Sends duration to the server every 30 seconds while the tab is visible.
 */
export function ViewTracker({ token }: { token: string }) {
  const startRef = useRef(Date.now());
  const sentRef = useRef(0);

  useEffect(() => {
    const flush = () => {
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const toSend = elapsed - sentRef.current;
      if (toSend < 5) return; // Don't send less than 5 seconds

      sentRef.current = elapsed;

      // Use sendBeacon for reliability on page unload
      const body = JSON.stringify({ token, duration: toSend });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/v1/proposals/track', body);
      } else {
        fetch('/api/v1/proposals/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {});
      }
    };

    // Periodic flush every 30 seconds
    const interval = setInterval(flush, 30000);

    // Flush on visibility change and page unload
    const handleVisibility = () => {
      if (document.hidden) flush();
      else startRef.current = Date.now() - sentRef.current * 1000;
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', flush);

    return () => {
      flush();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', flush);
    };
  }, [token]);

  return null;
}
