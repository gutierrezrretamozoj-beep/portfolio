import { ArrowUpRight, Code2, Mail, MessageCircle, UsersRound } from "lucide-react";
import { EasterEggModal } from "@/components/ui/EasterEggModal";
import { Reveal } from "@/components/animations/Reveal";
import { profile } from "@/data/profile";

export function ContactSection() {
	return (
		<section className="section contact-section" id="contact">
			<div className="page-wrap contact-wrap">
				<Reveal className="contact-copy"><span className="eyebrow">Good things start with a hello</span><h2 className="section-title">LET&apos;S BUILD<br /><em>SOMETHING.</em></h2><p className="section-lede">Have an idea, a project or just want to connect?</p><a className="contact-email" href={`mailto:${profile.email}`}>{profile.email}<ArrowUpRight size={17} /></a></Reveal>
				<Reveal className="contact-links" delay={0.12}>
					  <a href={profile.github} target="_blank" rel="noreferrer"><Code2 size={18} /><span>GitHub</span><ArrowUpRight size={15} /></a>
					  <a href={profile.linkedin} target="_blank" rel="noreferrer"><UsersRound size={18} /><span>LinkedIn</span><ArrowUpRight size={15} /></a>
					<a href={`mailto:${profile.email}`}><Mail size={18} /><span>Email</span><ArrowUpRight size={15} /></a>
					<div className="discord-contact"><MessageCircle size={18} /><span>Discord</span><strong>{profile.discord}</strong></div>
					<EasterEggModal />
				</Reveal>
			</div>
		</section>
	);
}
