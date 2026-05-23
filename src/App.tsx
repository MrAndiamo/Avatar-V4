import { AvatarScene } from './components/avatar/AvatarScene'
import { ControlPanel } from './components/ui/ControlPanel'
import { WebcamPreview } from './components/webcam/WebcamPreview'
import { useWebcam } from './hooks/useWebcam'
import { useFaceTracking } from './hooks/useFaceTracking'
import { useAppStore } from './stores/appStore'

export function App() {
  const { videoRef, startWebcam, stopWebcam } = useWebcam()
  const { startTracking, stopTracking } = useFaceTracking(videoRef)
  const { showWebcam, isWebcamActive } = useAppStore()

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* 3D Canvas - leaves room for right panel */}
      <div className="absolute inset-0" style={{ right: '288px' }}>
        <AvatarScene />
      </div>

      {/* Webcam preview (always in DOM for tracking; CSS-toggled) */}
      <WebcamPreview videoRef={videoRef} isActive={isWebcamActive} isVisible={showWebcam} />

      {/* Control Panel */}
      <ControlPanel
        onStartWebcam={startWebcam}
        onStopWebcam={stopWebcam}
        onStartTracking={startTracking}
        onStopTracking={stopTracking}
      />
    </div>
  )
}
