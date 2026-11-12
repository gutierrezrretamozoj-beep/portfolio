"use client";

import { Compass, Languages, Map, Menu, X } from "lucide-react";
import { getMenuDestinations, getWorldPoints } from "@/data/world";
import { profile } from "@/data/profile";
import type { PlayerRuntime, WorldInput, WorldPoint } from "@/types/world";
import { MobileControls } from "@/components/player/MobileControls";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { WorldMap } from "@/components/ui/WorldMap";
import { AmbientSoundToggle } from "@/components/ui/AmbientSoundToggle";
import { TimeOfDayControl } from "@/components/ui/TimeOfDayControl";
import { type Language, i18nProfile, i18nUI } from "@/data/i18n";
import type { TimePhase } from "@/components/world/time-system";

type WorldOverlayProps = {
	inputRef: { current: WorldInput };
	player: PlayerRuntime["position"];
	nearbyPoint: WorldPoint | null;
	menuOpen: boolean;
	mapOpen: boolean;
	controlsDisabled: boolean;
	showControls: boolean;
	timePhase: TimePhase;
	cycleSeconds: number;
	language: Language;
	activeTarget?: WorldPoint | null;
	onExplore: () => void;
	onToggleMenu: () => void;
	onToggleMap: () => void;
	onCyclePhase?: () => void;
	onToggleLanguage: () => void;
	onNavigate: (pointId: string) => void;
	onCancelNavigate?: () => void;
	canExplore: boolean;
};

export function WorldOverlay({
	inputRef,
	player,
	nearbyPoint,
	menuOpen,
	mapOpen,
	controlsDisabled,
	showControls,
	timePhase,
	cycleSeconds,
	language = "es",
	activeTarget,
	onExplore,
	onToggleMenu,
	onToggleMap,
	onCyclePhase,
	onToggleLanguage,
	onNavigate,
	onCancelNavigate,
	canExplore,
}: WorldOverlayProps) {
	const menuRef = useDialogFocus<HTMLElement>(menuOpen);
	const ui = i18nUI[language];
	const prof = i18nProfile[language];
	const destinations = getMenuDestinations(language);
	const allPoints = getWorldPoints(language);

	return (
		<div className="world-overlay">
			<header className="world-hud-top">
				<a className="world-brand" href="#main-world" aria-label="David's World, start" data-world-ui>
					<span className="world-brand-mark" aria-hidden="true"><Compass size={17} /></span>
					<span><strong>DAVID&apos;S WORLD</strong><small>{profile.fullName} · {prof.subbrand}</small></span>
				</a>
				<div className="world-hud-actions" data-world-ui>
					<TimeOfDayControl
						currentPhase={timePhase}
						cycleSeconds={cycleSeconds}
						language={language}
						onCyclePhase={onCyclePhase}
					/>
					<button
						className="world-hud-button world-lang-button"
						type="button"
						onClick={onToggleLanguage}
						aria-label={ui.switchLang}
						title={`${ui.switchLang} (L)`}
					>
						<Languages size={15} />
						<span className="lang-code-tag">{language.toUpperCase()}</span>
						<kbd title="Presiona L para cambiar de idioma">L</kbd>
					</button>
					<AmbientSoundToggle />
					<button className={`world-hud-button${mapOpen ? " is-active" : ""}`} type="button" onClick={onToggleMap} aria-label={mapOpen ? "Close map" : "Open map"} aria-expanded={mapOpen}>
						<Map size={17} /><span>{ui.map}</span><kbd>M</kbd>
					</button>
					<button className={`world-hud-button${menuOpen ? " is-active" : ""}`} type="button" onClick={onToggleMenu} aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen}>
						{menuOpen ? <X size={17} /> : <Menu size={17} />}<span>{ui.menu}</span>
					</button>
				</div>
			</header>

			{menuOpen && <aside ref={menuRef} tabIndex={-1} className="world-menu-panel" role="dialog" aria-modal="true" aria-labelledby="world-menu-title" data-world-ui>
				<header><div><span>{ui.travelTo}</span><h2 id="world-menu-title">{ui.choosePlace}</h2></div><button className="world-icon-button" type="button" onClick={onToggleMenu} aria-label="Close menu"><X size={18} /></button></header>
				<nav aria-label="World locations">
					{destinations.map((destination, index) => {
						const point = allPoints.find((item) => item.id === destination.pointId);
						return <button key={destination.pointId} type="button" onClick={() => onNavigate(destination.pointId)}><span>{String(index + 1).padStart(2, "0")}</span><strong>{destination.label}</strong><span aria-hidden="true">↗</span>{point && <small>{point.label}</small>}</button>;
					})}
				</nav>
				<p>{language === "es" ? "O sigue el sendero y explora cada estación por tu cuenta." : "Or follow the trail and find each place yourself."}</p>
			</aside>}

			{mapOpen && (
				<WorldMap
					player={player}
					activeTarget={activeTarget}
					language={language}
					onClose={onToggleMap}
					onNavigate={onNavigate}
					onCancelNavigate={onCancelNavigate}
				/>
			)}

			<div className="world-compass" aria-hidden="true"><span>N</span><i /></div>

			{showControls && !controlsDisabled && <div className="world-control-hint" aria-live="polite">
				<div><strong>W</strong><span><b>A</b><b>S</b><b>D</b><small>{language === "es" ? "MOVER" : "MOVE"}</small></span></div>
				<span className="hint-divider" />
				<div><span className="mouse-symbol" /><span><strong>{language === "es" ? "RATÓN" : "MOUSE"}</strong><small>{language === "es" ? "ARRASTRAR" : "DRAG TO LOOK"}</small></span></div>
				<span className="hint-key">E <small>{ui.explore}</small></span>
			</div>}

			{nearbyPoint && !controlsDisabled && <div className="world-nearby" aria-live="polite">
				<span className="nearby-pulse" />
				<div><small>{nearbyPoint.label}</small><strong>{nearbyPoint.name}</strong></div>
				<button type="button" onClick={onExplore} data-world-ui><kbd>E</kbd><span>{ui.explore}</span></button>
			</div>}

			{!controlsDisabled && <MobileControls inputRef={inputRef} onExplore={onExplore} canExplore={canExplore} disabled={false} />}
			<p className="world-world-note" lang={language}>{prof.headline}</p>
		</div>
	);
}