import { useAppStore } from '../../stores/appStore'
import { VRMUpload } from './VRMUpload'

interface ControlPanelProps {
  onStartWebcam: () => void
  onStopWebcam: () => void
  onStartTracking: () => Promise<void>
  onStopTracking: () => void
}

export function ControlPanel({
  onStartWebcam,
  onStopWebcam,
  onStartTracking,
  onStopTracking,
}: ControlPanelProps) {
  const {
    isWebcamActive,
    isTrackingActive,
    showSkeleton,
    showWireframe,
    showWebcam,
    vrmName,
    toggleSkeleton,
    toggleWireframe,
    toggleWebcam,
    clearVRM,
  } = useAppStore()

  return (
    <div className="absolute top-0 right-0 h-full w-72 bg-gray-950/95 backdrop-blur border-l border-white/10 overflow-y-auto flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/10">
        <h1 className="text-white font-bold text-base tracking-wide">VRM Avatar Studio</h1>
        <p className="text-white/40 text-xs mt-0.5">Real-time motion capture</p>
      </div>

      <div className="flex-1 px-4 py-4 flex flex-col gap-5">
        {/* Avatar Section */}
        <section>
          <SectionTitle>Avatar</SectionTitle>
          <VRMUpload />
          {vrmName && (
            <button
              className="w-full mt-2 py-1.5 text-xs text-white/50 hover:text-white/80 border border-white/10 hover:border-white/20 rounded-lg transition-colors"
              onClick={clearVRM}
            >
              Remove Avatar
            </button>
          )}
        </section>

        {/* Webcam Section */}
        <section>
          <SectionTitle>Webcam</SectionTitle>
          <button
            className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              isWebcamActive
                ? 'bg-red-600/80 hover:bg-red-600 text-white'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white'
            }`}
            onClick={isWebcamActive ? onStopWebcam : onStartWebcam}
          >
            {isWebcamActive ? 'Stop Camera' : 'Start Camera'}
          </button>

          {isWebcamActive && (
            <button
              className={`w-full mt-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                isTrackingActive
                  ? 'bg-amber-600/80 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
              }`}
              onClick={isTrackingActive ? onStopTracking : onStartTracking}
            >
              {isTrackingActive ? 'Stop Tracking' : 'Start Tracking'}
            </button>
          )}

          {isTrackingActive && (
            <div className="mt-2 flex items-center gap-2 px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs">Tracking active</span>
            </div>
          )}
        </section>

        {/* Debug Section */}
        <section>
          <SectionTitle>Debug</SectionTitle>
          <div className="flex flex-col gap-1">
            <Toggle label="Skeleton Overlay" value={showSkeleton} onToggle={toggleSkeleton} />
            <Toggle label="Wireframe Mode" value={showWireframe} onToggle={toggleWireframe} />
            <Toggle label="Webcam Preview" value={showWebcam} onToggle={toggleWebcam} />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/10">
        <p className="text-white/20 text-xs text-center">Phases 1–6 MVP</p>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2.5">
      {children}
    </h2>
  )
}

function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string
  value: boolean
  onToggle: () => void
}) {
  return (
    <button
      className="flex items-center justify-between w-full py-2 px-3 rounded-lg hover:bg-white/5 transition-colors group"
      onClick={onToggle}
    >
      <span className="text-white/70 group-hover:text-white/90 text-sm transition-colors">
        {label}
      </span>
      <div
        className={`w-9 h-5 rounded-full transition-colors relative ${
          value ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}
