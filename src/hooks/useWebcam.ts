import { useRef, useCallback, useEffect, useState } from 'react'
import { useAppStore } from '../stores/appStore'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { selectedDeviceId, setWebcamActive } = useAppStore()
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])

  useEffect(() => {
    navigator.mediaDevices
      .enumerateDevices()
      .then((all) => setDevices(all.filter((d) => d.kind === 'videoinput')))
      .catch(console.error)
  }, [])

  const startWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
      })
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setWebcamActive(true)
    } catch (err) {
      console.error('Webcam error:', err)
    }
  }, [selectedDeviceId, setWebcamActive])

  const stopWebcam = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setWebcamActive(false)
  }, [setWebcamActive])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return { videoRef, devices, startWebcam, stopWebcam }
}
