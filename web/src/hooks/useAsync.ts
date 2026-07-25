import { type DependencyList, useEffect, useState } from 'react'

type AsyncState<T> = { status: 'loading' } | { status: 'success'; data: T } | { status: 'error' }

export function useAsync<T>(asyncFn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false

    const makeAsyncCall = async (): Promise<void> => {
      try {
        const data = await asyncFn()
        if (cancelled) return

        setState({ status: 'success', data })
      } catch {
        if (cancelled) return

        setState({ status: 'error' })
      }
    }

    void makeAsyncCall()

    return () => {
      cancelled = true
    }
    // biome-ignore lint/correctness/useExhaustiveDependencies: deps is the caller-controlled trigger list, not asyncFn's identity
  }, deps)

  return state
}
