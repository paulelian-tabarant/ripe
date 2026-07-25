import { useEffect, useState } from 'react'

type AsyncState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error' }

export function useAsync<T>(asyncFn: () => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  // asyncFn must be a stable/memoized reference: this effect runs once on mount,
  // so an inline closure passed here would refetch on every render.
  useEffect(() => {
    let cancelled = false

    asyncFn()
      .then((data) => {
        if (!cancelled) {
          setState({ status: 'success', data })
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error' })
        }
      })

    return () => {
      cancelled = true
    }
  }, [asyncFn])

  return state
}
