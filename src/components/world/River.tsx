"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
	BufferAttribute,
	BufferGeometry,
	ConeGeometry,
	DodecahedronGeometry,
	DoubleSide,
	Group,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Points,
	PointsMaterial,
	SphereGeometry,
	Vector2,
	Vector3,
} from "three";
import { GLBOrFallback } from "@/components/world/ModelAsset";
import { getModelUrl } from "@/data/models-manifest";
import { terrainHeight } from "@/components/world/terrain-utils";

const SHARED_FISH_BODY_GEO = new SphereGeometry(1, 10, 7);
const SHARED_FISH_TAIL_GEO = new ConeGeometry(0.075, 0.16, 4);
const SHARED_FISH_EYE_GEO = new SphereGeometry(1, 6, 5);
const SHARED_FISH_EYE_MAT = new MeshBasicMaterial({ color: "#fff4d6" });
const SHARED_LAKE_STONE_GEO = new DodecahedronGeometry(1, 1);
const SHARED_LAKE_STONE_MATS = [
	new MeshStandardMaterial({ color: "#94a3b8", roughness: 0.7 }),
	new MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.7 }),
];

function riverCurve(x: number) {
	return -2.5 + Math.sin(x * 0.13) * 0.75;
}

const RIVER_MIN_X = -260;
const RIVER_MAX_X = 260;
const RIVER_SPAN = RIVER_MAX_X - RIVER_MIN_X;

function riverBaseHeight(x: number, z: number) {
	const th = terrainHeight(x, z);
	const absX = Math.abs(x);
	if (absX <= 39) return th;
	const t = Math.min(1, (absX - 39) / 25);
	const smooth = t * t * (3 - 2 * t);
	return th + (-0.38 - th) * smooth;
}

function createWater() {
	const segments = 960;
	const crossSegments = 14;
	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	const halfWidth = 1.82;

	for (let i = 0; i <= segments; i += 1) {
		const u = i / segments;
		const x = RIVER_MIN_X + RIVER_SPAN * u;
		const center = riverCurve(x);

		for (let c = 0; c <= crossSegments; c += 1) {
			const v = c / crossSegments;
			const lateral = (v - 0.5) * 2.0; // -1 to 1
			const z = center + lateral * halfWidth;
			// 3D water crown in the middle + tucked bank edges so it reads as real volumetric water
			const edgeDrop = Math.abs(lateral) > 0.92 ? -0.05 : 0;
			const surfaceLift = 0.058 - Math.pow(lateral, 4.0) * 0.018 + edgeDrop;
			positions.push(x, riverBaseHeight(x, z) + surfaceLift, z);
			uvs.push(u, v);
		}

		if (i < segments) {
			for (let c = 0; c < crossSegments; c += 1) {
				const row1 = i * (crossSegments + 1) + c;
				const row2 = (i + 1) * (crossSegments + 1) + c;
				indices.push(row1, row1 + 1, row2);
				indices.push(row1 + 1, row2 + 1, row2);
			}
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

function createRiverBed() {
	const segments = 480;
	const crossSegments = 6;
	const positions: number[] = [];
	const indices: number[] = [];
	const halfWidth = 1.72;

	for (let i = 0; i <= segments; i += 1) {
		const x = RIVER_MIN_X + (RIVER_SPAN * i) / segments;
		const center = riverCurve(x);
		for (let c = 0; c <= crossSegments; c += 1) {
			const lateral = (c / crossSegments - 0.5) * 2.0;
			const z = center + lateral * halfWidth;
			const depth = 0.14 * (1 - lateral * lateral);
			positions.push(x, riverBaseHeight(x, z) - depth, z);
		}
		if (i < segments) {
			for (let c = 0; c < crossSegments; c += 1) {
				const row1 = i * (crossSegments + 1) + c;
				const row2 = (i + 1) * (crossSegments + 1) + c;
				indices.push(row1, row1 + 1, row2);
				indices.push(row1 + 1, row2 + 1, row2);
			}
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

const riverFishColors = ["#f59e0b", "#06b6d4", "#f43f5e", "#10b981", "#8b5cf6", "#eab308"];

const fishPools = [
	// Pool 0: West Waterfall basin (fresh oxygenated pool)
	{ homeX: -16.5, homeZ: -2.6, radiusX: 2.4, radiusZ: 0.85, baseHeading: -Math.PI / 2 },
	// Pool 1: West Water Lilies bay (tranquil shade under lily pads)
	{ homeX: -7.5, homeZ: -2.8, radiusX: 2.2, radiusZ: 0.8, baseHeading: -Math.PI / 2 },
	// Pool 2: Bridge Deep Grotto (sheltered deep water under bridge)
	{ homeX: -0.5, homeZ: -2.9, radiusX: 1.8, radiusZ: 0.75, baseHeading: -Math.PI / 2 },
	// Pool 3: East Sunny Shallows (warm clear shallows)
	{ homeX: 9.2, homeZ: -2.3, radiusX: 2.6, radiusZ: 0.85, baseHeading: -Math.PI / 2 },
	// Pool 4: Lake Lotus Pier (circling calmly among lotus pads in the lake)
	{ homeX: 0.0, homeZ: -27.2, radiusX: 3.2, radiusZ: 2.8, baseHeading: 0 },
	// Pool 5: Lake South Shallows (exploring submerged pebbles)
	{ homeX: 2.4, homeZ: -28.6, radiusX: 2.2, radiusZ: 2.0, baseHeading: 0.6 },
];

type FishState = "hover" | "circle" | "dart";

function RiverFish({ index, reducedMotion }: { index: number; reducedMotion: boolean }) {
	const hasFishGlb = Boolean(getModelUrl("animals/fish"));
	const pool = fishPools[index % fishPools.length];
	const fish = useRef<Group>(null);
	const tail = useRef<Mesh>(null);

	const isLakeFish = pool.homeZ < -20;

	// State machine refs
	const state = useRef<FishState>("hover");
	const stateTimer = useRef(2.5 + (index * 0.8) % 3.0);
	const pos = useRef(new Vector3(pool.homeX, 0, pool.homeZ));
	const currentYaw = useRef(pool.baseHeading);
	const desiredYaw = useRef(pool.baseHeading);
	const currentSpeed = useRef(0);
	const circleAngle = useRef((index * 1.3) % (Math.PI * 2));
	const circleRadius = useRef(0.8 + ((index * 0.4) % 0.8));
	const circleDir = useRef(index % 2 === 0 ? 1 : -1);
	const targetPos = useRef(new Vector2(pool.homeX, pool.homeZ));

	const material = useMemo(() => new MeshStandardMaterial({
		color: riverFishColors[index % riverFishColors.length],
		emissive: riverFishColors[index % riverFishColors.length],
		emissiveIntensity: 0.18,
		roughness: 0.35,
		metalness: 0.15,
	}), [index]);

	const pickDartTarget = () => {
		const angle = Math.random() * Math.PI * 2;
		const rx = (Math.random() * 0.8 + 0.2) * pool.radiusX;
		const rz = (Math.random() * 0.8 + 0.2) * pool.radiusZ;
		targetPos.current.set(
			pool.homeX + Math.cos(angle) * rx,
			pool.homeZ + Math.sin(angle) * rz
		);
	};

	useFrame(({ clock }, delta) => {
		if (!fish.current || (!tail.current && !hasFishGlb) || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		const time = clock.elapsedTime;

		stateTimer.current -= dt;

		// FSM transitions
		if (stateTimer.current <= 0) {
			const roll = Math.random();
			if (state.current === "hover") {
				if (roll < 0.45) {
					state.current = "circle";
					stateTimer.current = 4.5 + Math.random() * 4.0;
					circleDir.current = Math.random() > 0.5 ? 1 : -1;
				} else {
					state.current = "dart";
					stateTimer.current = 1.4 + Math.random() * 1.2;
					pickDartTarget();
				}
			} else if (state.current === "circle") {
				if (roll < 0.50) {
					state.current = "hover";
					stateTimer.current = 3.0 + Math.random() * 3.5;
				} else {
					state.current = "dart";
					stateTimer.current = 1.4 + Math.random() * 1.2;
					pickDartTarget();
				}
			} else {
				state.current = roll < 0.60 ? "hover" : "circle";
				stateTimer.current = 3.5 + Math.random() * 3.0;
			}
		}

		let targetSpeed = 0;
		let wagRate = 3.5;

		if (state.current === "dart") {
			const dx = targetPos.current.x - pos.current.x;
			const dz = targetPos.current.y - pos.current.z;
			const dist = Math.hypot(dx, dz);
			if (dist > 0.2) {
				desiredYaw.current = Math.atan2(dx, dz);
				targetSpeed = 1.6;
				wagRate = 12.0;
				pos.current.x += Math.sin(desiredYaw.current) * currentSpeed.current * dt;
				pos.current.z += Math.cos(desiredYaw.current) * currentSpeed.current * dt;
			} else {
				stateTimer.current = 0;
			}
		} else if (state.current === "circle") {
			circleAngle.current += circleDir.current * (0.65 / circleRadius.current) * dt;
			const goalX = pool.homeX + Math.cos(circleAngle.current) * pool.radiusX * 0.7;
			const goalZ = pool.homeZ + Math.sin(circleAngle.current) * pool.radiusZ * 0.7;

			pos.current.x = MathUtils.damp(pos.current.x, goalX, 4.0, dt);
			pos.current.z = MathUtils.damp(pos.current.z, goalZ, 4.0, dt);

			desiredYaw.current = Math.atan2(
				-circleDir.current * Math.sin(circleAngle.current),
				circleDir.current * Math.cos(circleAngle.current),
			);
			targetSpeed = 0.55;
			wagRate = 6.0;
		} else {
			desiredYaw.current = pool.baseHeading + Math.sin(time * 1.2 + index) * 0.15;
			targetSpeed = 0.05;
			wagRate = 3.2;
			pos.current.x += Math.sin(time * 0.8 + index) * (0.02 * dt);
			pos.current.z += Math.cos(time * 0.6 + index) * (0.015 * dt);
		}

		currentSpeed.current = MathUtils.damp(currentSpeed.current, targetSpeed, 4.5, dt);

		// Boundaries confinement
		if (isLakeFish) {
			const lakeDist = Math.hypot(pos.current.x, pos.current.z - (-28));
			if (lakeDist > 4.6) {
				pos.current.x = (pos.current.x / lakeDist) * 4.4;
				pos.current.z = -28 + ((pos.current.z - (-28)) / lakeDist) * 4.4;
			}
		} else {
			const riverZ = riverCurve(pos.current.x);
			pos.current.z = MathUtils.clamp(pos.current.z, riverZ - pool.radiusZ, riverZ + pool.radiusZ);
			pos.current.x = MathUtils.clamp(pos.current.x, pool.homeX - pool.radiusX, pool.homeX + pool.radiusX);
		}

		// Smooth angle turning
		let angleDiff = desiredYaw.current - currentYaw.current;
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
		currentYaw.current += angleDiff * (1 - Math.exp(-6.0 * dt));

		// Underwater depth
		const surfaceY = isLakeFish ? 0.088 : terrainHeight(pos.current.x, pos.current.z) + 0.04;
		const fishY = surfaceY - 0.038 + Math.sin(time * 2.2 + index) * 0.008;

		fish.current.position.set(pos.current.x, fishY, pos.current.z);
		fish.current.rotation.y = currentYaw.current;

		// Gentle banking roll when turning or circling
		const banking = (desiredYaw.current - currentYaw.current) * 0.35;
		fish.current.rotation.z = MathUtils.clamp(banking, -0.3, 0.3);

		// Tail wagging proportional to speed
		if (tail.current) {
			tail.current.rotation.y = Math.sin(time * wagRate) * (0.28 + (currentSpeed.current / 1.6) * 0.22);
		}
	});

	return (
		<group ref={fish}>
			<GLBOrFallback
				slot="animals/fish"
				animationState="swim"
				speedRef={currentSpeed}
				fallback={
					<>
						<mesh geometry={SHARED_FISH_BODY_GEO} material={material} scale={[0.12, 0.045, 0.24]} />
						<mesh
							ref={tail}
							position={[0, 0, -0.19]}
							rotation={[-Math.PI / 2, 0, 0]}
							geometry={SHARED_FISH_TAIL_GEO}
							material={material}
						/>
						{[-1, 1].map((side) => (
							<mesh
								key={side}
								position={[side * 0.075, 0.018, 0.12]}
								scale={0.014}
								geometry={SHARED_FISH_EYE_GEO}
								material={SHARED_FISH_EYE_MAT}
							/>
						))}
					</>
				}
			/>
		</group>
	);
}

function MovingWater({ reducedMotion }: { reducedMotion: boolean }) {
	const water = useRef<Mesh>(null);
	const geometry = useMemo(() => createWater(), []);
	const bedGeometry = useMemo(() => createRiverBed(), []);
	const timeUniform = useMemo(() => ({ value: 0 }), []);

	const waterMaterial = useMemo(() => {
		const material = new MeshStandardMaterial({
			color: "#0284c7",
			roughness: 0.11,
			metalness: 0.14,
			transparent: true,
			opacity: 0.80,
			depthWrite: false,
			side: DoubleSide,
		});

		material.onBeforeCompile = (shader) => {
			shader.uniforms.uTime = timeUniform;

			shader.vertexShader = `
				uniform float uTime;
				varying vec2 vWaterUv;
				${shader.vertexShader}
			`;

			shader.vertexShader = shader.vertexShader.replace(
				"#include <beginnormal_vertex>",
				`
				#include <beginnormal_vertex>
				float nBank = smoothstep(0.0, 0.25, min(uv.y, 1.0 - uv.y));
				float dWaveDx = (
					cos(uv.x * 260.0 - uTime * 2.6) * 0.036 * 0.50 +
					-sin(uv.x * 150.5 + uv.y * 12.0 - uTime * 1.9) * 0.022 * 0.29 +
					cos(uv.x * 396.8 - uv.y * 16.0 - uTime * 3.4) * 0.014 * 0.76
				) * nBank;
				float dWaveDz = (
					-sin(uv.x * 150.5 + uv.y * 12.0 - uTime * 1.9) * 0.022 * 3.4 +
					-cos(uv.x * 396.8 - uv.y * 16.0 - uTime * 3.4) * 0.014 * 4.5
				) * nBank;
				objectNormal = normalize(vec3(objectNormal.x - dWaveDx, objectNormal.y, objectNormal.z - dWaveDz));
				`
			);

			shader.vertexShader = shader.vertexShader.replace(
				"#include <begin_vertex>",
				`
				#include <begin_vertex>
				vWaterUv = uv;

				float bankFactor = smoothstep(0.0, 0.25, min(uv.y, 1.0 - uv.y));
				float wave1 = sin(uv.x * 260.0 - uTime * 2.6) * 0.036;
				float wave2 = cos(uv.x * 150.5 + uv.y * 12.0 - uTime * 1.9) * 0.022;
				float wave3 = sin(uv.x * 396.8 - uv.y * 16.0 - uTime * 3.4) * 0.014;
				transformed.y += (wave1 + wave2 + wave3) * bankFactor;
				`
			);

			shader.fragmentShader = `
				uniform float uTime;
				varying vec2 vWaterUv;
				${shader.fragmentShader}
			`;

			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <color_fragment>",
				`
				#include <color_fragment>

				float edgeDist = min(vWaterUv.y, 1.0 - vWaterUv.y);
				float centerFlow = smoothstep(0.05, 0.45, edgeDist);

				// Downstream flow coordinates
				float flowSpeed = 2.2 + centerFlow * 1.2;
				float streamU = vWaterUv.x * 246.3 - uTime * flowSpeed;
				float streamV = vWaterUv.y * 10.0;

				// Crisp, luminous current flow ribbons (caudal)
				float flow1 = sin(streamU + sin(streamV * 1.4) * 0.8);
				float flow2 = cos(streamU * 1.2 - streamV * 2.2 + sin(streamU * 0.4));
				float currentStreak = pow(max(0.0, flow1 * flow2), 3.5) * centerFlow;

				// Subtle water surface caustics / glints
				float c1 = sin(streamU * 0.8 + streamV * 1.6);
				float c2 = cos(vWaterUv.x * 164.2 - uTime * 1.6 - streamV * 1.2);
				float caustics = pow(max(0.0, c1 * c2), 3.0) * 0.35;

				// Clean, delicate foam rim strictly along the river banks
				float bankLap = sin(vWaterUv.x * 218.9 + uTime * 2.5) * 0.008;
				float bankFoam = smoothstep(0.045 + bankLap, 0.005, edgeDist);

				// Vibrant, rich mountain river palette (NO milky or chalky wash!)
				vec3 deepSapphire = vec3(0.015, 0.36, 0.62); // Deep channel core
				vec3 clearAzure   = vec3(0.06, 0.54, 0.82);  // Main flowing stream
				vec3 shallowTurq  = vec3(0.16, 0.70, 0.86);  // Translucent bank shallows
				vec3 streamCyan   = vec3(0.55, 0.90, 0.98);  // Crisp current highlight
				vec3 foamWhite    = vec3(0.96, 0.99, 1.0);   // Shoreline froth

				// Deep channel gradient
				vec3 waterCol = mix(shallowTurq, clearAzure, smoothstep(0.04, 0.22, edgeDist));
				waterCol = mix(waterCol, deepSapphire, smoothstep(0.22, 0.45, edgeDist));

				// Add crisp flowing caudal ribbons and glints
				waterCol = mix(waterCol, streamCyan, currentStreak * 0.45 + caustics * 0.22);

				// Add delicate white foam line strictly on bank edge
				waterCol = mix(waterCol, foamWhite, bankFoam * 0.75);

				diffuseColor.rgb = waterCol;
				diffuseColor.a = 0.86 + bankFoam * 0.12;
				`
			);
		};

		material.customProgramCacheKey = () => "stylized-crystal-clear-river-3d-v5";
		return material;
	}, [timeUniform]);

	useFrame(({ clock }) => {
		if (reducedMotion) return;
		timeUniform.value = clock.elapsedTime;
	});

	return (
		<>
			<mesh geometry={bedGeometry} receiveShadow>
				<meshStandardMaterial color="#0b3b4e" roughness={0.95} metalness={0.05} />
			</mesh>
			<mesh ref={water} geometry={geometry} receiveShadow>
				<primitive object={waterMaterial} attach="material" />
			</mesh>
			{fishPools.map((_, index) => (
				<RiverFish key={index} index={index} reducedMotion={reducedMotion} />
			))}
		</>
	);
}

function WaterLilies({ reducedMotion }: { reducedMotion: boolean }) {
	const lilyGroup = useRef<Group>(null);
	const lilies = useMemo(() => [
		{ x: -3.2, z: -27.5, scale: 0.48, flower: true },
		{ x: 2.8, z: -28.2, scale: 0.54, flower: true },
		{ x: -1.5, z: -29.4, scale: 0.4, flower: false },
		{ x: 3.5, z: -26.8, scale: 0.44, flower: false },
		{ x: 0.8, z: -26.2, scale: 0.5, flower: true },
		{ x: -8.5, z: -2.8, scale: 0.38, flower: true },
		{ x: 6.2, z: -2.3, scale: 0.42, flower: false },
		{ x: 14.5, z: -1.9, scale: 0.4, flower: true },
		{ x: -16.2, z: -2.7, scale: 0.44, flower: false },
	], []);

	useFrame(({ clock }) => {
		if (reducedMotion || !lilyGroup.current) return;
		const t = clock.elapsedTime;
		lilyGroup.current.children.forEach((child, i) => {
			child.position.y = 0.088 + Math.sin(t * 1.5 + i * 1.1) * 0.012;
			child.rotation.z = Math.sin(t * 1.2 + i) * 0.035;
		});
	});

	return (
		<group ref={lilyGroup}>
			{lilies.map((l, i) => (
				<group key={i} position={[l.x, 0.088, l.z]} scale={l.scale} rotation={[0, i * 1.4, 0]}>
					{/* Lily pad disc with stylized notch */}
					<mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
						<circleGeometry args={[1, 18, 0, Math.PI * 1.82]} />
						<meshStandardMaterial color="#34d399" roughness={0.42} side={DoubleSide} />
					</mesh>
					{/* Delicate lotus blossom */}
					{l.flower && (
						<group position={[0, 0.08, 0]}>
							{Array.from({ length: 6 }, (_, p) => {
								const ang = (p / 6) * Math.PI * 2;
								return (
									<mesh key={p} position={[Math.sin(ang) * 0.18, 0.06, Math.cos(ang) * 0.18]} rotation={[0.45, ang, 0]} scale={[0.16, 0.08, 0.28]}>
										<sphereGeometry args={[1, 8, 8]} />
										<meshStandardMaterial color={p % 2 === 0 ? "#fbcfe8" : "#ffffff"} roughness={0.38} />
									</mesh>
								);
							})}
							<mesh position={[0, 0.08, 0]} scale={0.12}>
								<sphereGeometry args={[1, 8, 8]} />
								<meshStandardMaterial color="#fef08a" emissive="#fde047" emissiveIntensity={0.35} roughness={0.3} />
							</mesh>
						</group>
					)}
				</group>
			))}
		</group>
	);
}

function WaterSparkles({ reducedMotion }: { reducedMotion: boolean }) {
	const pointsRef = useRef<Points>(null);
	const count = 90;
	const { geometry } = useMemo(() => {
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			const isLake = Math.random() > 0.65;
			if (isLake) {
				pos[i * 3] = (Math.random() - 0.5) * 9.2;
				pos[i * 3 + 1] = 0.11;
				pos[i * 3 + 2] = -28 + (Math.random() - 0.5) * 8.2;
			} else {
				const x = (Math.random() - 0.5) * 140;
				pos[i * 3] = x;
				pos[i * 3 + 1] = riverBaseHeight(x, riverCurve(x)) + 0.06;
				pos[i * 3 + 2] = riverCurve(x) + (Math.random() - 0.5) * 2.4;
			}
		}
		const geom = new BufferGeometry();
		geom.setAttribute("position", new BufferAttribute(pos, 3));
		return { geometry: geom };
	}, [count]);

	useFrame(({ clock }) => {
		if (reducedMotion || !pointsRef.current) return;
		const mat = pointsRef.current.material;
		if (mat instanceof PointsMaterial) {
			mat.opacity = 0.45 + Math.sin(clock.elapsedTime * 4.2) * 0.25;
		}
	});

	return (
		<points ref={pointsRef} geometry={geometry}>
			<pointsMaterial size={0.15} color="#e0f2fe" transparent opacity={0.65} depthWrite={false} />
		</points>
	);
}

function Lake() {
	const stones = useMemo(() => {
		return Array.from({ length: 12 }, (_, i) => {
			const angle = (i / 12) * Math.PI * 2;
			const radX = 5.8 + ((i * 3) % 4) * 0.2;
			const radZ = 4.6 + ((i * 5) % 4) * 0.2;
			return {
				x: Math.cos(angle) * radX,
				z: Math.sin(angle) * radZ,
				scale: 0.35 + (i % 3) * 0.12,
			};
		});
	}, []);

	return (
		<group position={[0, 0.08, -28]}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.18, 0.92, 1]} receiveShadow>
				<circleGeometry args={[5.8, 48]} />
				<meshStandardMaterial
					color="#0284c7"
					roughness={0.08}
					metalness={0.14}
					transparent
					opacity={0.94}
					side={DoubleSide}
				/>
			</mesh>

			{[0, 1, 2].map((index) => (
				<mesh
					key={index}
					rotation={[-Math.PI / 2, 0, 0]}
					position={[0, 0.025 + index * 0.006, 0]}
					scale={[0.58 + index * 0.16, 0.48 + index * 0.15, 1]}
				>
					<ringGeometry args={[4.2, 4.32, 48]} />
					<meshBasicMaterial color="#e0f2fe" transparent opacity={0.38 - index * 0.08} side={DoubleSide} />
				</mesh>
			))}

			{/* Soft shoreline pebbles */}
			{stones.map((s, i) => (
				<mesh
					key={i}
					position={[s.x, 0.1, s.z]}
					scale={[s.scale * 1.2, s.scale * 0.6, s.scale]}
					geometry={SHARED_LAKE_STONE_GEO}
					material={SHARED_LAKE_STONE_MATS[i % 2]}
					castShadow
				/>
			))}
		</group>
	);
}

export function River() {
	const reducedMotion = Boolean(useReducedMotion());
	return (
		<group>
			<MovingWater reducedMotion={reducedMotion} />
			<Lake />
			<WaterLilies reducedMotion={reducedMotion} />
			<WaterSparkles reducedMotion={reducedMotion} />
		</group>
	);
}
