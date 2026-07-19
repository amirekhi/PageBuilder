
import { useEffect, useState } from 'react'

const MIN_WIDTH = 768

export function useIsViewportTooNarrow() {
  const [tooNarrow, setTooNarrow] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MIN_WIDTH - 1}px)`)
    const update = () => setTooNarrow(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return tooNarrow
}