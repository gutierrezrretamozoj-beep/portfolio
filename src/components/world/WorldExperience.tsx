"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { getWorldPoint } from "@/components/ui/WorldMap";
import { WorldLoadingScreen } from "@/components/ui/WorldLoadingScreen";
import { WorldOverlay } from "@/components/ui/WorldOverlay";
import { WorldPanel } from "@/components/ui/WorldPanel";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { terrainHeight } from "@/components/world/terrain-utils";
import { menuDestinations, worldPoints } from "@/data/world";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";

const WorldCanvas = dynamic(() => import("@/components/world/WorldCanvas"), { ssr: false });

const initialPlayer: PlayerRuntime = {
	position: { x: 0, y: terrainHeight(0, 20), z: 20 },
	yaw: 0,
};

export function WorldExperience() {
	const quality = useDevicePerformance();
	const inputRef = useRef<WorldInput>({ moveX: 0, moveZ: 0, lookX: 0, lookY: 0 });
	const playerRef = useRef<PlayerRuntime>(initialPlayer);
	const lookDrag = useRef<{ id: number; x: number; y: number } | null>(null);
	const [player, setPlayer] = useState(initialPlayer.position);
	const [nearbyId, setNearbyId] = useState<string | null>("start");
	const [activePanelId, setActivePanelId] = useState<string | null>(null);
	const [target, setTarget] = useState<WorldPoint | null>(null);
	const [menuOpen, setMenuOpen] = useState(false);
	const [mapOpen, setMapOpen] = useState(false);
	const [showControls, setShowControls] = useState(true);
	const [loading, setLoading] = useState(true);
	const [worldFailed, setWorldFailed] = useState(false);

	const nearbyPoint = getWorldPoint(nearbyId);
	const activePoint = getWorldPoint(activePanelId);

	const hideControls = useCallback(() => setShowControls(false), []);

	const onCanvasReady = useCallback(() => {
		setWorldFailed(false);
		setTimeout(() => setLoading(false), 850);
	}, []);

	const activatePoint = useCallback((pointId: string) => {
		setActivePanelId(pointId);
		setTarget(null);
		setMenuOpen(false);
		setMapOpen(false);
		inputRef.current.moveX = 0;
		inputRef.current.moveZ = 0;
		hideControls();
	}, [hideControls]);

	const navigateTo = useCallback((pointId: string) => {
		const point = worldPoints.find((item) => item.id === pointId);
		if (!point) return;
		setTarget(point);
		setActivePanelId(null);
		setMenuOpen(false);
		setMapOpen(false);
		hideControls();
	}, [hideControls]);

	const onArrived = useCallback((pointId: string) => {
		setActivePanelId(pointId);
		setTarget(null);
	}, []);

	const openNearby = useCallback(() => {
		if (nearbyId) activatePoint(nearbyId);
	}, [activatePoint, nearbyId]);

	useEffect(() => {
		const controlsTimer = window.setTimeout(hideControls, 7200);
		const webglTimer = window.setTimeout(() => {
			if (loading) {
				setWorldFailed(true);
				setLoading(false);
			}
		}, 12000);
		return () => {
			window.clearTimeout(controlsTimer);
			window.clearTimeout(webglTimer);
		};
	}, [hideControls, loading]);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const targetElement = event.target;
			if (targetElement instanceof HTMLElement && (targetElement.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(targetElement.tagName))) return;
			const key = event.key.toLowerCase();
			if (key === "escape") {
				setActivePanelId(null);
				setMenuOpen(false);
				setMapOpen(false);
				setTarget(null);
				inputRef.current.moveX = 0;
				inputRef.current.moveZ = 0;
				return;
			}
			if (key === "m") {
				setMapOpen((open) => !open);
				setMenuOpen(false);
				return;
			}
			if (key === "e" && nearbyId) {
				activatePoint(nearbyId);
				return;
			}
			if (activePanelId || menuOpen || mapOpen || target) return;
			const movementKeys = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright"];
			if (movementKeys.includes(key)) {
				event.preventDefault();
				hideControls();
			}
			if (key === "w" || key === "arrowup") inputRef.current.moveZ = -1;
			if (key === "s" || key === "arrowdown") inputRef.current.moveZ = 1;
			if (key === "a" || key === "arrowleft") inputRef.current.moveX = -1;
			if (key === "d" || key === "arrowright") inputRef.current.moveX = 1;
		}

		function handleKeyUp(event: KeyboardEvent) {
			const key = event.key.toLowerCase();
			if (["w", "s", "arrowup", "arrowdown"].includes(key)) inputRef.current.moveZ = 0;
			if (["a", "d", "arrowleft", "arrowright"].includes(key)) inputRef.current.moveX = 0;
		}

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [activatePoint, activePanelId, hideControls, mapOpen, menuOpen, nearbyId, target]);

	function onPointerDown(event: React.PointerEvent<HTMLElement>) {
		if (event.pointerType !== "mouse" || event.button !== 0) return;
		if (event.target instanceof HTMLElement && event.target.closest("[data-world-ui]")) return;
		lookDrag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
		hideControls();
	}

	function onPointerMove(event: React.PointerEvent<HTMLElement>) {
		const drag = lookDrag.current;
		if (!drag || drag.id !== event.pointerId) return;
		inputRef.current.lookX += event.clientX - drag.x;
		inputRef.current.lookY += event.clientY - drag.y;
		drag.x = event.clientX;
		drag.y = event.clientY;
	}

	function stopLook(event: React.PointerEvent<HTMLElement>) {
		if (lookDrag.current?.id === event.pointerId) lookDrag.current = null;
	}

	function toggleMenu() {
		setMenuOpen((open) => !open);
		setMapOpen(false);
	}

	function toggleMap() {
		setMapOpen((open) => !open);
		setMenuOpen(false);
	}

	return (
		<main
			id="main-world"
			className={`world-experience quality-${quality.toLowerCase()}`}
			tabIndex={0}
			aria-label="David's explorable portfolio world"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={stopLook}
			onPointerCancel={stopLook}
		>
			<WorldCanvas
				inputRef={inputRef}
				playerRef={playerRef}
				quality={quality}
				target={target}
				onReady={onCanvasReady}
				onNearbyChange={setNearbyId}
				onPosition={setPlayer}
				onArrived={onArrived}
				onActivate={activatePoint}
			/>
			<WorldOverlay
				inputRef={inputRef}
				player={player}
				nearbyPoint={nearbyPoint}
				menuOpen={menuOpen}
				mapOpen={mapOpen}
				showControls={showControls}
				onExplore={openNearby}
				onToggleMenu={toggleMenu}
				onToggleMap={toggleMap}
				onNavigate={navigateTo}
				canExplore={Boolean(nearbyPoint)}
			/>
			{activePoint && <WorldPanel point={activePoint} onClose={() => setActivePanelId(null)} />}
			{worldFailed && <div className="world-failure" role="alert"><div><span className="eyebrow">A softer route</span><h1>This world needs WebGL.</h1><p>Explore David&apos;s story and work without the 3D scene.</p><nav aria-label="Accessible portfolio sections">{menuDestinations.map((destination) => <button key={destination.pointId} type="button" onClick={() => activatePoint(destination.pointId)}>{destination.label}</button>)}</nav></div></div>}
			<WorldLoadingScreen hidden={!loading} />
		</main>
	);
}