export function terrainHeight(x: number, z: number) {
	const rolling = Math.sin(x * 0.17) * 0.22 + Math.cos(z * 0.13) * 0.18;
	const southHill = Math.exp(-((x + 19) ** 2 + (z - 14) ** 2) / 75) * 1.2;
	const eastHill = Math.exp(-((x - 20) ** 2 + (z + 11) ** 2) / 100) * 1.45;
	const northRise = Math.exp(-((x - 5) ** 2 + (z + 31) ** 2) / 150) * 2.1;
	return rolling + southHill + eastHill + northRise;
}

export type CircularCollider = { x: number; z: number; radius: number };