import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useApi — Generic hook for API calls with loading, error, and abort.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useApi(() => fetchSubreddits(signal), []);
 *   const { data, loading, error } = useApi(
 *     (signal) => fetchSubmissions({ subreddit: 'python' }, signal),
 *     [subreddit]
 *   );
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const execute = useCallback(async () => {
    // Abort previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(controller.signal);
      if (!controller.signal.aborted) {
        setData(result);
        setLoading(false);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError(err);
        setLoading(false);
      }
    }
  }, deps);

  useEffect(() => {
    execute();
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

/**
 * useDebouncedValue — Debounce a changing value.
 */
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
