import { digitalDna, humanSkills } from "@/data/dna";
import { interests } from "@/data/interests";
import { projects } from "@/data/projects";
import { WorldPoint } from "@/types/world";

const humanSkillPositions = humanSkills.map((skill, index) => {
	const angle = (index / humanSkills.length) * Math.PI * 2;
	return {
		id: `human-${index}`,
		name: skill,
		label: skill.toUpperCase(),
		description: `${skill} is one of the ways I help a team move forward.`,
		position: [-10 + Math.cos(angle) * 4, 0, 10 + Math.sin(angle) * 4] as [number, number, number],
		radius: 2.2,
		kind: "human-skill" as const,
		dataKey: skill,
	};
});

const projectPositions: [number, number, number][] = [
	[-3, 0, 6],
	[0, 0, 10],
	[3, 0, 6],
];

const projectPoints: WorldPoint[] = projects.map((project, index) => ({
	id: `project-${index}`,
	name: project.name,
	label: "PROJECT",
	description: project.description,
	position: projectPositions[index] ?? [0, 0, 8],
	radius: 2.4,
	kind: "project",
	dataKey: project.name,
}));

const interestPoints: WorldPoint[] = interests.map((interest, index) => {
	const angle = (index / interests.length) * Math.PI * 2;
	const x = Math.cos(angle) * 5.5;
	const z = -18 + Math.sin(angle) * 5.5;
	return {
		id: `interest-${index}`,
		name: interest.name,
		label: "BEYOND THE CODE",
		description: `A little part of life outside the editor: ${interest.name.toLowerCase()}.`,
		position: [x, 0, z],
		radius: 2.3,
		kind: "interest" as const,
		route: [[0, 0, 1], [0, 0, -6], [x * 0.55, 0, z * 0.55]],
		dataKey: interest.name,
	};
});

export const worldPoints: WorldPoint[] = [
	{
		id: "start",
		name: "Curiosity",
		label: "START HERE",
		description: "Every path starts with a question.",
		position: [0, 0, 20],
		radius: 3,
		kind: "start",
	},
	{
		id: "about",
		name: "About David",
		label: "WHO I AM",
		description: "Technology was always nearby. Curiosity helped me find my way into development.",
		position: [-14, 0, -10],
		radius: 3.1,
		kind: "about",
		route: [[0, 0, 1], [0, 0, -5], [-7, 0, -7]],
	},
	{
		id: "dna",
		name: "Digital DNA",
		label: "MY DIGITAL DNA",
		description: digitalDna.map((item) => item.name).join(" · "),
		position: [14, 0, -10],
		radius: 3.1,
		kind: "dna",
		route: [[0, 0, 1], [0, 0, -5], [7, 0, -7]],
	},
	{
		id: "journey",
		name: "My Journey",
		label: "MY JOURNEY",
		description: "The river marks a path from early curiosity toward a future still taking shape.",
		position: [0, 0, -5.7],
		radius: 3.5,
		kind: "journey",
		route: [[0, 0, 1], [0, 0, -4]],
	},
	{
		id: "garden",
		name: "Human Skills",
		label: "GARDEN OF PEOPLE",
		description: "Communication, empathy, and teamwork help good work grow.",
		position: [-10, 0, 10],
		radius: 3,
		kind: "human-skill",
	},
	{
		id: "skills",
		name: "Natural Tech Lab",
		label: "TECHNICAL SKILLS",
		description: "The tools I use today, and the ones I am still learning.",
		position: [10, 0, 10],
		radius: 3.2,
		kind: "skills",
	},
	{
		id: "riwi",
		name: "Riwi",
		label: "WHERE I GROW",
		description: "Projects, Scrum, presentations, and collaboration are part of my learning path.",
		position: [12, 0, 6],
		radius: 2.6,
		kind: "riwi",
	},
	...humanSkillPositions,
	...projectPoints,
	...interestPoints,
	{
		id: "easter-egg",
		name: "Curiosity detected",
		label: "A QUIET DISCOVERY",
		description: "Curiosity is the little spark that keeps the whole world growing.",
		position: [-26, 0, -25],
		radius: 1.8,
		kind: "easter-egg",
	},
	{
		id: "contact",
		name: "The Lake",
		label: "LET'S BUILD SOMETHING",
		description: "Have an idea, a project or just want to connect?",
		position: [0, 0, -22.7],
		radius: 4,
		kind: "contact",
		route: [[0, 0, 1], [0, 0, -6], [0, 0, -14], [0, 0, -20]],
	},
];

export const menuDestinations = [
	{ label: "About", pointId: "about" },
	{ label: "Skills", pointId: "skills" },
	{ label: "Journey", pointId: "journey" },
	{ label: "Projects", pointId: "project-0" },
	{ label: "Riwi", pointId: "riwi" },
	{ label: "Interests", pointId: "interest-0" },
	{ label: "Contact", pointId: "contact" },
] as const;

export const treePositions: [number, number, number, number][] = [
	[-24, 0, -21, 1.35], [-21, 0, -15, 0.95], [-23, 0, -8, 1.1], [-20, 0, -2, 1.4],
	[-18, 0, -19, 0.8], [-18, 0, -12, 1.2], [-16, 0, -5, 0.9], [-24, 0, 4, 1.1],
	[-21, 0, 12, 0.85], [-18, 0, 18, 1.3], [-16, 0, 14, 0.95], [-14, 0, 21, 1.15],
	[-12, 0, -21, 1.05], [-9, 0, -24, 1.2], [-4, 0, -21, 0.85], [5, 0, -23, 1.1],
	[10, 0, -21, 0.95], [17, 0, -20, 1.25], [21, 0, -16, 1.1], [24, 0, -9, 1.3],
	[20, 0, -3, 0.9], [23, 0, 4, 1.15], [19, 0, 14, 0.85], [22, 0, 20, 1.25],
	[16, 0, 19, 1.0], [14, 0, 23, 1.3], [7, 0, 22, 0.9], [-7, 0, 23, 1.1],
	[-24, 0, -29, 1.6], [-18, 0, -34, 1.4], [-10, 0, -36, 1.8], [0, 0, -38, 1.55],
	[11, 0, -36, 1.7], [19, 0, -33, 1.45], [25, 0, -28, 1.6],
];