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
	Vector2,
	Vector3,
} from "three";
import { terrainHeight } from "@/components/world/terrain-utils";
import { InstancedGrass } from "@/components/world/InstancedGrass";
import { createProceduralSurfaceMaps } from "@/components/world/procedural-surface";
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

	const deepGrass = new Color("#5b8f52");
	const lushGrass = new Color("#7eb56e");
	const sunlitGrass = new Color("#b1d77a");
	const cliffRock = new Color("#7d8c76");
	const pathSoil = new Color("#d1c09b");
	const riverBank = new Color("#6b8865");

	for (let index = 0; index < positions.count; index += 1) {
		const x = positions.getX(index);
		const z = -positions.getY(index);
		const height = terrainHeight(x, z);
		positions.setZ(index, height);

		const noisePatch = (Math.sin(x * 0.28 + z * 0.17) + Math.cos(x * 0.12 - z * 0.25)) * 0.25 + 0.5;
		const color = deepGrass.clone().lerp(lushGrass, noisePatch);
		color.lerp(sunlitGrass, Math.max(0, Math.min(0.7, (height - 0.2) * 0.35)));

		const riverCenter = -2.5 + Math.sin(x * 0.13) * 0.75;
		const distToRiver = Math.abs(z - riverCenter);
		if (distToRiver < 3.2) {
			const riverBlend = (1.0 - distToRiver / 3.2) * 0.45;
			color.lerp(riverBank, riverBlend);
		}

		if (height > 1.8) {
			const rockBlend = Math.min(0.65, (height - 1.8) * 0.45);
			color.lerp(cliffRock, rockBlend);
		}

		const pathDistance = distanceToPaths(x, z);
		const pathBlend = Math.max(0, 1 - pathDistance / 2.6) ** 2 * 0.45;
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
			// Safe physical elevation +0.075m above terrain
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
	const grassMaps = useMemo(() => createProceduralSurfaceMaps(4, 128, [12, 16]), []);
	const pathMaps = useMemo(() => createProceduralSurfaceMaps(9, 128, [2, 1]), []);

	const terrainMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			vertexColors: true,
			roughness: 0.88,
			metalness: 0.04,
			normalMap: grassMaps.normalMap,
			roughnessMap: grassMaps.roughnessMap,
			normalScale: new Vector2(0.28, 0.28),
			side: DoubleSide,
		});
	}, [grassMaps]);

	// Professional Anti-ZFighting Path Material with GPU PolygonOffset
	const pathMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#c9b48b",
			roughness: 0.94,
			metalness: 0.02,
			normalMap: pathMaps.normalMap,
			roughnessMap: pathMaps.roughnessMap,
			normalScale: new Vector2(0.12, 0.3),
			polygonOffset: true,
			polygonOffsetFactor: -3.0,
			polygonOffsetUnits: -6.0,
			side: DoubleSide,
		});
	}, [pathMaps]);

	return (
		<group>
			{/* Main Terrain */}
			<mesh geometry={geometry} material={terrainMaterial} receiveShadow />

			{/* Curving Pathways (Zero Z-fighting) */}
			{pathGeometries.map((path, index) => (
				<mesh key={index} geometry={path} material={pathMaterial} receiveShadow />
			))}

			{/* Dynamic Instanced Grass */}
			<InstancedGrass quality={quality} playerRef={playerRef} distanceToPaths={distanceToPaths} />

			{/* Horizon Skirt placed deep below terrain to prevent any edge flicker */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.8, 0]} receiveShadow>
				<planeGeometry args={[600, 600]} />
				<meshStandardMaterial color="#6a9e5e" roughness={0.95} />
			</mesh>
		</group>
	);
}
