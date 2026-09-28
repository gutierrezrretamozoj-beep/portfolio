"use client";

import { useMemo } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	CatmullRomCurve3,
	Color,
	DoubleSide,
	MeshStandardMaterial,
	PlaneGeometry,
	Vector3,
} from "three";
import { terrainHeight } from "@/components/world/terrain-utils";
import { InstancedGrass } from "@/components/world/InstancedGrass";
import type { PlayerRuntime } from "@/types/world";

const TERRAIN_WIDTH = 58;
const TERRAIN_DEPTH = 84;

export const paths: [number, number, number][][] = [
	[[0, 0, 24], [0, 0, 17], [0, 0, 9], [0, 0, 2], [0, 0, -5], [0, 0, -13], [0, 0, -22]],
	[[0, 0, 8], [-4, 0, 9], [-8, 0, 10], [-10, 0, 10]],
	[[0, 0, 8], [4, 0, 9], [8, 0, 10], [10, 0, 10]],
	[[0, 0, -10], [-5, 0, -10], [-10, 0, -10], [-14, 0, -10]],
	[[0, 0, -10], [5, 0, -10], [10, 0, -10], [14, 0, -10]],
	[[0, 0, 11], [-2, 0, 9], [-3, 0, 6]],
	[[0, 0, 11], [2, 0, 9], [3, 0, 6]],
];

export function distanceToPaths(x: number, z: number) {
	let nearestSquared = Infinity;
	for (const path of paths) {
		for (let index = 0; index < path.length - 1; index += 1) {
			const [startX, , startZ] = path[index];
			const [endX, , endZ] = path[index + 1];
			const segmentX = endX - startX;
			const segmentZ = endZ - startZ;
			const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
			const progress = Math.max(0, Math.min(1, ((x - startX) * segmentX + (z - startZ) * segmentZ) / lengthSquared));
			const offsetX = x - (startX + segmentX * progress);
			const offsetZ = z - (startZ + segmentZ * progress);
			nearestSquared = Math.min(nearestSquared, offsetX * offsetX + offsetZ * offsetZ);
		}
	}
	return Math.sqrt(nearestSquared);
}

function createTerrain() {
	const geometry = new PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, 120, 170);
	const positions = geometry.attributes.position;
	const colors: number[] = [];

	// Natural, soft Ghibli meadow palette - 100% matte organic ground
	const deepGrass = new Color("#528543");   // Rich meadow grass
	const lushGrass = new Color("#689b53");   // Vibrant natural green
	const warmMeadow = new Color("#7cae61");  // Warm sunlit grass
	const softClover = new Color("#5b8b4b");  // Natural clover patch
	const cliffRock = new Color("#6c7b66");   // Earthy cliff slope
	const pathSoil = new Color("#b8a379");    // Warm sandy loam along paths
	const riverBank = new Color("#55704d");   // Damp riverbank earth

	for (let index = 0; index < positions.count; index += 1) {
		const x = positions.getX(index);
		const z = -positions.getY(index);
		const height = terrainHeight(x, z);
		positions.setZ(index, height);

		// Multi-octave natural organic noise for lush meadow blending (no artificial grid tiling!)
		const n1 = Math.sin(x * 0.18 + z * 0.14) * 0.5 + 0.5;
		const n2 = Math.cos(x * 0.08 - z * 0.19) * 0.5 + 0.5;
		const n3 = Math.sin(x * 0.42 + z * 0.35) * 0.15;
		const meadowBlend = Math.max(0, Math.min(1, n1 * 0.6 + n2 * 0.4 + n3));

		const color = deepGrass.clone().lerp(lushGrass, meadowBlend);
		color.lerp(warmMeadow, Math.max(0, Math.min(0.65, (height - 0.15) * 0.3 + n2 * 0.2)));
		color.lerp(softClover, Math.max(0, Math.min(0.35, n3 * 1.5)));

		// River bank damp loam
		const riverCenter = -2.5 + Math.sin(x * 0.13) * 0.75;
		const distToRiver = Math.abs(z - riverCenter);
		if (distToRiver < 3.2) {
			const riverBlend = (1.0 - distToRiver / 3.2) * 0.45;
			color.lerp(riverBank, riverBlend);
		}

		// Cliff slope steepness
		if (height > 1.8) {
			const rockBlend = Math.min(0.6, (height - 1.8) * 0.4);
			color.lerp(cliffRock, rockBlend);
		}

		// Path soil blending
		const pathDistance = distanceToPaths(x, z);
		const pathBlend = Math.max(0, 1 - pathDistance / 2.6) ** 2 * 0.4;
		color.lerp(pathSoil, pathBlend);

		colors.push(color.r, color.g, color.b);
	}

	geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
	geometry.rotateX(-Math.PI / 2);
	geometry.computeVertexNormals();
	return geometry;
}

function createPath(points: [number, number, number][], width: number) {
	const curve = new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z)));
	const segments = 120;
	const positions: number[] = [];
	const indices: number[] = [];
	const uvs: number[] = [];

	for (let index = 0; index <= segments; index += 1) {
		const t = index / segments;
		const point = curve.getPoint(t);
		const tangent = curve.getTangent(t);
		const sideX = -tangent.z;
		const sideZ = tangent.x;

		for (const sign of [-1, 1]) {
			const x = point.x + sideX * width * 0.5 * sign;
			const z = point.z + sideZ * width * 0.5 * sign;
			positions.push(x, terrainHeight(x, z) + 0.075, z);
			uvs.push(sign === -1 ? 0 : 1, t * 15);
		}

		if (index < segments) {
			const start = index * 2;
			indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

type TerrainProps = {
	quality?: "LOW" | "MEDIUM" | "HIGH";
	playerRef?: { current: PlayerRuntime };
};

export function Terrain({ quality = "HIGH", playerRef }: TerrainProps) {
	const geometry = useMemo(() => createTerrain(), []);
	const pathGeometries = useMemo(() => paths.map((points) => createPath(points, 1.4)), []);

	// 100% Matte Natural Ground: zero tile shine, zero specular glare
	const terrainMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			vertexColors: true,
			roughness: 1.0,  // Pure matte natural earth & grass
			metalness: 0.0,  // Zero metallic reflection
			side: DoubleSide,
		});
	}, []);

	// Natural earth/sand pathway material with GPU PolygonOffset (no Z-fighting)
	const pathMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#bfa980", // Warm natural soil & gravel
			roughness: 1.0,   // Pure matte earth
			metalness: 0.0,
			polygonOffset: true,
			polygonOffsetFactor: -3.0,
			polygonOffsetUnits: -6.0,
			side: DoubleSide,
		});
	}, []);

	return (
		<group>
			{/* Main Natural Meadow Terrain */}
			<mesh geometry={geometry} material={terrainMaterial} receiveShadow />

			{/* Curving Natural Earth Pathways */}
			{pathGeometries.map((path, index) => (
				<mesh key={index} geometry={path} material={pathMaterial} receiveShadow />
			))}

			{/* Dynamic Instanced Grass */}
			<InstancedGrass quality={quality} playerRef={playerRef} distanceToPaths={distanceToPaths} />

			{/* Horizon Skirt placed deep below terrain to prevent edge flicker */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow>
				<planeGeometry args={[600, 600]} />
				<meshStandardMaterial color="#528543" roughness={1.0} metalness={0.0} />
			</mesh>
		</group>
	);
}
