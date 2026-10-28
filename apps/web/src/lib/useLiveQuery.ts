import { useCallback, useEffect, useState } from 'react'

interface LiveQueryState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface LiveQueryResult<T> extends LiveQueryState<T> {
  /** Re-runs the fetcher. Exists so a failed page can offer "Try again"
   *  instead of making the user reload the browser — a dead end for a
   *  reader who did nothing wrong and cannot fix the backend. */
  refetch: () => void
}

/** Minimal fetch-on-mount hook — no caching/refetch needed for these
 * point-in-time census pages, so a full data-fetching library would be
 * overkill. `deps` lets a page refetch when a filter (e.g. selected
 * district) changes.
 */
export function useLiveQuery<T>(fetcher: () => Promise<T>, deps: unknown[] = []): LiveQueryResult<T> {
  const [state, setState] = useState<LiveQueryState<T>>({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const refetch = useCallback(() => setAttempt((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ data: null, loading: false, error: err.message })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt])

  return { ...state, refetch }
}
