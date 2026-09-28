"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
	Color,
	ConeGeometry,
	CylinderGeometry,
	DodecahedronGeometry,
	DoubleSide,
	Group,
	IcosahedronGeometry,
	InstancedMesh,
	MeshStandardMaterial,
	Object3D,
} from "three";
import { treePositions, worldPoints } from "@/data/world";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { WorldPoint } from "@/types/world";

type VegetationProps = {
	quality: "LOW" | "MEDIUM" | "HIGH";
	onActivate: (pointId: string) => void;
};

const foliagePalettes = [
	{ base: "#416e3c", mid: "#6fa754", tip: "#a6d66e" },
	{ base: "#376246", mid: "#57956a", tip: "#8fd59b" },
	{ base: "#596e38", mid: "#88a34b", tip: "#c8df72" },
	{ base: "#6e4560", mid: "#a8688c", tip: "#f4a8cb" },
	{ base: "#484f73", mid: "#6b77a7", tip: "#b4c3e8" },
];

const flowerColors = [
	"#f472b6",
	"#c084fc",
	"#38bdf8",
	"#facc15",
	"#4ade80",
	"#fb7185",
	"#a78bfa",
];

function createStylizedCanopyGeometry(radius: number, detail: number) {
	const geometry = new IcosahedronGeometry(radius, detail);
	const positions = geometry.attributes.position;
	const normals = geometry.attributes.normal;

	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		const y = positions.getY(i);
		const z = positions.getZ(i);

		const noise = 1.0 + Math.sin(x * 3.5 + y * 2.2) * 0.12 + Math.cos(z * 3.1 - y * 2.8) * 0.08;
		positions.setXYZ(i, x * noise, y * (noise * 0.9 + 0.1), z * noise);
	}

	geometry.computeVertexNormals();

	for (let i = 0; i < normals.count; i++) {
		const nx = positions.getX(i);
		const ny = positions.getY(i) * 0.8;
		const nz = positions.getZ(i);
		const len = Math.hypot(nx, ny, nz) || 1;
		normals.setXYZ(i, nx / len, ny / len, nz / len);
	}

	return geometry;
}

function createTrunkGeometry() {
	const geometry = new CylinderGeometry(0.18, 0.42, 2.2, 8, 4);
	const positions = geometry.attributes.position;

	for (let i = 0; i < positions.count; i++) {
		const x = positions.getX(i);
		const y = positions.getY(i);
		const z = positions.getZ(i);

		const rootFactor = Math.max(0, -y - 0.4) * 0.55;
		const angle = Math.atan2(z, x);
		const flare = 1.0 + rootFactor * (1.0 + Math.cos(angle * 4.0) * 0.4);

		positions.setXYZ(i, x * flare, y, z * flare);
	}

	geometry.computeVertexNormals();
	return geometry;
}

function Forest({ quality, reducedMotion }: { quality: VegetationProps["quality"]; reducedMotion: boolean }) {
	const count = quality === "LOW" ? 22 : quality === "MEDIUM" ? 34 : treePositions.length;
	const trees = useMemo(() => treePositions.slice(0, count), [count]);

	const trunks = useRef<InstancedMesh>(null);
	const mainCanopies = useRef<InstancedMesh>(null);
	const subCanopies = useRef<InstancedMesh>(null);
	const pines = useRef<InstancedMesh>(null);

	const trunkGeometry = useMemo(() => createTrunkGeometry(), []);
	const mainCrownGeom = useMemo(() => createStylizedCanopyGeometry(1.4, 2), []);
	const subCrownGeom = useMemo(() => createStylizedCanopyGeometry(1.0, 2), []);
	const pineGeometry = useMemo(() => new ConeGeometry(1.3, 2.4, 8, 2), []);

	const windTime = useMemo(() => ({ value: 0 }), []);

	const foliageMaterial = useMemo(() => {
		const material = new MeshStandardMaterial({
			roughness: 0.72,
			metalness: 0.04,
			vertexColors: true,
			side: DoubleSide,
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
				"#include <color_fragment>",
				`
				#include <color_fragment>
				float rim = 1.0 - max(dot(geometryNormal, vec3(0.0, 0.0, 1.0)), 0.0);
				diffuseColor.rgb += diffuseColor.rgb * pow(rim, 3.5) * 0.22;
				`
			);
		};

		material.customProgramCacheKey = () => "stylized-ghibli-foliage-v2";
		return material;
	}, [windTime]);

	const barkMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#755239",
			roughness: 0.92,
			metalness: 0.02,
		});
	}, []);

	useLayoutEffect(() => {
		if (!trunks.current || !mainCanopies.current || !subCanopies.current || !pines.current) return;

		const transform = new Object3D();
		const color = new Color();
		let mainIndex = 0;
		let subIndex = 0;
		let pineIndex = 0;

		trees.forEach(([x, , z, scale], index) => {
			const ground = terrainHeight(x, z);
			const palette = foliagePalettes[index % foliagePalettes.length];

			transform.position.set(x, ground + scale * 1.05, z);
			transform.rotation.set(0, (index * 0.72) % (Math.PI * 2), 0);
			transform.scale.set(scale, scale, scale);
			transform.updateMatrix();
			trunks.current?.setMatrixAt(index, transform.matrix);

			if (index % 4 === 0) {
				transform.position.set(x, ground + scale * 2.35, z);
				transform.scale.set(scale * 1.05, scale * 1.55, scale * 1.05);
				transform.rotation.set(0, index * 0.45, 0);
				transform.updateMatrix();
				pines.current?.setMatrixAt(pineIndex, transform.matrix);
				pines.current?.setColorAt(pineIndex, color.set(palette.mid));
				pineIndex++;
				return;
			}

			transform.position.set(x, ground + scale * 2.45, z);
			transform.rotation.set(0.1, index * 0.6, -0.05);
			transform.scale.set(scale * 1.15, scale * 1.1, scale * 1.15);
			transform.updateMatrix();
			mainCanopies.current?.setMatrixAt(mainIndex, transform.matrix);
			mainCanopies.current?.setColorAt(mainIndex, color.set(palette.tip));
			mainIndex++;

			const angle = index * 1.1;
			const lobeOffsetX = Math.cos(angle) * (scale * 0.55);
			const lobeOffsetZ = Math.sin(angle) * (scale * 0.55);
			transform.position.set(x + lobeOffsetX, ground + scale * 2.15, z + lobeOffsetZ);
			transform.rotation.set(-0.15, index * 0.8, 0.1);
			transform.scale.set(scale * 0.95, scale * 0.95, scale * 0.95);
			transform.updateMatrix();
			subCanopies.current?.setMatrixAt(subIndex, transform.matrix);
			subCanopies.current?.setColorAt(subIndex, color.set(palette.mid));
			subIndex++;
		});

		trunks.current.instanceMatrix.needsUpdate = true;
		mainCanopies.current.instanceMatrix.needsUpdate = true;
		subCanopies.current.instanceMatrix.needsUpdate = true;
		pines.current.instanceMatrix.needsUpdate = true;

		if (mainCanopies.current.instanceColor) mainCanopies.current.instanceColor.needsUpdate = true;
		if (subCanopies.current.instanceColor) subCanopies.current.instanceColor.needsUpdate = true;
		if (pines.current.instanceColor) pines.current.instanceColor.needsUpdate = true;
	}, [trees]);

	useFrame(({ clock }) => {
		if (reducedMotion) return;
		windTime.value = clock.elapsedTime;
	});

	return (
		<group>
			<instancedMesh ref={trunks} args={[trunkGeometry, barkMaterial, trees.length]} castShadow receiveShadow />
			<instancedMesh ref={mainCanopies} args={[mainCrownGeom, foliageMaterial, trees.length]} castShadow receiveShadow />
			<instancedMesh ref={subCanopies} args={[subCrownGeom, foliageMaterial, trees.length]} castShadow receiveShadow />
			<instancedMesh ref={pines} args={[pineGeometry, foliageMaterial, Math.max(1, Math.ceil(trees.length / 4))]} castShadow receiveShadow />
		</group>
	);
}

const rockPositions: [number, number, number, number][] = [
	[-27, -2.7, 0.7, 1.2], [-25, -3.4, 0.45, 0.8], [-19, -2.1, 0.55, 1],
	[-12, -3.5, 0.5, 0.8], [-7, -2.3, 0.42, 0.9], [7, -3.1, 0.55, 1.1],
	[13, -1.8, 0.5, 0.85], [18, -3.3, 0.6, 1.1], [25, -1.9, 0.47, 0.8],
	[-5, -24.4, 0.36, 0.7], [4, -25, 0.32, 0.66], [-7, -28, 0.4, 0.75],
	[8, -29, 0.44, 0.84], [-6, -32, 0.48, 0.9], [6, -33, 0.4, 0.72],
];

export const worldColliders = [
	...treePositions.map(([x, , z, scale]) => ({ x, z, radius: 0.62 + scale * 0.3 })),
	{ x: 10, z: 10, radius: 2.7 },
	{ x: 0, z: -18, radius: 2.7 },
	...rockPositions.map(([x, z, , scale]) => ({ x, z, radius: scale * 0.6 })),
];

function StylizedRocks() {
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

	const stoneMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#8a968b",
			roughness: 0.88,
			metalness: 0.05,
		});
	}, []);

	return (
		<group>
			{rockPositions.map(([x, z, height, scale], index) => {
				const y = terrainHeight(x, z) + height * 0.35;
				return (
					<mesh
						key={index}
						geometry={rockGeometry}
						material={stoneMaterial}
						position={[x, y, z]}
						scale={[scale * 1.2, height * 1.1, scale * 1.0]}
						rotation={[0.15, index * 0.95, -0.1]}
						castShadow
						receiveShadow
					/>
				);
			})}
		</group>
	);
}

function Shrubs({ quality }: { quality: VegetationProps["quality"] }) {
	const shrubCount = quality === "LOW" ? 12 : 28;
	const shrubGeom = useMemo(() => createStylizedCanopyGeometry(0.75, 1), []);
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

	return (
		<group>
			{shrubInstances.map(([x, y, z, scale], i) => (
				<mesh
					key={i}
					geometry={shrubGeom}
					material={shrubMat}
					position={[x, y, z]}
					scale={[scale * 1.1, scale * 0.85, scale * 1.0]}
					castShadow
					receiveShadow
				/>
			))}
		</group>
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
			<mesh position={[0, 0.42, 0]} castShadow>
				<cylinderGeometry args={[0.025, 0.045, 0.85, 8]} />
				<meshStandardMaterial color="#5a8c54" roughness={0.7} />
			</mesh>

			<mesh position={[0.12, 0.32, 0]} rotation={[0, 0, -0.6]} scale={[0.24, 0.09, 0.035]}>
				<sphereGeometry args={[1, 10, 8]} />
				<meshStandardMaterial color="#7cb872" roughness={0.65} />
			</mesh>
			<mesh position={[-0.1, 0.45, 0.05]} rotation={[0, 0, 0.6]} scale={[0.2, 0.08, 0.035]}>
				<sphereGeometry args={[1, 10, 8]} />
				<meshStandardMaterial color="#7cb872" roughness={0.65} />
			</mesh>

			<group position={[0, 0.86, 0]}>
				{Array.from({ length: 6 }, (_, petal) => {
					const angle = (petal / 6) * Math.PI * 2;
					return (
						<mesh
							key={petal}
							position={[Math.sin(angle) * 0.16, 0.02, Math.cos(angle) * 0.16]}
							rotation={[0.2, angle, 0]}
							scale={[0.12, 0.08, 0.22]}
							castShadow
						>
							<sphereGeometry args={[1, 12, 10]} />
							<meshStandardMaterial color={petalColor} roughness={0.48} metalness={0.05} />
						</mesh>
					);
				})}
				<mesh scale={0.12} castShadow>
					<sphereGeometry args={[1, 12, 10]} />
					<meshStandardMaterial
						color="#fde047"
						emissive="#fde047"
						emissiveIntensity={0.25}
						roughness={0.4}
					/>
				</mesh>
			</group>
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
			{flowers.map((point, index) => (
				<Flower key={point.id} point={point} index={index} onActivate={onActivate} reducedMotion={reducedMotion} />
			))}
		</group>
	);
}
