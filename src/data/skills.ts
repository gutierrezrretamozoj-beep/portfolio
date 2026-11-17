import type { SkillGroup } from "@/types/portfolio";

export const skillGroups: SkillGroup[] = [
	{
		category: "Frontend & 3D",
		skills: [
			{ name: "Next.js 16 (App Router)", level: "Strong" },
			{ name: "React 19 / 18", level: "Strong" },
			{ name: "TypeScript (Strict)", level: "Strong" },
			{ name: "Three.js / React Three Fiber", level: "Strong" },
			{ name: "Tailwind CSS (v4 / v3)", level: "Strong" },
			{ name: "Framer Motion", level: "Intermediate" },
			{ name: "JavaScript (ES6+)", level: "Strong" },
		],
	},
	{
		category: "Backend & APIs",
		skills: [
			{ name: "Node.js & Express", level: "Strong" },
			{ name: "Prisma ORM 6", level: "Strong" },
			{ name: "RESTful APIs", level: "Strong" },
			{ name: "NextAuth.js & JWT", level: "Strong" },
			{ name: "Python", level: "Intermediate" },
			{ name: "Zod Validation", level: "Strong" },
		],
	},
	{
		category: "Database & Architecture",
		skills: [
			{ name: "PostgreSQL (Supabase)", level: "Strong" },
			{ name: "Schema-per-tenant Multitenancy", level: "Strong" },
			{ name: "Transacciones ACID", level: "Strong" },
			{ name: "MySQL / SQL Relacional", level: "Strong" },
			{ name: "Prisma Migrations & Seeders", level: "Strong" },
		],
	},
	{
		category: "Security, Tools & DevOps",
		skills: [
			{ name: "Rate Limiting & Idempotency", level: "Strong" },
			{ name: "Stripe API & Webhooks", level: "Intermediate" },
			{ name: "Git & GitHub", level: "Strong" },
			{ name: "Docker", level: "Intermediate" },
			{ name: "Vite / Webpack", level: "Strong" },
			{ name: "Metodologías Ágiles Scrum", level: "Strong" },
		],
	},
];
