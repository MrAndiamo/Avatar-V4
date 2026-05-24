import { useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { useAppStore } from '../../stores/appStore'
import { applyTrackingToVRM } from '../../systems/retargeting/faceRetargeter'
import { applyPoseToVRM, computeVRMTransform } from '../../systems/retargeting/bodyRetargeter'

interface VRMAvatarProps {
  url: string
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

export function VRMAvatar({ url }: VRMAvatarProps) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const [skeletonHelper, setSkeletonHelper] = useState<THREE.SkeletonHelper | null>(null)
  const { showSkeleton, showWireframe, trackingData, isTrackingActive, setVRMName } = useAppStore()
  const { camera } = useThree()

  // Load VRM
  useEffect(() => {
    let cancelled = false
    const loader = new GLTFLoader()
    loader.register((parser) => new VRMLoaderPlugin(parser))

    loader.loadAsync(url).then((gltf) => {
      if (cancelled) return
      const loaded = gltf.userData.vrm as VRM

      VRMUtils.removeUnnecessaryVertices(gltf.scene)
      VRMUtils.removeUnnecessaryJoints(gltf.scene)

      if (loaded.meta?.metaVersion === '0') {
        VRMUtils.rotateVRM0(loaded)
      }

      setVrm(loaded)
      const displayName =
        loaded.meta?.metaVersion === '1'
          ? loaded.meta.name
          : loaded.meta?.metaVersion === '0'
          ? (loaded.meta.title ?? 'VRM Avatar')
          : 'VRM Avatar'
      setVRMName(displayName)
    }).catch(console.error)

    return () => {
      cancelled = true
      setVrm(null)
      setSkeletonHelper(null)
    }
  }, [url, setVRMName])

  useEffect(() => {
    if (!vrm) return
    const helper = new THREE.SkeletonHelper(vrm.scene)
    setSkeletonHelper(helper)
    return () => {
      helper.dispose()
      setSkeletonHelper(null)
    }
  }, [vrm])

  useEffect(() => {
    if (!vrm) return
    vrm.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => { if ('wireframe' in m) m.wireframe = showWireframe })
      }
    })
  }, [showWireframe, vrm])

  useFrame((_, delta) => {
    if (!vrm) return

    if (isTrackingActive) {
      if (trackingData) applyTrackingToVRM(vrm, trackingData)
      applyPoseToVRM(vrm)

      // AR positioning: scale drives apparent depth — smaller scale = further away.
      // No Z manipulation needed; perspective projection handles the depth illusion.
      const transform = computeVRMTransform(camera)
      if (transform) {
        vrm.scene.position.x = lerp(vrm.scene.position.x, transform.position.x, 0.35)
        vrm.scene.position.y = lerp(vrm.scene.position.y, transform.position.y, 0.35)
        vrm.scene.scale.x = lerp(vrm.scene.scale.x, transform.scale, 0.35)
        vrm.scene.scale.y = lerp(vrm.scene.scale.y, transform.scale, 0.35)
        vrm.scene.scale.z = lerp(vrm.scene.scale.z, transform.scale, 0.35)
      }
    } else {
      // Drift back to neutral when tracking is off
      vrm.scene.position.x = lerp(vrm.scene.position.x, 0, 0.05)
      vrm.scene.position.y = lerp(vrm.scene.position.y, 0, 0.05)
      vrm.scene.scale.x = lerp(vrm.scene.scale.x, 1, 0.05)
      vrm.scene.scale.y = lerp(vrm.scene.scale.y, 1, 0.05)
      vrm.scene.scale.z = lerp(vrm.scene.scale.z, 1, 0.05)
    }

    vrm.update(delta)
  })

  if (!vrm) return null

  return (
    <>
      <primitive object={vrm.scene} />
      {showSkeleton && skeletonHelper && <primitive object={skeletonHelper} />}
    </>
  )
}
