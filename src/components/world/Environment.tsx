"use client";

import { Sky } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useReducedMotion } from "motion/react";
import { type ElementRef, type MutableRefObject, useLayoutEffect, useMemo, useRef } from "react";
import {
	AdditiveBlending,
	AmbientLight,
	BackSide,
	BoxGeometry,
	BufferAttribute,
	BufferGeometry,
	Color,
	CylinderGeometry,
	DirectionalLight,
	DoubleSide,
	FogExp2,
	Group,
	HemisphereLight,
	IcosahedronGeometry,
	InstancedMesh,
	MathUtils,
	MeshBasicMaterial,
	MeshStandardMaterial,
	Object3D,
	Points,
	PointsMaterial,
	ShaderMaterial,
	SphereGeometry,
	Vector3,
} from "three";
import { HorizonForest } from "@/components/world/HorizonForest";

const SHARED_CLOUD_LOBE_GEO = new SphereGeometry(1, 10, 8);
const SHARED_PETAL_GEO = new SphereGeometry(1, 6, 5);
const SHARED_BUTTERFLY_WING_GEO = new BoxGeometry(1, 1, 1);
const SHARED_BUTTERFLY_BODY_GEO = new CylinderGeometry(1, 1, 1, 6);
const SHARED_BUTTERFLY_BODY_MAT = new MeshStandardMaterial({ color: "#27272a", roughness: 0.6 });
const SHARED_BUTTERFLY_WING_MATS: Record<string, MeshStandardMaterial> = {
	"#f472b6": new MeshStandardMaterial({ color: "#f472b6", roughness: 0.3, emissive: "#f472b6", emissiveIntensity: 0.2 }),
	"#38bdf8": new MeshStandardMaterial({ color: "#38bdf8", roughness: 0.3, emissive: "#38bdf8", emissiveIntensity: 0.2 }),
	"#fde047": new MeshStandardMaterial({ color: "#fde047", roughness: 0.3, emissive: "#fde047", emissiveIntensity: 0.2 }),
	"#c084fc": new MeshStandardMaterial({ color: "#c084fc", roughness: 0.3, emissive: "#c084fc", emissiveIntensity: 0.2 }),
	"#fb923c": new MeshStandardMaterial({ color: "#fb923c", roughness: 0.3, emissive: "#fb923c", emissiveIntensity: 0.2 }),
};

const mountainData = [
	[-32, 5.2, -68, 8.5, "#436154"],
	[-18, 5.8, -74, 9.6, "#3c594c"],
	[-2, 6.8, -80, 11.2, "#4a685b"],
	[16, 5.6, -72, 9.2, "#415f52"],
	[32, 4.8, -66, 8.2, "#49665a"],
	[-46, 4.2, -60, 7.5, "#4d6b5f"],
	[44, 4.4, -60, 7.8, "#4d6b5f"],
] as const;

function Mountain({
	position,
	color,
	scale,
	isNight,
}: {
	position: [number, number, number];
	color: string;
	scale: number;
	isNight: boolean;
}) {
	const geometry = useMemo(() => {
		const shape = new IcosahedronGeometry(1, 3);
		const positions = shape.attributes.position;
		const vertexColors: number[] = [];
		const rockColor = new Color(color);
		const snowColor = new Color("#fdf2f8");
		for (let index = 0; index < positions.count; index += 1) {
			const x = positions.getX(index);
			const y = positions.getY(index);
			const z = positions.getZ(index);
			const ridge = Math.sin(x * 6 + z * 4) * 0.05 + Math.cos(z * 9 - y * 3) * 0.035;
			const variation = 1 + Math.sin(x * 7 + z * 4) * 0.08 + Math.cos(y * 10 - x * 2) * 0.04;
			const peakTaper = 1 - Math.max(0, y) * 0.16;
			const peakLift = y > 0 ? y * y * 0.18 : 0;
			positions.setXYZ(index, x * variation * peakTaper, y * variation + peakLift, z * variation * peakTaper);
			const snow = Math.max(0, Math.min(1, (y + ridge - 0.42) * 8.0));
			const shadedRock = rockColor.clone().multiplyScalar(0.85 + (Math.sin(x * 15 + z * 11) * 0.06 + 0.06));
			const finalColor = shadedRock.lerp(snowColor, snow);
			vertexColors.push(finalColor.r, finalColor.g, finalColor.b);
		}
		shape.setAttribute("color", new BufferAttribute(new Float32Array(vertexColors), 3));
		shape.computeVertexNormals();
		return shape;
	}, [color]);

	const matRef = useRef<MeshStandardMaterial>(null);
	const curNight = useRef(isNight ? 1 : 0);
	const dayTint = useMemo(() => new Color("#ffffff"), []);
	const nightTint = useMemo(() => new Color("#73858c"), []);
	const tempColor = useMemo(() => new Color(), []);

	useFrame((_, delta) => {
		if (matRef.current) {
			curNight.current = MathUtils.damp(curNight.current, isNight ? 1 : 0, 1.1, delta);
			tempColor.copy(dayTint).lerp(nightTint, curNight.current);
			matRef.current.color.copy(tempColor);
		}
	});

	return (
		<mesh geometry={geometry} position={position} scale={[scale * 1.55, scale * 1.1, scale * 0.85]}>
			<meshStandardMaterial
				ref={matRef}
				vertexColors
				roughness={0.88}
				metalness={0.02}
			/>
		</mesh>
	);
}

type CelestialSharedState = {
	sunPos: Vector3;
	moonPos: Vector3;
	sunVis: number;
	moonVis: number;
};

/**
 * True 3D volumetric Sun sphere with animated solar plasma granulation, limb darkening,
 * and 3D Fresnel atmospheric corona shells. Follows the real-time East -> Zenith -> West orbit.
 */
function CelestialSun({
	orbitRef,
	initialPos,
}: {
	orbitRef: MutableRefObject<CelestialSharedState>;
	initialPos: [number, number, number];
}) {
	const groupRef = useRef<Group>(null);
	const coreRef = useRef<Group>(null);

	const sunCoreMaterial = useMemo(() => {
		return new ShaderMaterial({
			uniforms: {
				uTime: { value: 0 },
				uOpacity: { value: 1 },
			},
			vertexShader: `
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				varying vec3 vLocalPos;
				void main() {
					vLocalPos = position;
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vNormalDir = normalize(mat3(modelMatrix) * normal);
					vViewDir = normalize(cameraPosition - worldPos.xyz);
					gl_Position = projectionMatrix * viewMatrix * worldPos;
				}
			`,
			fragmentShader: `
				uniform float uTime;
				uniform float uOpacity;
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				varying vec3 vLocalPos;
				void main() {
					float ndotv = max(0.0, dot(normalize(vNormalDir), normalize(vViewDir)));
					vec3 p = normalize(vLocalPos);
					float gran = sin(p.x * 11.0 + uTime * 0.7) * cos(p.y * 11.0 - uTime * 0.5) * sin(p.z * 11.0 + uTime * 0.6);
					float limb = pow(ndotv, 0.55);
					vec3 hotCore = vec3(1.0, 0.99, 0.90);
					vec3 goldRim = vec3(1.0, 0.62, 0.14);
					vec3 col = mix(goldRim, hotCore, clamp(limb + gran * 0.08, 0.0, 1.0));
					gl_FragColor = vec4(col, uOpacity);
				}
			`,
			transparent: true,
			depthWrite: true,
			fog: false,
		});
	}, []);

	const innerCoronaMaterial = useMemo(() => {
		return new ShaderMaterial({
			uniforms: {
				uOpacity: { value: 1 },
			},
			vertexShader: `
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vNormalDir = normalize(mat3(modelMatrix) * normal);
					vViewDir = normalize(cameraPosition - worldPos.xyz);
					gl_Position = projectionMatrix * viewMatrix * worldPos;
				}
			`,
			fragmentShader: `
				uniform float uOpacity;
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					float rim = max(0.0, dot(normalize(-vNormalDir), normalize(vViewDir)));
					float glow = pow(rim, 2.2) * 0.72;
					gl_FragColor = vec4(vec3(1.0, 0.86, 0.42), glow * uOpacity);
				}
			`,
			transparent: true,
			blending: AdditiveBlending,
			side: BackSide,
			depthWrite: false,
			fog: false,
		});
	}, []);

	const outerCoronaMaterial = useMemo(() => {
		return new ShaderMaterial({
			uniforms: {
				uOpacity: { value: 1 },
			},
			vertexShader: `
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vNormalDir = normalize(mat3(modelMatrix) * normal);
					vViewDir = normalize(cameraPosition - worldPos.xyz);
					gl_Position = projectionMatrix * viewMatrix * worldPos;
				}
			`,
			fragmentShader: `
				uniform float uOpacity;
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					float rim = max(0.0, dot(normalize(-vNormalDir), normalize(vViewDir)));
					float glow = pow(rim, 3.0) * 0.42;
					gl_FragColor = vec4(vec3(1.0, 0.56, 0.16), glow * uOpacity);
				}
			`,
			transparent: true,
			blending: AdditiveBlending,
			side: BackSide,
			depthWrite: false,
			fog: false,
		});
	}, []);

	useFrame(({ clock }) => {
		const { sunPos, sunVis } = orbitRef.current;
		if (groupRef.current) {
			groupRef.current.position.copy(sunPos);
			groupRef.current.visible = sunVis > 0.01;
		}
		if (coreRef.current) {
			coreRef.current.rotation.y = clock.elapsedTime * 0.04;
		}
		sunCoreMaterial.uniforms.uTime.value = clock.elapsedTime;
		sunCoreMaterial.uniforms.uOpacity.value = sunVis;
		innerCoronaMaterial.uniforms.uOpacity.value = sunVis;
		outerCoronaMaterial.uniforms.uOpacity.value = sunVis;
	});

	return (
		<group ref={groupRef} position={initialPos}>
			<group ref={coreRef}>
				<mesh material={sunCoreMaterial}>
					<sphereGeometry args={[5.2, 32, 32]} />
				</mesh>
			</group>
			<mesh material={innerCoronaMaterial}>
				<sphereGeometry args={[7.4, 28, 28]} />
			</mesh>
			<mesh material={outerCoronaMaterial}>
				<sphereGeometry args={[10.8, 24, 24]} />
			</mesh>
		</group>
	);
}

/**
 * True 3D volumetric Moon sphere with procedural 3D craters/maria, real solar direction shading,
 * soft earthshine, and a 3D silvery-indigo atmospheric halo.
 */
function CelestialMoon({
	orbitRef,
	initialPos,
}: {
	orbitRef: MutableRefObject<CelestialSharedState>;
	initialPos: [number, number, number];
}) {
	const groupRef = useRef<Group>(null);
	const sphereRef = useRef<Group>(null);

	const moonMaterial = useMemo(() => {
		return new ShaderMaterial({
			uniforms: {
				uOpacity: { value: 1 },
				uSunDir: { value: new Vector3(1, 0.3, 0).normalize() },
			},
			vertexShader: `
				varying vec3 vWorldNormal;
				varying vec3 vLocalPos;
				void main() {
					vLocalPos = normalize(position);
					vWorldNormal = normalize(mat3(modelMatrix) * normal);
					gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
				}
			`,
			fragmentShader: `
				uniform float uOpacity;
				uniform vec3 uSunDir;
				varying vec3 vWorldNormal;
				varying vec3 vLocalPos;
				void main() {
					vec3 n = normalize(vWorldNormal);
					vec3 p = normalize(vLocalPos);

					// Procedural 3D lunar maria & craters on sphere surface
					float maria = sin(p.x * 4.2 + 0.8) * cos(p.y * 3.8 - 0.5) * sin(p.z * 4.5);
					float crater1 = smoothstep(0.28, 0.14, length(p - normalize(vec3(0.35, 0.25, 0.88))));
					float crater2 = smoothstep(0.24, 0.11, length(p - normalize(vec3(-0.42, -0.32, 0.82))));
					float crater3 = smoothstep(0.20, 0.09, length(p - normalize(vec3(-0.22, 0.48, 0.84))));
					float micro = sin(p.x * 18.0) * cos(p.y * 18.0) * sin(p.z * 18.0) * 0.04;

					vec3 highland = vec3(0.95, 0.97, 1.0);
					vec3 mareCol  = vec3(0.68, 0.75, 0.86);
					vec3 albedo = mix(highland, mareCol, clamp(maria * 0.55 + 0.32, 0.0, 0.72));
					albedo = mix(albedo, vec3(0.58, 0.65, 0.77), clamp(crater1 * 0.55 + crater2 * 0.5 + crater3 * 0.45, 0.0, 0.7));
					albedo += micro;

					// Physical 3D solar illumination + soft cool earthshine so the 3D sphere stays legible
					float ndotl = dot(n, normalize(uSunDir));
					float lit = smoothstep(-0.25, 0.45, ndotl);
					vec3 earthshine = vec3(0.26, 0.34, 0.52);
					vec3 finalCol = albedo * mix(earthshine, vec3(1.0), lit);

					gl_FragColor = vec4(finalCol, uOpacity);
				}
			`,
			transparent: true,
			depthWrite: true,
			fog: false,
		});
	}, []);

	const moonHaloMaterial = useMemo(() => {
		return new ShaderMaterial({
			uniforms: {
				uOpacity: { value: 1 },
			},
			vertexShader: `
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					vec4 worldPos = modelMatrix * vec4(position, 1.0);
					vNormalDir = normalize(mat3(modelMatrix) * normal);
					vViewDir = normalize(cameraPosition - worldPos.xyz);
					gl_Position = projectionMatrix * viewMatrix * worldPos;
				}
			`,
			fragmentShader: `
				uniform float uOpacity;
				varying vec3 vNormalDir;
				varying vec3 vViewDir;
				void main() {
					float rim = max(0.0, dot(normalize(-vNormalDir), normalize(vViewDir)));
					float glow = pow(rim, 2.5) * 0.48;
					gl_FragColor = vec4(vec3(0.68, 0.86, 1.0), glow * uOpacity);
				}
			`,
			transparent: true,
			blending: AdditiveBlending,
			side: BackSide,
			depthWrite: false,
			fog: false,
		});
	}, []);

	useFrame(() => {
		const { sunPos, moonPos, moonVis } = orbitRef.current;
		if (groupRef.current) {
			groupRef.current.position.copy(moonPos);
			groupRef.current.visible = moonVis > 0.01;
		}
		moonMaterial.uniforms.uOpacity.value = moonVis;
		moonMaterial.uniforms.uSunDir.value.copy(sunPos).sub(moonPos).normalize();
		moonHaloMaterial.uniforms.uOpacity.value = moonVis;
	});

	return (
		<group ref={groupRef} position={initialPos}>
			<group ref={sphereRef}>
				<mesh material={moonMaterial}>
					<sphereGeometry args={[4.2, 36, 36]} />
				</mesh>
			</group>
			<mesh material={moonHaloMaterial}>
				<sphereGeometry args={[6.0, 24, 24]} />
			</mesh>
		</group>
	);
}

/**
 * Glittering Starfield for deep starry nights with smooth fading
 */
function Starfield({ targetOpacity }: { targetOpacity: number }) {
	const starsRef = useRef<Points>(null);
	const starsMatRef = useRef<PointsMaterial>(null);
	const curOpacity = useRef(targetOpacity);
	const count = 380;

	const geometry = useMemo(() => {
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			const theta = Math.random() * Math.PI * 2;
			const phi = Math.acos(Math.random() * 0.85 + 0.15);
			const r = 85 + Math.random() * 25;

			pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
			pos[i * 3 + 1] = r * Math.cos(phi);
			pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
		}
		const geom = new BufferGeometry();
		geom.setAttribute("position", new BufferAttribute(pos, 3));
		return geom;
	}, [count]);

	useFrame(({ clock }, delta) => {
		const dampSpeed = 1.1;
		curOpacity.current = MathUtils.damp(curOpacity.current, targetOpacity, dampSpeed, delta);
		if (starsRef.current) {
			starsRef.current.rotation.y = clock.elapsedTime * 0.006;
			starsRef.current.visible = curOpacity.current > 0.01;
		}
		if (starsMatRef.current) {
			starsMatRef.current.opacity = curOpacity.current * 0.9;
		}
	});

	return (
		<points ref={starsRef} geometry={geometry}>
			<pointsMaterial
				ref={starsMatRef}
				size={1.35}
				color="#e0f2fe"
				transparent
				opacity={targetOpacity * 0.9}
				depthWrite={false}
			/>
		</points>
	);
}

/**
 * Procedural Volumetric Stylized Clouds with day/night adaptive shading
 */
function DriftingVolumetricCloud({
	initialPos,
	scale,
	speed,
	reducedMotion,
	nightFactor,
}: {
	initialPos: [number, number, number];
	scale: number;
	speed: number;
	reducedMotion: boolean;
	nightFactor: number;
}) {
	const cloudRef = useRef<Group>(null);
	const currentX = useRef(initialPos[0]);
	const curNightFactor = useRef(nightFactor);
	const dayCol = useMemo(() => new Color("#fef4ea"), []);
	const nightCol = useMemo(() => new Color("#25334d"), []);
	const tempCol = useMemo(() => new Color(), []);
	const cloudMat = useMemo(() => new MeshBasicMaterial({ color: "#fef4ea", transparent: true, opacity: 0.55, depthWrite: false }), []);

	useFrame((_, delta) => {
		if (!cloudRef.current) return;
		if (!reducedMotion) {
			const dt = Math.min(delta, 0.05);
			currentX.current += speed * dt;
			if (currentX.current > 68) {
				currentX.current = -68;
			}
			cloudRef.current.position.x = currentX.current;
		}

		// Smooth gradual 4.5s transition of cloud shading
		const dampSpeed = 1.1;
		curNightFactor.current = MathUtils.damp(curNightFactor.current, nightFactor, dampSpeed, delta);
		tempCol.copy(dayCol).lerp(nightCol, curNightFactor.current);
		cloudMat.color.copy(tempCol);
		cloudMat.opacity = MathUtils.lerp(0.55, 0.42, curNightFactor.current);
	});

	return (
		<group ref={cloudRef} position={initialPos} scale={scale}>
			{[
				{ pos: [-1.2, 0, 0], scale: [1.45, 0.55, 0.75] },
				{ pos: [-0.4, 0.32, 0.15], scale: [1.65, 0.72, 0.9] },
				{ pos: [0.55, 0.18, -0.1], scale: [1.55, 0.6, 0.85] },
				{ pos: [1.35, -0.05, 0.05], scale: [1.25, 0.48, 0.7] },
				{ pos: [0.1, -0.18, 0.25], scale: [1.35, 0.45, 0.65] },
			].map((lobe, index) => (
				<mesh
					key={index}
					geometry={SHARED_CLOUD_LOBE_GEO}
					material={cloudMat}
					position={lobe.pos as [number, number, number]}
					scale={lobe.scale as [number, number, number]}
				/>
			))}
		</group>
	);
}

/**
 * Floating sunlit pollen motes, fairy fireflies and drifting flower petals
 */
function DreamMotesAndPetals({ reducedMotion, isNight }: { reducedMotion: boolean; isNight: boolean }) {
	const pointsRef = useRef<Points>(null);
	const motesMatRef = useRef<PointsMaterial>(null);
	const petalsMeshRef = useRef<InstancedMesh>(null);
	const curNight = useRef(isNight ? 1 : 0);
	const dayMoteColor = useMemo(() => new Color("#fef08a"), []);
	const nightMoteColor = useMemo(() => new Color("#a7f3d0"), []);
	const tempColor = useMemo(() => new Color(), []);
	const petalDummy = useMemo(() => new Object3D(), []);
	const count = 140;

	const { geometry } = useMemo(() => {
		const pos = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			pos[i * 3] = (Math.random() - 0.5) * 54;
			pos[i * 3 + 1] = Math.random() * 9 + 0.6;
			pos[i * 3 + 2] = (Math.random() - 0.5) * 54;
		}
		const geom = new BufferGeometry();
		geom.setAttribute("position", new BufferAttribute(pos, 3));
		return { geometry: geom };
	}, [count]);

	const petalInstances = useMemo(() => {
		return Array.from({ length: 24 }, (_, i) => ({
			baseX: (Math.random() - 0.5) * 44,
			baseY: Math.random() * 6 + 1.2,
			baseZ: (Math.random() - 0.5) * 44,
			speed: 0.4 + Math.random() * 0.4,
			phase: i * 0.65,
			color: ["#fbcfe8", "#f472b6", "#fed7aa", "#ffffff"][i % 4],
			scale: 0.06 + Math.random() * 0.04,
		}));
	}, []);

	const petalMat = useMemo(
		() => new MeshStandardMaterial({ color: "#ffffff", roughness: 0.5, transparent: true, opacity: 0.85, side: DoubleSide }),
		[],
	);

	useLayoutEffect(() => {
		const mesh = petalsMeshRef.current;
		if (!mesh) return;
		const col = new Color();
		petalInstances.forEach((petal, i) => {
			petalDummy.position.set(petal.baseX, petal.baseY, petal.baseZ);
			petalDummy.rotation.set(0, 0, 0);
			petalDummy.scale.set(petal.scale * 1.4, petal.scale * 0.6, petal.scale);
			petalDummy.updateMatrix();
			mesh.setMatrixAt(i, petalDummy.matrix);
			mesh.setColorAt(i, col.set(petal.color));
		});
		mesh.instanceMatrix.needsUpdate = true;
		if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
	}, [petalInstances, petalDummy]);

	useFrame(({ clock }, delta) => {
		const dampSpeed = 1.1;
		curNight.current = MathUtils.damp(curNight.current, isNight ? 1 : 0, dampSpeed, delta);
		if (motesMatRef.current) {
			tempColor.copy(dayMoteColor).lerp(nightMoteColor, curNight.current);
			motesMatRef.current.color.copy(tempColor);
			motesMatRef.current.size = MathUtils.lerp(0.18, 0.26, curNight.current);
			motesMatRef.current.opacity = MathUtils.lerp(0.55, 0.8, curNight.current);
		}

		if (reducedMotion) return;
		const t = clock.elapsedTime * 0.45;
		if (pointsRef.current) {
			pointsRef.current.rotation.y = t * 0.08;
			pointsRef.current.position.y = Math.sin(t) * 0.35;
		}

		if (petalsMeshRef.current) {
			const mesh = petalsMeshRef.current;
			for (let i = 0; i < petalInstances.length; i++) {
				const petal = petalInstances[i];
				const curTime = clock.elapsedTime * petal.speed;
				petalDummy.position.set(
					petal.baseX + Math.sin(curTime + petal.phase) * 1.5,
					((petal.baseY - ((clock.elapsedTime * 0.3) % 6) + 6) % 6) + 0.5,
					petal.baseZ + Math.cos(curTime * 0.7 + petal.phase) * 1.2,
				);
				petalDummy.rotation.set(curTime * 1.8, 0, Math.sin(curTime * 1.2));
				petalDummy.scale.set(petal.scale * 1.4, petal.scale * 0.6, petal.scale);
				petalDummy.updateMatrix();
				mesh.setMatrixAt(i, petalDummy.matrix);
			}
			mesh.instanceMatrix.needsUpdate = true;
		}
	});

	return (
		<group>
			{/* Golden day pollen or glowing night fairy fireflies */}
			<points ref={pointsRef} geometry={geometry}>
				<pointsMaterial
					ref={motesMatRef}
					size={0.18}
					color="#fef08a"
					transparent
					opacity={0.55}
					depthWrite={false}
				/>
			</points>

			{/* Instanced drifting sakura / blossom petals */}
			<instancedMesh
				ref={petalsMeshRef}
				args={[SHARED_PETAL_GEO, petalMat, petalInstances.length]}
				frustumCulled={false}
			/>
		</group>
	);
}

/**
 * Animated low-poly butterflies fluttering gracefully across the world
 */
function AnimatedButterflies({ reducedMotion }: { reducedMotion: boolean }) {
	const groupRef = useRef<Group>(null);

	const butterflyData = useMemo(() => {
		const colors = ["#f472b6", "#38bdf8", "#fde047", "#c084fc", "#fb923c"];
		return [
			{ origin: [-10, 1.2, 10], radius: 3.5, speed: 0.8, color: colors[0], seed: 0 },
			{ origin: [10, 1.4, 10], radius: 4.0, speed: 0.9, color: colors[1], seed: 1.5 },
			{ origin: [-3, 1.3, 6], radius: 3.0, speed: 1.1, color: colors[2], seed: 3.0 },
			{ origin: [3, 1.2, 6], radius: 3.2, speed: 0.85, color: colors[3], seed: 4.5 },
			{ origin: [0, 1.5, -4], radius: 4.5, speed: 0.75, color: colors[4], seed: 2.2 },
			{ origin: [-14, 1.3, -10], radius: 3.8, speed: 0.95, color: colors[0], seed: 5.1 },
			{ origin: [12, 1.4, 6], radius: 3.4, speed: 1.05, color: colors[1], seed: 3.8 },
			{ origin: [0, 1.2, 16], radius: 4.2, speed: 0.88, color: colors[2], seed: 1.0 },
		];
	}, []);

	useFrame(({ clock }) => {
		if (reducedMotion || !groupRef.current) return;
		const time = clock.elapsedTime;

		groupRef.current.children.forEach((bFly, idx) => {
			const data = butterflyData[idx];
			if (!data) return;

			const angle = time * data.speed + data.seed;
			const x = data.origin[0] + Math.cos(angle) * data.radius;
			const z = data.origin[2] + Math.sin(angle) * data.radius;
			const y = data.origin[1] + Math.sin(time * 3.5 + data.seed) * 0.35;

			bFly.position.set(x, y, z);
			bFly.rotation.y = -angle + Math.PI / 2;

			const flap = Math.sin(time * 16 + data.seed * 4) * 0.75;
			const leftWing = bFly.children[0];
			const rightWing = bFly.children[1];
			if (leftWing && rightWing) {
				leftWing.rotation.z = flap;
				rightWing.rotation.z = -flap;
			}
		});
	});

	return (
		<group ref={groupRef}>
			{butterflyData.map((data, index) => {
				const wingMat = SHARED_BUTTERFLY_WING_MATS[data.color];
				return (
					<group key={index} position={data.origin as [number, number, number]}>
						<mesh position={[-0.045, 0, 0]} scale={[0.08, 0.015, 0.06]} geometry={SHARED_BUTTERFLY_WING_GEO} material={wingMat} />
						<mesh position={[0.045, 0, 0]} scale={[0.08, 0.015, 0.06]} geometry={SHARED_BUTTERFLY_WING_GEO} material={wingMat} />
						<mesh scale={[0.018, 0.018, 0.09]} geometry={SHARED_BUTTERFLY_BODY_GEO} material={SHARED_BUTTERFLY_BODY_MAT} />
					</group>
				);
			})}
		</group>
	);
}

import {
	getCelestialOrbits,
	getContinuousHour,
	TIME_PHASES,
	type TimePhase,
} from "@/components/world/time-system";

export function Environment({
	timePhase = "day",
	cycleSeconds = 0,
	isNight,
}: {
	timePhase?: TimePhase;
	cycleSeconds?: number;
	isNight?: boolean;
}) {
	const { scene } = useThree();
	const reducedMotion = Boolean(useReducedMotion());

	const activePhase: TimePhase = timePhase || (isNight ? "night" : "day");
	const config = TIME_PHASES[activePhase];
	const targetHour = getContinuousHour(activePhase, cycleSeconds);
	const initialOrbits = useMemo(() => getCelestialOrbits(getContinuousHour("dawn", 0)), []);

	const smoothHourRef = useRef<number>(targetHour);
	const orbitRef = useRef<CelestialSharedState>({
		sunPos: new Vector3(...initialOrbits.sunPosition),
		moonPos: new Vector3(...initialOrbits.moonPosition),
		sunVis: initialOrbits.sunVisibility,
		moonVis: initialOrbits.moonVisibility,
	});
	const lightDirVec = useMemo(() => new Vector3(), []);

	const skyRef = useRef<ElementRef<typeof Sky>>(null);
	const dirLightRef = useRef<DirectionalLight>(null);
	const ambLightRef = useRef<AmbientLight>(null);
	const hemiLightRef = useRef<HemisphereLight>(null);

	const fog = useMemo(() => new FogExp2("#b5d6f5", 0.007), []);
	const scratchColors = useMemo(
		() => ({
			dir: new Color(),
			amb: new Color(),
			sky: new Color(),
			ground: new Color(),
			fog: new Color(),
		}),
		[],
	);

	const cloudLayers: Array<{ pos: [number, number, number]; scale: number; speed: number }> = [
		{ pos: [-38, 25, -28], scale: 3.1, speed: 0.45 },
		{ pos: [12, 28, -38], scale: 3.4, speed: 0.35 },
		{ pos: [-18, 31, -18], scale: 2.7, speed: 0.55 },
		{ pos: [35, 26, -24], scale: 3.0, speed: 0.4 },
		{ pos: [-5, 33, 10], scale: 2.6, speed: 0.32 },
	];

	// Smoothly advance orbital hour and damp lighting, fog, and sky dome shader across all phases
	useFrame((_, delta) => {
		const dampSpeed = 1.1;
		const colorFactor = 1 - Math.exp(-dampSpeed * delta);

		// Shortest-arc 24h interpolation so midnight (23:59 -> 00:00) never jumps backward
		let hourDiff = targetHour - smoothHourRef.current;
		if (hourDiff < -12) hourDiff += 24;
		if (hourDiff > 12) hourDiff -= 24;
		smoothHourRef.current = (smoothHourRef.current + hourDiff * (1 - Math.exp(-3.2 * delta)) + 24) % 24;

		const orbits = getCelestialOrbits(smoothHourRef.current);
		orbitRef.current.sunPos.set(...orbits.sunPosition);
		orbitRef.current.moonPos.set(...orbits.moonPosition);
		orbitRef.current.sunVis = orbits.sunVisibility;
		orbitRef.current.moonVis = orbits.moonVisibility;

		// Directional light tracks the active celestial body above the horizon (Sun by day, Moon by night)
		const sunIsUp = orbits.sunPosition[1] > -2;
		const activeBody = sunIsUp ? orbitRef.current.sunPos : orbitRef.current.moonPos;
		lightDirVec.copy(activeBody).normalize().multiplyScalar(60);
		if (lightDirVec.y < 7) lightDirVec.y = 7;

		if (dirLightRef.current) {
			dirLightRef.current.color.lerp(scratchColors.dir.set(config.sunLightColor), colorFactor);
			dirLightRef.current.intensity = MathUtils.damp(dirLightRef.current.intensity, config.sunLightIntensity, dampSpeed, delta);
			dirLightRef.current.position.x = MathUtils.damp(dirLightRef.current.position.x, lightDirVec.x, 3.0, delta);
			dirLightRef.current.position.y = MathUtils.damp(dirLightRef.current.position.y, lightDirVec.y, 3.0, delta);
			dirLightRef.current.position.z = MathUtils.damp(dirLightRef.current.position.z, lightDirVec.z, 3.0, delta);
		}

		// Ambient light
		if (ambLightRef.current) {
			ambLightRef.current.color.lerp(scratchColors.amb.set(config.ambientColor), colorFactor);
			ambLightRef.current.intensity = MathUtils.damp(ambLightRef.current.intensity, config.ambientIntensity, dampSpeed, delta);
		}

		// Hemisphere light
		if (hemiLightRef.current) {
			hemiLightRef.current.color.lerp(scratchColors.sky.set(config.hemisphereSky), colorFactor);
			hemiLightRef.current.groundColor.lerp(scratchColors.ground.set(config.hemisphereGround), colorFactor);
			hemiLightRef.current.intensity = MathUtils.damp(hemiLightRef.current.intensity, config.hemisphereIntensity ?? 0.78, dampSpeed, delta);
		}

		// Fog & background
		fog.color.lerp(scratchColors.fog.set(config.fogColor), colorFactor);
		fog.density = MathUtils.damp(fog.density, config.fogDensity, dampSpeed, delta);

		if (scene.background instanceof Color) {
			scene.background.copy(fog.color);
		}

		// Atmospheric sky dome shader follows the real 3D sun position
		if (skyRef.current?.material?.uniforms) {
			const u = skyRef.current.material.uniforms;
			if (u.sunPosition?.value) {
				u.sunPosition.value.copy(orbitRef.current.sunPos);
			}
			if (u.rayleigh) {
				u.rayleigh.value = MathUtils.damp(u.rayleigh.value, config.skyRayleigh, dampSpeed, delta);
			}
			if (u.turbidity) {
				u.turbidity.value = MathUtils.damp(u.turbidity.value, config.skyTurbidity, dampSpeed, delta);
			}
		}
	});

	const isNocturnal = activePhase === "night" || activePhase === "midnight";

	return (
		<>
			<color attach="background" args={["#b5d6f5"]} />
			<primitive attach="fog" object={fog} />

			{/* Dynamic Atmospheric Sky Dome synchronized to 3D sun orbit */}
			<Sky
				ref={skyRef}
				distance={450000}
				inclination={config.skyInclination}
				azimuth={0.24}
				mieCoefficient={0.004}
				mieDirectionalG={0.89}
			/>

			{/* 3D Volumetric Sun & Moon following continuous East -> Zenith -> West orbits */}
			<CelestialSun orbitRef={orbitRef} initialPos={initialOrbits.sunPosition} />
			<CelestialMoon orbitRef={orbitRef} initialPos={initialOrbits.moonPosition} />

			{/* Twinkling Celestial Starfield */}
			<Starfield targetOpacity={config.starsOpacity} />

			{/* Ambient Fill */}
			<ambientLight ref={ambLightRef} intensity={0.5} color="#ffffff" />

			{/* Sun/Moon Directional Light with Soft PCF Shadows */}
			<directionalLight
				ref={dirLightRef}
				position={initialOrbits.sunPosition}
				intensity={0.8}
				color="#ffffff"
				castShadow
				shadow-mapSize-width={1024}
				shadow-mapSize-height={1024}
				shadow-camera-near={1}
				shadow-camera-far={150}
				shadow-camera-left={-36}
				shadow-camera-right={36}
				shadow-camera-top={36}
				shadow-camera-bottom={-36}
				shadow-bias={-0.0002}
			/>

			{/* Dual Hemisphere Light */}
			<hemisphereLight ref={hemiLightRef} args={[config.hemisphereSky, config.hemisphereGround, config.hemisphereIntensity ?? 0.78]} />

			{/* Distant Mystical Mountain Silhouettes */}
			{mountainData.map(([x, y, z, scale, color], index) => (
				<Mountain key={index} position={[x, y, z]} scale={scale} color={color} isNight={isNocturnal} />
			))}

			{/* Enclosing Horizon Forest & Foothills: Natural groves and ridges */}
			<HorizonForest isNight={isNocturnal} />

			{/* Volumetric Clouds Drifting with Day/Sunset/Night lighting */}
			{cloudLayers.map((cloud, index) => (
				<DriftingVolumetricCloud
					key={index}
					initialPos={cloud.pos}
					scale={cloud.scale}
					speed={cloud.speed}
					reducedMotion={reducedMotion}
					nightFactor={1 - config.cloudDayFactor}
				/>
			))}

			{/* Floating Sunlit Motes / Night Fairy Fireflies and Blossom Petals */}
			<DreamMotesAndPetals reducedMotion={reducedMotion} isNight={isNocturnal || activePhase === "sunset"} />

			{/* Animated Fluttering Butterflies */}
			<AnimatedButterflies reducedMotion={reducedMotion} />
		</>
	);
}
