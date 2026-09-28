import { ArrowUpRight, Sprout } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { currentlyLearning } from "@/data/learning";

export function CurrentlyLearningSection() {
	return (
		<section className="learning-section" id="learning">
			<div className="page-wrap learning-inner">
				<Reveal className="learning-mark"><Sprout size={25} strokeWidth={1.5} /><span>IN SEASON · 2026</span></Reveal>
				<Reveal className="learning-copy" delay={0.06}><span className="eyebrow">CURRENTLY BUILDING</span><h2 className="section-title">Still learning.<br /><em>That&apos;s the point.</em></h2></Reveal>
				<Reveal className="learning-topics" delay={0.12}><p>The next layer I&apos;m growing:</p><div>{currentlyLearning.map((item) => <span key={item}>{item}<ArrowUpRight size={12} /></span>)}</div></Reveal>
			</div>
		</section>
	);
}
