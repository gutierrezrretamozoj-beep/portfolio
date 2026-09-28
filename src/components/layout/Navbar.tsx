"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
	["About", "about"], ["Skills", "skills"], ["Journey", "journey"],
	["Projects", "projects"], ["Contact", "contact"],
] as const;

export function Navbar() {
	const [open, setOpen] = useState(false);

	return (
		<header className="site-header">
			<nav className="nav-wrap" aria-label="Main navigation">
				<a className="brand-mark" href="#top" onClick={() => setOpen(false)} aria-label="David, back to top">
					<span className="brand-seed" aria-hidden="true" />David
				</a>
				<div className={`nav-links${open ? " is-open" : ""}`} id="primary-navigation">
					{links.map(([label, id]) => (
						<a key={id} href={`#${id}`} onClick={() => setOpen(false)}>{label}</a>
					))}
					<a className="nav-contact" href="#contact" onClick={() => setOpen(false)}>Let&apos;s talk <span aria-hidden="true">↗</span></a>
				</div>
				<button
					className="menu-toggle"
					type="button"
					aria-label={open ? "Close navigation" : "Open navigation"}
					aria-controls="primary-navigation"
					aria-expanded={open}
					onClick={() => setOpen(!open)}
				>
					{open ? <X size={20} /> : <Menu size={20} />}
				</button>
			</nav>
		</header>
	);
}
