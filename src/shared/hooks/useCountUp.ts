'use client'

import { useEffect, useRef, useState } from 'react'

export function useCountUp(end: number, duration = 1200, startOnMount = true) {
  const [value, setValue] = useState(0)
  const frameRef = useRef<number>()
  const startTimeRef = useRef<number>()
  const hasStarted = useRef(false)

  useEffect(() => {
    if (!startOnMount || hasStarted.current) return
    hasStarted.current = true

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * end))

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate)
      }
    }

    frameRef.current = requestAnimationFrame(animate)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [end, duration, startOnMount])

  return value
}
