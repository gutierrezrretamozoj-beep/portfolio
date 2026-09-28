"use client";

import { Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	FogExp2,
	Group,
	IcosahedronGeometry,
	Points,
} from "three";

const mountainData = [
	[-26, 7.5, -42, 9.2, "#a8c0b2"],
	[-15, 8.8, -44, 11.0, "#9bb5a6"],
	[-2, 9.8, -46, 12.5, "#afc4b4"],
	[12, 8.5, -43, 10.5, "#a1b8a9"],
	[25, 7.8, -40, 9.5, "#b3c7b8"],
	[-36, 6.5, -34, 8.5, "#b8cab9"],
	[34, 6.8, -32, 8.8, "#b8cab9"],
] as const;

function Mountain({
	position,
	color,
	scale,
}: {
	position: [number, number, number];
	color: string;
	scale: number;
}) {
	const geometry = useMemo(() => {
		const shape = new IcosahedronGeometry(1, 4);
		const positions = shape.attributes.position;
		const vertexColors: number[] = [];
		const rockColor = new Color(color);
		const snowColor = new Color("#f7fcff");
		for (let index = 0; index < positions.count; index += 1) {
			const x = positions.getX(index);
			const y = positions.getY(index);
			const z = positions.getZ(index);
			const ridge = Math.sin(x * 8 + z * 5) * 0.045 + Math.cos(z * 11 - y * 4) * 0.03;
			const variation = 1 + Math.sin(x * 9 + z * 5) * 0.07 + Math.cos(y * 12 - x * 3) * 0.04;
			const peakTaper = 1 - Math.max(0, y) * 0.16;
			const peakLift = y > 0 ? y * y * 0.15 : 0;
			positions.setXYZ(index, x * variation * peakTaper, y * variation + peakLift, z * variation * peakTaper);
			const snow = Math.max(0, Math.min(1, (y + ridge - 0.47) * 9));
			const shadedRock = rockColor.clone().multiplyScalar(0.88 + (Math.sin(x * 19 + z * 13) * 0.06 + 0.06));
			const finalColor = shadedRock.lerp(snowColor, snow);
			vertexColors.push(finalColor.r, finalColor.g, finalColor.b);
		}
		shape.setAttribute("color", new BufferAttribute(new Float32Array(vertexColors), 3));
		shape.computeVertexNormals();
		return shape;
	}, [color]);

	return (
		<mesh geometry={geometry} position={position} scale={[scale * 1.5, scale, scale * 0.8]} castShadow>
			<meshStandardMaterial vertexColors roughness={0.88} metalness={0.015} />
		</mesh>
	);
}

/**
 * Procedural Volumetric Stylized Cloud
 * Drifts naturally with wind speed and wraps seamlessly around the world horizon
 */
function DriftingVolumetricCloud({
	initialPos,
	scale,
	speed,
}: {
	initialPos: [number, number, number];
	scale: number;
	speed: number;
}) {
	const cloudRef = useRef<Group>(null);
	const currentX = useRef(initialPos[0]);

	useFrame((_, delta) => {
		if (!cloudRef.current) return;
		const dt = Math.min(delta, 0.05);

		// Drift along X axis
		currentX.current += speed * dt;
		if (currentX.current > 58) {
			currentX.current = -58;
		}

		cloudRef.current.position.x = currentX.current;
	});

	// Soft puffy cloud composed of multiple organic lobes
	return (
		<group ref={cloudRef} position={initialPos} scale={scale}>
			{[
				{ pos: [-1.2, 0, 0], scale: [1.4, 0.5, 0.7] },
				{ pos: [-0.4, 0.28, 0.15], scale: [1.6, 0.65, 0.85] },
				{ pos: [0.5, 0.15, -0.1], scale: [1.5, 0.55, 0.8] },
				{ pos: [1.3, -0.05, 0.05], scale: [1.2, 0.45, 0.65] },
				{ pos: [0.1, -0.18, 0.25], scale: [1.3, 0.4, 0.6] },
			].map((lobe, index) => (
				<mesh key={index} position={lobe.pos as [number, number, number]} scale={lobe.scale as [number, number, number]}>
					<sphereGeometry args={[1, 16, 12]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.46} depthWrite={false} />
				</mesh>
			))}
		</group>
	);
}

/**
 * Floating sunlit pollen motes drifting on the breeze
 */
function SunlitMotes({ count = 130 }: { count?: number }) {
	const pointsRef = useRef<Points>(null);

	const { geometry, positions } = useMemo(() => {
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			pos[i * 3] = (Math.random() - 0.5) * 52;
			pos[i * 3 + 1] = Math.random() * 8 + 0.5;
			pos[i * 3 + 2] = (Math.random() - 0.5) * 52;
		}
		const geom = new BufferGeometry();
		geom.setAttribute("position", new BufferAttribute(pos, 3));
		return { geometry: geom, positions: pos };
	}, [count]);

	useFrame(({ clock }) => {
		if (!pointsRef.current) return;
		const t = clock.elapsedTime * 0.4;
		const attr = pointsRef.current.geometry.attributes.position;
		for (let i = 0; i < count; i++) {
			let y = positions[i * 3 + 1] + Math.sin(t + i) * 0.4;
			attr.setY(i, y);
		}
		attr.needsUpdate = true;
	});

	return (
		<points ref={pointsRef} geometry={geometry}>
			<pointsMaterial
				size={0.16}
				color="#f6e8bb"
				transparent
				opacity={0.42}
				depthWrite={false}
			/>
		</points>
	);
}

export function Environment() {
	const fog = useMemo(() => new FogExp2("#dff1f7", 0.0085), []);
	const sunPos: [number, number, number] = [45, 32, -75];

	// Coordinated clouds drifting across the sky at different altitudes & speeds
	const cloudLayers: Array<{ pos: [number, number, number]; scale: number; speed: number }> = [
		{ pos: [-35, 23, -25], scale: 2.8, speed: 0.48 },
		{ pos: [10, 26, -35], scale: 3.2, speed: 0.36 },
		{ pos: [-15, 29, -15], scale: 2.5, speed: 0.58 },
		{ pos: [32, 24, -20], scale: 2.9, speed: 0.42 },
	];

	return (
		<>
			<color attach="background" args={["#cdecf8"]} />
			<primitive attach="fog" object={fog} />

			{/* Luminous Morning Sky Dome */}
			<Sky
				distance={450000}
				sunPosition={sunPos}
				inclination={0.52}
				azimuth={0.25}
				rayleigh={1.4}
				turbidity={6.5}
				mieCoefficient={0.005}
				mieDirectionalG={0.88}
			/>

			{/* Ambient Fill */}
			<ambientLight intensity={0.42} color="#fffbeb" />

			{/* Warm Sun Light with Soft PCF Shadows */}
			<directionalLight
				position={sunPos}
				intensity={1.85}
				color="#fff3dd"
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-camera-near={1}
				shadow-camera-far={95}
				shadow-camera-left={-38}
				shadow-camera-right={38}
				shadow-camera-top={38}
				shadow-camera-bottom={-38}
				shadow-bias={-0.00005}
				shadow-normalBias={0.05}
			/>

			{/* Dual Hemisphere Light: Sky Radiance + Grass Bounce */}
			<hemisphereLight args={["#e0f2fe", "#96ab7b", 0.72]} />

			{/* Distant Mountain Silhouettes */}
			{mountainData.map(([x, y, z, scale, color], index) => (
				<Mountain key={index} position={[x, y, z]} scale={scale} color={color} />
			))}

			{/* Volumetric Clouds Drifting with Wind Parallax */}
			{cloudLayers.map((cloud, index) => (
				<DriftingVolumetricCloud
					key={index}
					initialPos={cloud.pos}
					scale={cloud.scale}
					speed={cloud.speed}
				/>
			))}

			{/* Sunlit Airborne Motes */}
			<SunlitMotes count={54} />
		</>
	);
}
