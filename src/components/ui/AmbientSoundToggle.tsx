"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useState } from "react";
import { worldAudio } from "@/components/world/world-audio";

export function AmbientSoundToggle() {
	const [enabled, setEnabled] = useState(false);

	useEffect(() => worldAudio.subscribe(setEnabled), []);

	async function toggleSound() {
		await worldAudio.toggle();
	}

	return (
		<button className={`world-hud-button world-sound-button${enabled ? " is-active" : ""}`} type="button" onClick={() => void toggleSound()} aria-label={enabled ? "Turn ambient sound off" : "Turn ambient sound on"} aria-pressed={enabled} title="Sonidos espaciales del mundo (viento, río, pasos, fauna e interacciones)">
			{enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>SOUND {enabled ? "ON" : "OFF"}</span>
		</button>
	);
}