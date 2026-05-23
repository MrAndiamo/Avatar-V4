import { useRef, useEffect, useCallback } from 'react'
import { useAppStore } from '../stores/appStore'
import { faceLandmarkerService } from '../systems/mediapipe/FaceLandmarkerService'
import { poseLandmarkerService } from '../systems/mediapipe/PoseLandmarkerService'
import { processTrackingResult } from '../systems/retargeting/faceRetargeter'
import { setPoseResult, clearPoseResult } from '../systems/retargeting/bodyRetargeter'

export function useFaceTracking(videoRef: React.RefObject<HTMLVideoElement>) {
  const rafRef = useRef<number>(0)
  const { isWebcamActive, isTrackingActive, setTrackingData, setTrackingActive } = useAppStore()

  const startTracking = useCallback(async () => {
    // Initialize both models in parallel
    await Promise.all([
      faceLandmarkerService.isReady() ? Promise.resolve() : faceLandmarkerService.initialize(),
      poseLandmarkerService.isReady() ? Promise.resolve() : poseLandmarkerService.initialize(),
    ])
    setTrackingActive(true)
  }, [setTrackingActive])

  const stopTracking = useCallback(() => {
    setTrackingActive(false)
    setTrackingData(null)
    clearPoseResult()
    cancelAnimationFrame(rafRef.current)
  }, [setTrackingActive, setTrackingData])

  useEffect(() => {
    if (!isTrackingActive || !isWebcamActive) {
      cancelAnimationFrame(rafRef.current)
      return
    }

    const loop = () => {
      const video = videoRef.current
      if (video) {
        // Face landmarks + blendshapes
        const faceResult = faceLandmarkerService.detect(video)
        if (faceResult) {
          const data = processTrackingResult(faceResult)
          setTrackingData(data)
        }

        // Body pose (stored in module-level cache, read by VRMAvatar.useFrame)
        const poseResult = poseLandmarkerService.detect(video)
        if (poseResult) {
          setPoseResult(poseResult)
        }
      }
      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [isTrackingActive, isWebcamActive, videoRef, setTrackingData])

  return { startTracking, stopTracking }
}
