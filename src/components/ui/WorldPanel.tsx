"use client";

import { ArrowUpRight, Code2, Mail, MessageCircle, UsersRound, X } from "lucide-react";
import { currentlyLearning } from "@/data/learning";
import { profile } from "@/data/profile";
import { skillGroups } from "@/data/skills";
import {
	type Language,
	i18nDigitalDna,
	i18nJourney,
	i18nProjects,
	i18nRiwiHighlights,
	i18nUI,
} from "@/data/i18n";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import type { WorldPoint } from "@/types/world";

type WorldPanelProps = {
	point: WorldPoint;
	language?: Language;
	onClose: () => void;
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
	return (
		<a className="world-external-link" href={href} target="_blank" rel="noreferrer">
			{children}
			<ArrowUpRight size={14} />
		</a>
	);
}

function PanelContent({ point, language = "es" }: { point: WorldPoint; language?: Language }) {
	const ui = i18nUI[language];

	if (point.kind === "easter-egg") {
		return (
			<>
				<p className="world-panel-lede">{ui.easterEggLede}</p>
				<p>{ui.easterEggP2}</p>
			</>
		);
	}

	if (point.kind === "about") {
		return (
			<>
				<p className="world-panel-lede">{ui.aboutP1}</p>
				<p>{ui.aboutP2}</p>
				<div className="world-traits">
					{ui.aboutTraits.map((trait) => (
						<span key={trait}>{trait}</span>
					))}
				</div>
			</>
		);
	}

	if (point.kind === "dna") {
		const dnaList = i18nDigitalDna[language];
		return (
			<>
				<p className="world-panel-lede">{ui.dnaLede}</p>
				<div className="world-dna-grid">
					{dnaList.map((item) => (
						<div key={item.name}>
							<span style={{ background: item.color }} />
							<strong>{item.name}</strong>
							<small>{item.note}</small>
						</div>
					))}
				</div>
			</>
		);
	}

	if (point.kind === "skills") {
		return (
			<>
				<p className="world-panel-lede">{ui.skillsLede}</p>
				{skillGroups.map((group) => (
					<div className="world-skill-group" key={group.category}>
						<h3>{group.category}</h3>
						<ul>
							{group.skills.map((skill) => (
								<li key={skill.name}>
									<span>{skill.name}</span>
									<small>{skill.level}</small>
								</li>
							))}
						</ul>
					</div>
				))}
				<div className="world-learning">
					<strong>{ui.currentlyLearning}</strong>
					{currentlyLearning.map((item) => (
						<span key={item}>{item}</span>
					))}
				</div>
			</>
		);
	}

	if (point.kind === "project") {
		const projectList = i18nProjects[language];
		const project =
			projectList.find((item) => item.name === point.dataKey) ??
			projectList.find((item) => item.name === point.name) ??
			projectList[0];

		if (!project) return <p>{ui.comingSoon}</p>;

		return (
			<>
				<p className="world-panel-lede">{project.description}</p>
				<dl className="world-project-details">
					<div>
						<dt>{ui.role}</dt>
						<dd>{project.role}</dd>
					</div>
					<div>
						<dt>{ui.status}</dt>
						<dd>{project.status}</dd>
					</div>
					<div>
						<dt>{ui.whatILearned}</dt>
						<dd>{project.whatILearned}</dd>
					</div>
				</dl>
				<div className="world-project-tags">
					{project.technologies.map((technology) => (
						<span key={technology}>{technology}</span>
					))}
				</div>
				<div className="world-project-links">
					<ExternalLink href={profile.github}>{ui.github}</ExternalLink>
					<ExternalLink href={profile.linkedin}>LinkedIn</ExternalLink>
				</div>
			</>
		);
	}

	if (point.kind === "journey") {
		const journeyList = i18nJourney[language];
		return (
			<>
				<p className="world-panel-lede">{ui.journeyLede}</p>
				<ol className="world-journey">
					{journeyList.map((step) => (
						<li key={step.title}>
							<strong>{step.title}</strong>
							<span>{step.detail}</span>
						</li>
					))}
				</ol>
			</>
		);
	}

	if (point.kind === "riwi") {
		const highlights = i18nRiwiHighlights[language];
		return (
			<>
				<p className="world-panel-lede">{ui.riwiLede}</p>
				<p>{ui.riwiP2}</p>
				<ul className="world-check-list">
					{highlights.map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			</>
		);
	}

	if (point.kind === "human-skill") {
		return (
			<>
				<p className="world-panel-lede">{point.name}</p>
				<p>{point.description}</p>
				<p>{ui.peopleLede}</p>
			</>
		);
	}

	if (point.kind === "interest") {
		return (
			<>
				<p className="world-panel-lede">{point.name}</p>
				<p>{point.description}</p>
				<p>{ui.interestsLede}</p>
			</>
		);
	}

	if (point.kind === "contact") {
		return (
			<>
				<p className="world-panel-lede">{ui.contactLede}</p>
				<div className="world-contact-links">
					<ExternalLink href={profile.github}>
						<Code2 size={16} />
						{ui.github}
					</ExternalLink>
					<ExternalLink href={profile.linkedin}>
						<UsersRound size={16} />
						LinkedIn
					</ExternalLink>
					<a className="world-external-link" href={`mailto:${profile.email}`}>
						<Mail size={16} />
						Email
						<ArrowUpRight size={14} />
					</a>
					<div className="world-discord">
						<MessageCircle size={16} />
						Discord <span>{profile.discord}</span>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<p className="world-panel-lede">{ui.startLede}</p>
			<p>{ui.startP2}</p>
		</>
	);
}

export function WorldPanel({ point, language = "es", onClose }: WorldPanelProps) {
	const dialogRef = useDialogFocus<HTMLElement>();
	const ui = i18nUI[language];

	return (
		<div className="world-panel-backdrop" data-world-ui onPointerDown={(event) => event.stopPropagation()}>
			<section
				ref={dialogRef}
				tabIndex={-1}
				className="world-panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="world-panel-title"
			>
				<header className="world-panel-header">
					<div>
						<span className="world-panel-kicker">{point.label}</span>
						<h2 id="world-panel-title">{point.name}</h2>
					</div>
					<button
						className="world-icon-button"
						type="button"
						onClick={onClose}
						aria-label={language === "es" ? "Cerrar panel de información" : "Close information panel"}
					>
						<X size={19} />
					</button>
				</header>
				<div className="world-panel-content">
					<PanelContent point={point} language={language} />
				</div>
				<footer className="world-panel-footer">
					<span>{ui.footerBrand}</span>
					<span>✳</span>
				</footer>
			</section>
		</div>
	);
}