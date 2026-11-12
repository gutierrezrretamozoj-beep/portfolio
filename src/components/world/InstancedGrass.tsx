"use client";

import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
	BufferAttribute,
	BufferGeometry,
	Color,
	DoubleSide,
	InstancedMesh,
	MathUtils,
	MeshStandardMaterial,
	Object3D,
	Vector3,
} from "three";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { PlayerRuntime } from "@/types/world";

type InstancedGrassProps = {
	quality: "LOW" | "MEDIUM" | "HIGH";
	playerRef?: { current: PlayerRuntime };
	distanceToPaths: (x: number, z: number) => number;
};

function createBladeGeometry() {
	const geometry = new BufferGeometry();
	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];
	const blades = [
		{ angle: -0.9, height: 0.58, lean: 0.15, x: -0.045, z: -0.02, width: 0.065 },
		{ angle: -0.1, height: 0.78, lean: 0.22, x: -0.01, z: 0.02, width: 0.07 },
		{ angle: 0.75, height: 0.65, lean: 0.17, x: 0.035, z: 0.015, width: 0.065 },
		{ angle: 1.65, height: 0.52, lean: 0.14, x: 0.01, z: -0.035, width: 0.058 },
	];

	for (const blade of blades) {
		const directionX = Math.sin(blade.angle);
		const directionZ = Math.cos(blade.angle);
		const sideX = Math.cos(blade.angle);
		const sideZ = -Math.sin(blade.angle);
		const firstVertex = positions.length / 3;

		for (let level = 0; level <= 2; level += 1) {
			const progress = level / 2;
			const bend = blade.lean * progress * progress;
			const halfWidth = (blade.width * (1 - progress) + 0.002) * 0.5;
			const centerX = blade.x + directionX * bend;
			const centerZ = blade.z + directionZ * bend;

			for (const side of [-1, 1]) {
				positions.push(
					centerX + sideX * halfWidth * side,
					blade.height * progress,
					centerZ + sideZ * halfWidth * side,
				);
				uvs.push(side === -1 ? 0 : 1, progress);
			}
		}

		for (let segment = 0; segment < 2; segment += 1) {
			const start = firstVertex + segment * 2;
			indices.push(start, start + 1, start + 2, start + 2, start + 1, start + 3);
		}
	}

	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

export function InstancedGrass({ quality, playerRef, distanceToPaths }: InstancedGrassProps) {
	const reducedMotion = Boolean(useReducedMotion());
	const count = quality === "LOW" ? 2200 : quality === "MEDIUM" ? 4500 : 7500;
	const bladeGeometry = useMemo(() => createBladeGeometry(), []);

	const uniforms = useMemo(() => {
		return {
			uTime: { value: 0 },
			uPlayerPosition: { value: new Vector3(0, 0, 20) },
			uRootColor: { value: new Color("#1b3f1c") },
			uMidColor: { value: new Color("#4fa03a") },
			uTipColor: { value: new Color("#a2e652") },
		};
	}, []);

	const grassMaterial = useMemo(() => {
		const mat = new MeshStandardMaterial({
			roughness: 0.82,
			metalness: 0.0,
			side: DoubleSide,
		});

		mat.onBeforeCompile = (shader) => {
			shader.uniforms.uTime = uniforms.uTime;
			shader.uniforms.uPlayerPosition = uniforms.uPlayerPosition;
			shader.uniforms.uRootColor = uniforms.uRootColor;
			shader.uniforms.uMidColor = uniforms.uMidColor;
			shader.uniforms.uTipColor = uniforms.uTipColor;

			shader.vertexShader = `
				uniform float uTime;
				uniform vec3 uPlayerPosition;
				varying vec2 vGrassUv;
				varying vec3 vWorldNormal;
				${shader.vertexShader}
			`;

			shader.vertexShader = shader.vertexShader.replace(
				"#include <begin_vertex>",
				`
				#include <begin_vertex>
				vGrassUv = uv;

				vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
				float heightFactor = clamp(uv.y, 0.0, 1.0);

				float windX = sin(uTime * 2.4 + worldPos.x * 0.45 + worldPos.z * 0.3) * 0.14
				            + cos(uTime * 1.5 + worldPos.x * 0.8) * 0.06;
				float windZ = cos(uTime * 2.1 + worldPos.z * 0.4) * 0.12;

				transformed.x += windX * heightFactor * 0.35;
				transformed.z += windZ * heightFactor * 0.35;

				vec2 toPlayer = worldPos.xz - uPlayerPosition.xz;
				float distToPlayer = length(toPlayer);
				float pushRadius = 1.35;
				if (distToPlayer < pushRadius && distToPlayer > 0.001) {
					float pushStrength = (1.0 - distToPlayer / pushRadius);
					vec2 pushDir = normalize(toPlayer);
					transformed.x += pushDir.x * pushStrength * 0.45 * heightFactor;
					transformed.z += pushDir.y * pushStrength * 0.45 * heightFactor;
					transformed.y -= pushStrength * 0.18 * heightFactor;
				}
				`
			);

			shader.fragmentShader = `
				uniform vec3 uRootColor;
				uniform vec3 uMidColor;
				uniform vec3 uTipColor;
				varying vec2 vGrassUv;
				${shader.fragmentShader}
			`;

			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <color_fragment>",
				`
				#include <color_fragment>
				vec3 grassCol = mix(uRootColor, uMidColor, smoothstep(0.0, 0.45, vGrassUv.y));
				grassCol = mix(grassCol, uTipColor, smoothstep(0.45, 1.0, vGrassUv.y));
				float tipShine = smoothstep(0.72, 1.0, vGrassUv.y) * 0.14;
				diffuseColor.rgb = grassCol + vec3(tipShine * 0.8, tipShine, tipShine * 0.35);
				`
			);
		};

		mat.customProgramCacheKey = () => "stylized-instanced-grass-pbr-v2";
		return mat;
	}, [uniforms]);

	const instances = useMemo(() => {
		const dummy = new Object3D();
		const matrices = [];

		let placed = 0;
		let attempts = 0;
		const maxAttempts = count * 5;

		while (placed < count && attempts < maxAttempts) {
			attempts++;
			const x = MathUtils.randFloat(-26, 26);
			const z = MathUtils.randFloat(-30, 24);

			const riverCenter = -2.5 + Math.sin(x * 0.13) * 0.75;
			if (Math.abs(z - riverCenter) < 1.95) continue;
			if (z < -25 && Math.abs(x) < 5.8) continue;
			if (distanceToPaths(x, z) < 1.05) continue;

			const y = terrainHeight(x, z);
			const scaleY = MathUtils.randFloat(0.85, 1.45);
			const scaleXZ = MathUtils.randFloat(1.0, 1.45);
			const rotationY = MathUtils.randFloat(0, Math.PI * 2);
			const tiltX = MathUtils.randFloat(-0.15, 0.15);
			const tiltZ = MathUtils.randFloat(-0.15, 0.15);

			dummy.position.set(x, y + 0.02, z);
			dummy.rotation.set(tiltX, rotationY, tiltZ);
			dummy.scale.set(scaleXZ, scaleY, scaleXZ);
			dummy.updateMatrix();

			for (let i = 0; i < 16; i++) {
				matrices.push(dummy.matrix.elements[i]);
			}
			placed++;
		}

		return {
			count: placed,
			buffer: new Float32Array(matrices),
		};
	}, [count, distanceToPaths]);

	useFrame(({ clock }) => {
		if (!reducedMotion) uniforms.uTime.value = clock.elapsedTime;
		if (playerRef?.current) {
			uniforms.uPlayerPosition.value.set(
				playerRef.current.position.x,
				playerRef.current.position.y,
				playerRef.current.position.z
			);
		}
	});

	const meshRef = useRef<InstancedMesh>(null);

	useLayoutEffect(() => {
		const mesh = meshRef.current;
		if (!mesh) return;
		mesh.geometry = bladeGeometry;
		mesh.castShadow = false;
		mesh.receiveShadow = true;
		for (let i = 0; i < instances.count; i++) {
			const offset = i * 16;
			mesh.instanceMatrix.array.set(instances.buffer.subarray(offset, offset + 16), offset);
		}
		mesh.instanceMatrix.needsUpdate = true;
	}, [bladeGeometry, instances, quality]);

	return (
		<instancedMesh
			key={quality}
			ref={meshRef}
			args={[bladeGeometry, grassMaterial, instances.count]}
		>
			<primitive object={grassMaterial} attach="material" />
		</instancedMesh>
	);
}
