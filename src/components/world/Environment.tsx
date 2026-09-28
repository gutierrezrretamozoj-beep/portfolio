"use client";

import { Sky } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	FogExp2,
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
		const shape = new IcosahedronGeometry(1, 3);
		const positions = shape.attributes.position;
		for (let index = 0; index < positions.count; index += 1) {
			const x = positions.getX(index);
			const y = positions.getY(index);
			const z = positions.getZ(index);
			const variation = 1 + Math.sin(x * 9 + z * 5) * 0.05 + Math.cos(y * 12 - x * 3) * 0.03;
			positions.setXYZ(index, x * variation, y * variation, z * variation);
		}
		shape.computeVertexNormals();
		return shape;
	}, []);

	return (
		<mesh geometry={geometry} position={position} scale={[scale * 1.5, scale, scale * 0.8]} castShadow>
			<meshStandardMaterial color={color} roughness={0.92} metalness={0.02} />
		</mesh>
	);
}

function SoftCloud({
	position,
	scale,
	speed = 0.02,
}: {
	position: [number, number, number];
	scale: number;
	speed?: number;
}) {
	const cloudRef = useRef<any>(null);
	const initialX = position[0];

	useFrame(({ clock }) => {
		if (cloudRef.current) {
			cloudRef.current.position.x = initialX + Math.sin(clock.elapsedTime * speed) * 4.5;
		}
	});

	return (
		<group ref={cloudRef} position={position} scale={scale}>
			{[
				[-0.9, 0, 0],
				[0, 0.22, 0.1],
				[0.95, 0, 0],
				[0.42, -0.12, 0.25],
				[-0.45, 0.14, -0.2],
			].map(([x, y, z], index) => (
				<mesh key={index} position={[x, y, z]} scale={[1.35, 0.42, 0.65]}>
					<sphereGeometry args={[1, 16, 12]} />
					<meshBasicMaterial color="#ffffff" transparent opacity={0.42} depthWrite={false} />
				</mesh>
			))}
		</group>
	);
}

function SunlitMotes({ count = 120 }: { count?: number }) {
	const pointsRef = useRef<Points>(null);

	const { geometry, positions } = useMemo(() => {
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			pos[i * 3] = (Math.random() - 0.5) * 50;
			pos[i * 3 + 1] = Math.random() * 8 + 0.5;
			pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
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
				color="#fef08a"
				transparent
				opacity={0.65}
				depthWrite={false}
			/>
		</points>
	);
}

export function Environment() {
	const fog = useMemo(() => new FogExp2("#dff1f7", 0.0085), []);

	return (
		<>
			<color attach="background" args={["#cdecf8"]} />
			<primitive attach="fog" object={fog} />

			<Sky
				distance={450000}
				sunPosition={[45, 32, -75]}
				inclination={0.52}
				azimuth={0.25}
				rayleigh={1.4}
				turbidity={6.5}
				mieCoefficient={0.005}
				mieDirectionalG={0.88}
			/>

			<ambientLight intensity={0.55} color="#fffbeb" />

			<directionalLight
				position={[-18, 30, 16]}
				intensity={2.35}
				color="#fff4e0"
				castShadow
				shadow-mapSize-width={2048}
				shadow-mapSize-height={2048}
				shadow-camera-near={1}
				shadow-camera-far={85}
				shadow-camera-left={-35}
				shadow-camera-right={35}
				shadow-camera-top={35}
				shadow-camera-bottom={-35}
				shadow-bias={-0.00015}
			/>

			<hemisphereLight args={["#e0f2fe", "#96ab7b", 0.95]} />

			{mountainData.map(([x, y, z, scale, color], index) => (
				<Mountain key={index} position={[x, y, z]} scale={scale} color={color} />
			))}

			<SoftCloud position={[-20, 14, -18]} scale={3.4} speed={0.03} />
			<SoftCloud position={[18, 17, -24]} scale={2.8} speed={0.02} />
			<SoftCloud position={[-6, 19, -32]} scale={3.8} speed={0.015} />

			<SunlitMotes count={140} />
		</>
	);
}
