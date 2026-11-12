"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	DoubleSide,
	InstancedMesh,
	MathUtils,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	PointLight,
} from "three";
import { terrainHeight } from "@/components/world/terrain-utils";
import {
	groundBollardPositions,
	streetLampPositions,
} from "./street-lamps-data";

const ARM_REACH = 0.52;

interface FireflySeed {
	lampX: number;
	lampY: number;
	lampZ: number;
	seed: number;
}

export function StreetLamps({ isNight = false }: { isNight?: boolean }) {
	const lampCount = streetLampPositions.length;
	const bollardCount = groundBollardPositions.length;
	const fireflyCount = lampCount * 3;

	// Lamp instanced mesh refs
	const plinthLowRef = useRef<InstancedMesh>(null);
	const plinthTopRef = useRef<InstancedMesh>(null);
	const postRef = useRef<InstancedMesh>(null);
	const collarRef = useRef<InstancedMesh>(null);
	const strutRef = useRef<InstancedMesh>(null);
	const barRef = useRef<InstancedMesh>(null);
	const chainRef = useRef<InstancedMesh>(null);
	const roofRef = useRef<InstancedMesh>(null);
	const finialRef = useRef<InstancedMesh>(null);
	const glassRef = useRef<InstancedMesh>(null);
	const coreRef = useRef<InstancedMesh>(null);
	const basePlateRef = useRef<InstancedMesh>(null);
	const outerPoolRef = useRef<InstancedMesh>(null);
	const innerPoolRef = useRef<InstancedMesh>(null);
	const firefliesMeshRef = useRef<InstancedMesh>(null);

	// Bollard instanced mesh refs
	const bollardBaseRef = useRef<InstancedMesh>(null);
	const bollardSlitRef = useRef<InstancedMesh>(null);
	const bollardCapRef = useRef<InstancedMesh>(null);
	const bollardPoolRef = useRef<InstancedMesh>(null);

	// Shared dynamic material refs updated by 1 centralized useFrame
	const glassMatRef = useRef<MeshStandardMaterial>(null);
	const coreMatRef = useRef<MeshStandardMaterial>(null);
	const outerPoolMatRef = useRef<MeshBasicMaterial>(null);
	const innerPoolMatRef = useRef<MeshBasicMaterial>(null);
	const bollardSlitMatRef = useRef<MeshStandardMaterial>(null);
	const bollardPoolMatRef = useRef<MeshBasicMaterial>(null);
	const fireflyMatRef = useRef<MeshBasicMaterial>(null);

	// Keep at most 2 key dynamic PointLights in shader budget for primary path junctions
	const heroLights = useMemo(() => {
		return streetLampPositions
			.filter((spec) => spec.hasPointLight)
			.slice(0, 2)
			.map((spec) => ({
				x: spec.x + Math.sin(spec.rotationY) * ARM_REACH,
				y: terrainHeight(spec.x, spec.z) + 2.05,
				z: spec.z + Math.cos(spec.rotationY) * ARM_REACH,
			}));
	}, []);
	const heroLightRefs = useRef<Array<PointLight | null>>([]);

	const fireflySeeds = useMemo<FireflySeed[]>(() => {
		const list: FireflySeed[] = [];
		for (const spec of streetLampPositions) {
			const gy = terrainHeight(spec.x, spec.z);
			const armX = spec.x + Math.sin(spec.rotationY) * ARM_REACH;
			const armZ = spec.z + Math.cos(spec.rotationY) * ARM_REACH;
			for (let f = 0; f < 3; f++) {
				list.push({ lampX: armX, lampY: gy + 2.05, lampZ: armZ, seed: (f + 1) * 2.1 });
			}
		}
		return list;
	}, []);

	const scratchObj = useMemo(() => new Object3D(), []);

	// Populate all static instance matrices once
	useLayoutEffect(() => {
		const parent = new Object3D();
		const child = new Object3D();
		parent.add(child);

		const setChildMatrix = (
			mesh: InstancedMesh | null,
			index: number,
			lx: number,
			ly: number,
			lz: number,
			rx = 0,
			ry = 0,
			rz = 0,
		) => {
			if (!mesh) return;
			child.position.set(lx, ly, lz);
			child.rotation.set(rx, ry, rz);
			parent.updateMatrixWorld(true);
			mesh.setMatrixAt(index, child.matrixWorld);
		};

		for (let i = 0; i < lampCount; i++) {
			const spec = streetLampPositions[i];
			const groundY = terrainHeight(spec.x, spec.z);
			parent.position.set(spec.x, groundY, spec.z);
			parent.rotation.set(0, spec.rotationY, 0);

			setChildMatrix(plinthLowRef.current, i, 0, 0.12, 0);
			setChildMatrix(plinthTopRef.current, i, 0, 0.24, 0);
			setChildMatrix(postRef.current, i, 0, 1.22, 0);
			setChildMatrix(collarRef.current, i * 2, 0, 0.95, 0);
			setChildMatrix(collarRef.current, i * 2 + 1, 0, 1.95, 0);

			setChildMatrix(strutRef.current, i, 0, 1.98, 0.22, 0.42, 0, 0);
			setChildMatrix(barRef.current, i, 0, 2.22, 0.26);
			setChildMatrix(chainRef.current, i, 0, 2.14, ARM_REACH);
			setChildMatrix(roofRef.current, i, 0, 2.14, ARM_REACH);
			setChildMatrix(finialRef.current, i, 0, 2.24, ARM_REACH);
			setChildMatrix(glassRef.current, i, 0, 1.98, ARM_REACH);
			setChildMatrix(coreRef.current, i, 0, 1.98, ARM_REACH);
			setChildMatrix(basePlateRef.current, i, 0, 1.85, ARM_REACH);
			setChildMatrix(outerPoolRef.current, i, 0, 0.02, ARM_REACH, -Math.PI / 2, 0, 0);
			setChildMatrix(innerPoolRef.current, i, 0, 0.025, ARM_REACH, -Math.PI / 2, 0, 0);
		}

		parent.rotation.set(0, 0, 0);
		for (let i = 0; i < bollardCount; i++) {
			const spec = groundBollardPositions[i];
			const groundY = terrainHeight(spec.x, spec.z);
			parent.position.set(spec.x, groundY, spec.z);
			setChildMatrix(bollardBaseRef.current, i, 0, 0.16, 0);
			setChildMatrix(bollardSlitRef.current, i, 0, 0.34, 0);
			setChildMatrix(bollardCapRef.current, i, 0, 0.42, 0);
			setChildMatrix(bollardPoolRef.current, i, 0, 0.015, 0, -Math.PI / 2, 0, 0);
		}

		const lampMeshes = [
			plinthLowRef.current,
			plinthTopRef.current,
			postRef.current,
			collarRef.current,
			strutRef.current,
			barRef.current,
			chainRef.current,
			roofRef.current,
			finialRef.current,
			glassRef.current,
			coreRef.current,
			basePlateRef.current,
			outerPoolRef.current,
			innerPoolRef.current,
			bollardBaseRef.current,
			bollardSlitRef.current,
			bollardCapRef.current,
			bollardPoolRef.current,
		];
		for (const mesh of lampMeshes) {
			if (mesh) mesh.instanceMatrix.needsUpdate = true;
		}
	}, [lampCount, bollardCount]);

	// Single centralized animation & glow transition loop
	useFrame(({ clock }, delta) => {
		const dampSpeed = 1.1;
		const dt = Math.min(delta, 0.05);

		if (glassMatRef.current) {
			glassMatRef.current.emissiveIntensity = MathUtils.damp(
				glassMatRef.current.emissiveIntensity,
				isNight ? 2.6 : 0.4,
				dampSpeed,
				dt,
			);
		}
		if (coreMatRef.current) {
			coreMatRef.current.emissiveIntensity = MathUtils.damp(
				coreMatRef.current.emissiveIntensity,
				isNight ? 3.8 : 0.8,
				dampSpeed,
				dt,
			);
		}
		if (outerPoolMatRef.current) {
			outerPoolMatRef.current.opacity = MathUtils.damp(
				outerPoolMatRef.current.opacity,
				isNight ? 0.36 : 0.05,
				dampSpeed,
				dt,
			);
		}
		if (innerPoolMatRef.current) {
			innerPoolMatRef.current.opacity = MathUtils.damp(
				innerPoolMatRef.current.opacity,
				isNight ? 0.28 : 0.03,
				dampSpeed,
				dt,
			);
		}
		if (bollardSlitMatRef.current) {
			bollardSlitMatRef.current.emissiveIntensity = MathUtils.damp(
				bollardSlitMatRef.current.emissiveIntensity,
				isNight ? 3.0 : 0.5,
				dampSpeed,
				dt,
			);
		}
		if (bollardPoolMatRef.current) {
			bollardPoolMatRef.current.opacity = MathUtils.damp(
				bollardPoolMatRef.current.opacity,
				isNight ? 0.25 : 0.03,
				dampSpeed,
				dt,
			);
		}

		const targetLight = isNight ? 1.8 : 0.0;
		for (const light of heroLightRefs.current) {
			if (light) {
				light.intensity = MathUtils.damp(light.intensity, targetLight, dampSpeed, dt);
			}
		}

		if (fireflyMatRef.current && firefliesMeshRef.current) {
			fireflyMatRef.current.opacity = MathUtils.damp(
				fireflyMatRef.current.opacity,
				isNight ? 0.85 : 0.0,
				dampSpeed,
				dt,
			);
			const visible = fireflyMatRef.current.opacity > 0.02;
			firefliesMeshRef.current.visible = visible;

			if (visible) {
				const time = clock.elapsedTime;
				for (let i = 0; i < fireflyCount; i++) {
					const f = fireflySeeds[i];
					const radius = 0.35 + Math.sin(time * 0.8 + f.seed) * 0.12;
					scratchObj.position.set(
						f.lampX + Math.cos(time * 1.2 + f.seed) * radius,
						f.lampY + Math.sin(time * 1.8 + f.seed * 1.5) * 0.18,
						f.lampZ + Math.sin(time * 1.2 + f.seed) * radius,
					);
					scratchObj.updateMatrix();
					firefliesMeshRef.current.setMatrixAt(i, scratchObj.matrix);
				}
				firefliesMeshRef.current.instanceMatrix.needsUpdate = true;
			}
		}
	});

	return (
		<group name="street-lighting-network">
			{/* Instanced Lamp Plinths & Posts */}
			<instancedMesh ref={plinthLowRef} args={[undefined, undefined, lampCount]} castShadow receiveShadow frustumCulled={false}>
				<cylinderGeometry args={[0.26, 0.34, 0.24, 8]} />
				<meshStandardMaterial color="#57534e" roughness={0.88} />
			</instancedMesh>
			<instancedMesh ref={plinthTopRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<cylinderGeometry args={[0.18, 0.24, 0.08, 8]} />
				<meshStandardMaterial color="#78716c" roughness={0.82} />
			</instancedMesh>
			<instancedMesh ref={postRef} args={[undefined, undefined, lampCount]} castShadow frustumCulled={false}>
				<cylinderGeometry args={[0.07, 0.095, 2.0, 8]} />
				<meshStandardMaterial color="#3f3832" roughness={0.78} />
			</instancedMesh>
			<instancedMesh ref={collarRef} args={[undefined, undefined, lampCount * 2]} frustumCulled={false}>
				<cylinderGeometry args={[0.105, 0.105, 0.06, 8]} />
				<meshStandardMaterial color="#1f2937" roughness={0.65} metalness={0.2} />
			</instancedMesh>

			{/* Instanced Lantern Arm & Housing */}
			<instancedMesh ref={strutRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<boxGeometry args={[0.05, 0.05, 0.44]} />
				<meshStandardMaterial color="#1f2937" roughness={0.65} />
			</instancedMesh>
			<instancedMesh ref={barRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<boxGeometry args={[0.06, 0.06, 0.58]} />
				<meshStandardMaterial color="#1f2937" roughness={0.65} />
			</instancedMesh>
			<instancedMesh ref={chainRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<cylinderGeometry args={[0.02, 0.02, 0.12, 6]} />
				<meshStandardMaterial color="#1f2937" roughness={0.65} />
			</instancedMesh>
			<instancedMesh ref={roofRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<coneGeometry args={[0.22, 0.16, 4]} />
				<meshStandardMaterial color="#262626" roughness={0.7} />
			</instancedMesh>
			<instancedMesh ref={finialRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<coneGeometry args={[0.04, 0.1, 4]} />
				<meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.4} />
			</instancedMesh>
			<instancedMesh ref={basePlateRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<boxGeometry args={[0.24, 0.03, 0.24]} />
				<meshStandardMaterial color="#262626" roughness={0.7} />
			</instancedMesh>

			{/* Shared Emissive Lantern Glass & Inner Core */}
			<instancedMesh ref={glassRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<boxGeometry args={[0.22, 0.24, 0.22]} />
				<meshStandardMaterial
					ref={glassMatRef}
					color="#fef08a"
					emissive="#f59e0b"
					emissiveIntensity={0.4}
					roughness={0.25}
					transparent
					opacity={0.88}
				/>
			</instancedMesh>
			<instancedMesh ref={coreRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<dodecahedronGeometry args={[0.09, 0]} />
				<meshStandardMaterial
					ref={coreMatRef}
					color="#fffbeb"
					emissive="#fbbf24"
					emissiveIntensity={0.8}
					roughness={0.1}
				/>
			</instancedMesh>

			{/* Instanced Warm Ground Light Pools */}
			<instancedMesh ref={outerPoolRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<circleGeometry args={[1.75, 18]} />
				<meshBasicMaterial
					ref={outerPoolMatRef}
					color="#f59e0b"
					transparent
					opacity={0.05}
					depthWrite={false}
					side={DoubleSide}
				/>
			</instancedMesh>
			<instancedMesh ref={innerPoolRef} args={[undefined, undefined, lampCount]} frustumCulled={false}>
				<circleGeometry args={[0.85, 14]} />
				<meshBasicMaterial
					ref={innerPoolMatRef}
					color="#fef08a"
					transparent
					opacity={0.03}
					depthWrite={false}
					side={DoubleSide}
				/>
			</instancedMesh>

			{/* Instanced Nocturnal Fireflies around Lanterns */}
			<instancedMesh ref={firefliesMeshRef} args={[undefined, undefined, fireflyCount]} visible={false} frustumCulled={false}>
				<sphereGeometry args={[0.03, 6, 6]} />
				<meshBasicMaterial ref={fireflyMatRef} color="#fef08a" transparent opacity={0} />
			</instancedMesh>

			{/* Instanced Ground Pathway Bollards */}
			<instancedMesh ref={bollardBaseRef} args={[undefined, undefined, bollardCount]} castShadow receiveShadow frustumCulled={false}>
				<boxGeometry args={[0.28, 0.32, 0.28]} />
				<meshStandardMaterial color="#64748b" roughness={0.85} />
			</instancedMesh>
			<instancedMesh ref={bollardSlitRef} args={[undefined, undefined, bollardCount]} frustumCulled={false}>
				<boxGeometry args={[0.24, 0.1, 0.24]} />
				<meshStandardMaterial
					ref={bollardSlitMatRef}
					color="#fef08a"
					emissive="#f59e0b"
					emissiveIntensity={0.5}
					roughness={0.2}
				/>
			</instancedMesh>
			<instancedMesh ref={bollardCapRef} args={[undefined, undefined, bollardCount]} frustumCulled={false}>
				<boxGeometry args={[0.32, 0.08, 0.32]} />
				<meshStandardMaterial color="#475569" roughness={0.8} />
			</instancedMesh>
			<instancedMesh ref={bollardPoolRef} args={[undefined, undefined, bollardCount]} frustumCulled={false}>
				<circleGeometry args={[0.95, 14]} />
				<meshBasicMaterial
					ref={bollardPoolMatRef}
					color="#f59e0b"
					transparent
					opacity={0.03}
					depthWrite={false}
					side={DoubleSide}
				/>
			</instancedMesh>

			{/* Primary Path Junction Hero Lights */}
			{heroLights.map((light, idx) => (
				<pointLight
					key={`junction-light-${idx}`}
					ref={(el) => {
						heroLightRefs.current[idx] = el;
					}}
					position={[light.x, light.y, light.z]}
					color="#fde047"
					intensity={0}
					distance={11}
					decay={2}
				/>
			))}
		</group>
	);
}
