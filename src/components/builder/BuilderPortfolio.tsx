"use client";

import { ArrowUpRight, Code2, Gamepad2, Globe, Mail, RotateCcw, SkipForward, Sparkles } from "lucide-react";
import { createContext, type CSSProperties, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
	i18nDigitalDna,
	i18nHumanSkills,
	i18nInterests,
	i18nJourney,
	i18nProfile,
	i18nProjects,
	i18nRiwiHighlights,
	i18nWorldPoints,
	type Language,
} from "@/data/i18n";
import { currentlyLearning } from "@/data/learning";
import { profile } from "@/data/profile";
import { skillGroups } from "@/data/skills";
import "@/components/builder/builder.css";

const TOTAL_BLOCKS = 10;

const AGENT_CURSORS = [
	{ id: "layout", label: "layout", color: "#38bdf8" },
	{ id: "copy", label: "copy", color: "#f472b6" },
	{ id: "ui", label: "ui-grid", color: "#fbbf24" },
	{ id: "css", label: "tokens", color: "#34d399" },
	{ id: "data", label: "data", color: "#a78bfa" },
	{ id: "a11y", label: "a11y", color: "#fb7185" },
];

type BlockStage = "pending" | "blueprint" | "building" | "built";

const BlueprintStepContext = createContext<{ stage: BlockStage; currentStep: number }>({
	stage: "built",
	currentStep: 99,
});

function ConstructPiece({
	fromX = -68,
	fromY = 28,
	delay = 0,
	step,
	agentIndex = 0,
	children,
}: {
	fromX?: number;
	fromY?: number;
	delay?: number;
	step?: number;
	agentIndex?: number;
	children: ReactNode;
}) {
	const { stage, currentStep } = useContext(BlueprintStepContext);
	const agent = AGENT_CURSORS[agentIndex % AGENT_CURSORS.length];
	const resolvedStep = step ?? Math.min(5, Math.floor(delay / 110));

	const stateClass =
		stage === "built" || currentStep > resolvedStep + 1
			? "is-placed"
			: stage === "building" && (currentStep === resolvedStep || currentStep === resolvedStep + 1)
				? "is-carrying"
				: "is-waiting";

	const style = {
		"--from-x": `${fromX}px`,
		"--from-y": `${fromY}px`,
	} as CSSProperties;

	return (
		<div
			className={`bp-piece ${stateClass}`}
			style={style}
			data-agent-target={stateClass === "is-carrying" ? agent.id : undefined}
		>
			<div className="bp-piece-slot">
				<span className="bp-piece-wireframe-label" aria-hidden="true">
					[{agent.label}: slot-{resolvedStep + 1}]
				</span>
				<div className="bp-piece-body">
					<span className="bp-piece-cursor" aria-hidden="true">
						<svg width="13" height="13" viewBox="0 0 16 16" fill={agent.color}>
							<path d="M1 1L14 6.5L8.2 8.6L6.2 14.5L1 1Z" />
						</svg>
						<span className="builder-swarm-tag" style={{ background: agent.color }}>
							{agent.label}
						</span>
					</span>
					{children}
				</div>
			</div>
		</div>
	);
}

function ConstructWords({ text }: { text: string; baseDelay?: number }) {
	const { stage, currentStep } = useContext(BlueprintStepContext);
	const stateClass =
		stage === "built" || currentStep > 3
			? "is-typed"
			: stage === "building" && currentStep >= 1
				? "is-typing"
				: "is-waiting";

	return (
		<span
			className={`bp-type-wrap ${stateClass}`}
			data-agent-target={stateClass === "is-typing" ? "copy" : undefined}
		>
			<span className="bp-type-text">{text}</span>
			<span className="bp-type-caret" aria-hidden="true" />
		</span>
	);
}

function BlueprintBlock({
	id,
	tag,
	buildEpoch,
	forceBuilt,
	transparentWhenBuilt = false,
	onConstructStart,
	onConstructDone,
	children,
}: {
	id: string;
	tag: string;
	buildEpoch: number;
	forceBuilt: boolean;
	transparentWhenBuilt?: boolean;
	onConstructStart: (id: string) => void;
	onConstructDone: (id: string) => void;
	children: ReactNode;
}) {
	const blockRef = useRef<HTMLDivElement>(null);
	const [stage, setStage] = useState<BlockStage>("pending");
	const [currentStep, setCurrentStep] = useState<number>(-1);

	useEffect(() => {
		if (forceBuilt) {
			setStage("built");
			setCurrentStep(99);
			return;
		}
		setStage("pending");
		setCurrentStep(-1);
		const el = blockRef.current;
		if (!el || typeof IntersectionObserver === "undefined") {
			setStage("built");
			setCurrentStep(99);
			return;
		}

		const timers: number[] = [];

		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						onConstructStart(id);
						setStage("blueprint");
						setCurrentStep(-1);

						timers.push(
							window.setTimeout(() => {
								setStage("building");
								setCurrentStep(0);
							}, 260),
						);

						for (let step = 1; step <= 5; step += 1) {
							timers.push(
								window.setTimeout(() => {
									setCurrentStep(step);
								}, 260 + step * 310),
							);
						}

						timers.push(
							window.setTimeout(() => {
								setStage("built");
								setCurrentStep(99);
								onConstructDone(id);
							}, 2250),
						);
						observer.disconnect();
					}
				}
			},
			{ threshold: 0.06, rootMargin: "0px 0px -3% 0px" },
		);

		observer.observe(el);
		return () => {
			observer.disconnect();
			for (const t of timers) window.clearTimeout(t);
		};
	}, [buildEpoch, forceBuilt, id, onConstructStart, onConstructDone]);

	const effectiveStage: BlockStage = forceBuilt ? "built" : stage;
	const effectiveStep = forceBuilt ? 99 : currentStep;

	return (
		<BlueprintStepContext.Provider value={{ stage: effectiveStage, currentStep: effectiveStep }}>
			<div ref={blockRef} className={`bp-block stage-${effectiveStage}${transparentWhenBuilt ? " stage-transparent" : ""}`}>
				<span className="bp-meta-tag">{tag}</span>
				<span className="bp-scanline" aria-hidden="true" />
				<span className="bp-handle tl" />
				<span className="bp-handle tr" />
				<span className="bp-handle bl" />
				<span className="bp-handle br" />
				<div className="bp-content">{children}</div>
			</div>
		</BlueprintStepContext.Provider>
	);
}

type BuilderPortfolioProps = {
	canSwitchTo3D?: boolean;
	onSwitchTo3D?: () => void;
	reason?: "ok" | "mobile" | "low-spec" | "no-webgl";
};

export function BuilderPortfolio({
	canSwitchTo3D = false,
	onSwitchTo3D,
	reason = "mobile",
}: BuilderPortfolioProps) {
	const [lang, setLang] = useState<Language>("es");
	const [bootDone, setBootDone] = useState(false);
	const [buildEpoch, setBuildEpoch] = useState(0);
	const [forceBuilt, setForceBuilt] = useState(false);
	const [builtIds, setBuiltIds] = useState<Set<string>>(() => new Set());
	const [buildingIds, setBuildingIds] = useState<Set<string>>(() => new Set());
	const [cursorTick, setCursorTick] = useState(0);

	// Balanced 550ms boot splash
	useEffect(() => {
		if (bootDone) return;
		const timer = window.setTimeout(() => setBootDone(true), 550);
		return () => window.clearTimeout(timer);
	}, [bootDone]);

	// Roam cursors across the ENTIRE screen while any block is actively constructing
	const isConstructing = !forceBuilt && buildingIds.size > 0;
	useEffect(() => {
		if (!isConstructing) return;
		const interval = window.setInterval(() => {
			setCursorTick((t) => t + 1);
		}, 240);
		return () => window.clearInterval(interval);
	}, [isConstructing]);

	const handleConstructStart = useCallback((id: string) => {
		setBuildingIds((prev) => {
			if (prev.has(id)) return prev;
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}, []);

	const handleConstructDone = useCallback((id: string) => {
		setBuildingIds((prev) => {
			if (!prev.has(id)) return prev;
			const next = new Set(prev);
			next.delete(id);
			return next;
		});
		setBuiltIds((prev) => {
			if (prev.has(id)) return prev;
			const next = new Set(prev);
			next.add(id);
			return next;
		});
	}, []);

	const copy = i18nProfile[lang];
	const localizedProjects = i18nProjects[lang];
	const localizedDna = i18nDigitalDna[lang];
	const localizedJourney = i18nJourney[lang];
	const localizedRiwi = i18nRiwiHighlights[lang];
	const localizedHuman = i18nHumanSkills[lang];
	const localizedInterests = i18nInterests[lang];

	const [cursorPositions, setCursorPositions] = useState<
		Array<{ id: string; label: string; color: string; px: number; py: number; visible: boolean }>
	>(() =>
		AGENT_CURSORS.map((agent) => ({
			...agent,
			px: 120,
			py: 120,
			visible: false,
		})),
	);

	// Track real DOM [data-agent-target] slots so cursors fly directly onto what they are building
	useEffect(() => {
		const vw = window.innerWidth;
		const vh = window.innerHeight;

		if (!bootDone) {
			const angleStep = (Math.PI * 2) / AGENT_CURSORS.length;
			setCursorPositions(
				AGENT_CURSORS.map((agent, idx) => {
					const a = idx * angleStep + 0.4;
					return {
						...agent,
						px: vw * 0.5 + Math.cos(a) * Math.min(vw, vh) * 0.22,
						py: vh * 0.5 + Math.sin(a) * Math.min(vw, vh) * 0.18,
						visible: true,
					};
				}),
			);
			return;
		}

		if (!isConstructing) {
			setCursorPositions((prev) => prev.map((agent) => ({ ...agent, visible: false })));
			return;
		}

		const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-agent-target]"));
		const visibleTargets = targets
			.map((el) => ({
				agentId: el.dataset.agentTarget ?? "",
				rect: el.getBoundingClientRect(),
			}))
			.filter(({ rect }) => rect.bottom > 20 && rect.top < vh - 20 && rect.width > 0);

		setCursorPositions(
			AGENT_CURSORS.map((agent, idx) => {
				const own = visibleTargets.find((t) => t.agentId === agent.id);
				if (own) {
					return {
						...agent,
						px: Math.max(8, Math.min(vw - 88, own.rect.left + 8)),
						py: Math.max(56, Math.min(vh - 64, own.rect.top + 6)),
						visible: true,
					};
				}

				if (visibleTargets.length > 0) {
					const fallback = visibleTargets[(idx + cursorTick) % visibleTargets.length];
					const offsetX = ((idx % 3) - 1) * 26;
					const offsetY = ((idx % 2) * 24) + 14;
					return {
						...agent,
						px: Math.max(8, Math.min(vw - 88, fallback.rect.right - 64 + offsetX)),
						py: Math.max(56, Math.min(vh - 64, fallback.rect.top + offsetY)),
						visible: true,
					};
				}

				return { ...agent, px: vw * 0.5, py: vh + 60, visible: false };
			}),
		);
	}, [bootDone, cursorTick, isConstructing]);

	const handleRerun = () => {
		setForceBuilt(false);
		setBuiltIds(new Set());
		setBuildingIds(new Set());
		setBootDone(false);
		setBuildEpoch((e) => e + 1);
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	const handleSkip = () => {
		setBootDone(true);
		setForceBuilt(true);
		setBuildingIds(new Set());
	};

	const isEs = lang === "es";
	const builtCount = forceBuilt ? TOTAL_BLOCKS : Math.min(TOTAL_BLOCKS, builtIds.size);
	const progressPct = Math.round((builtCount / TOTAL_BLOCKS) * 100);

	return (
		<div className="builder-root">
			<div className="builder-grid-bg" aria-hidden="true" />

			{/* Swarm Boot Splash */}
			<div className={`builder-boot-overlay${bootDone ? " is-done" : ""}`} aria-hidden={bootDone}>
				<div className="builder-boot-core">JG</div>
			</div>

			{/* Full-Screen Roaming Multi-Agent Cursors */}
			{cursorPositions.map((agent) => (
				<div
					key={agent.id}
					className="builder-swarm-cursor"
					style={{
						transform: `translate3d(${Math.round(agent.px)}px, ${Math.round(agent.py)}px, 0)`,
						opacity: agent.visible ? 0.95 : 0,
					}}
					aria-hidden="true"
				>
					<svg width="14" height="14" viewBox="0 0 16 16" fill={agent.color}>
						<path d="M1 1L14 6.5L8.2 8.6L6.2 14.5L1 1Z" />
					</svg>
					<span className="builder-swarm-tag" style={{ background: agent.color }}>
						{agent.label}
					</span>
				</div>
			))}

			{/* Top Navigation */}
			<header className="builder-nav">
				<div className="builder-nav-inner">
					<div className="builder-brand">
						<span className="builder-brand-badge">JG</span>
						<span>{profile.fullName}</span>
					</div>

					<nav className="builder-nav-links" aria-label={isEs ? "Secciones" : "Sections"}>
						<a href="#bp-about">{isEs ? "Sobre mí" : "About"}</a>
						<a href="#bp-journey">{isEs ? "Trayectoria" : "Journey"}</a>
						<a href="#bp-skills">{isEs ? "Habilidades" : "Skills"}</a>
						<a href="#bp-projects">{isEs ? "Proyectos" : "Projects"}</a>
						<a href="#bp-contact">{isEs ? "Contacto" : "Contact"}</a>
					</nav>

					<div className="builder-nav-actions">
						<button
							type="button"
							className="builder-pill-btn"
							onClick={() => setLang((prev) => (prev === "es" ? "en" : "es"))}
						>
							<Globe size={13} />
							<span>{lang.toUpperCase()}</span>
						</button>

						{canSwitchTo3D && onSwitchTo3D ? (
							<button type="button" className="builder-pill-btn is-primary" onClick={onSwitchTo3D}>
								<Gamepad2 size={14} />
								<span>{isEs ? "Modo Juego 3D" : "3D Game Mode"}</span>
							</button>
						) : (
							<span className="builder-pill-btn" title={reason === "mobile" ? "Optimizado para móvil/tablet" : "Optimizado para este equipo"}>
								<Sparkles size={13} />
								<span>{isEs ? "Vista Constructiva" : "Builder View"}</span>
							</span>
						)}
					</div>
				</div>
			</header>

			{/* Main Self-Building Portfolio */}
			<main className="builder-main">
				{/* 1. HERO */}
				<section id="bp-hero">
					<BlueprintBlock
						id="hero"
						tag="HERO · 1120 × 360"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-hero">
							<div>
								<ConstructPiece fromX={-54} fromY={-22} delay={60} agentIndex={3}>
									<div className="builder-eyebrow">
										<Code2 size={14} />
										<span>{copy.descriptor}</span>
									</div>
								</ConstructPiece>
								<h1>
									<ConstructWords text={copy.headline} baseDelay={140} />
								</h1>
								<ConstructPiece fromX={-44} fromY={28} delay={420} agentIndex={1}>
									<p>{i18nWorldPoints[lang].about.description}</p>
								</ConstructPiece>
								<ConstructPiece fromX={-36} fromY={36} delay={560} agentIndex={5}>
									<div className="builder-cta-row">
										<a href="#bp-projects" className="builder-btn-primary">
											<span>{isEs ? "Ver proyectos" : "Explore projects"}</span>
											<ArrowUpRight size={16} />
										</a>
										<a href="#bp-contact" className="builder-btn-secondary">
											<Mail size={15} />
											<span>{isEs ? "Contactar" : "Get in touch"}</span>
										</a>
									</div>
								</ConstructPiece>
							</div>

							<ConstructPiece fromX={68} fromY={-28} delay={280} agentIndex={0}>
								<div className="builder-prism-stage" aria-hidden="true">
									<div className="builder-prism">
										<div className="builder-prism-ring" />
										<div className="builder-prism-ring" />
										<div className="builder-prism-ring" />
									</div>
								</div>
							</ConstructPiece>
						</div>
					</BlueprintBlock>

					<div style={{ marginTop: 16 }}>
						<BlueprintBlock
							id="metrics"
							tag="METRICS · 4 COLS"
							buildEpoch={buildEpoch}
							forceBuilt={forceBuilt}
							transparentWhenBuilt
							onConstructStart={handleConstructStart}
							onConstructDone={handleConstructDone}
						>
							<div className="builder-metrics">
								{[
									{ label: isEs ? "Enfoque" : "Focus", val: "Frontend" },
									{ label: isEs ? "Proyectos" : "Projects", val: `0${localizedProjects.length}` },
									{ label: isEs ? "Tecnologías" : "Tech Stack", val: "12+" },
									{ label: isEs ? "Formación" : "Training", val: "Riwi" },
								].map((m, idx) => (
									<ConstructPiece
										key={m.label}
										fromX={idx % 2 === 0 ? -42 : 42}
										fromY={28}
										delay={idx * 130}
										agentIndex={idx + 1}
									>
										<div className="bp-block stage-built builder-metric-card">
											<span className="builder-metric-label">{m.label}</span>
											<span className="builder-metric-val">{m.val}</span>
										</div>
									</ConstructPiece>
								))}
							</div>
						</BlueprintBlock>
					</div>
				</section>

				{/* 2. DIGITAL DNA & ABOUT */}
				<section id="bp-about">
					<BlueprintBlock
						id="dna-head"
						tag="SECTION · DIGITAL DNA"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-section-head">
							<ConstructPiece fromX={-40} fromY={-16} delay={40} agentIndex={3}>
								<span className="builder-eyebrow">{isEs ? "ADN Digital" : "Digital DNA"}</span>
							</ConstructPiece>
							<h2>
								<ConstructWords text={isEs ? "Ingeniería con propósito y detalle." : "Engineering with purpose and craft."} baseDelay={100} />
							</h2>
							<ConstructPiece fromX={-36} fromY={22} delay={320} agentIndex={1}>
								<p>{isEs ? "Principios que guían cómo diseño interfaces, colaboro en equipo y construyo software." : "Principles that guide how I design interfaces, collaborate, and build software."}</p>
							</ConstructPiece>
						</div>
					</BlueprintBlock>

					<BlueprintBlock
						id="dna-grid"
						tag="GRID · 3×2 TRAITS"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-grid-3">
							{localizedDna.map((trait, idx) => (
								<ConstructPiece
									key={trait.name}
									fromX={idx % 2 === 0 ? -52 : 52}
									fromY={idx % 3 === 0 ? -24 : 30}
									delay={idx * 120}
									agentIndex={idx}
								>
									<div className="bp-block stage-built builder-card-pad">
										<span className="builder-eyebrow" style={{ color: trait.color, marginBottom: 4 }}>
											● {trait.name}
										</span>
										<p>{trait.note}</p>
									</div>
								</ConstructPiece>
							))}
						</div>
					</BlueprintBlock>
				</section>

				{/* 3. PROJECTS */}
				<section id="bp-projects">
					<BlueprintBlock
						id="projects-head"
						tag="SECTION · PROOF IN PRODUCTION"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-section-head">
							<ConstructPiece fromX={-40} fromY={-16} delay={40} agentIndex={4}>
								<span className="builder-eyebrow">{isEs ? "Proyectos" : "Projects"}</span>
							</ConstructPiece>
							<h2>
								<ConstructWords text={isEs ? "La prueba vive en lo que construimos." : "Proof lives in what we build."} baseDelay={100} />
							</h2>
							<ConstructPiece fromX={-36} fromY={22} delay={320} agentIndex={1}>
								<p>{isEs ? "Experiencias prácticas con foco en React, TypeScript, trabajo Scrum y arquitectura clara." : "Hands-on builds focused on React, TypeScript, Scrum teamwork, and clean architecture."}</p>
							</ConstructPiece>
						</div>
					</BlueprintBlock>

					<BlueprintBlock
						id="projects-grid"
						tag="CARDS · 3 PROJECTS"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-grid-3">
							{localizedProjects.map((proj, idx) => (
								<ConstructPiece
									key={proj.name}
									fromX={idx === 0 ? -64 : idx === 2 ? 64 : 0}
									fromY={idx === 1 ? 48 : 26}
									delay={idx * 160}
									agentIndex={idx + 2}
								>
									<article className="bp-block stage-built builder-card-pad">
										<span className="builder-eyebrow" style={{ marginBottom: 2 }}>{proj.role}</span>
										<h3>{proj.name}</h3>
										<p>{proj.description}</p>
										<p style={{ fontSize: 12.5, color: "#cbd5e1" }}>
											<strong style={{ color: "#38bdf8" }}>{isEs ? "Aprendizaje: " : "Key takeaway: "}</strong>
											{proj.whatILearned}
										</p>
										<div className="builder-tags">
											{proj.technologies.map((tech) => (
												<span key={tech} className="builder-tag">{tech}</span>
											))}
										</div>
									</article>
								</ConstructPiece>
							))}
						</div>
					</BlueprintBlock>
				</section>

				{/* 4. SKILLS & LEARNING */}
				<section id="bp-skills">
					<BlueprintBlock
						id="skills-grid"
						tag="SECTION · STACK & SKILLS"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-section-head">
							<ConstructPiece fromX={-40} fromY={-16} delay={40} agentIndex={2}>
								<span className="builder-eyebrow">{isEs ? "Habilidades" : "Skills"}</span>
							</ConstructPiece>
							<h2>
								<ConstructWords text={isEs ? "Stack técnico y habilidades humanas." : "Technical stack & human skills."} baseDelay={100} />
							</h2>
						</div>
						<div className="builder-grid-3">
							{skillGroups.map((group, idx) => (
								<ConstructPiece
									key={group.category}
									fromX={idx % 2 === 0 ? -52 : 52}
									fromY={30}
									delay={180 + idx * 140}
									agentIndex={idx + 1}
								>
									<div className="bp-block stage-built builder-card-pad">
										<h3>{group.category}</h3>
										<div className="builder-tags" style={{ marginTop: 4 }}>
											{group.skills.map((skill) => (
												<span key={skill.name} className="builder-tag">
													{skill.name} · {skill.level}
												</span>
											))}
										</div>
									</div>
								</ConstructPiece>
							))}
						</div>
					</BlueprintBlock>

					<div style={{ marginTop: 16 }}>
						<BlueprintBlock
							id="human-learning"
							tag="HUMAN SKILLS & LEARNING"
							buildEpoch={buildEpoch}
							forceBuilt={forceBuilt}
							transparentWhenBuilt
							onConstructStart={handleConstructStart}
							onConstructDone={handleConstructDone}
						>
							<div className="builder-grid-2">
								<ConstructPiece fromX={-56} fromY={24} delay={80} agentIndex={5}>
									<div className="bp-block stage-built builder-card-pad">
										<h3>{isEs ? "Habilidades Humanas" : "Human Skills"}</h3>
										<div className="builder-tags" style={{ marginTop: 4 }}>
											{localizedHuman.map((item) => (
												<span key={item.name} className="builder-tag">{item.name}</span>
											))}
										</div>
									</div>
								</ConstructPiece>
								<ConstructPiece fromX={56} fromY={24} delay={220} agentIndex={0}>
									<div className="bp-block stage-built builder-card-pad">
										<h3>{isEs ? "Aprendiendo Actualmente" : "Currently Learning"}</h3>
										<div className="builder-tags" style={{ marginTop: 4 }}>
											{currentlyLearning.map((item) => (
												<span key={item} className="builder-tag" style={{ borderColor: "rgba(56, 189, 248, 0.45)", color: "#bae6fd" }}>
													{item}
												</span>
											))}
										</div>
									</div>
								</ConstructPiece>
							</div>
						</BlueprintBlock>
					</div>
				</section>

				{/* 5. JOURNEY & RIWI */}
				<section id="bp-journey">
					<BlueprintBlock
						id="journey-riwi"
						tag="SECTION · JOURNEY & RIWI"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						transparentWhenBuilt
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-grid-2">
							<ConstructPiece fromX={-56} fromY={26} delay={80} agentIndex={1}>
								<div className="bp-block stage-built builder-card-pad">
									<span className="builder-eyebrow">{isEs ? "Mi Camino" : "My Journey"}</span>
									<h3>{isEs ? "Evolución continua" : "Continuous growth"}</h3>
									<div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
										{localizedJourney.slice(0, 6).map((step) => (
											<div key={step.title} style={{ borderLeft: "2px solid #2563eb", paddingLeft: 10 }}>
												<div style={{ fontSize: 13.5, fontWeight: 700, color: "#f8fafc" }}>{step.title}</div>
												<div style={{ fontSize: 12.5, color: "#94a3b8" }}>{step.detail}</div>
											</div>
										))}
									</div>
								</div>
							</ConstructPiece>

							<ConstructPiece fromX={56} fromY={26} delay={240} agentIndex={4}>
								<div className="bp-block stage-built builder-card-pad">
									<span className="builder-eyebrow" style={{ color: "#a78bfa" }}>Riwi · Scrum & Code</span>
									<h3>{isEs ? "Colaboración en equipo" : "Team collaboration"}</h3>
									<div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
										{localizedRiwi.map((highlight) => (
											<div key={highlight} style={{ fontSize: 13.5, color: "#cbd5e1", display: "flex", gap: 8 }}>
												<span style={{ color: "#38bdf8" }}>→</span>
												<span>{highlight}</span>
											</div>
										))}
									</div>

									<div style={{ marginTop: 14 }}>
										<span className="builder-eyebrow">{isEs ? "Más allá del código" : "Beyond the code"}</span>
										<div className="builder-tags">
											{localizedInterests.map((interest) => (
												<span key={interest.name} className="builder-tag">{interest.name}</span>
											))}
										</div>
									</div>
								</div>
							</ConstructPiece>
						</div>
					</BlueprintBlock>
				</section>

				{/* 6. CONTACT & FOOTER */}
				<section id="bp-contact">
					<BlueprintBlock
						id="contact"
						tag="FOOTER · CONTACT"
						buildEpoch={buildEpoch}
						forceBuilt={forceBuilt}
						onConstructStart={handleConstructStart}
						onConstructDone={handleConstructDone}
					>
						<div className="builder-card-pad" style={{ padding: 30 }}>
							<ConstructPiece fromX={-40} fromY={-14} delay={60} agentIndex={3}>
								<span className="builder-eyebrow">{isEs ? "Contacto" : "Contact"}</span>
							</ConstructPiece>
							<h2 style={{ margin: "0 0 8px", fontSize: "clamp(24px, 3.5vw, 34px)" }}>
								<ConstructWords text={isEs ? "¿Construimos algo juntos?" : "Have something great to build together?"} baseDelay={120} />
							</h2>
							<ConstructPiece fromX={-44} fromY={22} delay={340} agentIndex={1}>
								<p style={{ maxWidth: "56ch", marginBottom: 16 }}>
									{isEs
										? "Estoy abierto a oportunidades Frontend, proyectos colaborativos y nuevos retos."
										: "Open to Frontend roles, collaborative builds, and new engineering challenges."}
								</p>
							</ConstructPiece>
							<ConstructPiece fromX={0} fromY={34} delay={480} agentIndex={2}>
								<div className="builder-cta-row">
									<a href={`mailto:${profile.email}`} className="builder-btn-primary">
										<Mail size={15} />
										<span>{profile.email}</span>
									</a>
									<a href={profile.github} target="_blank" rel="noreferrer" className="builder-btn-secondary">
										<span>GitHub</span>
										<ArrowUpRight size={14} />
									</a>
									<a href={profile.linkedin} target="_blank" rel="noreferrer" className="builder-btn-secondary">
										<span>LinkedIn</span>
										<ArrowUpRight size={14} />
									</a>
								</div>
							</ConstructPiece>
							<div style={{ marginTop: 22, paddingTop: 14, borderTop: "1px solid rgba(148,163,184,0.14)", fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
								<span>© {new Date().getFullYear()} {profile.fullName} ({profile.displayName})</span>
								<span>Discord: {profile.discord}</span>
							</div>
						</div>
					</BlueprintBlock>
				</section>
			</main>

			{/* Floating Multi-Agent Build HUD */}
			<div className="builder-hud" role="status" aria-live="polite">
				<div className="builder-hud-dots" aria-hidden="true">
					{AGENT_CURSORS.map((a) => (
						<span key={a.id} className="builder-hud-dot" style={{ background: a.color }} />
					))}
				</div>
				<span className="builder-hud-text">
					{AGENT_CURSORS.length} agents · {builtCount} / {TOTAL_BLOCKS} blocks
				</span>
				<div className="builder-hud-bar" aria-hidden="true">
					<div className="builder-hud-bar-fill" style={{ width: `${progressPct}%` }} />
				</div>
				{builtCount < TOTAL_BLOCKS ? (
					<button type="button" className="builder-hud-btn" onClick={handleSkip}>
						<SkipForward size={11} />
						<span>{isEs ? "Completar" : "Skip"}</span>
					</button>
				) : (
					<button type="button" className="builder-hud-btn" onClick={handleRerun}>
						<RotateCcw size={11} />
						<span>{isEs ? "Re-construir" : "Re-run"}</span>
					</button>
				)}
			</div>
		</div>
	);
}
