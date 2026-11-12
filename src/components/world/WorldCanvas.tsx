"use client";

import { Canvas } from "@react-three/fiber";
import { memo, Suspense, useMemo } from "react";
import { PCFShadowMap } from "three";
import { PlayerController } from "@/components/player/PlayerController";
import { Environment } from "@/components/world/Environment";
import { Landmarks } from "@/components/world/Landmarks";
import { StreetLamps } from "@/components/world/StreetLamps";
import { River } from "@/components/world/River";
import { Terrain } from "@/components/world/Terrain";
import { Vegetation } from "@/components/world/Vegetation";
import { worldColliders } from "@/components/world/world-colliders";
import { AnimalManager } from "@/components/world/AnimalManager";
import { NavigationTrail } from "@/components/world/NavigationTrail";
import { PerimeterFence } from "@/components/world/PerimeterFence";
import { getWorldPoints } from "@/data/world";
import type { Language } from "@/data/i18n";
import type { TimePhase } from "@/components/world/time-system";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";

type WorldCanvasProps = {
	inputRef: { current: WorldInput };
	playerRef: { current: PlayerRuntime };
	quality: "LOW" | "MEDIUM" | "HIGH";
	target: WorldPoint | null;
	interacting: boolean;
	timePhase?: TimePhase;
	cycleSeconds?: number;
	isNight?: boolean;
	language?: Language;
	onReady: () => void;
	onNearbyChange: (pointId: string | null) => void;
	onPosition: (position: PlayerRuntime["position"]) => void;
	onArrived: (pointId: string) => void;
	onCancelNavigate?: () => void;
	onActivate: (pointId: string) => void;
};

function WorldCanvas({ inputRef, playerRef, quality, target, interacting, timePhase = "day", cycleSeconds = 0, isNight = false, language = "es", onReady, onNearbyChange, onPosition, onArrived, onCancelNavigate, onActivate }: WorldCanvasProps) {
	const isLow = quality === "LOW";
	const effectiveNight = timePhase === "night" || timePhase === "midnight" || timePhase === "sunset" || isNight;
	const currentPoints = useMemo(() => getWorldPoints(language), [language]);
	return (
		<Canvas
			className="world-renderer"
			camera={{ position: [0, 3.2, 25.4], fov: 60, near: 0.25, far: 320 }}
			dpr={isLow ? [0.8, 1.0] : quality === "MEDIUM" ? [1.0, 1.25] : [1.0, 1.35]}
			shadows={quality === "HIGH" ? "percentage" : false}
			gl={{ antialias: quality !== "LOW", alpha: false, powerPreference: "high-performance" }}
			onCreated={({ gl }) => {
				gl.shadowMap.type = PCFShadowMap;
				gl.setClearColor(effectiveNight ? "#090e1a" : "#ccecf8", 1);
				onReady();
			}}
			fallback={<div className="webgl-fallback">WebGL is unavailable. Use the world menu to read David&apos;s profile and projects.</div>}
		>
			<Suspense fallback={null}>
				<Environment timePhase={timePhase} cycleSeconds={cycleSeconds} isNight={effectiveNight} />
				<Terrain quality={quality} playerRef={playerRef} />
				<River />
				<PerimeterFence isNight={effectiveNight} />
				<Vegetation quality={quality} onActivate={onActivate} />
				<AnimalManager playerRef={playerRef} quality={quality} colliders={worldColliders} />
				<Landmarks onActivate={onActivate} isNight={effectiveNight} language={language} />
				<StreetLamps isNight={effectiveNight} />
				<NavigationTrail target={target} playerRef={playerRef} />
				<PlayerController
					inputRef={inputRef}
					playerRef={playerRef}
					points={currentPoints}
					colliders={worldColliders}
					target={target}
					interacting={interacting}
					timePhase={timePhase}
					onNearbyChange={onNearbyChange}
					onPosition={onPosition}
					onArrived={onArrived}
					onCancelNavigate={onCancelNavigate}
				/>
			</Suspense>
		</Canvas>
	);
}

export default memo(WorldCanvas);
