import { useRef, useCallback } from 'react'
import { useAppStore } from '../../stores/appStore'

export function VRMUpload() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { vrmName, setVRMFile } = useAppStore()

  const loadFile = useCallback(
    (file: File) => {
      if (!file.name.toLowerCase().endsWith('.vrm')) return
      const url = URL.createObjectURL(file)
      setVRMFile(url, file.name.replace(/\.vrm$/i, ''))
    },
    [setVRMFile]
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFile(file)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) loadFile(file)
  }

  return (
    <div
      className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400/50 hover:bg-white/5 transition-all"
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".vrm"
        className="hidden"
        onChange={handleChange}
      />
      {vrmName ? (
        <>
          <div className="text-green-400 text-sm font-medium truncate">{vrmName}</div>
          <div className="text-white/40 text-xs mt-0.5">Click to replace</div>
        </>
      ) : (
        <>
          <div className="text-3xl mb-2">🎭</div>
          <div className="text-white/80 text-sm font-medium">Drop .vrm file here</div>
          <div className="text-white/40 text-xs mt-1">or click to browse</div>
        </>
      )}
    </div>
  )
}
