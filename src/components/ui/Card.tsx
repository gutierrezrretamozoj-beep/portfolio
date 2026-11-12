import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type CardProps = HTMLAttributes<HTMLDivElement> & {
	children: ReactNode;
};

export function Card({ className, children, ...props }: CardProps) {
	return (
		<div className={cn("soft-panel", className)} {...props}>
			{children}
		</div>
	);
}

