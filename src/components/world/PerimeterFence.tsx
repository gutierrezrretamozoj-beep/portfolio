"use client";

import { useMemo, useRef, useLayoutEffect } from "react";
import {
	BoxGeometry,
	Color,
	InstancedMesh,
	MeshStandardMaterial,
	Object3D,
} from "three";
import { terrainHeight } from "@/components/world/terrain-utils";

function riverCurve(x: number) {
	return -2.5 + Math.sin(x * 0.13) * 0.75;
}

// Perimeter bounds for the fence line
const FENCE_LIMITS = {
	minX: -26.5,
	maxX: 26.5,
	minZ: -36.5,
	maxZ: 25.5,
};

type PostNode = { x: number; z: number; y: number };

export function PerimeterFence({ isNight = false }: { isNight?: boolean }) {
	const postsRef = useRef<InstancedMesh>(null);
	const railsRef = useRef<InstancedMesh>(null);

	// Generate boundary fence line points
	const { posts, rails, riverPortals } = useMemo(() => {
		const postList: PostNode[] = [];
		const railList: Array<{ from: PostNode; to: PostNode }> = [];
		const portals: Array<{ x: number; z: number; angle: number }> = [];

		const step = 2.2; // Distance between fence posts

		// Helper to sample segment
		const addEdge = (
			startX: number,
			startZ: number,
			endX: number,
			endZ: number,
			isWestOrEast: boolean
		) => {
			const totalDist = Math.hypot(endX - startX, endZ - startZ);
			const count = Math.round(totalDist / step);
			let lastPost: PostNode | null = null;

			for (let i = 0; i <= count; i++) {
				const t = i / count;
				const x = startX + (endX - startX) * t;
				const z = startZ + (endZ - startZ) * t;

				// Check if this post is inside a river crossing
				if (isWestOrEast) {
					const rCenter = riverCurve(x);
					if (Math.abs(z - rCenter) < 2.2) {
						// River opening: skip standard post, break rail continuity
						lastPost = null;
						continue;
					}
				}

				const y = terrainHeight(x, z);
				const node: PostNode = { x, y, z };
				postList.push(node);

				if (lastPost) {
					railList.push({ from: lastPost, to: node });
				}
				lastPost = node;
			}
		};

		// 1. South Boundary: West to East
		addEdge(FENCE_LIMITS.minX, FENCE_LIMITS.maxZ, FENCE_LIMITS.maxX, FENCE_LIMITS.maxZ, false);

		// 2. East Boundary: South to North (with river opening)
		addEdge(FENCE_LIMITS.maxX, FENCE_LIMITS.maxZ, FENCE_LIMITS.maxX, FENCE_LIMITS.minZ, true);

		// 3. North Boundary: East to West (behind cabin & lake)
		addEdge(FENCE_LIMITS.maxX, FENCE_LIMITS.minZ, FENCE_LIMITS.minX, FENCE_LIMITS.minZ, false);

		// 4. West Boundary: North to South (with river opening)
		addEdge(FENCE_LIMITS.minX, FENCE_LIMITS.minZ, FENCE_LIMITS.minX, FENCE_LIMITS.maxZ, true);

		// River portals on East and West boundaries
		portals.push({
			x: FENCE_LIMITS.minX,
			z: riverCurve(FENCE_LIMITS.minX),
			angle: 0,
		});
		portals.push({
			x: FENCE_LIMITS.maxX,
			z: riverCurve(FENCE_LIMITS.maxX),
			angle: Math.PI,
		});

		return { posts: postList, rails: railList, riverPortals: portals };
	}, []);

	// Post Geometry (Rustic chamfered timber post)
	const postGeometry = useMemo(() => {
		return new BoxGeometry(0.24, 1.25, 0.24);
	}, []);

	// Rail Geometry (Unit rail scaled to distance)
	const railGeometry = useMemo(() => {
		return new BoxGeometry(1, 0.09, 0.09);
	}, []);

	// Timber Material
	const woodMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#5c4028",
			roughness: 0.88,
			metalness: 0.02,
		});
	}, []);

	const stoneMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#6b7280",
			roughness: 0.92,
			metalness: 0.04,
		});
	}, []);

	const lanternEmissive = isNight ? "#fde047" : "#0f172a";

	useLayoutEffect(() => {
		if (!postsRef.current || !railsRef.current) return;

		const dummy = new Object3D();
		const color = new Color();
		const baseWood = new Color("#5c4028");

		// Place fence posts
		posts.forEach((p, i) => {
			dummy.position.set(p.x, p.y + 0.55, p.z);
			// Gentle organic rotation variance
			const rotY = (p.x * 3.7 + p.z * 5.1) % 0.3 - 0.15;
			dummy.rotation.set(0, rotY, 0);
			dummy.scale.set(1, 1, 1);
			dummy.updateMatrix();
			postsRef.current?.setMatrixAt(i, dummy.matrix);

			// Subtle color variance
			const tint = ((p.x * 2.1 + p.z * 1.7) % 0.12) - 0.06;
			color.copy(baseWood).offsetHSL(0, 0, tint);
			postsRef.current?.setColorAt(i, color);
		});
		postsRef.current.instanceMatrix.needsUpdate = true;
		if (postsRef.current.instanceColor) postsRef.current.instanceColor.needsUpdate = true;

		// Place rails (2 horizontal crossbars per span)
		let railIndex = 0;

		rails.forEach(({ from, to }) => {
			const dx = to.x - from.x;
			const dy = to.y - from.y;
			const dz = to.z - from.z;
			const spanDist = Math.hypot(dx, dz);
			const fullDist = Math.sqrt(dx * dx + dy * dy + dz * dz);
			const yaw = Math.atan2(dx, dz);
			const pitch = -Math.atan2(dy, spanDist);

			for (const railHeight of [0.42, 0.86]) {
				const midX = (from.x + to.x) * 0.5;
				const midY = (from.y + to.y) * 0.5 + railHeight;
				const midZ = (from.z + to.z) * 0.5;

				dummy.position.set(midX, midY, midZ);
				dummy.rotation.set(0, yaw - Math.PI / 2, pitch);
				dummy.scale.set(fullDist + 0.1, 1, 1);
				dummy.updateMatrix();

				railsRef.current?.setMatrixAt(railIndex, dummy.matrix);
				color.copy(baseWood).offsetHSL(0, 0, (railIndex % 2 === 0 ? 0.02 : -0.02));
				railsRef.current?.setColorAt(railIndex, color);
				railIndex++;
			}
		});

		railsRef.current.instanceMatrix.needsUpdate = true;
		if (railsRef.current.instanceColor) railsRef.current.instanceColor.needsUpdate = true;
	}, [posts, rails]);

	return (
		<group name="perimeter-fence">
			{/* Instanced Boundary Fence Posts */}
			<instancedMesh
				ref={postsRef}
				args={[postGeometry, woodMaterial, posts.length]}
				castShadow
				receiveShadow
			/>

			{/* Instanced Boundary Fence Horizontal Rails */}
			<instancedMesh
				ref={railsRef}
				args={[railGeometry, woodMaterial, rails.length * 2]}
				castShadow
				receiveShadow
			/>

			{/* River Boundary Portals (Where the river enters and leaves the valley) */}
			{riverPortals.map((portal, idx) => {
				const groundN = terrainHeight(portal.x, portal.z - 2.1);
				const groundS = terrainHeight(portal.x, portal.z + 2.1);
				const midY = (groundN + groundS) * 0.5;

				return (
					<group key={idx} position={[portal.x, 0, portal.z]}>
						{/* North Riverbank Pylon */}
						<group position={[0, 0, -2.15]}>
							<mesh position={[0, groundN + 0.35, 0]} material={stoneMaterial} castShadow>
								<cylinderGeometry args={[0.32, 0.38, 0.7, 8]} />
							</mesh>
							<mesh position={[0, groundN + 1.6, 0]} material={woodMaterial} castShadow>
								<boxGeometry args={[0.3, 2.0, 0.3]} />
							</mesh>
						</group>

						{/* South Riverbank Pylon */}
						<group position={[0, 0, 2.15]}>
							<mesh position={[0, groundS + 0.35, 0]} material={stoneMaterial} castShadow>
								<cylinderGeometry args={[0.32, 0.38, 0.7, 8]} />
							</mesh>
							<mesh position={[0, groundS + 1.6, 0]} material={woodMaterial} castShadow>
								<boxGeometry args={[0.3, 2.0, 0.3]} />
							</mesh>
						</group>

						{/* Overhead Timber Arch Header */}
						<mesh position={[0, midY + 2.5, 0]} material={woodMaterial} castShadow>
							<boxGeometry args={[0.32, 0.28, 4.8]} />
						</mesh>

						{/* Hanging Decorative River Boundary Lantern */}
						<group position={[0, midY + 2.1, 0]}>
							<mesh material={woodMaterial} scale={[0.04, 0.3, 0.04]}>
								<cylinderGeometry args={[1, 1, 1, 6]} />
							</mesh>
							<mesh position={[0, -0.22, 0]}>
								<boxGeometry args={[0.22, 0.28, 0.22]} />
								<meshStandardMaterial
									color="#1e293b"
									emissive={lanternEmissive}
									emissiveIntensity={isNight ? 1.4 : 0.2}
									roughness={0.4}
								/>
							</mesh>
						</group>
					</group>
				);
			})}
		</group>
	);
}
