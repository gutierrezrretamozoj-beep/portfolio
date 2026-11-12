import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
	children: ReactNode;
};

export function Badge({ className, children, ...props }: BadgeProps) {
	return (
		<span className={cn("pill", className)} {...props}>
			{children}
		</span>
	);
}

