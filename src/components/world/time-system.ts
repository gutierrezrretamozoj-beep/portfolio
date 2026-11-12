export type TimePhase = "dawn" | "day" | "sunset" | "night" | "midnight";

export type TimePhaseInfo = {
	id: TimePhase;
	name: string;
	timeDisplay: string;
	timeZone: string;
	description: string;
	sunPosition: [number, number, number];
	moonPosition: [number, number, number];
	skyRayleigh: number;
	skyTurbidity: number;
	skyInclination: number;
	sunLightColor: string;
	sunLightIntensity: number;
	ambientColor: string;
	ambientIntensity: number;
	hemisphereSky: string;
	hemisphereGround: string;
	hemisphereIntensity?: number;
	fogColor: string;
	fogDensity: number;
	sunOpacity: number;
	moonOpacity: number;
	starsOpacity: number;
	cloudDayFactor: number; // 0 is night cloud, 1 is day cloud, 0.5 is sunset cloud
	lanternIntensity: number;
};

export const TIME_PHASES: Record<TimePhase, TimePhaseInfo> = {
	dawn: {
		id: "dawn",
		name: "AMANECER",
		timeDisplay: "06:15 AM",
		timeZone: "GMT-5",
		description: "Amanecer dorado con bruma matutina y primeros rayos de sol",
		sunPosition: [36, 26, -65],
		moonPosition: [-40, 14, -58],
		skyRayleigh: 2.4,
		skyTurbidity: 6.5,
		skyInclination: 0.46,
		sunLightColor: "#fed7aa",
		sunLightIntensity: 1.6,
		ambientColor: "#fef3c7",
		ambientIntensity: 0.42,
		hemisphereSky: "#fed7aa",
		hemisphereGround: "#709660",
		fogColor: "#fce7f3",
		fogDensity: 0.009,
		sunOpacity: 0.95,
		moonOpacity: 0.2,
		starsOpacity: 0.05,
		cloudDayFactor: 0.7,
		lanternIntensity: 0.5,
	},
	day: {
		id: "day",
		name: "MEDIODÍA",
		timeDisplay: "12:00 PM",
		timeZone: "GMT-5",
		description: "Mediodía radiante con cielo despejado y sol pleno",
		sunPosition: [24, 48, -62],
		moonPosition: [-40, -25, -55],
		skyRayleigh: 1.65,
		skyTurbidity: 5.8,
		skyInclination: 0.52,
		sunLightColor: "#fff4e0",
		sunLightIntensity: 2.2,
		ambientColor: "#fffbeb",
		ambientIntensity: 0.48,
		hemisphereSky: "#e0f2fe",
		hemisphereGround: "#8db872",
		fogColor: "#d6eef8",
		fogDensity: 0.0075,
		sunOpacity: 1.0,
		moonOpacity: 0.0,
		starsOpacity: 0.0,
		cloudDayFactor: 1.0,
		lanternIntensity: 0.1,
	},
	sunset: {
		id: "sunset",
		name: "ATARDECER",
		timeDisplay: "06:30 PM",
		timeZone: "GMT-5",
		description: "Atardecer cálido con cielo violeta, ámbar y faroles encendiéndose",
		sunPosition: [-36, 22, -65],
		moonPosition: [30, 18, -58],
		skyRayleigh: 4.2,
		skyTurbidity: 8.5,
		skyInclination: 0.44,
		sunLightColor: "#f97316",
		sunLightIntensity: 1.5,
		ambientColor: "#fbcfe8",
		ambientIntensity: 0.38,
		hemisphereSky: "#f472b6",
		hemisphereGround: "#5b4a68",
		fogColor: "#f472b6",
		fogDensity: 0.0095,
		sunOpacity: 0.95,
		moonOpacity: 0.45,
		starsOpacity: 0.25,
		cloudDayFactor: 0.4,
		lanternIntensity: 0.9,
	},
	night: {
		id: "night",
		name: "NOCHE",
		timeDisplay: "09:15 PM",
		timeZone: "GMT-5",
		description: "Noche clara y serena con luna creciente, cielo añil y senderos bien iluminados",
		sunPosition: [-48, -25, -78],
		moonPosition: [-24, 36, -56],
		skyRayleigh: 0.95,
		skyTurbidity: 3.4,
		skyInclination: 0.76,
		sunLightColor: "#dbeafe",
		sunLightIntensity: 1.85,
		ambientColor: "#475569",
		ambientIntensity: 0.82,
		hemisphereSky: "#64748b",
		hemisphereGround: "#365343",
		hemisphereIntensity: 0.95,
		fogColor: "#1e293b",
		fogDensity: 0.0062,
		sunOpacity: 0.0,
		moonOpacity: 1.0,
		starsOpacity: 0.75,
		cloudDayFactor: 0.25,
		lanternIntensity: 2.3,
	},
	midnight: {
		id: "midnight",
		name: "MEDIANOCHE",
		timeDisplay: "12:00 AM",
		timeZone: "GMT-5",
		description: "Medianoche estrellada con luna en cenit, luciérnagas y cálidos faroles",
		sunPosition: [48, -35, -78],
		moonPosition: [-12, 48, -50],
		skyRayleigh: 0.35,
		skyTurbidity: 1.5,
		skyInclination: 0.82,
		sunLightColor: "#bfdbfe",
		sunLightIntensity: 0.9,
		ambientColor: "#1e293b",
		ambientIntensity: 0.44,
		hemisphereSky: "#1e293b",
		hemisphereGround: "#14241b",
		fogColor: "#0b101b",
		fogDensity: 0.0075,
		sunOpacity: 0.0,
		moonOpacity: 1.0,
		starsOpacity: 1.0,
		cloudDayFactor: 0.0,
		lanternIntensity: 2.0,
	},
};

export const AUTO_CYCLE_DURATION_SECONDS = 60;

export const PHASE_HOUR_RANGES: Record<TimePhase, [number, number]> = {
	dawn: [5.5, 8.0],
	day: [8.0, 17.0],
	sunset: [17.0, 19.5],
	night: [19.5, 23.5],
	midnight: [23.5, 29.5],
};

/**
 * Maps the current phase and elapsed seconds within that phase to a continuous 24h clock [0, 24).
 */
export function getContinuousHour(
	phase: TimePhase,
	cycleSeconds: number,
	duration: number = AUTO_CYCLE_DURATION_SECONDS,
): number {
	const [start, end] = PHASE_HOUR_RANGES[phase];
	const t = Math.min(1, Math.max(0, cycleSeconds / Math.max(1, duration)));
	return (start + (end - start) * t) % 24;
}

/**
 * Formats a fractional 24h value (e.g. 6.25) into a 12h clock string ("06:15 AM").
 */
export function formatHourToClock(hourFloat: number): string {
	const normalized = ((hourFloat % 24) + 24) % 24;
	const totalMinutes = Math.floor(normalized * 60);
	const hours24 = Math.floor(totalMinutes / 60) % 24;
	const minutes = String(totalMinutes % 60).padStart(2, "0");
	const ampm = hours24 >= 12 ? "PM" : "AM";
	const displayHours = hours24 % 12 || 12;
	return `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;
}

export type CelestialOrbitState = {
	sunPosition: [number, number, number];
	moonPosition: [number, number, number];
	sunVisibility: number;
	moonVisibility: number;
};

/**
 * Computes physically consistent East (+X) to West (-X) orbital arcs for the 3D Sun and Moon
 * positioned behind the mountain range (z ≈ -96 to -102) so the mountains naturally occlude them:
 * - Sun rises at the East horizon (+X) around 06:00, peaks at 12:00, and sets behind the West mountains (-X) around 18:00.
 * - Moon rises at the East horizon (+X) around 18:00 while the Sun sets, peaks at 00:00, and sets behind the West mountains (-X) around 06:00.
 */
export function getCelestialOrbits(hourFloat: number): CelestialOrbitState {
	const sunAngle = ((hourFloat - 6.0) / 24.0) * Math.PI * 2;
	const sunSin = Math.sin(sunAngle);
	const sunCos = Math.cos(sunAngle);
	const sunPosition: [number, number, number] = [
		sunCos * 56,
		sunSin * 32 + 4,
		-102,
	];

	const moonAngle = ((hourFloat - 18.0) / 24.0) * Math.PI * 2;
	const moonSin = Math.sin(moonAngle);
	const moonCos = Math.cos(moonAngle);
	const moonPosition: [number, number, number] = [
		moonCos * 54,
		moonSin * 28 + 4,
		-96,
	];

	const sunVisibility = Math.min(1, Math.max(0, (sunPosition[1] + 5) / 8));
	const moonVisibility = Math.min(1, Math.max(0, (moonPosition[1] + 5) / 8));

	return {
		sunPosition,
		moonPosition,
		sunVisibility,
		moonVisibility,
	};
}

export const TIME_PHASE_ORDER: TimePhase[] = ["dawn", "day", "sunset", "night", "midnight"];

/**
 * Strict progression validator: guarantees without exception that
 * each phase transitions only to its exact sequential successor:
 * Amanecer (dawn) -> Mediodía (day) -> Atardecer (sunset) -> Noche (night) -> Medianoche (midnight) -> Amanecer (dawn)
 */
export function getStrictNextTimePhase(current: TimePhase): TimePhase {
	switch (current) {
		case "dawn":
			return "day";
		case "day":
			return "sunset";
		case "sunset":
			return "night";
		case "night":
			return "midnight";
		case "midnight":
			return "dawn";
		default:
			return "dawn";
	}
}

export function getNextTimePhase(current: TimePhase): TimePhase {
	return getStrictNextTimePhase(current);
}

export function getTimePhaseFromRealTime(): { phase: TimePhase; timeString: string; timeZone: string } {
	const now = new Date();
	const hours = now.getHours();
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const ampm = hours >= 12 ? "PM" : "AM";
	const displayHours = hours % 12 || 12;
	const timeString = `${String(displayHours).padStart(2, "0")}:${minutes} ${ampm}`;

	let phase: TimePhase = "day";
	if (hours >= 5 && hours < 8) phase = "dawn";
	else if (hours >= 8 && hours < 17) phase = "day";
	else if (hours >= 17 && hours < 20) phase = "sunset";
	else if (hours >= 20 && hours < 23) phase = "night";
	else phase = "midnight";

	return {
		phase,
		timeString,
		timeZone: "GMT-5",
	};
}

