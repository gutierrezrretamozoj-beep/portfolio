export function WorldLoadingScreen({ hidden }: { hidden: boolean }) {
	return (
		<div className={`world-loader${hidden ? " is-hidden" : ""}`} aria-live="polite" aria-hidden={hidden}>
			<div className="loader-orbit" aria-hidden="true"><span /><span /><span /></div>
			<p className="loader-title">DAVID&apos;S WORLD</p>
			<p className="loader-subtitle">Curious by nature, developer by passion.</p>
			<div className="loader-progress" role="progressbar" aria-label="Loading world"><span /></div>
			<p className="loader-status">Loading world...</p>
		</div>
	);
}