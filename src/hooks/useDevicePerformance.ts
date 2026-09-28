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