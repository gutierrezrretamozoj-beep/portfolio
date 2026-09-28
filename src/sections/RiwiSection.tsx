import { Check } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { riwiHighlights } from "@/data/riwi";

export function RiwiSection() {
	return (
		<section className="section riwi-section" id="riwi">
			<div className="page-wrap riwi-grid">
				<Reveal className="riwi-heading"><span className="eyebrow">WHERE I GROW</span><h2 className="section-title">Riwi is where I grow professionally.</h2><p className="riwi-caption">Learning through projects, teamwork, and practice.</p></Reveal>
				<Reveal className="riwi-content" delay={0.1}>
					<p>Learning becomes real when it is shared. At Riwi, I have been growing through hands-on projects, teamwork, and the practice of explaining ideas clearly.</p>
					<ul>{riwiHighlights.map((item) => <li key={item}><Check size={15} /><span>{item}</span></li>)}</ul>
					<div className="riwi-stamp"><span>LEARN</span><span>BUILD</span><span>SHARE</span></div>
				</Reveal>
			</div>
		</section>
	);
}
