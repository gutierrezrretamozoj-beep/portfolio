import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/animations/Reveal";
import { journey } from "@/data/journey";

export function JourneySection() {
	return (
		<section className="section journey-section" id="journey">
			<div className="page-wrap">
				<Reveal className="journey-heading"><span className="eyebrow">A path, not a finish line</span><h2 className="section-title">Every next thing<br /><em>starts with a question.</em></h2></Reveal>
				<div className="journey-list">
					{journey.map((step, index) => (
						<Reveal className="journey-step" key={step.title} delay={index * 0.025}>
							<span className="journey-number">{String(index + 1).padStart(2, "0")}</span>
							<span className="journey-dot" aria-hidden="true" />
							<h3>{step.title}</h3>
							<p>{step.detail}</p>
							{index < journey.length - 1 && <ArrowRight className="journey-arrow" size={16} aria-hidden="true" />}
						</Reveal>
					))}
				</div>
				<p className="journey-ending">THE STORY IS STILL BEING WRITTEN<span>✳</span></p>
			</div>
		</section>
	);
}
