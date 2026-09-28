import { Cat, Code2, CookingPot, Cpu, Gamepad2, Leaf, Music2, Palette, Plane } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { interests } from "@/data/interests";

const icons = [Gamepad2, Music2, Cpu, Cat, Code2, Palette, Leaf, Plane, CookingPot];

export function InterestsSection() {
	return (
		<section className="section interests-section" id="interests">
			<div className="page-wrap interests-layout">
				<Reveal className="interests-copy"><span className="eyebrow">A life with more than one tab open</span><h2 className="section-title">BEYOND<br /><em>THE CODE.</em></h2><p className="section-lede">A few of the things that keep my curiosity well watered.</p></Reveal>
				<div className="interest-orbit">
					<span className="interest-ring ring-a" aria-hidden="true" /><span className="interest-ring ring-b" aria-hidden="true" />
					{interests.map((interest, index) => {
						const Icon = icons[index];
						return <Reveal className={`interest-item interest-item-${index + 1}`} key={interest.name} delay={index * 0.04}><span><Icon size={20} strokeWidth={1.6} /></span><strong>{interest.name}</strong></Reveal>;
					})}
				</div>
			</div>
		</section>
	);
}
