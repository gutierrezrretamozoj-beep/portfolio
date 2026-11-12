"use client";

import {
	BufferAttribute,
	BufferGeometry,
	ConeGeometry,
	CylinderGeometry,
	Euler,
	IcosahedronGeometry,
	Matrix4,
	Vector3,
} from "three";

export type GeometryMergeEntry = {
	geometry: BufferGeometry;
	position: [number, number, number];
	scale?: [number, number, number];
	rotation?: [number, number, number];
	colorGradient?: {
		bottom: [number, number, number];
		top: [number, number, number];
	};
	baseColor?: [number, number, number];
};

/**
 * Merge multiple BufferGeometries with support for rotation, scale, position, and vertex colors (ambient occlusion / depth shading)
 */
export function mergeGeometries(geoms: GeometryMergeEntry[]): BufferGeometry {
	const positions: number[] = [];
	const normals: number[] = [];
	const colors: number[] = [];
	const indices: number[] = [];
	let vertexOffset = 0;

	const tempVec = new Vector3();
	const tempNorm = new Vector3();
	const rotMatrix = new Matrix4();
	const normMatrix = new Matrix4();

	for (const { geometry, position, scale = [1, 1, 1], rotation = [0, 0, 0], colorGradient, baseColor } of geoms) {
		const posAttr = geometry.attributes.position;
		const normAttr = geometry.attributes.normal;
		const indexAttr = geometry.index;

		const euler = new Euler(rotation[0], rotation[1], rotation[2]);
		rotMatrix.makeRotationFromEuler(euler);
		normMatrix.identity().extractRotation(rotMatrix);

		// Find local vertical extent for gradient calculation
		let localMinY = Infinity;
		let localMaxY = -Infinity;
		for (let i = 0; i < posAttr.count; i++) {
			const py = posAttr.getY(i) * scale[1];
			if (py < localMinY) localMinY = py;
			if (py > localMaxY) localMaxY = py;
		}
		const spanY = Math.max(0.001, localMaxY - localMinY);

		for (let i = 0; i < posAttr.count; i++) {
			tempVec.set(
				posAttr.getX(i) * scale[0],
				posAttr.getY(i) * scale[1],
				posAttr.getZ(i) * scale[2]
			);
			const localY = tempVec.y;
			tempVec.applyMatrix4(rotMatrix);
			positions.push(
				tempVec.x + position[0],
				tempVec.y + position[1],
				tempVec.z + position[2]
			);

			if (normAttr) {
				tempNorm.set(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
				tempNorm.applyMatrix4(normMatrix).normalize();
				normals.push(tempNorm.x, tempNorm.y, tempNorm.z);
			}

			// Vertex color / ambient occlusion
			if (colorGradient) {
				const t = Math.max(0, Math.min(1, (localY - localMinY) / spanY));
				const r = colorGradient.bottom[0] + (colorGradient.top[0] - colorGradient.bottom[0]) * t;
				const g = colorGradient.bottom[1] + (colorGradient.top[1] - colorGradient.bottom[1]) * t;
				const b = colorGradient.bottom[2] + (colorGradient.top[2] - colorGradient.bottom[2]) * t;
				colors.push(r, g, b);
			} else if (baseColor) {
				colors.push(baseColor[0], baseColor[1], baseColor[2]);
			} else {
				colors.push(1, 1, 1);
			}
		}

		if (indexAttr) {
			for (let i = 0; i < indexAttr.count; i++) {
				indices.push(indexAttr.getX(i) + vertexOffset);
			}
		} else {
			for (let i = 0; i < posAttr.count; i++) {
				indices.push(i + vertexOffset);
			}
		}

		vertexOffset += posAttr.count;
	}

	const merged = new BufferGeometry();
	merged.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	if (normals.length === positions.length) {
		merged.setAttribute("normal", new BufferAttribute(new Float32Array(normals), 3));
	} else {
		merged.computeVertexNormals();
	}
	merged.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
	merged.setIndex(indices);
	return merged;
}

/**
 * Sculpted Tiered Alpine Pine Canopy (Ground-aligned, base at y = 0)
 * Designed to fit directly on top of createSculptedTrunkGeometry() at the exact same root position.
 * Features 4 distinct staggered boughs with natural scalloped needle rims,
 * depth shading between tiers, and organic tip lift.
 */
export function createTieredAlpinePineGeometry(): BufferGeometry {
	const tiers: GeometryMergeEntry[] = [];

	const tierConfigs = [
		// Bottom widest tier: sits over the trunk from y = 1.0 to 2.45
		{ radius: 1.68, height: 1.45, yPos: 1.72, rotY: 0.0, grad: { bottom: [0.65, 0.70, 0.65] as [number, number, number], top: [0.98, 1.02, 0.98] as [number, number, number] } },
		// Middle-lower tier (rotated by 25° for organic staggering)
		{ radius: 1.35, height: 1.35, yPos: 2.38, rotY: 0.44, grad: { bottom: [0.70, 0.75, 0.70] as [number, number, number], top: [1.02, 1.06, 1.02] as [number, number, number] } },
		// Middle-upper tier (rotated by 52°)
		{ radius: 1.02, height: 1.25, yPos: 2.98, rotY: 0.92, grad: { bottom: [0.76, 0.82, 0.76] as [number, number, number], top: [1.08, 1.12, 1.08] as [number, number, number] } },
		// Apex spire tier (rotated by 80°)
		{ radius: 0.62, height: 1.15, yPos: 3.58, rotY: 1.42, grad: { bottom: [0.84, 0.88, 0.84] as [number, number, number], top: [1.16, 1.20, 1.16] as [number, number, number] } },
	];

	for (const cfg of tierConfigs) {
		const cone = new ConeGeometry(cfg.radius, cfg.height, 9, 2);
		const pos = cone.attributes.position;

		// Sculpt the cone base with natural scalloped needle boughs
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			const y = pos.getY(i);
			const z = pos.getZ(i);

			if (y < -cfg.height * 0.2) {
				const angle = Math.atan2(z, x);
				const scallop = Math.cos(angle * 4.5);
				const flare = 1.0 + scallop * 0.12;
				const droop = scallop > 0 ? scallop * 0.12 : -0.04;
				pos.setXYZ(i, x * flare, y - droop, z * flare);
			}
		}
		cone.computeVertexNormals();

		tiers.push({
			geometry: cone,
			position: [0, cfg.yPos, 0],
			rotation: [0, cfg.rotY, 0],
			colorGradient: cfg.grad,
		});
	}

	return mergeGeometries(tiers);
}

/**
 * Organic Multi-Clustered Cloud Canopy (Deciduous: Oak / Birch / Sakura)
 * Ground-aligned (base at y = 0). Embraces the sculpted branches from y = 1.4 to 3.4.
 * Features 6 distinctly sculpted foliage clusters with ambient occlusion recesses
 * and sunlit canopy highlights.
 */
export function createCloudCanopyGeometry(): BufferGeometry {
	const deformLobe = (geom: BufferGeometry, factor = 0.08) => {
		const pos = geom.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const x = pos.getX(i);
			let y = pos.getY(i);
			const z = pos.getZ(i);

			// Flatten underside where foliage rests on branches
			if (y < -0.1) y *= 0.45;

			const noise = 1.0 + Math.sin(x * 3.4 + y * 2.8) * factor + Math.cos(z * 3.0 - y * 3.2) * factor;
			pos.setXYZ(i, x * noise, y * (noise * 0.92 + 0.08), z * noise);
		}
		geom.computeVertexNormals();
		return geom;
	};

	// 6 distinct foliage clumps arranged organically to rest directly on the sculpted trunk branches
	const clumps: GeometryMergeEntry[] = [
		// 1. Lower center mass: directly envelops the trunk top
		{
			geometry: deformLobe(new IcosahedronGeometry(1.15, 1), 0.07),
			position: [0, 2.15, 0],
			scale: [1.15, 0.88, 1.15],
			colorGradient: { bottom: [0.65, 0.68, 0.65], top: [0.98, 1.02, 0.98] },
		},
		// 2. Front-left cluster: sits directly on Branch 1
		{
			geometry: deformLobe(new IcosahedronGeometry(0.88, 1), 0.09),
			position: [-0.62, 2.25, 0.40],
			scale: [0.92, 0.80, 0.92],
			colorGradient: { bottom: [0.68, 0.72, 0.68], top: [1.06, 1.10, 1.04] },
		},
		// 3. Front-right cluster
		{
			geometry: deformLobe(new IcosahedronGeometry(0.90, 1), 0.08),
			position: [0.65, 2.20, 0.30],
			scale: [0.94, 0.82, 0.94],
			colorGradient: { bottom: [0.68, 0.72, 0.68], top: [1.08, 1.12, 1.06] },
		},
		// 4. Back-right cluster: sits directly on Branch 2
		{
			geometry: deformLobe(new IcosahedronGeometry(0.85, 1), 0.08),
			position: [0.45, 2.35, -0.52],
			scale: [0.88, 0.78, 0.88],
			colorGradient: { bottom: [0.66, 0.70, 0.66], top: [1.04, 1.08, 1.02] },
		},
		// 5. Back-left cluster
		{
			geometry: deformLobe(new IcosahedronGeometry(0.82, 1), 0.09),
			position: [-0.50, 2.40, -0.40],
			scale: [0.86, 0.76, 0.86],
			colorGradient: { bottom: [0.68, 0.72, 0.68], top: [1.05, 1.09, 1.03] },
		},
		// 6. Top crowning dome
		{
			geometry: deformLobe(new IcosahedronGeometry(0.82, 1), 0.07),
			position: [0.05, 2.95, 0.04],
			scale: [0.88, 0.84, 0.88],
			colorGradient: { bottom: [0.82, 0.86, 0.82], top: [1.18, 1.20, 1.14] },
		},
	];

	return mergeGeometries(clumps);
}

/**
 * Sculpted Natural Tree Trunk with Root Flare and Organic Branch Forks
 * Ground-aligned: base starts at y = -0.15 (embedded in soil) and reaches up to y = 2.05,
 * with branch forks supporting the foliage at y = 1.5 to 2.15.
 */
export function createSculptedTrunkGeometry(): BufferGeometry {
	const parts: GeometryMergeEntry[] = [];

	// Main trunk: height 2.1, centered at y = 0.95 -> base at -0.1, top at 2.0
	const trunkGeom = new CylinderGeometry(0.18, 0.44, 2.1, 8, 4);
	const pos = trunkGeom.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);

		// Natural root flare at base (where y < -0.3)
		const rootFactor = Math.max(0, -y - 0.2) * 0.7;
		const angle = Math.atan2(z, x);
		const flare = 1.0 + rootFactor * (1.0 + Math.cos(angle * 4.0) * 0.42);
		const trunkCurve = Math.sin((y + 1.0) * 1.1) * 0.05;

		pos.setXYZ(i, x * flare + trunkCurve, y, z * flare);
	}
	trunkGeom.computeVertexNormals();

	parts.push({
		geometry: trunkGeom,
		position: [0, 0.95, 0],
		colorGradient: { bottom: [0.82, 0.78, 0.75], top: [1.0, 1.0, 1.0] },
	});

	// Primary branch reaching left-forward to support foliage
	const branch1 = new CylinderGeometry(0.08, 0.14, 0.85, 6, 2);
	parts.push({
		geometry: branch1,
		position: [-0.22, 1.82, 0.16],
		rotation: [-0.2, 0.2, 0.55],
		colorGradient: { bottom: [0.88, 0.88, 0.88], top: [1.02, 1.02, 1.02] },
	});

	// Secondary branch reaching right-back
	const branch2 = new CylinderGeometry(0.07, 0.13, 0.80, 6, 2);
	parts.push({
		geometry: branch2,
		position: [0.20, 1.88, -0.16],
		rotation: [0.22, -0.15, -0.52],
		colorGradient: { bottom: [0.88, 0.88, 0.88], top: [1.02, 1.02, 1.02] },
	});

	return mergeGeometries(parts);
}

/**
 * Low-Poly Stylized Bush & Shrub Geometry with Ambient Depth Shading
 */
export function createFacetedBushGeometry(): BufferGeometry {
	const main = new IcosahedronGeometry(0.85, 1);
	const side1 = new IcosahedronGeometry(0.68, 1);
	const side2 = new IcosahedronGeometry(0.62, 1);

	// Flatten bottoms so bushes rest naturally on the terrain
	const flatten = (geom: BufferGeometry) => {
		const pos = geom.attributes.position;
		for (let i = 0; i < pos.count; i++) {
			const y = pos.getY(i);
			if (y < -0.15) pos.setY(i, y * 0.4);
		}
		geom.computeVertexNormals();
		return geom;
	};

	return mergeGeometries([
		{
			geometry: flatten(main),
			position: [0, 0.55, 0],
			scale: [1.15, 0.95, 1.15],
			colorGradient: { bottom: [0.72, 0.75, 0.72], top: [1.08, 1.12, 1.08] },
		},
		{
			geometry: flatten(side1),
			position: [-0.48, 0.42, 0.32],
			scale: [0.95, 0.85, 0.95],
			colorGradient: { bottom: [0.74, 0.76, 0.74], top: [1.06, 1.10, 1.06] },
		},
		{
			geometry: flatten(side2),
			position: [0.46, 0.38, -0.28],
			scale: [0.9, 0.8, 0.9],
			colorGradient: { bottom: [0.74, 0.76, 0.74], top: [1.06, 1.10, 1.06] },
		},
	]);
}

/**
 * Low-Poly Granite Boulder & Mossy Outcrop Geometry
 */
export function createLowPolyRockGeometry(): BufferGeometry {
	const shape = new IcosahedronGeometry(1.0, 1);
	const pos = shape.attributes.position;
	for (let i = 0; i < pos.count; i++) {
		const x = pos.getX(i);
		const y = pos.getY(i);
		const z = pos.getZ(i);
		const flattenedY = y < -0.1 ? y * 0.35 : y * 0.88;
		const facetNoise = 1.0 + Math.sin(x * 3.5 + z * 2.8) * 0.14 + Math.cos(y * 4.2 - x * 2.1) * 0.08;
		pos.setXYZ(i, x * facetNoise * 1.3, flattenedY * facetNoise, z * facetNoise * 1.1);
	}
	shape.computeVertexNormals();

	return mergeGeometries([
		{
			geometry: shape,
			position: [0, 0, 0],
			colorGradient: { bottom: [0.82, 0.84, 0.82], top: [1.06, 1.06, 1.06] },
		},
	]);
}
