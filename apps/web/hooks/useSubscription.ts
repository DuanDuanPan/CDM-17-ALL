/**
 * Story 4.4: Watch & Subscription
 * useSubscription Hook - Manage subscription state for a node
 *
 * Provides:
 * - isSubscribed: Current subscription status
 * - subscribe: Subscribe to a node
 * - unsubscribe: Unsubscribe from a node
 * - isLoading: Loading state during operations
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { addSubscription, removeSubscription } from '@/lib/subscriptionStore';
import type {
  CheckSubscriptionResponse,
  Subscription,
  SubscriptionListResponse,
} from '@cdm/types';

// API base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

export interface UseSubscriptionOptions {
  nodeId: string | null;
  userId: string;
}

export interface UseSubscriptionReturn {
  isSubscribed: boolean;
  isLoading: boolean;
  error: Error | null;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  subscriptionId?: string;
  refresh: () => Promise<void>;
}

/**
 * Hook to manage subscription state for a single node
 */
export function useSubscription({
  nodeId,
  userId,
}: UseSubscriptionOptions): UseSubscriptionReturn {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionId, setSubscriptionId] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track current nodeId to handle stale responses
  const currentNodeIdRef = useRef<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Fetch subscription status
  const checkSubscription = useCallback(async () => {
    if (!nodeId) {
      if (isMounted.current) {
        setIsSubscribed(false);
        setSubscriptionId(undefined);
      }
      return;
    }

    currentNodeIdRef.current = nodeId;
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/subscriptions/check?nodeId=${nodeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to check subscription status');
      }

      const data: CheckSubscriptionResponse = await response.json();

      // Only update if this is still the current nodeId
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsSubscribed(data.isSubscribed);
        setSubscriptionId(data.subscriptionId);
      }
    } catch (err) {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setError(err as Error);
        console.error('[useSubscription] Check error:', err);
      }
    } finally {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsLoading(false);
      }
    }
  }, [nodeId, userId]);

  // Subscribe to the node (AC#1: User can subscribe via context menu)
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!nodeId) return false;

    currentNodeIdRef.current = nodeId;
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ nodeId }),
      });

      if (!response.ok) {
        throw new Error('Failed to subscribe');
      }

      const result = await response.json();

      // Update state
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsSubscribed(true);
        setSubscriptionId(result.subscription?.id);
      }

      // Sync to global store for immediate UI feedback across all nodes
      addSubscription(nodeId);

      return true;
    } catch (err) {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setError(err as Error);
      }
      console.error('[useSubscription] Subscribe error:', err);
      return false;
    } finally {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsLoading(false);
      }
    }
  }, [nodeId, userId]);

  // Unsubscribe from the node (AC#3: User can unsubscribe)
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!nodeId) return false;

    currentNodeIdRef.current = nodeId;
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/subscriptions?nodeId=${nodeId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to unsubscribe');
      }

      // Update state
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsSubscribed(false);
        setSubscriptionId(undefined);
      }

      // Sync to global store for immediate UI feedback across all nodes
      removeSubscription(nodeId);

      return true;
    } catch (err) {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setError(err as Error);
      }
      console.error('[useSubscription] Unsubscribe error:', err);
      return false;
    } finally {
      if (isMounted.current && currentNodeIdRef.current === nodeId) {
        setIsLoading(false);
      }
    }
  }, [nodeId, userId]);

  // Refresh subscription status
  const refresh = useCallback(async () => {
    await checkSubscription();
  }, [checkSubscription]);

  // Check subscription status when nodeId changes
  useEffect(() => {
    if (nodeId) {
      checkSubscription();
    } else {
      setIsSubscribed(false);
      setSubscriptionId(undefined);
      setError(null);
    }
  }, [nodeId, checkSubscription]);

  return {
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    subscriptionId,
    refresh,
  };
}

/**
 * Hook to get all subscriptions for a user
 */
export interface UseSubscriptionListReturn {
  subscriptions: Subscription[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useSubscriptionList(userId: string): UseSubscriptionListReturn {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    if (isMounted.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/subscriptions`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }

      const data: SubscriptionListResponse = await response.json();
      if (isMounted.current) {
        setSubscriptions(data.subscriptions);
      }
    } catch (err) {
      if (isMounted.current) {
        setError(err as Error);
      }
      console.error('[useSubscriptionList] Fetch error:', err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    await fetchSubscriptions();
  }, [fetchSubscriptions]);

  // Fetch on mount
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  return {
    subscriptions,
    isLoading,
    error,
    refresh,
  };
}
