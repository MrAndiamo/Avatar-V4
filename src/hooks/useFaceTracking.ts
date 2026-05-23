import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { faceLandmarkerService } from '../systems/mediapipe/FaceLandmarkerService'
import { processTrackingResult } from '../systems/retargeting/faceRetargeter'

export function useFaceTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const rafRef = useRef<number>(0)
  const { isWebcamActive, isTrackingActive, setTrackingData, setTrackingActive } = useAppStore()

  const startTracking = useCallback(async () => {
    if (!faceLandmarkerService.isReady()) {
      await faceLandmarkerService.initialize()
    }
    setTrackingActive(true)
  }, [setTrackingActive])

  const stopTracking = useCallback(() => {
    setTrackingActive(false)
    setTrackingData(null)
    cancelAnimationFrame(rafRef.current)
  }, [setTrackingActive, setTrackingData])

  useEffect(() => {
    if (!isTrackingActive || !isWebcamActive) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const loop = () => {
      if (videoRef.current) {
        const result = faceLandmarkerService.detect(videoRef.current)
        if (result) {
          const data = processTrackingResult(result)
          setTrackingData(data)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isTrackingActive, isWebcamActive, videoRef, setTrackingData])

  return { startTracking, stopTracking }
}
