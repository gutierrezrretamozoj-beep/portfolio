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
		sunPosition: [16, 14, -102],
		moonPosition: [-20, 6, -96],
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
		moonOpacity: 0.4,
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
		sunPosition: [0, 32, -102],
		moonPosition: [0, -28, -96],
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
		sunPosition: [-4, 28, -102],
		moonPosition: [24, 4, -96],
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
		sunOpacity: 1.0,
		moonOpacity: 0.85,
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
		sunPosition: [-20, -25, -102],
		moonPosition: [16, 22, -96],
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
		sunPosition: [0, -25, -102],
		moonPosition: [0, 28, -96],
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
 * Computes physically consistent, vista-framed celestial positions for the 3D Sun and Moon:
 * - Midday (08:00 - 17:00): The Sun remains majestic and stationary atop the central mountain peak (Y ≈ 30..32, X ≈ 0).
 * - Sunset (17:00 - 19:30): When sunset arrives, the Sun NEVER disappears. It remains fully visible in the sky (Y ≈ 28..30),
 *   then progressively and visibly descends between the western mountain silhouettes (X: -4 -> -24, Y: 28 -> -3),
 *   dipping behind the mountain crests right as twilight concludes to usher in the night.
 * - Concurrently, the Moon rises on the eastern horizon during Sunset, travels across zenith at midnight,
 *   and sets behind the western mountains during Dawn as the Sun ascends in the East.
 */
export function getCelestialOrbits(hourFloat: number): CelestialOrbitState {
	let sunX: number;
	let sunY: number;
	let sunVis: number;
	let moonX: number;
	let moonY: number;
	let moonVis: number;

	if (hourFloat >= 8.0 && hourFloat <= 17.0) {
		// Midday: Sun stands calm and high atop the central mountain peak
		const t = (hourFloat - 8.0) / 9.0;
		sunX = 4.0 - t * 8.0;
		sunY = 30.0 + Math.sin(t * Math.PI) * 2.0;
		sunVis = 1.0;

		moonX = 0;
		moonY = -28.0;
		moonVis = 0.0;
	} else if (hourFloat > 17.0 && hourFloat <= 19.5) {
		// Sunset: Sun stays fully visible upon arrival, then steadily sinks behind the western mountain crests
		const t = (hourFloat - 17.0) / 2.5;
		sunX = -4.0 - t * 20.0;

		if (t < 0.35) {
			const subT = t / 0.35;
			sunY = 30.0 - subT * 8.0;
		} else {
			const subT = (t - 0.35) / 0.65;
			sunY = 22.0 - subT * 25.0; // descends down to -3.0 behind the mountain notch
		}

		sunVis = Math.min(1, Math.max(0, (sunY + 6.0) / 4.0));

		// Moon rises in the East during sunset
		moonX = 26.0 - t * 4.0;
		moonY = -2.0 + t * 18.0;
		moonVis = Math.min(1, Math.max(0, (moonY + 4.0) / 6.0));
	} else if (hourFloat > 19.5 && hourFloat <= 23.5) {
		// Night: Sun rests under subterranean horizon; Moon ascends into the night sky
		const t = (hourFloat - 19.5) / 4.0;
		sunX = -24.0 + t * 20.0;
		sunY = -25.0;
		sunVis = 0.0;

		moonX = 22.0 - t * 16.0;
		moonY = 16.0 + t * 12.0;
		moonVis = 1.0;
	} else if (hourFloat > 23.5 || hourFloat <= 5.5) {
		// Midnight: Moon crowns the central sky above the mountains, then starts its descent
		const normHour = hourFloat > 23.5 ? hourFloat - 23.5 : hourFloat + 0.5;
		const t = normHour / 6.0;
		sunX = -4.0 + t * 24.0;
		sunY = -25.0;
		sunVis = 0.0;

		moonX = 6.0 - t * 18.0;
		moonY = 28.0 - t * 10.0;
		moonVis = 1.0;
	} else {
		// Dawn: Sun ascends from East horizon up to midday mountain crest; Moon sets in the West
		const t = (hourFloat - 5.5) / 2.5;
		sunX = 20.0 - t * 16.0;
		sunY = -3.0 + t * 33.0;
		sunVis = Math.min(1, Math.max(0, (sunY + 6.0) / 5.0));

		moonX = -12.0 - t * 12.0;
		moonY = 18.0 - t * 21.0;
		moonVis = Math.min(1, Math.max(0, (moonY + 5.0) / 5.0));
	}

	return {
		sunPosition: [sunX, sunY, -102],
		moonPosition: [moonX, moonY, -96],
		sunVisibility: sunVis,
		moonVisibility: moonVis,
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

