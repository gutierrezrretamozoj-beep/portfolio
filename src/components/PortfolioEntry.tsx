"use client";

import { lazy, Suspense, useState } from "react";
import { BuilderPortfolio } from "@/components/builder/BuilderPortfolio";
import { WorldLoadingScreen } from "@/components/ui/WorldLoadingScreen";
import { useCanRun3DWorld } from "@/hooks/useDevicePerformance";

const LazyWorldExperience = lazy(() =>
	import("@/components/world/WorldExperience").then((mod) => ({ default: mod.WorldExperience })),
);

function getInitialModeOverride(): "3d" | "lite" | null {
	if (typeof window === "undefined") return null;
	const param = new URLSearchParams(window.location.search).get("mode");
	if (param === "lite" || param === "builder") return "lite";
	if (param === "3d" || param === "game") return "3d";
	return null;
}

export function PortfolioEntry() {
	const capability = useCanRun3DWorld();
	const [overrideMode, setOverrideMode] = useState<"3d" | "lite" | null>(() => getInitialModeOverride());

	const use3D = overrideMode === "lite" ? false : overrideMode === "3d" ? capability.canRun3D : capability.canRun3D;

	if (!use3D) {
		return (
			<BuilderPortfolio
				canSwitchTo3D={capability.canRun3D}
				onSwitchTo3D={() => setOverrideMode("3d")}
				reason={capability.reason}
			/>
		);
	}

	return (
		<Suspense fallback={<WorldLoadingScreen hidden={false} />}>
			<LazyWorldExperience />
		</Suspense>
	);
}
