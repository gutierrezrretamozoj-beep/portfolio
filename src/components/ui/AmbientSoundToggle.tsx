"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function AmbientSoundToggle() {
	const [enabled, setEnabled] = useState(false);
	const contextRef = useRef<AudioContext | null>(null);

	useEffect(() => () => {
		void contextRef.current?.close();
	}, []);

	async function toggleSound() {
		if (enabled) {
			await contextRef.current?.close();
			contextRef.current = null;
			setEnabled(false);
			return;
		}

		const context = new AudioContext();
		const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
		const samples = buffer.getChannelData(0);
		for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * 0.18;
		const source = context.createBufferSource();
		source.buffer = buffer;
		source.loop = true;
		const filter = context.createBiquadFilter();
		filter.type = "lowpass";
		filter.frequency.value = 420;
		filter.Q.value = 0.5;
		const volume = context.createGain();
		volume.gain.value = 0.03;
		const breeze = context.createOscillator();
		const breezeDepth = context.createGain();
		breeze.frequency.value = 0.09;
		breezeDepth.gain.value = 0.012;
		source.connect(filter).connect(volume).connect(context.destination);
		breeze.connect(breezeDepth).connect(volume.gain);
		await context.resume();
		source.start();
		breeze.start();
		contextRef.current = context;
		setEnabled(true);
	}

	return (
		<button className={`world-hud-button world-sound-button${enabled ? " is-active" : ""}`} type="button" onClick={() => void toggleSound()} aria-label={enabled ? "Turn ambient sound off" : "Turn ambient sound on"} aria-pressed={enabled} title="Soft synthesized wind, activated only when selected">
			{enabled ? <Volume2 size={16} /> : <VolumeX size={16} />}<span>SOUND {enabled ? "ON" : "OFF"}</span>
		</button>
	);
}