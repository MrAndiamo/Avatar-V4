import { create } from 'zustand'

export interface FaceTrackingData {
  headYaw: number
  headPitch: number
  headRoll: number
  blendshapes: Record<string, number>
}

interface AppState {
  // VRM file
  vrmUrl: string | null
  vrmName: string | null
  setVRMFile: (url: string, name: string) => void
  setVRMName: (name: string) => void
  clearVRM: () => void

  // Webcam
  isWebcamActive: boolean
  selectedDeviceId: string | null
  setWebcamActive: (active: boolean) => void
  setSelectedDevice: (deviceId: string | null) => void

  // Tracking
  isTrackingActive: boolean
  trackingData: FaceTrackingData | null
  setTrackingActive: (active: boolean) => void
  setTrackingData: (data: FaceTrackingData | null) => void

  // Debug
  showSkeleton: boolean
  showWireframe: boolean
  showWebcam: boolean
  toggleSkeleton: () => void
  toggleWireframe: () => void
  toggleWebcam: () => void
}

export const useAppStore = create<AppState>()((set) => ({
  // VRM
  vrmUrl: null,
  vrmName: null,
  setVRMFile: (url, name) => set({ vrmUrl: url, vrmName: name }),
  setVRMName: (name) => set({ vrmName: name }),
  clearVRM: () => set({ vrmUrl: null, vrmName: null }),

  // Webcam
  isWebcamActive: false,
  selectedDeviceId: null,
  setWebcamActive: (active) => set({ isWebcamActive: active }),
  setSelectedDevice: (deviceId) => set({ selectedDeviceId: deviceId }),

  // Tracking
  isTrackingActive: false,
  trackingData: null,
  setTrackingActive: (active) => set({ isTrackingActive: active }),
  setTrackingData: (data) => set({ trackingData: data }),

  // Debug
  showSkeleton: false,
  showWireframe: false,
  showWebcam: true,
  toggleSkeleton: () => set((s) => ({ showSkeleton: !s.showSkeleton })),
  toggleWireframe: () => set((s) => ({ showWireframe: !s.showWireframe })),
  toggleWebcam: () => set((s) => ({ showWebcam: !s.showWebcam })),
}))
