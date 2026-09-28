"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";
import { Group, MathUtils, Mesh, Vector3 } from "three";
import { treePositions } from "@/data/world";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { PlayerRuntime } from "@/types/world";

type AnimalManagerProps = {
	playerRef: { current: PlayerRuntime };
	quality: "LOW" | "MEDIUM" | "HIGH";
};

type CatMode = "walk" | "pause" | "rest" | "flee";

function Cat({ playerRef }: { playerRef: AnimalManagerProps["playerRef"] }) {
	const cat = useRef<Group>(null);
	const legs = useRef<Mesh[]>([]);
	const mode = useRef<CatMode>("walk");
	const timer = useRef(3);
	const heading = useRef(0.6);
	const home = useMemo(() => new Vector3(5.8, terrainHeight(5.8, 15), 15), []);
	const fleeTarget = useMemo(() => new Vector3(), []);
	const reducedMotion = Boolean(useReducedMotion());

	useFrame((_, delta) => {
		if (!cat.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		const player = playerRef.current.position;
		const dx = cat.current.position.x - player.x;
		const dz = cat.current.position.z - player.z;
		const distance = Math.hypot(dx, dz);
		if (distance < 3.2 && mode.current !== "flee") {
			mode.current = "flee";
			timer.current = 2.8;
			fleeTarget.set(MathUtils.clamp(cat.current.position.x + dx * 2.3, -24, 24), 0, MathUtils.clamp(cat.current.position.z + dz * 2.3, -30, 22));
		}
		timer.current -= dt;
		if (mode.current === "flee" && timer.current <= 0) mode.current = "walk";
		if (mode.current !== "flee" && timer.current <= 0) {
			mode.current = mode.current === "walk" ? (Math.random() < 0.38 ? "rest" : "pause") : "walk";
			timer.current = mode.current === "walk" ? 2.4 + Math.random() * 3 : 1.5 + Math.random() * 3;
			if (mode.current === "walk") heading.current += (Math.random() - 0.5) * 2.3;
		}
		const walking = mode.current === "walk" || mode.current === "flee";
		if (walking) {
			if (mode.current === "flee") heading.current = Math.atan2(fleeTarget.x - cat.current.position.x, fleeTarget.z - cat.current.position.z);
			const speed = mode.current === "flee" ? 2.5 : 0.55;
			cat.current.position.x += Math.sin(heading.current) * speed * dt;
			cat.current.position.z += Math.cos(heading.current) * speed * dt;
			if (mode.current === "walk" && cat.current.position.distanceTo(home) > 4.5) heading.current = Math.atan2(home.x - cat.current.position.x, home.z - cat.current.position.z);
			cat.current.rotation.y = heading.current;
			cat.current.rotation.x = 0;
		} else {
			cat.current.rotation.x = MathUtils.damp(cat.current.rotation.x, mode.current === "rest" ? -0.35 : 0, 3, dt);
		}
		cat.current.position.y = terrainHeight(cat.current.position.x, cat.current.position.z) + (walking ? Math.abs(Math.sin(timer.current * 8)) * 0.035 : 0);
		legs.current.forEach((leg, index) => { if (leg) leg.rotation.x = walking ? Math.sin(timer.current * (mode.current === "flee" ? 18 : 10) + index * Math.PI) * 0.32 : 0; });
	});

	return (
		<group ref={cat} position={[home.x, home.y, home.z]}>
			<mesh position={[0, 0.28, 0]} scale={[0.38, 0.24, 0.58]} castShadow><sphereGeometry args={[1, 12, 9]} /><meshStandardMaterial color="#d18b5b" roughness={0.9} /></mesh>
			<mesh position={[0, 0.43, -0.42]} scale={0.24} castShadow><sphereGeometry args={[1, 12, 9]} /><meshStandardMaterial color="#e6aa78" roughness={0.9} /></mesh>
			{[-1, 1].map((side) => <mesh key={side} position={[side * 0.13, 0.63, -0.53]} rotation={[0, 0, side * -0.18]}><coneGeometry args={[0.075, 0.19, 5]} /><meshStandardMaterial color="#d18b5b" roughness={0.9} /></mesh>)}
			<mesh position={[0, 0.13, 0.45]} rotation={[0.75, 0, 0]} scale={[0.08, 0.08, 0.42]}><capsuleGeometry args={[0.5, 1, 3, 6]} /><meshStandardMaterial color="#bd744b" roughness={0.9} /></mesh>
			{[[-1, 0.18], [1, 0.18], [-1, -0.25], [1, -0.25]].map(([side, z], index) => <mesh key={index} ref={(mesh) => { if (mesh) legs.current[index] = mesh; }} position={[side * 0.21, 0.12, z]} scale={[0.085, 0.18, 0.09]}><capsuleGeometry args={[0.5, 0.8, 3, 6]} /><meshStandardMaterial color="#c77d51" roughness={0.9} /></mesh>)}
			<mesh position={[0.08, 0.46, -0.61]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#273d34" /></mesh>
			<mesh position={[-0.08, 0.46, -0.61]}><sphereGeometry args={[0.035, 8, 6]} /><meshBasicMaterial color="#273d34" /></mesh>
		</group>
	);
}

function Bird({ index, playerRef }: { index: number; playerRef: AnimalManagerProps["playerRef"] }) {
	const bird = useRef<Group>(null);
	const wings = useRef<Group>(null);
	const perch = useMemo(() => {
		const [x, , z, scale] = treePositions[[2, 6, 15, 21, 27, 31][index]];
		return new Vector3(x, terrainHeight(x, z) + scale * 3.05, z);
	}, [index]);
	const flying = useRef(false);
	const elapsed = useRef(0);
	useFrame((_, delta) => {
		if (!bird.current) return;
		const dt = Math.min(delta, 0.05);
		elapsed.current += dt;
		const player = playerRef.current.position;
		const distance = Math.hypot(player.x - perch.x, player.z - perch.z);
		if (distance < 4) flying.current = true;
		if (flying.current) {
			bird.current.position.x = MathUtils.damp(bird.current.position.x, perch.x + Math.sin(elapsed.current * 0.8 + index) * 3, 1.6, dt);
			bird.current.position.z = MathUtils.damp(bird.current.position.z, perch.z - 4 - Math.cos(elapsed.current * 0.55 + index) * 2, 1.6, dt);
			bird.current.position.y = MathUtils.damp(bird.current.position.y, perch.y + 2.5 + Math.sin(elapsed.current * 5 + index) * 0.3, 2, dt);
			bird.current.rotation.y = Math.atan2(Math.cos(elapsed.current * 0.8 + index), Math.sin(elapsed.current * 0.8 + index));
		} else {
			bird.current.position.lerp(perch, 1 - Math.exp(-4 * dt));
			bird.current.rotation.z = Math.sin(elapsed.current * 2 + index) * 0.035;
		}
		if (wings.current) wings.current.rotation.z = flying.current ? Math.sin(elapsed.current * 18 + index) * 0.72 : Math.sin(elapsed.current * 2 + index) * 0.045;
	});
	return (
		<group ref={bird} position={[perch.x, perch.y, perch.z]}>
			<mesh scale={[0.13, 0.1, 0.22]}><sphereGeometry args={[1, 9, 7]} /><meshStandardMaterial color={index % 2 ? "#425e59" : "#5b7180"} roughness={0.8} /></mesh>
			<mesh position={[0, 0.04, -0.2]} rotation={[0.15, 0, 0]}><coneGeometry args={[0.055, 0.15, 5]} /><meshStandardMaterial color="#d9a96f" /></mesh>
			<group ref={wings}>
				{[-1, 1].map((side) => <mesh key={side} position={[side * 0.15, 0.015, 0]} rotation={[0, side * 0.12, side * -0.08]} scale={[0.2, 0.035, 0.11]}><sphereGeometry args={[1, 8, 6]} /><meshStandardMaterial color="#748b83" roughness={0.85} /></mesh>)}
			</group>
		</group>
	);
}

function Butterfly({ index }: { index: number }) {
	const butterfly = useRef<Group>(null);
	const wings = useRef<Group>(null);
	const centerX = Math.cos(index * 2.1) * 7;
	const centerZ = -14 + Math.sin(index * 2.1) * 5;
	useFrame(({ clock }) => {
		if (!butterfly.current || !wings.current) return;
		const t = clock.elapsedTime * 0.8 + index * 2.2;
		butterfly.current.position.set(centerX + Math.sin(t) * 0.7, terrainHeight(centerX, centerZ) + 1.05 + Math.sin(t * 2) * 0.17, centerZ + Math.cos(t * 0.8) * 0.7);
		butterfly.current.rotation.y = t;
		wings.current.rotation.y = Math.sin(t * 14) * 0.6;
	});
	return <group ref={butterfly}><mesh scale={[0.025, 0.025, 0.16]}><capsuleGeometry args={[0.5, 1, 3, 5]} /><meshStandardMaterial color="#554e63" /></mesh><group ref={wings}>{[-1, 1].map((side) => <mesh key={side} position={[side * 0.12, 0, 0]} scale={[0.14, 0.025, 0.12]}><sphereGeometry args={[1, 8, 6]} /><meshBasicMaterial color={index % 2 ? "#edb8cf" : "#e9ce91"} side={2} /></mesh>)}</group></group>;
}

export function AnimalManager({ playerRef, quality }: AnimalManagerProps) {
	const birdCount = quality === "LOW" ? 2 : quality === "MEDIUM" ? 4 : 6;
	const butterflyCount = quality === "LOW" ? 2 : 4;
	return <group><Cat playerRef={playerRef} />{Array.from({ length: birdCount }, (_, index) => <Bird key={index} index={index} playerRef={playerRef} />)}{Array.from({ length: butterflyCount }, (_, index) => <Butterfly key={index} index={index} />)}</group>;
}
