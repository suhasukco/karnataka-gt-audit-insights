import { useEffect, useState } from 'react'

/** Reactive media query. Used to decide WebGL vs the flat renderer, so a
 *  viewport change or an OS motion-preference change swaps the field rather
 *  than leaving a canvas that no longer suits the device. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])

  return matches
}
