"use client"

import { useRef, useState } from "react"
import {
  Environment,
  PerspectiveCamera,
  RenderTexture,
  Text,
} from "@react-three/drei"
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber"
import {
  BallCollider,
  CuboidCollider,
  Physics,
  RigidBody,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier"
import { MeshLineGeometry, MeshLineMaterial } from "meshline"
import * as THREE from "three"

// Register MeshLine as R3F JSX elements
extend({ MeshLineGeometry, MeshLineMaterial })

// Augment R3F's ThreeElements so JSX recognises the extended types
declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: any
    meshLineMaterial: any
  }
}

// ─── Card texture rendered inside RenderTexture ──────────────────────────────

interface CardData {
  name: string
  role: string
  memberId: string
  joinDate: string
}

type MotionProfileName = "light" | "balanced" | "heavy"

interface MotionProfile {
  gravity: number
  ropeLength: number
  anchorY: number
  chainOffset: number
  chainSpacing: number
  linearDamping: number
  angularDamping: number
  dragLerp: number
  dragDepth: number
  returnDamping: number
  maxDragZ: [number, number]
}

const MOTION_PROFILES: Record<MotionProfileName, MotionProfile> = {
  light: {
    gravity: -8,
    ropeLength: 0.55,
    anchorY: 2.2,
    chainOffset: 0.25,
    chainSpacing: 0.25,
    linearDamping: 3.8,
    angularDamping: 3.6,
    dragLerp: 0.18,
    dragDepth: 0.7,
    returnDamping: 0.4,
    maxDragZ: [-1.6, 0.8],
  },
  balanced: {
    gravity: -10,
    ropeLength: 0.52,
    anchorY: 2.3,
    chainOffset: 0.24,
    chainSpacing: 0.24,
    linearDamping: 4.2,
    angularDamping: 4,
    dragLerp: 0.16,
    dragDepth: 0.65,
    returnDamping: 0.45,
    maxDragZ: [-1.5, 0.7],
  },
  heavy: {
    gravity: -12,
    ropeLength: 0.48,
    anchorY: 2.4,
    chainOffset: 0.22,
    chainSpacing: 0.22,
    linearDamping: 4.6,
    angularDamping: 4.4,
    dragLerp: 0.14,
    dragDepth: 0.6,
    returnDamping: 0.5,
    maxDragZ: [-1.4, 0.6],
  },
}

interface MemberCard3DProps extends CardData {
  motionProfile?: MotionProfileName
}

function CardTexture({ name, role, memberId, joinDate }: CardData) {
  return (
    <>
      {/* Isolated camera for the RenderTexture scene */}
      <PerspectiveCamera makeDefault manual position={[0, 0, 3.8]} fov={52} />

      {/* ── Background layers ── */}
      {/* Main gradient background */}
      <mesh>
        <planeGeometry args={[2.4, 3.1]} />
        <meshBasicMaterial color="#0a1528" />
      </mesh>

      {/* Gradient overlay from top */}
      <mesh position={[0, 1.3, 0.0005]}>
        <planeGeometry args={[2.4, 2.2]} />
        <meshBasicMaterial color="#152d50" transparent opacity={0.4} />
      </mesh>

      {/* Enhanced depth overlay - bottom */}
      <mesh position={[0, -0.8, 0.0005]}>
        <planeGeometry args={[2.4, 1.5]} />
        <meshBasicMaterial color="#081020" transparent opacity={0.3} />
      </mesh>

      {/* Subtle diagonal stripes */}
      {[-1.0, -0.5, 0.0, 0.5, 1.0].map((x, i) => (
        <mesh key={i} position={[x, 0, 0.001]} rotation={[0, 0, Math.PI / 6]}>
          <planeGeometry args={[0.018, 5.5]} />
          <meshBasicMaterial color="#d4af37" transparent opacity={0.08} />
        </mesh>
      ))}

      {/* ── Premium accent bars ── */}
      {/* Top accent bar - more refined */}
      <mesh position={[0, 1.48, 0.002]}>
        <planeGeometry args={[2.4, 0.22]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>

      {/* Thin highlight line below top bar */}
      <mesh position={[0, 1.35, 0.002]}>
        <planeGeometry args={[2.4, 0.02]} />
        <meshBasicMaterial color="#f4e4c1" transparent opacity={0.6} />
      </mesh>

      {/* Bottom accent bar */}
      <mesh position={[0, -1.48, 0.002]}>
        <planeGeometry args={[2.4, 0.12]} />
        <meshBasicMaterial color="#d4af37" />
      </mesh>

      {/* ── Premium Branding ── */}
      <Text
        position={[0, 1.16, 0.003]}
        fontSize={0.14}
        color="#f4e4c1"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.14}>
        TRUSTLINK GROUP
      </Text>

      <Text
        position={[0, 0.87, 0.003]}
        fontSize={0.08}
        color="#96b8d4"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}>
        MEMBERSHIP CARD
      </Text>

      {/* Refined gold divider */}
      <mesh position={[0, 0.7, 0.002]}>
        <planeGeometry args={[2.2, 0.008]} />
        <meshBasicMaterial color="#d4af37" transparent opacity={0.65} />
      </mesh>

      {/* ── Enhanced Member Info ── */}
      <Text
        position={[0, 0.31, 0.003]}
        fontSize={0.16}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.2}
        lineHeight={1.3}>
        {name}
      </Text>

      <Text
        position={[0, 0.05, 0.003]}
        fontSize={0.09}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.08}>
        {`◈  ${role.toUpperCase()}  ◈`}
      </Text>

      {/* Divider line */}
      <mesh position={[0, -0.15, 0.002]}>
        <planeGeometry args={[2.2, 0.005]} />
        <meshBasicMaterial color="#1a3a5f" />
      </mesh>

      {/* Vertical separator */}
      <mesh position={[0, -0.65, 0.002]}>
        <planeGeometry args={[0.005, 0.62]} />
        <meshBasicMaterial color="#1a3a5f" />
      </mesh>

      {/* MEMBER SINCE - Left */}
      <Text
        position={[-0.58, -0.36, 0.003]}
        fontSize={0.068}
        color="#96b8d4"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}>
        MEMBER SINCE
      </Text>
      <Text
        position={[-0.58, -0.56, 0.003]}
        fontSize={0.105}
        color="#ffffff"
        anchorX="center"
        anchorY="middle">
        {joinDate}
      </Text>

      {/* MEMBER ID - Right */}
      <Text
        position={[0.58, -0.36, 0.003]}
        fontSize={0.068}
        color="#96b8d4"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.06}>
        MEMBER ID
      </Text>
      <Text
        position={[0.58, -0.56, 0.003]}
        fontSize={0.088}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.04}>
        {memberId}
      </Text>

      {/* Footer branding */}
      <Text
        position={[0, -0.96, 0.003]}
        fontSize={0.07}
        color="#96b8d4"
        anchorX="center"
        anchorY="middle">
        Ikimina - Savings & Investment Group
      </Text>
      <Text
        position={[0, -1.18, 0.003]}
        fontSize={0.067}
        color="#d4af37"
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.07}>
        BUGESERA · RWANDA
      </Text>
    </>
  )
}

// ─── Lanyard + Card (physics combined component) ─────────────────────────────

function LanyardCard(props: MemberCard3DProps) {
  const { name, role, memberId, joinDate, motionProfile = "balanced" } = props
  const motion = MOTION_PROFILES[motionProfile]

  const band = useRef<THREE.Mesh>(null!)
  const fixed = useRef<any>(null!)
  const j1 = useRef<any>(null!)
  const j2 = useRef<any>(null!)
  const j3 = useRef<any>(null!)
  const card = useRef<any>(null!)

  const { width, height } = useThree((s) => s.size)

  const [curve] = useState(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
        new THREE.Vector3(),
      ])
  )

  const [dragged, drag] = useState<THREE.Vector3 | false>(false)

  // Stable mutable vectors (mutated inside useFrame, no re-render needed)
  const vec = new THREE.Vector3()
  const ang = new THREE.Vector3()
  const rot = new THREE.Vector3()
  const dir = new THREE.Vector3()
  const target = new THREE.Vector3()
  const current = new THREE.Vector3()

  // Rope joints connect the chain: fixed → j1 → j2 → j3
  // Vector3 tuples: [x, y, z] for each anchor, plus length
  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], motion.ropeLength] as [
    [number, number, number],
    [number, number, number],
    number,
  ])
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], motion.ropeLength] as [
    [number, number, number],
    [number, number, number],
    number,
  ])
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], motion.ropeLength] as [
    [number, number, number],
    [number, number, number],
    number,
  ])
  // Spherical joint connects j3 → card (anchor at card top)
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, 1.8, 0],
  ] as [[number, number, number], [number, number, number]])

  useFrame((state) => {
    if (
      !fixed.current ||
      !j1.current ||
      !j2.current ||
      !j3.current ||
      !card.current
    )
      return

    // ── Drag handling ──
    if (dragged) {
      target.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      dir.copy(target).sub(state.camera.position).normalize()
      target.add(
        dir.multiplyScalar(state.camera.position.length() * motion.dragDepth)
      )
      target.sub(dragged as THREE.Vector3)
      target.z = THREE.MathUtils.clamp(target.z, ...motion.maxDragZ)

      current.copy(card.current.translation())
      current.lerp(target, motion.dragLerp)

      card.current.setNextKinematicTranslation({
        x: current.x,
        y: current.y,
        z: current.z,
      })
    }

    // ── Update lanyard curve from joint positions ──
    if (band.current) {
      curve.points[0].copy(j3.current.translation())
      curve.points[1].copy(j2.current.translation())
      curve.points[2].copy(j1.current.translation())
      curve.points[3].copy(fixed.current.translation())
      ;(band.current.geometry as any).setPoints(curve.getPoints(32))
    }

    // ── Tilt card back toward screen (prevent spinning) ──
    ang.copy(card.current.angvel())
    rot.copy(card.current.rotation())
    card.current.setAngvel({
      x: ang.x,
      y: ang.y - rot.y * motion.returnDamping,
      z: ang.z,
    })
  })

  return (
    <>
      {/* Profile-driven anchor controls hang height and swing character. */}
      <RigidBody ref={fixed} type="fixed" position={[0, motion.anchorY, 0]} />

      {/* Chain joints - start at the same height as fixed, swing/fall into place */}
      <RigidBody
        ref={j1}
        position={[motion.chainOffset, motion.anchorY, 0]}
        angularDamping={motion.angularDamping}
        linearDamping={motion.linearDamping}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody
        ref={j2}
        position={[motion.chainOffset + motion.chainSpacing, motion.anchorY, 0]}
        angularDamping={motion.angularDamping}
        linearDamping={motion.linearDamping}>
        <BallCollider args={[0.1]} />
      </RigidBody>
      <RigidBody
        ref={j3}
        position={[
          motion.chainOffset + motion.chainSpacing * 2,
          motion.anchorY,
          0,
        ]}
        angularDamping={motion.angularDamping}
        linearDamping={motion.linearDamping}>
        <BallCollider args={[0.1]} />
      </RigidBody>

      {/* Gold lanyard band (MeshLine) */}
      <mesh ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#c9992a"
          resolution={[width, height]}
          lineWidth={1.3}
        />
      </mesh>

      {/* Interactive member card - initial position near where it settles */}
      <RigidBody
        ref={card}
        type={dragged ? "kinematicPosition" : "dynamic"}
        position={[0, 0.95, 0]}
        angularDamping={motion.angularDamping}
        linearDamping={motion.linearDamping}>
        <CuboidCollider args={[1.35, 1.72, 0.01]} />
        <mesh
          onPointerUp={(e) => {
            ;(e.target as any).releasePointerCapture?.(e.pointerId)
            drag(false)
          }}
          onPointerDown={(e) => {
            ;(e.target as any).setPointerCapture?.(e.pointerId)
            drag(
              new THREE.Vector3()
                .copy(e.point)
                .sub(vec.copy(card.current.translation()))
            )
          }}>
          <planeGeometry args={[2.7, 3.44]} />
          <meshPhysicalMaterial
            clearcoat={0.9}
            clearcoatRoughness={0.08}
            iridescence={0.8}
            iridescenceIOR={1.3}
            iridescenceThicknessRange={[100, 1600]}
            metalness={0.35}
            roughness={0.22}
            reflectivity={0.9}
            side={THREE.DoubleSide}>
            <RenderTexture attach="map" width={1200} height={1800}>
              <CardTexture
                name={name}
                role={role}
                memberId={memberId}
                joinDate={joinDate}
              />
            </RenderTexture>
          </meshPhysicalMaterial>
        </mesh>
      </RigidBody>
    </>
  )
}

// ─── Public export: the full Canvas scene ────────────────────────────────────

export function MemberCard3D(props: MemberCard3DProps) {
  const { motionProfile = "balanced" } = props
  const motion = MOTION_PROFILES[motionProfile]

  return (
    <Canvas
      className="w-full h-full"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 8.5], fov: 24 }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[12, 12, 12]} intensity={1.3} />
      <directionalLight position={[-8, -6, 6]} intensity={0.5} />
      <pointLight position={[0, 3, 5]} intensity={0.4} decay={2} />
      <Environment preset="city" />
      <Physics gravity={[0, motion.gravity, 0]} timeStep="vary">
        <LanyardCard {...props} />
      </Physics>
    </Canvas>
  )
}
