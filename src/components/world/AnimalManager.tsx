"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { worldAudio } from "@/components/world/world-audio";
import {
	BoxGeometry,
	ConeGeometry,
	Group,
	MathUtils,
	Mesh,
	MeshBasicMaterial,
	MeshStandardMaterial,
	SphereGeometry,
	Vector2,
	Vector3,
} from "three";
import { GLBOrFallback } from "@/components/world/ModelAsset";
import { getModelUrl, MODEL_SPECS, type ModelSlotId } from "@/data/models-manifest";
import { treePositions } from "@/data/world";
import { getBridgeDeckHeight } from "@/components/player/navigation";
import { terrainHeight, type CircularCollider } from "@/components/world/terrain-utils";
import type { PlayerRuntime } from "@/types/world";

function useGlbAnimSync(slot: ModelSlotId) {
	const hasGlb = Boolean(getModelUrl(slot));
	const [animState, setAnimState] = useState("idle");
	const lastAnimRef = useRef("idle");
	const speedRef = useRef(0);

	const sync = (nextAnim: string, speed = 1) => {
		if (!hasGlb) return;
		speedRef.current = speed;
		if (nextAnim !== lastAnimRef.current) {
			lastAnimRef.current = nextAnim;
			setAnimState(nextAnim);
		}
	};

	return { animState, speedRef, sync };
}

const SHARED_BIRD_BODY_GEO = new SphereGeometry(1, 9, 7);
const SHARED_BIRD_BEAK_GEO = new ConeGeometry(0.055, 0.15, 5);
const SHARED_BIRD_WING_GEO = new SphereGeometry(1, 8, 6);
const SHARED_BIRD_BODY_MATS = [
	new MeshStandardMaterial({ color: "#5b7180", roughness: 0.8 }),
	new MeshStandardMaterial({ color: "#425e59", roughness: 0.8 }),
];
const SHARED_BIRD_BEAK_MAT = new MeshStandardMaterial({ color: "#d9a96f" });
const SHARED_BIRD_WING_MAT = new MeshStandardMaterial({ color: "#748b83", roughness: 0.85 });

const SHARED_SOAR_BODY_GEO = new SphereGeometry(1, 6, 6);
const SHARED_SOAR_WING_GEO = new BoxGeometry(1, 1, 1);
const SHARED_SOAR_MATS: Record<string, MeshBasicMaterial> = {
	"#334155": new MeshBasicMaterial({ color: "#334155" }),
	"#475569": new MeshBasicMaterial({ color: "#475569" }),
	"#1e293b": new MeshBasicMaterial({ color: "#1e293b" }),
};

type AnimalManagerProps = {
	playerRef: { current: PlayerRuntime };
	quality: "LOW" | "MEDIUM" | "HIGH";
	colliders: CircularCollider[];
};

const ANIMAL_LIMITS = { minX: -25.5, maxX: 25.5, minZ: -29.5, maxZ: 24.5 };
const CAT_RADIUS = 0.28;
const RABBIT_RADIUS = 0.18;

function constrainAnimalMove(position: Vector3, nextX: number, nextZ: number, radius: number, colliders: CircularCollider[]) {
	let x = MathUtils.clamp(nextX, ANIMAL_LIMITS.minX, ANIMAL_LIMITS.maxX);
	let z = MathUtils.clamp(nextZ, ANIMAL_LIMITS.minZ, ANIMAL_LIMITS.maxZ);

	// Bridge wooden railings & side barriers for animals
	const isBridgeZ = z >= -5.6 && z <= 0.6;
	const wasBridgeZ = position.z >= -5.6 && position.z <= 0.6;
	const wasOnBridgeDeck = Math.abs(position.x) <= 1.35 && (wasBridgeZ || (position.z >= -6.1 && position.z <= 1.1));

	if (isBridgeZ || wasBridgeZ) {
		if (wasOnBridgeDeck) {
			// Animal is ON the bridge: keep strictly inside the wooden railings
			x = MathUtils.clamp(x, -1.25, 1.25);
		} else {
			// Animal is on the bank: prevent walking into bridge sides
			if (Math.abs(x) < 1.62) {
				const sideSign = Math.sign(position.x) || (x >= 0 ? 1 : -1);
				x = sideSign * 1.62;
			}
		}
	}

	const riverCenter = -2.5 + Math.sin(x * 0.13) * 0.75;
	const onBridge = getBridgeDeckHeight(x, z) !== null;
	if (!onBridge && Math.abs(z - riverCenter) < 1.72) {
		const bankSign = Math.sign(position.z - riverCenter) || (z > riverCenter ? 1 : -1);
		z = riverCenter + bankSign * 1.72;
	}

	for (let pass = 0; pass < 2; pass += 1) {
		for (const collider of colliders) {
			const offsetX = x - collider.x;
			const offsetZ = z - collider.z;
			const distance = Math.hypot(offsetX, offsetZ);
			const minimumDistance = collider.radius + radius;
			if (distance >= minimumDistance) continue;

			const normalX = distance > 1e-5 ? offsetX / distance : 1;
			const normalZ = distance > 1e-5 ? offsetZ / distance : 0;
			const penetration = minimumDistance - distance;
			x += normalX * penetration;
			z += normalZ * penetration;
		}
	}

	x = MathUtils.clamp(x, ANIMAL_LIMITS.minX, ANIMAL_LIMITS.maxX);
	z = MathUtils.clamp(z, ANIMAL_LIMITS.minZ, ANIMAL_LIMITS.maxZ);
	const bridgeHeight = getBridgeDeckHeight(x, z);
	return { x, z, ground: bridgeHeight === null ? terrainHeight(x, z) : bridgeHeight - 0.01 };
}

type CatState = "walk" | "look" | "rest" | "flee";

/**
 * Natural Cat Component with Organic FSM, Smooth Rotations,
 * Quadruped Walk Cycles, and Shade-seeking Resting Behavior.
 */
function Cat({ playerRef, colliders, reducedMotion }: { playerRef: AnimalManagerProps["playerRef"]; colliders: AnimalManagerProps["colliders"]; reducedMotion: boolean }) {
	const catGlb = useGlbAnimSync("animals/cat");
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
		for (let attempt = 0; attempt < 12; attempt += 1) {
			const x = MathUtils.randFloat(-22, 22);
			let z = MathUtils.randFloat(-26, 22);
			const riverZ = -2.5 + Math.sin(x * 0.13) * 0.75;
			if (Math.abs(z - riverZ) < 2.0) {
				const currentRiverZ = -2.5 + Math.sin(pos.current.x * 0.13) * 0.75;
				const bank = Math.sign(pos.current.z - currentRiverZ) || 1;
				z = riverZ + bank * 2.4;
			}
			const blocked = colliders.some((collider) => Math.hypot(x - collider.x, z - collider.z) < collider.radius + CAT_RADIUS + 0.1);
			if (blocked) continue;
			targetPos.current.set(x, terrainHeight(x, z), z);
			return;
		}
		targetPos.current.set(pos.current.x, pos.current.y, pos.current.z);
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
		const offset = 0.62 + bestTree[3] * 0.3 + 0.42 + Math.random() * 0.2;
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
			worldAudio.playAnimalSound("cat", distToPlayer);
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
		const next = constrainAnimalMove(
			pos.current,
			pos.current.x + Math.sin(currentYaw.current) * currentSpeed.current * dt,
			pos.current.z + Math.cos(currentYaw.current) * currentSpeed.current * dt,
			CAT_RADIUS,
			colliders,
		);
		pos.current.set(next.x, next.ground, next.z);

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

		catGlb.sync(
			state.current === "flee" ? "run" : currentSpeed.current > 0.18 ? "walk" : "idle",
			currentSpeed.current,
		);
	});

	return (
		<group ref={catGroup} position={[4.5, terrainHeight(4.5, 12), 12]}>
			<GLBOrFallback
				slot="animals/cat"
				animationState={catGlb.animState}
				speedRef={catGlb.speedRef}
				fallback={
					<>
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
							<mesh material={catMaterials.coat} scale={[0.06, 0.14, 0.05]}>
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
					</>
				}
			/>
		</group>
	);
}

type RabbitState = "sniff" | "hop" | "graze" | "flee";

type RabbitProps = {
	initialPos: [number, number];
	colorTheme: "snow" | "caramel" | "cinnamon";
	playerRef: AnimalManagerProps["playerRef"];
	colliders: AnimalManagerProps["colliders"];
	reducedMotion: boolean;
};

/**
 * Cute Stylized Rabbit / Bunny with Playful Hops,
 * Ear Twitches, Grass Grazing, and Proximity-Flee Reactions!
 */
function Rabbit({ initialPos, colorTheme, playerRef, colliders, reducedMotion }: RabbitProps) {
	const rabbitGlb = useGlbAnimSync("animals/rabbit");
	const rabbitGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);
	const earLeft = useRef<Group>(null);
	const earRight = useRef<Group>(null);
	const noseRef = useRef<Mesh>(null);

	const pos = useRef(new Vector3(initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]));
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
		if (!rabbitGroup.current || reducedMotion) return;
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
			const next = constrainAnimalMove(
				pos.current,
				pos.current.x + Math.sin(currentYaw.current) * moveSpeed * dt,
				pos.current.z + Math.cos(currentYaw.current) * moveSpeed * dt,
				RABBIT_RADIUS,
				colliders,
			);
			pos.current.set(next.x, next.ground + hopHeight, next.z);
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
			const next = constrainAnimalMove(
				pos.current,
				pos.current.x + Math.sin(currentYaw.current) * moveSpeed * dt,
				pos.current.z + Math.cos(currentYaw.current) * moveSpeed * dt,
				RABBIT_RADIUS,
				colliders,
			);
			pos.current.set(next.x, next.ground + hopHeight, next.z);
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

		// Organic body tilt for GLB / procedural hops, grazing, and alert sniffing
		const targetBodyPitch =
			state.current === "hop" || state.current === "flee"
				? -Math.cos(hopProgress.current * Math.PI) * 0.24
				: state.current === "graze"
					? 0.22 + Math.sin(timer.current * 10) * 0.03
					: Math.sin(timer.current * 2.2) * 0.025;
		rabbitGroup.current.rotation.x = MathUtils.damp(rabbitGroup.current.rotation.x, targetBodyPitch, 10, dt);

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

		rabbitGlb.sync(
			state.current === "flee" ? "run" : state.current === "hop" ? "walk" : "idle",
			state.current === "flee" ? 2.8 : 1.35,
		);
	});

	return (
		<group ref={rabbitGroup} position={[initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]]} scale={0.78}>
			<GLBOrFallback
				slot="animals/rabbit"
				animationState={rabbitGlb.animState}
				speedRef={rabbitGlb.speedRef}
				targetHeight={MODEL_SPECS["animals/rabbit"].targetHeight / 0.78}
				fallback={
					<>
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
					<mesh material={materials.fur} scale={[0.035, 0.18, 0.03]}>
						<cylinderGeometry args={[0.8, 0.6, 1, 6]} />
					</mesh>
					<mesh position={[0, 0, 0.016]} material={materials.innerEar} scale={[0.022, 0.14, 0.01]}>
						<cylinderGeometry args={[0.7, 0.5, 1, 5]} />
					</mesh>
				</group>

				<group ref={earRight} position={[0.06, 0.12, -0.02]} rotation={[0.1, 0, 0.15]}>
					<mesh material={materials.fur} scale={[0.035, 0.18, 0.03]}>
						<cylinderGeometry args={[0.8, 0.6, 1, 6]} />
					</mesh>
					<mesh position={[0, 0, 0.016]} material={materials.innerEar} scale={[0.022, 0.14, 0.01]}>
						<cylinderGeometry args={[0.7, 0.5, 1, 5]} />
					</mesh>
				</group>
			</group>
					</>
				}
			/>
		</group>
	);
}

// Tree Perching Songbirds
function Bird({ index, playerRef, reducedMotion }: { index: number; playerRef: AnimalManagerProps["playerRef"]; reducedMotion: boolean }) {
	const birdGlb = useGlbAnimSync("animals/bird");
	const bird = useRef<Group>(null);
	const wings = useRef<Group>(null);
	const perch = useMemo(() => {
		const [x, , z, scale] = treePositions[[2, 6, 15, 21, 27, 31][index]];
		return new Vector3(x, terrainHeight(x, z) + scale * 3.05, z);
	}, [index]);
	const flying = useRef(false);
	const elapsed = useRef(0);

	useFrame((_, delta) => {
		if (!bird.current || reducedMotion) return;
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
		birdGlb.sync(flying.current ? "fly" : "idle", flying.current ? 1.4 : 1);
	});

	return (
		<group ref={bird} position={[perch.x, perch.y, perch.z]}>
			<GLBOrFallback
				slot="animals/bird"
				animationState={birdGlb.animState}
				speedRef={birdGlb.speedRef}
				fallback={
					<>
						<mesh scale={[0.13, 0.1, 0.22]} geometry={SHARED_BIRD_BODY_GEO} material={SHARED_BIRD_BODY_MATS[index % 2]} />
						<mesh position={[0, 0.04, -0.2]} rotation={[0.15, 0, 0]} geometry={SHARED_BIRD_BEAK_GEO} material={SHARED_BIRD_BEAK_MAT} />
						<group ref={wings}>
							{[-1, 1].map((side) => (
								<mesh
									key={side}
									position={[side * 0.15, 0.015, 0]}
									rotation={[0, side * 0.12, side * -0.08]}
									scale={[0.2, 0.035, 0.11]}
									geometry={SHARED_BIRD_WING_GEO}
									material={SHARED_BIRD_WING_MAT}
								/>
							))}
						</group>
					</>
				}
			/>
		</group>
	);
}

const DEER_RADIUS = 0.42;
type DeerState = "graze" | "look" | "walk" | "flee";

/**
 * Noble Stylized Deer / Fawn with Branching Antlers, Dappled Spots,
 * Alert Ear Listening, Natural Quadruped Stride, and Gentle Grazing.
 */
function Deer({
	initialPos,
	scale = 1.0,
	hasAntlers = true,
	playerRef,
	colliders,
	reducedMotion,
}: {
	initialPos: [number, number];
	scale?: number;
	hasAntlers?: boolean;
	playerRef: AnimalManagerProps["playerRef"];
	colliders: AnimalManagerProps["colliders"];
	reducedMotion: boolean;
}) {
	const deerGlb = useGlbAnimSync("animals/deer");
	const deerGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);
	const neckGroup = useRef<Group>(null);
	const tailRef = useRef<Group>(null);
	const legFL = useRef<Mesh>(null);
	const legFR = useRef<Mesh>(null);
	const legBL = useRef<Mesh>(null);
	const legBR = useRef<Mesh>(null);

	const pos = useRef(new Vector3(initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]));
	const currentYaw = useRef(Math.random() * Math.PI * 2);
	const desiredYaw = useRef(currentYaw.current);
	const targetPos = useRef(new Vector3(initialPos[0], 0, initialPos[1]));
	const state = useRef<DeerState>("graze");
	const timer = useRef(3.0 + Math.random() * 2);
	const walkCycle = useRef(0);

	const materials = useMemo(() => {
		return {
			coat: new MeshStandardMaterial({ color: hasAntlers ? "#9a480e" : "#b45309", roughness: 0.8 }),
			underbelly: new MeshStandardMaterial({ color: "#fef3c7", roughness: 0.85 }),
			antlers: new MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.65 }),
			hooves: new MeshStandardMaterial({ color: "#1c1917", roughness: 0.5 }),
			eyes: new MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 }),
			spots: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.9 }),
			innerEar: new MeshStandardMaterial({ color: "#fed7aa", roughness: 0.7 }),
		};
	}, [hasAntlers]);

	useFrame((_, delta) => {
		if (!deerGroup.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		timer.current -= dt;

		// Check proximity to player
		const player = playerRef.current.position;
		const dxPlayer = pos.current.x - player.x;
		const dzPlayer = pos.current.z - player.z;
		const distToPlayer = Math.hypot(dxPlayer, dzPlayer);

		if (distToPlayer < 5.2 && state.current !== "flee") {
			state.current = "flee";
			timer.current = 2.5;
			desiredYaw.current = Math.atan2(dxPlayer, dzPlayer);
		}

		// State machine transitions
		if (timer.current <= 0) {
			if (state.current === "flee" || state.current === "walk") {
				state.current = Math.random() > 0.4 ? "graze" : "look";
				timer.current = 3.5 + Math.random() * 3;
			} else {
				state.current = "walk";
				timer.current = 3.0 + Math.random() * 2.5;
				const roamDist = 3.0 + Math.random() * 4.0;
				const angle = Math.random() * Math.PI * 2;
				targetPos.current.set(
					initialPos[0] + Math.cos(angle) * roamDist,
					0,
					initialPos[1] + Math.sin(angle) * roamDist,
				);
				const dx = targetPos.current.x - pos.current.x;
				const dz = targetPos.current.z - pos.current.z;
				desiredYaw.current = Math.atan2(dx, dz);
			}
		}

		// Smooth yaw rotation
		let diff = desiredYaw.current - currentYaw.current;
		while (diff < -Math.PI) diff += Math.PI * 2;
		while (diff > Math.PI) diff -= Math.PI * 2;
		currentYaw.current += diff * Math.min(1, dt * (state.current === "flee" ? 6 : 3));

		// Position locomotion
		let speed = 0;
		if (state.current === "flee") {
			speed = 3.6;
		} else if (state.current === "walk") {
			speed = 1.1;
		}

		if (speed > 0) {
			walkCycle.current += dt * (speed > 2 ? 14 : 6);
			const moveX = pos.current.x + Math.sin(currentYaw.current) * speed * dt;
			const moveZ = pos.current.z + Math.cos(currentYaw.current) * speed * dt;
			const next = constrainAnimalMove(pos.current, moveX, moveZ, DEER_RADIUS * scale, colliders);
			pos.current.set(next.x, next.ground, next.z);
		}

		deerGroup.current.position.copy(pos.current);
		deerGroup.current.rotation.y = currentYaw.current;

		// Leg swinging
		const legSwing = speed > 0 ? Math.sin(walkCycle.current) * (speed > 2 ? 0.7 : 0.4) : 0;
		if (legFL.current) legFL.current.rotation.x = legSwing;
		if (legFR.current) legFR.current.rotation.x = -legSwing;
		if (legBL.current) legBL.current.rotation.x = -legSwing;
		if (legBR.current) legBR.current.rotation.x = legSwing;

		// Head & neck postures
		if (neckGroup.current && headGroup.current) {
			if (state.current === "graze") {
				neckGroup.current.rotation.x = MathUtils.damp(neckGroup.current.rotation.x, 0.7, 4, dt);
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, 0.25, 4, dt);
				headGroup.current.rotation.y = Math.sin(timer.current * 3) * 0.08;
			} else if (state.current === "look") {
				neckGroup.current.rotation.x = MathUtils.damp(neckGroup.current.rotation.x, -0.2, 5, dt);
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, 0.0, 5, dt);
				headGroup.current.rotation.y = Math.sin(timer.current * 1.5) * 0.4;
			} else if (state.current === "flee") {
				neckGroup.current.rotation.x = MathUtils.damp(neckGroup.current.rotation.x, 0.1, 8, dt);
				headGroup.current.rotation.y = 0;
			} else {
				neckGroup.current.rotation.x = MathUtils.damp(neckGroup.current.rotation.x, 0.2, 5, dt);
				headGroup.current.rotation.y = 0;
			}
		}

		if (tailRef.current) {
			tailRef.current.rotation.z = Math.sin(timer.current * 4) * 0.2;
			tailRef.current.rotation.x = state.current === "flee" ? 0.8 : 0.2;
		}

		deerGlb.sync(
			state.current === "flee" ? "run" : state.current === "walk" ? "walk" : "idle",
			speed,
		);
	});

	return (
		<group ref={deerGroup} scale={scale * 0.95}>
			<GLBOrFallback
				slot="animals/deer"
				animationState={deerGlb.animState}
				speedRef={deerGlb.speedRef}
				fallback={
					<>
						{/* Sleek Torso */}
			<mesh castShadow receiveShadow material={materials.coat} position={[0, 0.62, 0]} scale={[0.26, 0.28, 0.5]}>
				<sphereGeometry args={[1, 10, 8]} />
			</mesh>

			{/* Soft Cream Chest & Underbelly */}
			<mesh material={materials.underbelly} position={[0, 0.54, 0.06]} scale={[0.22, 0.2, 0.38]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Dappled Fawn White Spots */}
			{[-1, 1].map((side) =>
				[
					[-0.12, 0.74, 0.12],
					[-0.14, 0.73, -0.04],
					[-0.13, 0.72, -0.18],
					[-0.08, 0.76, 0.04],
					[-0.07, 0.75, -0.11],
				].map(([x, y, z], i) => (
					<mesh key={`${side}-${i}`} material={materials.spots} position={[x * side, y, z]} scale={0.022}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>
				))
			)}

			{/* Graceful Neck & Head */}
			<group ref={neckGroup} position={[0, 0.66, 0.35]}>
				<mesh material={materials.coat} position={[0, 0.24, 0.08]} rotation={[-0.48, 0, 0]} scale={[0.13, 0.32, 0.14]}>
					<cylinderGeometry args={[0.7, 1, 1, 6]} />
				</mesh>
				<mesh material={materials.underbelly} position={[0, 0.22, 0.14]} rotation={[-0.48, 0, 0]} scale={[0.09, 0.28, 0.06]}>
					<cylinderGeometry args={[0.7, 1, 1, 6]} />
				</mesh>

				{/* Head Group */}
				<group ref={headGroup} position={[0, 0.44, 0.19]}>
					<mesh castShadow material={materials.coat} scale={[0.13, 0.14, 0.22]}>
						<sphereGeometry args={[1, 10, 8]} />
					</mesh>

					{/* Tapered Muzzle & Nose */}
					<mesh material={materials.underbelly} position={[0, -0.04, 0.15]} scale={[0.075, 0.07, 0.11]}>
						<sphereGeometry args={[1, 8, 8]} />
					</mesh>
					<mesh material={materials.hooves} position={[0, -0.03, 0.24]} scale={[0.032, 0.022, 0.03]}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>

					{/* Dark Expressive Eyes */}
					{[-1, 1].map((side) => (
						<mesh key={side} material={materials.eyes} position={[side * 0.11, 0.03, 0.07]} scale={0.03}>
							<sphereGeometry args={[1, 8, 8]} />
						</mesh>
					))}

					{/* Alert Pointed Ears */}
					{[-1, 1].map((side) => (
						<group key={`ear-${side}`} position={[side * 0.09, 0.1, -0.05]} rotation={[0.2, side * 0.4, side * 0.45]}>
							<mesh material={materials.coat} scale={[0.035, 0.14, 0.03]}>
								<coneGeometry args={[1, 1, 5]} />
							</mesh>
							<mesh material={materials.innerEar} position={[0, 0.04, 0.012]} scale={[0.022, 0.09, 0.015]}>
								<coneGeometry args={[1, 1, 5]} />
							</mesh>
						</group>
					))}

					{/* Branching Stylized Antlers (Buck) */}
					{hasAntlers &&
						[-1, 1].map((side) => (
							<group key={`antler-${side}`} position={[side * 0.06, 0.12, -0.04]} rotation={[-0.2, side * 0.2, side * 0.25]}>
								<mesh material={materials.antlers} position={[0, 0.15, 0]} scale={[0.022, 0.3, 0.022]}>
									<cylinderGeometry args={[0.6, 1, 1, 5]} />
								</mesh>
								<mesh material={materials.antlers} position={[side * 0.04, 0.12, 0.06]} rotation={[0.45, 0, side * 0.4]} scale={[0.016, 0.12, 0.016]}>
									<cylinderGeometry args={[0.5, 1, 1, 5]} />
								</mesh>
								<mesh material={materials.antlers} position={[side * 0.06, 0.28, -0.04]} rotation={[-0.3, 0, side * 0.5]} scale={[0.016, 0.14, 0.016]}>
									<cylinderGeometry args={[0.5, 1, 1, 5]} />
								</mesh>
							</group>
						))}
				</group>
			</group>

			{/* 4 Slender Legs with Hooves */}
			{[
				{ ref: legFL, x: -0.11, z: 0.28 },
				{ ref: legFR, x: 0.11, z: 0.28 },
				{ ref: legBL, x: -0.11, z: -0.25 },
				{ ref: legBR, x: 0.11, z: -0.25 },
			].map((item, index) => (
				<group key={index} position={[item.x, 0.52, item.z]}>
					<mesh ref={item.ref} material={materials.coat} position={[0, -0.26, 0]} scale={[0.04, 0.52, 0.04]}>
						<cylinderGeometry args={[0.7, 1, 1, 6]} />
						<mesh material={materials.hooves} position={[0, -0.52, 0.01]} scale={[1.2, 0.15, 1.4]}>
							<boxGeometry args={[1, 1, 1]} />
						</mesh>
					</mesh>
				</group>
			))}

			{/* Perky White-Lined Tail */}
			<group ref={tailRef} position={[0, 0.68, -0.45]} rotation={[0.4, 0, 0]}>
				<mesh material={materials.coat} position={[0, -0.06, -0.02]} scale={[0.05, 0.12, 0.05]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>
				<mesh material={materials.underbelly} position={[0, -0.06, 0.02]} scale={[0.04, 0.1, 0.03]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>
			</group>
					</>
				}
			/>
		</group>
	);
}

const FOX_RADIUS = 0.26;
type FoxState = "trot" | "sniff" | "sit";

/**
 * Playful Red Fox with Bushy White-Tipped Tail, Pointed Snout,
 * Dark Paws, and Curious Field Exploration.
 */
function Fox({
	initialPos,
	playerRef,
	colliders,
	reducedMotion,
}: {
	initialPos: [number, number];
	playerRef: AnimalManagerProps["playerRef"];
	colliders: AnimalManagerProps["colliders"];
	reducedMotion: boolean;
}) {
	const foxGlb = useGlbAnimSync("animals/fox");
	const foxGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);
	const tailGroup = useRef<Group>(null);
	const legFL = useRef<Mesh>(null);
	const legFR = useRef<Mesh>(null);
	const legBL = useRef<Mesh>(null);
	const legBR = useRef<Mesh>(null);

	const pos = useRef(new Vector3(initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]));
	const currentYaw = useRef(Math.random() * Math.PI * 2);
	const desiredYaw = useRef(currentYaw.current);
	const targetPos = useRef(new Vector3(initialPos[0], 0, initialPos[1]));
	const state = useRef<FoxState>("trot");
	const timer = useRef(2.5 + Math.random() * 2);
	const walkCycle = useRef(0);

	const materials = useMemo(() => {
		return {
			coat: new MeshStandardMaterial({ color: "#ea580c", roughness: 0.75 }),
			chest: new MeshStandardMaterial({ color: "#fffbeb", roughness: 0.8 }),
			paws: new MeshStandardMaterial({ color: "#27272a", roughness: 0.7 }),
			tailTip: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 }),
			eyes: new MeshStandardMaterial({ color: "#09090b", roughness: 0.2 }),
			innerEar: new MeshStandardMaterial({ color: "#fed7aa", roughness: 0.6 }),
		};
	}, []);

	useFrame((_, delta) => {
		if (!foxGroup.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		timer.current -= dt;

		// Check player distance
		const player = playerRef.current.position;
		const dxPlayer = pos.current.x - player.x;
		const dzPlayer = pos.current.z - player.z;
		const distToPlayer = Math.hypot(dxPlayer, dzPlayer);

		if (distToPlayer < 4.2) {
			desiredYaw.current = Math.atan2(dxPlayer, dzPlayer);
			state.current = "trot";
		}

		if (timer.current <= 0) {
			const roll = Math.random();
			if (roll < 0.45) {
				state.current = "trot";
				timer.current = 2.5 + Math.random() * 3.0;
				const roamDist = 3.0 + Math.random() * 4.0;
				const angle = Math.random() * Math.PI * 2;
				targetPos.current.set(
					initialPos[0] + Math.cos(angle) * roamDist,
					0,
					initialPos[1] + Math.sin(angle) * roamDist,
				);
				const dx = targetPos.current.x - pos.current.x;
				const dz = targetPos.current.z - pos.current.z;
				desiredYaw.current = Math.atan2(dx, dz);
			} else if (roll < 0.75) {
				state.current = "sniff";
				timer.current = 2.0 + Math.random() * 2.0;
			} else {
				state.current = "sit";
				timer.current = 3.0 + Math.random() * 2.5;
			}
		}

		// Yaw rotation
		let diff = desiredYaw.current - currentYaw.current;
		while (diff < -Math.PI) diff += Math.PI * 2;
		while (diff > Math.PI) diff -= Math.PI * 2;
		currentYaw.current += diff * Math.min(1, dt * 4.5);

		let speed = 0;
		if (state.current === "trot") speed = 1.6;

		if (speed > 0) {
			walkCycle.current += dt * 10;
			const moveX = pos.current.x + Math.sin(currentYaw.current) * speed * dt;
			const moveZ = pos.current.z + Math.cos(currentYaw.current) * speed * dt;
			const next = constrainAnimalMove(pos.current, moveX, moveZ, FOX_RADIUS, colliders);
			pos.current.set(next.x, next.ground, next.z);
		}

		foxGroup.current.position.copy(pos.current);
		foxGroup.current.rotation.y = currentYaw.current;

		// Limb & posture animation
		const legSwing = speed > 0 ? Math.sin(walkCycle.current) * 0.5 : 0;
		if (legFL.current) legFL.current.rotation.x = legSwing;
		if (legFR.current) legFR.current.rotation.x = -legSwing;
		if (legBL.current) legBL.current.rotation.x = -legSwing;
		if (legBR.current) legBR.current.rotation.x = legSwing;

		if (headGroup.current) {
			if (state.current === "sniff") {
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, 0.45, 6, dt);
				headGroup.current.rotation.y = Math.sin(timer.current * 8) * 0.12;
			} else if (state.current === "sit") {
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, -0.15, 6, dt);
				headGroup.current.rotation.y = Math.sin(timer.current * 1.5) * 0.3;
			} else {
				headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, 0.1, 6, dt);
				headGroup.current.rotation.y = 0;
			}
		}

		if (tailGroup.current) {
			if (state.current === "trot") {
				tailGroup.current.rotation.y = Math.sin(walkCycle.current * 0.8) * 0.3;
				tailGroup.current.rotation.x = 0.25;
			} else if (state.current === "sit") {
				tailGroup.current.rotation.y = MathUtils.damp(tailGroup.current.rotation.y, 0.7, 4, dt);
				tailGroup.current.rotation.x = 0.05;
			} else {
				tailGroup.current.rotation.y = Math.sin(timer.current * 2) * 0.15;
			}
		}

		foxGlb.sync(speed > 0.1 ? "walk" : "idle", speed);
	});

	return (
		<group ref={foxGroup} scale={0.78}>
			<GLBOrFallback
				slot="animals/fox"
				animationState={foxGlb.animState}
				speedRef={foxGlb.speedRef}
				targetHeight={MODEL_SPECS["animals/fox"].targetHeight / 0.78}
				fallback={
					<>
						{/* Sleek Torso */}
			<mesh castShadow receiveShadow material={materials.coat} position={[0, 0.28, 0]} scale={[0.16, 0.16, 0.36]}>
				<sphereGeometry args={[1, 10, 8]} />
			</mesh>

			{/* Fluffy White Chest Bib */}
			<mesh material={materials.chest} position={[0, 0.26, 0.14]} scale={[0.13, 0.14, 0.16]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Head & Muzzle */}
			<group ref={headGroup} position={[0, 0.38, 0.22]}>
				<mesh castShadow material={materials.coat} scale={[0.13, 0.12, 0.15]}>
					<sphereGeometry args={[1, 10, 8]} />
				</mesh>
				<mesh material={materials.chest} position={[0, -0.04, 0.04]} scale={[0.15, 0.08, 0.12]}>
					<sphereGeometry args={[1, 8, 8]} />
				</mesh>

				<mesh material={materials.chest} position={[0, -0.02, 0.16]} rotation={[0.15, 0, 0]} scale={[0.065, 0.06, 0.12]}>
					<coneGeometry args={[1, 1, 5]} />
				</mesh>
				<mesh material={materials.eyes} position={[0, 0.015, 0.22]} scale={[0.022, 0.018, 0.022]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>

				{/* Dark Eyes */}
				{[-1, 1].map((side) => (
					<mesh key={side} material={materials.eyes} position={[side * 0.08, 0.03, 0.08]} scale={0.022}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>
				))}

				{/* Large Triangular Alert Ears with Black Backs */}
				{[-1, 1].map((side) => (
					<group key={`ear-${side}`} position={[side * 0.07, 0.12, -0.02]} rotation={[0.1, side * 0.2, side * 0.25]}>
						<mesh material={materials.paws} scale={[0.035, 0.12, 0.025]}>
							<coneGeometry args={[1, 1, 4]} />
						</mesh>
						<mesh material={materials.innerEar} position={[0, 0, 0.01]} scale={[0.024, 0.08, 0.015]}>
							<coneGeometry args={[1, 1, 4]} />
						</mesh>
					</group>
				))}
			</group>

			{/* 4 Black-Socked Slender Legs */}
			{[
				{ ref: legFL, x: -0.08, z: 0.15 },
				{ ref: legFR, x: 0.08, z: 0.15 },
				{ ref: legBL, x: -0.08, z: -0.15 },
				{ ref: legBR, x: 0.08, z: -0.15 },
			].map((item, index) => (
				<group key={index} position={[item.x, 0.22, item.z]}>
					<mesh ref={item.ref} material={materials.coat} position={[0, -0.11, 0]} scale={[0.035, 0.22, 0.035]}>
						<cylinderGeometry args={[0.8, 1, 1, 6]} />
						<mesh material={materials.paws} position={[0, -0.4, 0.02]} scale={[1.2, 0.25, 1.4]}>
							<boxGeometry args={[1, 1, 1]} />
						</mesh>
					</mesh>
				</group>
			))}

			{/* Iconic Voluminous Bushy Tail with White Tip */}
			<group ref={tailGroup} position={[0, 0.28, -0.26]} rotation={[0.3, 0, 0]}>
				<mesh material={materials.coat} position={[0, 0.04, -0.16]} rotation={[-0.4, 0, 0]} scale={[0.09, 0.1, 0.22]}>
					<sphereGeometry args={[1, 8, 8]} />
				</mesh>
				<mesh material={materials.tailTip} position={[0, 0.08, -0.28]} rotation={[-0.4, 0, 0]} scale={[0.07, 0.075, 0.14]}>
					<coneGeometry args={[1, 1, 6]} />
				</mesh>
			</group>
					</>
				}
			/>
		</group>
	);
}

/**
 * Swimming River Ducks: Mallard Drakes, Companion White Ducks,
 * and Cute Ducklings Navigating the River Currents.
 */
type DuckState = "cruise" | "circle" | "idle" | "dabble";

/**
 * Swimming River Ducks: Mallard Drakes, Companion White Ducks,
 * and Cute Ducklings with Organic FSM AI (Idling, Dabbling, Circling, Cruising).
 */
function RiverDuck({
	homeX = 0,
	homeZ,
	roamRadius = 2.4,
	speed = 0.6,
	theme = "mallard",
	mode = "water",
	reducedMotion,
}: {
	homeX?: number;
	homeZ?: number;
	roamRadius?: number;
	speed?: number;
	theme?: "mallard" | "white" | "duckling";
	mode?: "water" | "shore";
	reducedMotion: boolean;
}) {
	const duckGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);
	const tailGroup = useRef<Mesh>(null);

	const isDuckling = theme === "duckling";
	const isShoreDuck = mode === "shore";
	const duckSlot: ModelSlotId = isDuckling ? "animals/duckling" : "animals/duck";
	const hasDuckGlb = Boolean(getModelUrl(duckSlot));
	const duckGlb = useGlbAnimSync(duckSlot);
	const scale = isDuckling ? 0.38 : 0.62;

	// Actual habitat center
	const defaultHomeZ = -2.5 + Math.sin(homeX * 0.13) * 0.75;
	const anchorZ = homeZ ?? defaultHomeZ;
	const isLakeDuck = anchorZ < -20;

	// Navigation & Physics refs
	const pos = useRef(new Vector3(homeX, 0, anchorZ));
	const currentYaw = useRef(Math.random() * Math.PI * 2);
	const desiredYaw = useRef(currentYaw.current);
	const currentPitch = useRef(0);
	const desiredPitch = useRef(0);
	const currentSpeed = useRef(0);

	// State machine refs
	const state = useRef<DuckState>("idle");
	const stateTimer = useRef(2.5 + Math.random() * 3.5);
	const circleAngle = useRef(Math.random() * Math.PI * 2);
	const circleRadius = useRef(0.85 + Math.random() * 0.75);
	const circleDir = useRef(Math.random() > 0.5 ? 1 : -1);
	const circleCenter = useRef(new Vector2(homeX, anchorZ));
	const targetPos = useRef(new Vector2(homeX, anchorZ));

	const materials = useMemo(() => {
		if (theme === "mallard") {
			return {
				head: new MeshStandardMaterial({ color: "#0f766e", roughness: 0.45 }), // Iridescent emerald
				collar: new MeshStandardMaterial({ color: "#ffffff", roughness: 0.8 }),
				body: new MeshStandardMaterial({ color: "#78716c", roughness: 0.8 }),
				chest: new MeshStandardMaterial({ color: "#7c2d12", roughness: 0.75 }),
				beak: new MeshStandardMaterial({ color: "#f59e0b", roughness: 0.35 }),
				speculum: new MeshStandardMaterial({ color: "#2563eb", roughness: 0.4 }),
				eyes: new MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 }),
			};
		}
		if (theme === "white") {
			return {
				head: new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.75 }),
				collar: new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.75 }),
				body: new MeshStandardMaterial({ color: "#f8fafc", roughness: 0.75 }),
				chest: new MeshStandardMaterial({ color: "#f1f5f9", roughness: 0.75 }),
				beak: new MeshStandardMaterial({ color: "#ea580c", roughness: 0.35 }),
				speculum: new MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.75 }),
				eyes: new MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 }),
			};
		}
		return {
			head: new MeshStandardMaterial({ color: "#fde047", roughness: 0.85 }),
			collar: new MeshStandardMaterial({ color: "#fde047", roughness: 0.85 }),
			body: new MeshStandardMaterial({ color: "#facc15", roughness: 0.85 }),
			chest: new MeshStandardMaterial({ color: "#fef08a", roughness: 0.85 }),
			beak: new MeshStandardMaterial({ color: "#f97316", roughness: 0.35 }),
			speculum: new MeshStandardMaterial({ color: "#eab308", roughness: 0.85 }),
			eyes: new MeshStandardMaterial({ color: "#0f172a", roughness: 0.2 }),
		};
	}, [theme]);

	const pickTarget = () => {
		const angle = Math.random() * Math.PI * 2;
		const r = Math.random() * (roamRadius * 0.85);
		let tx = homeX + Math.cos(angle) * r;
		let tz = anchorZ + Math.sin(angle) * r;

		if (isShoreDuck) {
			const riverCenter = -2.5 + Math.sin(tx * 0.13) * 0.75;
			const shoreSign = anchorZ >= riverCenter ? 1 : -1;
			tz = shoreSign > 0
				? MathUtils.clamp(tz, riverCenter + 1.9, riverCenter + 3.4)
				: MathUtils.clamp(tz, riverCenter - 3.4, riverCenter - 1.9);
			tx = MathUtils.clamp(tx, homeX - roamRadius, homeX + roamRadius);
		} else if (isLakeDuck) {
			const lakeDist = Math.hypot(tx, tz - (-28));
			if (lakeDist > 4.5) {
				tx = (tx / lakeDist) * 4.2;
				tz = -28 + ((tz - (-28)) / lakeDist) * 4.2;
			}
		} else {
			const riverZ = -2.5 + Math.sin(tx * 0.13) * 0.75;
			tz = MathUtils.clamp(tz, riverZ - 1.25, riverZ + 1.25);
			tx = MathUtils.clamp(tx, homeX - roamRadius, homeX + roamRadius);
		}
		targetPos.current.set(tx, tz);
	};

	const pickCircle = () => {
		circleCenter.current.set(
			pos.current.x + (Math.random() - 0.5) * 0.6,
			pos.current.z + (Math.random() - 0.5) * 0.6
		);
		circleRadius.current = 0.75 + Math.random() * 0.8;
		circleDir.current = Math.random() > 0.5 ? 1 : -1;
		circleAngle.current = Math.atan2(
			pos.current.z - circleCenter.current.y,
			pos.current.x - circleCenter.current.x
		);
	};

	useFrame(({ clock }, delta) => {
		if (!duckGroup.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		const time = clock.elapsedTime;

		stateTimer.current -= dt;

		// FSM Transitions
		if (stateTimer.current <= 0) {
			const roll = Math.random();
			if (state.current === "idle") {
				if (roll < 0.35) {
					// Dabble: dip head underwater feeding on plants
					state.current = "dabble";
					stateTimer.current = 3.2 + Math.random() * 2.0;
					if (mode === "water") {
						worldAudio.playAnimalSoundAt("splash", pos.current.x, pos.current.y, 15);
					}
				} else if (roll < 0.70) {
					// Circle swim
					state.current = "circle";
					stateTimer.current = 5.5 + Math.random() * 3.5;
					pickCircle();
					if (Math.random() < 0.65) {
						worldAudio.playAnimalSoundAt("duck", pos.current.x, pos.current.y, 16);
					}
				} else {
					// Cruise towards scenic point
					state.current = "cruise";
					stateTimer.current = 4.5 + Math.random() * 3.0;
					pickTarget();
				}
			} else if (state.current === "dabble") {
				state.current = roll < 0.55 ? "idle" : "cruise";
				stateTimer.current = 3.0 + Math.random() * 3.0;
				if (state.current === "cruise") pickTarget();
			} else if (state.current === "circle") {
				if (roll < 0.45) {
					state.current = "idle";
					stateTimer.current = 3.5 + Math.random() * 3.0;
				} else if (roll < 0.75) {
					state.current = "dabble";
					stateTimer.current = 3.2 + Math.random() * 1.8;
				} else {
					state.current = "cruise";
					stateTimer.current = 4.0 + Math.random() * 3.0;
					pickTarget();
				}
			} else {
				if (roll < 0.50) {
					state.current = "idle";
					stateTimer.current = 3.5 + Math.random() * 3.5;
				} else if (roll < 0.80) {
					state.current = "circle";
					stateTimer.current = 5.0 + Math.random() * 3.5;
					pickCircle();
				} else {
					state.current = "dabble";
					stateTimer.current = 3.0 + Math.random() * 2.0;
				}
			}
		}

		// State physics & behavior
		let targetSpeedVal = 0;
		if (state.current === "cruise") {
			const dx = targetPos.current.x - pos.current.x;
			const dz = targetPos.current.y - pos.current.z;
			const dist = Math.hypot(dx, dz);
			if (dist > 0.25) {
				desiredYaw.current = Math.atan2(dx, dz);
				targetSpeedVal = speed * (isDuckling ? 0.88 : 1.0);
				pos.current.x += Math.sin(desiredYaw.current) * currentSpeed.current * dt;
				pos.current.z += Math.cos(desiredYaw.current) * currentSpeed.current * dt;
			} else {
				stateTimer.current = 0;
			}
			desiredPitch.current = 0;
		} else if (state.current === "circle" && !isShoreDuck) {
			circleAngle.current += circleDir.current * (speed * 0.95 / circleRadius.current) * dt;
			const goalX = circleCenter.current.x + Math.cos(circleAngle.current) * circleRadius.current;
			const goalZ = circleCenter.current.y + Math.sin(circleAngle.current) * circleRadius.current;

			pos.current.x = MathUtils.damp(pos.current.x, goalX, 6.0, dt);
			pos.current.z = MathUtils.damp(pos.current.z, goalZ, 6.0, dt);

			desiredYaw.current = Math.atan2(
				-circleDir.current * Math.sin(circleAngle.current),
				circleDir.current * Math.cos(circleAngle.current),
			);
			targetSpeedVal = speed * 0.75;
			desiredPitch.current = 0;
		} else if (state.current === "dabble" || (isShoreDuck && state.current === "circle")) {
			targetSpeedVal = 0;
			// Water dabble: dip head into the water (+X rotation tilts +Z forward down)
			// Shore peck: gentle bobbing nibble on the grass
			desiredPitch.current = isShoreDuck ? 0.34 + Math.sin(time * 9.5) * 0.14 : 0.56;
		} else {
			// Idle: floating peacefully or resting on the bank
			targetSpeedVal = 0;
			desiredPitch.current = 0;
			if (!isShoreDuck) {
				pos.current.x += Math.cos(time * 0.7 + homeX) * (0.04 * dt);
				pos.current.z += Math.sin(time * 0.9 + anchorZ) * (0.04 * dt);
			}
		}

		// Speed damping
		currentSpeed.current = MathUtils.damp(currentSpeed.current, targetSpeedVal, 3.5, dt);

		// Boundaries confinement (prevents ever hitting stream ends or dry land)
		if (isShoreDuck) {
			const riverCenter = -2.5 + Math.sin(pos.current.x * 0.13) * 0.75;
			const shoreSign = anchorZ >= riverCenter ? 1 : -1;
			pos.current.z = shoreSign > 0
				? MathUtils.clamp(pos.current.z, riverCenter + 1.85, riverCenter + 3.5)
				: MathUtils.clamp(pos.current.z, riverCenter - 3.5, riverCenter - 1.85);
			pos.current.x = MathUtils.clamp(pos.current.x, homeX - roamRadius * 1.15, homeX + roamRadius * 1.15);
		} else if (isLakeDuck) {
			const lakeDist = Math.hypot(pos.current.x, pos.current.z - (-28));
			if (lakeDist > 4.7) {
				pos.current.x = (pos.current.x / lakeDist) * 4.6;
				pos.current.z = -28 + ((pos.current.z - (-28)) / lakeDist) * 4.6;
			}
		} else {
			const riverCenter = -2.5 + Math.sin(pos.current.x * 0.13) * 0.75;
			pos.current.z = MathUtils.clamp(pos.current.z, riverCenter - 1.35, riverCenter + 1.35);
			pos.current.x = MathUtils.clamp(pos.current.x, homeX - roamRadius * 1.15, homeX + roamRadius * 1.15);
		}

		// Smooth continuous angle damp for yaw
		let angleDiff = desiredYaw.current - currentYaw.current;
		while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
		while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
		currentYaw.current += angleDiff * (1 - Math.exp(-5.5 * dt));

		// Smooth pitch damp for dabbling / pecking
		currentPitch.current = MathUtils.damp(currentPitch.current, desiredPitch.current, 5.0, dt);

		// Buoyancy height: submerge legs/keel under waterSurfaceY so ducks truly swim instead of standing on water
		const waterSurfaceY = isLakeDuck ? 0.088 : terrainHeight(pos.current.x, pos.current.z) + 0.042;
		const swimDraft = isShoreDuck ? 0 : hasDuckGlb ? (isDuckling ? -0.105 : -0.175) : -0.02;
		const buoyancyBob = isShoreDuck ? 0 : Math.sin(time * 2.8 + homeX * 2.0) * 0.012;
		const dabbleSink = !isShoreDuck && state.current === "dabble" ? -0.04 : 0;
		const y = isShoreDuck
			? terrainHeight(pos.current.x, pos.current.z)
			: waterSurfaceY + swimDraft + buoyancyBob + dabbleSink;

		duckGroup.current.position.set(pos.current.x, y, pos.current.z);

		// Natural paddling waddle & banking roll
		const isMoving = currentSpeed.current > 0.08;
		const waddleRoll = isShoreDuck
			? isMoving
				? Math.sin(time * 9.5) * 0.12
				: 0
			: isMoving
				? Math.sin(time * 5.2) * 0.045
				: Math.sin(time * 1.8 + homeX) * 0.022;
		const walkStepPitch = isShoreDuck && isMoving ? Math.abs(Math.sin(time * 9.5)) * 0.05 : 0;
		const circleBank = !isShoreDuck && state.current === "circle" ? circleDir.current * 0.07 : 0;
		duckGroup.current.rotation.y = currentYaw.current;
		duckGroup.current.rotation.x = currentPitch.current + walkStepPitch;
		duckGroup.current.rotation.z = waddleRoll + circleBank;

		// Head glance & movement
		if (headGroup.current) {
			if (state.current === "dabble") {
				headGroup.current.rotation.y = Math.sin(time * 6.0) * 0.12;
				headGroup.current.rotation.x = -0.35;
			} else if (state.current === "idle") {
				headGroup.current.rotation.y = Math.sin(time * 1.4 + homeX) * 0.45;
				headGroup.current.rotation.x = 0;
			} else {
				headGroup.current.rotation.y = Math.sin(time * 3.5) * 0.12;
				headGroup.current.rotation.x = 0;
			}
		}

		// Tail waggle when dabbling or swimming
		if (tailGroup.current) {
			if (state.current === "dabble") {
				tailGroup.current.rotation.x = 0.55 + Math.sin(time * 9.0) * 0.15;
				tailGroup.current.rotation.y = Math.sin(time * 12.0) * 0.18;
			} else {
				tailGroup.current.rotation.x = 0.42;
				tailGroup.current.rotation.y = isMoving ? Math.sin(time * 7.0) * 0.12 : 0;
			}
		}

		duckGlb.sync(isMoving ? "walk" : "idle", currentSpeed.current);
	});

	return (
		<group ref={duckGroup} scale={scale}>
			<GLBOrFallback
				slot={duckSlot}
				animationState={duckGlb.animState}
				speedRef={duckGlb.speedRef}
				targetHeight={MODEL_SPECS[duckSlot].targetHeight / scale}
				fallback={
					<>
						{/* Water-Buoyant Hull Body */}
			<mesh castShadow receiveShadow material={materials.body} position={[0, 0.12, 0]} scale={[0.18, 0.13, 0.28]}>
				<sphereGeometry args={[1, 10, 8]} />
			</mesh>

			{/* Chest Breast */}
			<mesh material={materials.chest} position={[0, 0.15, 0.12]} scale={[0.16, 0.14, 0.14]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Wings with Wingbar / Speculum */}
			{[-1, 1].map((side) => (
				<group key={side} position={[side * 0.16, 0.14, -0.02]} rotation={[0, side * 0.08, side * -0.1]}>
					<mesh material={materials.body} scale={[0.04, 0.1, 0.2]}>
						<sphereGeometry args={[1, 8, 6]} />
					</mesh>
					{!isDuckling && (
						<mesh material={materials.speculum} position={[side * 0.012, 0.02, -0.04]} scale={[0.01, 0.03, 0.08]}>
							<boxGeometry args={[1, 1, 1]} />
						</mesh>
					)}
				</group>
			))}

			{/* Upturned Tail Feathers */}
			<mesh ref={tailGroup} material={materials.body} position={[0, 0.18, -0.22]} rotation={[0.42, 0, 0]} scale={[0.06, 0.08, 0.1]}>
				<coneGeometry args={[1, 1, 5]} />
			</mesh>

			{/* Neck & Head */}
			<group ref={headGroup} position={[0, 0.22, 0.14]}>
				{theme === "mallard" && (
					<mesh material={materials.collar} position={[0, 0.02, 0]} scale={[0.09, 0.025, 0.09]}>
						<cylinderGeometry args={[1, 1, 1, 8]} />
					</mesh>
				)}

				<mesh castShadow material={materials.head} position={[0, 0.11, 0.02]} scale={[0.11, 0.12, 0.13]}>
					<sphereGeometry args={[1, 10, 8]} />
				</mesh>

				<mesh material={materials.beak} position={[0, 0.08, 0.17]} rotation={[0.08, 0, 0]} scale={[0.065, 0.022, 0.1]}>
					<boxGeometry args={[1, 1, 1]} />
				</mesh>

				{/* Dark Eyes */}
				{[-1, 1].map((side) => (
					<mesh key={side} material={materials.eyes} position={[side * 0.085, 0.12, 0.06]} scale={0.02}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>
				))}
			</group>
					</>
				}
			/>
		</group>
	);
}

/**
 * Forest Squirrel: Sits Upright Holding Acorn, Twitches Alertly,
 * Undulates Big Fluffy Tail, and Scampers Between Tree Roots.
 */
function Squirrel({
	initialPos,
	reducedMotion,
}: {
	initialPos: [number, number];
	reducedMotion: boolean;
}) {
	const squirrelGlb = useGlbAnimSync("animals/squirrel");
	const groupRef = useRef<Group>(null);
	const headRef = useRef<Group>(null);
	const tailRef = useRef<Group>(null);
	const pawsRef = useRef<Group>(null);

	const pos = useRef(new Vector3(initialPos[0], terrainHeight(initialPos[0], initialPos[1]), initialPos[1]));
	const currentYaw = useRef(Math.random() * Math.PI * 2);
	const timer = useRef(2.0 + Math.random() * 2);
	const isScampering = useRef(false);
	const scamperTarget = useRef(new Vector3(initialPos[0], 0, initialPos[1]));

	const materials = useMemo(() => {
		return {
			coat: new MeshStandardMaterial({ color: "#9a3412", roughness: 0.8 }),
			belly: new MeshStandardMaterial({ color: "#fef3c7", roughness: 0.85 }),
			acorn: new MeshStandardMaterial({ color: "#78350f", roughness: 0.7 }),
			acornCap: new MeshStandardMaterial({ color: "#451a03", roughness: 0.9 }),
			eyes: new MeshStandardMaterial({ color: "#09090b", roughness: 0.2 }),
			nose: new MeshStandardMaterial({ color: "#27272a", roughness: 0.5 }),
		};
	}, []);

	useFrame(({ clock }, delta) => {
		if (!groupRef.current || reducedMotion) return;
		const dt = Math.min(delta, 0.05);
		const elapsed = clock.elapsedTime;
		timer.current -= dt;

		if (timer.current <= 0) {
			if (!isScampering.current && Math.random() > 0.45) {
				isScampering.current = true;
				timer.current = 1.2 + Math.random() * 0.8;
				const angle = Math.random() * Math.PI * 2;
				const dist = 1.4 + Math.random() * 1.8;
				scamperTarget.current.set(
					initialPos[0] + Math.cos(angle) * dist,
					0,
					initialPos[1] + Math.sin(angle) * dist,
				);
			} else {
				isScampering.current = false;
				timer.current = 3.0 + Math.random() * 3.0;
			}
		}

		let hopOffset = 0;
		let bodyPitch = Math.sin(elapsed * 2.5 + initialPos[0]) * 0.03;
		if (isScampering.current) {
			const dx = scamperTarget.current.x - pos.current.x;
			const dz = scamperTarget.current.z - pos.current.z;
			const remaining = Math.hypot(dx, dz);
			if (remaining > 0.08) {
				const targetYaw = Math.atan2(dx, dz);
				let yawDiff = targetYaw - currentYaw.current;
				while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
				while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
				currentYaw.current += yawDiff * (1 - Math.exp(-10 * dt));
				const hopWave = Math.abs(Math.sin(elapsed * 14));
				hopOffset = hopWave * Math.min(0.08, remaining * 0.14);
				bodyPitch = -Math.cos(elapsed * 14) * 0.14;
			}
			pos.current.x = MathUtils.damp(pos.current.x, scamperTarget.current.x, 3.5, dt);
			pos.current.z = MathUtils.damp(pos.current.z, scamperTarget.current.z, 3.5, dt);
		}
		pos.current.y = terrainHeight(pos.current.x, pos.current.z) + hopOffset;

		groupRef.current.position.copy(pos.current);
		groupRef.current.rotation.y = currentYaw.current;
		groupRef.current.rotation.x = MathUtils.damp(groupRef.current.rotation.x, bodyPitch, 10, dt);

		// Tail undulating in graceful S-wave
		if (tailRef.current) {
			tailRef.current.rotation.x = -0.4 + Math.sin(timer.current * 3.5) * 0.15;
			tailRef.current.rotation.z = Math.sin(timer.current * 2) * 0.12;
		}

		// Nibbling acorn animation
		if (pawsRef.current && headRef.current && !isScampering.current) {
			pawsRef.current.position.y = 0.14 + Math.sin(timer.current * 18) * 0.008;
			headRef.current.rotation.x = -0.1 + Math.sin(timer.current * 18) * 0.03;
		}

		squirrelGlb.sync(isScampering.current ? "walk" : "idle", isScampering.current ? 1.8 : 1);
	});

	return (
		<group ref={groupRef} scale={0.55}>
			<GLBOrFallback
				slot="animals/squirrel"
				animationState={squirrelGlb.animState}
				speedRef={squirrelGlb.speedRef}
				targetHeight={MODEL_SPECS["animals/squirrel"].targetHeight / 0.55}
				fallback={
					<>
						{/* Rounded Upright Body */}
			<mesh castShadow receiveShadow material={materials.coat} position={[0, 0.15, -0.02]} scale={[0.1, 0.14, 0.11]}>
				<sphereGeometry args={[1, 10, 8]} />
			</mesh>
			<mesh material={materials.belly} position={[0, 0.14, 0.04]} scale={[0.08, 0.12, 0.08]}>
				<sphereGeometry args={[1, 8, 8]} />
			</mesh>

			{/* Hind Haunches / Paws */}
			<mesh material={materials.coat} position={[-0.08, 0.06, -0.04]} scale={[0.04, 0.06, 0.08]}>
				<sphereGeometry args={[1, 6, 6]} />
			</mesh>
			<mesh material={materials.coat} position={[0.08, 0.06, -0.04]} scale={[0.04, 0.06, 0.08]}>
				<sphereGeometry args={[1, 6, 6]} />
			</mesh>

			{/* Front Paws Holding Acorn */}
			<group ref={pawsRef} position={[0, 0.14, 0.08]}>
				<mesh material={materials.coat} position={[-0.04, 0, 0]} scale={[0.02, 0.025, 0.05]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>
				<mesh material={materials.coat} position={[0.04, 0, 0]} scale={[0.02, 0.025, 0.05]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>
				<group position={[0, 0, 0.03]}>
					<mesh material={materials.acorn} scale={[0.025, 0.032, 0.025]}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>
					<mesh material={materials.acornCap} position={[0, 0.022, 0]} scale={[0.03, 0.015, 0.03]}>
						<cylinderGeometry args={[1, 0.8, 1, 6]} />
					</mesh>
				</group>
			</group>

			{/* Head & Alert Ear Tufts */}
			<group ref={headRef} position={[0, 0.26, 0.04]}>
				<mesh castShadow material={materials.coat} scale={[0.09, 0.095, 0.11]}>
					<sphereGeometry args={[1, 10, 8]} />
				</mesh>
				<mesh material={materials.belly} position={[0, -0.02, 0.08]} scale={[0.05, 0.045, 0.06]}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>
				<mesh material={materials.nose} position={[0, -0.01, 0.12]} scale={0.015}>
					<sphereGeometry args={[1, 6, 6]} />
				</mesh>

				{/* Dark Button Eyes */}
				{[-1, 1].map((side) => (
					<mesh key={side} material={materials.eyes} position={[side * 0.065, 0.02, 0.05]} scale={0.018}>
						<sphereGeometry args={[1, 6, 6]} />
					</mesh>
				))}

				{/* Pointed Ear Tufts */}
				{[-1, 1].map((side) => (
					<mesh key={side} material={materials.coat} position={[side * 0.05, 0.08, -0.01]} rotation={[0, 0, side * 0.3]} scale={[0.02, 0.045, 0.02]}>
						<coneGeometry args={[1, 1, 5]} />
					</mesh>
				))}
			</group>

			{/* Magnificent Curved Fluffy Tail */}
			<group ref={tailRef} position={[0, 0.1, -0.1]}>
				<mesh material={materials.coat} position={[0, 0.08, -0.06]} rotation={[-0.8, 0, 0]} scale={[0.08, 0.14, 0.08]}>
					<sphereGeometry args={[1, 8, 8]} />
				</mesh>
				<mesh material={materials.coat} position={[0, 0.22, -0.02]} rotation={[0.4, 0, 0]} scale={[0.09, 0.16, 0.09]}>
					<sphereGeometry args={[1, 8, 8]} />
				</mesh>
				<mesh material={materials.coat} position={[0, 0.32, 0.05]} rotation={[0.9, 0, 0]} scale={[0.07, 0.12, 0.07]}>
					<sphereGeometry args={[1, 8, 8]} />
				</mesh>
			</group>
					</>
				}
			/>
		</group>
	);
}

/**
 * Flock of Soaring High-Altitude Birds Circling the Valley
 */
function SoaringFlock({ reducedMotion }: { reducedMotion: boolean }) {
	const flockRef = useRef<Group>(null);
	const birds = useMemo(() => {
		return [
			{ radius: 28, height: 26, speed: 0.18, offset: 0, color: "#334155" },
			{ radius: 32, height: 29, speed: 0.16, offset: 1.4, color: "#475569" },
			{ radius: 25, height: 27, speed: 0.21, offset: 2.8, color: "#1e293b" },
			{ radius: 35, height: 32, speed: 0.15, offset: 4.2, color: "#334155" },
			{ radius: 30, height: 28, speed: 0.19, offset: 5.5, color: "#475569" },
		];
	}, []);

	useFrame(({ clock }) => {
		if (!flockRef.current || reducedMotion) return;
		const time = clock.elapsedTime;
		flockRef.current.children.forEach((child, i) => {
			const b = birds[i];
			if (!b) return;
			const angle = time * b.speed + b.offset;
			const x = Math.cos(angle) * b.radius;
			const z = Math.sin(angle) * b.radius * 0.85;
			const y = b.height + Math.sin(time * 0.5 + b.offset) * 1.5;
			child.position.set(x, y, z);
			child.rotation.y = -angle + Math.PI / 2;
			child.rotation.z = -0.15;
			const leftWing = child.children[1];
			const rightWing = child.children[2];
			const flap = Math.sin(time * 3 + b.offset) * 0.2;
			if (leftWing && rightWing) {
				leftWing.rotation.z = flap;
				rightWing.rotation.z = -flap;
			}
		});
	});

	return (
		<group ref={flockRef}>
			{birds.map((b, index) => {
				const mat = SHARED_SOAR_MATS[b.color];
				return (
					<group key={index} scale={0.45}>
						<mesh scale={[0.15, 0.12, 0.4]} geometry={SHARED_SOAR_BODY_GEO} material={mat} />
						<mesh position={[-0.45, 0, 0]} rotation={[0, 0.1, 0]} scale={[0.65, 0.04, 0.22]} geometry={SHARED_SOAR_WING_GEO} material={mat} />
						<mesh position={[0.45, 0, 0]} rotation={[0, -0.1, 0]} scale={[0.65, 0.04, 0.22]} geometry={SHARED_SOAR_WING_GEO} material={mat} />
					</group>
				);
			})}
		</group>
	);
}

export function AnimalManager({ playerRef, quality, colliders }: AnimalManagerProps) {
	const reducedMotion = Boolean(useReducedMotion());
	const birdCount = quality === "LOW" ? 2 : 4;
	const rabbitCount = quality === "LOW" ? 3 : 5;
	const deerCount = quality === "LOW" ? 1 : 2;
	const foxCount = quality === "LOW" ? 1 : 2;
	const duckCount = quality === "LOW" ? 3 : 5;
	const squirrelCount = quality === "LOW" ? 2 : 3;

	// Coordinated bunny habitats in cozy clearings
	const rabbitData: Array<{ pos: [number, number]; theme: "snow" | "caramel" | "cinnamon" }> = [
		{ pos: [6, 14], theme: "snow" },
		{ pos: [-10, 8], theme: "caramel" },
		{ pos: [-6, 18], theme: "cinnamon" },
		{ pos: [16, 8], theme: "snow" },
		{ pos: [-15, -2], theme: "caramel" },
	];

	// Deer habitats in peaceful grassy corridors
	const deerData: Array<{ pos: [number, number]; scale: number; antlers: boolean }> = [
		{ pos: [16, -10], scale: 1.05, antlers: true }, // Majestic Buck in North-East meadow
		{ pos: [-18, -6], scale: 0.85, antlers: false }, // Gentle Fawn/Doe in North-West grove
	];

	// Playful foxes roaming the woodland edges
	const foxData: Array<{ pos: [number, number] }> = [
		{ pos: [-12, 14] }, // South-West wildflower clearing
		{ pos: [14, 15] },  // South-East grassy knoll
	];

	// Swimming River Ducks & Ducklings + Shore Walker
	const duckData: Array<{
		homeX: number;
		homeZ?: number;
		roamRadius: number;
		speed: number;
		theme: "mallard" | "white" | "duckling";
		mode?: "water" | "shore";
	}> = [
		{ homeX: -8.0, homeZ: -2.8, roamRadius: 2.2, speed: 0.58, theme: "mallard", mode: "water" }, // West water lily cove
		{ homeX: -5.8, homeZ: -0.45, roamRadius: 1.6, speed: 0.42, theme: "white", mode: "shore" },  // Walking on sunny riverbank
		{ homeX: -2.2, homeZ: -3.1, roamRadius: 1.3, speed: 0.52, theme: "duckling", mode: "water" },// Baby duckling swimming
		{ homeX: 8.5, homeZ: -2.2, roamRadius: 2.4, speed: 0.58, theme: "mallard", mode: "water" },  // East sunny shallows
		{ homeX: 1.0, homeZ: -26.8, roamRadius: 3.2, speed: 0.50, theme: "white", mode: "water" },   // Scenic Lotus Lake
	];

	// Forest squirrels stationed near tree roots
	const squirrelData: Array<{ pos: [number, number] }> = [
		{ pos: [-5, 3] },  // Near central tree
		{ pos: [7, 3] },   // Near eastern tree
		{ pos: [-14, 6] }, // Near western garden edge
	];

	return (
		<group name="wildlife-sanctuary">
			{/* High-Fidelity Organic FSM Ginger Cat */}
			<Cat playerRef={playerRef} colliders={colliders} reducedMotion={reducedMotion} />

			{/* Noble Forest Deers & Fawns */}
			{deerData.slice(0, deerCount).map((item, index) => (
				<Deer
					key={`deer-${index}`}
					initialPos={item.pos}
					scale={item.scale}
					hasAntlers={item.antlers}
					playerRef={playerRef}
					colliders={colliders}
					reducedMotion={reducedMotion}
				/>
			))}

			{/* Playful Red Foxes */}
			{foxData.slice(0, foxCount).map((item, index) => (
				<Fox
					key={`fox-${index}`}
					initialPos={item.pos}
					playerRef={playerRef}
					colliders={colliders}
					reducedMotion={reducedMotion}
				/>
			))}

			{/* Swimming River Ducks & Ducklings */}
			{duckData.slice(0, duckCount).map((item, index) => (
				<RiverDuck
					key={`duck-${index}`}
					homeX={item.homeX}
					homeZ={item.homeZ}
					roamRadius={item.roamRadius}
					speed={item.speed}
					theme={item.theme}
					mode={item.mode}
					reducedMotion={reducedMotion}
				/>
			))}

			{/* Forest Squirrels Nibbling Acorns */}
			{squirrelData.slice(0, squirrelCount).map((item, index) => (
				<Squirrel
					key={`squirrel-${index}`}
					initialPos={item.pos}
					reducedMotion={reducedMotion}
				/>
			))}

			{/* Sweet Meadow Bunnies */}
			{rabbitData.slice(0, rabbitCount).map((item, index) => (
				<Rabbit
					key={`rabbit-${index}`}
					initialPos={item.pos}
					colorTheme={item.theme}
					playerRef={playerRef}
					colliders={colliders}
					reducedMotion={reducedMotion}
				/>
			))}

			{/* Tree Perching Songbirds */}
			{Array.from({ length: birdCount }, (_, index) => (
				<Bird key={`bird-${index}`} index={index} playerRef={playerRef} reducedMotion={reducedMotion} />
			))}

			{/* Soaring Bird Flock Gliding in the Valley Sky */}
			<SoaringFlock reducedMotion={reducedMotion} />
		</group>
	);
}
