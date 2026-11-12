import { WorldPoint } from "@/types/world";
import { terrainHeight } from "@/components/world/terrain-utils";

/**
 * Returns the optimal standing/interaction position for a given destination point.
 * Ensures the avatar stops safely on clear path ground in front of landmark signposts.
 */
export function getDestinationInteractionSpot(target: WorldPoint): [number, number, number] {
	if (target.id === "skills") {
		return [10, 0, 12.0];
	}
	if (target.id === "about") {
		return [-14, 0, -8.2];
	}
	if (target.id === "dna") {
		return [14, 0, -7.8];
	}
	if (target.id === "garden") {
		return [-10, 0, 8.5];
	}
	if (target.id === "riwi") {
		return [12, 0, 6.5];
	}
	if (target.id === "journey") {
		return [0, 0, -6.8];
	}
	if (target.id === "contact") {
		return [0, 0, -22.2];
	}
	if (target.id === "project-0") {
		return [-3.8, 0, 8.4];
	}
	if (target.id === "project-1") {
		return [0, 0, 6.5];
	}
	if (target.id === "project-2") {
		return [3.8, 0, 8.4];
	}
	if (target.id === "interest-0") {
		return [0, 0, -15.2];
	}
	if (target.id === "interest-1") {
		return [-6, 0, 16.0];
	}
	if (target.id === "interest-2") {
		return [-4.5, 0, -17.0];
	}
	if (target.id.startsWith("human-")) {
		return [target.position[0], 0, target.position[2] - 0.8];
	}
	if (target.id.startsWith("project-")) {
		return [target.position[0], 0, target.position[2] + 1.2];
	}
	if (target.id.startsWith("interest-")) {
		return [target.position[0], 0, target.position[2] + 1.0];
	}
	return [target.position[0], target.position[1], target.position[2]];
}

/**
 * Height elevation for the arched wooden bridge.
 * Returns the continuous y coordinate if within bridge bounds or approach ramps, or null if outside.
 */
export function getBridgeDeckHeight(x: number, z: number): number | null {
	if (Math.abs(x) > 1.55) return null;

	// Core arched bridge span
	if (z >= -5.4 && z <= 0.4) {
		const arch = Math.max(0, 1 - ((z + 2.5) / 2.95) ** 2);
		return 0.41 + arch * 0.24;
	}

	// South approach ramp (smooth blend from path ground into bridge deck)
	if (z > 0.4 && z <= 1.0) {
		const t = (1.0 - z) / 0.6;
		const ground = terrainHeight(x, z);
		const deck = 0.41;
		return ground + (deck - ground) * t;
	}

	// North approach ramp (smooth blend from bridge deck to path ground)
	if (z < -5.4 && z >= -6.0) {
		const t = (z - (-6.0)) / 0.6;
		const ground = terrainHeight(x, z);
		const deck = 0.41;
		return ground + (deck - ground) * t;
	}

	return null;
}

type NodeId = string;

interface RoadNode {
	x: number;
	z: number;
	neighbors: NodeId[];
}

/**
 * Complete road network graph matching the cobblestone and dirt trails in the world.
 * Bridges, forks, and plazas are strictly mapped so pathfinding guarantees collision-free travel.
 */
export const ROAD_NODES: Record<NodeId, RoadNode> = {
	// South entrance & main trail
	south_start: { x: 0, z: 22.0, neighbors: ["south_road_1"] },
	south_road_1: { x: 0, z: 16.5, neighbors: ["south_start", "south_plaza"] },
	south_plaza: { x: 0, z: 11.0, neighbors: ["south_road_1", "garden_junc", "skills_junc", "project_west_1", "project_east_1", "project_mid_1"] },

	// Garden & Human Skills wing (West)
	garden_junc: { x: -4.0, z: 10.6, neighbors: ["south_plaza", "garden_mid"] },
	garden_mid: { x: -7.0, z: 10.2, neighbors: ["garden_junc", "garden_dest"] },
	garden_dest: { x: -10.0, z: 8.5, neighbors: ["garden_mid"] },

	// TechLab, Skills & Riwi wing (East)
	skills_junc: { x: 4.0, z: 10.6, neighbors: ["south_plaza", "skills_mid"] },
	skills_mid: { x: 7.0, z: 10.2, neighbors: ["skills_junc", "skills_dest", "riwi_junc"] },
	skills_dest: { x: 10.0, z: 12.0, neighbors: ["skills_mid"] },
	riwi_junc: { x: 11.2, z: 8.0, neighbors: ["skills_mid", "riwi_dest"] },
	riwi_dest: { x: 12.0, z: 6.5, neighbors: ["riwi_junc"] },

	// Project pedestals loop (South Central)
	project_west_1: { x: -2.4, z: 9.2, neighbors: ["south_plaza", "project_west_2"] },
	project_west_2: { x: -3.8, z: 7.2, neighbors: ["project_west_1", "project_west_3"] },
	project_west_3: { x: -2.2, z: 4.2, neighbors: ["project_west_2", "bridge_south_app"] },

	project_east_1: { x: 2.4, z: 9.2, neighbors: ["south_plaza", "project_east_2"] },
	project_east_2: { x: 3.8, z: 7.2, neighbors: ["project_east_1", "project_east_3"] },
	project_east_3: { x: 2.2, z: 4.2, neighbors: ["project_east_2", "bridge_south_app"] },

	project_mid_1: { x: 0, z: 8.0, neighbors: ["south_plaza", "project_mid_2"] },
	project_mid_2: { x: 0, z: 5.5, neighbors: ["project_mid_1", "bridge_south_app"] },

	// Wooden Bridge Transit Sequence
	bridge_south_app: { x: 0, z: 2.2, neighbors: ["project_west_3", "project_east_3", "project_mid_2", "bridge_south_gate"] },
	bridge_south_gate: { x: 0, z: 0.6, neighbors: ["bridge_south_app", "bridge_mid"] },
	bridge_mid: { x: 0, z: -2.5, neighbors: ["bridge_south_gate", "bridge_north_gate"] },
	bridge_north_gate: { x: 0, z: -5.6, neighbors: ["bridge_mid", "bridge_north_app"] },
	bridge_north_app: { x: 0, z: -6.8, neighbors: ["bridge_north_gate", "north_crossroad"] },

	// North Crossroads
	north_crossroad: { x: 0, z: -8.5, neighbors: ["bridge_north_app", "about_junc", "dna_junc", "cabin_south"] },

	// About David wing (North-West)
	about_junc: { x: -5.0, z: -9.5, neighbors: ["north_crossroad", "about_mid"] },
	about_mid: { x: -10.0, z: -9.5, neighbors: ["about_junc", "about_dest"] },
	about_dest: { x: -14.0, z: -8.2, neighbors: ["about_mid"] },

	// Digital DNA wing (North-East)
	dna_junc: { x: 5.0, z: -9.5, neighbors: ["north_crossroad", "dna_mid"] },
	dna_mid: { x: 10.0, z: -9.5, neighbors: ["dna_junc", "dna_dest"] },
	dna_dest: { x: 14.0, z: -7.8, neighbors: ["dna_mid"] },

	// Cabin area & Lake Pier bypass (North)
	// (Cabin is at [0, -18], radius 2.7. Pathways go safely around on both sides)
	cabin_south: { x: 0, z: -12.5, neighbors: ["north_crossroad", "cabin_east_1", "cabin_west_1", "cabin_front"] },
	cabin_front: { x: 0, z: -15.2, neighbors: ["cabin_south"] },

	cabin_east_1: { x: 3.8, z: -13.5, neighbors: ["cabin_south", "cabin_east_2"] },
	cabin_east_2: { x: 3.8, z: -18.0, neighbors: ["cabin_east_1", "cabin_east_3"] },
	cabin_east_3: { x: 1.8, z: -21.2, neighbors: ["cabin_east_2", "contact_dest"] },

	cabin_west_1: { x: -3.8, z: -13.5, neighbors: ["cabin_south", "cabin_west_2"] },
	cabin_west_2: { x: -3.8, z: -18.0, neighbors: ["cabin_west_1", "cabin_west_3"] },
	cabin_west_3: { x: -1.8, z: -21.2, neighbors: ["cabin_west_2", "contact_dest"] },

	contact_dest: { x: 0, z: -22.2, neighbors: ["cabin_east_3", "cabin_west_3"] },
};

/**
 * Finds the closest accessible road node to a given coordinate.
 * Respects river separation so a point south of the river doesn't pick a north node without crossing the bridge.
 */
function findClosestNode(x: number, z: number): NodeId {
	const riverThreshold = -2.5;
	const isSouth = z > riverThreshold;

	let bestId = "south_plaza";
	let bestDist = Infinity;

	for (const [id, node] of Object.entries(ROAD_NODES)) {
		// If node is bridge_mid, only consider if player is actually on bridge
		if (id === "bridge_mid") {
			if (Math.abs(x) > 1.55 || z < -6.0 || z > 1.0) continue;
		}

		// Avoid picking across-river nodes directly
		const nodeIsSouth = node.z > riverThreshold;
		if (id !== "bridge_mid" && id !== "bridge_south_gate" && id !== "bridge_north_gate") {
			if (isSouth !== nodeIsSouth) continue;
		}

		const dist = Math.hypot(x - node.x, z - node.z);
		if (dist < bestDist) {
			bestDist = dist;
			bestId = id;
		}
	}

	return bestId;
}

/**
 * Dijkstra shortest path algorithm over the road network graph.
 */
function findPathNodes(startNodeId: NodeId, endNodeId: NodeId): NodeId[] {
	if (startNodeId === endNodeId) return [startNodeId];

	const distances: Record<NodeId, number> = {};
	const previous: Record<NodeId, NodeId | null> = {};
	const unvisited = new Set<NodeId>(Object.keys(ROAD_NODES));

	for (const id of unvisited) {
		distances[id] = Infinity;
		previous[id] = null;
	}
	distances[startNodeId] = 0;

	while (unvisited.size > 0) {
		let currentId: NodeId | null = null;
		let lowestDist = Infinity;

		for (const id of unvisited) {
			if (distances[id] < lowestDist) {
				lowestDist = distances[id];
				currentId = id;
			}
		}

		if (!currentId || lowestDist === Infinity) break;
		if (currentId === endNodeId) break;

		unvisited.delete(currentId);
		const current = ROAD_NODES[currentId];

		for (const neighborId of current.neighbors) {
			if (!unvisited.has(neighborId)) continue;
			const neighbor = ROAD_NODES[neighborId];
			const edgeWeight = Math.hypot(current.x - neighbor.x, current.z - neighbor.z);
			const alt = distances[currentId] + edgeWeight;

			if (alt < distances[neighborId]) {
				distances[neighborId] = alt;
				previous[neighborId] = currentId;
			}
		}
	}

	const path: NodeId[] = [];
	let curr: NodeId | null = endNodeId;
	while (curr) {
		path.unshift(curr);
		curr = previous[curr];
	}

	return path[0] === startNodeId ? path : [];
}

/**
 * Generates an intelligent, collision-free waypoint route from any start coordinate to any destination.
 * Automatically guarantees safe passage over the bridge when crossing between north and south banks.
 * Follows actual roads and completely avoids landmarks and river banks.
 */
export function buildDynamicRoute(start: { x: number; z: number }, target: WorldPoint): [number, number, number][] {
	const destSpot = getDestinationInteractionSpot(target);
	const [destX, , destZ] = destSpot;

	// Check if already extremely close to destination
	const directDist = Math.hypot(start.x - destX, start.z - destZ);
	if (directDist < 2.0) {
		return [destSpot];
	}

	const startNodeId = findClosestNode(start.x, start.z);
	const endNodeId = findClosestNode(destX, destZ);

	const nodePath = findPathNodes(startNodeId, endNodeId);
	const route: [number, number, number][] = [];

	// Convert nodes to 3D waypoints
	for (const id of nodePath) {
		const node = ROAD_NODES[id];
		route.push([node.x, 0, node.z]);
	}

	// Append destination interaction spot if not already at the end
	if (route.length === 0 || Math.hypot(route[route.length - 1][0] - destX, route[route.length - 1][2] - destZ) > 1.2) {
		route.push(destSpot);
	}

	// Optimize start: if player is already past the first node towards the second, skip the first node
	if (route.length > 2) {
		const [firstX, , firstZ] = route[0];
		const [secondX, , secondZ] = route[1];
		const distToSecond = Math.hypot(start.x - secondX, start.z - secondZ);
		const distBetweenNodes = Math.hypot(firstX - secondX, firstZ - secondZ);

		// If player is closer to second node than the distance between nodes, and no river obstacle:
		const riverZ = -2.5;
		const crossesRiverDirectly = (start.z > riverZ && secondZ < riverZ) || (start.z < riverZ && secondZ > riverZ);
		if (distToSecond < distBetweenNodes * 0.95 && !crossesRiverDirectly) {
			route.shift();
		}
	}

	return route;
}
