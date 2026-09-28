"use client";

import { X } from "lucide-react";
import { worldPoints } from "@/data/world";
import type { PlayerRuntime, WorldPoint } from "@/types/world";

type WorldMapProps = {
	player: PlayerRuntime["position"];
	onClose: () => void;
	onNavigate: (pointId: string) => void;
};

export function WorldMap({ player, onClose, onNavigate }: WorldMapProps) {
	const visiblePoints = worldPoints.filter((point) => !point.id.startsWith("human-") && !point.id.startsWith("interest-") && point.id !== "easter-egg");
	return (
		<aside className="world-map-panel" role="dialog" aria-modal="true" aria-labelledby="map-title" data-world-ui>
			<header><div><span>FIELD MAP</span><h2 id="map-title">David&apos;s world</h2></div><button className="world-icon-button" type="button" onClick={onClose} aria-label="Close map"><X size={18} /></button></header>
			<div className="mini-map" aria-label="Map of explorable locations">
				<div className="mini-map-river" aria-hidden="true" />
				<div className="mini-map-path" aria-hidden="true" />
				{visiblePoints.map((point) => (
					<button
						key={point.id}
						className="mini-map-point"
						style={{ left: `${((point.position[0] + 29) / 58) * 100}%`, top: `${((point.position[2] + 42) / 72) * 100}%` }}
						aria-label={`Travel to ${point.name}`}
						title={point.name}
						onClick={() => onNavigate(point.id)}
					/>
				))}
				<span className="mini-map-player" style={{ left: `${((player.x + 29) / 58) * 100}%`, top: `${((player.z + 42) / 72) * 100}%` }} aria-label="Your position" />
			</div>
			<p className="map-legend"><span className="legend-player" />YOU <span className="legend-place" />PLACES</p>
		</aside>
	);
}

export function getWorldPoint(id: string | null): WorldPoint | null {
	if (!id) return null;
	return worldPoints.find((point) => point.id === id) ?? null;
}