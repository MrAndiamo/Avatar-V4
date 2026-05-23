import { AvatarScene } from './components/avatar/AvatarScene'
import { ControlPanel } from './components/ui/ControlPanel'
import { useWebcam } from './hooks/useWebcam'
import { useFaceTracking } from './hooks/useFaceTracking'
import { useAppStore } from './stores/appStore'

export function App() {
  const { videoRef, startWebcam, stopWebcam } = useWebcam()
  const { startTracking, stopTracking } = useFaceTracking(videoRef)
  const isWebcamActive = useAppStore((s) => s.isWebcamActive)

  // AR mode is on whenever the webcam is active
  const arMode = isWebcamActive

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Layer 1: Webcam — fullscreen background, mirrored to match user expectation */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{
          transform: 'scaleX(-1)',
          opacity: isWebcamActive ? 1 : 0,
          transition: 'opacity 0.3s',
        }}
        autoPlay
        muted
        playsInline
      />

      {/* Layer 2: 3D canvas — transparent overlay in AR mode */}
      <div className="absolute inset-0">
        <AvatarScene arMode={arMode} />
      </div>

      {/* Layer 3: Floating UI */}
      <ControlPanel
        onStartWebcam={startWebcam}
        onStopWebcam={stopWebcam}
        onStartTracking={startTracking}
        onStopTracking={stopTracking}
      />
    </div>
  )
}
