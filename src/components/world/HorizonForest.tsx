"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	Color,
	DoubleSide,
	IcosahedronGeometry,
	InstancedMesh,
	MathUtils,
	MeshStandardMaterial,
	Object3D,
} from "three";
import {
	createCloudCanopyGeometry,
	createFacetedBushGeometry,
	createLowPolyRockGeometry,
	createSculptedTrunkGeometry,
	createTieredAlpinePineGeometry,
} from "@/components/world/tree-geometries";

/**
 * Natural rolling foothills gently embracing the horizon
 * Scaled softly so they ground the valley perimeter without blocking views of the sky, mountains, sun, and moon.
 */
const hillConfigs: Array<{ pos: [number, number, number]; scale: [number, number, number]; color: string }> = [
	// Northwest and Northeast distant low foothills (keeping central vista open to mountains and sky)
	{ pos: [-38, 0.4, -54], scale: [20, 2.2, 14], color: "#48723c" },
	{ pos: [38, 0.4, -54], scale: [20, 2.2, 14], color: "#3d6034" },

	// West wooded ridge (framing north and south of the river valley)
	{ pos: [-46, 0.5, -24], scale: [18, 2.4, 15], color: "#446e39" },
	{ pos: [-44, 0.4, 16], scale: [16, 2.2, 13], color: "#3e6335" },
	{ pos: [-40, 0.4, 30], scale: [18, 2.2, 18], color: "#4a753e" },

	// East wooded ridge (framing north and south of the river valley)
	{ pos: [46, 0.5, -24], scale: [18, 2.4, 15], color: "#426a38" },
	{ pos: [44, 0.4, 17], scale: [17, 2.2, 13], color: "#4b763f" },
	{ pos: [40, 0.4, 28], scale: [18, 2.2, 18], color: "#3f6636" },

	// South gentle hills framing the starting valley
	{ pos: [-24, 0.3, 44], scale: [20, 2.0, 15], color: "#48723c" },
	{ pos: [2, 0.3, 48], scale: [24, 2.2, 16], color: "#3d6234" },
	{ pos: [26, 0.3, 44], scale: [20, 2.0, 15], color: "#4a753e" },
];

export function HorizonForest({ isNight = false }: { isNight?: boolean }) {
	const pineFoliageGeom = useMemo(() => createTieredAlpinePineGeometry(), []);
	const deciduousFoliageGeom = useMemo(() => createCloudCanopyGeometry(), []);
	const trunkGeom = useMemo(() => createSculptedTrunkGeometry(), []);
	const bushGeom = useMemo(() => createFacetedBushGeometry(), []);
	const rockGeom = useMemo(() => createLowPolyRockGeometry(), []);

	const pineMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			roughness: 0.85,
			metalness: 0.02,
			side: DoubleSide,
			vertexColors: true,
		});
	}, []);

	const deciduousMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			roughness: 0.82,
			metalness: 0.02,
			side: DoubleSide,
			vertexColors: true,
		});
	}, []);

	const trunkMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			color: "#5c4028",
			roughness: 0.94,
			metalness: 0.0,
			vertexColors: true,
		});
	}, []);

	const bushMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			roughness: 0.82,
			metalness: 0.02,
			side: DoubleSide,
			vertexColors: true,
		});
	}, []);

	const rockMaterial = useMemo(() => {
		return new MeshStandardMaterial({
			roughness: 0.92,
			metalness: 0.04,
			vertexColors: true,
		});
	}, []);

	const hillGeometry = useMemo(() => {
		const shape = new IcosahedronGeometry(1, 2);
		const pos = shape.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);
			const flattenedY = y < 0 ? y * 0.22 : y;
			const noise = 1.0 + Math.sin(x * 2.8 + z * 2.2) * 0.1;
			pos.setXYZ(i, x * noise, flattenedY * noise, z * noise);
		}
		shape.computeVertexNormals();
		return shape;
	}, []);

	// Structured, well-spaced vegetation: Pines, Deciduous, Bushes, and Boulders
	const { pineTrees, deciduousTrees, bushes, rocks } = useMemo(() => {
		const pines: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string }> = [];
		const deciduous: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string }> = [];
		const shrubList: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string }> = [];
		const rockList: Array<{ x: number; y: number; z: number; scale: number; rotY: number; color: string }> = [];

		// Unified Mountain Forest Palettes (Lush alpine evergreens and temperate oaks)
		const pinePalette = ["#1a4325", "#23502d", "#2d5e37", "#1e3f26", "#284f30"];
		const deciduousPalette = ["#2b5733", "#34643c", "#417449", "#4e8557", "#396a41"];
		const bushPalette = ["#47724f", "#3c6344", "#55805d", "#5c8464", "#436a4b"];
		const rockPalette = ["#526058", "#5c6b64", "#4a5951", "#6b7280", "#78716c"];

		let seed = 91;
		const pseudoRandom = () => {
			seed = (seed * 9301 + 49297) % 233280;
			return seed / 233280;
		};

		// 1. Sector Norte (North Foothills):
		// Flanking northwest and northeast shoulders, keeping the center vista (lake and snow peaks) open.
		for (let i = 0; i < 26; i++) {
			const side = i % 2 === 0 ? -1 : 1;
			const angle = side < 0
				? MathUtils.lerp(-Math.PI * 0.88, -Math.PI * 0.62, pseudoRandom())
				: MathUtils.lerp(-Math.PI * 0.38, -Math.PI * 0.12, pseudoRandom());
			const rad = MathUtils.lerp(42, 60, pseudoRandom());
			const x = Math.cos(angle) * rad;
			const z = Math.sin(angle) * rad * 1.1;
			const y = 2.4 + Math.sin(x * 0.08) * 1.2 + (rad - 42) * 0.08;
			const scale = MathUtils.lerp(2.2, 3.8, pseudoRandom());
			const rotY = pseudoRandom() * Math.PI * 2;

			if (pseudoRandom() < 0.68) {
				pines.push({ x, y, z, scale, rotY, color: pinePalette[Math.floor(pseudoRandom() * pinePalette.length)] });
			} else {
				deciduous.push({ x, y, z, scale, rotY, color: deciduousPalette[Math.floor(pseudoRandom() * deciduousPalette.length)] });
			}

			// Add companion rocks and shrubs near the base of the north ridge
			if (i % 2 === 0) {
				shrubList.push({
					x: x + (pseudoRandom() - 0.5) * 4.5,
					y: Math.max(0.6, y - 1.2),
					z: z + (pseudoRandom() - 0.5) * 4.5,
					scale: MathUtils.lerp(1.2, 2.2, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: bushPalette[Math.floor(pseudoRandom() * bushPalette.length)],
				});
			}
			if (i % 3 === 0) {
				rockList.push({
					x: x + (pseudoRandom() - 0.5) * 5.0,
					y: Math.max(0.5, y - 1.4),
					z: z + (pseudoRandom() - 0.5) * 5.0,
					scale: MathUtils.lerp(1.4, 2.6, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: rockPalette[Math.floor(pseudoRandom() * rockPalette.length)],
				});
			}
		}

		const clearRiverZ = (x: number, z: number, clearance = 4.8) => {
			const center = -2.5 + Math.sin(x * 0.13) * 0.75;
			const offset = z - center;
			if (Math.abs(offset) < clearance) {
				return center + (offset >= 0 ? clearance : -clearance);
			}
			return z;
		};

		// 2. Sector Este (East Mountain Ridge):
		// Verdant alpine conifers and oaks framing the east ridge
		for (let i = 0; i < 22; i++) {
			const angle = MathUtils.lerp(-Math.PI * 0.15, Math.PI * 0.32, i / 22) + (pseudoRandom() - 0.5) * 0.08;
			const rad = MathUtils.lerp(38, 56, pseudoRandom());
			const x = Math.cos(angle) * rad * 1.15;
			const z = clearRiverZ(x, Math.sin(angle) * rad);
			const y = 2.0 + Math.sin(z * 0.09) * 1.1 + (rad - 38) * 0.07;
			const scale = MathUtils.lerp(2.0, 3.6, pseudoRandom());
			const rotY = pseudoRandom() * Math.PI * 2;

			if (pseudoRandom() < 0.60) {
				deciduous.push({ x, y, z, scale, rotY, color: deciduousPalette[Math.floor(pseudoRandom() * deciduousPalette.length)] });
			} else {
				pines.push({ x, y, z, scale, rotY, color: pinePalette[Math.floor(pseudoRandom() * pinePalette.length)] });
			}

			if (i % 2 === 0) {
				const sx = x + (pseudoRandom() - 0.5) * 4.2;
				shrubList.push({
					x: sx,
					y: Math.max(0.6, y - 1.0),
					z: clearRiverZ(sx, z + (pseudoRandom() - 0.5) * 4.2),
					scale: MathUtils.lerp(1.1, 2.0, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: bushPalette[Math.floor(pseudoRandom() * bushPalette.length)],
				});
			}
			if (i % 4 === 0) {
				const rx = x + (pseudoRandom() - 0.5) * 4.5;
				rockList.push({
					x: rx,
					y: Math.max(0.5, y - 1.2),
					z: clearRiverZ(rx, z + (pseudoRandom() - 0.5) * 4.5),
					scale: MathUtils.lerp(1.3, 2.4, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: rockPalette[Math.floor(pseudoRandom() * rockPalette.length)],
				});
			}
		}

		// 3. Sector Oeste (West Mountain Ridge):
		// Stately evergreen pines and alpine oaks catching the warm sunset
		for (let i = 0; i < 22; i++) {
			const angle = MathUtils.lerp(Math.PI * 0.68, Math.PI * 1.14, i / 22) + (pseudoRandom() - 0.5) * 0.08;
			const rad = MathUtils.lerp(38, 56, pseudoRandom());
			const x = Math.cos(angle) * rad * 1.15;
			const z = clearRiverZ(x, Math.sin(angle) * rad);
			const y = 2.0 + Math.sin(z * 0.09) * 1.1 + (rad - 38) * 0.07;
			const scale = MathUtils.lerp(2.0, 3.6, pseudoRandom());
			const rotY = pseudoRandom() * Math.PI * 2;

			if (pseudoRandom() < 0.55) {
				deciduous.push({ x, y, z, scale, rotY, color: deciduousPalette[Math.floor(pseudoRandom() * deciduousPalette.length)] });
			} else {
				pines.push({ x, y, z, scale, rotY, color: pinePalette[Math.floor(pseudoRandom() * pinePalette.length)] });
			}

			if (i % 2 === 0) {
				const sx = x + (pseudoRandom() - 0.5) * 4.2;
				shrubList.push({
					x: sx,
					y: Math.max(0.6, y - 1.0),
					z: clearRiverZ(sx, z + (pseudoRandom() - 0.5) * 4.2),
					scale: MathUtils.lerp(1.2, 2.1, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: bushPalette[Math.floor(pseudoRandom() * bushPalette.length)],
				});
			}
			if (i % 4 === 0) {
				rockList.push({
					x: x + (pseudoRandom() - 0.5) * 4.8,
					y: Math.max(0.5, y - 1.2),
					z: z + (pseudoRandom() - 0.5) * 4.8,
					scale: MathUtils.lerp(1.3, 2.5, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: rockPalette[Math.floor(pseudoRandom() * rockPalette.length)],
				});
			}
		}

		// 4. Sector Sur (South Valley Entrance Copse):
		// Gentle oaks, evergreen spruces, and flowering bushes framing the southern entrance.
		for (let i = 0; i < 18; i++) {
			const angle = MathUtils.lerp(Math.PI * 0.32, Math.PI * 0.68, i / 18) + (pseudoRandom() - 0.5) * 0.08;
			const rad = MathUtils.lerp(38, 54, pseudoRandom());
			const x = Math.cos(angle) * rad;
			const z = Math.sin(angle) * rad * 1.2;
			const y = 1.8 + Math.sin(x * 0.1) * 0.9 + (rad - 38) * 0.06;
			const scale = MathUtils.lerp(1.8, 3.4, pseudoRandom());
			const rotY = pseudoRandom() * Math.PI * 2;

			if (pseudoRandom() < 0.5) {
				deciduous.push({ x, y, z, scale, rotY, color: deciduousPalette[Math.floor(pseudoRandom() * deciduousPalette.length)] });
			} else {
				pines.push({ x, y, z, scale, rotY, color: pinePalette[Math.floor(pseudoRandom() * pinePalette.length)] });
			}

			if (i % 2 === 0) {
				shrubList.push({
					x: x + (pseudoRandom() - 0.5) * 3.8,
					y: Math.max(0.5, y - 0.8),
					z: z + (pseudoRandom() - 0.5) * 3.8,
					scale: MathUtils.lerp(1.1, 1.9, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: bushPalette[Math.floor(pseudoRandom() * bushPalette.length)],
				});
			}
			if (i % 5 === 0) {
				rockList.push({
					x: x + (pseudoRandom() - 0.5) * 4.2,
					y: Math.max(0.4, y - 1.0),
					z: z + (pseudoRandom() - 0.5) * 4.2,
					scale: MathUtils.lerp(1.2, 2.2, pseudoRandom()),
					rotY: pseudoRandom() * Math.PI * 2,
					color: rockPalette[Math.floor(pseudoRandom() * rockPalette.length)],
				});
			}
		}

		return { pineTrees: pines, deciduousTrees: deciduous, bushes: shrubList, rocks: rockList };
	}, []);

	const curNight = useRef(isNight ? 1 : 0);
	const tempTint = useMemo(() => new Color(), []);
	const dayTint = useMemo(() => new Color("#ffffff"), []);
	const nightTint = useMemo(() => new Color("#98aba0"), []);

	useFrame((_, delta) => {
		const dampSpeed = 1.1;
		curNight.current = MathUtils.damp(curNight.current, isNight ? 1 : 0, dampSpeed, delta);
		tempTint.copy(dayTint).lerp(nightTint, curNight.current);
		pineMaterial.color.copy(tempTint);
		deciduousMaterial.color.copy(tempTint);
		bushMaterial.color.copy(tempTint);
		rockMaterial.color.copy(tempTint);
	});

	// Instanced meshes for Pines
	const pineInstances = useMemo(() => {
		const dummy = new Object3D();
		const meshFoliage = new InstancedMesh(pineFoliageGeom, pineMaterial, pineTrees.length);
		const meshTrunk = new InstancedMesh(trunkGeom, trunkMaterial, pineTrees.length);
		const tempCol = new Color();

		pineTrees.forEach((t, index) => {
			dummy.position.set(t.x, t.y, t.z);
			dummy.rotation.set(0, t.rotY, 0);
			dummy.scale.set(t.scale, t.scale, t.scale);
			dummy.updateMatrix();
			meshTrunk.setMatrixAt(index, dummy.matrix);
			meshFoliage.setMatrixAt(index, dummy.matrix);
			tempCol.set(t.color);
			meshFoliage.setColorAt(index, tempCol);
		});

		meshFoliage.instanceMatrix.needsUpdate = true;
		meshTrunk.instanceMatrix.needsUpdate = true;
		if (meshFoliage.instanceColor) meshFoliage.instanceColor.needsUpdate = true;

		meshFoliage.castShadow = true;
		meshFoliage.receiveShadow = true;
		meshTrunk.castShadow = true;
		meshTrunk.receiveShadow = true;

		return { meshFoliage, meshTrunk };
	}, [pineFoliageGeom, pineMaterial, pineTrees, trunkGeom, trunkMaterial]);

	// Instanced meshes for Deciduous
	const deciduousInstances = useMemo(() => {
		const dummy = new Object3D();
		const meshFoliage = new InstancedMesh(deciduousFoliageGeom, deciduousMaterial, deciduousTrees.length);
		const meshTrunk = new InstancedMesh(trunkGeom, trunkMaterial, deciduousTrees.length);
		const tempCol = new Color();

		deciduousTrees.forEach((t, index) => {
			dummy.position.set(t.x, t.y, t.z);
			dummy.rotation.set(0, t.rotY, 0);
			dummy.scale.set(t.scale, t.scale, t.scale);
			dummy.updateMatrix();
			meshTrunk.setMatrixAt(index, dummy.matrix);
			meshFoliage.setMatrixAt(index, dummy.matrix);
			tempCol.set(t.color);
			meshFoliage.setColorAt(index, tempCol);
		});

		meshFoliage.instanceMatrix.needsUpdate = true;
		meshTrunk.instanceMatrix.needsUpdate = true;
		if (meshFoliage.instanceColor) meshFoliage.instanceColor.needsUpdate = true;

		meshFoliage.castShadow = true;
		meshFoliage.receiveShadow = true;
		meshTrunk.castShadow = true;
		meshTrunk.receiveShadow = true;

		return { meshFoliage, meshTrunk };
	}, [deciduousFoliageGeom, deciduousMaterial, deciduousTrees, trunkGeom, trunkMaterial]);

	// Instanced meshes for Bushes & Shrubs
	const bushInstances = useMemo(() => {
		const dummy = new Object3D();
		const mesh = new InstancedMesh(bushGeom, bushMaterial, bushes.length);
		const tempCol = new Color();

		bushes.forEach((b, index) => {
			dummy.position.set(b.x, b.y, b.z);
			dummy.rotation.set(0, b.rotY, 0);
			dummy.scale.set(b.scale, b.scale, b.scale);
			dummy.updateMatrix();
			mesh.setMatrixAt(index, dummy.matrix);
			tempCol.set(b.color);
			mesh.setColorAt(index, tempCol);
		});

		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}, [bushGeom, bushMaterial, bushes]);

	// Instanced meshes for Granite Boulders & Outcrops
	const rockInstances = useMemo(() => {
		const dummy = new Object3D();
		const mesh = new InstancedMesh(rockGeom, rockMaterial, rocks.length);
		const tempCol = new Color();

		rocks.forEach((r, index) => {
			dummy.position.set(r.x, r.y, r.z);
			dummy.rotation.set(0, r.rotY, 0);
			dummy.scale.set(r.scale, r.scale * 0.85, r.scale);
			dummy.updateMatrix();
			mesh.setMatrixAt(index, dummy.matrix);
			tempCol.set(r.color);
			mesh.setColorAt(index, tempCol);
		});

		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
		mesh.castShadow = true;
		mesh.receiveShadow = true;
		return mesh;
	}, [rockGeom, rockMaterial, rocks]);

	return (
		<group>
			{/* Rolling gentle foothills enclosing the horizon */}
			{hillConfigs.map((hill, index) => (
				<mesh
					key={index}
					geometry={hillGeometry}
					position={hill.pos}
					scale={hill.scale}
					receiveShadow
				>
					<meshStandardMaterial
						color={hill.color}
						roughness={0.92}
						metalness={0.0}
					/>
				</mesh>
			))}

			{/* Instanced Tiered Alpine Pines */}
			<primitive object={pineInstances.meshFoliage} />
			<primitive object={pineInstances.meshTrunk} />

			{/* Instanced Cloud Deciduous Trees (Birch, Sakura, Oak) */}
			<primitive object={deciduousInstances.meshFoliage} />
			<primitive object={deciduousInstances.meshTrunk} />

			{/* Instanced Flowering & Field Bushes */}
			<primitive object={bushInstances} />

			{/* Instanced Granite Boulders & Outcrops */}
			<primitive object={rockInstances} />
		</group>
	);
}
