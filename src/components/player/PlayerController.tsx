"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import { Group, MathUtils, Vector3 } from "three";
import { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";
import { CircularCollider, terrainHeight } from "@/components/world/terrain-utils";
import { AvatarModel, AvatarAnimationState } from "@/components/player/AvatarModel";

type PlayerControllerProps = {
	inputRef: { current: WorldInput };
	playerRef: { current: PlayerRuntime };
	points: WorldPoint[];
	colliders: CircularCollider[];
	target: WorldPoint | null;
	onNearbyChange: (pointId: string | null) => void;
	onPosition: (position: PlayerRuntime["position"]) => void;
	onArrived: (pointId: string) => void;
};

const WORLD_LIMITS = { minX: -27, maxX: 27, minZ: -31, maxZ: 26 };

export function PlayerController({ inputRef, playerRef, points, colliders, target, onNearbyChange, onPosition, onArrived }: PlayerControllerProps) {
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
	const verticalLook = useRef(0);
	const waveTimer = useRef(0);
	const currentAnimState = useRef<AvatarAnimationState>("idle");
	const [animationState, setAnimationState] = useState<AvatarAnimationState>("idle");
	const avatarSpeed = useRef(0);
	const { camera } = useThree();

	useEffect(() => {
		if (target?.id !== previousTarget.current) {
			previousTarget.current = target?.id ?? null;
			routeIndex.current = 0;
			arrivedTarget.current = null;
			if (target) velocity.current.set(0, 0, 0);
		}
	}, [target]);

	useFrame((_, delta) => {
		const frame = Math.min(delta, 0.05);
		const input = inputRef.current;
		const player = playerRef.current;
		player.yaw -= MathUtils.clamp(input.lookX, -80, 80) * 0.0027;
		verticalLook.current = MathUtils.clamp(verticalLook.current + input.lookY * 0.0018, -0.28, 0.45);
		input.lookX = 0;
		input.lookY = 0;

		let moveX = input.moveX;
		let moveZ = input.moveZ;
		if (target) {
			const route = target.route ?? [];
			const isFinalLeg = routeIndex.current >= route.length;
			const destination = isFinalLeg ? target.position : route[routeIndex.current];
			const autoTarget = new Vector3(destination[0], 0, destination[2]);
			const deltaToTarget = autoTarget.clone().sub(new Vector3(player.position.x, 0, player.position.z));
			const distance = deltaToTarget.length();
			const nearbyObstacle = isFinalLeg
				? colliders.reduce((largest, collider) => {
					const offset = Math.hypot(target.position[0] - collider.x, target.position[2] - collider.z);
					return offset <= target.radius + collider.radius ? Math.max(largest, collider.radius + 0.28) : largest;
				}, 0)
				: 0;
			const stopDistance = isFinalLeg ? Math.max(1.8, target.radius * 0.58, nearbyObstacle) : 1.25;
			if (distance <= stopDistance) {
				if (isFinalLeg) {
					moveX = 0;
					moveZ = 0;
					if (arrivedTarget.current !== target.id) {
						arrivedTarget.current = target.id;
						waveTimer.current = 2.4;
						onArrived(target.id);
					}
				} else {
					routeIndex.current += 1;
				}
			} else {
				const travelYaw = Math.atan2(deltaToTarget.x, -deltaToTarget.z);
				player.yaw = MathUtils.damp(player.yaw, travelYaw, 3.2, frame);
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
		desiredVelocity.set(
			(sin * forward + cos * moveX) * 4.3,
			0,
			(-cos * forward + sin * moveX) * 4.3,
		);
		velocity.current.lerp(desiredVelocity, 1 - Math.exp(-(inputLength ? 8 : 10) * frame));

		const nextX = player.position.x + velocity.current.x * frame;
		const nextZ = player.position.z + velocity.current.z * frame;
		let candidateX = MathUtils.clamp(nextX, WORLD_LIMITS.minX, WORLD_LIMITS.maxX);
		let candidateZ = MathUtils.clamp(nextZ, WORLD_LIMITS.minZ, WORLD_LIMITS.maxZ);
		const riverCenter = -2.5 + Math.sin(candidateX * 0.13) * 0.75;
		const blockedByRiver = Math.abs(candidateZ - riverCenter) < 1.7 && Math.abs(candidateX) > 2.15;
		if (blockedByRiver) candidateZ = player.position.z;

		for (const collider of colliders) {
			const dx = candidateX - collider.x;
			const dz = candidateZ - collider.z;
			if (dx * dx + dz * dz < collider.radius * collider.radius) {
				const canSlideX = (candidateX - collider.x) ** 2 + (player.position.z - collider.z) ** 2 >= collider.radius ** 2;
				const canSlideZ = (player.position.x - collider.x) ** 2 + (candidateZ - collider.z) ** 2 >= collider.radius ** 2;
				if (canSlideX) candidateZ = player.position.z;
				else if (canSlideZ) candidateX = player.position.x;
				else {
					candidateX = player.position.x;
					candidateZ = player.position.z;
				}
				velocity.current.multiplyScalar(0.2);
			}
		}

		player.position.x = candidateX;
		player.position.z = candidateZ;
		player.position.y = terrainHeight(candidateX, candidateZ);
		positionUpdateTimer.current += frame;
		if (positionUpdateTimer.current >= 0.15) {
			positionUpdateTimer.current = 0;
			onPosition({ ...player.position });
		}
		if (avatar.current) {
			avatar.current.position.set(candidateX, player.position.y, candidateZ);
			avatar.current.rotation.y = player.yaw;
		}

		const speed = velocity.current.length();
		if (waveTimer.current > 0) {
			waveTimer.current = Math.max(0, waveTimer.current - frame);
		}

		let nextState: AvatarAnimationState = "idle";
		if (waveTimer.current > 0 && speed < 0.4) {
			nextState = "wave";
		} else if (speed > 2.8) {
			nextState = "run";
		} else if (speed > 0.2) {
			nextState = "walk";
		} else {
			nextState = "idle";
		}

		if (nextState !== currentAnimState.current) {
			currentAnimState.current = nextState;
			setAnimationState(nextState);
		}
		avatarSpeed.current = speed;

		const lookAhead = 0.8;
		cameraAim.set(candidateX + sin * lookAhead, player.position.y + 1.25 + verticalLook.current, candidateZ - cos * lookAhead);
		cameraPosition.set(candidateX - sin * 4.9, player.position.y + 2.85 + verticalLook.current, candidateZ + cos * 4.9);
		camera.position.lerp(cameraPosition, 1 - Math.exp(-5.2 * frame));
		camera.lookAt(cameraAim);

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
			if (nextNearby && speed < 0.5) {
				waveTimer.current = 2.2;
			}
			onNearbyChange(nextNearby);
		}
	});

	return (
		<group ref={avatar}>
			<AvatarModel
				animationState={animationState}
				speedRef={avatarSpeed}
			/>
		</group>
	);
}
