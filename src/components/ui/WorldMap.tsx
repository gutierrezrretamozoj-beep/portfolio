"use client";

import { useEffect, useMemo, useState } from "react";
import {
	Anchor,
	BookOpen,
	CheckCircle2,
	Compass,
	Cpu,
	FolderGit2,
	Heart,
	Navigation2,
	Route as RouteIcon,
	Sparkles,
	User,
	X,
} from "lucide-react";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { buildDynamicRoute, getDestinationInteractionSpot } from "@/components/player/navigation";
import { paths } from "@/components/world/terrain-utils";
import { getWorldPoints } from "@/data/world";
import type { Language } from "@/data/i18n";
import type { PlayerRuntime, WorldPoint } from "@/types/world";

type WorldMapProps = {
	player: PlayerRuntime["position"];
	activeTarget?: WorldPoint | null;
	language?: Language;
	onClose: () => void;
	onNavigate: (pointId: string) => void;
	onCancelNavigate?: () => void;
};

// Coordinate mapping: World 3D (X: [-28, 28], Z: [-38, 24]) -> SVG Canvas (560 x 620)
const MAP_WIDTH = 560;
const MAP_HEIGHT = 620;
const MIN_X = -28;
const MAX_X = 28;
const MIN_Z = -38;
const MAX_Z = 24;

function toSvgX(x: number) {
	return ((x - MIN_X) / (MAX_X - MIN_X)) * MAP_WIDTH;
}

function toSvgY(z: number) {
	return ((z - MIN_Z) / (MAX_Z - MIN_Z)) * MAP_HEIGHT;
}

export function WorldMap({
	player,
	activeTarget,
	language = "es",
	onClose,
	onNavigate,
	onCancelNavigate,
}: WorldMapProps) {
	const dialogRef = useDialogFocus<HTMLElement>();
	const allPoints = useMemo(() => getWorldPoints(language), [language]);

	// Filter out minor sub-interest or hidden points
	const mapPoints = useMemo(() => {
		return allPoints.filter(
			(p) =>
				!p.id.startsWith("human-") &&
				p.id !== "easter-egg" &&
				(p.id.startsWith("project-") ||
					p.id === "about" ||
					p.id === "dna" ||
					p.id === "journey" ||
					p.id === "garden" ||
					p.id === "skills" ||
					p.id === "riwi" ||
					p.id === "contact")
		);
	}, [allPoints]);

	const [selectedPointId, setSelectedPointId] = useState<string>(activeTarget?.id ?? "about");
	const [activeFilter, setActiveFilter] = useState<"all" | "stations" | "projects">("all");

	useEffect(() => {
		if (activeTarget?.id) {
			setSelectedPointId(activeTarget.id);
		}
	}, [activeTarget?.id]);

	const selectedPoint = useMemo(() => {
		return allPoints.find((p) => p.id === selectedPointId) ?? mapPoints[0];
	}, [allPoints, mapPoints, selectedPointId]);

	// Calculate dynamic route for preview or current trip
	const previewRoute = useMemo(() => {
		if (!selectedPoint) return [];
		return buildDynamicRoute({ x: player.x, z: player.z }, selectedPoint);
	}, [player.x, player.z, selectedPoint]);

	// SVG Path string for the calculated route
	const routePathD = useMemo(() => {
		if (previewRoute.length === 0) return "";
		const startX = toSvgX(player.x);
		const startY = toSvgY(player.z);
		let d = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;
		for (const pt of previewRoute) {
			d += ` L ${toSvgX(pt[0]).toFixed(1)} ${toSvgY(pt[2]).toFixed(1)}`;
		}
		return d;
	}, [player.x, player.z, previewRoute]);

	// Static terrain road network SVG path strings
	const roadNetworkPaths = useMemo(() => {
		return paths.map((path) => {
			let d = "";
			for (let i = 0; i < path.length; i++) {
				const x = toSvgX(path[i][0]);
				const y = toSvgY(path[i][2]);
				d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
			}
			return d;
		});
	}, []);

	// Distance from player to selected destination
	const distanceToSelected = useMemo(() => {
		if (!selectedPoint) return 0;
		const spot = getDestinationInteractionSpot(selectedPoint);
		return Math.round(Math.hypot(player.x - spot[0], player.z - spot[2]));
	}, [player.x, player.z, selectedPoint]);

	const isCurrentlyNavigatingToThis = Boolean(activeTarget && activeTarget.id === selectedPoint?.id);

	// Category helpers
	const getPointBadge = (point: WorldPoint) => {
		if (point.id === "about") return { icon: <User size={13} />, color: "#6366f1", bg: "#e0e7ff", label: language === "es" ? "Sobre mí" : "About" };
		if (point.id === "dna") return { icon: <Sparkles size={13} />, color: "#06b6d4", bg: "#cffafe", label: "DNA" };
		if (point.id === "journey") return { icon: <RouteIcon size={13} />, color: "#8b5cf6", bg: "#ede9fe", label: language === "es" ? "Trayectoria" : "Journey" };
		if (point.id === "garden") return { icon: <Heart size={13} />, color: "#ec4899", bg: "#fce7f3", label: language === "es" ? "Habilidades" : "Skills" };
		if (point.id === "skills") return { icon: <Cpu size={13} />, color: "#10b981", bg: "#d1fae5", label: "Tech Lab" };
		if (point.id === "riwi") return { icon: <BookOpen size={13} />, color: "#14b8a6", bg: "#ccfbf1", label: "Riwi" };
		if (point.id.startsWith("project-")) return { icon: <FolderGit2 size={13} />, color: "#f59e0b", bg: "#fef3c7", label: language === "es" ? "Proyecto" : "Project" };
		if (point.id === "contact") return { icon: <Anchor size={13} />, color: "#3b82f6", bg: "#dbeafe", label: language === "es" ? "El Lago" : "The Lake" };
		return { icon: <Compass size={13} />, color: "#64748b", bg: "#f1f5f9", label: point.name };
	};

	const filteredPoints = useMemo(() => {
		if (activeFilter === "projects") return mapPoints.filter((p) => p.id.startsWith("project-"));
		if (activeFilter === "stations") return mapPoints.filter((p) => !p.id.startsWith("project-"));
		return mapPoints;
	}, [activeFilter, mapPoints]);

	const isEs = language === "es";

	// Click anywhere on SVG canvas selects the nearest station if within reach
	const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = ((e.clientX - rect.left) / rect.width) * MAP_WIDTH;
		const clickY = ((e.clientY - rect.top) / rect.height) * MAP_HEIGHT;

		let closestId: string | null = null;
		let minDist = 65;

		for (const pt of filteredPoints) {
			const px = toSvgX(pt.position[0]);
			const py = toSvgY(pt.position[2]);
			const dist = Math.hypot(clickX - px, clickY - py);
			if (dist < minDist) {
				minDist = dist;
				closestId = pt.id;
			}
		}

		if (closestId) {
			setSelectedPointId(closestId);
		}
	};

	return (
		<aside
			ref={dialogRef}
			tabIndex={-1}
			className="world-map-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="map-title"
			data-world-ui
			onPointerDown={(e) => e.stopPropagation()}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Modal Header */}
			<header className="map-modal-header">
				<div className="map-header-title">
					<span className="map-title-icon"><Compass size={18} /></span>
					<div>
						<h2 id="map-title">{isEs ? "Mapa del Mundo" : "World Map"}</h2>
						<p className="map-subtitle">{isEs ? "Toca cualquier estación o pin para trazar tu ruta" : "Tap any station or pin to plot your route"}</p>
					</div>
				</div>
				<button className="map-close-btn" type="button" onClick={onClose} aria-label={isEs ? "Cerrar mapa" : "Close map"}>
					<X size={20} />
				</button>
			</header>

			{/* Filter Pills */}
			<div className="map-filters">
				<button
					type="button"
					className={`map-filter-pill ${activeFilter === "all" ? "active" : ""}`}
					onClick={() => setActiveFilter("all")}
				>
					{isEs ? "Todas" : "All"} ({mapPoints.length})
				</button>
				<button
					type="button"
					className={`map-filter-pill ${activeFilter === "stations" ? "active" : ""}`}
					onClick={() => setActiveFilter("stations")}
				>
					{isEs ? "Principales" : "Main stations"} (7)
				</button>
				<button
					type="button"
					className={`map-filter-pill ${activeFilter === "projects" ? "active" : ""}`}
					onClick={() => setActiveFilter("projects")}
				>
					{isEs ? "Proyectos" : "Projects"} (3)
				</button>
			</div>

			{/* Quick Station Selector Chips */}
			<div className="map-station-chips-scroll" role="tablist" aria-label="Selector de estaciones">
				{filteredPoints.map((point) => {
					const isSelected = selectedPointId === point.id;
					const badge = getPointBadge(point);
					return (
						<button
							key={point.id}
							type="button"
							className={`map-station-chip ${isSelected ? "active" : ""}`}
							style={isSelected ? { borderColor: badge.color, color: badge.color } : {}}
							onClick={() => setSelectedPointId(point.id)}
							onDoubleClick={() => onNavigate(point.id)}
							title={isEs ? `Seleccionar ${point.name} (Doble clic para ir directo)` : `Select ${point.name} (Double-click to travel)`}
						>
							<span className="station-chip-dot" style={{ background: badge.color }} />
							<span>{point.name}</span>
						</button>
					);
				})}
			</div>

			{/* Interactive Vector Map Canvas */}
			<div className="map-canvas-container">
				<svg
					className="map-vector-canvas"
					viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
					preserveAspectRatio="xMidYMid meet"
					onClick={handleSvgClick}
				>
					<defs>
						{/* Valley Meadow Gradients */}
						<linearGradient id="valleyBg" x1="0%" y1="0%" x2="0%" y2="100%">
							<stop offset="0%" stopColor="#d5e8d4" />
							<stop offset="40%" stopColor="#d8ecd5" />
							<stop offset="70%" stopColor="#e4f3de" />
							<stop offset="100%" stopColor="#d6ebd6" />
						</linearGradient>

						{/* River Water Gradient */}
						<linearGradient id="riverWater" x1="0%" y1="0%" x2="100%" y2="0%">
							<stop offset="0%" stopColor="#7dd3fc" />
							<stop offset="50%" stopColor="#38bdf8" />
							<stop offset="100%" stopColor="#7dd3fc" />
						</linearGradient>

						{/* Glowing Route Line Filter */}
						<filter id="routeGlow" x="-30%" y="-30%" width="160%" height="160%">
							<feGaussianBlur stdDeviation="3.5" result="blur" />
							<feComposite in="SourceGraphic" in2="blur" operator="over" />
						</filter>

						{/* Player Pulse Animation */}
						<radialGradient id="playerPulse">
							<stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
							<stop offset="60%" stopColor="#fbbf24" stopOpacity="0.4" />
							<stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
						</radialGradient>
					</defs>

					{/* 1. Valley Meadow Background */}
					<rect x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} rx="16" fill="url(#valleyBg)" />

					{/* Soft Topo Elevation Contours */}
					<ellipse cx={toSvgX(-18)} cy={toSvgY(-14)} rx="80" ry="50" fill="#cde5cb" opacity="0.5" />
					<ellipse cx={toSvgX(18)} cy={toSvgY(-12)} rx="80" ry="50" fill="#cde5cb" opacity="0.5" />
					<ellipse cx={toSvgX(0)} cy={toSvgY(20)} rx="140" ry="60" fill="#cde5cb" opacity="0.4" />

					{/* 2. Mountains (North Ridge) */}
					<path
						d={`M 0 0 L 0 ${toSvgY(-32)} Q ${toSvgX(-15)} ${toSvgY(-36)} ${toSvgX(0)} ${toSvgY(-34)} Q ${toSvgX(15)} ${toSvgY(-36)} ${MAP_WIDTH} ${toSvgY(-32)} L ${MAP_WIDTH} 0 Z`}
						fill="#7da08a"
						opacity="0.35"
					/>
					<text x={MAP_WIDTH / 2} y={toSvgY(-34)} textAnchor="middle" fill="#4a6b57" fontSize="11" fontWeight="700" letterSpacing="2">
						{isEs ? "MONTAÑAS DEL NORTE" : "NORTH MOUNTAINS"}
					</text>

					{/* 3. Meandering Crystal River */}
					{/* River banks & water path */}
					<path
						d={`M 0 ${toSvgY(-2.5) - 18} C ${toSvgX(-10)} ${toSvgY(-1.8) - 18}, ${toSvgX(10)} ${toSvgY(-3.2) - 18}, ${MAP_WIDTH} ${toSvgY(-2.5) - 18} L ${MAP_WIDTH} ${toSvgY(-2.5) + 18} C ${toSvgX(10)} ${toSvgY(-3.2) + 18}, ${toSvgX(-10)} ${toSvgY(-1.8) + 18}, 0 ${toSvgY(-2.5) + 18} Z`}
						fill="#bae6fd"
						opacity="0.5"
					/>
					<path
						d={`M 0 ${toSvgY(-2.5) - 12} C ${toSvgX(-10)} ${toSvgY(-1.8) - 12}, ${toSvgX(10)} ${toSvgY(-3.2) - 12}, ${MAP_WIDTH} ${toSvgY(-2.5) - 12} L ${MAP_WIDTH} ${toSvgY(-2.5) + 12} C ${toSvgX(10)} ${toSvgY(-3.2) + 12}, ${toSvgX(-10)} ${toSvgY(-1.8) + 12}, 0 ${toSvgY(-2.5) + 12} Z`}
						fill="url(#riverWater)"
					/>
					<text x="35" y={toSvgY(-2.5) + 4} fill="#0284c7" fontSize="10" fontWeight="600" letterSpacing="1" opacity="0.75">
						{isEs ? "RÍO SERENO" : "CLEAR RIVER"}
					</text>

					{/* 4. Wooden Arched Bridge */}
					<g>
						{/* Bridge shadow */}
						<rect x={toSvgX(-1.5)} y={toSvgY(0.8)} width={toSvgX(1.5) - toSvgX(-1.5)} height={toSvgY(-5.8) - toSvgY(0.8)} fill="#0f172a" opacity="0.15" rx="3" />
						{/* Bridge deck */}
						<rect x={toSvgX(-1.4)} y={toSvgY(0.6)} width={toSvgX(1.4) - toSvgX(-1.4)} height={toSvgY(-5.6) - toSvgY(0.6)} fill="#a17548" stroke="#684728" strokeWidth="2" rx="4" />
						{/* Bridge plank lines */}
						{[-5.0, -4.0, -3.0, -2.0, -1.0, 0.0].map((pz) => (
							<line key={pz} x1={toSvgX(-1.3)} y1={toSvgY(pz)} x2={toSvgX(1.3)} y2={toSvgY(pz)} stroke="#785331" strokeWidth="1.5" />
						))}
						{/* Bridge railings */}
						<line x1={toSvgX(-1.35)} y1={toSvgY(0.6)} x2={toSvgX(-1.35)} y2={toSvgY(-5.6)} stroke="#4a301b" strokeWidth="2.5" />
						<line x1={toSvgX(1.35)} y1={toSvgY(0.6)} x2={toSvgX(1.35)} y2={toSvgY(-5.6)} stroke="#4a301b" strokeWidth="2.5" />
						<text x={toSvgX(0)} y={toSvgY(-2.5) + 3} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="700">
							{isEs ? "PUENTE" : "BRIDGE"}
						</text>
					</g>

					{/* 5. Terrain Cobblestone & Dirt Road Network */}
					{roadNetworkPaths.map((d, index) => (
						<g key={`road-${index}`}>
							{/* Soft path border */}
							<path d={d} fill="none" stroke="#bda584" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
							{/* Road core */}
							<path d={d} fill="none" stroke="#edd8b8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
						</g>
					))}

					{/* 6. Active Marked Navigation Route (Ruta Clara Marcada) */}
					{routePathD && (
						<g className="map-active-route">
							{/* Outer luminous glow */}
							<path d={routePathD} fill="none" stroke="#38bdf8" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" filter="url(#routeGlow)" />
							{/* Core animated dashed route */}
							<path
								d={routePathD}
								fill="none"
								stroke="#0284c7"
								strokeWidth="4"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeDasharray="9 7"
								className="map-route-dash-animation"
							/>
							{/* Small waypoint beads */}
							{previewRoute.map((pt, index) => (
								<circle key={`wpt-${index}`} cx={toSvgX(pt[0])} cy={toSvgY(pt[2])} r="3" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
							))}
						</g>
					)}

					{/* 7. Landmark Stations Pins */}
					{filteredPoints.map((point) => {
						const isSelected = selectedPointId === point.id;
						const px = toSvgX(point.position[0]);
						const py = toSvgY(point.position[2]);
						const badge = getPointBadge(point);

						return (
							<g
								key={point.id}
								className={`map-pin-group ${isSelected ? "selected" : ""}`}
								onClick={(e) => {
									e.stopPropagation();
									setSelectedPointId(point.id);
								}}
								onDoubleClick={(e) => {
									e.stopPropagation();
									onNavigate(point.id);
								}}
								style={{ cursor: "pointer" }}
							>
								{/* Generous touch & click target area (56px diameter) */}
								<circle
									cx={px}
									cy={py}
									r="28"
									fill="transparent"
									pointerEvents="all"
								/>

								{/* Pin Selection Target Halo */}
								{isSelected && (
									<circle cx={px} cy={py} r="18" fill="none" stroke={badge.color} strokeWidth="2.5" opacity="0.85" className="map-pulse-ring" />
								)}

								{/* Pin Base Shadow */}
								<ellipse cx={px} cy={py + 1} rx="9" ry="4" fill="#0f172a" opacity="0.25" />

								{/* Outer Badge Circle */}
								<circle
									cx={px}
									cy={py}
									r={isSelected ? 11 : 9}
									fill={isSelected ? badge.color : "#ffffff"}
									stroke={badge.color}
									strokeWidth={isSelected ? 3 : 2}
									className="map-pin-circle"
								/>

								{/* Inner Core Dot */}
								<circle
									cx={px}
									cy={py}
									r={isSelected ? 4.5 : 3.5}
									fill={isSelected ? "#ffffff" : badge.color}
								/>

								{/* Floating Label Badge */}
								<g transform={`translate(${px}, ${py - 16})`}>
									<rect
										x={-(badge.label.length * 3.4 + 10)}
										y="-10"
										width={badge.label.length * 6.8 + 20}
										height="18"
										rx="9"
										fill={isSelected ? badge.color : "#ffffff"}
										stroke={badge.color}
										strokeWidth="1.5"
										filter="drop-shadow(0px 2px 4px rgba(0,0,0,0.12))"
									/>
									<text
										x="0"
										y="2.5"
										textAnchor="middle"
										fill={isSelected ? "#ffffff" : "#1e293b"}
										fontSize="10"
										fontWeight="700"
									>
										{badge.label}
									</text>
								</g>
							</g>
						);
					})}

					{/* 8. Live Player Pin ("TÚ / YOU") */}
					<g transform={`translate(${toSvgX(player.x)}, ${toSvgY(player.z)})`}>
						{/* Animated Radar Pulse Rings */}
						<circle cx="0" cy="0" r="14" fill="url(#playerPulse)" className="map-radar-pulse" />
						<circle cx="0" cy="0" r="7" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
						<circle cx="0" cy="0" r="2.5" fill="#ffffff" />

						{/* Player Label Pill */}
						<g transform="translate(0, 18)">
							<rect x="-16" y="-8" width="32" height="15" rx="7.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" />
							<text x="0" y="2.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800">
								{isEs ? "TÚ" : "YOU"}
							</text>
						</g>
					</g>

					{/* Compass Rose */}
					<g transform={`translate(${MAP_WIDTH - 36}, 36)`} opacity="0.8">
						<circle cx="0" cy="0" r="18" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
						<polygon points="0,-14 4,-3 0,0 -4,-3" fill="#ef4444" />
						<polygon points="0,14 4,3 0,0 -4,3" fill="#64748b" />
						<text x="0" y="-16" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="800">N</text>
					</g>
				</svg>
			</div>

			{/* Selected Location Card & Travel Action Bar */}
			{selectedPoint && (
				<div className="map-action-bar">
					<div className="map-destination-info">
						<div className="map-destination-header">
							<span className="dest-tag" style={{ background: getPointBadge(selectedPoint).bg, color: getPointBadge(selectedPoint).color }}>
								{getPointBadge(selectedPoint).icon}
								<span>{getPointBadge(selectedPoint).label}</span>
							</span>
							<span className="dest-distance">
								<Navigation2 size={13} />
								<strong>{distanceToSelected} m</strong> {isEs ? "de distancia" : "away"}
							</span>
						</div>
						<h3 className="dest-title">{selectedPoint.name}</h3>
						<p className="dest-desc">{selectedPoint.description}</p>
					</div>

					<div className="map-actions-group">
						{isCurrentlyNavigatingToThis ? (
							<div className="map-navigating-status">
								<span className="navigating-pulse-dot" />
								<span>{isEs ? "En camino a esta estación..." : "Walking to station..."}</span>
								{onCancelNavigate && (
									<button type="button" className="btn-cancel-nav" onClick={onCancelNavigate}>
										{isEs ? "Detener marcha" : "Stop"}
									</button>
								)}
							</div>
						) : (
							<button
								type="button"
								className="btn-start-travel"
								onClick={() => {
									onNavigate(selectedPoint.id);
								}}
							>
								<CheckCircle2 size={16} />
								<span>{isEs ? "Seguir ruta hasta aquí" : "Follow route here"}</span>
							</button>
						)}
					</div>
				</div>
			)}
		</aside>
	);
}