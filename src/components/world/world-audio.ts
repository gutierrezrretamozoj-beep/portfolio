import type { TimePhase } from "@/components/world/time-system";

type SoundListener = (enabled: boolean) => void;
export type SurfaceKind = "grass" | "path" | "wood";
export type AnimalSoundKind = "duck" | "cat" | "bird" | "splash";

function createNoiseBuffer(ctx: AudioContext, seconds = 2): AudioBuffer {
	const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let lastOut = 0;
	for (let i = 0; i < data.length; i += 1) {
		const white = Math.random() * 2 - 1;
		// Gentle pink-ish smoothing so wind and water sound warm, never harsh
		lastOut = (lastOut + 0.04 * white) / 1.04;
		data[i] = lastOut * 2.8;
	}
	return buffer;
}

class WorldAudioEngine {
	private ctx: AudioContext | null = null;
	private masterGain: GainNode | null = null;
	private windGain: GainNode | null = null;
	private waterGain: GainNode | null = null;
	private waterFilter: BiquadFilterNode | null = null;
	private noiseBuffer: AudioBuffer | null = null;

	private enabled = false;
	private listeners = new Set<SoundListener>();
	private currentPhase: TimePhase = "dawn";
	private lastPlayerX = 0;
	private lastPlayerZ = 20;
	private ambientTimer: number | null = null;
	private lastFootstepMs = 0;
	private lastAnimalMs: Record<string, number> = {};

	public isEnabled(): boolean {
		return this.enabled;
	}

	public subscribe(listener: SoundListener): () => void {
		this.listeners.add(listener);
		listener(this.enabled);
		return () => {
			this.listeners.delete(listener);
		};
	}

	private notify() {
		for (const listener of this.listeners) {
			listener(this.enabled);
		}
	}

	public async toggle(): Promise<boolean> {
		if (this.enabled) {
			this.stop();
			return false;
		}
		await this.start();
		return true;
	}

	public async start(): Promise<void> {
		if (typeof window === "undefined" || this.enabled) return;
		const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
		if (!AudioCtor) return;

		const ctx = new AudioCtor();
		const master = ctx.createGain();
		master.gain.setValueAtTime(0.0001, ctx.currentTime);
		master.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.35);
		master.connect(ctx.destination);

		const noise = createNoiseBuffer(ctx, 3);

		// 1. Meadow Wind Layer
		const windSrc = ctx.createBufferSource();
		windSrc.buffer = noise;
		windSrc.loop = true;
		const windFilter = ctx.createBiquadFilter();
		windFilter.type = "lowpass";
		windFilter.frequency.value = 380;
		windFilter.Q.value = 0.6;
		const windGain = ctx.createGain();
		windGain.gain.value = 0.045;
		const breezeLfo = ctx.createOscillator();
		const breezeDepth = ctx.createGain();
		breezeLfo.frequency.value = 0.11;
		breezeDepth.gain.value = 0.018;
		breezeLfo.connect(breezeDepth).connect(windGain.gain);
		windSrc.connect(windFilter).connect(windGain).connect(master);

		// 2. Spatial River & Lake Water Layer
		const waterSrc = ctx.createBufferSource();
		waterSrc.buffer = noise;
		waterSrc.loop = true;
		const waterFilter = ctx.createBiquadFilter();
		waterFilter.type = "bandpass";
		waterFilter.frequency.value = 820;
		waterFilter.Q.value = 0.85;
		const waterGain = ctx.createGain();
		waterGain.gain.value = 0.015;
		const rippleLfo = ctx.createOscillator();
		const rippleDepth = ctx.createGain();
		rippleLfo.frequency.value = 0.32;
		rippleDepth.gain.value = 140;
		rippleLfo.connect(rippleDepth).connect(waterFilter.frequency);
		waterSrc.connect(waterFilter).connect(waterGain).connect(master);

		await ctx.resume();
		windSrc.start();
		breezeLfo.start();
		waterSrc.start();
		rippleLfo.start();

		this.ctx = ctx;
		this.masterGain = master;
		this.windGain = windGain;
		this.waterGain = waterGain;
		this.waterFilter = waterFilter;
		this.noiseBuffer = noise;
		this.enabled = true;
		this.scheduleAmbientCritter();
		this.notify();
		this.playUiSound("open");
	}

	public stop(): void {
		if (this.ambientTimer !== null) {
			window.clearTimeout(this.ambientTimer);
			this.ambientTimer = null;
		}
		if (this.ctx) {
			void this.ctx.close();
			this.ctx = null;
		}
		this.masterGain = null;
		this.windGain = null;
		this.waterGain = null;
		this.waterFilter = null;
		this.noiseBuffer = null;
		this.enabled = false;
		this.notify();
	}

	private scheduleAmbientCritter(): void {
		if (!this.enabled) return;
		const delay = this.currentPhase === "night" || this.currentPhase === "midnight"
			? 1700 + Math.random() * 2200
			: 2600 + Math.random() * 3400;

		this.ambientTimer = window.setTimeout(() => {
			if (!this.enabled || !this.ctx) return;
			if (this.currentPhase === "night" || this.currentPhase === "midnight") {
				this.playCricketChirp();
			} else {
				this.playBirdChirp(0.032);
			}
			this.scheduleAmbientCritter();
		}, delay);
	}

	public updateSpatial(playerX: number, playerZ: number, phase: TimePhase): void {
		this.lastPlayerX = playerX;
		this.lastPlayerZ = playerZ;
		this.currentPhase = phase;
		if (!this.enabled || !this.ctx || !this.waterGain || !this.waterFilter || !this.windGain) return;

		const now = this.ctx.currentTime;
		const riverZ = -2.5 + Math.sin(playerX * 0.13) * 0.75;
		const distRiver = Math.abs(playerZ - riverZ);
		const distLake = Math.max(0, Math.hypot(playerX, playerZ + 28) - 4.8);
		const nearestWater = Math.min(distRiver, distLake);

		// Smooth inverse-distance water volume (loud beside river/lake, subtle across meadow)
		const waterProximity = Math.max(0, 1 - nearestWater / 22);
		const targetWater = 0.008 + waterProximity * waterProximity * 0.095;
		const targetFreq = 640 + waterProximity * 520;
		this.waterGain.gain.setTargetAtTime(targetWater, now, 0.18);
		this.waterFilter.frequency.setTargetAtTime(targetFreq, now, 0.18);

		const nightWind = phase === "night" || phase === "midnight" ? 0.032 : 0.048;
		this.windGain.gain.setTargetAtTime(nightWind, now, 0.35);
	}

	public playFootstep(surface: SurfaceKind, sprinting = false): void {
		if (!this.enabled || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
		const nowMs = performance.now();
		if (nowMs - this.lastFootstepMs < (sprinting ? 190 : 270)) return;
		this.lastFootstepMs = nowMs;

		const t = this.ctx.currentTime;
		const vol = sprinting ? 0.09 : 0.06;

		if (surface === "wood") {
			// Hollow timber plank thump on Bridge / Lake Pier
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "triangle";
			osc.frequency.setValueAtTime(145 + Math.random() * 25, t);
			osc.frequency.exponentialRampToValueAtTime(68, t + 0.075);
			gain.gain.setValueAtTime(vol * 1.15, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
			osc.connect(gain).connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.09);
			return;
		}

		// Grass or gravel/earth noise burst
		const src = this.ctx.createBufferSource();
		src.buffer = this.noiseBuffer;
		const filter = this.ctx.createBiquadFilter();
		filter.type = surface === "path" ? "bandpass" : "highpass";
		filter.frequency.value = surface === "path" ? 1350 + Math.random() * 350 : 1900 + Math.random() * 450;
		filter.Q.value = surface === "path" ? 1.4 : 0.8;

		const gain = this.ctx.createGain();
		const dur = surface === "path" ? 0.065 : 0.085;
		gain.gain.setValueAtTime(vol * (surface === "path" ? 1.1 : 0.75), t);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

		src.connect(filter).connect(gain).connect(this.masterGain);
		src.start(t, Math.random() * 1.5, dur);
	}

	public playAnimalSoundAt(kind: AnimalSoundKind, worldX: number, worldZ: number, maxRange = 16): void {
		const distance = Math.hypot(this.lastPlayerX - worldX, this.lastPlayerZ - worldZ);
		if (distance <= maxRange) {
			this.playAnimalSound(kind, distance);
		}
	}

	public playAnimalSound(kind: AnimalSoundKind, distance = 6): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const nowMs = performance.now();
		if (nowMs - (this.lastAnimalMs[kind] ?? 0) < 2800) return;
		this.lastAnimalMs[kind] = nowMs;

		const atten = Math.max(0.15, 1 - distance / 18);
		if (kind === "bird") {
			this.playBirdChirp(0.045 * atten);
			return;
		}
		if (kind === "duck") {
			this.playDuckQuack(0.065 * atten);
			return;
		}
		if (kind === "cat") {
			this.playCatMeow(0.055 * atten);
			return;
		}
		if (kind === "splash") {
			this.playSplash(0.06 * atten);
		}
	}

	private playBirdChirp(volume: number): void {
		if (!this.ctx || !this.masterGain) return;
		const t = this.ctx.currentTime;
		const notes = Math.random() > 0.45 ? 3 : 2;
		const baseFreq = 2100 + Math.random() * 900;

		for (let i = 0; i < notes; i += 1) {
			const start = t + i * 0.11;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(baseFreq + i * 260, start);
			osc.frequency.exponentialRampToValueAtTime(baseFreq + 520 + i * 180, start + 0.065);
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(volume, start + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);
			osc.connect(gain).connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.09);
		}
	}

	private playCricketChirp(): void {
		if (!this.ctx || !this.masterGain) return;
		const t = this.ctx.currentTime;
		const pulses = 3;
		const freq = 4150 + Math.random() * 250;
		for (let i = 0; i < pulses; i += 1) {
			const start = t + i * 0.055;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(0.018, start + 0.008);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.036);
			osc.connect(gain).connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.04);
		}
	}

	private playDuckQuack(volume: number): void {
		if (!this.ctx || !this.masterGain) return;
		const t = this.ctx.currentTime;
		for (let i = 0; i < 2; i += 1) {
			const start = t + i * 0.18;
			const osc = this.ctx.createOscillator();
			const filter = this.ctx.createBiquadFilter();
			const gain = this.ctx.createGain();
			osc.type = "sawtooth";
			osc.frequency.setValueAtTime(340 - i * 20, start);
			osc.frequency.exponentialRampToValueAtTime(250, start + 0.12);
			filter.type = "bandpass";
			filter.frequency.setValueAtTime(920, start);
			filter.frequency.exponentialRampToValueAtTime(560, start + 0.12);
			filter.Q.value = 3.2;
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(volume, start + 0.02);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
			osc.connect(filter).connect(gain).connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.14);
		}
	}

	private playCatMeow(volume: number): void {
		if (!this.ctx || !this.masterGain) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const filter = this.ctx.createBiquadFilter();
		const gain = this.ctx.createGain();
		osc.type = "triangle";
		osc.frequency.setValueAtTime(520, t);
		osc.frequency.linearRampToValueAtTime(760, t + 0.11);
		osc.frequency.exponentialRampToValueAtTime(430, t + 0.34);
		filter.type = "bandpass";
		filter.frequency.value = 1150;
		filter.Q.value = 1.8;
		gain.gain.setValueAtTime(0.0001, t);
		gain.gain.linearRampToValueAtTime(volume, t + 0.06);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.36);
		osc.connect(filter).connect(gain).connect(this.masterGain);
		osc.start(t);
		osc.stop(t + 0.38);
	}

	private playSplash(volume: number): void {
		if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
		const t = this.ctx.currentTime;
		const src = this.ctx.createBufferSource();
		src.buffer = this.noiseBuffer;
		const filter = this.ctx.createBiquadFilter();
		filter.type = "bandpass";
		filter.frequency.setValueAtTime(1400, t);
		filter.frequency.exponentialRampToValueAtTime(420, t + 0.24);
		filter.Q.value = 1.2;
		const gain = this.ctx.createGain();
		gain.gain.setValueAtTime(volume, t);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
		src.connect(filter).connect(gain).connect(this.masterGain);
		src.start(t, Math.random(), 0.27);
	}

	public playLandmarkChime(pointId: string): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const chords: Record<string, number[]> = {
			skills: [523.25, 659.25, 783.99, 1046.5],
			dna: [587.33, 739.99, 880.0, 1174.66],
			contact: [392.0, 493.88, 587.33, 783.99],
			riwi: [440.0, 554.37, 659.25, 880.0],
			about: [349.23, 440.0, 523.25],
			journey: [392.0, 493.88, 659.25],
		};
		const notes = chords[pointId] ?? [440.0, 554.37, 659.25];
		const t = this.ctx.currentTime;

		notes.forEach((freq, idx) => {
			if (!this.ctx || !this.masterGain) return;
			const start = t + idx * 0.065;
			const osc = this.ctx.createOscillator();
			const gain = this.ctx.createGain();
			osc.type = pointId === "skills" || pointId === "dna" ? "triangle" : "sine";
			osc.frequency.setValueAtTime(freq, start);
			gain.gain.setValueAtTime(0.0001, start);
			gain.gain.linearRampToValueAtTime(0.055, start + 0.015);
			gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);
			osc.connect(gain).connect(this.masterGain);
			osc.start(start);
			osc.stop(start + 0.45);
		});
	}

	public playUiSound(kind: "open" | "close" | "tap" | "arrive" | "phase"): void {
		if (!this.enabled || !this.ctx || !this.masterGain) return;
		const t = this.ctx.currentTime;
		const osc = this.ctx.createOscillator();
		const gain = this.ctx.createGain();
		osc.type = "sine";

		if (kind === "open" || kind === "arrive") {
			osc.frequency.setValueAtTime(523.25, t);
			osc.frequency.exponentialRampToValueAtTime(783.99, t + 0.14);
			gain.gain.setValueAtTime(0.05, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
			osc.connect(gain).connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.26);
		} else if (kind === "close") {
			osc.frequency.setValueAtTime(587.33, t);
			osc.frequency.exponentialRampToValueAtTime(392.0, t + 0.12);
			gain.gain.setValueAtTime(0.04, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
			osc.connect(gain).connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.18);
		} else if (kind === "phase") {
			osc.frequency.setValueAtTime(659.25, t);
			osc.frequency.exponentialRampToValueAtTime(880.0, t + 0.22);
			gain.gain.setValueAtTime(0.035, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
			osc.connect(gain).connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.4);
		} else {
			osc.frequency.setValueAtTime(660, t);
			osc.frequency.exponentialRampToValueAtTime(540, t + 0.05);
			gain.gain.setValueAtTime(0.032, t);
			gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
			osc.connect(gain).connect(this.masterGain);
			osc.start(t);
			osc.stop(t + 0.08);
		}
	}
}

export const worldAudio = new WorldAudioEngine();
