import * as THREE from 'three'
import type { VRM } from '@pixiv/three-vrm'
import type { PoseLandmarkerResult } from '@mediapipe/tasks-vision'

// ─── Module-level cache ────────────────────────────────────────────────────────

let _latestResult: PoseLandmarkerResult | null = null

export function setPoseResult(result: PoseLandmarkerResult): void {
  _latestResult = result
}

export function clearPoseResult(): void {
  _latestResult = null
}

// ─── Smoothing ────────────────────────────────────────────────────────────────

const LERP = 0.25
const MIN_VIS = 0.5

const _smoothed: Record<string, THREE.Quaternion> = {}

function smooth(name: string, q: THREE.Quaternion): THREE.Quaternion {
  if (!_smoothed[name]) _smoothed[name] = new THREE.Quaternion()
  return _smoothed[name].slerp(q, LERP)
}

// ─── Coordinate transform ─────────────────────────────────────────────────────
//
// MediaPipe world landmarks:
//   X: positive = camera right (= subject's LEFT when facing camera)
//   Y: positive = DOWN (image convention, NOT world up!)
//   Z: positive = away from camera (smaller = closer)
//
// Three.js / VRM:
//   X: positive = model's right (+X = model right, -X = model left)
//   Y: positive = UP
//   Z: positive = toward viewer
//
// Corrections: negate X (mirror), negate Y (flip up/down), negate Z (flip depth)

type Lm = { x: number; y: number; z: number; visibility?: number }

function v3(lm: Lm): THREE.Vector3 {
  return new THREE.Vector3(-lm.x, -lm.y, -lm.z)
}

function vis(lm: Lm): number {
  return lm.visibility ?? 1
}

// ─── Core rotation helper ─────────────────────────────────────────────────────

function boneDir(
  from: Lm,
  to: Lm,
  restDir: THREE.Vector3,
  parentQ?: THREE.Quaternion
): THREE.Quaternion | null {
  if (vis(from) < MIN_VIS || vis(to) < MIN_VIS) return null

  let targetDir = v3(to).sub(v3(from))
  if (targetDir.lengthSq() < 1e-6) return null
  targetDir.normalize()

  if (parentQ) {
    targetDir.applyQuaternion(parentQ.clone().invert())
  }

  return new THREE.Quaternion().setFromUnitVectors(restDir, targetDir)
}

// ─── AR positioning ───────────────────────────────────────────────────────────
//
// Maps normalized 2D screen landmarks to VRM world position + scale so the
// avatar overlays the user in the webcam feed.

export function computeVRMTransform(
  camera: THREE.Camera
): { position: THREE.Vector3; scale: number } | null {
  if (!(camera instanceof THREE.PerspectiveCamera)) return null
  const result = _latestResult
  if (!result?.landmarks?.[0]) return null

  const lm = result.landmarks[0] // normalized [0,1], Y-down, NOT mirrored
  if (lm.length < 25) return null

  // Hip center — mirror X because webcam video is displayed mirrored
  const hipX = 1 - (lm[23].x + lm[24].x) / 2
  const hipY = (lm[23].y + lm[24].y) / 2

  // Nose as head proxy
  const noseY = lm[0].y

  // Torso height in normalized screen coords (positive = hip below nose = normal pose)
  const torsoNorm = Math.max(0.01, hipY - noseY)

  // NDC [-1, 1]
  const ndcX = hipX * 2 - 1
  const ndcY = -(hipY * 2 - 1) // flip Y for NDC

  // Ray-cast onto the Z=0 plane to find world hip position
  const raycaster = new THREE.Raycaster()
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
  const worldHip = new THREE.Vector3()
  if (!raycaster.ray.intersectPlane(plane, worldHip)) return null

  // Scale: world height covered by 1 NDC unit at Z=0 depth
  const fovRad = (camera.fov * Math.PI) / 180
  const worldUnitsPerNDC = camera.position.z * Math.tan(fovRad / 2)
  const torsoWorld = torsoNorm * 2 * worldUnitsPerNDC

  // VRM: nose ≈ 1.7m, hips ≈ 0.9m → torso ≈ 0.8 units
  const scale = Math.max(0.2, Math.min(3.0, torsoWorld / 0.8))

  // VRM scene root Y: hips are ~0.9 * scale above scene root
  return {
    position: new THREE.Vector3(worldHip.x, worldHip.y - 0.9 * scale, 0),
    scale,
  }
}

// ─── Bone retargeter ──────────────────────────────────────────────────────────

export function applyPoseToVRM(vrm: VRM): void {
  const result = _latestResult
  if (!result?.worldLandmarks?.length) return

  const lm = result.worldLandmarks[0]
  if (lm.length < 29) return

  const h = vrm.humanoid

  const L_SHOULDER = 11, R_SHOULDER = 12
  const L_ELBOW = 13,    R_ELBOW = 14
  const L_WRIST = 15,    R_WRIST = 16
  const L_HIP = 23,      R_HIP = 24
  const L_KNEE = 25,     R_KNEE = 26
  const L_ANKLE = 27,    R_ANKLE = 28

  // ── Hips & Spine ──────────────────────────────────────────────────────────

  if (vis(lm[L_HIP]) > MIN_VIS && vis(lm[R_HIP]) > MIN_VIS) {
    const hipCenter = v3(lm[L_HIP]).add(v3(lm[R_HIP])).multiplyScalar(0.5)
    const shoulderCenter = v3(lm[L_SHOULDER]).add(v3(lm[R_SHOULDER])).multiplyScalar(0.5)
    const spineVec = shoulderCenter.clone().sub(hipCenter).normalize()

    const lateralLean = Math.atan2(spineVec.x, spineVec.y)
    const forwardLean = Math.atan2(spineVec.z, spineVec.y)

    const hipAxis = v3(lm[R_HIP]).sub(v3(lm[L_HIP])).normalize()
    const hipYaw = Math.atan2(hipAxis.z, hipAxis.x)

    const hipsBone = h.getNormalizedBoneNode('hips')
    if (hipsBone) {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(forwardLean * 0.25, hipYaw * 0.4, lateralLean * 0.25, 'XYZ')
      )
      hipsBone.quaternion.copy(smooth('hips', q))
    }

    const spineBone = h.getNormalizedBoneNode('spine')
    if (spineBone) {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(forwardLean * 0.3, 0, lateralLean * 0.3, 'XYZ')
      )
      spineBone.quaternion.copy(smooth('spine', q))
    }

    const chestBone = h.getNormalizedBoneNode('chest')
    if (chestBone) {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(forwardLean * 0.25, 0, lateralLean * 0.25, 'XYZ')
      )
      chestBone.quaternion.copy(smooth('chest', q))
    }
  }

  // ── Left Arm ──────────────────────────────────────────────────────────────

  const REST_L = new THREE.Vector3(-1, 0, 0)

  const qLU = boneDir(lm[L_SHOULDER], lm[L_ELBOW], REST_L)
  if (qLU) {
    const bone = h.getNormalizedBoneNode('leftUpperArm')
    if (bone) bone.quaternion.copy(smooth('leftUpperArm', qLU))

    const qLL = boneDir(lm[L_ELBOW], lm[L_WRIST], REST_L, qLU)
    if (qLL) {
      const lowerBone = h.getNormalizedBoneNode('leftLowerArm')
      if (lowerBone) lowerBone.quaternion.copy(smooth('leftLowerArm', qLL))
    }
  }

  // ── Right Arm ─────────────────────────────────────────────────────────────

  const REST_R = new THREE.Vector3(1, 0, 0)

  const qRU = boneDir(lm[R_SHOULDER], lm[R_ELBOW], REST_R)
  if (qRU) {
    const bone = h.getNormalizedBoneNode('rightUpperArm')
    if (bone) bone.quaternion.copy(smooth('rightUpperArm', qRU))

    const qRL = boneDir(lm[R_ELBOW], lm[R_WRIST], REST_R, qRU)
    if (qRL) {
      const lowerBone = h.getNormalizedBoneNode('rightLowerArm')
      if (lowerBone) lowerBone.quaternion.copy(smooth('rightLowerArm', qRL))
    }
  }

  // ── Legs ──────────────────────────────────────────────────────────────────

  const REST_DOWN = new THREE.Vector3(0, -1, 0)

  const qLLeg = boneDir(lm[L_HIP], lm[L_KNEE], REST_DOWN)
  if (qLLeg) {
    const bone = h.getNormalizedBoneNode('leftUpperLeg')
    if (bone) bone.quaternion.copy(smooth('leftUpperLeg', qLLeg))

    const qLLower = boneDir(lm[L_KNEE], lm[L_ANKLE], REST_DOWN, qLLeg)
    if (qLLower) {
      const b = h.getNormalizedBoneNode('leftLowerLeg')
      if (b) b.quaternion.copy(smooth('leftLowerLeg', qLLower))
    }
  }

  const qRLeg = boneDir(lm[R_HIP], lm[R_KNEE], REST_DOWN)
  if (qRLeg) {
    const bone = h.getNormalizedBoneNode('rightUpperLeg')
    if (bone) bone.quaternion.copy(smooth('rightUpperLeg', qRLeg))

    const qRLower = boneDir(lm[R_KNEE], lm[R_ANKLE], REST_DOWN, qRLeg)
    if (qRLower) {
      const b = h.getNormalizedBoneNode('rightLowerLeg')
      if (b) b.quaternion.copy(smooth('rightLowerLeg', qRLower))
    }
  }
}
