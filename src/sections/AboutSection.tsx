import { ArrowUpRight, UserRound } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { profile } from "@/data/profile";

const traits = [
	["CURIOUS", "I like following questions until they become something useful."],
	["CREATIVE", "I enjoy finding a thoughtful angle, not just the obvious one."],
	["CALM", "Patience helps me make room for better decisions."],
	["EMPATHETIC", "Good work starts with understanding the people around it."],
	["COLLABORATIVE", "I value clear communication and shared progress."],
	["INNOVATIVE", "I stay open to new tools, perspectives, and possibilities."],
];

export function AboutSection() {
	return (
		<section className="section about-section" id="about">
			<div className="page-wrap about-grid">
				<Reveal className="about-photo-wrap">
					<div className="about-photo-frame">
						<div className="portrait-placeholder" role="img" aria-label="Portrait placeholder for José Gutiérrez">
							<UserRound className="portrait-icon" size={64} strokeWidth={1.1} aria-hidden="true" />
							<span className="portrait-label">Portrait pending</span>
							<code>/public/images/david-profile.jpg</code>
						</div>
					</div>
					<div className="photo-note"><span className="note-star">✳</span><span>Learning looks good<br />on everyone.</span></div>
					  <div className="about-caption"><span>{profile.fullName}</span><span>Frontend developer in progress</span></div>
				</Reveal>
				<Reveal className="about-copy" delay={0.1}>
					<span className="eyebrow">A little context</span>
					<h2 className="section-title">Before I became a developer,<br /><em>I was curious.</em></h2>
					<p className="section-lede">Technology had always been close. I did not know which path inside it would become mine, but I knew I wanted to explore.</p>
					<p className="about-body">As I grew, that curiosity led me to programming and software development. The first time I started building with code, exploration began to feel like a direction. Now I am learning by making, asking questions, and working alongside others.</p>
					<div className="trait-cloud" aria-label="Personal qualities">
						{traits.map(([trait, description]) => <span key={trait} title={description}>{trait}</span>)}
					</div>
					<a className="text-link" href="#journey">Follow the story <ArrowUpRight size={15} /></a>
				</Reveal>
			</div>
		</section>
	);
}
