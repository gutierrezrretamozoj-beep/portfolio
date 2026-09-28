"use client";

import { useRef, useState } from "react";
import { WorldInput } from "@/types/world";

type MobileControlsProps = {
	inputRef: { current: WorldInput };
	onExplore: () => void;
	canExplore: boolean;
};

export function MobileControls({ inputRef, onExplore, canExplore }: MobileControlsProps) {
	const [stick, setStick] = useState({ x: 0, y: 0 });
	const stickPointer = useRef<number | null>(null);
	const lookPointer = useRef<{ id: number; x: number; y: number } | null>(null);

	function updateStick(event: React.PointerEvent<HTMLDivElement>) {
		const bounds = event.currentTarget.getBoundingClientRect();
		const radius = bounds.width * 0.34;
		const dx = event.clientX - (bounds.left + bounds.width / 2);
		const dy = event.clientY - (bounds.top + bounds.height / 2);
		const distance = Math.hypot(dx, dy);
		const scale = distance > radius ? radius / distance : 1;
		const x = dx * scale;
		const y = dy * scale;
		setStick({ x, y });
		inputRef.current.moveX = x / radius;
		inputRef.current.moveZ = y / radius;
	}

	function resetStick() {
		stickPointer.current = null;
		inputRef.current.moveX = 0;
		inputRef.current.moveZ = 0;
		setStick({ x: 0, y: 0 });
	}

	return (
		<div className="mobile-controls" data-world-ui>
			<div
				className="virtual-stick"
				role="group"
				aria-label="Movement joystick"
				onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); stickPointer.current = event.pointerId; updateStick(event); }}
				onPointerMove={(event) => { if (stickPointer.current === event.pointerId) updateStick(event); }}
				onPointerUp={resetStick}
				onPointerCancel={resetStick}
			>
				<span className="stick-track" /><span className="stick-knob" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
			</div>
			<div
				className="mobile-look-area"
				aria-label="Drag here to look around"
				onPointerDown={(event) => { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); lookPointer.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
				onPointerMove={(event) => {
					const pointer = lookPointer.current;
					if (!pointer || pointer.id !== event.pointerId) return;
					inputRef.current.lookX += event.clientX - pointer.x;
					inputRef.current.lookY += event.clientY - pointer.y;
					pointer.x = event.clientX;
					pointer.y = event.clientY;
				}}
				onPointerUp={() => { lookPointer.current = null; }}
				onPointerCancel={() => { lookPointer.current = null; }}
			/>
			<button className="mobile-explore" type="button" onClick={onExplore} disabled={!canExplore}>E</button>
			<span className="mobile-look-label">DRAG TO LOOK</span>
		</div>
	);
}