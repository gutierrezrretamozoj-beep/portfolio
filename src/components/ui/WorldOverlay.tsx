"use client";

import { Compass, Map, Menu, X } from "lucide-react";
import { menuDestinations, worldPoints } from "@/data/world";
import { profile } from "@/data/profile";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";
import { MobileControls } from "@/components/player/MobileControls";
import { WorldMap } from "@/components/ui/WorldMap";
import { AmbientSoundToggle } from "@/components/ui/AmbientSoundToggle";

type WorldOverlayProps = {
	inputRef: { current: WorldInput };
	player: PlayerRuntime["position"];
	nearbyPoint: WorldPoint | null;
	menuOpen: boolean;
	mapOpen: boolean;
	showControls: boolean;
	onExplore: () => void;
	onToggleMenu: () => void;
	onToggleMap: () => void;
	onNavigate: (pointId: string) => void;
	canExplore: boolean;
};

export function WorldOverlay({ inputRef, player, nearbyPoint, menuOpen, mapOpen, showControls, onExplore, onToggleMenu, onToggleMap, onNavigate, canExplore }: WorldOverlayProps) {
	return (
		<div className="world-overlay">
			<header className="world-hud-top">
				<a className="world-brand" href="#main-world" aria-label="David's World, start" data-world-ui>
					<span className="world-brand-mark" aria-hidden="true"><Compass size={17} /></span>
					<span><strong>DAVID&apos;S WORLD</strong><small>{profile.fullName} · A WORLD IN PROGRESS</small></span>
				</a>
				<div className="world-hud-actions" data-world-ui>
					<AmbientSoundToggle />
					<button className={`world-hud-button${mapOpen ? " is-active" : ""}`} type="button" onClick={onToggleMap} aria-label={mapOpen ? "Close map" : "Open map"} aria-expanded={mapOpen}>
						<Map size={17} /><span>MAP</span><kbd>M</kbd>
					</button>
					<button className={`world-hud-button${menuOpen ? " is-active" : ""}`} type="button" onClick={onToggleMenu} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
						{menuOpen ? <X size={17} /> : <Menu size={17} />}<span>MENU</span>
					</button>
				</div>
			</header>

			{menuOpen && <aside className="world-menu-panel" role="dialog" aria-modal="true" aria-labelledby="world-menu-title" data-world-ui>
				<header><div><span>TRAVEL TO</span><h2 id="world-menu-title">Choose a place</h2></div><button className="world-icon-button" type="button" onClick={onToggleMenu} aria-label="Close menu"><X size={18} /></button></header>
				<nav aria-label="World locations">
					{menuDestinations.map((destination, index) => {
						const point = worldPoints.find((item) => item.id === destination.pointId);
						return <button key={destination.pointId} type="button" onClick={() => onNavigate(destination.pointId)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{destination.label}</strong><span aria-hidden="true">↗</span>{point && <small>{point.label}</small>}</button>;
					})}
				</nav>
				<p>Or follow the trail and find each place yourself.</p>
			</aside>}

			{mapOpen && <WorldMap player={player} onClose={onToggleMap} onNavigate={onNavigate} />}

			<div className="world-compass" aria-hidden="true"><span>N</span><i /></div>

			{showControls && <div className="world-control-hint" aria-live="polite">
				<div><strong>W</strong><span><b>A</b><b>S</b><b>D</b><small>MOVE</small></span></div>
				<span className="hint-divider" />
				<div><span className="mouse-symbol" /><span><strong>MOUSE</strong><small>DRAG TO LOOK</small></span></div>
				<span className="hint-key">E <small>EXPLORE</small></span>
			</div>}

			{nearbyPoint && <div className="world-nearby" aria-live="polite">
				<span className="nearby-pulse" />
				<div><small>{nearbyPoint.label}</small><strong>{nearbyPoint.name}</strong></div>
				<button type="button" onClick={onExplore} data-world-ui><kbd>E</kbd><span>EXPLORE</span></button>
			</div>}

			<MobileControls inputRef={inputRef} onExplore={onExplore} canExplore={canExplore} />
			<p className="world-world-note">{profile.headline}</p>
		</div>
	);
}