import type { SkillGroup } from "@/types/portfolio";

export const skillGroups: SkillGroup[] = [
	{ category: "Frontend", skills: [
		{ name: "HTML", level: "Strong" }, { name: "CSS", level: "Strong" },
		{ name: "JavaScript", level: "Strong" }, { name: "TypeScript", level: "Intermediate" },
		{ name: "React", level: "Strong" }, { name: "Next.js", level: "Intermediate" },
		{ name: "Tailwind CSS", level: "Strong" },
	] },
	{ category: "Tools", skills: [
		{ name: "Git", level: "Strong" }, { name: "GitHub", level: "Strong" },
		{ name: "Docker", level: "Intermediate" },
	] },
	{ category: "Data", skills: [
		{ name: "PostgreSQL", level: "Intermediate" }, { name: "MongoDB", level: "Intermediate" },
	] },
];
