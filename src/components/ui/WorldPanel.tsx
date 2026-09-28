"use client";

import { ArrowUpRight, Code2, Mail, MessageCircle, UsersRound, X } from "lucide-react";
import { currentlyLearning } from "@/data/learning";
import { journey } from "@/data/journey";
import { profile } from "@/data/profile";
import { projects } from "@/data/projects";
import { riwiHighlights } from "@/data/riwi";
import { skillGroups } from "@/data/skills";
import { digitalDna } from "@/data/dna";
import type { WorldPoint } from "@/types/world";

type WorldPanelProps = {
	point: WorldPoint;
	onClose: () => void;
};

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
	return <a className="world-external-link" href={href} target="_blank" rel="noreferrer">{children}<ArrowUpRight size={14} /></a>;
}

function PanelContent({ point }: { point: WorldPoint }) {
	if (point.kind === "easter-egg") {
		return <><p className="world-panel-lede">Curiosity detected.</p><p>That quiet urge to look a little closer is where this whole world began.</p></>;
	}

	if (point.kind === "about") {
		return <>
			<p className="world-panel-lede">Technology was always close. I just needed time to discover where I wanted to begin.</p>
			<p>As I grew, curiosity led me toward programming and software development. Once I started building with code, exploration became a direction. I am learning through practice, thoughtful questions, and the people I work alongside.</p>
			<div className="world-traits">{["Curious", "Creative", "Calm", "Empathetic", "Collaborative", "Organized"].map((trait) => <span key={trait}>{trait}</span>)}</div>
		</>;
	}

	if (point.kind === "dna") {
		return <>
			<p className="world-panel-lede">A useful product grows from more than technical tools.</p>
			<div className="world-dna-grid">{digitalDna.map((item) => <div key={item.name}><span style={{ background: item.color }} /><strong>{item.name}</strong><small>{item.note}</small></div>)}</div>
		</>;
	}

	if (point.kind === "skills") {
		return <>
			<p className="world-panel-lede">My current toolkit, with clear room left to grow.</p>
			{skillGroups.map((group) => <div className="world-skill-group" key={group.category}><h3>{group.category}</h3><ul>{group.skills.map((skill) => <li key={skill.name}><span>{skill.name}</span><small>{skill.level}</small></li>)}</ul></div>)}
			<div className="world-learning"><strong>Currently learning</strong>{currentlyLearning.map((item) => <span key={item}>{item}</span>)}</div>
		</>;
	}

	if (point.kind === "project") {
		const project = projects.find((item) => item.name === point.dataKey);
		if (!project) return <p>Project details are being prepared.</p>;
		return <>
			<p className="world-panel-lede">{project.description}</p>
			<dl className="world-project-details"><div><dt>Role</dt><dd>{project.role}</dd></div><div><dt>Status</dt><dd>{project.status}</dd></div><div><dt>What I learned</dt><dd>{project.whatILearned}</dd></div></dl>
			<div className="world-project-tags">{project.technologies.map((technology) => <span key={technology}>{technology}</span>)}</div>
			<div className="world-project-links">
				{project.github === "#" ? <span>GitHub · Coming soon</span> : <ExternalLink href={project.github}>GitHub</ExternalLink>}
				{project.demo === "#" ? <span>Live demo · Coming soon</span> : <ExternalLink href={project.demo}>Live demo</ExternalLink>}
			</div>
		</>;
	}

	if (point.kind === "journey") {
		return <>
			<p className="world-panel-lede">From childhood curiosity to a professional path still being written.</p>
			<ol className="world-journey">{journey.map((step) => <li key={step.title}><strong>{step.title}</strong><span>{step.detail}</span></li>)}</ol>
		</>;
	}

	if (point.kind === "riwi") {
		return <>
			<p className="world-panel-lede">Riwi is where I grow professionally.</p>
			<p>Practical projects let me learn with a team, connect frontend and backend work, and practice sharing ideas.</p>
			<ul className="world-check-list">{riwiHighlights.map((item) => <li key={item}>{item}</li>)}</ul>
		</>;
	}

	if (point.kind === "human-skill") {
		return <>
			<p className="world-panel-lede">{point.name}</p>
			<p>{point.description}</p>
			<p>People skills shape how I communicate, collaborate, and help a group do its best work.</p>
		</>;
	}

	if (point.kind === "interest") {
		return <>
			<p className="world-panel-lede">{point.name}</p>
			<p>{point.description}</p>
			<p>Outside the code, these interests keep my curiosity open and my perspective varied.</p>
		</>;
	}

	if (point.kind === "contact") {
		return <>
			<p className="world-panel-lede">Have an idea, a project or just want to connect?</p>
			<div className="world-contact-links">
				<ExternalLink href={profile.github}><Code2 size={16} />GitHub</ExternalLink>
				<ExternalLink href={profile.linkedin}><UsersRound size={16} />LinkedIn</ExternalLink>
				<a className="world-external-link" href={`mailto:${profile.email}`}><Mail size={16} />Email<ArrowUpRight size={14} /></a>
				<div className="world-discord"><MessageCircle size={16} />Discord <span>{profile.discord}</span></div>
			</div>
		</>;
	}

	return <>
		<p className="world-panel-lede">Every path starts with a question.</p>
		<p>Walk the trails, follow the water, and discover the work and ideas growing across this little world.</p>
		<p className="world-panel-aside">Curiosity detected. You found the beginning.</p>
	</>;
}

export function WorldPanel({ point, onClose }: WorldPanelProps) {
	return (
		<div className="world-panel-backdrop" data-world-ui onPointerDown={(event) => event.stopPropagation()}>
			<section className="world-panel" role="dialog" aria-modal="true" aria-labelledby="world-panel-title">
				<header className="world-panel-header">
					<div><span className="world-panel-kicker">{point.label}</span><h2 id="world-panel-title">{point.name}</h2></div>
					<button className="world-icon-button" type="button" onClick={onClose} aria-label="Close information panel"><X size={19} /></button>
				</header>
				<div className="world-panel-content"><PanelContent point={point} /></div>
				<footer className="world-panel-footer"><span>DAVID&apos;S WORLD</span><span>✳</span></footer>
			</section>
		</div>
	);
}