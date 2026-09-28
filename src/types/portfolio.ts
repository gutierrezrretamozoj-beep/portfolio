export type ProjectStatus = "In progress" | "Coming soon" | "Completed";

export type Project = {
	name: string;
	description: string;
	role: string;
	technologies: string[];
	status: ProjectStatus;
	github: string;
	demo: string;
	image: string;
	featured: boolean;
	whatILearned: string;
};

export type Skill = {
	name: string;
	level: "Strong" | "Intermediate";
};

export type SkillGroup = {
	category: string;
	skills: Skill[];
};
