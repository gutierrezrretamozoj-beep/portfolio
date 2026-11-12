export function terrainHeight(x: number, z: number) {
	const rolling = Math.sin(x * 0.17) * 0.22 + Math.cos(z * 0.13) * 0.18;
	const southHill = Math.exp(-((x + 19) ** 2 + (z - 14) ** 2) / 75) * 1.2;
	const eastHill = Math.exp(-((x - 20) ** 2 + (z + 11) ** 2) / 100) * 1.45;
	const northRise = Math.exp(-((x - 5) ** 2 + (z + 31) ** 2) / 150) * 2.1;
	const raw = rolling + southHill + eastHill + northRise;

	// Carve a natural lakeside basin centered at (0, -28) so the lake water (y = 0.08) sits cleanly below the shoreline
	const lakeNormDist = Math.hypot(x / 6.9, (z + 28) / 5.4);
	if (lakeNormDist < 1.55) {
		const basin = Math.exp(-(lakeNormDist ** 2.6) * 2.2);
		return raw * (1 - basin) - 0.44 * basin;
	}
	return raw;
}

export const paths: [number, number, number][][] = [
	[[0, 0, 23], [0, 0, 17], [0, 0, 11]],
	[[0, 0, 11], [-2.4, 0, 9.2], [-3.8, 0, 7.2], [-2.2, 0, 4.2], [0, 0, 2.0]],
	[[0, 0, 11], [2.4, 0, 9.2], [3.8, 0, 7.2], [2.2, 0, 4.2], [0, 0, 2.0]],
	[[0, 0, 11], [0, 0, 8.0], [0, 0, 5.2]],
	[[0, 0, 2.0], [0, 0, -5], [0, 0, -13], [0, 0, -21.8]],
	[[0, 0, 11], [-4, 0, 10.6], [-7, 0, 10.2], [-10, 0, 10]],
	[[0, 0, 11], [4, 0, 10.6], [7, 0, 10.2], [10, 0, 10]],
	[[10, 0, 10], [11.2, 0, 8], [12, 0, 6]],
	[[0, 0, -10], [-5, 0, -10], [-10, 0, -10], [-14, 0, -10]],
	[[0, 0, -10], [5, 0, -10], [10, 0, -10], [14, 0, -10]],
	[[0, 0, -13], [-2.4, 0, -14.2], [-4.2, 0, -15.4]],
	[[0, 0, -13], [2.4, 0, -14.2], [4.2, 0, -15.4]],
	[[0, 0, -13], [0, 0, -16.0]],
];

export function distanceToPaths(x: number, z: number) {
	let nearestSquared = Infinity;
	for (const path of paths) {
		for (let index = 0; index < path.length - 1; index += 1) {
			const [startX, , startZ] = path[index];
			const [endX, , endZ] = path[index + 1];
			const segmentX = endX - startX;
			const segmentZ = endZ - startZ;
			const lengthSquared = segmentX * segmentX + segmentZ * segmentZ;
			const progress = Math.max(0, Math.min(1, ((x - startX) * segmentX + (z - startZ) * segmentZ) / lengthSquared));
			const offsetX = x - (startX + segmentX * progress);
			const offsetZ = z - (startZ + segmentZ * progress);
			nearestSquared = Math.min(nearestSquared, offsetX * offsetX + offsetZ * offsetZ);
		}
	}
	return Math.sqrt(nearestSquared);
}

export type CircularCollider = { x: number; z: number; radius: number };