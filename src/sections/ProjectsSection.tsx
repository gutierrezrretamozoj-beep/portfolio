import { ArrowUpRight, CircleDashed, Layers3 } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { projects } from "@/data/projects";

const artStyles = ["project-art-rose", "project-art-blue", "project-art-green"];

export function ProjectsSection() {
	return (
		<section className="section projects-section" id="projects">
			<div className="page-wrap">
				<Reveal className="section-heading-row">
					<div><span className="eyebrow">Things taking shape</span><h2 className="section-title">A few seeds I&apos;ve planted.</h2></div>
					<p className="section-lede">A workbench, not a trophy shelf. These projects are provisional snapshots of what I am learning.</p>
				</Reveal>
				<div className="project-grid">
					{projects.map((project, index) => (
						<Reveal className="project-card" key={project.name} delay={index * 0.08}>
							<div className={`project-art ${artStyles[index % artStyles.length]}`} aria-hidden="true">
								<span className="project-art-index">PROJECT · {String(index + 1).padStart(2, "0")}</span>
								<div className="project-art-shape"><Layers3 size={40} strokeWidth={1.1} /></div>
								<span className="project-art-orbit" />
								<span className="project-status"><CircleDashed size={12} />{project.status}</span>
							</div>
							<div className="project-card-body">
								<div className="project-title-row"><div><span className="project-role">{project.role}</span><h3>{project.name}</h3></div><span className="project-arrow" aria-hidden="true"><ArrowUpRight size={17} /></span></div>
								<p>{project.description}</p>
								<div className="project-tags">{project.technologies.slice(0, 5).map((tech) => <span key={tech}>{tech}</span>)}</div>
								<div className="project-learning"><strong>What I&apos;m learning</strong><span>{project.whatILearned}</span></div>
								<div className="project-links">
									{project.github === "#" ? <span>Repository coming soon</span> : <a href={project.github} target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a>}
									{project.demo !== "#" && <a href={project.demo} target="_blank" rel="noreferrer">Live demo <ArrowUpRight size={13} /></a>}
								</div>
							</div>
						</Reveal>
					))}
				</div>
				<p className="provisional-note">Project descriptions are working notes and will be refined as each project is ready to share.</p>
			</div>
		</section>
	);
}
