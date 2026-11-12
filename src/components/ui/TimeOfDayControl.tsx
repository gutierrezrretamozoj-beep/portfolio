"use client";

import { Moon, MoonStar, Sun, Sunrise, Sunset } from "lucide-react";
import {
	AUTO_CYCLE_DURATION_SECONDS,
	formatHourToClock,
	getContinuousHour,
	getNextTimePhase,
	TIME_PHASES,
	type TimePhase,
} from "@/components/world/time-system";
import { type Language, i18nTimeNames } from "@/data/i18n";

type TimeOfDayControlProps = {
	currentPhase: TimePhase;
	cycleSeconds: number;
	duration?: number;
	language?: Language;
	onCyclePhase?: () => void;
};

export function TimeOfDayControl({
	currentPhase,
	cycleSeconds,
	duration = AUTO_CYCLE_DURATION_SECONDS,
	language = "es",
}: TimeOfDayControlProps) {
	const info = TIME_PHASES[currentPhase];
	const nextPhase = getNextTimePhase(currentPhase);
	const nextInfo = TIME_PHASES[nextPhase];
	const currentName = i18nTimeNames[language][currentPhase];
	const nextName = i18nTimeNames[language][nextPhase];

	const progress = Math.min(1, Math.max(0, cycleSeconds / duration));
	const secondsLeft = Math.max(0, duration - cycleSeconds);
	const liveClock = formatHourToClock(getContinuousHour(currentPhase, cycleSeconds, duration));

	function renderIcon(phase: TimePhase) {
		switch (phase) {
			case "dawn":
				return <Sunrise size={15} className="text-amber-400" />;
			case "day":
				return <Sun size={15} className="text-amber-500" />;
			case "sunset":
				return <Sunset size={15} className="text-orange-400" />;
			case "night":
				return <Moon size={15} className="text-sky-300" />;
			case "midnight":
				return <MoonStar size={15} className="text-indigo-300" />;
		}
	}

	// Circular progress parameters
	const radius = 6.5;
	const circumference = 2 * Math.PI * radius;
	const strokeDashoffset = circumference * (1 - progress);

	return (
		<div className="time-control-wrapper" data-world-ui>
			<div
				role="status"
				aria-live="polite"
				className={`world-hud-button world-time-button is-autonomous-clock ${currentPhase === "midnight" ? "is-midnight" : currentPhase === "night" ? "is-night" : currentPhase === "sunset" ? "is-sunset" : currentPhase === "dawn" ? "is-dawn" : "is-day"}`}
				aria-label={`Ciclo horario automático: ${info.name} (${info.timeDisplay}). Próxima fase en ${secondsLeft}s: ${nextInfo.name}.`}
				title={`Ciclo automático continuo (cambia cada ${duration}s estrictos sin saltos manuales):\n${info.name} → ${nextInfo.name} en ${secondsLeft}s.`}
			>
				{/* Phase Icon */}
				<span className="time-icon-wrapper" aria-hidden="true">
					{renderIcon(currentPhase)}
				</span>

				{/* Virtual World Clock */}
				<span className="time-display-label">{liveClock}</span>

				{/* Current Phase Badge */}
				<span className="time-phase-badge">{currentName}</span>

				{/* Next Phase Indicator */}
				<span className="time-next-indicator" title={`Próxima fase en ${secondsLeft}s`}>
					→ {nextName}
				</span>

				{/* Autonomous Timer Progress Ring */}
				<svg
					width="18"
					height="18"
					viewBox="0 0 18 18"
					className="time-cycle-ring"
					aria-hidden="true"
				>
					<circle
						cx="9"
						cy="9"
						r={radius}
						fill="none"
						stroke="currentColor"
						strokeOpacity="0.22"
						strokeWidth="2.2"
					/>
					<circle
						cx="9"
						cy="9"
						r={radius}
						fill="none"
						stroke="currentColor"
						strokeWidth="2.2"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						transform="rotate(-90 9 9)"
					/>
				</svg>
			</div>
		</div>
	);
}
