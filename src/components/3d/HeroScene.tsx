"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sparkles } from "@react-three/drei";
import { useReducedMotion } from "motion/react";
import { useRef } from "react";
import type { Group } from "three";

function GardenObjects({ reducedMotion }: { reducedMotion: boolean }) {
	const group = useRef<Group>(null);
	const { pointer, size } = useThree();

	useFrame((_, delta) => {
		if (!group.current) return;
		if (!reducedMotion) {
			group.current.rotation.y += (pointer.x * 0.12 - group.current.rotation.y) * delta;
			group.current.rotation.x += (-pointer.y * 0.07 - group.current.rotation.x) * delta;
		}
	});

	return (
		<group ref={group}>
			<Float speed={reducedMotion ? 0 : 1.2} rotationIntensity={0.12} floatIntensity={reducedMotion ? 0 : 0.22}>
				<mesh scale={1.05}>
					<icosahedronGeometry args={[1, 5]} />
					<MeshDistortMaterial color="#bdefff" roughness={0.28} metalness={0.08} distort={0.25} speed={1.1} />
				</mesh>
			</Float>
			<Float speed={reducedMotion ? 0 : 1.5} rotationIntensity={0.3} floatIntensity={reducedMotion ? 0 : 0.35}>
				<mesh position={[1.18, 0.72, 0.1]} scale={0.24}>
					<dodecahedronGeometry args={[1, 0]} />
					<meshStandardMaterial color="#c9efdF" roughness={0.4} />
				</mesh>
			</Float>
			<Float speed={reducedMotion ? 0 : 1.1} rotationIntensity={0.24} floatIntensity={reducedMotion ? 0 : 0.25}>
				<mesh position={[-1.1, -0.68, 0.3]} rotation={[0.8, 0.2, 0.3]} scale={0.22}>
					<torusGeometry args={[0.72, 0.2, 12, 28]} />
					<meshStandardMaterial color="#ffd8e8" roughness={0.32} />
				</mesh>
			</Float>
			{!reducedMotion && <Sparkles count={size.width < 600 ? 10 : 24} scale={3.4} size={2.1} speed={0.18} color="#8cb6be" />}
		</group>
	);
}

export function HeroScene() {
	const shouldReduceMotion = useReducedMotion();

	return (
		<div className="hero-canvas" aria-hidden="true">
			<Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 4.5], fov: 38 }} gl={{ alpha: true, antialias: false }}>
				<ambientLight intensity={1.8} />
				<directionalLight position={[3, 4, 4]} intensity={2.2} color="#ffffff" />
				<pointLight position={[-3, -2, 2]} intensity={1.2} color="#b8aaff" />
				<GardenObjects reducedMotion={Boolean(shouldReduceMotion)} />
			</Canvas>
			<span className="scene-orbit orbit-one" />
			<span className="scene-orbit orbit-two" />
			<span className="scene-caption">A little world in progress</span>
		</div>
	);
}
