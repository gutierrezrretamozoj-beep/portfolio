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
		description: "Atardecer cálido con sol posado en la montaña, cielo violeta y ámbar radiante",
		sunPosition: [-14, 16.5, -86],
		moonPosition: [22, -3, -86],
		skyRayleigh: 3.6,
		skyTurbidity: 8.2,
		skyInclination: 0.46,
		sunLightColor: "#fb923c",
		sunLightIntensity: 2.0,
		ambientColor: "#fed7aa",
		ambientIntensity: 0.52,
		hemisphereSky: "#f472b6",
		hemisphereGround: "#5b4a68",
		hemisphereIntensity: 0.85,
		fogColor: "#fb7185",
		fogDensity: 0.0075,
		sunOpacity: 1.0,
		moonOpacity: 0.85,
		starsOpacity: 0.15,
		cloudDayFactor: 0.65,
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
 * Returns smoothly interpolated lighting, fog, sky, and atmosphere parameters between the current phase
 * and the upcoming phase. Uses a cubic hermite S-curve (3t^2 - 2t^3) so changes transition continuously
 * and gracefully across time without any abrupt jumps.
 */
export function getInterpolatedTimeConfig(
	phase: TimePhase,
	cycleSeconds: number,
	duration: number = AUTO_CYCLE_DURATION_SECONDS,
) {
	const nextPhase = getStrictNextTimePhase(phase);
	const cur = TIME_PHASES[phase];
	const nxt = TIME_PHASES[nextPhase];
	const rawT = Math.min(1, Math.max(0, cycleSeconds / Math.max(1, duration)));
	const t = rawT * rawT * (3 - 2 * rawT);

	return {
		cur,
		nxt,
		t,
		sunLightIntensity: cur.sunLightIntensity + (nxt.sunLightIntensity - cur.sunLightIntensity) * t,
		ambientIntensity: cur.ambientIntensity + (nxt.ambientIntensity - cur.ambientIntensity) * t,
		hemisphereIntensity: (cur.hemisphereIntensity ?? 0.78) + ((nxt.hemisphereIntensity ?? 0.78) - (cur.hemisphereIntensity ?? 0.78)) * t,
		fogDensity: cur.fogDensity + (nxt.fogDensity - cur.fogDensity) * t,
		skyRayleigh: cur.skyRayleigh + (nxt.skyRayleigh - cur.skyRayleigh) * t,
		skyTurbidity: cur.skyTurbidity + (nxt.skyTurbidity - cur.skyTurbidity) * t,
		skyInclination: cur.skyInclination + (nxt.skyInclination - cur.skyInclination) * t,
		starsOpacity: cur.starsOpacity + (nxt.starsOpacity - cur.starsOpacity) * t,
		lanternIntensity: cur.lanternIntensity + (nxt.lanternIntensity - cur.lanternIntensity) * t,
		cloudDayFactor: cur.cloudDayFactor + (nxt.cloudDayFactor - cur.cloudDayFactor) * t,
	};
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
 * Computes continuous, vista-framed celestial coordinates for the 3D Sun and Moon:
 * - Midday (day): The Sun stands majestic and radiant atop the central mountain peak (Y ≈ 31..32),
 *   and towards late afternoon smoothly glides into position halfway on the western mountain ridge.
 * - Afternoon / Sunset (sunset): While it is sunset, the Sun stays STATIC halfway on the mountain
 *   (X = -14.0, Y = 16.5, half-resting along the mountain ridge, glowing golden amber over the valley).
 *   Then, a moment before transitioning to night (progress >= 0.85), it smoothly ducks behind the mountain peaks
 *   (Y: 16.5 -> -6.0, X: -14.0 -> -18.0) to usher in the night.
 * - Concurrently, the Moon rises on the eastern horizon during sunset, climbs to zenith across night/midnight,
 *   and sets behind the western mountains during dawn.
 */
export function getPhaseCelestialPositions(
	phase: TimePhase,
	cycleSeconds: number,
	duration: number = AUTO_CYCLE_DURATION_SECONDS,
): CelestialOrbitState {
	const progress = Math.min(1, Math.max(0, cycleSeconds / Math.max(1, duration)));
	let sunX: number;
	let sunY: number;
	let sunVis: number;
	let moonX: number;
	let moonY: number;
	let moonVis: number;

	switch (phase) {
		case "day": {
			// Midday: Sun rests atop the central mountain peak in calm brilliance.
			// In late day (last 20%), it glides smoothly to settle halfway on the mountain for sunset.
			if (progress < 0.8) {
				const t = progress / 0.8;
				sunX = 2.0 - t * 6.0;
				sunY = 31.0 + Math.sin(t * Math.PI) * 1.5;
			} else {
				const s = (progress - 0.8) / 0.2;
				const k = s * s * (3 - 2 * s);
				sunX = -4.0 - k * 10.0;
				sunY = 31.0 - k * 14.5;
			}
			sunVis = 1.0;

			moonX = -22.0;
			moonY = -6.0;
			moonVis = 0.0;
			break;
		}

		case "sunset": {
			// Afternoon / Sunset:
			// For the vast majority of sunset (progress < 0.85), the sun stays completely STATIC
			// halfway on the mountain crest (X: -14.0, Y: 16.5) glowing brilliantly.
			// Then, a moment before transitioning to night (progress >= 0.85),
			// it descends smoothly behind the mountain silhouettes (Y: 16.5 -> -6.0, X: -14.0 -> -18.0)
			// to usher in the night.
			if (progress < 0.85) {
				sunX = -14.0;
				sunY = 16.5;
				sunVis = 1.0;
			} else {
				const s = (progress - 0.85) / 0.15;
				const k = s * s * (3 - 2 * s);
				sunX = -14.0 - k * 4.0;
				sunY = 16.5 - k * 22.5;
				sunVis = Math.max(0, 1.0 - k);
			}

			// Moon rises on the East (+X) during sunset
			moonX = 22.0 - progress * 4.0;
			moonY = -3.0 + progress * 21.0;
			moonVis = Math.min(1, Math.max(0, (moonY + 3.0) / 6.0));
			break;
		}

		case "night": {
			// Night: Sun remains hidden under mountains; Moon climbs into the night zenith
			sunX = -18.0 + progress * 16.0;
			sunY = -6.0 - progress * 19.0;
			sunVis = 0.0;

			moonX = 18.0 - progress * 14.0;
			moonY = 18.0 + progress * 12.0;
			moonVis = 1.0;
			break;
		}

		case "midnight": {
			// Midnight: Moon crowns the central sky above the mountains, then starts gentle western descent
			moonX = 4.0 - progress * 16.0;
			moonY = 30.0 - progress * 8.0;
			moonVis = 1.0;

			sunX = -2.0 + progress * 20.0;
			sunY = -25.0;
			sunVis = 0.0;
			break;
		}

		case "dawn": {
			// Dawn: Sun ascends from East horizon up to midday mountain crest; Moon sets in the West
			sunX = 18.0 - progress * 16.0;
			sunY = -6.0 + progress * 37.0;
			sunVis = Math.min(1, Math.max(0, (sunY + 4.0) / 4.0));

			moonX = -12.0 - progress * 10.0;
			moonY = 22.0 - progress * 28.0;
			moonVis = Math.min(1, Math.max(0, (moonY + 4.0) / 4.0));
			break;
		}
	}

	return {
		sunPosition: [sunX, sunY, -86],
		moonPosition: [moonX, moonY, -86],
		sunVisibility: sunVis,
		moonVisibility: moonVis,
	};
}

export function getCelestialOrbits(hourFloat: number): CelestialOrbitState {
	if (hourFloat >= 8.0 && hourFloat <= 17.0) {
		const t = (hourFloat - 8.0) / 9.0;
		return getPhaseCelestialPositions("day", t * AUTO_CYCLE_DURATION_SECONDS);
	}
	if (hourFloat > 17.0 && hourFloat <= 19.5) {
		const t = (hourFloat - 17.0) / 2.5;
		return getPhaseCelestialPositions("sunset", t * AUTO_CYCLE_DURATION_SECONDS);
	}
	if (hourFloat > 19.5 && hourFloat <= 23.5) {
		const t = (hourFloat - 19.5) / 4.0;
		return getPhaseCelestialPositions("night", t * AUTO_CYCLE_DURATION_SECONDS);
	}
	if (hourFloat > 23.5 || hourFloat <= 5.5) {
		const normHour = hourFloat > 23.5 ? hourFloat - 23.5 : hourFloat + 0.5;
		const t = normHour / 6.0;
		return getPhaseCelestialPositions("midnight", t * AUTO_CYCLE_DURATION_SECONDS);
	}
	const t = (hourFloat - 5.5) / 2.5;
	return getPhaseCelestialPositions("dawn", t * AUTO_CYCLE_DURATION_SECONDS);
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

