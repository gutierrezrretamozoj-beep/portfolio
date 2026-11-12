import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { Component, type MutableRefObject, type ReactNode, Suspense, useEffect, useMemo, useRef } from "react";
import { type AnimationClip, Box3, type Group, Mesh, type Object3D, Vector3 } from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { getModelUrl, MODEL_SPECS, type ModelSlotId } from "@/data/models-manifest";

interface ModelBoundaryProps {
	fallback: ReactNode;
	children: ReactNode;
}

interface ModelBoundaryState {
	hasError: boolean;
}

export class ModelErrorBoundary extends Component<ModelBoundaryProps, ModelBoundaryState> {
	override state: ModelBoundaryState = { hasError: false };

	static getDerivedStateFromError(): ModelBoundaryState {
		return { hasError: true };
	}

	override componentDidCatch() {
		// Fallback silently renders the procedural geometry if a GLB fails to decode.
	}

	override render() {
		if (this.state.hasError) return this.props.fallback;
		return this.props.children;
	}
}

interface NormalizedModelResult {
	scene: Object3D;
	scaleFactor: number;
	offset: [number, number, number];
}

function normalizeModelInstance(
	source: Object3D,
	targetHeight: number,
	alignBottom: boolean,
	castShadow: boolean,
	receiveShadow: boolean,
	useSkeletonClone: boolean,
): NormalizedModelResult {
	const root = useSkeletonClone ? cloneSkeleton(source) : source.clone(true);
	root.traverse((obj) => {
		if (obj instanceof Mesh) {
			obj.castShadow = castShadow;
			obj.receiveShadow = receiveShadow;
		}
	});

	root.updateMatrixWorld(true);
	const box = new Box3().setFromObject(root);
	const size = new Vector3();
	const center = new Vector3();
	box.getSize(size);
	box.getCenter(center);

	const maxHeight = Math.max(size.y, 0.001);
	const scaleFactor = targetHeight / maxHeight;
	const offsetX = -center.x * scaleFactor;
	const offsetY = alignBottom ? -box.min.y * scaleFactor : -center.y * scaleFactor;
	const offsetZ = -center.z * scaleFactor;

	return {
		scene: root,
		scaleFactor,
		offset: [offsetX, offsetY, offsetZ],
	};
}

function resolveAnimationClip(
	clips: AnimationClip[],
	requestedState: string,
	aliasMap?: Record<string, string[]>,
): string | null {
	if (clips.length === 0) return null;
	const candidates = aliasMap?.[requestedState] ?? [requestedState];

	for (const alias of candidates) {
		const lower = alias.toLowerCase();
		const exact = clips.find((c) => c.name.toLowerCase() === lower);
		if (exact) return exact.name;
	}

	for (const alias of candidates) {
		const lower = alias.toLowerCase();
		const partial = clips.find((c) => c.name.toLowerCase().includes(lower));
		if (partial) return partial.name;
	}

	return clips[0].name;
}

export interface GLBAssetProps {
	slot: ModelSlotId;
	position?: [number, number, number];
	rotation?: [number, number, number];
	scale?: number;
	animationState?: string;
	speedRef?: MutableRefObject<number>;
	targetHeight?: number;
	alignBottom?: boolean;
	castShadow?: boolean;
	receiveShadow?: boolean;
	fallback: ReactNode;
}

function resolveScaleTuple(scale: number, multiplier?: [number, number, number]): [number, number, number] {
	if (!multiplier) return [scale, scale, scale];
	return [scale * multiplier[0], scale * multiplier[1], scale * multiplier[2]];
}

function AnimatedGLBInner({
	slot,
	url,
	position,
	rotation,
	scale = 1,
	animationState = "idle",
	speedRef,
	targetHeight,
	alignBottom,
	castShadow = true,
	receiveShadow = true,
}: Omit<GLBAssetProps, "fallback"> & { url: string }) {
	const spec = MODEL_SPECS[slot];
	const resolvedHeight = targetHeight ?? spec.targetHeight;
	const resolvedAlignBottom = alignBottom ?? spec.alignBottom;
	const groupRef = useRef<Group>(null);
	const gltf = useGLTF(url);

	const normalized = useMemo(
		() =>
			normalizeModelInstance(
				gltf.scene,
				resolvedHeight,
				resolvedAlignBottom,
				castShadow,
				receiveShadow,
				true,
			),
		[gltf.scene, resolvedHeight, resolvedAlignBottom, castShadow, receiveShadow],
	);

	const { actions } = useAnimations(gltf.animations, groupRef);
	const activeClip = useMemo(
		() => resolveAnimationClip(gltf.animations, animationState, spec.clips),
		[gltf.animations, animationState, spec.clips],
	);

	useEffect(() => {
		if (!activeClip) return;
		const action = actions[activeClip];
		if (!action) return;

		action.reset().fadeIn(0.22).play();
		return () => {
			action.fadeOut(0.22);
		};
	}, [actions, activeClip]);

	useFrame(() => {
		if (!activeClip || !speedRef) return;
		const action = actions[activeClip];
		if (!action) return;
		const speed = speedRef.current;
		if (animationState === "walk" || animationState === "run" || animationState === "swim") {
			action.timeScale = Math.max(0.55, Math.min(2.2, speed > 0.1 ? 0.8 + speed * 0.2 : 1));
		} else {
			action.timeScale = 1;
		}
	});

	const yRot = (rotation?.[1] ?? 0) + (spec.rotationYOffset ?? 0);
	const resolvedScale = resolveScaleTuple(scale, spec.scaleMultiplier);

	return (
		<group
			ref={groupRef}
			position={position}
			rotation={[rotation?.[0] ?? 0, yRot, rotation?.[2] ?? 0]}
			scale={resolvedScale}
		>
			<group position={normalized.offset} scale={normalized.scaleFactor}>
				<primitive object={normalized.scene} />
			</group>
		</group>
	);
}

function StaticGLBInner({
	slot,
	url,
	position,
	rotation,
	scale = 1,
	targetHeight,
	alignBottom,
	castShadow = true,
	receiveShadow = true,
}: Omit<GLBAssetProps, "fallback" | "animationState" | "speedRef"> & { url: string }) {
	const spec = MODEL_SPECS[slot];
	const resolvedHeight = targetHeight ?? spec.targetHeight;
	const resolvedAlignBottom = alignBottom ?? spec.alignBottom;
	const gltf = useGLTF(url);

	const normalized = useMemo(
		() =>
			normalizeModelInstance(
				gltf.scene,
				resolvedHeight,
				resolvedAlignBottom,
				castShadow,
				receiveShadow,
				false,
			),
		[gltf.scene, resolvedHeight, resolvedAlignBottom, castShadow, receiveShadow],
	);

	const yRot = (rotation?.[1] ?? 0) + (spec.rotationYOffset ?? 0);
	const resolvedScale = resolveScaleTuple(scale, spec.scaleMultiplier);

	return (
		<group
			position={position}
			rotation={[rotation?.[0] ?? 0, yRot, rotation?.[2] ?? 0]}
			scale={resolvedScale}
		>
			<group position={normalized.offset} scale={normalized.scaleFactor}>
				<primitive object={normalized.scene} />
			</group>
		</group>
	);
}

export function GLBOrFallback({ fallback, ...rest }: GLBAssetProps) {
	const url = getModelUrl(rest.slot);
	if (!url) return <>{fallback}</>;

	const spec = MODEL_SPECS[rest.slot];

	return (
		<ModelErrorBoundary fallback={fallback}>
			<Suspense fallback={fallback}>
				{spec.animated ? (
					<AnimatedGLBInner {...rest} url={url} />
				) : (
					<StaticGLBInner {...rest} url={url} />
				)}
			</Suspense>
		</ModelErrorBoundary>
	);
}
