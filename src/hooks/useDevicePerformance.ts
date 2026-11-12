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

/**
 * Robustly detects whether the current device is a mobile phone or tablet (iPad, Android tablet, etc.).
 * Returns true for mobile phones and tablets (which receive the 2D Builder Portfolio).
 * Returns false for desktop and laptop PCs (Windows, macOS, Linux, ChromeOS), which receive the 3D game.
 *
 * NOTE: Window size / screen resolution is deliberately NOT used here so that minimizing, resizing,
 * or tiling the browser window on a PC will never falsely switch it to the mobile view.
 */
export function isMobileOrTabletDevice(): boolean {
	if (typeof window === "undefined" || typeof navigator === "undefined") {
		return false;
	}

	const ua = navigator.userAgent || "";
	const nav = navigator as unknown as {
		userAgentData?: {
			mobile?: boolean;
			platform?: string;
		};
	};

	// 1. Chromium Client Hints (mobile flag is explicitly true for mobile phones & mobile browsers)
	if (nav.userAgentData?.mobile === true) {
		return true;
	}

	// 2. Windows PC (Desktop, Laptop, Surface running desktop Windows): always PC
	if (/Windows NT|Windows/i.test(ua)) {
		return false;
	}

	// 3. iPad / iPadOS (Safari on iPadOS 13+ reports as "Macintosh" with multi-touch)
	const isIPad =
		/iPad/i.test(ua) ||
		((/Macintosh/i.test(ua) || navigator.platform === "MacIntel") && (navigator.maxTouchPoints || 0) > 1);
	if (isIPad) {
		return true;
	}

	// 4. macOS PC (Desktop Mac, MacBook without multi-touch): always PC
	if (/Macintosh|Mac OS X/i.test(ua)) {
		return false;
	}

	// 5. Android (both Phones and Tablets)
	if (/Android/i.test(ua)) {
		return true;
	}

	// 6. iPhone, iPod, and iOS devices
	if (/iPhone|iPod/i.test(ua)) {
		return true;
	}

	// 7. General tablets and mobile browsers
	if (/Tablet|Mobile|Silk|Kindle|PlayBook|BB10|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
		return true;
	}

	// 8. Linux desktop (Ubuntu, Fedora, Arch, etc.): always PC (Android already caught above)
	if (/Linux|X11/i.test(ua)) {
		return false;
	}

	// 9. Fallback touch check: touch devices with coarse pointer that are not desktop OS
	const hasTouch = (navigator.maxTouchPoints || 0) > 0 || "ontouchstart" in window;
	const isCoarse = window.matchMedia?.("(pointer: coarse)").matches;
	if (hasTouch && isCoarse) {
		return true;
	}

	return false;
}

function getCapabilitySnapshot(): WorldCapability {
	if (cachedCapability) return cachedCapability;

	const isMobileOrTablet = isMobileOrTabletDevice();
	cachedCapability = isMobileOrTablet
		? { canRun3D: false, reason: "mobile" }
		: { canRun3D: true, reason: "ok" };

	return cachedCapability;
}

function subscribeCapability() {
	// Device capability is constant per device/session and does not change on window resize
	return () => {};
}

export function useCanRun3DWorld(): WorldCapability {
	return useSyncExternalStore(subscribeCapability, getCapabilitySnapshot, () => SERVER_CAPABILITY);
}