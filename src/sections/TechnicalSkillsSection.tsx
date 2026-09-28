import { Code2, GitBranch, Layers3 } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { skillGroups } from "@/data/skills";

const icons = [Code2, GitBranch, Layers3];

export function TechnicalSkillsSection() {
	return (
		<section className="section skills-section" id="skills">
			<div className="page-wrap">
				<Reveal className="section-heading-row">
					<div><span className="eyebrow">Tools in the greenhouse</span><h2 className="section-title">Learning by building.</h2></div>
					<p className="section-lede">A growing toolkit, grounded in the fundamentals and open to what comes next.</p>
				</Reveal>
				<div className="skill-groups">
					{skillGroups.map((group, groupIndex) => {
						const Icon = icons[groupIndex];
						return (
							<Reveal className="skill-group" key={group.category} delay={groupIndex * 0.08}>
								<div className="skill-group-head"><Icon size={19} /><h3>{group.category}</h3><span>{String(group.skills.length).padStart(2, "0")}</span></div>
								<ul>{group.skills.map((skill) => <li key={skill.name}><span>{skill.name}</span><span className={`skill-level ${skill.level.toLowerCase()}`}>{skill.level}</span></li>)}</ul>
							</Reveal>
						);
					})}
				</div>
				<p className="skills-footnote"><span /> Strength is practiced, not measured in percentages.</p>
			</div>
		</section>
	);
}
