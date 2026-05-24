import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'
import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision'
import type { FaceTrackingData } from '../../stores/appStore'

const LERP_FACTOR = 0.25

const smoothed: FaceTrackingData = {
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  blendshapes: {},
}

// MediaPipe ARKit blendshape name → VRM 1.0 expression name
const BLENDSHAPE_MAP: Record<string, string> = {
  eyeBlinkLeft: 'blinkLeft',
  eyeBlinkRight: 'blinkRight',
  jawOpen: 'aa',
  mouthSmileLeft: 'happy',
  mouthSmileRight: 'happy',
  browInnerUp: 'surprised',
  mouthFunnel: 'ou',
  mouthPucker: 'ou',
  eyeWideLeft: 'lookUp',
  eyeWideRight: 'lookUp',
}

const BLENDSHAPE_MULTIPLIERS: Record<string, number> = {
  blinkLeft: 1.3,
  blinkRight: 1.3,
  aa: 1.2,
  happy: 0.8,
  surprised: 1.0,
  ou: 1.2,
}

// Dead-zone: MediaPipe always returns small non-zero scores for relaxed faces.
// Any raw score below this is treated as zero so the mouth stays closed at rest.
const BLENDSHAPE_THRESHOLD: Record<string, number> = {
  aa: 0.18,
  ou: 0.15,
  happy: 0.12,
  surprised: 0.15,
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function processTrackingResult(result: FaceLandmarkerResult): FaceTrackingData | null {
  if (!result.faceLandmarks?.length) return null

  let headYaw = 0
  let headPitch = 0
  let headRoll = 0

  if (result.facialTransformationMatrixes?.length) {
    const matrix = new THREE.Matrix4()
    matrix.fromArray(result.facialTransformationMatrixes[0].data)
    const euler = new THREE.Euler()
    euler.setFromRotationMatrix(matrix, 'XYZ')

    headPitch = euler.x
    headYaw = -euler.y
    headRoll = euler.z
  }

  // Aggregate blendshapes per VRM expression
  const rawBlendshapes: Record<string, number> = {}
  if (result.faceBlendshapes?.length) {
    for (const cat of result.faceBlendshapes[0].categories) {
      const vrmName = BLENDSHAPE_MAP[cat.categoryName]
      if (!vrmName) continue
      const threshold = BLENDSHAPE_THRESHOLD[vrmName] ?? 0
      const score = cat.score < threshold ? 0 : cat.score - threshold
      // Take max when multiple MP blendshapes map to same VRM expression
      rawBlendshapes[vrmName] = Math.max(rawBlendshapes[vrmName] ?? 0, score)
    }
  }

  smoothed.headYaw = lerp(smoothed.headYaw, headYaw, LERP_FACTOR)
  smoothed.headPitch = lerp(smoothed.headPitch, headPitch, LERP_FACTOR)
  smoothed.headRoll = lerp(smoothed.headRoll, headRoll, LERP_FACTOR)

  for (const [vrmName, score] of Object.entries(rawBlendshapes)) {
    const current = smoothed.blendshapes[vrmName] ?? 0
    smoothed.blendshapes[vrmName] = lerp(current, score, LERP_FACTOR)
  }

  return {
    headYaw: smoothed.headYaw,
    headPitch: smoothed.headPitch,
    headRoll: smoothed.headRoll,
    blendshapes: { ...smoothed.blendshapes },
  }
}

export function applyTrackingToVRM(vrm: VRM, data: FaceTrackingData): void {
  const headBone = vrm.humanoid.getNormalizedBoneNode('head')
  const neckBone = vrm.humanoid.getNormalizedBoneNode('neck')

  if (headBone) {
    headBone.quaternion.setFromEuler(
      new THREE.Euler(
        data.headPitch * 0.4,
        data.headYaw * 0.5,
        data.headRoll * 0.25,
        'XYZ'
      )
    )
  }

  if (neckBone) {
    neckBone.quaternion.setFromEuler(
      new THREE.Euler(
        data.headPitch * 0.15,
        data.headYaw * 0.2,
        data.headRoll * 0.1,
        'XYZ'
      )
    )
  }

  if (vrm.expressionManager) {
    for (const [vrmName, value] of Object.entries(data.blendshapes)) {
      const multiplier = BLENDSHAPE_MULTIPLIERS[vrmName] ?? 1.0
      const clamped = Math.min(1, Math.max(0, value * multiplier))
      try {
        vrm.expressionManager.setValue(vrmName, clamped)
      } catch {
        // Expression not in this VRM — ignore
      }
    }
  }
}
