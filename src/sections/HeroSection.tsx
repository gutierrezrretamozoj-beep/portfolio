import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react";
import { HeroScene } from "@/components/3d/HeroScene";
import { Reveal } from "@/components/animations/Reveal";
import { profile } from "@/data/profile";

export function HeroSection() {
	return (
		<section className="hero-section" id="top">
			<div className="hero-wash" aria-hidden="true" />
			<div className="page-wrap hero-grid">
				<div className="hero-copy">
					<Reveal>
						<p className="hero-kicker"><span className="live-dot" /> A digital garden by {profile.fullName}</p>
						<h1><span className="hero-name">DAVID</span><span className="hero-title">Curioso por naturaleza,<br />desarrollador por pasión.</span></h1>
						<p className="hero-subtitle">{profile.descriptor}</p>
						<div className="hero-actions">
							<a className="button-primary" href="#about">Explore my world <ArrowDownRight size={16} /></a>
							<a className="button-quiet" href="#projects">View projects <ArrowUpRight size={15} /></a>
						</div>
						<p className="hero-note"><Sparkles size={14} /> Growing through curiosity, craft, and collaboration.</p>
					</Reveal>
				</div>
				<div className="hero-art">
					<HeroScene />
					<div className="hero-stamp"><span>01</span><span>Curiosity<br />in bloom</span></div>
					<div className="hero-side-note">FRONTEND · HUMAN FIRST</div>
				</div>
			</div>
			<a href="#about" className="scroll-cue" aria-label="Scroll to story"><span /> Scroll to explore</a>
		</section>
	);
}
