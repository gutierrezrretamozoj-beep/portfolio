export type LampPostSpec = {
	x: number;
	z: number;
	rotationY: number;
	hasPointLight: boolean;
};

export type GroundBollardSpec = {
	x: number;
	z: number;
};

// Strategic street lamps placed along all paths, junctions, plazas, and landmarks
export const streetLampPositions: LampPostSpec[] = [
	// Start Avenue
	{ x: -2.1, z: 19.5, rotationY: Math.PI / 2, hasPointLight: true },
	{ x: 2.1, z: 16.2, rotationY: -Math.PI / 2, hasPointLight: false },
	{ x: -2.1, z: 12.8, rotationY: Math.PI / 2, hasPointLight: false },

	// Central Projects Plaza
	{ x: -5.2, z: 8.8, rotationY: 0.5, hasPointLight: false },
	{ x: 5.2, z: 8.8, rotationY: -0.5, hasPointLight: false },
	{ x: 0.0, z: 3.4, rotationY: 0, hasPointLight: true },

	// West Path to People Garden
	{ x: -5.5, z: 10.6, rotationY: Math.PI, hasPointLight: false },
	{ x: -9.5, z: 8.2, rotationY: 0.6, hasPointLight: true },

	// East Path to Natural Tech Lab & Riwi
	{ x: 5.5, z: 10.6, rotationY: Math.PI, hasPointLight: false },
	{ x: 10.8, z: 8.0, rotationY: -0.6, hasPointLight: true },
	{ x: 12.5, z: 4.2, rotationY: -1.2, hasPointLight: false },

	// Wooden Bridge Entrances
	{ x: -2.2, z: 0.5, rotationY: Math.PI / 2, hasPointLight: true },
	{ x: 2.2, z: -4.8, rotationY: -Math.PI / 2, hasPointLight: false },

	// North Crossroads
	{ x: -2.6, z: -7.8, rotationY: Math.PI / 2, hasPointLight: true },
	{ x: 2.6, z: -7.8, rotationY: -Math.PI / 2, hasPointLight: false },

	// West Path to About Terrace
	{ x: -8.0, z: -9.8, rotationY: 0, hasPointLight: false },
	{ x: -13.0, z: -8.6, rotationY: 0.4, hasPointLight: true },

	// East Path to Digital DNA Grove
	{ x: 8.0, z: -9.8, rotationY: 0, hasPointLight: false },
	{ x: 13.0, z: -8.6, rotationY: -0.4, hasPointLight: true },

	// Interests Plaza (Beyond the Code)
	{ x: -3.6, z: -13.2, rotationY: 0.8, hasPointLight: false },
	{ x: 3.6, z: -13.2, rotationY: -0.8, hasPointLight: true },

	// Lake Trail & Pier
	{ x: -2.2, z: -18.2, rotationY: Math.PI / 2, hasPointLight: false },
	{ x: 2.2, z: -22.2, rotationY: -Math.PI / 2, hasPointLight: false },
	{ x: 0.0, z: -25.2, rotationY: 0, hasPointLight: true },
];

// Ground-level stone bollard luminaires guiding turns and pathway borders
export const groundBollardPositions: GroundBollardSpec[] = [
	{ x: -1.2, z: 9.8 },
	{ x: 1.2, z: 9.8 },
	{ x: -2.4, z: 4.6 },
	{ x: 2.4, z: 4.6 },
	{ x: -0.9, z: -10.0 },
	{ x: 0.9, z: -10.0 },
	{ x: -1.8, z: -14.8 },
	{ x: 1.8, z: -14.8 },
	{ x: -0.9, z: -20.2 },
	{ x: 0.9, z: -20.2 },
];

