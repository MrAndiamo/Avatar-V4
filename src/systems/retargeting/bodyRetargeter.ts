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

// ─── Coordinate transforms ────────────────────────────────────────────────────
//
// WORLD landmarks (used for spine/hips/legs):
//   X: positive = camera right (= subject's left when facing camera)
//   Y: positive = UP (world space)
//   Z: positive = toward camera
//   → negate X for mirror, keep Y, keep Z

type Lm = { x: number; y: number; z: number; visibility?: number }

function v3(lm: Lm): THREE.Vector3 {
  return new THREE.Vector3(-lm.x, lm.y, lm.z)
}

// NORMALIZED image landmarks (used for arms):
//   X: 0→1 left to right in image, Y: 0→1 top to bottom (Y-down image space)
//   Z: rough depth estimate
//   → no X flip (bones are swapped below for mirror), flip Y for Three.js Y-up

function img(lm: Lm): THREE.Vector3 {
  return new THREE.Vector3(lm.x, -lm.y, lm.z)
}

function vis(lm: Lm): number {
  return lm.visibility ?? 1
}

// ─── Core rotation helper ─────────────────────────────────────────────────────

function boneDir(
  from: Lm,
  to: Lm,
  restDir: THREE.Vector3,
  parentQ?: THREE.Quaternion,
  convert: (lm: Lm) => THREE.Vector3 = v3
): THREE.Quaternion | null {
  if (vis(from) < MIN_VIS || vis(to) < MIN_VIS) return null

  let targetDir = convert(to).sub(convert(from))
  if (targetDir.lengthSq() < 1e-6) return null
  targetDir.normalize()

  if (parentQ) {
    targetDir.applyQuaternion(parentQ.clone().invert())
  }

  return new THREE.Quaternion().setFromUnitVectors(restDir, targetDir)
}

// ─── AR positioning ───────────────────────────────────────────────────────────

export function computeVRMTransform(
  camera: THREE.Camera
): { position: THREE.Vector3; scale: number } | null {
  if (!(camera instanceof THREE.PerspectiveCamera)) return null
  const result = _latestResult
  if (!result?.landmarks?.[0]) return null

  const lm = result.landmarks[0] // normalized [0,1], Y-down
  if (lm.length < 25) return null

  // Hip center — mirror X because webcam video is displayed mirrored
  const hipX = 1 - (lm[23].x + lm[24].x) / 2
  const hipY = (lm[23].y + lm[24].y) / 2

  // Nose — mirror X
  const noseX = 1 - lm[0].x
  const noseY = lm[0].y

  // Torso height in normalized screen coords
  const torsoNorm = Math.max(0.01, hipY - noseY)

  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)

  const ndcNoseX = noseX * 2 - 1
  const ndcNoseY = -(noseY * 2 - 1)
  raycaster.setFromCamera(new THREE.Vector2(ndcNoseX, ndcNoseY), camera)
  const worldNose = new THREE.Vector3()
  if (!raycaster.ray.intersectPlane(plane, worldNose)) return null

  const ndcHipX = hipX * 2 - 1
  const ndcHipY = -(hipY * 2 - 1)
  raycaster.setFromCamera(new THREE.Vector2(ndcHipX, ndcHipY), camera)
  const worldHip = new THREE.Vector3()
  if (!raycaster.ray.intersectPlane(plane, worldHip)) return null

  const fovRad = (camera.fov * Math.PI) / 180
  const worldUnitsPerNDC = camera.position.z * Math.tan(fovRad / 2)
  const torsoWorld = torsoNorm * 2 * worldUnitsPerNDC

  const scale = Math.max(0.2, Math.min(3.0, torsoWorld / 0.8))

  return {
    position: new THREE.Vector3(worldHip.x, worldNose.y - 1.55 * scale, 0),
    scale,
  }
}

// ─── Bone retargeter ──────────────────────────────────────────────────────────

export function applyPoseToVRM(vrm: VRM): void {
  const result = _latestResult
  if (!result?.worldLandmarks?.length) return
  if (!result?.landmarks?.length) return

  const wlm = result.worldLandmarks[0]  // world-space, used for spine/hips/legs
  const ilm = result.landmarks[0]        // image-space (normalized), used for arms

  if (wlm.length < 29) return
  if (ilm.length < 17) return

  const h = vrm.humanoid

  const L_SHOULDER = 11, R_SHOULDER = 12
  const L_ELBOW    = 13, R_ELBOW    = 14
  const L_WRIST    = 15, R_WRIST    = 16
  const L_HIP      = 23, R_HIP      = 24
  const L_KNEE     = 25, R_KNEE     = 26
  const L_ANKLE    = 27, R_ANKLE    = 28

  // ── Hips & Spine (world landmarks, v3 = (-x, y, z)) ──────────────────────

  if (vis(wlm[L_HIP]) > MIN_VIS && vis(wlm[R_HIP]) > MIN_VIS) {
    const hipCenter      = v3(wlm[L_HIP]).add(v3(wlm[R_HIP])).multiplyScalar(0.5)
    const shoulderCenter = v3(wlm[L_SHOULDER]).add(v3(wlm[R_SHOULDER])).multiplyScalar(0.5)
    const spineVec       = shoulderCenter.clone().sub(hipCenter).normalize()

    const lateralLean = Math.atan2(spineVec.x, spineVec.y)
    const forwardLean = Math.atan2(spineVec.z, spineVec.y)

    const hipAxis = v3(wlm[R_HIP]).sub(v3(wlm[L_HIP])).normalize()
    const hipYaw  = Math.atan2(hipAxis.z, hipAxis.x)

    const hipsBone = h.getNormalizedBoneNode('hips')
    if (hipsBone) {
      hipsBone.quaternion.copy(smooth('hips',
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(forwardLean * 0.25, hipYaw * 0.4, lateralLean * 0.25, 'XYZ')
        )
      ))
    }

    const spineBone = h.getNormalizedBoneNode('spine')
    if (spineBone) {
      spineBone.quaternion.copy(smooth('spine',
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(forwardLean * 0.3, 0, lateralLean * 0.3, 'XYZ')
        )
      ))
    }

    const chestBone = h.getNormalizedBoneNode('chest')
    if (chestBone) {
      chestBone.quaternion.copy(smooth('chest',
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(forwardLean * 0.25, 0, lateralLean * 0.25, 'XYZ')
        )
      ))
    }
  }

  // ── Arms (normalized image landmarks, img = (x, -y, z)) ──────────────────
  //
  // Mirror mode: person's left arm is on camera-RIGHT (high x in image).
  // We do NOT flip X in img(), so that arm maps to VRM's rightUpperArm (screen-right).
  // This gives a mirror: user raises left arm → VRM right arm (screen-right) rises.
  //
  // Bone → Landmark mapping:
  //   VRM rightUpperArm ← person's LEFT shoulder→elbow (ilm[11]→ilm[13])
  //   VRM leftUpperArm  ← person's RIGHT shoulder→elbow (ilm[12]→ilm[14])
  //
  // REST directions (image space, no X flip):
  //   RIGHT arm: ilm[11] is at high x, ilm[13] is further right → dir ≈ (+1,0,0)
  //   LEFT arm:  ilm[12] is at low x, ilm[14] is further left  → dir ≈ (-1,0,0)

  const REST_POS = new THREE.Vector3(1, 0, 0)   // for camera-right arm (person's left → VRM right)
  const REST_NEG = new THREE.Vector3(-1, 0, 0)  // for camera-left arm (person's right → VRM left)

  // Person's LEFT arm → VRM rightUpperArm / rightLowerArm
  const qRU = boneDir(ilm[L_SHOULDER], ilm[L_ELBOW], REST_POS, undefined, img)
  if (qRU) {
    const bone = h.getNormalizedBoneNode('rightUpperArm')
    if (bone) bone.quaternion.copy(smooth('rightUpperArm', qRU))

    const qRL = boneDir(ilm[L_ELBOW], ilm[L_WRIST], REST_POS, qRU, img)
    if (qRL) {
      const lowerBone = h.getNormalizedBoneNode('rightLowerArm')
      if (lowerBone) lowerBone.quaternion.copy(smooth('rightLowerArm', qRL))
    }
  }

  // Person's RIGHT arm → VRM leftUpperArm / leftLowerArm
  const qLU = boneDir(ilm[R_SHOULDER], ilm[R_ELBOW], REST_NEG, undefined, img)
  if (qLU) {
    const bone = h.getNormalizedBoneNode('leftUpperArm')
    if (bone) bone.quaternion.copy(smooth('leftUpperArm', qLU))

    const qLL = boneDir(ilm[R_ELBOW], ilm[R_WRIST], REST_NEG, qLU, img)
    if (qLL) {
      const lowerBone = h.getNormalizedBoneNode('leftLowerArm')
      if (lowerBone) lowerBone.quaternion.copy(smooth('leftLowerArm', qLL))
    }
  }

  // ── Legs (world landmarks) ────────────────────────────────────────────────

  const REST_DOWN = new THREE.Vector3(0, -1, 0)

  const qLLeg = boneDir(wlm[L_HIP], wlm[L_KNEE], REST_DOWN)
  if (qLLeg) {
    const bone = h.getNormalizedBoneNode('leftUpperLeg')
    if (bone) bone.quaternion.copy(smooth('leftUpperLeg', qLLeg))

    const qLLower = boneDir(wlm[L_KNEE], wlm[L_ANKLE], REST_DOWN, qLLeg)
    if (qLLower) {
      const b = h.getNormalizedBoneNode('leftLowerLeg')
      if (b) b.quaternion.copy(smooth('leftLowerLeg', qLLower))
    }
  }

  const qRLeg = boneDir(wlm[R_HIP], wlm[R_KNEE], REST_DOWN)
  if (qRLeg) {
    const bone = h.getNormalizedBoneNode('rightUpperLeg')
    if (bone) bone.quaternion.copy(smooth('rightUpperLeg', qRLeg))

    const qRLower = boneDir(wlm[R_KNEE], wlm[R_ANKLE], REST_DOWN, qRLeg)
    if (qRLower) {
      const b = h.getNormalizedBoneNode('rightLowerLeg')
      if (b) b.quaternion.copy(smooth('rightLowerLeg', qRLower))
    }
  }
}
