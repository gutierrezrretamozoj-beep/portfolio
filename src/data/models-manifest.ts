import { AVAILABLE_MODELS } from "virtual:models-manifest";

export type ModelSlotId =
	| "avatar"
	| "animals/cat"
	| "animals/deer"
	| "animals/fox"
	| "animals/rabbit"
	| "animals/duck"
	| "animals/duckling"
	| "animals/squirrel"
	| "animals/bird"
	| "animals/fish"
	| "landmarks/cabin"
	| "landmarks/tech-lab"
	| "landmarks/bridge"
	| "landmarks/riwi-pavilion"
	| "landmarks/lake-pier"
	| "props/gamepad"
	| "props/headphones"
	| "props/laptop"
	| "props/cat-figure"
	| "props/code-sculpture"
	| "props/design-palette"
	| "props/plant-pot"
	| "props/suitcase"
	| "props/culinary-pot";

export interface ModelSpec {
	slot: ModelSlotId;
	expectedPath: string;
	tier: 1 | 2 | 3;
	animated: boolean;
	targetHeight: number;
	alignBottom: boolean;
	rotationYOffset?: number;
	scaleMultiplier?: [number, number, number];
	budgetTris: string;
	clips?: Record<string, string[]>;
}

export const MODEL_SPECS: Record<ModelSlotId, ModelSpec> = {
	avatar: {
		slot: "avatar",
		expectedPath: "/models/avatar.glb",
		tier: 1,
		animated: true,
		targetHeight: 1.72,
		alignBottom: true,
		budgetTris: "5k - 10k",
		clips: {
			idle: ["idle", "Idle", "standing", "breath"],
			walk: ["walk", "Walk", "walking"],
			run: ["run", "Run", "running", "sprint"],
			jump: ["jump", "Jump"],
		},
	},
	"animals/cat": {
		slot: "animals/cat",
		expectedPath: "/models/animals/cat.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.48,
		alignBottom: true,
		rotationYOffset: -Math.PI / 2,
		budgetTris: "2.5k - 5k",
		clips: {
			idle: ["IdleCat", "idle", "sit", "sleep"],
			walk: ["walk", "trot"],
			run: ["run", "gallop"],
		},
	},
	"animals/deer": {
		slot: "animals/deer",
		expectedPath: "/models/animals/deer.glb",
		tier: 1,
		animated: true,
		targetHeight: 1.45,
		alignBottom: true,
		budgetTris: "3k - 6k",
		clips: {
			idle: ["idle", "graze", "eat", "look"],
			walk: ["walk"],
			run: ["run", "gallop", "jump"],
		},
	},
	"animals/fox": {
		slot: "animals/fox",
		expectedPath: "/models/animals/fox.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.62,
		alignBottom: true,
		budgetTris: "2.5k - 5k",
		clips: {
			idle: ["idle", "sit", "survey"],
			walk: ["walk", "trot"],
			run: ["run", "gallop"],
		},
	},
	"animals/rabbit": {
		slot: "animals/rabbit",
		expectedPath: "/models/animals/rabbit.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.42,
		alignBottom: true,
		budgetTris: "1.5k - 3k",
		clips: {
			idle: ["idle", "sit", "sniff"],
			walk: ["hop", "walk", "jump"],
			run: ["run", "hop_fast"],
		},
	},
	"animals/duck": {
		slot: "animals/duck",
		expectedPath: "/models/animals/duck.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.44,
		alignBottom: true,
		budgetTris: "1.5k - 3k",
		clips: {
			idle: ["idle", "float", "swim_idle"],
			walk: ["swim", "paddle", "walk"],
		},
	},
	"animals/duckling": {
		slot: "animals/duckling",
		expectedPath: "/models/animals/duckling.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.28,
		alignBottom: true,
		budgetTris: "1k - 2k",
		clips: {
			idle: ["idle", "float"],
			walk: ["swim", "paddle", "walk"],
		},
	},
	"animals/squirrel": {
		slot: "animals/squirrel",
		expectedPath: "/models/animals/squirrel.glb",
		tier: 1,
		animated: true,
		targetHeight: 0.36,
		alignBottom: true,
		budgetTris: "1.5k - 2.5k",
		clips: {
			idle: ["idle", "forage", "nibble"],
			walk: ["run", "hop", "walk"],
		},
	},
	"animals/bird": {
		slot: "animals/bird",
		expectedPath: "/models/animals/bird.glb",
		tier: 2,
		animated: true,
		targetHeight: 0.28,
		alignBottom: false,
		budgetTris: "800 - 1.8k",
		clips: {
			fly: ["fly", "flap", "glide"],
			idle: ["idle", "perch", "fly"],
		},
	},
	"animals/fish": {
		slot: "animals/fish",
		expectedPath: "/models/animals/fish.glb",
		tier: 2,
		animated: true,
		targetHeight: 0.22,
		alignBottom: false,
		budgetTris: "600 - 1.5k",
		clips: {
			swim: ["Swimming_Normal", "Swimming_Fast", "swim", "idle", "move"],
		},
	},
	"landmarks/cabin": {
		slot: "landmarks/cabin",
		expectedPath: "/models/landmarks/cabin.glb",
		tier: 2,
		animated: false,
		targetHeight: 2.35,
		alignBottom: true,
		scaleMultiplier: [0.95, 1.0, 1.0],
		budgetTris: "8k - 15k",
	},
	"landmarks/tech-lab": {
		slot: "landmarks/tech-lab",
		expectedPath: "/models/landmarks/tech-lab.glb",
		tier: 2,
		animated: false,
		targetHeight: 3.9,
		alignBottom: true,
		scaleMultiplier: [1.3, 1.0, 1.25],
		budgetTris: "6k - 12k",
	},
	"landmarks/bridge": {
		slot: "landmarks/bridge",
		expectedPath: "/models/landmarks/bridge.glb",
		tier: 2,
		animated: false,
		targetHeight: 1.4748,
		alignBottom: true,
		budgetTris: "4k - 8k",
	},
	"landmarks/riwi-pavilion": {
		slot: "landmarks/riwi-pavilion",
		expectedPath: "/models/landmarks/riwi-pavilion.glb",
		tier: 2,
		animated: false,
		targetHeight: 2.65,
		alignBottom: true,
		budgetTris: "5k - 10k",
	},
	"landmarks/lake-pier": {
		slot: "landmarks/lake-pier",
		expectedPath: "/models/landmarks/lake-pier.glb",
		tier: 2,
		animated: false,
		targetHeight: 1.75,
		alignBottom: true,
		budgetTris: "2.5k - 5k",
	},
	"props/gamepad": {
		slot: "props/gamepad",
		expectedPath: "/models/props/gamepad.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.45,
		alignBottom: false,
		budgetTris: "1k - 2.5k",
	},
	"props/headphones": {
		slot: "props/headphones",
		expectedPath: "/models/props/headphones.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.65,
		alignBottom: false,
		budgetTris: "1k - 2.5k",
	},
	"props/laptop": {
		slot: "props/laptop",
		expectedPath: "/models/props/laptop.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.68,
		alignBottom: false,
		budgetTris: "1k - 2.5k",
	},
	"props/cat-figure": {
		slot: "props/cat-figure",
		expectedPath: "/models/props/cat-figure.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.72,
		alignBottom: true,
		budgetTris: "1k - 2.5k",
	},
	"props/code-sculpture": {
		slot: "props/code-sculpture",
		expectedPath: "/models/props/code-sculpture.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.75,
		alignBottom: false,
		budgetTris: "1k - 2.5k",
	},
	"props/design-palette": {
		slot: "props/design-palette",
		expectedPath: "/models/props/design-palette.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.68,
		alignBottom: false,
		budgetTris: "1k - 2.5k",
	},
	"props/plant-pot": {
		slot: "props/plant-pot",
		expectedPath: "/models/props/plant-pot.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.72,
		alignBottom: true,
		budgetTris: "1k - 2.5k",
	},
	"props/suitcase": {
		slot: "props/suitcase",
		expectedPath: "/models/props/suitcase.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.66,
		alignBottom: true,
		budgetTris: "1k - 2.5k",
	},
	"props/culinary-pot": {
		slot: "props/culinary-pot",
		expectedPath: "/models/props/culinary-pot.glb",
		tier: 3,
		animated: false,
		targetHeight: 0.62,
		alignBottom: true,
		budgetTris: "1k - 2.5k",
	},
};

export function getModelUrl(slot: ModelSlotId): string | null {
	return AVAILABLE_MODELS[slot] ?? null;
}

export function listInstalledModelSlots(): ModelSlotId[] {
	return (Object.keys(MODEL_SPECS) as ModelSlotId[]).filter((slot) => Boolean(AVAILABLE_MODELS[slot]));
}
