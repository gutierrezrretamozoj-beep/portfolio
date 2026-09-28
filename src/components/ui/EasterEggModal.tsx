"use client";

import { useState } from "react";
import { Sprout } from "lucide-react";

export function EasterEggModal() {
	const [found, setFound] = useState(false);

	return (
		<div className="curiosity-seed">
			<button type="button" onClick={() => setFound(!found)} aria-label="Garden mark" title="">
				<Sprout size={17} aria-hidden="true" />
			</button>
			{found && <span role="status">Curiosity detected.</span>}
		</div>
	);
}
