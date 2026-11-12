import {
	type Language,
	i18nWorldPoints,
	i18nProjects,
	i18nHumanSkills,
	i18nInterests,
	i18nUI,
} from "@/data/i18n";
import type { WorldPoint } from "@/types/world";

const projectPositions: [number, number, number][] = [
	[-3.8, 0, 7.2],
	[0, 0, 5.2],
	[3.8, 0, 7.2],
];

const interestLayout: [number, number, number][] = [
	[-4.5, 0, -14.2], // Video games
	[-3.5, 0, -15.5], // Music
	[-4.8, 0, -16.8], // Technology
	[-2.0, 0, -14.6], // Cats
	[0.0, 0, -13.5],  // Programming
	[2.0, 0, -14.6],  // Design
	[3.5, 0, -15.5],  // Nature
	[4.5, 0, -14.2],  // Travel
	[4.8, 0, -16.8],  // Cooking
];

export function getWorldPoints(lang: Language = "es"): WorldPoint[] {
	const wp = i18nWorldPoints[lang];
	const localizedProjects = i18nProjects[lang];
	const localizedSkills = i18nHumanSkills[lang];
	const localizedInterests = i18nInterests[lang];

	const humanSkillPositions: WorldPoint[] = localizedSkills.map((skill, index) => {
		const angle = (index / localizedSkills.length) * Math.PI * 2;
		return {
			id: `human-${index}`,
			name: skill.name,
			label: lang === "es" ? "HABILIDAD HUMANA" : "HUMAN SKILL",
			description: skill.description,
			position: [-10 + Math.cos(angle) * 3.8, 0, 10 + Math.sin(angle) * 3.8],
			radius: 2.0,
			kind: "human-skill",
			dataKey: skill.name,
		};
	});

	const projectPoints: WorldPoint[] = localizedProjects.map((project, index) => ({
		id: `project-${index}`,
		name: project.name,
		label: lang === "es" ? "PROYECTO" : "PROJECT",
		description: project.description,
		position: projectPositions[index] ?? [0, 0, 6],
		radius: 2.6,
		kind: "project",
		dataKey: project.name,
	}));

	const interestPoints: WorldPoint[] = localizedInterests.map((interest, index) => {
		const pos = interestLayout[index] ?? [0, 0, -14];
		return {
			id: `interest-${index}`,
			name: interest.name,
			label: lang === "es" ? "MÁS ALLÁ DEL CÓDIGO" : "BEYOND THE CODE",
			description: interest.description,
			position: pos,
			radius: 2.0,
			kind: "interest",
			route: [[0, 0, 1], [0, 0, -6], [pos[0] * 0.6, 0, -12]],
			dataKey: interest.name,
		};
	});

	return [
		{
			id: "start",
			name: wp.start.name,
			label: wp.start.label,
			description: wp.start.description,
			position: [0, 0, 20],
			radius: 3,
			kind: "start",
		},
		{
			id: "about",
			name: wp.about.name,
			label: wp.about.label,
			description: wp.about.description,
			position: [-14, 0, -10],
			radius: 3.1,
			kind: "about",
			route: [[0, 0, 1], [0, 0, -5], [-7, 0, -7]],
		},
		{
			id: "dna",
			name: wp.dna.name,
			label: wp.dna.label,
			description: wp.dna.description,
			position: [14, 0, -10],
			radius: 3.1,
			kind: "dna",
			route: [[0, 0, 1], [0, 0, -5], [7, 0, -7]],
		},
		{
			id: "journey",
			name: wp.journey.name,
			label: wp.journey.label,
			description: wp.journey.description,
			position: [0, 0, -5.7],
			radius: 3.5,
			kind: "journey",
			route: [[0, 0, 1], [0, 0, -4]],
		},
		{
			id: "garden",
			name: wp.garden.name,
			label: wp.garden.label,
			description: wp.garden.description,
			position: [-10, 0, 10],
			radius: 3,
			kind: "human-skill",
		},
		{
			id: "skills",
			name: wp.skills.name,
			label: wp.skills.label,
			description: wp.skills.description,
			position: [10, 0, 10],
			radius: 3.2,
			kind: "skills",
		},
		{
			id: "riwi",
			name: wp.riwi.name,
			label: wp.riwi.label,
			description: wp.riwi.description,
			position: [12, 0, 6],
			radius: 2.6,
			kind: "riwi",
		},
		...humanSkillPositions,
		...projectPoints,
		...interestPoints,
		{
			id: "easter-egg",
			name: wp["easter-egg"].name,
			label: wp["easter-egg"].label,
			description: wp["easter-egg"].description,
			position: [-26, 0, -25],
			radius: 1.8,
			kind: "easter-egg",
		},
		{
			id: "contact",
			name: wp.contact.name,
			label: wp.contact.label,
			description: wp.contact.description,
			position: [0, 0, -23.5],
			radius: 4,
			kind: "contact",
			route: [[0, 0, 1], [0, 0, -6], [0, 0, -14], [0, 0, -21]],
		},
	];
}

export const worldPoints = getWorldPoints("es");

export function getWorldPoint(id: string | null, lang: Language = "es"): WorldPoint | null {
	if (!id) return null;
	const points = getWorldPoints(lang);
	return points.find((point) => point.id === id) ?? null;
}

export function getMenuDestinations(lang: Language = "es") {
	return i18nUI[lang].menuDestinations;
}

export const menuDestinations = getMenuDestinations("es");

export const treePositions: [number, number, number, number][] = [
	// Grove 1: North Alpine Pine Ridge (framing lake, river, snowy mountains, and open sky)
	[-26, 0, -34, 1.6], [-19, 0, -38, 1.45], [-12, 0, -40, 1.7],
	[-5, 0, -44, 1.5], [6, 0, -44, 1.55],
	[14, 0, -40, 1.65], [21, 0, -37, 1.4], [27, 0, -32, 1.6],

	// Grove 2: Lakeside Pine Copse (northwest riverbank)
	[-26, 0, -26, 1.3], [-20, 0, -28, 1.1], [-26, 0, -18, 1.4],
	[-21, 0, -12, 1.2], [-13, 0, -26, 1.05], [-7, 0, -28, 1.15],

	// Grove 3: East Golden Birch & Meadow Copse (near Tech Lab & Riwi)
	[18, 0, -25, 1.25], [25, 0, -19, 1.4], [21, 0, -12, 1.15],
	[26, 0, -5, 1.35], [20, 0, 2, 1.05], [26, 0, 10, 1.3], [20, 0, 18, 1.25],

	// Grove 4: West Sakura & Lilac Sanctuary Copse (near About & Garden)
	[-26, 0, -11, 1.25], [-21, 0, -4, 1.15], [-26, 0, 4, 1.35],
	[-20, 0, 11, 1.1], [-25, 0, 17, 1.3], [-18, 0, 23, 1.15],

	// Grove 5: South Framing Woodland Entrance (framing the start trail)
	[-16, 0, 26, 1.3], [-8, 0, 28, 1.15], [8, 0, 28, 1.15],
	[16, 0, 26, 1.3], [24, 0, 25, 1.35],
];