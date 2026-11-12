import { ArrowUpRight, Code2, Mail, MessageCircle, UsersRound } from "lucide-react";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

type SocialIconsProps = {
	className?: string;
};

export function SocialIcons({ className }: SocialIconsProps) {
	return (
		<div className={cn("world-contact-links", className)}>
			<a className="world-external-link" href={profile.github} target="_blank" rel="noreferrer">
				<Code2 size={16} /> GitHub <ArrowUpRight size={14} />
			</a>
			<a className="world-external-link" href={profile.linkedin} target="_blank" rel="noreferrer">
				<UsersRound size={16} /> LinkedIn <ArrowUpRight size={14} />
			</a>
			<a className="world-external-link" href={`mailto:${profile.email}`}>
				<Mail size={16} /> Email <ArrowUpRight size={14} />
			</a>
			<div className="world-discord">
				<MessageCircle size={16} /> Discord <span>{profile.discord}</span>
			</div>
		</div>
	);
}

