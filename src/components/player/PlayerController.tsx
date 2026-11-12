"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, Vector3 } from "three";
import { getBridgeDeckHeight } from "@/components/player/navigation";
import { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";
import { CircularCollider, distanceToPaths, terrainHeight } from "@/components/world/terrain-utils";
import type { TimePhase } from "@/components/world/time-system";
import { type SurfaceKind, worldAudio } from "@/components/world/world-audio";
import { AvatarModel, AvatarAnimationState } from "@/components/player/AvatarModel";

type PlayerControllerProps = {
	inputRef: { current: WorldInput };
	playerRef: { current: PlayerRuntime };
	points: WorldPoint[];
	colliders: CircularCollider[];
	target: WorldPoint | null;
	interacting: boolean;
	timePhase?: TimePhase;
	onNearbyChange: (pointId: string | null) => void;
	onPosition: (position: PlayerRuntime["position"]) => void;
	onArrived: (pointId: string) => void;
	onCancelNavigate?: () => void;
};

const WORLD_LIMITS = { minX: -26.0, maxX: 26.0, minZ: -36.0, maxZ: 25.0 };
const PLAYER_RADIUS = 0.38;
const MAX_MOVEMENT_STEP = 0.12;

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
	let diff = (target - current) % (Math.PI * 2);
	if (diff < -Math.PI) diff += Math.PI * 2;
	if (diff > Math.PI) diff -= Math.PI * 2;
	return current + diff * (1 - Math.exp(-lambda * dt));
}

export function PlayerController({ inputRef, playerRef, points, colliders, target, interacting, timePhase = "day", onNearbyChange, onPosition, onArrived, onCancelNavigate }: PlayerControllerProps) {
	const avatar = useRef<Group>(null);
	const velocity = useRef(new Vector3());
	const cameraAim = useMemo(() => new Vector3(), []);
	const cameraPosition = useMemo(() => new Vector3(), []);
	const desiredVelocity = useMemo(() => new Vector3(), []);
	const lastNearby = useRef<string | null>(null);
	const positionUpdateTimer = useRef(0);
	const previousTarget = useRef<string | null>(null);
	const arrivedTarget = useRef<string | null>(null);
	const routeIndex = useRef(0);
	const waypointStuckTimer = useRef(0);
	const targetGraceTimer = useRef(0);
	const verticalLook = useRef(0);
	const currentAnimState = useRef<AvatarAnimationState>("idle");
	const [animationState, setAnimationState] = useState<AvatarAnimationState>("idle");
	const avatarSpeed = useRef(0);
	const avatarYaw = useRef(playerRef.current.yaw);
	const cameraYaw = useRef(playerRef.current.yaw);
	const cameraDistance = useRef(6.2);
	const userZoom = useRef(1.0);
	const smoothedAim = useRef(new Vector3(playerRef.current.position.x, playerRef.current.position.y + 1.1, playerRef.current.position.z));
	const smoothedCamPos = useRef(new Vector3(playerRef.current.position.x, playerRef.current.position.y + 5.0, playerRef.current.position.z + 6.0));
	const { camera } = useThree();
	const reducedMotion = Boolean(useReducedMotion());

	useEffect(() => {
		if (target?.id !== previousTarget.current) {
			previousTarget.current = target?.id ?? null;
			routeIndex.current = 0;
			waypointStuckTimer.current = 0;
			arrivedTarget.current = null;
			targetGraceTimer.current = 0.45;
			if (target) {
				velocity.current.set(0, 0, 0);
				inputRef.current.moveX = 0;
				inputRef.current.moveZ = 0;
			}
		}
	}, [target, inputRef]);

	useFrame((_, delta) => {
		const frame = Math.min(delta, 0.05);
		const input = inputRef.current;
		const player = playerRef.current;
		if (input.zoom) {
			userZoom.current = MathUtils.clamp(userZoom.current + input.zoom, 0.65, 1.85);
			input.zoom = 0;
		}
		player.yaw -= input.lookX * 0.0032;
		verticalLook.current = MathUtils.clamp(verticalLook.current + input.lookY * 0.0022, -0.65, 0.85);
		input.lookX = 0;
		input.lookY = 0;

		if (targetGraceTimer.current > 0) {
			targetGraceTimer.current -= frame;
		}

		let moveX = input.moveX;
		let moveZ = input.moveZ;

		// Manual override: player touched movement keys while auto-walking, cancel auto-target and take over immediately
		if (target && targetGraceTimer.current <= 0 && Math.hypot(input.moveX, input.moveZ) > 0.15) {
			if (onCancelNavigate) {
				onCancelNavigate();
			}
		} else if (target) {
			const route = target.route ?? [];
			const isFinalLeg = routeIndex.current >= route.length;
			const destination = isFinalLeg ? target.position : route[routeIndex.current];
			const dx = destination[0] - player.position.x;
			const dz = destination[2] - player.position.z;
			const distance = Math.hypot(dx, dz);
			const stopDistance = isFinalLeg ? Math.max(1.6, target.radius * 0.52) : 1.85;

			let advance = false;
			if (distance <= stopDistance) {
				advance = true;
			} else if (!isFinalLeg) {
				// Shortcut check: if closer to next waypoint than the segment distance between current and next
				const nextPoint = routeIndex.current + 1 < route.length ? route[routeIndex.current + 1] : target.position;
				const distToNext = Math.hypot(player.position.x - nextPoint[0], player.position.z - nextPoint[2]);
				const waypointToNext = Math.hypot(destination[0] - nextPoint[0], destination[2] - nextPoint[2]);
				if (distToNext < waypointToNext * 0.92 && distance < 3.2) {
					advance = true;
				}

				// Stuck watchdog: if character spends > 2.0s trying to reach intermediate point, advance smoothly
				waypointStuckTimer.current += frame;
				if (waypointStuckTimer.current > 2.0) {
					advance = true;
				}
			}

			if (advance) {
				if (isFinalLeg) {
					moveX = 0;
					moveZ = 0;
					if (arrivedTarget.current !== target.id) {
						arrivedTarget.current = target.id;
						onArrived(target.id);
					}
				} else {
					routeIndex.current += 1;
					waypointStuckTimer.current = 0;
				}
			} else {
				const travelYaw = Math.atan2(dx, -dz);
				player.yaw = dampAngle(player.yaw, travelYaw, 5.2, frame);
				moveX = 0;
				moveZ = -1;
			}
		}

		const inputLength = Math.hypot(moveX, moveZ);
		if (inputLength > 1) {
			moveX /= inputLength;
			moveZ /= inputLength;
		}
		const forward = -moveZ;
		const sin = Math.sin(player.yaw);
		const cos = Math.cos(player.yaw);
		const isSprinting = Boolean(input.sprint);
		const maxSpeed = target ? 3.4 : isSprinting ? 4.6 : 2.7;
		desiredVelocity.set(
			(sin * forward + cos * moveX) * maxSpeed,
			0,
			(-cos * forward + sin * moveX) * maxSpeed,
		);
		velocity.current.lerp(desiredVelocity, 1 - Math.exp(-(inputLength ? 8.5 : 7.8) * frame));

		let candidateX = player.position.x;
		let candidateZ = player.position.z;
		const movementDistance = velocity.current.length() * frame;
		const substeps = Math.max(1, Math.ceil(movementDistance / MAX_MOVEMENT_STEP));
		const substepDelta = frame / substeps;

		for (let step = 0; step < substeps; step += 1) {
			const previousX = candidateX;
			const previousZ = candidateZ;
			const intendedX = candidateX + velocity.current.x * substepDelta;
			const intendedZ = candidateZ + velocity.current.z * substepDelta;
			candidateX = MathUtils.clamp(intendedX, WORLD_LIMITS.minX, WORLD_LIMITS.maxX);
			candidateZ = MathUtils.clamp(intendedZ, WORLD_LIMITS.minZ, WORLD_LIMITS.maxZ);
			if (candidateX !== intendedX) velocity.current.x = 0;
			if (candidateZ !== intendedZ) velocity.current.z = 0;

			for (let pass = 0; pass < 2; pass += 1) {
				for (const collider of colliders) {
					const minimumDistance = collider.radius + PLAYER_RADIUS;
					const offsetX = candidateX - collider.x;
					const offsetZ = candidateZ - collider.z;
					const distance = Math.hypot(offsetX, offsetZ);
					if (distance >= minimumDistance) continue;

					const previousOffsetX = previousX - collider.x;
					const previousOffsetZ = previousZ - collider.z;
					const previousDistance = Math.hypot(previousOffsetX, previousOffsetZ);
					const normalX = distance > 1e-5 ? offsetX / distance : previousDistance > 1e-5 ? previousOffsetX / previousDistance : 1;
					const normalZ = distance > 1e-5 ? offsetZ / distance : previousDistance > 1e-5 ? previousOffsetZ / previousDistance : 0;
					const penetration = minimumDistance - distance;
					candidateX += normalX * penetration;
					candidateZ += normalZ * penetration;

					const velocityIntoSurface = velocity.current.x * normalX + velocity.current.z * normalZ;
					if (velocityIntoSurface < 0) {
						velocity.current.x -= normalX * velocityIntoSurface;
						velocity.current.z -= normalZ * velocityIntoSurface;
					}
				}
			}

			candidateX = MathUtils.clamp(candidateX, WORLD_LIMITS.minX, WORLD_LIMITS.maxX);
			candidateZ = MathUtils.clamp(candidateZ, WORLD_LIMITS.minZ, WORLD_LIMITS.maxZ);

			// Bridge wooden railings & side barriers (walkway is between x = -1.30 and 1.30)
			const isBridgeZ = candidateZ >= -5.6 && candidateZ <= 0.6;
			const wasBridgeZ = previousZ >= -5.6 && previousZ <= 0.6;
			const wasOnBridgeDeck = Math.abs(previousX) <= 1.35 && (wasBridgeZ || (previousZ >= -6.1 && previousZ <= 1.1));

			if (isBridgeZ || wasBridgeZ) {
				if (wasOnBridgeDeck) {
					// Player is ON the bridge deck: wooden railings strictly block side exit
					if (candidateX > 1.30) {
						candidateX = 1.30;
						velocity.current.x = 0;
					} else if (candidateX < -1.30) {
						candidateX = -1.30;
						velocity.current.x = 0;
					}
				} else {
					// Player is outside the bridge on the bank: prevent walking into the sides of the bridge
					if (Math.abs(candidateX) < 1.62) {
						const sideSign = Math.sign(previousX) || (candidateX >= 0 ? 1 : -1);
						candidateX = sideSign * 1.62;
						velocity.current.x = 0;
					}
				}
			}

			const riverCenter = -2.5 + Math.sin(candidateX * 0.13) * 0.75;
			const onBridge = getBridgeDeckHeight(candidateX, candidateZ) !== null;
			if (!onBridge && Math.abs(candidateZ - riverCenter) < 1.72) {
				const bankSign = Math.sign(previousZ - riverCenter) || (candidateZ > riverCenter ? 1 : -1);
				candidateZ = riverCenter + bankSign * 1.72;
				velocity.current.z = 0;
			}
		}

		player.position.x = candidateX;
		player.position.z = candidateZ;
		const bridgeHeight = getBridgeDeckHeight(candidateX, candidateZ);
		const targetGroundY = bridgeHeight === null ? terrainHeight(candidateX, candidateZ) : bridgeHeight - 0.01;
		player.position.y = MathUtils.damp(player.position.y, targetGroundY, 20, frame);
		positionUpdateTimer.current += frame;
		if (positionUpdateTimer.current >= 0.15) {
			positionUpdateTimer.current = 0;
			onPosition({ ...player.position });
		}
		if (avatar.current) {
			avatar.current.position.set(candidateX, player.position.y, candidateZ);
			const moveSpeed = velocity.current.length();
			let targetRoll = 0;
			let targetPitch = 0;

			if (moveSpeed > 0.15) {
				const travelYaw = Math.atan2(velocity.current.x, -velocity.current.z);
				const prevYaw = avatarYaw.current;
				avatarYaw.current = dampAngle(avatarYaw.current, travelYaw, 12, frame);

				let yawDiff = (travelYaw - prevYaw) % (Math.PI * 2);
				if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
				if (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
				const turnRate = yawDiff / Math.max(frame, 0.001);

				// Centrifugal roll banking into turn (subtle, realistic)
				targetRoll = MathUtils.clamp(-turnRate * 0.028, -0.12, 0.12);
				// Forward acceleration pitch lean
				targetPitch = MathUtils.clamp(moveSpeed * 0.018, 0, 0.08);
			} else {
				avatarYaw.current = dampAngle(avatarYaw.current, player.yaw, 8, frame);
			}

			avatar.current.rotation.y = Math.PI - avatarYaw.current;
			avatar.current.rotation.z = MathUtils.damp(avatar.current.rotation.z, targetRoll, 10, frame);
			avatar.current.rotation.x = MathUtils.damp(avatar.current.rotation.x, targetPitch, 8, frame);
			avatar.current.visible = true;
		}

		const speed = velocity.current.length();
		let nextState: AvatarAnimationState = "idle";
		if (speed > 3.3) {
			nextState = "run";
		} else if (speed > 0.15) {
			nextState = "walk";
		} else if (interacting && !reducedMotion) {
			nextState = "wave";
		} else {
			nextState = "idle";
		}

		if (nextState !== currentAnimState.current) {
			currentAnimState.current = nextState;
			setAnimationState(nextState);
		}
		avatarSpeed.current = speed;

		// Spatial audio & surface-aware footsteps
		worldAudio.updateSpatial(candidateX, candidateZ, timePhase);
		if (speed > 0.65) {
			const onBridge = Math.abs(candidateX) < 1.9 && candidateZ >= -5.6 && candidateZ <= 0.6;
			const onPier = Math.abs(candidateX) < 1.5 && candidateZ <= -22.0 && candidateZ >= -25.6;
			const surface: SurfaceKind = onBridge || onPier
				? "wood"
				: distanceToPaths(candidateX, candidateZ) < 0.85
					? "path"
					: "grass";
			worldAudio.playFootstep(surface, speed > 3.3);
		}

		// 3rd-Person Elevated Steadycam Follow: smooth cinematic follow without sudden collider zooms or dizzy spins
		const targetCamYaw = player.yaw;
		cameraYaw.current = dampAngle(cameraYaw.current, targetCamYaw, target ? 2.6 : 5.0, frame);
		const camSin = Math.sin(cameraYaw.current);
		const camCos = Math.cos(cameraYaw.current);

		const baseDist = 5.6 * userZoom.current;
		const baseHeight = 2.65 * userZoom.current;
		const backX = -camSin;
		const backZ = camCos;

		cameraDistance.current = MathUtils.damp(cameraDistance.current, baseDist, 4.0, frame);
		const cameraX = candidateX + backX * cameraDistance.current;
		const cameraZ = candidateZ + backZ * cameraDistance.current;
		const groundAtCam = terrainHeight(cameraX, cameraZ);
		const targetCamY = Math.max(
			player.position.y + baseHeight - verticalLook.current * 0.9,
			groundAtCam + 0.95,
		);

		// Aim toward the valley horizon so the avatar, landscape, and celestial sky (Sun & Moon) stay framed
		const forwardAim = 4.5;
		cameraPosition.set(cameraX, targetCamY, cameraZ);
		cameraAim.set(
			candidateX + camSin * forwardAim,
			player.position.y + 1.95 + verticalLook.current * 3.8,
			candidateZ - camCos * forwardAim,
		);

		if (reducedMotion) {
			camera.position.copy(cameraPosition);
			camera.lookAt(cameraAim);
		} else {
			smoothedCamPos.current.lerp(cameraPosition, 1 - Math.exp(-6.0 * frame));
			smoothedAim.current.lerp(cameraAim, 1 - Math.exp(-7.0 * frame));
			camera.position.copy(smoothedCamPos.current);
			camera.lookAt(smoothedAim.current);
		}

		let closest: WorldPoint | null = null;
		let closestDistance = Infinity;
		for (const point of points) {
			const distance = Math.hypot(candidateX - point.position[0], candidateZ - point.position[2]);
			if (distance <= point.radius && distance < closestDistance) {
				closest = point;
				closestDistance = distance;
			}
		}
		const nextNearby = closest?.id ?? null;
		if (nextNearby !== lastNearby.current) {
			lastNearby.current = nextNearby;
			onNearbyChange(nextNearby);
		}
	});

	return (
		<group ref={avatar}>
			<AvatarModel
				animationState={animationState}
				speedRef={avatarSpeed}
				reducedMotion={reducedMotion}
			/>
		</group>
	);
}
