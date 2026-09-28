import { Reveal } from "@/components/animations/Reveal";
import { digitalDna } from "@/data/dna";

export function DigitalDnaSection() {
	return (
		<section className="section dna-section" id="dna">
			<div className="page-wrap dna-layout">
				<Reveal className="dna-intro">
					<span className="eyebrow">MY DIGITAL DNA</span>
					<h2 className="section-title">Different roots.<br /><em>One way of building.</em></h2>
					<p className="section-lede">The best work happens when technical curiosity grows alongside care for the people making it.</p>
					<span className="dna-footnote">Six things I bring to the work <span aria-hidden="true">↘</span></span>
				</Reveal>
				<div className="dna-orbit" aria-label="Technology, creativity, leadership, communication, design, and curiosity">
					<div className="dna-core"><span>DAVID&apos;S</span><strong>way<br />of thinking</strong></div>
					{digitalDna.map((item, index) => (
						<Reveal className={`dna-node dna-node-${index + 1}`} key={item.name} delay={index * 0.04}>
							<div className="dna-node-dot" style={{ background: item.color }}><span>{String(index + 1).padStart(2, "0")}</span></div>
							<strong>{item.name}</strong><small>{item.note}</small>
						</Reveal>
					))}
				</div>
			</div>
		</section>
	);
}
