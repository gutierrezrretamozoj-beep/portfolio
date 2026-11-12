"use client";

import { useSyncExternalStore } from "react";

export type DeviceQuality = "LOW" | "MEDIUM" | "HIGH";

function getQualitySnapshot(): DeviceQuality {
	const cores = navigator.hardwareConcurrency || 4;
	const narrowScreen = window.matchMedia("(max-width: 760px)").matches;
	const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
	if (narrowScreen || saveData || cores <= 4) return "LOW";
	if (cores <= 8) return "MEDIUM";
	return "HIGH";
}

function subscribe(onStoreChange: () => void) {
	const query = window.matchMedia("(max-width: 760px)");
	query.addEventListener("change", onStoreChange);
	window.addEventListener("resize", onStoreChange);
	return () => {
		query.removeEventListener("change", onStoreChange);
		window.removeEventListener("resize", onStoreChange);
	};
}

function getServerSnapshot(): DeviceQuality {
	return "MEDIUM";
}

export function useDevicePerformance() {
	return useSyncExternalStore(subscribe, getQualitySnapshot, getServerSnapshot);
}

export type WorldCapability = {
	canRun3D: boolean;
	reason: "ok" | "mobile" | "low-spec" | "no-webgl";
};

const SERVER_CAPABILITY: WorldCapability = { canRun3D: true, reason: "ok" };
let cachedCapability: WorldCapability | null = null;

function getCapabilitySnapshot(): WorldCapability {
	const isNarrowOrTablet = window.matchMedia("(max-width: 1023px)").matches;
	const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
	const isMobileUA = /Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(navigator.userAgent);

	const isMobileDevice = isNarrowOrTablet || (isCoarsePointer && isMobileUA) || isMobileUA;
	const next: WorldCapability = isMobileDevice
		? { canRun3D: false, reason: "mobile" }
		: { canRun3D: true, reason: "ok" };

	if (cachedCapability && cachedCapability.canRun3D === next.canRun3D && cachedCapability.reason === next.reason) {
		return cachedCapability;
	}
	cachedCapability = next;
	return next;
}

function subscribeCapability(onStoreChange: () => void) {
	const query = window.matchMedia("(max-width: 1023px)");
	query.addEventListener("change", onStoreChange);
	window.addEventListener("resize", onStoreChange);
	return () => {
		query.removeEventListener("change", onStoreChange);
		window.removeEventListener("resize", onStoreChange);
	};
}

export function useCanRun3DWorld(): WorldCapability {
	return useSyncExternalStore(subscribeCapability, getCapabilitySnapshot, () => SERVER_CAPABILITY);
}