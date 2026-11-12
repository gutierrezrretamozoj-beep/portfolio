import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: "primary" | "quiet" | "hud";
	children: ReactNode;
};

export function Button({ variant = "primary", className, children, type = "button", ...props }: ButtonProps) {
	const variantClass =
		variant === "primary" ? "button-primary" : variant === "quiet" ? "button-quiet" : "world-hud-button";
	return (
		<button type={type} className={cn(variantClass, className)} {...props}>
			{children}
		</button>
	);
}

