import type { Project } from "@/types/portfolio";

// Replace this provisional content and placeholder links as each project is ready to share.
export const projects: Project[] = [
	{
		name: "Red Camino de María",
		description: "A collaborative project built with HTML, CSS, and JavaScript.",
		role: "Frontend · Team collaboration",
		technologies: ["HTML", "CSS", "JavaScript", "Vite", "Git", "Teamwork"],
		status: "Coming soon",
		github: "#",
		demo: "#",
		image: "",
		featured: true,
		whatILearned: "How thoughtful communication and shared ownership help a team move forward.",
	},
	{
		name: "Cinema React",
		description: "A React project using API data, TypeScript, and collaborative Scrum practices.",
		role: "Frontend · Scrum team",
		technologies: ["React", "TypeScript", "Tailwind CSS", "API", "Git", "Scrum"],
		status: "Coming soon",
		github: "#",
		demo: "#",
		image: "",
		featured: true,
		whatILearned: "How to shape an interface around dynamic data and collaborate in short iterations.",
	},
	{
		name: "Next.js Migration",
		description: "A learning project focused on moving a frontend experience into the Next.js App Router.",
		role: "Frontend · Ongoing learning",
		technologies: ["Next.js", "React", "TypeScript", "Tailwind CSS", "App Router"],
		status: "In progress",
		github: "#",
		demo: "#",
		image: "",
		featured: false,
		whatILearned: "How routing, server rendering, and component boundaries fit together in Next.js.",
	},
];
