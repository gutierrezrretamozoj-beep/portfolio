import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
	"a[href]",
	"button:not([disabled])",
	"input:not([disabled])",
	"select:not([disabled])",
	"textarea:not([disabled])",
	"[tabindex]:not([tabindex='-1'])",
].join(",");

export function useDialogFocus<T extends HTMLElement>(enabled = true) {
	const dialogRef = useRef<T>(null);

	useEffect(() => {
		if (!enabled) return;
		const dialog = dialogRef.current;
		if (!dialog) return;
		const activeDialog: HTMLElement = dialog;

		const previousFocus = document.activeElement instanceof HTMLElement && document.activeElement !== document.body
			? document.activeElement
			: null;
		const getFocusable = () => Array.from(activeDialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
		const initialFocus = getFocusable()[0] ?? activeDialog;
		initialFocus.focus();

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Tab") return;
			const focusable = getFocusable();
			if (!focusable.length) {
				event.preventDefault();
				activeDialog.focus();
				return;
			}

			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
				event.preventDefault();
				first.focus();
			}
		}

		function handleFocusIn(event: FocusEvent) {
			if (activeDialog.contains(event.target as Node)) return;
			(getFocusable()[0] ?? activeDialog).focus();
		}

		document.addEventListener("keydown", handleKeyDown);
		document.addEventListener("focusin", handleFocusIn);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			document.removeEventListener("focusin", handleFocusIn);
			if (previousFocus?.isConnected) previousFocus.focus();
			else document.getElementById("main-world")?.focus();
		};
	}, [enabled]);

	return dialogRef;
}
