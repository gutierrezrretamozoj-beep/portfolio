"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	Color,
	CylinderGeometry,
	InstancedMesh,
	Mesh,
	MeshStandardMaterial,
	Object3D,
} from "three";
import { getBridgeDeckHeight } from "@/components/player/navigation";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { PlayerRuntime, WorldPoint } from "@/types/world";

type NavigationTrailProps = {
	target: WorldPoint | null;
	playerRef: { current: PlayerRuntime };
};

/**
 * 3D Animated Glowing Navigation Pathway
 * Renders luminous, pulsing pathway beads along the ground following the active route,
 * guiding the player clearly to their chosen destination with a radiant target beacon.
 */
export function NavigationTrail({ target, playerRef }: NavigationTrailProps) {
	const instancedMeshRef = useRef<InstancedMesh>(null);
	const targetRingRef = useRef<Mesh>(null);
	const pulseTime = useRef(0);

	// Generate dense, ground-conforming trail sample points along the route
	const trailPoints = useMemo(() => {
		if (!target) return [];

		const rawPoints: [number, number][] = [
			[playerRef.current.position.x, playerRef.current.position.z],
			...(target.route ?? []).map((pt) => [pt[0], pt[2]] as [number, number]),
			[target.position[0], target.position[2]],
		];

		const sampled: Array<{ x: number; y: number; z: number }> = [];
		const STEP = 0.95;

		for (let i = 0; i < rawPoints.length - 1; i++) {
			const [x1, z1] = rawPoints[i];
			const [x2, z2] = rawPoints[i + 1];
			const dist = Math.hypot(x2 - x1, z2 - z1);
			const count = Math.max(1, Math.round(dist / STEP));

			for (let step = 0; step < count; step++) {
				const t = step / count;
				const x = x1 + (x2 - x1) * t;
				const z = z1 + (z2 - z1) * t;
				const bridgeY = getBridgeDeckHeight(x, z);
				const y = bridgeY !== null ? bridgeY + 0.04 : terrainHeight(x, z) + 0.08;
				sampled.push({ x, y, z });
			}
		}

		// Push final point
		const last = rawPoints[rawPoints.length - 1];
		const lastBridge = getBridgeDeckHeight(last[0], last[1]);
		sampled.push({
			x: last[0],
			y: lastBridge !== null ? lastBridge + 0.04 : terrainHeight(last[0], last[1]) + 0.08,
			z: last[1],
		});

		return sampled;
	}, [target, playerRef]);

	const beadGeometry = useMemo(() => {
		const geom = new CylinderGeometry(0.22, 0.22, 0.03, 10);
		return geom;
	}, []);

	const beadMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#38bdf8",
			emissive: "#0284c7",
			emissiveIntensity: 2.2,
			roughness: 0.2,
			metalness: 0.1,
			transparent: true,
			opacity: 0.88,
		});
	}, []);

	const targetGroundY = useMemo(() => {
		if (!target) return 0;
		const bridge = getBridgeDeckHeight(target.position[0], target.position[2]);
		return bridge !== null ? bridge + 0.05 : terrainHeight(target.position[0], target.position[2]) + 0.08;
	}, [target]);

	useFrame((_, delta) => {
		if (!target || trailPoints.length === 0 || !instancedMeshRef.current) return;
		pulseTime.current += delta;

		const dummy = new Object3D();
		const color = new Color();
		const baseColor = new Color("#38bdf8");
		const pulseColor = new Color("#facc15");

		for (let i = 0; i < trailPoints.length; i++) {
			const pt = trailPoints[i];
			dummy.position.set(pt.x, pt.y, pt.z);

			// Traveling light wave effect along the route
			const wave = Math.sin(pulseTime.current * 4.8 - i * 0.38) * 0.5 + 0.5;
			const scale = 0.85 + wave * 0.35;
			dummy.scale.set(scale, 1.0, scale);
			dummy.updateMatrix();
			instancedMeshRef.current.setMatrixAt(i, dummy.matrix);

			color.copy(baseColor).lerp(pulseColor, wave * 0.7);
			instancedMeshRef.current.setColorAt(i, color);
		}

		instancedMeshRef.current.instanceMatrix.needsUpdate = true;
		if (instancedMeshRef.current.instanceColor) {
			instancedMeshRef.current.instanceColor.needsUpdate = true;
		}

		if (targetRingRef.current) {
			targetRingRef.current.rotation.z += delta * 0.8;
		}
	});

	if (!target || trailPoints.length === 0) return null;

	return (
		<group>
			{/* Instanced Glowing Trail Beads along the exact route */}
			<instancedMesh
				ref={instancedMeshRef}
				args={[beadGeometry, beadMaterial, trailPoints.length]}
			/>

			{/* Radiant Destination Beacon Ring on the ground */}
			<group position={[target.position[0], targetGroundY, target.position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
				<mesh ref={targetRingRef}>
					<ringGeometry args={[0.9, 1.25, 24]} />
					<meshStandardMaterial
						color="#38bdf8"
						emissive="#38bdf8"
						emissiveIntensity={2.5}
						transparent
						opacity={0.82}
					/>
				</mesh>
				<mesh>
					<ringGeometry args={[1.4, 1.55, 24]} />
					<meshStandardMaterial
						color="#facc15"
						emissive="#f59e0b"
						emissiveIntensity={1.8}
						transparent
						opacity={0.65}
					/>
				</mesh>
			</group>
		</group>
	);
}
