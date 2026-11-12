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
import { distanceToPaths, paths, terrainHeight } from "@/components/world/terrain-utils";
import { InstancedGrass } from "@/components/world/InstancedGrass";
import type { PlayerRuntime } from "@/types/world";

const TERRAIN_WIDTH = 80;
const TERRAIN_DEPTH = 92;

function createTerrain() {
	const geometry = new PlaneGeometry(TERRAIN_WIDTH, TERRAIN_DEPTH, 110, 126);
	const positions = geometry.attributes.position;
	const colors: number[] = [];

	const deepGrass = new Color("#386332");
	const lushGrass = new Color("#5c9c45");
	const warmMeadow = new Color("#8ebc5c");
	const softClover = new Color("#52a348");
	const cliffRock = new Color("#737d6e");
	const pathSoil = new Color("#c7b38d");
	const riverBank = new Color("#3e633a");

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
	const segments = 40;
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
			roughness: 0.95,
			metalness: 0.0,
			side: DoubleSide,
		});
	}, []);

	// Natural earth/sand pathway material with GPU PolygonOffset (no Z-fighting)
	const pathMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#c2ae87",
			roughness: 0.95,
			metalness: 0.0,
			side: DoubleSide,
			polygonOffset: true,
			polygonOffsetFactor: -3.0,
			polygonOffsetUnits: -6.0,
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

			{/* Horizon Skirt placed just below terrain minimum height (-0.40) for a seamless horizon */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 0]}>
				<planeGeometry args={[600, 600]} />
				<meshBasicMaterial color="#386332" />
			</mesh>
		</group>
	);
}
