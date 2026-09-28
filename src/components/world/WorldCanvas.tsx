"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { PCFShadowMap } from "three";
import { PlayerController } from "@/components/player/PlayerController";
import { Environment } from "@/components/world/Environment";
import { Landmarks } from "@/components/world/Landmarks";
import { River } from "@/components/world/River";
import { Terrain } from "@/components/world/Terrain";
import { Vegetation, worldColliders } from "@/components/world/Vegetation";
import { AnimalManager } from "@/components/world/AnimalManager";
import { worldPoints } from "@/data/world";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";

type WorldCanvasProps = {
	inputRef: { current: WorldInput };
	playerRef: { current: PlayerRuntime };
	quality: "LOW" | "MEDIUM" | "HIGH";
	target: WorldPoint | null;
	onReady: () => void;
	onNearbyChange: (pointId: string | null) => void;
	onPosition: (position: PlayerRuntime["position"]) => void;
	onArrived: (pointId: string) => void;
	onActivate: (pointId: string) => void;
};

export default function WorldCanvas({ inputRef, playerRef, quality, target, onReady, onNearbyChange, onPosition, onArrived, onActivate }: WorldCanvasProps) {
	const isLow = quality === "LOW";
	return (
		<Canvas
			className="world-renderer"
			camera={{ position: [0, 4.5, 25.2], fov: 52, near: 0.25, far: 140 }}
			dpr={isLow ? [0.7, 0.85] : quality === "MEDIUM" ? [0.85, 1.15] : [1, 1.5]}
			shadows={quality === "HIGH" ? "percentage" : false}
			gl={{ antialias: quality !== "LOW", alpha: false, powerPreference: "high-performance" }}
			onCreated={({ gl }) => {
				gl.setClearColor("#ccecf8", 1);
				gl.shadowMap.type = PCFShadowMap;
				onReady();
			}}
			fallback={<div className="webgl-fallback">WebGL is unavailable. Use the world menu to read David&apos;s profile and projects.</div>}
		>
			<Suspense fallback={null}>
				<Environment />
				<Terrain quality={quality} playerRef={playerRef} />
				<River />
				<Vegetation quality={quality} onActivate={onActivate} />
				<AnimalManager playerRef={playerRef} quality={quality} />
				<Landmarks onActivate={onActivate} />
				<PlayerController
					inputRef={inputRef}
					playerRef={playerRef}
					points={worldPoints}
					colliders={worldColliders}
					target={target}
					onNearbyChange={onNearbyChange}
					onPosition={onPosition}
					onArrived={onArrived}
				/>
			</Suspense>
		</Canvas>
	);
}
