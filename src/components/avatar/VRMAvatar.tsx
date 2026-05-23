import { useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { VRMLoaderPlugin, VRMUtils, type VRM } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { useAppStore } from '../../stores/appStore'
import { applyTrackingToVRM } from '../../systems/retargeting/faceRetargeter'

interface VRMAvatarProps {
  url: string
}

export function VRMAvatar({ url }: VRMAvatarProps) {
  const [vrm, setVrm] = useState<VRM | null>(null)
  const [skeletonHelper, setSkeletonHelper] = useState<THREE.SkeletonHelper | null>(null)
  const { showSkeleton, showWireframe, trackingData, isTrackingActive, setVRMName } = useAppStore()

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

      // VRM 0.x models face +Z; rotate to face -Z (toward camera)
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

  // Create skeleton helper after VRM loads
  useEffect(() => {
    if (!vrm) return
    const helper = new THREE.SkeletonHelper(vrm.scene)
    setSkeletonHelper(helper)
    return () => {
      helper.dispose()
      setSkeletonHelper(null)
    }
  }, [vrm])

  // Apply wireframe toggle
  useEffect(() => {
    if (!vrm) return
    vrm.scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach((m) => {
          if ('wireframe' in m) m.wireframe = showWireframe
        })
      }
    })
  }, [showWireframe, vrm])

  useFrame((_, delta) => {
    if (!vrm) return
    if (isTrackingActive && trackingData) {
      applyTrackingToVRM(vrm, trackingData)
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
