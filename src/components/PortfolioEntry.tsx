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
		<>
			{/* Accessible semantic DOM tree for search engine crawlers (Googlebot) and screen readers */}
			<section className="sr-only" aria-label="Información profesional de José David Gutiérrez">
				<h1>José David Gutiérrez Retamozo | Full-Stack Software Engineer</h1>
				<p>
					Curioso por naturaleza, desarrollador por pasión. Especializado en React, TypeScript, Next.js, NestJS,
					Three.js y PostgreSQL en Barranquilla, Colombia.
				</p>
				<h2>Habilidades Técnicas</h2>
				<p>React, Next.js, TypeScript, JavaScript, Three.js, WebGL, Tailwind CSS, PostgreSQL, NestJS, Git, Docker</p>
				<h2>Proyectos Destacados</h2>
				<ul>
					<li>BioSanctuary OS — Plataforma SaaS multitenant para santuarios de fauna silvestre con PostgreSQL, Next.js 16, Three.js y Rate Limiting</li>
					<li>CoSpace — Sistema fullstack de reservas de coworking bajo demanda con transacciones atómicas, Next.js 16 y Prisma ORM</li>
					<li>Vice City — Plataforma de gestión de reservas deportivas, integración de pagos Stripe con webhooks y acceso por QR</li>
					<li>Cinema React — Catálogo cinematográfico dinámico con React, TypeScript y Tailwind CSS consumiendo APIs REST</li>
				</ul>
				<h2>Contacto y Perfiles</h2>
				<p>Email: gutierrezrretamozoj@gmail.com</p>
				<a href="https://github.com/gutierrezrretamozoj-beep">GitHub de José David Gutiérrez</a>
				<a href="https://www.linkedin.com/in/jose-david-gutierrez-retamozo-a77440257/">LinkedIn de José David Gutiérrez</a>
			</section>

			<Suspense fallback={<WorldLoadingScreen hidden={false} />}>
				<LazyWorldExperience />
			</Suspense>
		</>
	);
}
