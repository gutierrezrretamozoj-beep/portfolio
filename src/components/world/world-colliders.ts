import { treePositions } from "@/data/world";
import { streetLampPositions } from "@/components/world/street-lamps-data";

export const rockPositions: [number, number, number, number][] = [
	[-5, -24.4, 0.36, 0.7], [4, -25, 0.32, 0.66], [-7, -28, 0.4, 0.75],
	[8, -29, 0.44, 0.84], [-6, -32, 0.48, 0.9], [6, -33, 0.4, 0.72],
];

export const worldColliders = [
	// Natural obstacles: Trees, Boulders & Lamps
	...treePositions.map(([x, , z, scale]) => ({ x, z, radius: 0.62 + scale * 0.3 })),
	...rockPositions.map(([x, z, , scale]) => ({ x, z, radius: scale * 0.6 })),
	...streetLampPositions.map((lamp) => ({ x: lamp.x, z: lamp.z, radius: 0.4 })),

	// Architectural Landmarks & Buildings:
	// TechLab Building (5.2m x 4.2m box covered with center and corner volumes)
	{ x: 10.0, z: 10.0, radius: 2.7 },
	{ x: 8.2, z: 10.0, radius: 1.5 },
	{ x: 11.8, z: 10.0, radius: 1.5 },

	// Lakeside Cabin (positioned beside the lakeside lawn at [-8.2, -18.5])
	{ x: -8.2, z: -18.5, radius: 2.6 },
	{ x: -9.5, z: -18.5, radius: 1.5 },
	{ x: -6.9, z: -18.5, radius: 1.5 },
	{ x: -7.5, z: -16.6, radius: 1.4 }, // Front porch deck and steps

	// Project Pedestal Stands (Central Plaza)
	{ x: -3.8, z: 7.2, radius: 1.1 }, // Project 1 stand
	{ x: 0.0, z: 5.2, radius: 1.1 },  // Project 2 stand
	{ x: 3.8, z: 7.2, radius: 1.1 },  // Project 3 stand

	// Riwi Pavilion (study deck, desk and easel at [12, 6])
	{ x: 12.0, z: 5.8, radius: 1.5 },

	// Digital DNA Grove (central stone dais and runic obelisk at [14, -10])
	{ x: 14.0, z: -10.0, radius: 1.6 },

	// About David Terrace (observation gazebo, telescope and bench at [-14, -10])
	{ x: -14.0, z: -10.2, radius: 1.6 },

	// People Garden Sanctuary (botanical crystal fountain pedestal at [-10, 10])
	{ x: -10.0, z: 10.0, radius: 1.4 },

	// Start Station (Entrance pergola posts at [0, 20])
	{ x: 0.0, z: 20.0, radius: 1.2 },

	// Journey Milestone (Resting stone bench and marker at [-2.2, -5.7])
	{ x: -2.2, z: -5.7, radius: 1.1 },

	// Lake Pier Railings & Deep Water Boundary ([0, -22.2] to [0, -25.5])
	{ x: -1.35, z: -23.2, radius: 0.55 },
	{ x: 1.35, z: -23.2, radius: 0.55 },
	{ x: -1.35, z: -24.4, radius: 0.55 },
	{ x: 1.35, z: -24.4, radius: 0.55 },
	{ x: 0.0, z: -25.2, radius: 0.9 }, // Deep water end of pier barrier
];