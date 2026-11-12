import { ArrowUpRight, Sprout } from "lucide-react";
import { profile } from "@/data/profile";

export function Footer() {
	return (
		<footer className="site-footer">
			<div className="page-wrap footer-inner">
				<a className="footer-brand" href="#top"><Sprout size={18} aria-hidden="true" /><span>{profile.fullName}</span></a>
				<p lang="es">{profile.headline}</p>
				<div className="footer-links" aria-label="Social links">
					  <a href={profile.github} target="_blank" rel="noreferrer" aria-label="GitHub"><span>GitHub</span><ArrowUpRight size={14} /></a>
					  <a href={profile.linkedin} target="_blank" rel="noreferrer" aria-label="LinkedIn"><span>LinkedIn</span><ArrowUpRight size={14} /></a>
					<a href={`mailto:${profile.email}`} aria-label="Email"><ArrowUpRight size={17} /></a>
				</div>
				<small>© 2026 José Gutiérrez <span>·</span> Still growing, always.</small>
			</div>
		</footer>
	);
}
