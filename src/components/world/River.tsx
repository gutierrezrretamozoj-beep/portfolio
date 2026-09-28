"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import {
	BufferAttribute,
	BufferGeometry,
	CatmullRomCurve3,
	Color,
	DoubleSide,
	Mesh,
	MeshPhysicalMaterial,
	Vector3,
} from "three";

function riverCurve(x: number) {
	return -2.5 + Math.sin(x * 0.13) * 0.75;
}

function createWater() {
	const segments = 140;
	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let index = 0; index <= segments; index += 1) {
		const x = -29 + (58 * index) / segments;
		const center = riverCurve(x);
		positions.push(x, 0.02, center - 1.7, x, 0.02, center + 1.7);
		uvs.push(index / segments, 0, index / segments, 1);

		if (index < segments) {
			const start = index * 2;
			indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

function createCreek() {
	const curve = new CatmullRomCurve3([
		new Vector3(0.15, 0, -3.8),
		new Vector3(-0.72, 0, -8.5),
		new Vector3(0.82, 0, -13.5),
		new Vector3(-0.58, 0, -19.2),
		new Vector3(0.12, 0, -25.5),
	]);
	const segments = 80;
	const positions: number[] = [];
	const uvs: number[] = [];
	const indices: number[] = [];

	for (let index = 0; index <= segments; index += 1) {
		const point = curve.getPoint(index / segments);
		const tangent = curve.getTangent(index / segments);
		const halfWidth = 0.68 * (0.75 + Math.sin((index / segments) * Math.PI) * 0.25);

		for (const sign of [-1, 1]) {
			positions.push(point.x + tangent.z * halfWidth * sign, 0.09, point.z - tangent.x * halfWidth * sign);
			uvs.push(index / segments, sign === -1 ? 0 : 1);
		}

		if (index < segments) {
			const start = index * 2;
			indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
		}
	}

	const geometry = new BufferGeometry();
	geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
	geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
	geometry.setIndex(indices);
	geometry.computeVertexNormals();
	return geometry;
}

function MovingWater({ reducedMotion }: { reducedMotion: boolean }) {
	const water = useRef<Mesh>(null);
	const creek = useRef<Mesh>(null);
	const geometry = useMemo(() => createWater(), []);
	const creekGeometry = useMemo(() => createCreek(), []);
	const timeUniform = useMemo(() => ({ value: 0 }), []);

	const waterMaterial = useMemo(() => {
		const material = new MeshPhysicalMaterial({
			color: "#38bdf8",
			roughness: 0.12,
			metalness: 0.08,
			transparent: true,
			opacity: 0.88,
			transmission: 0.35,
			ior: 1.333,
			clearcoat: 1.0,
			clearcoatRoughness: 0.1,
			side: DoubleSide,
		});

		material.onBeforeCompile = (shader) => {
			shader.uniforms.uTime = timeUniform;

			shader.vertexShader = `
				uniform float uTime;
				varying vec2 vWaterUv;
				varying vec3 vWorldPosition;
				${shader.vertexShader}
			`;

			shader.vertexShader = shader.vertexShader.replace(
				"#include <begin_vertex>",
				`
				#include <begin_vertex>
				vWaterUv = uv;

				float wave1 = sin(uv.x * 42.0 - uTime * 2.2) * 0.032;
				float wave2 = cos(uv.x * 24.0 + uv.y * 12.0 - uTime * 1.5) * 0.02;
				float wave3 = sin(uv.x * 12.0 + uTime * 0.8) * 0.015;

				float bankFactor = smoothstep(0.0, 0.25, min(uv.y, 1.0 - uv.y));
				transformed.y += (wave1 + wave2 + wave3) * bankFactor;

				vec4 worldPos = modelMatrix * vec4(transformed, 1.0);
				vWorldPosition = worldPos.xyz;
				`
			);

			shader.fragmentShader = `
				uniform float uTime;
				varying vec2 vWaterUv;
				varying vec3 vWorldPosition;
				${shader.fragmentShader}
			`;

			shader.fragmentShader = shader.fragmentShader.replace(
				"#include <color_fragment>",
				`
				#include <color_fragment>

				vec3 deepWater = vec3(0.01, 0.45, 0.75);
				vec3 midWater  = vec3(0.22, 0.74, 0.97);
				vec3 shallow   = vec3(0.65, 0.95, 0.88);
				vec3 foamColor = vec3(0.96, 0.99, 1.0);

				float edgeDist = min(vWaterUv.y, 1.0 - vWaterUv.y);

				float foamNoise = sin(vWaterUv.x * 55.0 + uTime * 2.5) * 0.03
				                + cos(vWaterUv.x * 28.0 - uTime * 1.8) * 0.02;
				float foam = 1.0 - smoothstep(0.01, 0.16 + foamNoise, edgeDist);

				float c1 = sin(vWaterUv.x * 48.0 - uTime * 2.0 + vWaterUv.y * 22.0);
				float c2 = cos(vWaterUv.x * 32.0 + uTime * 1.4 - vWaterUv.y * 28.0);
				float causticPattern = pow(max(0.0, c1 * c2), 3.0) * 0.45;

				vec3 waterCol = mix(deepWater, midWater, smoothstep(0.1, 0.4, edgeDist));
				waterCol = mix(waterCol, shallow, smoothstep(0.4, 0.0, edgeDist));
				waterCol = mix(waterCol, foamColor, foam * 0.75 + causticPattern * 0.1);

				diffuseColor.rgb = waterCol;
				`
			);
		};

		material.customProgramCacheKey = () => "stylized-realistic-water-v2";
		return material;
	}, [timeUniform]);

	useFrame(({ clock }) => {
		if (reducedMotion) return;
		timeUniform.value = clock.elapsedTime;
	});

	return (
		<>
			<mesh ref={water} geometry={geometry} receiveShadow>
				<primitive object={waterMaterial} attach="material" />
			</mesh>
			<mesh ref={creek} geometry={creekGeometry} receiveShadow>
				<primitive object={waterMaterial} attach="material" />
			</mesh>
		</>
	);
}

function Lake() {
	return (
		<group position={[0, 0.08, -28]}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1.15, 0.88, 1]} receiveShadow>
				<circleGeometry args={[5.6, 64]} />
				<meshPhysicalMaterial
					color="#0284c7"
					roughness={0.08}
					metalness={0.05}
					transparent
					opacity={0.92}
					clearcoat={1.0}
					clearcoatRoughness={0.05}
					side={DoubleSide}
				/>
			</mesh>

			{[0, 1, 2].map((index) => (
				<mesh
					key={index}
					rotation={[-Math.PI / 2, 0, 0]}
					position={[0, 0.025 + index * 0.006, 0]}
					scale={[0.58 + index * 0.16, 0.48 + index * 0.15, 1]}
				>
					<ringGeometry args={[4.2, 4.32, 64]} />
					<meshBasicMaterial color="#e0f2fe" transparent opacity={0.38 - index * 0.08} side={DoubleSide} />
				</mesh>
			))}
		</group>
	);
}

function Waterfall() {
	const curtain = useRef<Mesh>(null);
	const mistRef = useRef<Mesh>(null);

	useFrame(({ clock }) => {
		const t = clock.elapsedTime;
		if (curtain.current) {
			curtain.current.position.x = -22 + Math.sin(t * 1.5) * 0.03;
		}
		if (mistRef.current) {
			mistRef.current.scale.set(
				1.2 + Math.sin(t * 3.0) * 0.15,
				0.8 + Math.cos(t * 2.5) * 0.1,
				1.2 + Math.sin(t * 3.0) * 0.15
			);
		}
	});

	return (
		<group position={[-22, 1.5, -2.4]}>
			<mesh ref={curtain}>
				<planeGeometry args={[2.6, 3.2, 2, 12]} />
				<meshPhysicalMaterial
					color="#cffafe"
					transparent
					opacity={0.75}
					roughness={0.08}
					clearcoat={1.0}
					side={DoubleSide}
				/>
			</mesh>

			<mesh ref={mistRef} position={[0, -1.35, 0.35]}>
				<sphereGeometry args={[0.9, 16, 12]} />
				<meshBasicMaterial color="#f0fdfa" transparent opacity={0.32} depthWrite={false} />
			</mesh>

			<mesh position={[0, -1.52, 0]} scale={[1.8, 0.42, 0.72]}>
				<icosahedronGeometry args={[1, 1]} />
				<meshStandardMaterial color="#8a9a89" roughness={0.88} />
			</mesh>
			<mesh position={[0.75, -1.45, 0.18]} scale={[0.78, 0.32, 0.58]}>
				<dodecahedronGeometry args={[1, 1]} />
				<meshStandardMaterial color="#798978" roughness={0.88} />
			</mesh>
		</group>
	);
}

export function River() {
	const reducedMotion = Boolean(useReducedMotion());
	return (
		<group>
			<MovingWater reducedMotion={reducedMotion} />
			<Lake />
			<Waterfall />
		</group>
	);
}
