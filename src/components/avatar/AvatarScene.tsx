import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, GizmoHelper, GizmoViewport, Environment } from '@react-three/drei'
import { VRMAvatar } from './VRMAvatar'
import { useAppStore } from '../../stores/appStore'

export function AvatarScene() {
  const vrmUrl = useAppStore((s) => s.vrmUrl)

  return (
    <Canvas
      camera={{ position: [0, 1.4, 2.2], fov: 35 }}
      style={{ background: '#0d0d1a' }}
      shadows
      gl={{ antialias: true }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />
      <directionalLight position={[-5, 5, -3]} intensity={0.4} color="#6688ff" />

      <Environment preset="studio" />

      <gridHelper args={[10, 20, '#2a2a3a', '#1a1a28']} position={[0, 0, 0]} />

      <Suspense fallback={null}>
        {vrmUrl && <VRMAvatar url={vrmUrl} />}
      </Suspense>

      {!vrmUrl && (
        <mesh position={[0, 1.2, 0]}>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color="#334466" wireframe />
        </mesh>
      )}

      <OrbitControls
        target={[0, 1.1, 0]}
        minDistance={0.5}
        maxDistance={8}
        enablePan
      />

      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport />
      </GizmoHelper>
    </Canvas>
  )
}
