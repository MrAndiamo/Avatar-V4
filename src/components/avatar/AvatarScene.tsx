import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei'
import { VRMAvatar } from './VRMAvatar'
import { useAppStore } from '../../stores/appStore'

interface AvatarSceneProps {
  arMode: boolean
}

export function AvatarScene({ arMode }: AvatarSceneProps) {
  const vrmUrl = useAppStore((s) => s.vrmUrl)

  return (
    <Canvas
      // Transparent background in AR mode so webcam shows through
      gl={{ alpha: arMode, antialias: true }}
      style={{ background: arMode ? 'transparent' : '#0d0d1a' }}
      // Camera at origin height, looking straight ahead — required for AR positioning math
      camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 100 }}
      shadows
    >
      <ambientLight intensity={arMode ? 1.0 : 0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -3]} intensity={0.4} color="#6688ff" />

      <Environment preset="studio" />

      {/* Grid only in non-AR mode */}
      {!arMode && (
        <gridHelper args={[10, 20, '#2a2a3a', '#1a1a28']} position={[0, 0, 0]} />
      )}

      {/* Placeholder cube until VRM is loaded */}
      {!vrmUrl && !arMode && (
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#334466" wireframe />
        </mesh>
      )}

      <Suspense fallback={null}>
        {vrmUrl && <VRMAvatar url={vrmUrl} />}
      </Suspense>

      {/* Only show orbit controls in non-AR mode */}
      {!arMode && (
        <OrbitControls target={[0, 1, 0]} minDistance={0.5} maxDistance={8} enablePan />
      )}

      {!arMode && (
        <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
          <GizmoViewport />
        </GizmoHelper>
      )}
    </Canvas>
  )
}
