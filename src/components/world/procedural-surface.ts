import { DataTexture, LinearFilter, RedFormat, RepeatWrapping, RGBAFormat, UnsignedByteType } from "three";

type SurfaceMaps = { normalMap: DataTexture; roughnessMap: DataTexture };

function heightAt(u: number, v: number, seed: number) {
	const tau = Math.PI * 2;
	return Math.sin(tau * (u * 5 + seed)) * Math.cos(tau * (v * 7 - seed)) * 0.42
		+ Math.sin(tau * (u * 13 + v * 11 + seed * 2)) * 0.2
		+ Math.cos(tau * (u * 23 - v * 19 - seed)) * 0.1;
}

export function createProceduralSurfaceMaps(seed = 1, size = 128, repeat: [number, number] = [1, 1]): SurfaceMaps {
	const normalData = new Uint8Array(size * size * 4);
	const roughnessData = new Uint8Array(size * size);
	const step = 1 / size;
	for (let y = 0; y < size; y += 1) {
		for (let x = 0; x < size; x += 1) {
			const u = x / size;
			const v = y / size;
			const dx = (heightAt(u + step, v, seed) - heightAt(u - step, v, seed)) * 3.2;
			const dy = (heightAt(u, v + step, seed) - heightAt(u, v - step, seed)) * 3.2;
			const length = Math.hypot(dx, dy, 1);
			const index = y * size + x;
			normalData[index * 4] = Math.round((dx / length * 0.5 + 0.5) * 255);
			normalData[index * 4 + 1] = Math.round((dy / length * 0.5 + 0.5) * 255);
			normalData[index * 4 + 2] = Math.round((1 / length * 0.5 + 0.5) * 255);
			normalData[index * 4 + 3] = 255;
			roughnessData[index] = Math.round(164 + (heightAt(u, v, seed + 3) + 1) * 38);
		}
	}
	const normalMap = new DataTexture(normalData, size, size, RGBAFormat, UnsignedByteType);
	const roughnessMap = new DataTexture(roughnessData, size, size, RedFormat, UnsignedByteType);
	for (const texture of [normalMap, roughnessMap]) {
		texture.wrapS = RepeatWrapping;
		texture.wrapT = RepeatWrapping;
		texture.repeat.set(repeat[0], repeat[1]);
		texture.magFilter = LinearFilter;
		texture.minFilter = LinearFilter;
		texture.needsUpdate = true;
	}
	return { normalMap, roughnessMap };
}
