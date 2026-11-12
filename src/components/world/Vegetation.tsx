"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
	Color,
	CylinderGeometry,
	DodecahedronGeometry,
	DoubleSide,
	Group,
	IcosahedronGeometry,
	InstancedMesh,
	MeshStandardMaterial,
	Object3D,
	Shape,
	ShapeGeometry,
	SphereGeometry,
	Vector2,
} from "three";

const SHARED_FLOWER_SPHERE_GEO = new SphereGeometry(1, 10, 8);
const SHARED_FLOWER_PLANTER_MAT = new MeshStandardMaterial({ color: "#8ba180", roughness: 0.88 });
const SHARED_FLOWER_SOIL_MAT = new MeshStandardMaterial({ color: "#4a3f32", roughness: 0.92 });
const SHARED_FLOWER_STAKE_MAT = new MeshStandardMaterial({ color: "#856142", roughness: 0.8 });
const SHARED_FLOWER_LABEL_MAT = new MeshStandardMaterial({ color: "#fef9ee", roughness: 0.7 });
const SHARED_FLOWER_STEM_MAT = new MeshStandardMaterial({ color: "#5a8c54", roughness: 0.7 });
const SHARED_FLOWER_LEAF_MAT = new MeshStandardMaterial({ color: "#7cb872", roughness: 0.65 });
const SHARED_FLOWER_CORE_MAT = new MeshStandardMaterial({
	color: "#fef08a",
	emissive: "#fde047",
	emissiveIntensity: 0.85,
	roughness: 0.25,
});
import { treePositions, worldPoints } from "@/data/world";
import { distanceToPaths, terrainHeight } from "@/components/world/terrain-utils";
import { rockPositions } from "@/components/world/world-colliders";
import { createProceduralSurfaceMaps } from "@/components/world/procedural-surface";
import type { WorldPoint } from "@/types/world";

type VegetationProps = {
	quality: "LOW" | "MEDIUM" | "HIGH";
	onActivate: (pointId: string) => void;
};

const flowerColors = [
	"#efb8cf",
	"#d2bde8",
	"#b8dbe2",
	"#efd9a9",
	"#c5dfc4",
	"#e9bdba",
	"#c9c2e6",
];

import {
	createCloudCanopyGeometry,
	createSculptedTrunkGeometry,
	createTieredAlpinePineGeometry,
} from "@/components/world/tree-geometries";

function Forest({ quality, reducedMotion }: { quality: VegetationProps["quality"]; reducedMotion: boolean }) {
	const count = quality === "LOW" ? Math.min(22, treePositions.length) : treePositions.length;
	const trees = useMemo(() => treePositions.slice(0, count), [count]);

	const trunks = useRef<InstancedMesh>(null);
	const pines = useRef<InstancedMesh>(null);
	const canopies = useRef<InstancedMesh>(null);

	const trunkGeometry = useMemo(() => createSculptedTrunkGeometry(), []);
	const pineCrownGeom = useMemo(() => createTieredAlpinePineGeometry(), []);
	const deciduousCrownGeom = useMemo(() => createCloudCanopyGeometry(), []);

	const windTime = useMemo(() => ({ value: 0 }), []);

	const foliageMaps = useMemo(() => createProceduralSurfaceMaps(37, 128, [2, 2]), []);

	const foliageMaterial = useMemo(() => {
		const material = new MeshStandardMaterial({
			roughness: 0.76,
			metalness: 0.02,
			side: DoubleSide,
			vertexColors: true,
			normalMap: foliageMaps.normalMap,
			roughnessMap: foliageMaps.roughnessMap,
			normalScale: new Vector2(0.18, 0.18),
		});

		material.onBeforeCompile = (shader) => {
			shader.uniforms.uWindTime = windTime;
			shader.vertexShader = `
				uniform float uWindTime;
				${shader.vertexShader}
			`;

			shader.vertexShader = shader.vertexShader.replace(
				"#include <begin_vertex>",
				`
				#include <begin_vertex>
				float instX = instanceMatrix[3].x;
				float instZ = instanceMatrix[3].z;
				float windFlutter = sin(uWindTime * 2.2 + instX * 0.4 + position.y * 2.5) * 0.05
				                  + cos(uWindTime * 1.4 + instZ * 0.35) * 0.03;
				float heightInfluence = max(0.0, position.y + 0.5);
				transformed.x += windFlutter * heightInfluence;
				transformed.z += windFlutter * 0.6 * heightInfluence;
				`
			);

			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <normal_fragment_maps>",
				`
				#include <normal_fragment_maps>
				float rim = 1.0 - max(dot(normal, vec3(0.0, 0.0, 1.0)), 0.0);
				diffuseColor.rgb += diffuseColor.rgb * pow(rim, 3.5) * 0.08;
				`
			);
		};

		material.customProgramCacheKey = () => "stylized-ghibli-foliage-v4";
		return material;
	}, [windTime, foliageMaps]);

	const barkMaps = useMemo(() => createProceduralSurfaceMaps(15, 128, [1, 3]), []);
	const barkMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#5c4028",
			roughness: 0.92,
			metalness: 0.02,
			vertexColors: true,
			normalMap: barkMaps.normalMap,
			roughnessMap: barkMaps.roughnessMap,
			normalScale: new Vector2(0.16, 0.36),
		});
	}, [barkMaps]);

	// Categorize trees into pines vs deciduous
	const { pineTreeData, deciduousTreeData } = useMemo(() => {
		const pineList: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string; treeIdx: number }> = [];
		const decList: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string; treeIdx: number }> = [];

		// Unified Alpine Valley Forest Palette:
		// Stately mountain pines & lush temperate oaks and maples with natural green tonal depth
		const pinePalette = ["#1a4325", "#23502d", "#2d5e37", "#1e3f26", "#284f30"];
		const deciduousPalette = ["#2d5e35", "#386b40", "#467c4e", "#548d5d", "#33643c", "#417349"];

		trees.forEach(([x, , z, scale], index) => {
			const ground = terrainHeight(x, z);
			const rotY = (index * 0.72) % (Math.PI * 2);

			// Pines on north ridge, lake perimeter, and interspersed naturally throughout the woodland
			const isPine = z < -18 || (x < -16 && z < -4) || (index % 3 === 0);

			if (isPine) {
				const col = pinePalette[index % pinePalette.length];
				pineList.push({ x, y: ground, z, scale, rotY, color: col, treeIdx: index });
			} else {
				const col = deciduousPalette[index % deciduousPalette.length];
				decList.push({ x, y: ground, z, scale, rotY, color: col, treeIdx: index });
			}
		});

		return { pineTreeData: pineList, deciduousTreeData: decList };
	}, [trees]);

	useLayoutEffect(() => {
		if (!trunks.current || !pines.current || !canopies.current) return;

		const transform = new Object3D();
		const color = new Color();

		// Set trunks for all trees (ground-aligned base at y = 0)
		trees.forEach(([x, , z, scale], index) => {
			const ground = terrainHeight(x, z);
			transform.position.set(x, ground, z);
			transform.rotation.set(0, (index * 0.72) % (Math.PI * 2), 0);
			transform.scale.set(scale, scale, scale);
			transform.updateMatrix();
			trunks.current?.setMatrixAt(index, transform.matrix);
		});
		trunks.current.instanceMatrix.needsUpdate = true;

		// Set Tiered Alpine Pine Foliage (ground-aligned, sits directly on trunk)
		pineTreeData.forEach((t, i) => {
			transform.position.set(t.x, t.y, t.z);
			transform.rotation.set(0, t.rotY, 0);
			transform.scale.set(t.scale, t.scale, t.scale);
			transform.updateMatrix();
			pines.current?.setMatrixAt(i, transform.matrix);
			color.set(t.color);
			pines.current?.setColorAt(i, color);
		});
		pines.current.instanceMatrix.needsUpdate = true;
		if (pines.current.instanceColor) pines.current.instanceColor.needsUpdate = true;

		// Set Cloud-Puffed Deciduous Foliage (ground-aligned, rests directly on branches)
		deciduousTreeData.forEach((t, i) => {
			transform.position.set(t.x, t.y, t.z);
			transform.rotation.set(0, t.rotY, 0);
			transform.scale.set(t.scale, t.scale, t.scale);
			transform.updateMatrix();
			canopies.current?.setMatrixAt(i, transform.matrix);
			color.set(t.color);
			canopies.current?.setColorAt(i, color);
		});
		canopies.current.instanceMatrix.needsUpdate = true;
		if (canopies.current.instanceColor) canopies.current.instanceColor.needsUpdate = true;
	}, [trees, pineTreeData, deciduousTreeData]);

	useFrame(({ clock }) => {
		if (reducedMotion) return;
		windTime.value = clock.elapsedTime;
	});

	return (
		<group>
			{/* Sculpted Trunks with Flared Root Base */}
			<instancedMesh ref={trunks} args={[trunkGeometry, barkMaterial, trees.length]} castShadow receiveShadow />

			{/* Tiered Alpine Pines */}
			<instancedMesh ref={pines} args={[pineCrownGeom, foliageMaterial, Math.max(1, pineTreeData.length)]} castShadow receiveShadow />

			{/* Cloud-Puffed Deciduous Crowns (Oak, Birch, Sakura) */}
			<instancedMesh ref={canopies} args={[deciduousCrownGeom, foliageMaterial, Math.max(1, deciduousTreeData.length)]} castShadow receiveShadow />
		</group>
	);
}

function StylizedRocks() {
	const meshRef = useRef<InstancedMesh>(null);
	const rockGeometry = useMemo(() => {
		const geom = new DodecahedronGeometry(1, 1);
		const pos = geom.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			const deform = 1.0 + Math.sin(x * 5.0 + y * 4.0) * 0.12;
			pos.setXYZ(i, x * deform, y * 0.75 * deform, z * deform);
		}
		geom.computeVertexNormals();
		return geom;
	}, []);

	const stoneMaps = useMemo(() => createProceduralSurfaceMaps(22, 128, [2, 2]), []);
	const stoneMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#8a968b",
			roughness: 0.88,
			metalness: 0.05,
			normalMap: stoneMaps.normalMap,
			roughnessMap: stoneMaps.roughnessMap,
			normalScale: new Vector2(0.2, 0.2),
		});
	}, [stoneMaps]);

	useLayoutEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const dummy = new Object3D();
		rockPositions.forEach(([x, z, height, scale], index) => {
			const y = terrainHeight(x, z) + height * 0.35;
			dummy.position.set(x, y, z);
			dummy.scale.set(scale * 1.2, height * 1.1, scale * 1.0);
			dummy.rotation.set(0.15, index * 0.95, -0.1);
			dummy.updateMatrix();
			mesh.setMatrixAt(index, dummy.matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
	}, []);

	return (
		<instancedMesh
			ref={meshRef}
			args={[rockGeometry, stoneMaterial, rockPositions.length]}
			castShadow
			receiveShadow
			frustumCulled={false}
		/>
	);
}

function Shrubs({ quality }: { quality: VegetationProps["quality"] }) {
	const meshRef = useRef<InstancedMesh>(null);
	const shrubCount = quality === "LOW" ? 12 : 28;
	const shrubGeom = useMemo(() => new IcosahedronGeometry(0.75, 1), []);
	const shrubMat = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#6b9c52",
			roughness: 0.75,
			metalness: 0.02,
		});
	}, []);

	const shrubInstances = useMemo(() => {
		const positions: [number, number, number, number][] = [];
		for (let i = 0; i < shrubCount; i++) {
			const angle = (i / shrubCount) * Math.PI * 2;
			const radius = 12 + ((i * 17) % 13);
			const x = Math.cos(angle) * radius;
			const z = Math.sin(angle) * radius;
			if (Math.abs(z - (-2.5 + Math.sin(x * 0.13) * 0.75)) > 2.2) {
				const y = terrainHeight(x, z);
				positions.push([x, y + 0.35, z, 0.7 + ((i * 7) % 5) * 0.1]);
			}
		}
		return positions;
	}, [shrubCount]);

	useLayoutEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		const dummy = new Object3D();
		shrubInstances.forEach(([x, y, z, scale], i) => {
			dummy.position.set(x, y, z);
			dummy.scale.set(scale * 1.1, scale * 0.85, scale * 1.0);
			dummy.rotation.set(0, i * 0.7, 0);
			dummy.updateMatrix();
			mesh.setMatrixAt(i, dummy.matrix);
		});
		mesh.instanceMatrix.needsUpdate = true;
	}, [shrubInstances]);

	return (
		<instancedMesh
			ref={meshRef}
			args={[shrubGeom, shrubMat, shrubInstances.length]}
			castShadow
			receiveShadow
			frustumCulled={false}
		/>
	);
}

function Flower({
	point,
	index,
	onActivate,
	reducedMotion,
}: {
	point: WorldPoint;
	index: number;
	onActivate: VegetationProps["onActivate"];
	reducedMotion: boolean;
}) {
	const flowerGroup = useRef<Group>(null);
	const petalColor = flowerColors[index % flowerColors.length];

	useFrame(({ clock }) => {
		if (flowerGroup.current && !reducedMotion) {
			flowerGroup.current.rotation.z = Math.sin(clock.elapsedTime * 1.6 + index * 1.2) * 0.08;
			flowerGroup.current.rotation.x = Math.cos(clock.elapsedTime * 1.2 + index) * 0.05;
		}
	});

	const ground = terrainHeight(point.position[0], point.position[2]);

	return (
		<group
			ref={flowerGroup}
			position={[point.position[0], ground, point.position[2]]}
			onClick={(event) => {
				event.stopPropagation();
				onActivate(point.id);
			}}
			onPointerOver={() => {
				document.body.style.cursor = "pointer";
			}}
			onPointerOut={() => {
				document.body.style.cursor = "";
			}}
		>
			{/* Ground stone planter border */}
			<mesh position={[0, 0.05, 0]} material={SHARED_FLOWER_PLANTER_MAT} castShadow receiveShadow>
				<cylinderGeometry args={[0.38, 0.44, 0.1, 10]} />
			</mesh>
			<mesh position={[0, 0.09, 0]} material={SHARED_FLOWER_SOIL_MAT}>
				<cylinderGeometry args={[0.33, 0.33, 0.04, 10]} />
			</mesh>
			{/* Wooden garden label stake */}
			<mesh position={[0.26, 0.18, 0.18]} material={SHARED_FLOWER_STAKE_MAT} castShadow>
				<cylinderGeometry args={[0.018, 0.018, 0.36, 6]} />
			</mesh>
			<mesh position={[0.26, 0.34, 0.18]} rotation={[0, -0.4, 0]} material={SHARED_FLOWER_LABEL_MAT}>
				<boxGeometry args={[0.28, 0.14, 0.03]} />
			</mesh>
			<mesh position={[0.26, 0.34, 0.2]}>
				<boxGeometry args={[0.08, 0.04, 0.01]} />
				<meshStandardMaterial color={petalColor} roughness={0.5} />
			</mesh>

			<mesh position={[0, 0.42, 0]} material={SHARED_FLOWER_STEM_MAT} castShadow>
				<cylinderGeometry args={[0.025, 0.045, 0.85, 8]} />
			</mesh>

			<mesh
				position={[0.12, 0.32, 0]}
				rotation={[0, 0, -0.6]}
				scale={[0.24, 0.09, 0.035]}
				geometry={SHARED_FLOWER_SPHERE_GEO}
				material={SHARED_FLOWER_LEAF_MAT}
			/>
			<mesh
				position={[-0.1, 0.45, 0.05]}
				rotation={[0, 0, 0.6]}
				scale={[0.2, 0.08, 0.035]}
				geometry={SHARED_FLOWER_SPHERE_GEO}
				material={SHARED_FLOWER_LEAF_MAT}
			/>

			<group position={[0, 0.86, 0]}>
				{Array.from({ length: 6 }, (_, petal) => {
					const angle = (petal / 6) * Math.PI * 2;
					return (
						<mesh
							key={petal}
							position={[Math.sin(angle) * 0.16, 0.02, Math.cos(angle) * 0.16]}
							rotation={[0.2, angle, 0]}
							scale={[0.12, 0.08, 0.22]}
							geometry={SHARED_FLOWER_SPHERE_GEO}
							castShadow
						>
							<meshStandardMaterial color={petalColor} roughness={0.48} metalness={0.05} />
						</mesh>
					);
				})}
				<mesh scale={0.14} geometry={SHARED_FLOWER_SPHERE_GEO} material={SHARED_FLOWER_CORE_MAT} castShadow />
			</group>
		</group>
	);
}

function WildflowerMeadow({ quality }: { quality: VegetationProps["quality"] }) {
	const stemMesh = useRef<InstancedMesh>(null);
	const bloomMesh = useRef<InstancedMesh>(null);
	const centerMesh = useRef<InstancedMesh>(null);
	const count = quality === "LOW" ? 48 : quality === "MEDIUM" ? 84 : 120;
	const stemGeometry = useMemo(() => new CylinderGeometry(0.008, 0.014, 1, 5), []);
	const bloomGeometry = useMemo(() => {
		const shape = new Shape();
		for (let vertex = 0; vertex < 10; vertex += 1) {
			const angle = (vertex / 10) * Math.PI * 2 - Math.PI / 2;
			const radius = vertex % 2 === 0 ? 0.11 : 0.055;
			const x = Math.cos(angle) * radius;
			const y = Math.sin(angle) * radius;
			if (vertex === 0) shape.moveTo(x, y);
			else shape.lineTo(x, y);
		}
		shape.closePath();
		const geometry = new ShapeGeometry(shape);
		geometry.rotateX(-Math.PI / 2);
		geometry.computeVertexNormals();
		return geometry;
	}, []);
	const centerGeometry = useMemo(() => new IcosahedronGeometry(0.035, 0), []);
	const stemMaterial = useMemo(() => new MeshStandardMaterial({ color: "#4e7745", roughness: 0.9 }), []);
	const bloomMaterial = useMemo(() => new MeshStandardMaterial({ color: "#ffffff", side: DoubleSide, roughness: 0.82 }), []);
	const centerMaterial = useMemo(() => new MeshStandardMaterial({ color: "#e8c967", roughness: 0.78 }), []);

	const flowerField = useMemo(() => {
		const patches: [number, number][] = [
			[-17, 7], [-17, -21], [18, 8], [18, -20], [-7, 20], [7, -30],
		];
		const stems: number[] = [];
		const blooms: number[] = [];
		const centers: number[] = [];
		const colors: string[] = [];
		const transform = new Object3D();

		for (let index = 0; index < count; index += 1) {
			const patchIndex = index % patches.length;
			const flowerIndex = Math.floor(index / patches.length);
			const angle = flowerIndex * 2.399963 + patchIndex * 0.51;
			const radius = 0.45 + Math.sqrt(flowerIndex + 0.5) * 0.18;
			const x = patches[patchIndex][0] + Math.cos(angle) * radius + Math.sin(index * 12.9) * 0.12;
			const z = patches[patchIndex][1] + Math.sin(angle) * radius + Math.cos(index * 7.2) * 0.12;
			const riverCenter = -2.5 + Math.sin(x * 0.13) * 0.75;
			if (distanceToPaths(x, z) < 1.5 || Math.abs(z - riverCenter) < 3.2) continue;

			const ground = terrainHeight(x, z);
			const stemHeight = 0.2 + (index % 5) * 0.035;
			transform.position.set(x, ground + stemHeight * 0.5, z);
			transform.rotation.set(0, angle * 0.2, Math.sin(index * 0.8) * 0.1);
			transform.scale.set(1, stemHeight, 1);
			transform.updateMatrix();
			stems.push(...transform.matrix.elements);

			const flowerScale = 0.52 + (index % 4) * 0.055;
			transform.position.set(x, ground + stemHeight, z);
			transform.rotation.set(0, angle, 0);
			transform.scale.setScalar(flowerScale);
			transform.updateMatrix();
			blooms.push(...transform.matrix.elements);

			transform.position.y += 0.008;
			transform.scale.setScalar(0.2);
			transform.updateMatrix();
			centers.push(...transform.matrix.elements);
			colors.push(flowerColors[(index + patchIndex * 2) % flowerColors.length]);
		}

		return {
			stems: new Float32Array(stems),
			blooms: new Float32Array(blooms),
			centers: new Float32Array(centers),
			colors,
		};
	}, [count]);

	useLayoutEffect(() => {
		if (!stemMesh.current || !bloomMesh.current || !centerMesh.current) return;
		const flowerCount = flowerField.colors.length;

		for (let index = 0; index < flowerCount; index += 1) {
			const offset = index * 16;
			stemMesh.current.instanceMatrix.array.set(flowerField.stems.subarray(offset, offset + 16), offset);
			bloomMesh.current.instanceMatrix.array.set(flowerField.blooms.subarray(offset, offset + 16), offset);
			centerMesh.current.instanceMatrix.array.set(flowerField.centers.subarray(offset, offset + 16), offset);
			bloomMesh.current.setColorAt(index, new Color(flowerField.colors[index]));
		}

		stemMesh.current.instanceMatrix.needsUpdate = true;
		bloomMesh.current.instanceMatrix.needsUpdate = true;
		centerMesh.current.instanceMatrix.needsUpdate = true;
		if (bloomMesh.current.instanceColor) bloomMesh.current.instanceColor.needsUpdate = true;
	}, [flowerField]);

	const flowerCount = flowerField.colors.length;
	if (!flowerCount) return null;

	return (
		<group>
			<instancedMesh ref={stemMesh} args={[stemGeometry, stemMaterial, flowerCount]} />
			<instancedMesh ref={bloomMesh} args={[bloomGeometry, bloomMaterial, flowerCount]} />
			<instancedMesh ref={centerMesh} args={[centerGeometry, centerMaterial, flowerCount]} />
		</group>
	);
}

function FairyMushrooms() {
	const stalkMeshRef = useRef<InstancedMesh>(null);
	const capMeshRef = useRef<InstancedMesh>(null);

	const mushrooms = useMemo(() => [
		{ x: -16.5, z: 12.8, scale: 0.32, color: "#f87171" },
		{ x: -16.2, z: 13.2, scale: 0.24, color: "#38bdf8" },
		{ x: -16.8, z: 13.0, scale: 0.18, color: "#f87171" },
		{ x: 17.5, z: -18.2, scale: 0.35, color: "#38bdf8" },
		{ x: 17.2, z: -17.8, scale: 0.22, color: "#c084fc" },
		{ x: 17.8, z: -18.5, scale: 0.28, color: "#f87171" },
		{ x: -8.0, z: -22.5, scale: 0.3, color: "#c084fc" },
		{ x: -7.6, z: -22.8, scale: 0.2, color: "#38bdf8" },
		{ x: 8.5, z: 19.5, scale: 0.32, color: "#f87171" },
		{ x: 8.8, z: 19.2, scale: 0.25, color: "#fde047" },
	], []);

	const stalkGeo = useMemo(() => new CylinderGeometry(0.15, 0.22, 0.9, 8), []);
	const capGeo = useMemo(() => new SphereGeometry(0.55, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), []);
	const stalkMat = useMemo(() => new MeshStandardMaterial({ color: "#fef9c3", roughness: 0.7 }), []);
	const capMat = useMemo(
		() => new MeshStandardMaterial({ color: "#ffffff", emissive: "#c4b5fd", emissiveIntensity: 0.25, roughness: 0.3 }),
		[],
	);

	useLayoutEffect(() => {
		const stalkMesh = stalkMeshRef.current;
		const capMesh = capMeshRef.current;
		if (!stalkMesh || !capMesh) return;
		const dummy = new Object3D();
		const color = new Color();

		mushrooms.forEach((m, i) => {
			const y = terrainHeight(m.x, m.z);
			dummy.scale.setScalar(m.scale);

			dummy.position.set(m.x, y + 0.45 * m.scale, m.z);
			dummy.updateMatrix();
			stalkMesh.setMatrixAt(i, dummy.matrix);

			dummy.position.set(m.x, y + 0.92 * m.scale, m.z);
			dummy.updateMatrix();
			capMesh.setMatrixAt(i, dummy.matrix);
			capMesh.setColorAt(i, color.set(m.color));
		});

		stalkMesh.instanceMatrix.needsUpdate = true;
		capMesh.instanceMatrix.needsUpdate = true;
		if (capMesh.instanceColor) capMesh.instanceColor.needsUpdate = true;
	}, [mushrooms]);

	return (
		<group>
			<instancedMesh ref={stalkMeshRef} args={[stalkGeo, stalkMat, mushrooms.length]} castShadow frustumCulled={false} />
			<instancedMesh ref={capMeshRef} args={[capGeo, capMat, mushrooms.length]} castShadow frustumCulled={false} />
		</group>
	);
}

export function Vegetation({ quality, onActivate }: VegetationProps) {
	const reducedMotion = Boolean(useReducedMotion());
	const flowers = worldPoints.filter((point) => point.kind === "human-skill" && point.id.startsWith("human-"));

	return (
		<group>
			<Forest quality={quality} reducedMotion={reducedMotion} />
			<StylizedRocks />
			<Shrubs quality={quality} />
			<WildflowerMeadow quality={quality} />
			<FairyMushrooms />
			{flowers.map((point, index) => (
				<Flower key={point.id} point={point} index={index} onActivate={onActivate} reducedMotion={reducedMotion} />
			))}
		</group>
	);
}
