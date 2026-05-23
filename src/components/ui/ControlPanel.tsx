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
    <div className="absolute top-4 right-4 w-64 bg-gray-950/85 backdrop-blur-md rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/10">
        <h1 className="text-white font-bold text-sm tracking-wide">VRM Avatar Studio</h1>
      </div>

      <div className="px-3 py-3 flex flex-col gap-3">
        {/* Avatar */}
        <section>
          <SectionTitle>Avatar</SectionTitle>
          <VRMUpload />
          {vrmName && (
            <button
              className="w-full mt-1.5 py-1 text-xs text-white/40 hover:text-white/70 border border-white/10 hover:border-white/20 rounded-lg transition-colors"
              onClick={clearVRM}
            >
              Remove
            </button>
          )}
        </section>

        {/* Camera */}
        <section>
          <SectionTitle>Camera</SectionTitle>
          <button
            className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
              isWebcamActive
                ? 'bg-red-600/80 hover:bg-red-600 text-white'
                : 'bg-blue-600/80 hover:bg-blue-600 text-white'
            }`}
            onClick={isWebcamActive ? onStopWebcam : onStartWebcam}
          >
            {isWebcamActive ? 'Stop Camera' : 'Start Camera'}
          </button>
          {isWebcamActive && (
            <div className="mt-1.5">
              <Toggle label="Show Background" value={showWebcam} onToggle={toggleWebcam} />
            </div>
          )}
        </section>

        {/* Tracking */}
        {isWebcamActive && (
          <section>
            <SectionTitle>Tracking</SectionTitle>
            <button
              className={`w-full py-2 rounded-lg text-sm font-semibold transition-colors ${
                isTrackingActive
                  ? 'bg-amber-600/80 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
              }`}
              onClick={isTrackingActive ? onStopTracking : onStartTracking}
            >
              {isTrackingActive ? 'Stop Tracking' : 'Start Tracking'}
            </button>
            {isTrackingActive && (
              <div className="mt-1.5 flex items-center gap-1.5 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-green-400 text-xs">Face + Body active</span>
              </div>
            )}
          </section>
        )}

        {/* Debug */}
        <section>
          <SectionTitle>Debug</SectionTitle>
          <Toggle label="Skeleton Overlay" value={showSkeleton} onToggle={toggleSkeleton} />
          <Toggle label="Wireframe" value={showWireframe} onToggle={toggleWireframe} />
        </section>
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-2">
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
      className="flex items-center justify-between w-full py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors group"
      onClick={onToggle}
    >
      <span className="text-white/70 group-hover:text-white/90 text-sm transition-colors">
        {label}
      </span>
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${
          value ? 'bg-blue-500' : 'bg-white/15'
        }`}
      >
        <div
          className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
            value ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  )
}
