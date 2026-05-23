import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from '@mediapipe/tasks-vision'

class FaceLandmarkerService {
  private faceLandmarker: FaceLandmarker | null = null
  private isInitializing = false
  private lastVideoTime = -1

  async initialize(): Promise<void> {
    if (this.faceLandmarker || this.isInitializing) return
    this.isInitializing = true

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
      )

      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
        numFaces: 1,
      })
    } finally {
      this.isInitializing = false
    }
  }

  detect(video: HTMLVideoElement): FaceLandmarkerResult | null {
    if (!this.faceLandmarker || video.readyState < 2) return null

    const currentTime = video.currentTime
    if (currentTime === this.lastVideoTime) return null
    this.lastVideoTime = currentTime

    try {
      return this.faceLandmarker.detectForVideo(video, performance.now())
    } catch {
      return null
    }
  }

  isReady(): boolean {
    return this.faceLandmarker !== null
  }

  dispose(): void {
    this.faceLandmarker?.close()
    this.faceLandmarker = null
  }
}

export const faceLandmarkerService = new FaceLandmarkerService()
