"use client";

import { useMemo } from "react";
import { Color, DoubleSide } from "three";
import { digitalDna } from "@/data/dna";
import { treePositions, worldPoints } from "@/data/world";
import { terrainHeight } from "@/components/world/terrain-utils";
import type { WorldPoint } from "@/types/world";

type LandmarkProps = { onActivate: (pointId: string) => void };

function Bridge() {
	const planks = Array.from({ length: 13 }, (_, index) => -5.3 + index * 0.48);
	return (
		<group position={[0, 0, 0]}>
			{planks.map((z, index) => (
				<mesh key={index} position={[0, 0.33, z]} rotation={[-0.012, 0, 0]} castShadow receiveShadow>
					<boxGeometry args={[3.5, 0.14, 0.42]} />
					<meshStandardMaterial color={index % 2 ? "#b5916d" : "#c5a27b"} roughness={0.86} />
				</mesh>
			))}
			{[-1.72, 1.72].map((x) => (
				<group key={x} position={[x, 0, 0]}>
					{[-5.4, -3.7, -2, -0.3, 1.4].map((z) => (
						<mesh key={z} position={[0, 0.73, z]} castShadow>
							<cylinderGeometry args={[0.09, 0.12, 0.8, 7]} />
							<meshStandardMaterial color="#997956" roughness={0.9} />
						</mesh>
					))}
					<mesh position={[0, 1.05, -2]} rotation={[0, 0, Math.PI / 2]} castShadow>
						<cylinderGeometry args={[0.08, 0.08, 7, 7]} />
						<meshStandardMaterial color="#a78561" roughness={0.88} />
					</mesh>
				</group>
			))}
		</group>
	);
}

function TechLab({ onActivate }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "skills")!;
	return (
		<group position={[point.position[0], terrainHeight(point.position[0], point.position[2]), point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<mesh position={[0, 1.42, 0]} castShadow receiveShadow>
				<boxGeometry args={[5.2, 2.8, 4.2]} />
				<meshStandardMaterial color="#d8d1b9" roughness={0.73} />
			</mesh>
			<mesh position={[0, 2.96, 0]} castShadow>
				<boxGeometry args={[5.7, 0.28, 4.65]} />
				<meshStandardMaterial color="#89a99b" roughness={0.68} />
			</mesh>
			{[-1.55, 1.55].map((x) => (
				<mesh key={x} position={[x, 1.7, 2.115]}>
					<boxGeometry args={[1.35, 1.48, 0.045]} />
					<meshPhysicalMaterial color="#bdefff" roughness={0.2} metalness={0.05} transparent opacity={0.64} side={DoubleSide} />
				</mesh>
			))}
			<mesh position={[0, 1.05, 2.15]}>
				<boxGeometry args={[0.94, 2.05, 0.09]} />
				<meshStandardMaterial color="#9b8165" roughness={0.8} />
			</mesh>
			<mesh position={[0, 3.2, 2.45]}>
				<boxGeometry args={[2.8, 0.44, 0.12]} />
				<meshStandardMaterial color="#eff5e7" roughness={0.6} />
			</mesh>
			<mesh position={[0, 3.2, 2.53]}>
				<boxGeometry args={[2.6, 0.08, 0.05]} />
				<meshStandardMaterial color="#668c80" roughness={0.75} />
			</mesh>
			<Plant position={[-3.1, 0, 1.9]} scale={0.8} />
			<Plant position={[3.1, 0, 1.4]} scale={0.95} />
		</group>
	);
}

function Cabin({ onActivate }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "interest-0")!;
	return (
		<group position={[0, terrainHeight(0, -18), -18]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<mesh position={[0, 1.2, 0]} castShadow receiveShadow>
				<boxGeometry args={[4.6, 2.4, 3.6]} />
				<meshStandardMaterial color="#c4aa86" roughness={0.91} />
			</mesh>
			<mesh position={[0, 2.77, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
				<coneGeometry args={[3.25, 1.6, 4]} />
				<meshStandardMaterial color="#91aa9a" roughness={0.86} />
			</mesh>
			<mesh position={[0, 0.82, 1.82]} castShadow>
				<boxGeometry args={[0.9, 1.65, 0.11]} />
				<meshStandardMaterial color="#8f7359" roughness={0.8} />
			</mesh>
			<mesh position={[-1.35, 1.42, 1.83]}>
				<boxGeometry args={[0.78, 0.72, 0.07]} />
				<meshPhysicalMaterial color="#d9f4f1" transparent opacity={0.72} roughness={0.15} />
			</mesh>
			<mesh position={[1.35, 1.42, 1.83]}>
				<boxGeometry args={[0.78, 0.72, 0.07]} />
				<meshPhysicalMaterial color="#d9f4f1" transparent opacity={0.72} roughness={0.15} />
			</mesh>
			<mesh position={[0, 3.15, 2.12]}>
				<boxGeometry args={[2.2, 0.38, 0.1]} />
				<meshStandardMaterial color="#eff1df" roughness={0.8} />
			</mesh>
			<Plant position={[-2.5, 0, 1.9]} scale={0.76} />
			<Plant position={[2.55, 0, 1.75]} scale={0.72} />
		</group>
	);
}

function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
	return (
		<group position={position} scale={scale}>
			<mesh position={[0, 0.23, 0]} castShadow>
				<cylinderGeometry args={[0.26, 0.31, 0.44, 12]} />
				<meshStandardMaterial color="#c9b399" roughness={0.92} />
			</mesh>
			{[-1, 0, 1].map((leaf) => (
				<mesh key={leaf} position={[leaf * 0.16, 0.62 + (leaf === 0 ? 0.1 : 0), 0]} rotation={[0, leaf * 0.5, -leaf * 0.42]} scale={[0.13, 0.52, 0.09]} castShadow>
					<sphereGeometry args={[1, 12, 9]} />
					<meshStandardMaterial color={leaf === 0 ? "#83ad80" : "#9fc58b"} roughness={0.8} />
				</mesh>
			))}
		</group>
	);
}

function ProjectStands({ onActivate }: LandmarkProps) {
	const points = worldPoints.filter((point) => point.kind === "project");
	return (
		<group>
			{points.map((point, index) => (
				<group key={point.id} position={[point.position[0], terrainHeight(point.position[0], point.position[2]), point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
					<mesh position={[0, 0.24, 0]} castShadow receiveShadow>
						<cylinderGeometry args={[0.82, 0.95, 0.48, 8]} />
						<meshStandardMaterial color={index === 1 ? "#d8c9a9" : "#b9c3aa"} roughness={0.84} />
					</mesh>
					<mesh position={[0, 0.92, 0]} scale={0.4 + (index % 2) * 0.08} castShadow>
						<dodecahedronGeometry args={[1, 1]} />
						<meshStandardMaterial color={["#f0c3d0", "#b7dce7", "#cee5c5"][index]} emissive={["#d985a7", "#72bdcf", "#90bd83"][index]} emissiveIntensity={0.12} roughness={0.3} metalness={0.04} />
					</mesh>
					<mesh position={[0, 1.63, 0]}>
						<boxGeometry args={[0.92, 0.4, 0.08]} />
						<meshStandardMaterial color="#f8fbff" roughness={0.78} />
					</mesh>
				</group>
			))}
		</group>
	);
}

function DigitalDnaGrove({ onActivate }: LandmarkProps) {
	const point = worldPoints.find((item) => item.id === "dna")!;
	return (
		<group position={[point.position[0], terrainHeight(point.position[0], point.position[2]), point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
				<ringGeometry args={[3.1, 3.25, 48]} />
				<meshStandardMaterial color="#d4e8dc" roughness={0.78} />
			</mesh>
			{digitalDna.map((item, index) => {
				const angle = (index / digitalDna.length) * Math.PI * 2;
				return (
					<mesh key={item.name} position={[Math.cos(angle) * 2.35, 0.55, Math.sin(angle) * 2.35]} rotation={[0, angle, 0]}>
						<dodecahedronGeometry args={[0.38, 1]} />
						<meshStandardMaterial color={new Color(item.color)} emissive={new Color(item.color)} emissiveIntensity={0.08} roughness={0.26} metalness={0.06} />
					</mesh>
				);
			})}
			<Plant position={[0, 0, 0]} scale={1.25} />
		</group>
	);
}

function InterestArtifact({ point, index, onActivate }: { point: WorldPoint; index: number; onActivate: LandmarkProps["onActivate"] }) {
	const ground = terrainHeight(point.position[0], point.position[2]);
	const base = ["#d7e7db", "#d4eaf1", "#e8dff5"][index % 3];
	return (
		<group position={[point.position[0], ground, point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
			<mesh position={[0, 0.18, 0]} castShadow>
				<cylinderGeometry args={[0.48, 0.56, 0.36, 12]} />
				<meshStandardMaterial color={base} roughness={0.7} />
			</mesh>
			{index === 0 && <GameController />}
			{index === 1 && <Headphones />}
			{index === 2 && <mesh position={[0, 0.83, 0]}><boxGeometry args={[0.75, 0.92, 0.12]} /><meshStandardMaterial color="#789a91" roughness={0.28} metalness={0.14} /></mesh>}
			{index === 3 && <CatFigure />}
			{index === 4 && <mesh position={[0, 0.8, 0]} rotation={[0.3, 0.4, 0]}><octahedronGeometry args={[0.52, 1]} /><meshStandardMaterial color="#c6c4ed" roughness={0.34} /></mesh>}
			{index === 5 && <mesh position={[0, 0.74, 0]} rotation={[0.25, 0.3, 0]}><torusGeometry args={[0.34, 0.12, 9, 16]} /><meshStandardMaterial color="#e8c1b3" roughness={0.44} /></mesh>}
			{index === 6 && <Plant position={[0, 0.36, 0]} scale={0.9} />}
			{index === 7 && <TravelCase />}
			{index === 8 && <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.35, 0.42, 0.55, 12]} /><meshStandardMaterial color="#d1a77e" roughness={0.6} /></mesh>}
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

function WorldSigns({ onActivate }: LandmarkProps) {
	const signs = worldPoints.filter((point) => ["about", "journey", "riwi", "contact"].includes(point.id));
	return (
		<group>
			{signs.map((point) => (
				<group key={point.id} position={[point.position[0], terrainHeight(point.position[0], point.position[2]), point.position[2]]} onClick={(event) => { event.stopPropagation(); onActivate(point.id); }}>
					<mesh position={[0, 0.75, 0]} castShadow><cylinderGeometry args={[0.09, 0.14, 1.5, 7]} /><meshStandardMaterial color="#987f63" roughness={0.85} /></mesh>
					<mesh position={[0, 1.36, 0]} castShadow><boxGeometry args={[1.25, 0.48, 0.12]} /><meshStandardMaterial color="#f8f5e8" roughness={0.78} /></mesh>
					<mesh position={[0, 1.37, 0.075]}><boxGeometry args={[0.91, 0.055, 0.025]} /><meshStandardMaterial color={point.id === "contact" ? "#5b6ff5" : "#74998a"} roughness={0.72} /></mesh>
				</group>
			))}
		</group>
	);
}

function MeadowGrass() {
	const grassPositions = useMemo(() => treePositions.filter((_, index) => index % 2 === 0).slice(0, 14), []);
	return (
		<group>
			{grassPositions.map(([x, , z, scale], index) => (
				<mesh key={index} position={[x + (index % 2 ? 0.6 : -0.55), terrainHeight(x, z) + 0.32, z + 0.7]} rotation={[0, index, index % 2 ? -0.18 : 0.18]} scale={[0.12, 0.42 * scale, 0.08]}>
					<sphereGeometry args={[1, 9, 6]} />
					<meshStandardMaterial color="#a8c78f" roughness={0.9} />
				</mesh>
			))}
		</group>
	);
}

export function Landmarks({ onActivate }: LandmarkProps) {
	const interestPoints = worldPoints.filter((point) => point.kind === "interest");
	return (
		<group>
			<Bridge />
			<TechLab onActivate={onActivate} />
			<Cabin onActivate={onActivate} />
			<ProjectStands onActivate={onActivate} />
			<DigitalDnaGrove onActivate={onActivate} />
			<WorldSigns onActivate={onActivate} />
			<HiddenSeed onActivate={onActivate} />
			{interestPoints.map((point, index) => (
				<InterestArtifact key={point.id} point={point} index={index} onActivate={onActivate} />
			))}
			<MeadowGrass />
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
				<meshStandardMaterial color="#cff7e8" emissive="#4fbfa5" emissiveIntensity={0.18} roughness={0.42} />
			</mesh>
		</group>
	);
}