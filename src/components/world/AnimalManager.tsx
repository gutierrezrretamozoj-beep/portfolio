"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef } from "react";
import {
	Color,
	DoubleSide,
	Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	Vector3,
} from "three";
import { treePositions } from "@/data/world";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { PlayerRuntime } from "@/types/world";

type AnimalManagerProps = {
	playerRef: { current: PlayerRuntime };
	quality: "LOW" | "MEDIUM" | "HIGH";
};

type CatState = "walk" | "look" | "rest" | "flee";

/**
 * Natural Cat Component with Organic FSM, Smooth Rotations,
 * Quadruped Walk Cycles, and Shade-seeking Resting Behavior.
 */
function Cat({ playerRef }: { playerRef: AnimalManagerProps["playerRef"] }) {
	const catGroup = useRef<Group>(null);
	const headRef = useRef<Group>(null);
	const spineRef = useRef<Group>(null);
	const tailBase = useRef<Group>(null);
	const tailMid = useRef<Group>(null);
	const tailTip = useRef<Group>(null);

	// Leg references: [frontLeft, frontRight, hindLeft, hindRight]
	const legs = useRef<Mesh[]>([]);

	// Position & Navigation Physics
	const pos = useRef(new Vector3(4.5, terrainHeight(4.5, 12), 12));
	const currentYaw = useRef(0.4);
	const desiredYaw = useRef(0.4);
	const currentSpeed = useRef(0);
	const targetPos = useRef(new Vector3(4.5, 0, 12));

	// FSM state & timers
	const state = useRef<CatState>("walk");
	const stateTimer = useRef(4.0);
	const walkCycle = useRef(0);
	const lookAngle = useRef(0);
	const lookTimer = useRef(0);
	const earTwitch = useRef(0);

	const reducedMotion = Boolean(useReducedMotion());

	// Materials for Stylized Tabby Cat
	const catMaterials = useMemo(() => {
		return {
			coat: new MeshStandardMaterial({
				color: "#e07a38", // Marmalade / Ginger Tabby
				roughness: 0.75,
				metalness: 0.05,
			}),
			underbelly: new MeshStandardMaterial({
				color: "#fef3c7", // Warm cream chest & muzzle
				roughness: 0.8,
			}),
			paws: new MeshStandardMaterial({
				color: "#ffffff", // White socks / paws
				roughness: 0.7,
			}),
			innerEar: new MeshStandardMaterial({
				color: "#fbcfe8", // Soft pastel pink
				roughness: 0.6,
			}),
			nose: new MeshStandardMaterial({
				color: "#f472b6",
				roughness: 0.4,
			}),
			eyes: new MeshStandardMaterial({
				color: "#10b981", // Emerald green feline eyes
				roughness: 0.2,
				emissive: "#059669",
				emissiveIntensity: 0.25,
			}),
			pupils: new MeshStandardMaterial({
				color: "#111827",
				roughness: 0.1,
			}),
		};
	}, []);

	// Pick a random destination anywhere across the world
	const pickNewDestination = () => {
		let x = MathUtils.randFloat(-22, 22);
		let z = MathUtils.randFloat(-26, 22);

		// Avoid walking straight into deep river
		const riverZ = -2.5 + Math.sin(x * 0.13) * 0.75;
		if (Math.abs(z - riverZ) < 2.0) {
			z = riverZ + (z > riverZ ? 2.4 : -2.4);
		}

		targetPos.current.set(x, terrainHeight(x, z), z);
	};

	// Find the nearest tree to rest in its shade
	const findShadyTree = () => {
		let bestTree = treePositions[0];
		let shortestDist = Infinity;
		for (const tree of treePositions) {
			const d = Math.hypot(tree[0] - pos.current.x, tree[2] - pos.current.z);
			if (d < shortestDist && d > 2.0 && d < 18.0) {
				shortestDist = d;
				bestTree = tree;
			}
		}
		// Stand just under tree canopy
		const angle = Math.random() * Math.PI * 2;
		const offset = 0.8 + Math.random() * 0.6;
		const tx = bestTree[0] + Math.cos(angle) * offset;
		const tz = bestTree[2] + Math.sin(angle) * offset;
		targetPos.current.set(tx, terrainHeight(tx, tz), tz);
	};

	useFrame((_, delta) => {
		if (!catGroup.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);

		stateTimer.current -= dt;
		const player = playerRef.current.position;
		const distToPlayer = Math.hypot(player.x - pos.current.x, player.z - pos.current.z);

		// Check player proximity (Flee if startled)
		if (distToPlayer < 2.2 && state.current !== "flee") {
			state.current = "flee";
			stateTimer.current = 2.8;
			const fleeDirX = pos.current.x - player.x;
			const fleeDirZ = pos.current.z - player.z;
			const len = Math.hypot(fleeDirX, fleeDirZ) || 1;
			targetPos.current.set(
				MathUtils.clamp(pos.current.x + (fleeDirX / len) * 6, -23, 23),
				0,
				MathUtils.clamp(pos.current.z + (fleeDirZ / len) * 6, -27, 23)
			);
		}

		// State Machine Transitions
		if (stateTimer.current <= 0) {
			if (state.current === "flee") {
				state.current = "look";
				stateTimer.current = 2.5;
			} else if (state.current === "walk") {
				// Arrived or finished walking: look around or find shade
				const roll = Math.random();
				if (roll < 0.45) {
					state.current = "look";
					stateTimer.current = 2.5 + Math.random() * 2.5;
					lookAngle.current = (Math.random() - 0.5) * 1.4;
				} else if (roll < 0.75) {
					state.current = "rest";
					stateTimer.current = 5.0 + Math.random() * 5.0;
					findShadyTree();
				} else {
					pickNewDestination();
					stateTimer.current = 4.0 + Math.random() * 4.0;
				}
			} else if (state.current === "look") {
				// From look, start walking
				state.current = "walk";
				stateTimer.current = 5.0 + Math.random() * 4.0;
				pickNewDestination();
			} else if (state.current === "rest") {
				// Waking up from rest
				state.current = "look";
				stateTimer.current = 2.0;
			}
		}

		// Movement Physics & Direction Steering
		const dx = targetPos.current.x - pos.current.x;
		const dz = targetPos.current.z - pos.current.z;
		const distToTarget = Math.hypot(dx, dz);

		const isMoving = (state.current === "walk" && distToTarget > 0.4) || state.current === "flee";
		const maxSpeed = state.current === "flee" ? 3.4 : 1.15;
		const targetSpeed = isMoving ? maxSpeed : 0;

		// Organic acceleration & deceleration
		currentSpeed.current = MathUtils.damp(currentSpeed.current, targetSpeed, 4.5, dt);

		if (isMoving && distToTarget > 0.05) {
			desiredYaw.current = Math.atan2(dx, dz);
			walkCycle.current += dt * (state.current === "flee" ? 14.0 : 7.5);
		}

		// Smooth continuous angle lerp (eliminates jerky 180° rotation snaps)
		let angleDiff = desiredYaw.current - currentYaw.current;
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
		currentYaw.current += angleDiff * (1 - Math.exp(-6.5 * dt));

		// Update position
		pos.current.x += Math.sin(currentYaw.current) * currentSpeed.current * dt;
		pos.current.z += Math.cos(currentYaw.current) * currentSpeed.current * dt;
		pos.current.y = terrainHeight(pos.current.x, pos.current.z);

		// Synchronize cat root
		catGroup.current.position.set(pos.current.x, pos.current.y, pos.current.z);
		catGroup.current.rotation.y = currentYaw.current;

		// Procedural Skeletal Animations
		const t = walkCycle.current;

		if (isMoving) {
			// Natural quadruped diagonal gait:
			// Front-left (0) & Back-right (3) swing together, Front-right (1) & Back-left (2) alternate
			const legSwing = state.current === "flee" ? 0.75 : 0.48;
			if (legs.current[0]) legs.current[0].rotation.x = Math.sin(t) * legSwing;
			if (legs.current[1]) legs.current[1].rotation.x = -Math.sin(t) * legSwing;
			if (legs.current[2]) legs.current[2].rotation.x = -Math.sin(t) * legSwing;
			if (legs.current[3]) legs.current[3].rotation.x = Math.sin(t) * legSwing;

			// Spine & Body bounce
			if (spineRef.current) {
				spineRef.current.position.y = 0.28 + Math.abs(Math.sin(t * 2)) * 0.025;
				spineRef.current.rotation.z = Math.sin(t) * 0.04;
			}

			// Head follows gait
			if (headRef.current) {
				headRef.current.rotation.x = Math.sin(t * 2) * 0.04;
				headRef.current.rotation.y = MathUtils.damp(headRef.current.rotation.y, 0, 4, dt);
			}

			// Tail waves gracefully in wind
			if (tailBase.current && tailMid.current && tailTip.current) {
				tailBase.current.rotation.x = 0.65 + Math.sin(t) * 0.12;
				tailMid.current.rotation.y = Math.sin(t * 1.5) * 0.25;
				tailTip.current.rotation.y = Math.sin(t * 1.5 + 0.6) * 0.35;
			}
		} else if (state.current === "look") {
			// Cat is stationary, looking around curiously
			for (let i = 0; i < 4; i++) {
				if (legs.current[i]) legs.current[i].rotation.x = MathUtils.damp(legs.current[i].rotation.x, 0, 5, dt);
			}
			if (spineRef.current) {
				spineRef.current.position.y = MathUtils.damp(spineRef.current.position.y, 0.28, 4, dt);
				spineRef.current.rotation.set(0, 0, 0);
			}
			if (headRef.current) {
				headRef.current.rotation.y = MathUtils.damp(headRef.current.rotation.y, lookAngle.current, 3, dt);
				headRef.current.rotation.x = MathUtils.damp(headRef.current.rotation.x, 0.08, 4, dt);
			}
			// Slow lazy tail swish
			if (tailBase.current && tailMid.current && tailTip.current) {
				const swish = Math.sin(stateTimer.current * 2.2);
				tailBase.current.rotation.x = 0.45;
				tailMid.current.rotation.y = swish * 0.35;
				tailTip.current.rotation.y = swish * 0.5;
			}
		} else if (state.current === "rest") {
			// Cat is curled up / lying down in the shade
			for (let i = 0; i < 4; i++) {
				if (legs.current[i]) legs.current[i].rotation.x = MathUtils.damp(legs.current[i].rotation.x, i < 2 ? 0.7 : -0.7, 4, dt);
			}
			if (spineRef.current) {
				// Sits lower on the ground with relaxed breathing
				const breath = Math.sin(stateTimer.current * 1.8) * 0.015;
				spineRef.current.position.y = MathUtils.damp(spineRef.current.position.y, 0.14 + breath, 3, dt);
				spineRef.current.rotation.x = MathUtils.damp(spineRef.current.rotation.x, -0.15, 3, dt);
			}
			if (headRef.current) {
				headRef.current.position.y = 0.22;
				headRef.current.rotation.x = MathUtils.damp(headRef.current.rotation.x, -0.22, 3, dt);
				headRef.current.rotation.y = MathUtils.damp(headRef.current.rotation.y, 0.25, 3, dt);
			}
			// Tail curled around body
			if (tailBase.current && tailMid.current && tailTip.current) {
				tailBase.current.rotation.x = 0.15;
				tailMid.current.rotation.y = 0.85;
				tailTip.current.rotation.y = 0.75 + Math.sin(stateTimer.current * 1.5) * 0.1;
			}
		}
	});

	return (
		<group ref={catGroup} position={[4.5, 0, 12]}>
			{/* Main Torso & Spine */}
			<group ref={spineRef} position={[0, 0.28, 0]}>
				{/* Sleek Feline Body */}
				<mesh castShadow receiveShadow material={catMaterials.coat} scale={[0.22, 0.2, 0.46]}>
					<sphereGeometry args={[1, 14, 12]} />
				</mesh>

				{/* Cream chest & underbelly patch */}
				<mesh position={[0, -0.04, 0.05]} material={catMaterials.underbelly} scale={[0.18, 0.14, 0.38]}>
					<sphereGeometry args={[1, 12, 10]} />
				</mesh>

				{/* Head & Neck */}
				<group ref={headRef} position={[0, 0.16, 0.28]}>
					{/* Sculpted Head */}
					<mesh castShadow material={catMaterials.coat} scale={[0.18, 0.16, 0.18]}>
						<sphereGeometry args={[1, 14, 12]} />
					</mesh>

					{/* Cheek fur tufts */}
					<mesh position={[-0.14, -0.02, -0.02]} rotation={[0, 0, -0.3]} material={catMaterials.underbelly} scale={[0.07, 0.08, 0.08]}>
						<coneGeometry args={[1, 1.2, 6]} />
					</mesh>
					<mesh position={[0.14, -0.02, -0.02]} rotation={[0, 0, 0.3]} material={catMaterials.underbelly} scale={[0.07, 0.08, 0.08]}>
						<coneGeometry args={[1, 1.2, 6]} />
					</mesh>

					{/* Muzzle */}
					<mesh position={[0, -0.04, 0.14]} material={catMaterials.underbelly} scale={[0.08, 0.06, 0.06]}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>
					{/* Tiny Pink Nose */}
					<mesh position={[0, -0.02, 0.19]} material={catMaterials.nose} scale={[0.022, 0.016, 0.018]}>
						<coneGeometry args={[1, 1, 4]} />
					</mesh>

					{/* Pointed Ears with Pink Interior */}
					{[-1, 1].map((side) => (
						<group key={side} position={[side * 0.1, 0.16, -0.02]} rotation={[0.1, side * 0.2, side * -0.25]}>
							{/* Outer ear */}
							<mesh castShadow material={catMaterials.coat} scale={[0.06, 0.14, 0.05]}>
								<coneGeometry args={[1, 1.2, 5]} />
							</mesh>
							{/* Inner pink flap */}
							<mesh position={[0, -0.01, 0.018]} material={catMaterials.innerEar} scale={[0.042, 0.1, 0.02]}>
								<coneGeometry args={[1, 1, 4]} />
							</mesh>
						</group>
					))}

					{/* Expressive Emerald Eyes */}
					{[-1, 1].map((side) => (
						<group key={side} position={[side * 0.07, 0.03, 0.14]} rotation={[0, side * 0.3, 0]}>
							<mesh material={catMaterials.eyes} scale={[0.032, 0.038, 0.018]}>
								<sphereGeometry args={[1, 10, 10]} />
							</mesh>
							{/* Feline vertical slit pupil */}
							<mesh position={[0, 0, 0.014]} material={catMaterials.pupils} scale={[0.008, 0.028, 0.008]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
						</group>
					))}
				</group>

				{/* Articulated Multi-Segment Tail */}
				<group ref={tailBase} position={[0, 0.08, -0.24]}>
					<mesh material={catMaterials.coat} position={[0, 0.08, -0.08]} rotation={[0.6, 0, 0]} scale={[0.045, 0.14, 0.045]}>
						<cylinderGeometry args={[0.7, 1, 1, 8]} />
					</mesh>
					<group ref={tailMid} position={[0, 0.16, -0.14]}>
						<mesh material={catMaterials.coat} position={[0, 0.08, -0.06]} rotation={[0.4, 0, 0]} scale={[0.04, 0.14, 0.04]}>
							<cylinderGeometry args={[0.8, 1, 1, 8]} />
						</mesh>
						<group ref={tailTip} position={[0, 0.16, -0.1]}>
							<mesh material={catMaterials.underbelly} position={[0, 0.06, -0.03]} rotation={[0.2, 0, 0]} scale={[0.035, 0.12, 0.035]}>
								<sphereGeometry args={[1, 8, 8]} />
							</mesh>
						</group>
					</group>
				</group>
			</group>

			{/* 4 Articulated Legs: [frontLeft, frontRight, hindLeft, hindRight] */}
			{[
				{ pos: [-0.13, 0.14, 0.16], isFront: true },
				{ pos: [0.13, 0.14, 0.16], isFront: true },
				{ pos: [-0.14, 0.14, -0.16], isFront: false },
				{ pos: [0.14, 0.14, -0.16], isFront: false },
			].map((cfg, index) => (
				<mesh
					key={index}
					ref={(el) => {
						if (el) legs.current[index] = el;
					}}
					position={cfg.pos as [number, number, number]}
					castShadow
					material={catMaterials.coat}
					scale={[0.055, 0.18, 0.06]}
				>
					<cylinderGeometry args={[0.8, 0.65, 1, 8]} />
					{/* White Mittens / Paws at foot */}
					<mesh position={[0, -0.52, 0.08]} material={catMaterials.paws} scale={[1.1, 0.4, 1.4]}>
						<sphereGeometry args={[1, 8, 8]} />
					</mesh>
				</mesh>
			))}
		</group>
	);
}

type RabbitState = "sniff" | "hop" | "graze" | "flee";

type RabbitProps = {
	initialPos: [number, number];
	colorTheme: "snow" | "caramel" | "cinnamon";
	playerRef: AnimalManagerProps["playerRef"];
};

/**
 * Cute Stylized Rabbit / Bunny with Playful Hops,
 * Ear Twitches, Grass Grazing, and Proximity-Flee Reactions!
 */
function Rabbit({ initialPos, colorTheme, playerRef }: RabbitProps) {
	const rabbitGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);
	const earLeft = useRef<Group>(null);
	const earRight = useRef<Group>(null);
	const noseRef = useRef<Mesh>(null);

	const pos = useRef(new Vector3(initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]));
	const targetPos = useRef(new Vector3(initialPos[0], 0, initialPos[1]));
	const currentYaw = useRef(Math.random() * Math.PI * 2);
	const desiredYaw = useRef(currentYaw.current);

	const state = useRef<RabbitState>("sniff");
	const timer = useRef(2.0 + Math.random() * 2);
	const hopProgress = useRef(0);
	const hopsRemaining = useRef(0);

	const materials = useMemo(() => {
		const furColor = colorTheme === "snow" ? "#f8fafc" : colorTheme === "caramel" ? "#fef3c7" : "#d97706";
		return {
			fur: new MeshStandardMaterial({ color: furColor, roughness: 0.82 }),
			innerEar: new MeshStandardMaterial({ color: "#fbcfe8", roughness: 0.6 }),
			nose: new MeshStandardMaterial({ color: "#f472b6", roughness: 0.4 }),
			eye: new MeshStandardMaterial({ color: "#1e1e24", roughness: 0.15 }),
			tail: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
		};
	}, [colorTheme]);

	useFrame((_, delta) => {
		if (!rabbitGroup.current) return;
		const dt = Math.min(delta, 0.05);
		timer.current -= dt;

		const player = playerRef.current.position;
		const distToPlayer = Math.hypot(player.x - pos.current.x, player.z - pos.current.z);

		// Proximity reaction: if player gets closer than 3.5m, flee away!
		if (distToPlayer < 3.5 && state.current !== "flee") {
			state.current = "flee";
			hopsRemaining.current = 4;
			hopProgress.current = 0;
			const fleeAngle = Math.atan2(pos.current.x - player.x, pos.current.z - player.z);
			desiredYaw.current = fleeAngle + (Math.random() - 0.5) * 0.4;
		}

		// State management
		if (state.current === "flee") {
			// Rapid emergency hops away from player
			hopProgress.current += dt * 6.5;
			if (hopProgress.current >= Math.PI) {
				hopProgress.current = 0;
				hopsRemaining.current--;
				if (hopsRemaining.current <= 0) {
					state.current = "sniff";
					timer.current = 2.0;
				}
			}
			const hopHeight = Math.sin(hopProgress.current) * 0.28;
			const moveSpeed = 3.6;
			pos.current.x += Math.sin(currentYaw.current) * moveSpeed * dt;
			pos.current.z += Math.cos(currentYaw.current) * moveSpeed * dt;
			pos.current.y = terrainHeight(pos.current.x, pos.current.z) + hopHeight;
		} else if (state.current === "hop") {
			// Normal playful hop
			hopProgress.current += dt * 4.2;
			if (hopProgress.current >= Math.PI) {
				hopProgress.current = 0;
				hopsRemaining.current--;
				if (hopsRemaining.current <= 0) {
					state.current = Math.random() < 0.6 ? "graze" : "sniff";
					timer.current = 2.5 + Math.random() * 3.0;
				}
			}
			const hopHeight = Math.sin(hopProgress.current) * 0.22;
			const moveSpeed = 1.35;
			pos.current.x += Math.sin(currentYaw.current) * moveSpeed * dt;
			pos.current.z += Math.cos(currentYaw.current) * moveSpeed * dt;
			pos.current.y = terrainHeight(pos.current.x, pos.current.z) + hopHeight;
		} else {
			// Stationary states: "sniff" or "graze"
			pos.current.y = terrainHeight(pos.current.x, pos.current.z);

			if (timer.current <= 0) {
				if (state.current === "sniff" || state.current === "graze") {
					// Prepare for 2 to 3 friendly hops
					state.current = "hop";
					hopsRemaining.current = Math.floor(Math.random() * 2) + 2;
					hopProgress.current = 0;
					desiredYaw.current += (Math.random() - 0.5) * 1.8;
				}
			}
		}

		// Smooth rotation
		let angleDiff = desiredYaw.current - currentYaw.current;
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
		currentYaw.current += angleDiff * (1 - Math.exp(-8 * dt));

		rabbitGroup.current.position.set(pos.current.x, pos.current.y, pos.current.z);
		rabbitGroup.current.rotation.y = currentYaw.current;

		// Head & Ear animations
		if (headGroup.current && earLeft.current && earRight.current && noseRef.current) {
			if (state.current === "graze") {
				// Nibbling ground
				headGroup.current.position.y = MathUtils.damp(headGroup.current.position.y, 0.12, 5, dt);
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, 0.45, 5, dt);
				noseRef.current.position.y = -0.04 + Math.sin(timer.current * 16) * 0.01;
			} else if (state.current === "sniff") {
				// Alert nose sniffing & ear listening
				headGroup.current.position.y = MathUtils.damp(headGroup.current.position.y, 0.24, 5, dt);
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, -0.15, 5, dt);
				noseRef.current.position.y = -0.04 + Math.sin(timer.current * 22) * 0.015;
				earLeft.current.rotation.y = Math.sin(timer.current * 3) * 0.18;
				earRight.current.rotation.y = -Math.sin(timer.current * 3 + 0.4) * 0.18;
			} else if (state.current === "hop" || state.current === "flee") {
				// Ears flop back during airborne hops
				earLeft.current.rotation.x = MathUtils.damp(earLeft.current.rotation.x, -0.45, 6, dt);
				earRight.current.rotation.x = MathUtils.damp(earRight.current.rotation.x, -0.45, 6, dt);
			}
		}
	});

	return (
		<group ref={rabbitGroup} position={[initialPos[0], 0, initialPos[1]]} scale={0.78}>
			{/* Rounded Body */}
			<mesh castShadow receiveShadow material={materials.fur} position={[0, 0.18, -0.04]} scale={[0.18, 0.16, 0.24]}>
				<sphereGeometry args={[1, 12, 10]} />
			</mesh>

			{/* Fluffy Pom-Pom Tail */}
			<mesh position={[0, 0.22, -0.28]} material={materials.tail} scale={0.065}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Front paws & Hind Thighs */}
			<mesh position={[-0.1, 0.06, 0.08]} material={materials.fur} scale={[0.045, 0.08, 0.07]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>
			<mesh position={[0.1, 0.06, 0.08]} material={materials.fur} scale={[0.045, 0.08, 0.07]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>
			<mesh position={[-0.12, 0.12, -0.12]} material={materials.fur} scale={[0.065, 0.12, 0.12]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>
			<mesh position={[0.12, 0.12, -0.12]} material={materials.fur} scale={[0.065, 0.12, 0.12]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Head & Ears */}
			<group ref={headGroup} position={[0, 0.24, 0.16]}>
				<mesh castShadow material={materials.fur} scale={[0.14, 0.13, 0.15]}>
					<sphereGeometry args={[1, 12, 10]} />
				</mesh>

				{/* Snout & Twitching Pink Nose */}
				<mesh ref={noseRef} position={[0, -0.04, 0.15]} material={materials.nose} scale={[0.02, 0.015, 0.02]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>

				{/* Button Eyes */}
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.09, 0.03, 0.08]} material={materials.eye} scale={0.024}>
						<sphereGeometry args={[1, 8, 8]} />
					</mesh>
				))}

				{/* Long Expressive Ears */}
				<group ref={earLeft} position={[-0.06, 0.12, -0.02]} rotation={[0.1, 0, -0.15]}>
					<mesh castShadow material={materials.fur} scale={[0.035, 0.18, 0.03]}>
						<cylinderGeometry args={[0.8, 0.6, 1, 6]} />
					</mesh>
					<mesh position={[0, 0, 0.016]} material={materials.innerEar} scale={[0.022, 0.14, 0.01]}>
						<cylinderGeometry args={[0.7, 0.5, 1, 5]} />
					</mesh>
				</group>

				<group ref={earRight} position={[0.06, 0.12, -0.02]} rotation={[0.1, 0, 0.15]}>
					<mesh castShadow material={materials.fur} scale={[0.035, 0.18, 0.03]}>
						<cylinderGeometry args={[0.8, 0.6, 1, 6]} />
					</mesh>
					<mesh position={[0, 0, 0.016]} material={materials.innerEar} scale={[0.022, 0.14, 0.01]}>
						<cylinderGeometry args={[0.7, 0.5, 1, 5]} />
					</mesh>
				</group>
			</group>
		</group>
	);
}

// Tree Perching Songbirds
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
			<mesh scale={[0.13, 0.1, 0.22]}>
				<sphereGeometry args={[1, 9, 7]} />
				<meshStandardMaterial color={index % 2 ? "#425e59" : "#5b7180"} roughness={0.8} />
			</mesh>
			<mesh position={[0, 0.04, -0.2]} rotation={[0.15, 0, 0]}>
				<coneGeometry args={[0.055, 0.15, 5]} />
				<meshStandardMaterial color="#d9a96f" />
			</mesh>
			<group ref={wings}>
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.15, 0.015, 0]} rotation={[0, side * 0.12, side * -0.08]} scale={[0.2, 0.035, 0.11]}>
						<sphereGeometry args={[1, 8, 6]} />
						<meshStandardMaterial color="#748b83" roughness={0.85} />
					</mesh>
				))}
			</group>
		</group>
	);
}

// Gentle Meadow Butterflies
function Butterfly({ index }: { index: number }) {
	const butterfly = useRef<Group>(null);
	const wings = useRef<Group>(null);
	const centerX = Math.cos(index * 2.1) * 8;
	const centerZ = -12 + Math.sin(index * 2.1) * 6;

	useFrame(({ clock }) => {
		if (!butterfly.current || !wings.current) return;
		const t = clock.elapsedTime * 0.8 + index * 2.2;
		butterfly.current.position.set(
			centerX + Math.sin(t) * 0.8,
			terrainHeight(centerX, centerZ) + 1.1 + Math.sin(t * 2) * 0.18,
			centerZ + Math.cos(t * 0.8) * 0.8
		);
		butterfly.current.rotation.y = t;
		wings.current.rotation.y = Math.sin(t * 14) * 0.6;
	});

	return (
		<group ref={butterfly}>
			<mesh scale={[0.025, 0.025, 0.16]}>
				<capsuleGeometry args={[0.5, 1, 3, 5]} />
				<meshStandardMaterial color="#554e63" />
			</mesh>
			<group ref={wings}>
				{[-1, 1].map((side) => (
					<mesh key={side} position={[side * 0.12, 0, 0]} scale={[0.14, 0.025, 0.12]}>
						<sphereGeometry args={[1, 8, 6]} />
						<meshBasicMaterial color={index % 2 ? "#f472b6" : "#fef08a"} side={DoubleSide} />
					</mesh>
				))}
			</group>
		</group>
	);
}

export function AnimalManager({ playerRef, quality }: AnimalManagerProps) {
	const birdCount = quality === "LOW" ? 2 : quality === "MEDIUM" ? 4 : 6;
	const butterflyCount = quality === "LOW" ? 2 : 4;
	const rabbitCount = quality === "LOW" ? 3 : 5;

	// Coordinated bunny habitats across meadows and flower fields
	const rabbitData: Array<{ pos: [number, number]; theme: "snow" | "caramel" | "cinnamon" }> = [
		{ pos: [6, 14], theme: "snow" },
		{ pos: [-10, 8], theme: "caramel" },
		{ pos: [12, -7], theme: "cinnamon" },
		{ pos: [-8, -16], theme: "snow" },
		{ pos: [9, -21], theme: "caramel" },
	];

	return (
		<group>
			{/* High-Fidelity Organic FSM Cat */}
			<Cat playerRef={playerRef} />

			{/* Sweet Meadow Bunnies */}
			{rabbitData.slice(0, rabbitCount).map((item, index) => (
				<Rabbit
					key={index}
					initialPos={item.pos}
					colorTheme={item.theme}
					playerRef={playerRef}
				/>
			))}

			{/* Songbirds */}
			{Array.from({ length: birdCount }, (_, index) => (
				<Bird key={index} index={index} playerRef={playerRef} />
			))}

			{/* Butterflies */}
			{Array.from({ length: butterflyCount }, (_, index) => (
				<Butterfly key={index} index={index} />
			))}
		</group>
	);
}
