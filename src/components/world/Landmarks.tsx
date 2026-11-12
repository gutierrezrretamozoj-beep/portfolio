"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
	CanvasTexture,
	CatmullRomCurve3,
	CylinderGeometry,
	DoubleSide,
	Group,
	Mesh,
	MeshStandardMaterial,
	SphereGeometry,
	TubeGeometry,
	Vector3,
} from "three";
import { GLBOrFallback } from "@/components/world/ModelAsset";
import { digitalDna } from "@/data/dna";
import { treePositions, worldPoints } from "@/data/world";
import { terrainHeight } from "@/components/world/terrain-utils";
import { type Language, i18nSignposts, i18nProjects } from "@/data/i18n";
import type { ModelSlotId } from "@/data/models-manifest";
import type { WorldPoint } from "@/types/world";

const SHARED_PLANT_POT_GEO = new CylinderGeometry(0.26, 0.31, 0.44, 10);
const SHARED_PLANT_POT_MAT = new MeshStandardMaterial({ color: "#c9b399", roughness: 0.92 });
const SHARED_PLANT_LEAF_GEO = new SphereGeometry(1, 10, 8);
const SHARED_PLANT_LEAF_MAIN_MAT = new MeshStandardMaterial({ color: "#83ad80", roughness: 0.8 });
const SHARED_PLANT_LEAF_ALT_MAT = new MeshStandardMaterial({ color: "#9fc58b", roughness: 0.8 });
const SHARED_MEADOW_TUFT_GEO = new SphereGeometry(1, 8, 6);
const SHARED_MEADOW_TUFT_MAT = new MeshStandardMaterial({ color: "#a8c78f", roughness: 0.9 });

type LandmarkProps = { onActivate: (pointId: string) => void; isNight?: boolean; language?: Language };

const signTextureCache = new Map<string, CanvasTexture>();

function getSignTexture(lines: string[], accentColor = "#10b981"): CanvasTexture | null {
	const key = lines.join("|") + "|" + accentColor;
	const existing = signTextureCache.get(key);
	if (existing) return existing;
	if (typeof document === "undefined") return null;

	const canvas = document.createElement("canvas");
	canvas.width = 512;
	canvas.height = 192;
	const ctx = canvas.getContext("2d");
	if (!ctx) return null;

	// Background parchment
	ctx.fillStyle = "#faf5ea";
	ctx.fillRect(0, 0, 512, 192);

	// Wood border
	ctx.strokeStyle = "#855d3e";
	ctx.lineWidth = 10;
	ctx.strokeRect(5, 5, 502, 182);

	// Accent color bar
	ctx.strokeStyle = accentColor;
	ctx.lineWidth = 6;
	ctx.strokeRect(16, 16, 480, 160);

	// Typography
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (lines.length === 1) {
		ctx.fillStyle = "#1e293b";
		ctx.font = "bold 44px sans-serif";
		ctx.fillText(lines[0], 256, 96);
	} else {
		ctx.fillStyle = "#0f172a";
		ctx.font = "bold 38px sans-serif";
		ctx.fillText(lines[0], 256, 72);

		ctx.fillStyle = "#475569";
		ctx.font = "600 24px sans-serif";
		ctx.fillText(lines[1], 256, 126);
	}

	const texture = new CanvasTexture(canvas);
	texture.needsUpdate = true;
	signTextureCache.set(key, texture);
	return texture;
}

function GroundedSignpost({
	lines,
	accentColor = "#74998a",
	width = 1.35,
	height = 0.52,
	postHeight = 1.15,
	onClick,
}: {
	lines: string[];
	accentColor?: string;
	width?: number;
	height?: number;
	postHeight?: number;
	onClick?: () => void;
}) {
	const texture = useMemo(() => getSignTexture(lines, accentColor), [lines, accentColor]);
	const halfSpan = width * 0.44;

	return (
		<group onClick={onClick ? (event) => { event.stopPropagation(); onClick(); } : undefined}>
			{/* Ground stone footings */}
			{[-halfSpan, halfSpan].map((px) => (
				<mesh key={`foot-${px}`} position={[px, 0.08, 0]} castShadow receiveShadow>
					<cylinderGeometry args={[0.13, 0.17, 0.18, 8]} />
					<meshStandardMaterial color="#8e9a8f" roughness={0.88} />
				</mesh>
			))}

			{/* Timber vertical posts */}
			{[-halfSpan, halfSpan].map((px) => (
				<mesh key={`post-${px}`} position={[px, postHeight * 0.5, 0]} castShadow>
					<cylinderGeometry args={[0.065, 0.08, postHeight, 8]} />
					<meshStandardMaterial color="#805a3b" roughness={0.84} />
				</mesh>
			))}

			{/* Cross support beam */}
			<mesh position={[0, postHeight - 0.06, -0.04]} castShadow>
				<boxGeometry args={[width + 0.1, 0.08, 0.08]} />
				<meshStandardMaterial color="#6b4a2f" roughness={0.86} />
			</mesh>

			{/* Main whitewash wooden board */}
			<mesh position={[0, postHeight, 0]} castShadow receiveShadow>
				<boxGeometry args={[width, height, 0.1]} />
				<meshStandardMaterial color="#fbf7ec" roughness={0.76} />
			</mesh>

			{/* Board top decorative roof cap */}
			<mesh position={[0, postHeight + height * 0.52, 0]} castShadow>
				<boxGeometry args={[width + 0.08, 0.05, 0.14]} />
				<meshStandardMaterial color="#735134" roughness={0.82} />
			</mesh>

			{/* Front and back textured sign face */}
			{texture && (
				<>
					<mesh position={[0, postHeight, 0.052]}>
						<planeGeometry args={[width * 0.94, height * 0.88]} />
						<meshBasicMaterial map={texture} />
					</mesh>
					<mesh position={[0, postHeight, -0.052]} rotation={[0, Math.PI, 0]}>
						<planeGeometry args={[width * 0.94, height * 0.88]} />
						<meshBasicMaterial map={texture} />
					</mesh>
				</>
			)}
		</group>
	);
}

function Bridge({ isNight = false }: { isNight?: boolean }) {
	const planks = Array.from({ length: 17 }, (_, index) => -5.38 + index * 0.36);
	const posts = Array.from({ length: 9 }, (_, index) => -5.28 + index * 0.695);
	const beams = useMemo(() => [-1, 1].flatMap((side) => [
		{ key: `stringer-${side}`, geometry: createBridgeBeam(side * 1.32, -0.14, 0.085), color: "#694b36" },
		{ key: `rail-mid-${side}`, geometry: createBridgeBeam(side * 1.62, 0.4, 0.045), color: "#956c46" },
		{ key: `rail-top-${side}`, geometry: createBridgeBeam(side * 1.62, 0.82, 0.08), color: "#815637" },
	]), []);

	return (
		<group position={[0, 0, 0]}>
			<GLBOrFallback
				slot="landmarks/bridge"
				position={[0, 0.127, -2.5]}
				fallback={
					<>
						{planks.map((z, index) => (
							<mesh key={index} position={[0, bridgeDeckHeight(z), z]} rotation={[-Math.atan((bridgeDeckHeight(z + 0.18) - bridgeDeckHeight(z - 0.18)) / 0.36), 0, 0]} castShadow receiveShadow>
								<boxGeometry args={[3.55, 0.14, 0.32]} />
								<meshStandardMaterial color={["#9b704b", "#b18458", "#a2764f", "#bd9061"][index % 4]} roughness={0.84} />
							</mesh>
						))}
						{posts.map((z) => (
							<mesh key={z} position={[0, bridgeDeckHeight(z) - 0.13, z]} castShadow>
								<boxGeometry args={[3.3, 0.12, 0.16]} />
								<meshStandardMaterial color="#76543a" roughness={0.88} />
							</mesh>
						))}
						{beams.map((beam) => (
							<mesh key={beam.key} geometry={beam.geometry} castShadow receiveShadow>
								<meshStandardMaterial color={beam.color} roughness={0.82} />
							</mesh>
						))}
						{[-1, 1].map((side) => posts.map((z, postIdx) => {
							const isEnd = postIdx === 0 || postIdx === posts.length - 1;
							return (
								<group key={`${side}-${z}`} position={[side * 1.62, bridgeDeckHeight(z), z]}>
									<mesh position={[0, 0.41, 0]} castShadow>
										<cylinderGeometry args={[0.065, 0.09, 0.82, 8]} />
										<meshStandardMaterial color="#805b3e" roughness={0.84} />
									</mesh>
									<mesh position={[0, 0.85, 0]} castShadow>
										<boxGeometry args={[0.2, 0.09, 0.2]} />
										<meshStandardMaterial color="#a77b50" roughness={0.78} />
									</mesh>
									{isEnd && (
										<group position={[0, 1.05, 0]}>
											<mesh position={[0, 0, 0]}>
												<boxGeometry args={[0.16, 0.22, 0.16]} />
												<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.2} />
											</mesh>
											<mesh position={[0, 0.14, 0]}>
												<coneGeometry args={[0.13, 0.09, 4]} />
												<meshStandardMaterial color="#694b36" roughness={0.8} />
											</mesh>
										</group>
									)}
								</group>
							);
						}))}
					</>
				}
			/>
			{/* Bridge hero point light (night only) */}
			{isNight && <pointLight position={[0, 1.4, -2.5]} color="#fde047" intensity={1.25} distance={7.5} />}
		</group>
	);
}

function bridgeDeckHeight(z: number) {
	const arch = Math.max(0, 1 - ((z + 2.5) / 2.95) ** 2);
	return 0.34 + arch * 0.24;
}

function createBridgeBeam(x: number, heightOffset: number, radius: number) {
	const points = Array.from({ length: 9 }, (_, index) => {
		const z = -5.38 + (5.76 * index) / 8;
		return new Vector3(x, bridgeDeckHeight(z) + heightOffset, z);
	});
	return new TubeGeometry(new CatmullRomCurve3(points), 48, radius, 8, false);
}

function TechLab({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "skills")!;
	const ground = terrainHeight(point.position[0], point.position[2]);

	return (
		<group position={[point.position[0], ground, point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<GLBOrFallback
				slot="landmarks/tech-lab"
				fallback={
					<>
						{/* Entrance flagstone patio */}
						<mesh position={[0, 0.04, 2.7]} receiveShadow>
							<boxGeometry args={[3.2, 0.08, 1.8]} />
							<meshStandardMaterial color="#ccd7cb" roughness={0.82} />
						</mesh>

						{/* Main building block */}
						<mesh position={[0, 1.42, 0]} castShadow receiveShadow>
							<boxGeometry args={[5.2, 2.8, 4.2]} />
							<meshStandardMaterial color="#d8d1b9" roughness={0.73} />
						</mesh>
						<mesh position={[0, 2.96, 0]} castShadow>
							<boxGeometry args={[5.7, 0.28, 4.65]} />
							<meshStandardMaterial color="#89a99b" roughness={0.68} />
						</mesh>

						{/* Glowing tech windows */}
						{[-1.55, 1.55].map((x) => (
							<mesh key={x} position={[x, 1.7, 2.115]}>
								<boxGeometry args={[1.35, 1.48, 0.045]} />
								<meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={isNight ? 1.8 : 0.5} roughness={0.2} metalness={0.05} side={DoubleSide} />
							</mesh>
						))}

						{/* Entrance door */}
						<mesh position={[0, 1.05, 2.15]}>
							<boxGeometry args={[0.94, 2.05, 0.09]} />
							<meshStandardMaterial color="#9b8165" roughness={0.8} />
						</mesh>

						{/* Entrance wall lanterns */}
						{[-0.75, 0.75].map((lx) => (
							<group key={`lamp-${lx}`} position={[lx, 1.8, 2.18]}>
								<mesh>
									<boxGeometry args={[0.14, 0.2, 0.14]} />
									<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.2} />
								</mesh>
							</group>
						))}

						<Plant position={[-3.1, 0, 1.9]} scale={0.8} />
						<Plant position={[3.1, 0, 1.4]} scale={0.95} />
					</>
				}
			/>

			{/* Tech Lab night entrance light */}
			{isNight && <pointLight position={[0, 1.9, 2.6]} color="#38bdf8" intensity={1.3} distance={6.5} />}

			{/* Grounded Entrance Signboard with localized text */}
			<group position={[0, 0, 3.4]}>
				<GroundedSignpost lines={i18nSignposts[language].skills} accentColor="#0ea5e9" width={1.4} height={0.52} postHeight={1.05} />
			</group>
		</group>
	);
}

function CabinChimneySmoke() {
	const smokeRef = useRef<Group>(null);
	const puffs = useMemo(() => [
		{ speed: 0.8, offset: 0 },
		{ speed: 0.9, offset: 1.2 },
		{ speed: 0.75, offset: 2.5 },
		{ speed: 0.85, offset: 3.8 },
	], []);

	useFrame(({ clock }) => {
		if (!smokeRef.current) return;
		const t = clock.elapsedTime;
		smokeRef.current.children.forEach((child, i) => {
			const p = puffs[i];
			const life = ((t * p.speed + p.offset) % 4) / 4;
			child.position.y = 3.6 + life * 1.6;
			child.position.x = 1.4 + Math.sin(t * 1.5 + i) * 0.12 + life * 0.35;
			child.position.z = -0.8 + life * 0.25;
			const s = 0.14 + life * 0.32;
			child.scale.set(s, s, s);
			const mat = (child as Mesh).material;
			if (mat && "opacity" in mat) {
				(mat as { opacity: number }).opacity = Math.max(0, (1 - life) * 0.42);
			}
		});
	});

	return (
		<group ref={smokeRef}>
			{puffs.map((_, i) => (
				<mesh key={i}>
					<sphereGeometry args={[1, 8, 8]} />
					<meshBasicMaterial color="#f1f5f9" transparent opacity={0.35} depthWrite={false} />
				</mesh>
			))}
		</group>
	);
}

function Cabin({ onActivate, isNight = false }: LandmarkProps) {
	const ground = terrainHeight(-8.2, -18.5);
	return (
		<group position={[-8.2, ground, -18.5]} rotation={[0, 0.38, 0]} onClick={(event) => { event.stopPropagation(); onActivate("interest-0"); }}>
			<GLBOrFallback
				slot="landmarks/cabin"
				fallback={
					<>
						{/* Front porch deck */}
						<mesh position={[0, 0.08, 2.3]} receiveShadow>
							<boxGeometry args={[3.8, 0.16, 1.4]} />
							<meshStandardMaterial color="#947454" roughness={0.84} />
						</mesh>

						{/* Main cabin structure */}
						<mesh position={[0, 1.2, 0]} castShadow receiveShadow>
							<boxGeometry args={[4.6, 2.4, 3.6]} />
							<meshStandardMaterial color="#c4aa86" roughness={0.91} />
						</mesh>
						<mesh position={[0, 2.77, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
							<coneGeometry args={[3.25, 1.6, 4]} />
							<meshStandardMaterial color="#91aa9a" roughness={0.86} />
						</mesh>

						{/* Chimney and rising smoke */}
						<mesh position={[1.4, 3.2, -0.8]} castShadow>
							<boxGeometry args={[0.55, 1.4, 0.55]} />
							<meshStandardMaterial color="#785c47" roughness={0.85} />
						</mesh>
						<CabinChimneySmoke />

						{/* Door and windows */}
						<mesh position={[0, 0.82, 1.82]} castShadow>
							<boxGeometry args={[0.9, 1.65, 0.11]} />
							<meshStandardMaterial color="#8f7359" roughness={0.8} />
						</mesh>
						<mesh position={[-1.35, 1.42, 1.83]}>
							<boxGeometry args={[0.78, 0.72, 0.07]} />
							<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 0.65} roughness={0.25} />
						</mesh>
						<mesh position={[1.35, 1.42, 1.83]}>
							<boxGeometry args={[0.78, 0.72, 0.07]} />
							<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 0.65} roughness={0.25} />
						</mesh>

						{/* Porch roof lantern */}
						<group position={[0, 2.2, 2.3]}>
							<mesh>
								<boxGeometry args={[0.15, 0.22, 0.15]} />
								<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.25} />
							</mesh>
						</group>

						<Plant position={[-2.5, 0, 1.9]} scale={0.76} />
						<Plant position={[2.55, 0, 1.75]} scale={0.72} />
					</>
				}
			/>

			{/* Warm glowing porch lantern point light (night hero light) */}
			{isNight && <pointLight position={[0, 2.2, 2.3]} color="#f59e0b" intensity={1.35} distance={7.0} />}
		</group>
	);
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
	return (
		<group position={position} scale={scale}>
			<mesh position={[0, 0.23, 0]} geometry={SHARED_PLANT_POT_GEO} material={SHARED_PLANT_POT_MAT} castShadow />
			{[-1, 0, 1].map((leaf) => (
				<mesh
					key={leaf}
					position={[leaf * 0.16, 0.62 + (leaf === 0 ? 0.1 : 0), 0]}
					rotation={[0, leaf * 0.5, -leaf * 0.42]}
					scale={[0.13, 0.52, 0.09]}
					geometry={SHARED_PLANT_LEAF_GEO}
					material={leaf === 0 ? SHARED_PLANT_LEAF_MAIN_MAT : SHARED_PLANT_LEAF_ALT_MAT}
					castShadow
				/>
			))}
		</group>
	);
}

function FloatingProjectOrb({ index, color, emissive }: { index: number; color: string; emissive: string }) {
	const orbRef = useRef<Group>(null);
	const ringRef = useRef<Group>(null);

	useFrame(({ clock }) => {
		if (!orbRef.current) return;
		const t = clock.elapsedTime;
		orbRef.current.position.y = 1.35 + Math.sin(t * 1.8 + index * 2.1) * 0.1;
		orbRef.current.rotation.y = t * 0.8 + index;
		orbRef.current.rotation.x = Math.sin(t * 1.2 + index) * 0.12;
		if (ringRef.current) {
			ringRef.current.rotation.z = -t * 1.2;
		}
	});

	return (
		<group ref={orbRef}>
			{/* Main faceted crystal sphere */}
			<mesh scale={0.46} castShadow>
				<dodecahedronGeometry args={[1, 1]} />
				<meshStandardMaterial
					color={color}
					emissive={emissive}
					emissiveIntensity={0.8}
					roughness={0.2}
					metalness={0.08}
				/>
			</mesh>
			{/* Orbiting celestial halo ring */}
			<group ref={ringRef} rotation={[0.4, 0, 0]}>
				<mesh scale={0.72}>
					<torusGeometry args={[1, 0.032, 8, 24]} />
					<meshBasicMaterial color={emissive} transparent opacity={0.65} />
				</mesh>
			</group>
		</group>
	);
}

function ProjectStands({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const points = worldPoints.filter((point) => point.kind === "project");
	const localizedProjects = i18nProjects[language];
	const orbConfigs = [
		{ color: "#f0c3d0", emissive: "#ec4899", numeral: language === "es" ? "PROYECTO I" : "PROJECT I" },
		{ color: "#cee5c5", emissive: "#10b981", numeral: language === "es" ? "PROYECTO II" : "PROJECT II" },
		{ color: "#b7dce7", emissive: "#06b6d4", numeral: language === "es" ? "PROYECTO III" : "PROJECT III" },
	];

	return (
		<group>
			{points.map((point, index) => {
				const conf = orbConfigs[index % orbConfigs.length];
				const px = point.position[0];
				const pz = point.position[2];
				const ground = terrainHeight(px, pz);
				const projectTitle = localizedProjects[index]?.name ?? point.name;

				return (
					<group key={point.id} position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
						{/* Tiered stone plaza dais on the ground */}
						<mesh position={[0, 0.1, 0]} castShadow receiveShadow>
							<cylinderGeometry args={[1.35, 1.5, 0.2, 12]} />
							<meshStandardMaterial color="#889c89" roughness={0.88} />
						</mesh>
						<mesh position={[0, 0.24, 0]} castShadow receiveShadow>
							<cylinderGeometry args={[1.1, 1.25, 0.14, 12]} />
							<meshStandardMaterial color="#a7b8a5" roughness={0.84} />
						</mesh>

						{/* Faceted stone pedestal column */}
						<mesh position={[0, 0.58, 0]} castShadow receiveShadow>
							<cylinderGeometry args={[0.72, 0.86, 0.54, 8]} />
							<meshStandardMaterial color="#cbd8c7" roughness={0.78} />
						</mesh>
						<mesh position={[0, 0.88, 0]} castShadow receiveShadow>
							<cylinderGeometry args={[0.82, 0.72, 0.1, 8]} />
							<meshStandardMaterial color="#dfe8dc" roughness={0.72} />
						</mesh>

						{/* Floating magical sphere with radiant crystal glow */}
						<FloatingProjectOrb index={index} color={conf.color} emissive={conf.emissive} />

						{/* Solid timber sign support posts grounded firmly into the pedestal */}
						{[-0.52, 0.52].map((sx) => (
							<mesh key={`post-${sx}`} position={[sx, 1.2, -0.32]} castShadow>
								<cylinderGeometry args={[0.045, 0.055, 1.4, 8]} />
								<meshStandardMaterial color="#7a5538" roughness={0.84} />
							</mesh>
						))}

						{/* Horizontal crossbar holding the sign */}
						<mesh position={[0, 1.85, -0.32]} castShadow>
							<boxGeometry args={[1.2, 0.06, 0.06]} />
							<meshStandardMaterial color="#63432a" roughness={0.86} />
						</mesh>

						{/* Signboard mounted securely on the crossbar with readable text */}
						<group position={[0, 0, -0.32]}>
							<GroundedSignpost
								lines={[conf.numeral, projectTitle.slice(0, 14).toUpperCase()]}
								accentColor={conf.emissive}
								width={1.25}
								height={0.46}
								postHeight={2.08}
							/>
						</group>

						{/* Colored glowing crest rune on top of the signboard */}
						<mesh position={[0, 2.38, -0.32]}>
							<octahedronGeometry args={[0.08, 0]} />
							<meshStandardMaterial color={conf.color} emissive={conf.emissive} emissiveIntensity={isNight ? 2.4 : 1.2} />
						</mesh>
					</group>
				);
			})}
		</group>
	);
}

function StartStation({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "start")!;
	const px = point.position[0];
	const pz = point.position[2];
	const ground = terrainHeight(px, pz);

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Circular stone compass rose platform */}
			<mesh position={[0, 0.06, 0]} receiveShadow>
				<cylinderGeometry args={[2.2, 2.4, 0.12, 24]} />
				<meshStandardMaterial color="#c2cfbf" roughness={0.82} />
			</mesh>
			<mesh position={[0, 0.09, 0]} receiveShadow>
				<cylinderGeometry args={[1.7, 1.7, 0.04, 8]} />
				<meshStandardMaterial color="#aab9a7" roughness={0.8} />
			</mesh>

			{/* Welcome signpost */}
			<group position={[0, 0, -1.3]}>
				<GroundedSignpost lines={i18nSignposts[language].start} accentColor="#10b981" width={1.3} height={0.5} postHeight={1.12} />
			</group>

			{/* Flanking stone lantern columns */}
			{[-1.8, 1.8].map((lx) => (
				<group key={`start-lantern-${lx}`} position={[lx, 0, 0]}>
					<mesh position={[0, 0.38, 0]} castShadow>
						<cylinderGeometry args={[0.22, 0.28, 0.76, 8]} />
						<meshStandardMaterial color="#889a88" roughness={0.85} />
					</mesh>
					<mesh position={[0, 0.88, 0]}>
						<boxGeometry args={[0.22, 0.28, 0.22]} />
						<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.25} />
					</mesh>
					<mesh position={[0, 1.08, 0]} castShadow>
						<coneGeometry args={[0.2, 0.14, 4]} />
						<meshStandardMaterial color="#6a7d6a" roughness={0.8} />
					</mesh>
				</group>
			))}
		</group>
	);
}

function JourneyMilestone({ onActivate, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "journey")!;
	const px = -2.2;
	const pz = -5.7;
	const ground = terrainHeight(px, pz);

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Stone terrace base */}
			<mesh position={[0, 0.06, 0]} receiveShadow>
				<boxGeometry args={[1.8, 0.12, 1.8]} />
				<meshStandardMaterial color="#bccbbb" roughness={0.84} />
			</mesh>

			{/* Milestone signpost */}
			<GroundedSignpost lines={i18nSignposts[language].journey} accentColor="#3b82f6" width={1.4} height={0.52} postHeight={1.15} />

			{/* Small resting bench */}
			<group position={[0.75, 0, 0.45]} rotation={[0, -0.4, 0]}>
				<mesh position={[0, 0.22, 0]} castShadow>
					<boxGeometry args={[0.8, 0.08, 0.32]} />
					<meshStandardMaterial color="#9c7550" roughness={0.85} />
				</mesh>
				{[-0.32, 0.32].map((bx) => (
					<mesh key={bx} position={[bx, 0.1, 0]}>
						<boxGeometry args={[0.08, 0.2, 0.26]} />
						<meshStandardMaterial color="#6e5033" roughness={0.88} />
					</mesh>
				))}
			</group>
		</group>
	);
}

function PeopleGardenSanctuary({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "garden")!;
	const px = point.position[0];
	const pz = point.position[2];
	const ground = terrainHeight(px, pz);

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Stepped circular flagstone terrace */}
			<mesh position={[0, 0.06, 0]} receiveShadow>
				<cylinderGeometry args={[2.4, 2.6, 0.12, 18]} />
				<meshStandardMaterial color="#b2c6b0" roughness={0.86} />
			</mesh>
			<mesh position={[0, 0.12, 0]} receiveShadow>
				<cylinderGeometry args={[1.8, 2.0, 0.08, 18]} />
				<meshStandardMaterial color="#c6d8c4" roughness={0.82} />
			</mesh>

			{/* Central sundial / botanical fountain pedestal */}
			<mesh position={[0, 0.42, 0]} castShadow>
				<cylinderGeometry args={[0.42, 0.55, 0.6, 8]} />
				<meshStandardMaterial color="#8ca48a" roughness={0.78} />
			</mesh>
			<mesh position={[0, 0.74, 0]} castShadow>
				<cylinderGeometry args={[0.6, 0.42, 0.12, 12]} />
				<meshStandardMaterial color="#9fb59d" roughness={0.75} />
			</mesh>
			<mesh position={[0, 0.84, 0]}>
				<dodecahedronGeometry args={[0.18, 0]} />
				<meshStandardMaterial color="#fbcfe8" emissive="#ec4899" emissiveIntensity={isNight ? 1.6 : 0.8} roughness={0.3} />
			</mesh>

			{/* Garden Signpost */}
			<group position={[0, 0, -1.4]}>
				<GroundedSignpost lines={i18nSignposts[language].garden} accentColor="#ec4899" width={1.45} height={0.52} postHeight={1.15} />
			</group>
		</group>
	);
}

function RiwiPavilion({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "riwi")!;
	const px = point.position[0];
	const pz = point.position[2];
	const ground = terrainHeight(px, pz);

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<GLBOrFallback
				slot="landmarks/riwi-pavilion"
				fallback={
					<>
						{/* Raised wooden study deck */}
						<mesh position={[0, 0.1, 0]} receiveShadow>
							<boxGeometry args={[3.0, 0.2, 2.6]} />
							<meshStandardMaterial color="#ab8764" roughness={0.85} />
						</mesh>

						{/* Deck border frame */}
						<mesh position={[0, 0.12, 0]}>
							<boxGeometry args={[3.12, 0.18, 2.72]} />
							<meshStandardMaterial color="#7f5f40" roughness={0.9} />
						</mesh>

						{/* Chalkboard / Whiteboard easel */}
						<group position={[-0.85, 0.2, -0.6]} rotation={[0, 0.35, 0]}>
							{[-0.32, 0.32].map((lx) => (
								<mesh key={lx} position={[lx, 0.65, 0]}>
									<cylinderGeometry args={[0.025, 0.025, 1.3, 6]} />
									<meshStandardMaterial color="#5c432d" roughness={0.88} />
								</mesh>
							))}
							<mesh position={[0, 0.95, 0.05]} rotation={[-0.1, 0, 0]}>
								<boxGeometry args={[0.9, 0.65, 0.04]} />
								<meshStandardMaterial color="#2d3748" roughness={0.65} />
							</mesh>
							<mesh position={[0, 0.95, 0.075]} rotation={[-0.1, 0, 0]}>
								<boxGeometry args={[0.65, 0.015, 0.01]} />
								<meshBasicMaterial color="#38bdf8" />
							</mesh>
						</group>

						{/* Study desk with open book */}
						<group position={[0.75, 0.2, -0.5]}>
							<mesh position={[0, 0.52, 0]} castShadow>
								<boxGeometry args={[0.85, 0.06, 0.55]} />
								<meshStandardMaterial color="#947454" roughness={0.82} />
							</mesh>
							{[-0.36, 0.36].flatMap((dx) => [-0.22, 0.22].map((dz) => (
								<mesh key={`${dx}-${dz}`} position={[dx, 0.26, dz]}>
									<cylinderGeometry args={[0.025, 0.025, 0.52, 6]} />
									<meshStandardMaterial color="#684e34" roughness={0.88} />
								</mesh>
							)))}
							<mesh position={[0, 0.58, 0]} rotation={[0, 0.2, 0]}>
								<boxGeometry args={[0.34, 0.03, 0.24]} />
								<meshStandardMaterial color="#fef9ee" roughness={0.6} />
							</mesh>
						</group>

						{/* Study lantern */}
						<group position={[1.1, 0.2, 0.8]}>
							<mesh position={[0, 0.55, 0]}>
								<cylinderGeometry args={[0.03, 0.03, 1.1, 6]} />
								<meshStandardMaterial color="#55402c" roughness={0.88} />
							</mesh>
							<mesh position={[0, 1.15, 0]}>
								<boxGeometry args={[0.16, 0.22, 0.16]} />
								<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.25} />
							</mesh>
						</group>
					</>
				}
			/>

			{/* Dedicated Signpost */}
			<group position={[0, 0, 1.95]}>
				<GroundedSignpost lines={i18nSignposts[language].riwi} accentColor="#a855f7" width={1.35} height={0.5} postHeight={1.12} />
			</group>
		</group>
	);
}

function DigitalDnaGrove({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "dna")!;
	const px = point.position[0];
	const pz = point.position[2];
	const ground = terrainHeight(px, pz);
	const groupRef = useRef<Group>(null);

	useFrame(({ clock }) => {
		if (groupRef.current) {
			groupRef.current.rotation.y = clock.elapsedTime * 0.16;
		}
	});

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Circular stone runic dais */}
			<mesh position={[0, 0.06, 0]} receiveShadow>
				<cylinderGeometry args={[3.2, 3.4, 0.12, 32]} />
				<meshStandardMaterial color="#bfd3c8" roughness={0.84} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.13, 0]}>
				<ringGeometry args={[2.8, 2.95, 36]} />
				<meshStandardMaterial color="#e0f2fe" roughness={0.65} />
			</mesh>

			{/* Central stone obelisk anchor */}
			<mesh position={[0, 0.65, 0]} castShadow>
				<cylinderGeometry args={[0.35, 0.52, 1.1, 8]} />
				<meshStandardMaterial color="#889e92" roughness={0.8} />
			</mesh>
			<mesh position={[0, 1.35, 0]} castShadow>
				<octahedronGeometry args={[0.28, 0]} />
				<meshStandardMaterial color="#bae6fd" emissive="#38bdf8" emissiveIntensity={isNight ? 1.4 : 0.8} roughness={0.25} />
			</mesh>

			{/* Dedicated Signpost */}
			<group position={[0, 0, 2.3]}>
				<GroundedSignpost lines={i18nSignposts[language].dna} accentColor="#06b6d4" width={1.4} height={0.52} postHeight={1.15} />
			</group>

			{/* Orbiting DNA crystals */}
			<group ref={groupRef}>
				{digitalDna.map((item, index) => {
					const angle = (index / digitalDna.length) * Math.PI * 2;
					return (
						<mesh key={item.name} position={[Math.cos(angle) * 2.35, 0.7 + Math.sin(index * 1.5) * 0.12, Math.sin(angle) * 2.35]} rotation={[0, angle, 0]} castShadow>
							<dodecahedronGeometry args={[0.38, 1]} />
							<meshStandardMaterial color={item.color} emissive={item.color} emissiveIntensity={isNight ? 1.4 : 0.6} roughness={0.25} metalness={0.06} />
						</mesh>
					);
				})}
			</group>

			<Plant position={[0, 0, 0]} scale={1.1} />
		</group>
	);
}

function AboutTerrace({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "about")!;
	const px = point.position[0];
	const pz = point.position[2];
	const ground = terrainHeight(px, pz);

	return (
		<group position={[px, ground, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Flagstone circular observation deck */}
			<mesh position={[0, 0.08, 0]} receiveShadow>
				<cylinderGeometry args={[2.5, 2.7, 0.16, 24]} />
				<meshStandardMaterial color="#cad5c8" roughness={0.82} />
			</mesh>
			<mesh position={[0, 0.16, 0]} receiveShadow>
				<cylinderGeometry args={[2.1, 2.1, 0.04, 16]} />
				<meshStandardMaterial color="#b2c2af" roughness={0.85} />
			</mesh>

			{/* Wooden park bench */}
			<group position={[-0.8, 0.16, -0.4]} rotation={[0, 0.3, 0]}>
				<mesh position={[0, 0.32, 0]} castShadow>
					<boxGeometry args={[1.2, 0.08, 0.44]} />
					<meshStandardMaterial color="#947454" roughness={0.84} />
				</mesh>
				<mesh position={[0, 0.62, -0.18]} rotation={[0.15, 0, 0]} castShadow>
					<boxGeometry args={[1.2, 0.42, 0.06]} />
					<meshStandardMaterial color="#826243" roughness={0.86} />
				</mesh>
				{[-0.52, 0.52].map((bx) => (
					<mesh key={bx} position={[bx, 0.16, 0]}>
						<boxGeometry args={[0.08, 0.32, 0.38]} />
						<meshStandardMaterial color="#5e452f" roughness={0.9} />
					</mesh>
				))}
			</group>

			{/* Brass observation telescope on stone column */}
			<group position={[0.9, 0.16, -0.5]}>
				<mesh position={[0, 0.42, 0]} castShadow>
					<cylinderGeometry args={[0.16, 0.22, 0.84, 8]} />
					<meshStandardMaterial color="#889a88" roughness={0.85} />
				</mesh>
				<mesh position={[0, 0.95, 0]} rotation={[0.4, -0.6, 0]} castShadow>
					<cylinderGeometry args={[0.07, 0.1, 0.7, 8]} />
					<meshStandardMaterial color="#d4af37" metalness={0.4} roughness={0.35} />
				</mesh>
			</group>

			{/* Dedicated Signpost */}
			<group position={[0, 0, 1.4]}>
				<GroundedSignpost lines={i18nSignposts[language].about} accentColor="#f59e0b" width={1.4} height={0.52} postHeight={1.15} />
			</group>

			{/* Terrace lantern */}
			<group position={[-1.6, 0.16, 0.8]}>
				<mesh position={[0, 0.65, 0]}>
					<cylinderGeometry args={[0.04, 0.04, 1.3, 6]} />
					<meshStandardMaterial color="#55402c" roughness={0.88} />
				</mesh>
				<mesh position={[0, 1.35, 0]}>
					<boxGeometry args={[0.18, 0.25, 0.18]} />
					<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.25} />
				</mesh>
			</group>
		</group>
	);
}

function LakePier({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "contact")!;
	const px = point.position[0];
	const pz = point.position[2];

	return (
		<group position={[px, 0.08, pz]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<GLBOrFallback
				slot="landmarks/lake-pier"
				fallback={
					<>
						{/* Wooden pier planks extending over the lake */}
						<mesh position={[0, 0.06, -0.6]} receiveShadow>
							<boxGeometry args={[2.8, 0.14, 3.8]} />
							<meshStandardMaterial color="#947454" roughness={0.82} />
						</mesh>

						{/* Submerged wooden support pilings */}
						{[-1.25, 1.25].flatMap((lx) => [-2.2, -0.6, 1.0].map((lz) => (
							<mesh key={`piling-${lx}-${lz}`} position={[lx, -0.4, lz]} castShadow>
								<cylinderGeometry args={[0.09, 0.11, 1.2, 8]} />
								<meshStandardMaterial color="#614a34" roughness={0.9} />
							</mesh>
						)))}

						{/* Pier side railings */}
						{[-1.32, 1.32].map((rx) => (
							<group key={`rail-${rx}`}>
								<mesh position={[rx, 0.55, -0.6]}>
									<boxGeometry args={[0.06, 0.08, 3.6]} />
									<meshStandardMaterial color="#7a5c3e" roughness={0.85} />
								</mesh>
								{[-2.1, -0.6, 0.9].map((pzPos) => (
									<mesh key={`post-${pzPos}`} position={[rx, 0.32, pzPos]}>
										<cylinderGeometry args={[0.05, 0.06, 0.55, 6]} />
										<meshStandardMaterial color="#6a4e32" roughness={0.88} />
									</mesh>
								))}
							</group>
						))}

						{/* End-of-pier nautical lanterns */}
						{[-1.32, 1.32].map((lx) => (
							<group key={`pier-lamp-${lx}`} position={[lx, 0.65, -2.2]}>
								<mesh>
									<boxGeometry args={[0.16, 0.24, 0.16]} />
									<meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={isNight ? 2.6 : 1.2} roughness={0.25} />
								</mesh>
							</group>
						))}

						{/* Wooden mooring bollards */}
						<mesh position={[1.05, 0.22, -2.1]} castShadow>
							<cylinderGeometry args={[0.1, 0.12, 0.34, 8]} />
							<meshStandardMaterial color="#59412b" roughness={0.92} />
						</mesh>
					</>
				}
			/>

			{/* Prominently anchored contact sign facing south */}
			<group position={[0, 0, 1.4]}>
				<GroundedSignpost
					lines={i18nSignposts[language].contact}
					accentColor="#3b82f6"
					width={1.5}
					height={0.55}
					postHeight={1.2}
				/>
			</group>
		</group>
	);
}

const INTEREST_PROP_SLOTS: ModelSlotId[] = [
	"props/gamepad",
	"props/headphones",
	"props/laptop",
	"props/cat-figure",
	"props/code-sculpture",
	"props/design-palette",
	"props/plant-pot",
	"props/suitcase",
	"props/culinary-pot",
];

function InterestArtifact({ point, index, onActivate }: { point: WorldPoint; index: number; onActivate: LandmarkProps["onActivate"] }) {
	const ground = terrainHeight(point.position[0], point.position[2]);
	const base = ["#d7e7db", "#d4eaf1", "#e8dff5"][index % 3];
	const propSlot = INTEREST_PROP_SLOTS[index % INTEREST_PROP_SLOTS.length];

	const proceduralFallback = (
		<>
			{index === 0 && <GameController />}
			{index === 1 && <Headphones />}
			{index === 2 && <LaptopFigure />}
			{index === 3 && <CatFigure />}
			{index === 4 && <CodeSculpture />}
			{index === 5 && <DesignPalette />}
			{index === 6 && <Plant position={[0, 0.38, 0]} scale={0.9} />}
			{index === 7 && <TravelCase />}
			{index === 8 && <CulinaryPot />}
		</>
	);

	return (
		<group position={[point.position[0], ground, point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			{/* Ground stone pedestal */}
			<mesh position={[0, 0.18, 0]} castShadow receiveShadow>
				<cylinderGeometry args={[0.5, 0.6, 0.36, 12]} />
				<meshStandardMaterial color={base} roughness={0.72} />
			</mesh>
			<mesh position={[0, 0.38, 0]} castShadow>
				<cylinderGeometry args={[0.55, 0.48, 0.08, 12]} />
				<meshStandardMaterial color="#e8edf0" roughness={0.65} />
			</mesh>

			{/* 3D Artifact model (auto-replaced when GLB exists in /models/props/*.glb) */}
			<GLBOrFallback
				slot={propSlot}
				position={[0, 0.44, 0]}
				alignBottom
				fallback={proceduralFallback}
			/>

			{/* Miniature wooden garden plaque post with interest title */}
			<group position={[0, 0, 0.58]}>
				<mesh position={[0, 0.18, 0]} castShadow>
					<cylinderGeometry args={[0.02, 0.02, 0.36, 6]} />
					<meshStandardMaterial color="#78563a" roughness={0.85} />
				</mesh>
				<mesh position={[0, 0.38, 0]} rotation={[-0.2, 0, 0]} castShadow>
					<boxGeometry args={[0.55, 0.22, 0.04]} />
					<meshStandardMaterial color="#fef9ee" roughness={0.7} />
				</mesh>
				<mesh position={[0, 0.38, 0.025]} rotation={[-0.2, 0, 0]}>
					<boxGeometry args={[0.42, 0.016, 0.01]} />
					<meshBasicMaterial color="#ec4899" />
				</mesh>
			</group>
		</group>
	);
}

function LaptopFigure() {
	return (
		<group position={[0, 0.48, 0]} rotation={[0.05, 0.22, 0]}>
			{/* Brushed metal keyboard deck */}
			<mesh position={[0, 0, 0.05]} castShadow>
				<boxGeometry args={[0.66, 0.04, 0.44]} />
				<meshStandardMaterial color="#94a3b8" metalness={0.45} roughness={0.32} />
			</mesh>
			<mesh position={[0, 0.025, 0.01]}>
				<boxGeometry args={[0.54, 0.01, 0.22]} />
				<meshStandardMaterial color="#334155" roughness={0.7} />
			</mesh>
			<mesh position={[0, 0.025, 0.18]}>
				<boxGeometry args={[0.2, 0.008, 0.11]} />
				<meshStandardMaterial color="#64748b" roughness={0.4} />
			</mesh>
			{/* Hinged screen lid */}
			<group position={[0, 0.22, -0.18]} rotation={[-0.28, 0, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.66, 0.44, 0.035]} />
					<meshStandardMaterial color="#64748b" metalness={0.45} roughness={0.32} />
				</mesh>
				<mesh position={[0, 0, 0.02]}>
					<boxGeometry args={[0.58, 0.36, 0.008]} />
					<meshStandardMaterial color="#0f172a" emissive="#0ea5e9" emissiveIntensity={0.7} roughness={0.2} />
				</mesh>
				{/* Glowing code bars */}
				{[-0.08, 0, 0.08].map((y, idx) => (
					<mesh key={y} position={[-0.06 + idx * 0.04, y, 0.028]}>
						<boxGeometry args={[0.32 - idx * 0.05, 0.022, 0.004]} />
						<meshBasicMaterial color={idx === 1 ? "#a5f3fc" : "#38bdf8"} />
					</mesh>
				))}
			</group>
		</group>
	);
}

function CodeSculpture() {
	return (
		<group position={[0, 0.76, 0]} rotation={[0.1, 0.25, 0]}>
			{/* Left angle bracket "<" */}
			<mesh position={[-0.22, 0.07, 0]} rotation={[0, 0, 0.65]} castShadow>
				<boxGeometry args={[0.22, 0.06, 0.07]} />
				<meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={0.4} roughness={0.28} />
			</mesh>
			<mesh position={[-0.22, -0.07, 0]} rotation={[0, 0, -0.65]} castShadow>
				<boxGeometry args={[0.22, 0.06, 0.07]} />
				<meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={0.4} roughness={0.28} />
			</mesh>
			{/* Center slash "/" */}
			<mesh position={[0, 0, 0]} rotation={[0, 0, -0.32]} castShadow>
				<boxGeometry args={[0.065, 0.38, 0.07]} />
				<meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.45} roughness={0.24} />
			</mesh>
			{/* Right angle bracket ">" */}
			<mesh position={[0.22, 0.07, 0]} rotation={[0, 0, -0.65]} castShadow>
				<boxGeometry args={[0.22, 0.06, 0.07]} />
				<meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={0.4} roughness={0.28} />
			</mesh>
			<mesh position={[0.22, -0.07, 0]} rotation={[0, 0, 0.65]} castShadow>
				<boxGeometry args={[0.22, 0.06, 0.07]} />
				<meshStandardMaterial color="#8b5cf6" emissive="#7c3aed" emissiveIntensity={0.4} roughness={0.28} />
			</mesh>
		</group>
	);
}

function DesignPalette() {
	const dabs: Array<{ pos: [number, number, number]; color: string }> = [
		{ pos: [-0.14, 0.04, 0.08], color: "#f43f5e" },
		{ pos: [-0.02, 0.04, 0.14], color: "#f59e0b" },
		{ pos: [0.12, 0.04, 0.1], color: "#10b981" },
		{ pos: [0.16, 0.04, -0.06], color: "#3b82f6" },
		{ pos: [0.02, 0.04, -0.14], color: "#a855f7" },
	];
	return (
		<group position={[0, 0.72, 0]} rotation={[0.55, 0.2, 0.1]}>
			<mesh scale={[1.15, 1, 0.88]} castShadow>
				<cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
				<meshStandardMaterial color="#e6ccb2" roughness={0.55} />
			</mesh>
			{dabs.map((dab) => (
				<mesh key={dab.color} position={dab.pos} scale={[1, 0.5, 1]}>
					<sphereGeometry args={[0.048, 8, 6]} />
					<meshStandardMaterial color={dab.color} roughness={0.35} />
				</mesh>
			))}
			{/* Angled paintbrush */}
			<group position={[0.04, 0.09, 0]} rotation={[0.15, 0.35, 1.15]}>
				<mesh castShadow>
					<cylinderGeometry args={[0.018, 0.012, 0.54, 8]} />
					<meshStandardMaterial color="#7f5539" roughness={0.7} />
				</mesh>
				<mesh position={[0, 0.3, 0]}>
					<coneGeometry args={[0.026, 0.09, 8]} />
					<meshStandardMaterial color="#38bdf8" roughness={0.5} />
				</mesh>
			</group>
		</group>
	);
}

function CulinaryPot() {
	return (
		<group position={[0, 0.62, 0]}>
			{/* Enamel/copper cooking pot */}
			<mesh castShadow>
				<cylinderGeometry args={[0.28, 0.24, 0.3, 14]} />
				<meshStandardMaterial color="#c26d48" roughness={0.38} metalness={0.22} />
			</mesh>
			{/* Side handles */}
			{[-0.3, 0.3].map((x) => (
				<mesh key={x} position={[x, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
					<torusGeometry args={[0.055, 0.018, 6, 12, Math.PI]} />
					<meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.3} />
				</mesh>
			))}
			{/* Domed lid with brass knob */}
			<mesh position={[0, 0.17, 0]} scale={[1, 0.32, 1]} castShadow>
				<sphereGeometry args={[0.27, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
				<meshStandardMaterial color="#e2e8f0" metalness={0.45} roughness={0.3} />
			</mesh>
			<mesh position={[0, 0.27, 0]}>
				<sphereGeometry args={[0.04, 8, 6]} />
				<meshStandardMaterial color="#eab308" metalness={0.5} roughness={0.25} />
			</mesh>
			{/* Wooden ladle leaning out */}
			<mesh position={[0.12, 0.24, 0.05]} rotation={[0.2, 0, -0.45]}>
				<cylinderGeometry args={[0.016, 0.016, 0.42, 6]} />
				<meshStandardMaterial color="#b08968" roughness={0.75} />
			</mesh>
		</group>
	);
}

function GameController() {
	return (
		<group position={[0, 0.72, 0]} rotation={[0.1, 0, 0]}>
			<mesh scale={[0.62, 0.18, 0.34]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#737da6" roughness={0.38} /></mesh>
			<mesh position={[-0.17, 0.17, 0]} scale={0.08}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#fff1d6" /></mesh>
			<mesh position={[0.2, 0.17, 0]} scale={0.075}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#f3bfd2" /></mesh>
			<mesh position={[-0.33, 0.15, 0]} scale={[0.14, 0.04, 0.05]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#eaf8ff" /></mesh>
			<mesh position={[-0.33, 0.15, 0]} scale={[0.04, 0.14, 0.05]}><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color="#eaf8ff" /></mesh>
		</group>
	);
}

function Headphones() {
	return (
		<group position={[0, 0.79, 0]}>
			<mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.33, 0.08, 10, 24, Math.PI]} /><meshStandardMaterial color="#668d87" roughness={0.35} /></mesh>
			{[-0.32, 0.32].map((x) => <mesh key={x} position={[x, -0.08, 0]} scale={[0.12, 0.18, 0.1]}><sphereGeometry args={[1, 12, 8]} /><meshStandardMaterial color="#f3d0bf" roughness={0.42} /></mesh>)}
		</group>
	);
}

function CatFigure() {
	return (
		<group position={[0, 0.75, 0]}>
			<mesh scale={[0.34, 0.32, 0.28]}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#d1b6a0" roughness={0.72} /></mesh>
			<mesh position={[0, 0.32, 0]} scale={0.23}><sphereGeometry args={[1, 16, 12]} /><meshStandardMaterial color="#ddc4aa" roughness={0.7} /></mesh>
			{[-0.14, 0.14].map((x) => <mesh key={x} position={[x, 0.55, 0]} rotation={[0, 0, x < 0 ? 0.2 : -0.2]}><coneGeometry args={[0.09, 0.24, 6]} /><meshStandardMaterial color="#d1b6a0" roughness={0.7} /></mesh>)}
		</group>
	);
}

function TravelCase() {
	return (
		<group position={[0, 0.76, 0]}>
			<mesh><boxGeometry args={[0.56, 0.64, 0.28]} /><meshStandardMaterial color="#dcae8e" roughness={0.55} /></mesh>
			<mesh position={[0, 0.38, 0]}><torusGeometry args={[0.14, 0.035, 8, 14, Math.PI]} /><meshStandardMaterial color="#98795f" roughness={0.64} /></mesh>
		</group>
	);
}

function MeadowGrass() {
	const grassPositions = useMemo(() => treePositions.filter((_, index) => index % 2 === 0).slice(0, 14), []);
	return (
		<group>
			{grassPositions.map(([x, , z, scale], index) => (
				<mesh
					key={index}
					position={[x + (index % 2 ? 0.6 : -0.55), terrainHeight(x, z) + 0.32, z + 0.7]}
					rotation={[0, index, index % 2 ? -0.18 : 0.18]}
					scale={[0.12, 0.42 * scale, 0.08]}
					geometry={SHARED_MEADOW_TUFT_GEO}
					material={SHARED_MEADOW_TUFT_MAT}
				/>
			))}
		</group>
	);
}

function HiddenSeed({ onActivate }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "easter-egg")!;
	const ground = terrainHeight(point.position[0], point.position[2]);
	return (
		<group position={[point.position[0], ground, point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<mesh position={[0, 0.22, 0]} rotation={[0.3, 0.42, -0.22]} scale={[0.17, 0.25, 0.15]}>
				<dodecahedronGeometry args={[1, 1]} />
				<meshStandardMaterial color="#cff7e8" emissive="#4fbfa5" emissiveIntensity={0.5} roughness={0.42} />
			</mesh>
		</group>
	);
}

export function Landmarks({ onActivate, isNight = false, language = "es" }: LandmarkProps) {
	const interestPoints = worldPoints.filter((point) => point.kind === "interest");

	return (
		<group>
			<Bridge isNight={isNight} />
			<StartStation onActivate={onActivate} isNight={isNight} language={language} />
			<JourneyMilestone onActivate={onActivate} isNight={isNight} language={language} />
			<ProjectStands onActivate={onActivate} isNight={isNight} language={language} />
			<PeopleGardenSanctuary onActivate={onActivate} isNight={isNight} language={language} />
			<TechLab onActivate={onActivate} isNight={isNight} language={language} />
			<RiwiPavilion onActivate={onActivate} isNight={isNight} language={language} />
			<DigitalDnaGrove onActivate={onActivate} isNight={isNight} language={language} />
			<AboutTerrace onActivate={onActivate} isNight={isNight} language={language} />
			<Cabin onActivate={onActivate} isNight={isNight} />
			<LakePier onActivate={onActivate} isNight={isNight} language={language} />
			<HiddenSeed onActivate={onActivate} isNight={isNight} />
			{interestPoints.map((point, index) => (
				<InterestArtifact key={point.id} point={point} index={index} onActivate={onActivate} />
			))}
			<MeadowGrass />
		</group>
	);
}