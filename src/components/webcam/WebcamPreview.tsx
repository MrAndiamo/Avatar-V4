interface WebcamPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>
  isActive: boolean
  isVisible: boolean
}

export function WebcamPreview({ videoRef, isActive, isVisible }: WebcamPreviewProps) {
  const visible = isVisible && isActive

  return (
    <div
      className={`absolute bottom-4 left-4 w-52 rounded-xl overflow-hidden border shadow-2xl bg-black transition-all duration-300 ${
        visible ? 'opacity-100 border-white/20' : 'opacity-0 pointer-events-none border-transparent'
      }`}
      style={{ aspectRatio: '16/9' }}
    >
      {/* Video always in DOM so ref stays valid for tracking */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
        autoPlay
        muted
        playsInline
      />
      {isActive && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-white text-xs font-semibold tracking-wide opacity-80">LIVE</span>
        </div>
      )}
    </div>
  )
}
