export type WorldVector = [number, number, number];

export type WorldPointKind =
	| "start"
	| "about"
	| "dna"
	| "journey"
	| "human-skill"
	| "skills"
	| "riwi"
	| "project"
	| "interest"
	| "easter-egg"
	| "contact";

export type WorldPoint = {
	id: string;
	name: string;
	label: string;
	description: string;
	position: WorldVector;
	radius: number;
	kind: WorldPointKind;
	route?: WorldVector[];
	dataKey?: string;
};

export type WorldInput = {
	moveX: number;
	moveZ: number;
	lookX: number;
	lookY: number;
};

export type PlayerRuntime = {
	position: { x: number; y: number; z: number };
	yaw: number;
};