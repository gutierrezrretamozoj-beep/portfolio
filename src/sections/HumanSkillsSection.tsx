import { HeartHandshake, MessageCircleMore, Sparkles, UsersRound } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { humanSkills } from "@/data/dna";

const icons = [HeartHandshake, UsersRound, MessageCircleMore, Sparkles];

export function HumanSkillsSection() {
	return (
		<section className="section human-section">
			<div className="page-wrap human-layout">
				<Reveal className="human-copy">
					<span className="eyebrow">The part between the lines</span>
					<h2 className="section-title">CODE IS ONLY<br /><em>PART OF THE STORY.</em></h2>
					<p className="section-lede">I believe good products grow from good collaboration. I bring calm focus, empathy, and a natural instinct to help a group find its rhythm.</p>
					<div className="human-icons" aria-hidden="true">{icons.map((Icon, index) => <span key={index}><Icon size={19} /></span>)}</div>
				</Reveal>
				<Reveal className="human-tree" delay={0.12}>
					<div className="tree-trunk" aria-hidden="true" />
					<div className="human-leaves">
						{humanSkills.map((skill, index) => <span className={`human-leaf leaf-${index + 1}`} key={skill}>{skill}</span>)}
					</div>
					<p className="tree-caption">People skills make the work grow.</p>
				</Reveal>
			</div>
		</section>
	);
}
