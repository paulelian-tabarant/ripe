import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useAsync } from './useAsync'

describe('useAsync', () => {
  it('ignores a stale response from a superseded fetch', async () => {
    let resolveFirst: (value: string) => void = () => {}
    const firstFetch = (): Promise<string> => new Promise((resolve) => (resolveFirst = resolve))
    const secondFetch = (): Promise<string> => Promise.resolve('second')

    const { result, rerender } = renderHook(({ asyncFn }) => useAsync(asyncFn), {
      initialProps: { asyncFn: firstFetch },
    })

    rerender({ asyncFn: secondFetch })
    await vi.waitFor(() => expect(result.current).toEqual({ status: 'success', data: 'second' }))

    resolveFirst('first')
    // A plain microtask flush isn't enough: setState inside the resolved .then schedules a
    // React update that needs an extra scheduler tick to actually flush into `result.current`.
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(result.current).toEqual({ status: 'success', data: 'second' })
  })
})
