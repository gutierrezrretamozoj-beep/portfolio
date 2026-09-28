"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	Color,
	Group,
	MathUtils,
	Mesh,
	MeshStandardMaterial,
	Vector3,
} from "three";
import { useGLTF, useAnimations } from "@react-three/drei";

export type AvatarAnimationState = "idle" | "walk" | "run" | "wave";

type AvatarModelProps = {
	animationState: AvatarAnimationState;
	speed: number;
	modelUrl?: string;
};

/**
 * Procedural stylized humanoid avatar ("Mini-David")
 */
function ProceduralStylizedAvatar({
	animationState,
	speed,
}: {
	animationState: AvatarAnimationState;
	speed: number;
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
				metalness: 0.1,
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
				opacity: 0.55,
			}),
		};
	}, []);

	useFrame((_, delta) => {
		const dt = Math.min(delta, 0.05);

		const walkSpeedMultiplier = animationState === "run" ? 11.5 : animationState === "walk" ? 7.2 : 1.8;
		cycleTime.current += dt * walkSpeedMultiplier;
		const t = cycleTime.current;

		if (!rootGroup.current || !hipsGroup.current || !spineGroup.current || !headGroup.current) return;

		if (animationState === "idle") {
			const breath = Math.sin(t * 1.5) * 0.03;
			spineGroup.current.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
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
			const strideAmplitude = isRun ? 0.85 : 0.58;
			const armAmplitude = isRun ? 1.05 : 0.65;
			const bounceHeight = isRun ? 0.07 : 0.04;
			const forwardLean = isRun ? 0.22 : 0.12;

			hipsGroup.current.position.y = 0.82 + Math.abs(Math.sin(t)) * bounceHeight;
			hipsGroup.current.rotation.y = Math.sin(t) * 0.12;
			hipsGroup.current.rotation.z = Math.cos(t) * 0.04;
			spineGroup.current.rotation.x = forwardLean;

			headGroup.current.rotation.x = -forwardLean * 0.7 + Math.sin(t * 2) * 0.02;
			headGroup.current.rotation.y = -Math.sin(t) * 0.06;

			const leftPhase = t;
			const rightPhase = t + Math.PI;

			if (leftLeg.current && rightLeg.current && leftKnee.current && rightKnee.current && leftFoot.current && rightFoot.current) {
				leftLeg.current.rotation.x = Math.sin(leftPhase) * strideAmplitude;
				rightLeg.current.rotation.x = Math.sin(rightPhase) * strideAmplitude;

				const leftKneeBend = Math.max(0, -Math.sin(leftPhase)) * (isRun ? 1.4 : 0.95);
				const rightKneeBend = Math.max(0, -Math.sin(rightPhase)) * (isRun ? 1.4 : 0.95);
				leftKnee.current.rotation.x = leftKneeBend;
				rightKnee.current.rotation.x = rightKneeBend;

				leftFoot.current.rotation.x = Math.sin(leftPhase) * 0.25;
				rightFoot.current.rotation.x = Math.sin(rightPhase) * 0.25;
			}

			if (leftArm.current && rightArm.current && leftForearm.current && rightForearm.current) {
				leftArm.current.rotation.x = -Math.sin(leftPhase) * armAmplitude;
				rightArm.current.rotation.x = -Math.sin(rightPhase) * armAmplitude;

				leftArm.current.rotation.z = 0.2;
				rightArm.current.rotation.z = -0.2;

				leftForearm.current.rotation.x = 0.35 + Math.max(0, -Math.sin(leftPhase)) * (isRun ? 0.9 : 0.5);
				rightForearm.current.rotation.x = 0.35 + Math.max(0, -Math.sin(rightPhase)) * (isRun ? 0.9 : 0.5);
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

						<mesh position={[0, 0.2, -0.16]} rotation={[-0.35, 0, 0]} castShadow material={materials.hoodieInner}>
							<torusGeometry args={[0.16, 0.08, 12, 16, Math.PI * 1.2]} />
						</mesh>

						<mesh position={[0, 0.22, 0.14]} rotation={[0.4, 0, 0]} material={materials.tshirt}>
							<cylinderGeometry args={[0.09, 0.09, 0.04, 12]} />
						</mesh>

						<group position={[0, 0.26, 0]}>
							<mesh position={[0, 0.05, 0]} material={materials.skin}>
								<cylinderGeometry args={[0.08, 0.09, 0.1, 12]} />
							</mesh>

							<group ref={headGroup} position={[0, 0.22, 0]}>
								<mesh castShadow material={materials.skin}>
									<sphereGeometry args={[0.24, 20, 20]} />
								</mesh>

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

								<mesh position={[-0.12, -0.04, 0.19]} material={materials.blush} scale={[0.045, 0.025, 0.01]}>
									<sphereGeometry args={[1, 10, 10]} />
								</mesh>
								<mesh position={[0.12, -0.04, 0.19]} material={materials.blush} scale={[0.045, 0.025, 0.01]}>
									<sphereGeometry args={[1, 10, 10]} />
								</mesh>

								<group position={[0, 0.04, 0]}>
									<mesh position={[0, 0.07, -0.03]} scale={[1.08, 1.05, 1.12]} castShadow material={materials.hair}>
										<sphereGeometry args={[0.24, 18, 16]} />
									</mesh>
									<mesh position={[-0.08, 0.16, 0.18]} rotation={[0.4, -0.2, -0.3]} scale={[0.09, 0.14, 0.07]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 8]} />
									</mesh>
									<mesh position={[0.04, 0.17, 0.19]} rotation={[0.3, 0.15, 0.2]} scale={[0.1, 0.15, 0.08]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 8]} />
									</mesh>
									<mesh position={[0.13, 0.14, 0.16]} rotation={[0.5, 0.3, 0.4]} scale={[0.08, 0.13, 0.07]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 8]} />
									</mesh>
									<mesh position={[-0.24, -0.02, 0.08]} rotation={[0, 0, -0.2]} scale={[0.05, 0.15, 0.08]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 6]} />
									</mesh>
									<mesh position={[0.24, -0.02, 0.08]} rotation={[0, 0, 0.2]} scale={[0.05, 0.15, 0.08]} castShadow material={materials.hair}>
										<coneGeometry args={[1, 1.2, 6]} />
									</mesh>
								</group>
							</group>
						</group>

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
	speed,
}: {
	url: string;
	animationState: AvatarAnimationState;
	speed: number;
}) {
	const group = useRef<Group>(null);
	const { scene, animations } = useGLTF(url);
	const { actions, names } = useAnimations(animations, group);

	useEffect(() => {
		if (!actions || names.length === 0) return;

		const findAction = (pattern: RegExp) => {
			const matchedName = names.find((n) => pattern.test(n));
			return matchedName ? actions[matchedName] : null;
		};

		const idleAction = findAction(/idle/i) ?? actions[names[0]];
		const walkAction = findAction(/walk/i) ?? actions[names[1]] ?? idleAction;
		const runAction = findAction(/run/i) ?? walkAction;
		const waveAction = findAction(/wave|greet|hello/i) ?? idleAction;

		let targetAction = idleAction;
		if (animationState === "run") targetAction = runAction;
		else if (animationState === "walk") targetAction = walkAction;
		else if (animationState === "wave") targetAction = waveAction;

		if (targetAction) {
			targetAction.reset().fadeIn(0.2).play();
			return () => {
				targetAction?.fadeOut(0.2);
			};
		}
	}, [actions, names, animationState]);

	useEffect(() => {
		scene.traverse((child) => {
			if ((child as Mesh).isMesh) {
				child.castShadow = true;
				child.receiveShadow = true;
			}
		});
	}, [scene]);

	return (
		<group ref={group}>
			<primitive object={scene} scale={1.0} position={[0, 0, 0]} />
		</group>
	);
}

export function AvatarModel({
	animationState,
	speed,
	modelUrl,
}: AvatarModelProps) {
	const [hasCustomModel, setHasCustomModel] = useState(false);

	useEffect(() => {
		if (!modelUrl) return;
		let isCancelled = false;
		fetch(modelUrl, { method: "HEAD" })
			.then((res) => {
				if (!isCancelled && res.ok) {
					setHasCustomModel(true);
				}
			})
			.catch(() => {
				setHasCustomModel(false);
			});
		return () => {
			isCancelled = true;
		};
	}, [modelUrl]);

	if (hasCustomModel && modelUrl) {
		return <GLTFAvatar url={modelUrl} animationState={animationState} speed={speed} />;
	}

	return <ProceduralStylizedAvatar animationState={animationState} speed={speed} />;
}
