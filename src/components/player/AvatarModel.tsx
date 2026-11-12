"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
	Box3,
	Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	Vector3,
} from "three";
import type { AnimationAction } from "three";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getModelUrl } from "@/data/models-manifest";
import { ModelErrorBoundary } from "@/components/world/ModelAsset";

export type AvatarAnimationState = "idle" | "walk" | "run" | "wave";

type AvatarModelProps = {
	animationState: AvatarAnimationState;
	speedRef: { current: number };
	reducedMotion: boolean;
	modelUrl?: string;
};

/**
 * Procedural stylized humanoid avatar ("Mini-David")
 * Fixed: Completely removed any uninitialized instanced meshes.
 * All hair components are cleanly sculpted stylized geometry with small, safe dimensions.
 */
function ProceduralStylizedAvatar({
	animationState,
	speedRef,
	reducedMotion,
}: {
	animationState: AvatarAnimationState;
	speedRef: { current: number };
	reducedMotion: boolean;
}) {
	const rootGroup = useRef<Group>(null);
	const hipsGroup = useRef<Group>(null);
	const spineGroup = useRef<Group>(null);
	const chestGroup = useRef<Group>(null);
	const headGroup = useRef<Group>(null);

	const leftArm = useRef<Group>(null);
	const rightArm = useRef<Group>(null);
	const leftForearm = useRef<Group>(null);
	const rightForearm = useRef<Group>(null);
	const leftHand = useRef<Group>(null);
	const rightHand = useRef<Group>(null);

	const leftLeg = useRef<Group>(null);
	const rightLeg = useRef<Group>(null);
	const leftKnee = useRef<Group>(null);
	const rightKnee = useRef<Group>(null);
	const leftFoot = useRef<Group>(null);
	const rightFoot = useRef<Group>(null);

	const cycleTime = useRef(0);

	const materials = useMemo(() => {
		return {
			skin: new MeshStandardMaterial({
				color: "#fed7aa",
				roughness: 0.55,
				metalness: 0.02,
			}),
			hair: new MeshStandardMaterial({
				color: "#1e2229",
				roughness: 0.65,
				metalness: 0.08,
			}),
			hoodie: new MeshStandardMaterial({
				color: "#c7d2fe",
				roughness: 0.78,
				metalness: 0.04,
			}),
			hoodieInner: new MeshStandardMaterial({
				color: "#a5b4fc",
				roughness: 0.85,
			}),
			tshirt: new MeshStandardMaterial({
				color: "#ffffff",
				roughness: 0.7,
			}),
			cords: new MeshStandardMaterial({
				color: "#f1f5f9",
				roughness: 0.5,
			}),
			pants: new MeshStandardMaterial({
				color: "#334155",
				roughness: 0.88,
				metalness: 0.05,
			}),
			sneakerWhite: new MeshStandardMaterial({
				color: "#f8fafc",
				roughness: 0.35,
				metalness: 0.08,
			}),
			sneakerAccent: new MeshStandardMaterial({
				color: "#2dd4bf",
				roughness: 0.42,
			}),
			sneakerSole: new MeshStandardMaterial({
				color: "#cbd5e1",
				roughness: 0.6,
			}),
			eyeIris: new MeshStandardMaterial({
				color: "#273044",
				roughness: 0.2,
			}),
			eyeWhite: new MeshStandardMaterial({
				color: "#ffffff",
				roughness: 0.2,
			}),
			blush: new MeshStandardMaterial({
				color: "#f472b6",
				roughness: 0.6,
				transparent: true,
				opacity: 0.5,
			}),
			mouth: new MeshStandardMaterial({
				color: "#b91c1c",
				roughness: 0.5,
			}),
		};
	}, []);

	useFrame((_, delta) => {
		if (reducedMotion && animationState !== "walk" && animationState !== "run") return;
		const dt = Math.min(delta, 0.05);

		const moving = animationState === "run" || animationState === "walk";
		cycleTime.current += dt * (moving ? speedRef.current * 2.2 : 1.8);
		const t = cycleTime.current;

		if (!rootGroup.current || !hipsGroup.current || !spineGroup.current || !headGroup.current) return;

		if (animationState === "idle") {
			const breath = Math.sin(t * 1.5) * 0.03;
			spineGroup.current.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
			spineGroup.current.rotation.x = MathUtils.damp(spineGroup.current.rotation.x, 0, 6, dt);
			spineGroup.current.rotation.y = MathUtils.damp(spineGroup.current.rotation.y, 0, 6, dt);
			spineGroup.current.rotation.z = MathUtils.damp(spineGroup.current.rotation.z, 0, 6, dt);
			hipsGroup.current.position.y = 0.82 + Math.sin(t * 1.5) * 0.015;

			hipsGroup.current.rotation.z = Math.sin(t * 0.75) * 0.025;
			hipsGroup.current.rotation.y = Math.sin(t * 0.5) * 0.04;

			headGroup.current.rotation.x = Math.sin(t * 1.2) * 0.03 + 0.04;
			headGroup.current.rotation.y = Math.sin(t * 0.6) * 0.07;
			headGroup.current.rotation.z = Math.sin(t * 0.75) * -0.02;

			if (leftArm.current && rightArm.current && leftForearm.current && rightForearm.current) {
				leftArm.current.rotation.x = MathUtils.damp(leftArm.current.rotation.x, 0.1 + Math.sin(t * 1.5) * 0.03, 6, dt);
				leftArm.current.rotation.z = MathUtils.damp(leftArm.current.rotation.z, 0.18, 6, dt);
				rightArm.current.rotation.x = MathUtils.damp(rightArm.current.rotation.x, 0.1 + Math.sin(t * 1.5 + 0.4) * 0.03, 6, dt);
				rightArm.current.rotation.z = MathUtils.damp(rightArm.current.rotation.z, -0.18, 6, dt);

				leftForearm.current.rotation.x = MathUtils.damp(leftForearm.current.rotation.x, 0.22, 6, dt);
				rightForearm.current.rotation.x = MathUtils.damp(rightForearm.current.rotation.x, 0.22, 6, dt);
			}

			if (leftLeg.current && rightLeg.current && leftKnee.current && rightKnee.current) {
				leftLeg.current.rotation.x = MathUtils.damp(leftLeg.current.rotation.x, 0.02, 6, dt);
				rightLeg.current.rotation.x = MathUtils.damp(rightLeg.current.rotation.x, -0.02, 6, dt);
				leftKnee.current.rotation.x = MathUtils.damp(leftKnee.current.rotation.x, 0.04, 6, dt);
				rightKnee.current.rotation.x = MathUtils.damp(rightKnee.current.rotation.x, 0.04, 6, dt);
			}
		} else if (animationState === "walk" || animationState === "run") {
			const isRun = animationState === "run";
			const strideAmplitude = isRun ? 0.72 : 0.44;
			const armAmplitude = isRun ? 0.82 : 0.5;
			const bounceHeight = isRun ? 0.055 : 0.022;
			const forwardLean = isRun ? 0.16 : 0.07;

			hipsGroup.current.position.y = 0.82 + Math.abs(Math.sin(t)) * bounceHeight;
			hipsGroup.current.rotation.y = Math.sin(t) * (isRun ? 0.09 : 0.055);
			hipsGroup.current.rotation.z = Math.cos(t) * 0.025;
			spineGroup.current.rotation.x = forwardLean + Math.sin(t * 2) * 0.012;
			spineGroup.current.rotation.z = Math.sin(t) * 0.018;

			headGroup.current.rotation.x = -forwardLean * 0.45 + Math.sin(t * 2 + 0.5) * 0.015;
			headGroup.current.rotation.y = -Math.sin(t) * 0.035;

			const leftPhase = t;
			const rightPhase = t + Math.PI;
			const leftKneeBend = Math.max(0, -Math.sin(leftPhase)) * (isRun ? 1.4 : 0.95);
			const rightKneeBend = Math.max(0, -Math.sin(rightPhase)) * (isRun ? 1.4 : 0.95);

			if (leftLeg.current && rightLeg.current && leftKnee.current && rightKnee.current && leftFoot.current && rightFoot.current) {
				leftLeg.current.rotation.x = MathUtils.damp(leftLeg.current.rotation.x, Math.sin(leftPhase) * strideAmplitude, 14, dt);
				rightLeg.current.rotation.x = MathUtils.damp(rightLeg.current.rotation.x, Math.sin(rightPhase) * strideAmplitude, 14, dt);
				leftKnee.current.rotation.x = MathUtils.damp(leftKnee.current.rotation.x, leftKneeBend, 14, dt);
				rightKnee.current.rotation.x = MathUtils.damp(rightKnee.current.rotation.x, rightKneeBend, 14, dt);
				leftFoot.current.rotation.x = MathUtils.damp(leftFoot.current.rotation.x, -Math.sin(leftPhase) * 0.18 + leftKneeBend * 0.08, 14, dt);
				rightFoot.current.rotation.x = MathUtils.damp(rightFoot.current.rotation.x, -Math.sin(rightPhase) * 0.18 + rightKneeBend * 0.08, 14, dt);
			}

			if (leftArm.current && rightArm.current && leftForearm.current && rightForearm.current) {
				leftArm.current.rotation.x = MathUtils.damp(leftArm.current.rotation.x, -Math.sin(leftPhase) * armAmplitude, 14, dt);
				rightArm.current.rotation.x = MathUtils.damp(rightArm.current.rotation.x, -Math.sin(rightPhase) * armAmplitude, 14, dt);

				leftArm.current.rotation.z = MathUtils.damp(leftArm.current.rotation.z, 0.2, 10, dt);
				rightArm.current.rotation.z = MathUtils.damp(rightArm.current.rotation.z, -0.2, 10, dt);

				leftForearm.current.rotation.x = MathUtils.damp(leftForearm.current.rotation.x, 0.28 + leftKneeBend * 0.35, 12, dt);
				rightForearm.current.rotation.x = MathUtils.damp(rightForearm.current.rotation.x, 0.28 + rightKneeBend * 0.35, 12, dt);
			}
		} else if (animationState === "wave") {
			hipsGroup.current.position.y = 0.82;
			spineGroup.current.rotation.x = MathUtils.damp(spineGroup.current.rotation.x, -0.04, 6, dt);
			spineGroup.current.rotation.y = MathUtils.damp(spineGroup.current.rotation.y, 0.08, 6, dt);

			headGroup.current.rotation.z = MathUtils.damp(headGroup.current.rotation.z, -0.16, 6, dt);
			headGroup.current.rotation.x = MathUtils.damp(headGroup.current.rotation.x, -0.05, 6, dt);

			if (rightArm.current && rightForearm.current && rightHand.current) {
				rightArm.current.rotation.x = MathUtils.damp(rightArm.current.rotation.x, -2.1, 8, dt);
				rightArm.current.rotation.y = MathUtils.damp(rightArm.current.rotation.y, -0.4, 8, dt);
				rightArm.current.rotation.z = MathUtils.damp(rightArm.current.rotation.z, -0.35, 8, dt);

				rightForearm.current.rotation.x = MathUtils.damp(rightForearm.current.rotation.x, 0.6, 8, dt);
				rightForearm.current.rotation.z = Math.sin(t * 6.5) * 0.45;

				rightHand.current.rotation.z = Math.sin(t * 6.5 + 0.3) * 0.35;
			}

			if (leftArm.current && leftForearm.current) {
				leftArm.current.rotation.x = MathUtils.damp(leftArm.current.rotation.x, 0.15, 6, dt);
				leftArm.current.rotation.z = MathUtils.damp(leftArm.current.rotation.z, 0.22, 6, dt);
				leftForearm.current.rotation.x = MathUtils.damp(leftForearm.current.rotation.x, 0.18, 6, dt);
			}
		}
	});

	return (
		<group ref={rootGroup} scale={1.05}>
			<group ref={hipsGroup} position={[0, 0.82, 0]}>
				<mesh castShadow receiveShadow material={materials.pants}>
					<cylinderGeometry args={[0.22, 0.2, 0.22, 16]} />
				</mesh>

				<group ref={spineGroup} position={[0, 0.12, 0]}>
					<group ref={chestGroup} position={[0, 0.22, 0]}>
						<mesh position={[0, 0, 0]} castShadow receiveShadow material={materials.hoodie}>
							<cylinderGeometry args={[0.25, 0.23, 0.44, 16]} />
						</mesh>

						<mesh position={[0, -0.06, 0.18]} rotation={[0.1, 0, 0]} castShadow material={materials.hoodie}>
							<boxGeometry args={[0.28, 0.16, 0.08]} />
						</mesh>

						<mesh position={[-0.06, 0.1, 0.24]} material={materials.cords}>
							<cylinderGeometry args={[0.008, 0.008, 0.18, 6]} />
						</mesh>
						<mesh position={[0.06, 0.1, 0.24]} material={materials.cords}>
							<cylinderGeometry args={[0.008, 0.008, 0.18, 6]} />
						</mesh>

						<mesh position={[0, 0.2, 0]} castShadow material={materials.hoodieInner}>
							<cylinderGeometry args={[0.105, 0.12, 0.12, 16]} />
						</mesh>

						<mesh position={[0, 0.22, 0.14]} rotation={[0.4, 0, 0]} material={materials.tshirt}>
							<cylinderGeometry args={[0.09, 0.09, 0.04, 12]} />
						</mesh>

						{/* Neck & Head */}
						<group position={[0, 0.26, 0]}>
							<mesh position={[0, 0.05, 0]} material={materials.skin}>
								<cylinderGeometry args={[0.08, 0.09, 0.1, 12]} />
							</mesh>

							{/* Head group - Clean, stylized, strictly bounded geometry */}
							<group ref={headGroup} position={[0, 0.22, 0]}>
								{/* Cranium */}
								<mesh castShadow material={materials.skin}>
									<sphereGeometry args={[0.23, 20, 20]} />
								</mesh>

								{/* Left Eye */}
								<group position={[-0.08, 0.02, 0.21]} rotation={[0, -0.2, 0]}>
									<mesh material={materials.eyeWhite} scale={[0.055, 0.07, 0.015]}>
										<sphereGeometry args={[1, 14, 14]} />
									</mesh>
									<mesh position={[0, 0, 0.012]} material={materials.eyeIris} scale={[0.038, 0.052, 0.01]}>
										<sphereGeometry args={[1, 12, 12]} />
									</mesh>
									<mesh position={[0.015, 0.02, 0.022]} material={materials.eyeWhite} scale={[0.012, 0.012, 0.01]}>
										<sphereGeometry args={[1, 8, 8]} />
									</mesh>
								</group>

								{/* Right Eye */}
								<group position={[0.08, 0.02, 0.21]} rotation={[0, 0.2, 0]}>
									<mesh material={materials.eyeWhite} scale={[0.055, 0.07, 0.015]}>
										<sphereGeometry args={[1, 14, 14]} />
									</mesh>
									<mesh position={[0, 0, 0.012]} material={materials.eyeIris} scale={[0.038, 0.052, 0.01]}>
										<sphereGeometry args={[1, 12, 12]} />
									</mesh>
									<mesh position={[0.015, 0.02, 0.022]} material={materials.eyeWhite} scale={[0.012, 0.012, 0.01]}>
										<sphereGeometry args={[1, 8, 8]} />
									</mesh>
								</group>

								{/* Cheeks / Blush */}
								<mesh position={[-0.12, -0.04, 0.19]} material={materials.blush} scale={[0.045, 0.025, 0.01]}>
									<sphereGeometry args={[1, 10, 10]} />
								</mesh>
								<mesh position={[0.12, -0.04, 0.19]} material={materials.blush} scale={[0.045, 0.025, 0.01]}>
									<sphereGeometry args={[1, 10, 10]} />
								</mesh>

								{/* Nose & Mouth */}
								<mesh position={[0, -0.015, 0.23]} material={materials.skin} scale={[0.025, 0.03, 0.02]}>
									<sphereGeometry args={[1, 8, 8]} />
								</mesh>
								<mesh position={[0, -0.095, 0.215]} material={materials.mouth} scale={[0.038, 0.012, 0.008]}>
									<sphereGeometry args={[1, 8, 8]} />
								</mesh>

								{/* Stylized Hair - Clean individual tufts, NO uninitialized instanced meshes */}
								<group position={[0, 0.04, 0]}>
									{/* Main Hair Cap */}
									<mesh position={[0, 0.07, -0.03]} scale={[1.06, 1.04, 1.1]} castShadow material={materials.hair}>
										<sphereGeometry args={[0.235, 18, 16]} />
									</mesh>

									{/* Front Bang Locks */}
									<mesh position={[-0.09, 0.16, 0.17]} rotation={[0.4, -0.2, -0.3]} scale={[0.07, 0.13, 0.06]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 7]} />
									</mesh>
									<mesh position={[-0.02, 0.18, 0.19]} rotation={[0.35, -0.05, -0.1]} scale={[0.08, 0.14, 0.07]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 7]} />
									</mesh>
									<mesh position={[0.06, 0.17, 0.18]} rotation={[0.3, 0.15, 0.2]} scale={[0.075, 0.13, 0.065]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 7]} />
									</mesh>
									<mesh position={[0.13, 0.14, 0.15]} rotation={[0.5, 0.3, 0.4]} scale={[0.07, 0.12, 0.06]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 7]} />
									</mesh>

									{/* Sideburns */}
									<mesh position={[-0.22, 0.01, 0.07]} rotation={[0, 0, -0.25]} scale={[0.04, 0.13, 0.06]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 6]} />
									</mesh>
									<mesh position={[0.22, 0.01, 0.07]} rotation={[0, 0, 0.25]} scale={[0.04, 0.13, 0.06]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 6]} />
									</mesh>

									{/* Subtle top curl volume */}
									<mesh position={[-0.06, 0.24, 0.02]} scale={[0.06, 0.06, 0.06]} castShadow material={materials.hair}>
										<sphereGeometry args={[1, 8, 8]} />
									</mesh>
									<mesh position={[0.06, 0.25, 0.03]} scale={[0.065, 0.065, 0.065]} castShadow material={materials.hair}>
										<sphereGeometry args={[1, 8, 8]} />
									</mesh>
									<mesh position={[0, 0.26, -0.05]} scale={[0.07, 0.07, 0.07]} castShadow material={materials.hair}>
										<sphereGeometry args={[1, 8, 8]} />
									</mesh>
								</group>
							</group>
						</group>

						{/* Left Arm */}
						<group ref={leftArm} position={[-0.28, 0.16, 0]}>
							<mesh position={[0, -0.12, 0]} castShadow material={materials.hoodie}>
								<cylinderGeometry args={[0.075, 0.07, 0.24, 12]} />
							</mesh>
							<group ref={leftForearm} position={[0, -0.24, 0]}>
								<mesh position={[0, -0.1, 0]} castShadow material={materials.hoodie}>
									<cylinderGeometry args={[0.068, 0.062, 0.2, 12]} />
								</mesh>
								<group ref={leftHand} position={[0, -0.21, 0]}>
									<mesh material={materials.skin} scale={[0.045, 0.065, 0.04]}>
										<sphereGeometry args={[1, 10, 10]} />
									</mesh>
								</group>
							</group>
						</group>

						{/* Right Arm */}
						<group ref={rightArm} position={[0.28, 0.16, 0]}>
							<mesh position={[0, -0.12, 0]} castShadow material={materials.hoodie}>
								<cylinderGeometry args={[0.075, 0.07, 0.24, 12]} />
							</mesh>
							<group ref={rightForearm} position={[0, -0.24, 0]}>
								<mesh position={[0, -0.1, 0]} castShadow material={materials.hoodie}>
									<cylinderGeometry args={[0.068, 0.062, 0.2, 12]} />
								</mesh>
								<group ref={rightHand} position={[0, -0.21, 0]}>
									<mesh material={materials.skin} scale={[0.045, 0.065, 0.04]}>
										<sphereGeometry args={[1, 10, 10]} />
									</mesh>
								</group>
							</group>
						</group>
					</group>
				</group>

				{/* Left Leg */}
				<group ref={leftLeg} position={[-0.12, -0.08, 0]}>
					<mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
						<cylinderGeometry args={[0.085, 0.075, 0.32, 12]} />
					</mesh>
					<group ref={leftKnee} position={[0, -0.32, 0]}>
						<mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
							<cylinderGeometry args={[0.072, 0.065, 0.32, 12]} />
						</mesh>
						<mesh position={[0, -0.3, 0]} material={materials.pants}>
							<torusGeometry args={[0.07, 0.015, 8, 16]} />
						</mesh>
						<group ref={leftFoot} position={[0, -0.34, 0.04]}>
							<mesh position={[0, 0.04, 0.04]} castShadow material={materials.sneakerWhite} scale={[0.08, 0.07, 0.2]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
							<mesh position={[0, 0.008, 0.04]} material={materials.sneakerSole} scale={[0.088, 0.024, 0.21]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
							<mesh position={[0, 0.03, 0.02]} material={materials.sneakerAccent} scale={[0.084, 0.02, 0.12]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
						</group>
					</group>
				</group>

				{/* Right Leg */}
				<group ref={rightLeg} position={[0.12, -0.08, 0]}>
					<mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
						<cylinderGeometry args={[0.085, 0.075, 0.32, 12]} />
					</mesh>
					<group ref={rightKnee} position={[0, -0.32, 0]}>
						<mesh position={[0, -0.16, 0]} castShadow material={materials.pants}>
							<cylinderGeometry args={[0.072, 0.065, 0.32, 12]} />
						</mesh>
						<mesh position={[0, -0.3, 0]} material={materials.pants}>
							<torusGeometry args={[0.07, 0.015, 8, 16]} />
						</mesh>
						<group ref={rightFoot} position={[0, -0.34, 0.04]}>
							<mesh position={[0, 0.04, 0.04]} castShadow material={materials.sneakerWhite} scale={[0.08, 0.07, 0.2]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
							<mesh position={[0, 0.008, 0.04]} material={materials.sneakerSole} scale={[0.088, 0.024, 0.21]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
							<mesh position={[0, 0.03, 0.02]} material={materials.sneakerAccent} scale={[0.084, 0.02, 0.12]}>
								<boxGeometry args={[1, 1, 1]} />
							</mesh>
						</group>
					</group>
				</group>
			</group>
		</group>
	);
}

function GLTFAvatar({
	url,
	animationState,
	speedRef,
	reducedMotion,
}: {
	url: string;
	animationState: AvatarAnimationState;
	speedRef: { current: number };
	reducedMotion: boolean;
}) {
	const group = useRef<Group>(null);
	const { scene, animations } = useGLTF(url);
	const activeAction = useRef<AnimationAction | null>(null);

	const normalized = useMemo(() => {
		const cloned = cloneSkeleton(scene);
		cloned.traverse((child) => {
			if ((child as Mesh).isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
				const mat = (child as Mesh).material as MeshStandardMaterial;
				if (mat) {
					mat.roughness = Math.max(0.2, mat.roughness ?? 0.5);
					mat.metalness = Math.min(0.8, mat.metalness ?? 0.1);
				}
			}
		});
		cloned.updateMatrixWorld(true);
		const box = new Box3().setFromObject(cloned);
		const size = new Vector3();
		const center = new Vector3();
		box.getSize(size);
		box.getCenter(center);
		const scaleFactor = size.y > 0.01 ? 1.72 / size.y : 1;
		return {
			cloned,
			scaleFactor,
			offset: [-center.x * scaleFactor, -box.min.y * scaleFactor, -center.z * scaleFactor] as [number, number, number],
		};
	}, [scene]);

	const { actions, names } = useAnimations(animations, group);

	useEffect(() => {
		if (!actions || names.length === 0) return;
		if (reducedMotion && animationState !== "walk" && animationState !== "run") {
			for (const action of Object.values(actions)) action?.stop();
			activeAction.current = null;
			return;
		}

		const findAction = (exactPattern: RegExp, fallbackPattern: RegExp) => {
			const matchedName =
				names.find((n) => exactPattern.test(n)) ??
				names.find((n) => fallbackPattern.test(n));
			return matchedName ? actions[matchedName] : null;
		};

		const idleAction = findAction(/(?:^|\|)idle$/i, /idle/i) ?? actions[names[0]];
		const walkAction = findAction(/(?:^|\|)walk$/i, /walk/i) ?? actions[names[1]] ?? idleAction;
		const runAction = findAction(/(?:^|\|)run$/i, /run/i) ?? walkAction;
		const waveAction = findAction(/(?:^|\|)(?:wave|greet|hello)$/i, /wave|greet|hello/i) ?? idleAction;

		let targetAction = idleAction;
		if (animationState === "run") targetAction = runAction;
		else if (animationState === "walk") targetAction = walkAction;
		else if (animationState === "wave") targetAction = waveAction;

		if (targetAction && targetAction !== activeAction.current) {
			targetAction.reset().fadeIn(0.2).play();
			activeAction.current?.fadeOut(0.2);
			activeAction.current = targetAction;
		}
	}, [actions, names, animationState, reducedMotion]);

	useFrame(() => {
		if (!activeAction.current) return;
		const nominalSpeed = animationState === "run" ? 4.3 : animationState === "walk" ? 2.7 : 1;
		activeAction.current.timeScale = animationState === "idle" || animationState === "wave"
			? 1
			: MathUtils.clamp(speedRef.current / nominalSpeed, 0.72, 1.35);
	});

	return (
		<group ref={group}>
			<group position={normalized.offset} scale={normalized.scaleFactor}>
				<primitive object={normalized.cloned} />
			</group>
		</group>
	);
}

export function AvatarModel({
	animationState,
	speedRef,
	reducedMotion: reducedMotionProp,
	modelUrl,
}: AvatarModelProps) {
	const systemPrefersReducedMotion = Boolean(useReducedMotion());
	const reducedMotion = reducedMotionProp || systemPrefersReducedMotion;
	const resolvedUrl = modelUrl ?? getModelUrl("avatar");

	const fallback = (
		<ProceduralStylizedAvatar
			animationState={animationState}
			speedRef={speedRef}
			reducedMotion={reducedMotion}
		/>
	);

	if (!resolvedUrl) {
		return fallback;
	}

	return (
		<ModelErrorBoundary fallback={fallback}>
			<Suspense fallback={fallback}>
				<GLTFAvatar
					url={resolvedUrl}
					animationState={animationState}
					speedRef={speedRef}
					reducedMotion={reducedMotion}
				/>
			</Suspense>
		</ModelErrorBoundary>
	);
}
