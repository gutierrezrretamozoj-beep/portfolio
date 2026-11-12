"use client";

import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { WorldLoadingScreen } from "@/components/ui/WorldLoadingScreen";
import { worldAudio } from "@/components/world/world-audio";
import { WorldOverlay } from "@/components/ui/WorldOverlay";
import { WorldPanel } from "@/components/ui/WorldPanel";
import { getMenuDestinations, getWorldPoint } from "@/data/world";
import { type Language } from "@/data/i18n";
import { useDevicePerformance } from "@/hooks/useDevicePerformance";
import { buildDynamicRoute, getDestinationInteractionSpot } from "@/components/player/navigation";
import { terrainHeight } from "@/components/world/terrain-utils";
import {
	AUTO_CYCLE_DURATION_SECONDS,
	getStrictNextTimePhase,
	type TimePhase,
} from "@/components/world/time-system";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";

const WorldCanvas = lazy(() => import("@/components/world/WorldCanvas"));

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
	const mapOpenRef = useRef(false);
	const [showControls, setShowControls] = useState(true);
	const [hideUI, setHideUI] = useState(false);
	const [loading, setLoading] = useState(true);
	const [worldFailed, setWorldFailed] = useState(false);
	const [timePhase, setTimePhase] = useState<TimePhase>("dawn");
	const [cycleSeconds, setCycleSeconds] = useState(0);
	const [language, setLanguage] = useState<Language>(() => {
		if (typeof window !== "undefined") {
			const saved = localStorage.getItem("portfolio_lang") as Language | null;
			if (saved === "es" || saved === "en") return saved;
			if (navigator.language.startsWith("es")) return "es";
		}
		return "es";
	});

	const nearbyPoint = getWorldPoint(nearbyId, language);
	const activePoint = getWorldPoint(activePanelId, language);

	const toggleLanguage = useCallback(() => {
		worldAudio.playUiSound("tap");
		setLanguage((prev) => {
			const next = prev === "es" ? "en" : "es";
			if (typeof window !== "undefined") {
				localStorage.setItem("portfolio_lang", next);
			}
			return next;
		});
	}, []);

	const currentPhaseRef = useRef<TimePhase>("dawn");
	useEffect(() => {
		currentPhaseRef.current = timePhase;
	}, [timePhase]);

	useEffect(() => {
		mapOpenRef.current = mapOpen;
	}, [mapOpen]);

	// Strict autonomous sequential cycle: strictly counts 60 seconds per phase
	// and transitions sequentially without skipping any phase:
	// Amanecer -> Mediodía -> Atardecer -> Noche -> Medianoche -> Amanecer
	useEffect(() => {
		let elapsedSeconds = 0;

		const interval = window.setInterval(() => {
			elapsedSeconds += 1;

			if (elapsedSeconds >= AUTO_CYCLE_DURATION_SECONDS) {
				elapsedSeconds = 0;
				const nextPhase = getStrictNextTimePhase(currentPhaseRef.current);
				currentPhaseRef.current = nextPhase;
				setTimePhase(nextPhase);
				setCycleSeconds(0);
				worldAudio.playUiSound("phase");
			} else {
				setCycleSeconds(elapsedSeconds);
			}
		}, 1000);

		return () => {
			window.clearInterval(interval);
		};
	}, []);
	const hideControls = useCallback(() => setShowControls(false), []);
	const clearInput = useCallback(() => {
		inputRef.current.moveX = 0;
		inputRef.current.moveZ = 0;
		inputRef.current.lookX = 0;
		inputRef.current.lookY = 0;
		inputRef.current.sprint = false;
	}, []);

	const onCanvasReady = useCallback(() => {
		setWorldFailed(false);
		setTimeout(() => setLoading(false), 850);
	}, []);

	const activatePoint = useCallback((pointId: string) => {
		worldAudio.playLandmarkChime(pointId);
		setActivePanelId(pointId);
		setTarget(null);
		setMenuOpen(false);
		setMapOpen(false);
		clearInput();
		hideControls();
	}, [clearInput, hideControls]);

	const navigateTo = useCallback((pointId: string) => {
		const point = getWorldPoint(pointId, language);
		if (!point) return;
		clearInput();
		const position = getDestinationInteractionSpot(point);
		const route = buildDynamicRoute(playerRef.current.position, point);
		setTarget({
			...point,
			position,
			route: route.slice(0, -1),
		});
		setActivePanelId(null);
		setMenuOpen(false);
		setMapOpen(false);
		hideControls();
	}, [clearInput, hideControls, language]);

	const onArrived = useCallback((pointId: string) => {
		worldAudio.playLandmarkChime(pointId);
		setActivePanelId(pointId);
		setTarget(null);
	}, []);

	const cancelNavigate = useCallback(() => {
		setTarget(null);
	}, []);

	const handlePositionUpdate = useCallback((nextPos: PlayerRuntime["position"]) => {
		if (mapOpenRef.current) {
			setPlayer(nextPos);
		}
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
		const pressedKeys = new Set<string>();

		function updateMovement() {
			if (target) return;
			const up = pressedKeys.has("w") || pressedKeys.has("arrowup");
			const down = pressedKeys.has("s") || pressedKeys.has("arrowdown");
			const left = pressedKeys.has("a") || pressedKeys.has("arrowleft");
			const right = pressedKeys.has("d") || pressedKeys.has("arrowright");
			inputRef.current.moveZ = (down ? 1 : 0) - (up ? 1 : 0);
			inputRef.current.moveX = (right ? 1 : 0) - (left ? 1 : 0);
			inputRef.current.sprint = pressedKeys.has("shift");
		}

		function handleKeyDown(event: KeyboardEvent) {
			const targetElement = event.target;
			if (targetElement instanceof HTMLElement && (targetElement.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(targetElement.tagName))) return;
			const key = event.key.toLowerCase();
			if (key === "escape") {
				setActivePanelId(null);
				setMenuOpen(false);
				setMapOpen(false);
				setTarget(null);
				pressedKeys.clear();
				clearInput();
				return;
			}
			if (key === "m" && !activePanelId && !menuOpen) {
				const openingMap = !mapOpen;
				setMapOpen(openingMap);
				setMenuOpen(false);
				if (openingMap) {
					setPlayer({ ...playerRef.current.position });
					pressedKeys.clear();
					clearInput();
					setTarget(null);
				}
				return;
			}
			if (key === "h" && !activePanelId && !menuOpen && !mapOpen) {
				setHideUI((prev) => !prev);
				return;
			}
			if (key === "l" && !activePanelId && !menuOpen && !mapOpen) {
				toggleLanguage();
				return;
			}
			if (activePanelId || menuOpen || mapOpen) return;
			if (key === "e" && nearbyId) {
				activatePoint(nearbyId);
				return;
			}
			if (target) return;
			const movementKeys = ["w", "a", "s", "d", "arrowup", "arrowleft", "arrowdown", "arrowright", "shift"];
			if (movementKeys.includes(key)) {
				if (key !== "shift") event.preventDefault();
				hideControls();
				pressedKeys.add(key);
				updateMovement();
			}
		}

		function handleKeyUp(event: KeyboardEvent) {
			const key = event.key.toLowerCase();
			if (pressedKeys.has(key)) {
				pressedKeys.delete(key);
				updateMovement();
			}
		}

		function handleWindowBlur() {
			pressedKeys.clear();
			clearInput();
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "hidden") {
				pressedKeys.clear();
				clearInput();
			}
		}

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);
		window.addEventListener("blur", handleWindowBlur);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
			window.removeEventListener("blur", handleWindowBlur);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [activatePoint, activePanelId, clearInput, hideControls, mapOpen, menuOpen, nearbyId, target, toggleLanguage]);

	function onPointerDown(event: React.PointerEvent<HTMLElement>) {
		if (event.pointerType !== "mouse" || event.button !== 0) return;
		if (event.target instanceof Element && event.target.closest("[data-world-ui]")) return;
		try {
			event.currentTarget.setPointerCapture(event.pointerId);
		} catch {
			// ignore
		}
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
		if (lookDrag.current?.id === event.pointerId) {
			try {
				if (event.currentTarget.hasPointerCapture(event.pointerId)) {
					event.currentTarget.releasePointerCapture(event.pointerId);
				}
			} catch {
				// ignore
			}
			lookDrag.current = null;
		}
	}

	function toggleMenu() {
		const openingMenu = !menuOpen;
		setMenuOpen(openingMenu);
		setMapOpen(false);
		if (openingMenu) {
			clearInput();
			setTarget(null);
		}
	}

	function toggleMap() {
		const openingMap = !mapOpen;
		setMapOpen(openingMap);
		setMenuOpen(false);
		if (openingMap) {
			setPlayer({ ...playerRef.current.position });
			clearInput();
		}
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
			onWheel={(event) => {
				inputRef.current.zoom = (inputRef.current.zoom || 0) + event.deltaY * 0.0012;
			}}
		>
			<Suspense fallback={null}>
				{!worldFailed && <WorldCanvas
					inputRef={inputRef}
					playerRef={playerRef}
					quality={quality}
					target={target}
					interacting={Boolean(activePanelId)}
					timePhase={timePhase}
					cycleSeconds={cycleSeconds}
					language={language}
					onReady={onCanvasReady}
					onNearbyChange={setNearbyId}
					onPosition={handlePositionUpdate}
					onArrived={onArrived}
					onCancelNavigate={cancelNavigate}
					onActivate={activatePoint}
				/>}
			</Suspense>
			{!hideUI && (
				<WorldOverlay
					inputRef={inputRef}
					player={player}
					nearbyPoint={nearbyPoint}
					menuOpen={menuOpen}
					mapOpen={mapOpen}
					controlsDisabled={Boolean(menuOpen || mapOpen || activePanelId || worldFailed)}
					showControls={showControls}
					timePhase={timePhase}
					cycleSeconds={cycleSeconds}
					language={language}
					activeTarget={target}
					onExplore={openNearby}
					onToggleMenu={toggleMenu}
					onToggleMap={toggleMap}
					onToggleLanguage={toggleLanguage}
					onNavigate={navigateTo}
					onCancelNavigate={cancelNavigate}
					canExplore={Boolean(nearbyPoint)}
				/>
			)}
			{activePoint && <WorldPanel point={activePoint} language={language} onClose={() => { worldAudio.playUiSound("close"); setActivePanelId(null); }} />}
			{worldFailed && !activePoint && <div className="world-failure" role="alert"><div><span className="eyebrow">A softer route</span><h1>This world needs WebGL.</h1><p>Explore David&apos;s story and work without the 3D scene.</p><nav aria-label="Accessible portfolio sections">{getMenuDestinations(language).map((destination) => <button key={destination.pointId} type="button" onClick={() => activatePoint(destination.pointId)}>{destination.label}</button>)}</nav></div></div>}
			<WorldLoadingScreen hidden={!loading} />
		</main>
	);
}
