import {
  PoseLandmarker,
  FilesetResolver,
  type PoseLandmarkerResult,
} from '@mediapipe/tasks-vision'

class PoseLandmarkerService {
  private poseLandmarker: PoseLandmarker | null = null
  private isInitializing = false
  private lastVideoTime = -1

  async initialize(): Promise<void> {
    if (this.poseLandmarker || this.isInitializing) return
    this.isInitializing = true

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
      )

      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        outputSegmentationMasks: false,
      })
    } finally {
      this.isInitializing = false
    }
  }

  detect(video: HTMLVideoElement): PoseLandmarkerResult | null {
    if (!this.poseLandmarker || video.readyState < 2) return null

    const currentTime = video.currentTime
    if (currentTime === this.lastVideoTime) return null
    this.lastVideoTime = currentTime

    try {
      return this.poseLandmarker.detectForVideo(video, performance.now())
    } catch {
      return null
    }
  }

  isReady(): boolean {
    return this.poseLandmarker !== null
  }

  dispose(): void {
    this.poseLandmarker?.close()
    this.poseLandmarker = null
  }
}

export const poseLandmarkerService = new PoseLandmarkerService()
