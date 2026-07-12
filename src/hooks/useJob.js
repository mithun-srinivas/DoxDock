import { useState, useCallback, useRef } from 'react'

// Standardizes the run/progress/error/result lifecycle every operation shares.
// The worker/async function receives a `setProgress(0..1, message?)` callback.
const SLOW_THRESHOLD = 500 // ms before cancel button appears

export function useJob() {
  const [running, setRunning] = useState(false)
  const [slow, setSlow] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const runId = useRef(0)

  const run = useCallback(async (fn) => {
    const id = ++runId.current
    setRunning(true)
    setSlow(false)
    setError(null)
    setResult(null)
    setProgress({ value: null, message: 'Starting…' })

    const slowTimer = setTimeout(() => {
      if (runId.current === id) setSlow(true)
    }, SLOW_THRESHOLD)

    const onProgress = (value, message) => {
      if (runId.current === id) setProgress({ value, message })
    }
    try {
      const out = await fn(onProgress)
      if (runId.current === id) setResult(out)
      return out
    } catch (err) {
      if (runId.current === id) {
        console.error(err)
        setError(err?.message || String(err) || 'Something went wrong.')
      }
      return null
    } finally {
      clearTimeout(slowTimer)
      if (runId.current === id) {
        setRunning(false)
        setSlow(false)
        setProgress(null)
      }
    }
  }, [])

  const reset = useCallback(() => {
    runId.current++
    setRunning(false)
    setSlow(false)
    setProgress(null)
    setError(null)
    setResult(null)
  }, [])

  const cancel = reset

  return { running, slow, progress, error, result, run, reset, cancel, setError }
}
