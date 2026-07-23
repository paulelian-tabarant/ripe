import { useEffect, useState } from 'react'

type AsyncState<T> = { kind: 'loading' } | { kind: 'success'; data: T } | { kind: 'error' }

export function useAsync<T>(asyncFn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ kind: 'loading' })

  // asyncFn must be a stable/memoized reference: this effect runs once on mount,
  // so an inline closure passed here would refetch on every render.
  useEffect(() => {
    let cancelled = false

    asyncFn()
      .then((data) => {
        if (!cancelled) {
          setState({ kind: 'success', data })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ kind: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [asyncFn])

  return state
}
