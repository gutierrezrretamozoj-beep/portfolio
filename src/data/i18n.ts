export type Language = "es" | "en";

export const i18nProfile = {
	es: {
		displayName: "David",
		fullName: "José Gutiérrez",
		headline: "Curioso por naturaleza, desarrollador por pasión.",
		descriptor: "Desarrollador Full-Stack · Mente creativa × Constructor técnico",
		subbrand: "UN MUNDO EN DESARROLLO",
	},
	en: {
		displayName: "David",
		fullName: "José Gutiérrez",
		headline: "Curious by nature, developer by passion.",
		descriptor: "Full-Stack Developer · Creative mind × Technical builder",
		subbrand: "A WORLD IN PROGRESS",
	},
} as const;

export const i18nWorldPoints: Record<
	Language,
	Record<string, { name: string; label: string; description: string }>
> = {
	es: {
		start: {
			name: "Curiosidad",
			label: "COMIENZA AQUÍ",
			description: "Cada sendero comienza con una pregunta. Recorre los caminos y descubre mi trabajo.",
		},
		about: {
			name: "Sobre David",
			label: "QUIÉN SOY",
			description: "La tecnología siempre estuvo cerca. La curiosidad me abrió el camino hacia el desarrollo.",
		},
		dna: {
			name: "ADN Digital",
			label: "MI ADN DIGITAL",
			description: "Tecnología · Creatividad · Liderazgo · Comunicación · Diseño · Curiosidad",
		},
		journey: {
			name: "Mi Camino",
			label: "MI TRAYECTORIA",
			description: "El río marca una ruta desde la curiosidad temprana hacia un futuro que sigo construyendo.",
		},
		garden: {
			name: "Habilidades Humanas",
			label: "JARDÍN DE PERSONAS",
			description: "Comunicación, empatía y trabajo en equipo impulsan el crecimiento de los proyectos.",
		},
		skills: {
			name: "Laboratorio Tech",
			label: "HABILIDADES TÉCNICAS",
			description: "Las herramientas que uso hoy y las tecnologías que continúo aprendiendo.",
		},
		riwi: {
			name: "Riwi",
			label: "DONDE CREZCO",
			description: "Proyectos prácticos, Scrum, presentaciones y trabajo colaborativo.",
		},
		"easter-egg": {
			name: "Curiosidad detectada",
			label: "UN DESCUBRIMIENTO TRANQUILO",
			description: "La curiosidad es la chispa silenciosa que hace crecer todo este mundo.",
		},
		contact: {
			name: "El Lago",
			label: "CONSTRUYAMOS ALGO",
			description: "¿Tienes una idea, un proyecto o simplemente quieres conectar?",
		},
	},
	en: {
		start: {
			name: "Curiosity",
			label: "START HERE",
			description: "Every path starts with a question.",
		},
		about: {
			name: "About David",
			label: "WHO I AM",
			description: "Technology was always nearby. Curiosity helped me find my way into development.",
		},
		dna: {
			name: "Digital DNA",
			label: "MY DIGITAL DNA",
			description: "Technology · Creativity · Leadership · Communication · Design · Curiosity",
		},
		journey: {
			name: "My Journey",
			label: "MY JOURNEY",
			description: "The river marks a path from early curiosity toward a future still taking shape.",
		},
		garden: {
			name: "Human Skills",
			label: "GARDEN OF PEOPLE",
			description: "Communication, empathy, and teamwork help good work grow.",
		},
		skills: {
			name: "Natural Tech Lab",
			label: "TECHNICAL SKILLS",
			description: "The tools I use today, and the ones I am still learning.",
		},
		riwi: {
			name: "Riwi",
			label: "WHERE I GROW",
			description: "Projects, Scrum, presentations, and collaboration are part of my learning path.",
		},
		"easter-egg": {
			name: "Curiosity detected",
			label: "A QUIET DISCOVERY",
			description: "Curiosity is the little spark that keeps the whole world growing.",
		},
		contact: {
			name: "The Lake",
			label: "LET'S BUILD SOMETHING",
			description: "Have an idea, a project or just want to connect?",
		},
	},
};

export const i18nProjects: Record<
	Language,
	Array<{
		name: string;
		description: string;
		role: string;
		status: string;
		technologies: string[];
		whatILearned: string;
		github?: string;
		liveDemo?: string;
	}>
> = {
	es: [
		{
			name: "BioSanctuary OS",
			description: "SaaS multitenant para santuarios y reservas de fauna silvestre: aislamiento de datos schema-per-tenant en PostgreSQL (Supabase), fondo 3D reactivo con ciclo día/noche (Three.js/R3F), motor de Rate Limiting con ventana deslizante (HTTP 429 Retry-After), protocolo de idempotencia en endpoints POST y matriz de roles RBAC clínicos y operativos.",
			role: "Full-Stack & Arquitectura SaaS Multitenant",
			technologies: ["Next.js 16", "React 19", "TypeScript", "PostgreSQL", "Supabase", "Three.js", "Tailwind CSS v4", "Rate Limiting", "Idempotencia", "RBAC"],
			status: "En producción",
			whatILearned: "Diseño de arquitecturas multitenant seguras sin fuga de datos, resiliencia transaccional con aprovisionamiento dinámico de schemas y atmósfera 3D viva.",
			github: "https://github.com/gutierrezrretamozoj-beep/biosanctuary",
		},
		{
			name: "CoSpace",
			description: "Plataforma fullstack para reserva bajo demanda de espacios de coworking por horas (hot desks, salas de juntas y cabinas). Con cálculo dinámico de tarifas en el servidor, prevención de sobreventa y solapamientos mediante transacciones atómicas, autenticación JWT con refresh tokens hasheados en base de datos y cookies httpOnly seguras, e interfaz bilingüe.",
			role: "Full-Stack · Arquitectura & Base de Datos",
			technologies: ["Next.js 16", "React 19", "TypeScript", "Prisma ORM", "PostgreSQL", "Supabase", "JWT & Cookies HttpOnly", "Tailwind CSS v4", "Docker", "i18n"],
			status: "Completado",
			whatILearned: "Manejo de concurrencia y transacciones ACID en Prisma para evitar colisiones de agenda, hidratación 100% segura y estrategias de renderizado híbrido (SSG, SSR, CSR).",
			github: "https://github.com/gutierrezrretamozoj-beep/CoSpace-jose",
			liveDemo: "https://cospace-aurora.vercel.app",
		},
		{
			name: "PlanCity API",
			description: "API REST empresarial desarrollada con NestJS 11 y TypeORM sobre PostgreSQL para la gestión integral y planificación de entidades urbanas. Documentación interactiva con Swagger/OpenAPI, autenticación con Passport JWT, validación de DTOs con class-validator, migraciones automáticas y suite de pruebas Jest.",
			role: "Backend Engineer · Arquitectura NestJS & TypeORM",
			technologies: ["NestJS 11", "TypeScript", "TypeORM", "PostgreSQL", "Swagger / OpenAPI", "Passport JWT", "Class Validator", "Jest"],
			status: "Completado",
			whatILearned: "Diseño modular e inyección de dependencias en NestJS, ejecución de migraciones TypeORM en entornos empresariales y documentación automatizada con OpenAPI.",
			github: "https://github.com/gutierrezrretamozoj-beep/plancity-api",
		},
		{
			name: "Cinema React",
			description: "Aplicación interactiva de catálogo y consulta cinematográfica conectada a APIs REST en tiempo real. Cuenta con filtros dinámicos por género y valoración, búsqueda instantánea, manejo de estados asíncronos y diseño responsivo, desarrollada bajo sprints Scrum colaborativos en Riwi.",
			role: "Frontend Developer · Equipo Scrum",
			technologies: ["React", "TypeScript", "Tailwind CSS", "REST APIs", "Git", "Scrum Agile", "Vite"],
			status: "Completado",
			whatILearned: "Patrones avanzados de gestión de estado en React, optimización de renderizado ante flujos continuos de datos y dinámicas de colaboración ágil con entregas continuas.",
			github: "https://github.com/gutierrezrretamozoj-beep/react-cinema-app",
		},
		{
			name: "Vice City",
			description: "Plataforma web para gestión y reservas de complejo deportivo. Integra sistema de bloqueo temporal (hold) para evitar colisiones horarias, pasarela de pago Stripe con webhooks asíncronos y verificación de firmas, validación de acceso presencial mediante códigos QR dinámicos, módulo de punto de venta (POS) y métricas analíticas con Recharts.",
			role: "Backend & Integraciones Full-Stack",
			technologies: ["Next.js 16", "TypeScript", "Prisma ORM", "PostgreSQL", "Stripe API & Webhooks", "NextAuth.js", "QR Code", "Recharts", "Nodemailer"],
			status: "Completado",
			whatILearned: "Arquitectura de pagos robusta con webhooks tolerantes a fallos, generación y verificación criptográfica de códigos QR para control de acceso físico, y modelado relacional complejo.",
			github: "https://github.com/Vice-City-Proyect/vice-city",
		},
		{
			name: "Red Camino SPA",
			description: "Single Page Application colaborativa desarrollada con arquitectura modular en JavaScript nativo, diseño responsivo y control de versiones con Git para comunidades.",
			role: "Frontend Developer · Colaboración Comunitaria",
			technologies: ["HTML5", "CSS3", "JavaScript (ES6+)", "Vite", "Git", "Arquitectura Modular"],
			status: "Completado",
			whatILearned: "Estructuración de componentes y enrutamiento en JavaScript vanilla, buenas prácticas de accesibilidad web y colaboración asertiva en equipo.",
			github: "https://github.com/gutierrezrretamozoj-beep/construccion_spa_camino",
		},
	],
	en: [
		{
			name: "BioSanctuary OS",
			description: "Multitenant SaaS platform for wildlife sanctuaries and nature reserves: strict data isolation via PostgreSQL schema-per-tenant (Supabase), reactive 3D day/night canvas (Three.js/R3F), sliding-window rate limiting engine (HTTP 429 Retry-After), idempotency key protocol on critical POST endpoints, and RBAC matrix for sanctuary directors, veterinarians, and keepers.",
			role: "Full-Stack & Multitenant SaaS Architecture",
			technologies: ["Next.js 16", "React 19", "TypeScript", "PostgreSQL", "Supabase", "Three.js", "Tailwind CSS v4", "Rate Limiting", "Idempotency", "RBAC"],
			status: "In production",
			whatILearned: "Zero-leak multitenant database architectures, transactional resilience with dynamic schema provisioning, and high-performance 3D visual environments.",
			github: "https://github.com/gutierrezrretamozoj-beep/biosanctuary",
		},
		{
			name: "CoSpace",
			description: "Fullstack on-demand hourly coworking booking system for flex desks, meeting rooms, and focus pods. Built with Next.js 16 App Router, Prisma ORM, and PostgreSQL. Features real-time server-side rate calculation, atomic DB transactions preventing double bookings, JWT authentication with hashed refresh tokens in database and httpOnly cookies, and an immersive bilingual UI.",
			role: "Full-Stack · Architecture & Database",
			technologies: ["Next.js 16", "React 19", "TypeScript", "Prisma ORM", "PostgreSQL", "Supabase", "JWT & HttpOnly Cookies", "Tailwind CSS v4", "Docker", "i18n"],
			status: "Completed",
			whatILearned: "Concurrency management and ACID transactions in Prisma to prevent double bookings, 100% safe client/server hydration, and hybrid rendering strategies.",
			github: "https://github.com/gutierrezrretamozoj-beep/CoSpace-jose",
			liveDemo: "https://cospace-aurora.vercel.app",
		},
		{
			name: "PlanCity API",
			description: "Enterprise REST API built with NestJS 11 and TypeORM on PostgreSQL for urban entity planning and management. Interactive documentation via Swagger/OpenAPI, Passport JWT authentication, DTO validation with class-validator, automated database migrations, and Jest test suites.",
			role: "Backend Engineer · NestJS & TypeORM Architecture",
			technologies: ["NestJS 11", "TypeScript", "TypeORM", "PostgreSQL", "Swagger / OpenAPI", "Passport JWT", "Class Validator", "Jest"],
			status: "Completed",
			whatILearned: "Modular architecture and dependency injection in NestJS, TypeORM migrations in production, and automated OpenAPI documentation.",
			github: "https://github.com/gutierrezrretamozoj-beep/plancity-api",
		},
		{
			name: "Cinema React",
			description: "Interactive movie catalog and discovery web app consuming real-time REST APIs. Features dynamic filtering by genre and rating, instant search, resilient asynchronous state management, and responsive design, developed in agile Scrum sprints at Riwi.",
			role: "Frontend Developer · Scrum Team",
			technologies: ["React", "TypeScript", "Tailwind CSS", "REST APIs", "Git", "Scrum Agile", "Vite"],
			status: "Completed",
			whatILearned: "Advanced state management patterns in React, UI rendering optimization with dynamic data streams, and agile sprint collaboration with continuous delivery.",
			github: "https://github.com/gutierrezrretamozoj-beep/react-cinema-app",
		},
		{
			name: "Vice City",
			description: "Comprehensive web platform for sports complex management and booking. Integrates a temporary hold reservation system to prevent scheduling collisions, Stripe payment gateway with asynchronous webhooks and signature verification, physical access validation via dynamic QR codes, POS module for counter sales, and interactive financial analytics dashboards powered by Recharts.",
			role: "Backend & Full-Stack Integrations",
			technologies: ["Next.js 16", "TypeScript", "Prisma ORM", "PostgreSQL", "Stripe API & Webhooks", "NextAuth.js", "QR Code", "Recharts", "Nodemailer"],
			status: "Completed",
			whatILearned: "Architecting resilient payment flows with failure-tolerant webhooks, cryptographic QR code generation and verification for physical access, and complex relational modeling in Prisma.",
			github: "https://github.com/Vice-City-Proyect/vice-city",
		},
		{
			name: "Red Camino SPA",
			description: "Collaborative Single Page Application built with modular vanilla JavaScript, responsive layout, and Git version control for communities.",
			role: "Frontend Developer · Community Collaboration",
			technologies: ["HTML5", "CSS3", "JavaScript (ES6+)", "Vite", "Git", "Modular Architecture"],
			status: "Completed",
			whatILearned: "Structuring client-side routing in vanilla JavaScript, web accessibility best practices, and collaborative Git workflows.",
			github: "https://github.com/gutierrezrretamozoj-beep/construccion_spa_camino",
		},
	],
};

export const i18nDigitalDna: Record<Language, Array<{ name: string; note: string; color: string }>> = {
	es: [
		{ name: "Tecnología", note: "Una base sólida para ideas útiles", color: "#bdefff" },
		{ name: "Creatividad", note: "Espacio para descubrir un mejor camino", color: "#ffd8e8" },
		{ name: "Liderazgo", note: "Ayudar al equipo a encontrar dirección", color: "#cff7e8" },
		{ name: "Comunicación", note: "Crear espacio para cada voz", color: "#fff1d6" },
		{ name: "Diseño", note: "Cuidado por los detalles que las personas sienten", color: "#ddd5ff" },
		{ name: "Curiosidad", note: "El instinto natural de seguir preguntando", color: "#c8e9ff" },
	],
	en: [
		{ name: "Technology", note: "A foundation for useful ideas", color: "#bdefff" },
		{ name: "Creativity", note: "Room to explore a better way", color: "#ffd8e8" },
		{ name: "Leadership", note: "Helping a team find direction", color: "#cff7e8" },
		{ name: "Communication", note: "Making space for every voice", color: "#fff1d6" },
		{ name: "Design", note: "Care for the details people feel", color: "#ddd5ff" },
		{ name: "Curiosity", note: "The instinct to keep asking", color: "#c8e9ff" },
	],
};

export const i18nJourney: Record<Language, Array<{ title: string; detail: string }>> = {
	es: [
		{ title: "Curiosidad infantil", detail: "La tecnología estuvo presente desde temprano, incluso antes de tener un rumbo definido." },
		{ title: "Explorando la tecnología", detail: "Un interés creciente se convirtió en la búsqueda del área tecnológica que me apasionara." },
		{ title: "Primeros pasos en programación", detail: "Escribir las primeras líneas de código hizo que las posibilidades se volvieran tangibles." },
		{ title: "Aprender construyendo", detail: "La práctica constante, las preguntas y pequeños experimentos se volvieron mi rutina." },
		{ title: "Riwi", detail: "Un espacio para aprender con personas talentosas, crear proyectos y crecer profesionalmente." },
		{ title: "Proyectos en equipo", detail: "Práctica de colaboración integrando frontend, backend y sustentaciones conjuntas." },
		{ title: "Desarrollo Frontend", detail: "Uniendo estructura, interactividad y detalle visual en cada interfaz." },
		{ title: "Next.js", detail: "Explorando el App Router y las herramientas detrás de las experiencias web modernas." },
		{ title: "Primer rol profesional", detail: "Una meta para la que me preparo mediante práctica, retroalimentación y proyectos sólidos." },
		{ title: "Meta Full-Stack", detail: "Una dirección por delante: dominar el producto completo, desde la interfaz hasta los datos." },
		{ title: "Productos propios", detail: "Una ambición futura: convertir ideas personales en soluciones que la gente ame usar." },
		{ title: "Impacto internacional", detail: "Una aspiración a largo plazo: colaborar con equipos multiculturales en todo el mundo." },
	],
	en: [
		{ title: "Childhood curiosity", detail: "Technology was part of the picture early on, even before the destination was clear." },
		{ title: "Exploring technology", detail: "A growing interest turned into a search for the part of technology that felt right." },
		{ title: "Programming", detail: "Writing the first code made the possibilities feel tangible." },
		{ title: "Learning by building", detail: "Practice, questions, and small experiments became a steady rhythm." },
		{ title: "Riwi", detail: "A place to learn with people, build projects, and grow professionally." },
		{ title: "Team projects", detail: "Practicing collaboration across frontend, backend, and shared presentations." },
		{ title: "Frontend development", detail: "Bringing structure, interaction, and visual detail together." },
		{ title: "Next.js", detail: "Exploring the App Router and the tools behind modern web experiences." },
		{ title: "First professional role", detail: "A goal I am preparing for through practice, feedback, and a growing body of work." },
		{ title: "Full-stack goal", detail: "A direction still ahead: understanding the whole product, from interface to data." },
		{ title: "Products of my own", detail: "A future ambition: turn personal ideas into useful products people can use." },
		{ title: "Working internationally", detail: "A long-term aspiration to collaborate with teams and people across borders." },
	],
};

export const i18nRiwiHighlights: Record<Language, string[]> = {
	es: [
		"Aprendizaje mediante proyectos prácticos",
		"Colaboración fluida entre Frontend y Backend",
		"Trabajo en células ágiles con Scrum",
		"Presentación y sustentación de ideas",
		"Experiencia en el rol de Scrum Master",
	],
	en: [
		"Learning through practical projects",
		"Frontend and backend collaboration",
		"Working in Scrum teams",
		"Presenting work and ideas",
		"Experience as a Scrum Master",
	],
};

export const i18nHumanSkills: Record<Language, Array<{ name: string; description: string }>> = {
	es: [
		{ name: "Liderazgo", description: "Capacidad de guiar con empatía y orientar al equipo hacia objetivos comunes." },
		{ name: "Trabajo en equipo", description: "Colaborar activamente para que el resultado conjunto sea mayor que la suma de las partes." },
		{ name: "Comunicación", description: "Expresar ideas de forma clara y generar espacios donde todos sean escuchados." },
		{ name: "Creatividad", description: "Buscar soluciones innovadoras y perspectivas frescas ante cada desafío." },
		{ name: "Empatía", description: "Comprender las necesidades tanto de los usuarios como de mis compañeros de equipo." },
		{ name: "Presentaciones", description: "Comunicar conceptos técnicos y avances de proyectos con seguridad y claridad." },
		{ name: "Dar feedback", description: "Aportar observaciones constructivas con respeto y enfoque en el crecimiento." },
		{ name: "Recibir feedback", description: "Acoger sugerencias con mente abierta como motor de mejora continua." },
	],
	en: [
		{ name: "Leadership", description: "Helping a team find direction and moving forward together with empathy." },
		{ name: "Teamwork", description: "Collaborating so the collective outcome is greater than the sum of its parts." },
		{ name: "Communication", description: "Sharing ideas clearly and making space for every voice." },
		{ name: "Creativity", description: "Exploring better ways and bringing fresh perspectives to every problem." },
		{ name: "Empathy", description: "Understanding the real needs of both users and teammates." },
		{ name: "Presentations", description: "Explaining technical work and ideas with confidence and structure." },
		{ name: "Giving feedback", description: "Offering constructive observations with care and a growth mindset." },
		{ name: "Receiving feedback", description: "Welcoming critiques with an open mind as a catalyst for improvement." },
	],
};

export const i18nInterests: Record<Language, Array<{ name: string; description: string }>> = {
	es: [
		{ name: "Videojuegos", description: "Pasión por los mundos interactivos, mecánicas inmersivas y diseño lúdico." },
		{ name: "Música", description: "Compañera constante que inspira concentración y nuevos ritmos creativos." },
		{ name: "Tecnología", description: "Curiosidad por gadgets, inteligencia artificial y herramientas del futuro." },
		{ name: "Gatos", description: "Compañeros tranquilos y curiosos que recuerdan tomar pausas." },
		{ name: "Programación", description: "El placer de resolver acertijos y materializar ideas línea por línea." },
		{ name: "Diseño", description: "Sensibilidad por la tipografía, la armonía visual y la experiencia de usuario." },
		{ name: "Naturaleza", description: "Desconexión al aire libre para recargar energías e inspiración." },
		{ name: "Viajes", description: "Apertura para conocer nuevas culturas, personas y perspectivas." },
		{ name: "Cocina", description: "El arte de experimentar con ingredientes y compartir momentos en la mesa." },
	],
	en: [
		{ name: "Video games", description: "A love for interactive worlds, immersive mechanics, and playful game design." },
		{ name: "Music", description: "A steady companion inspiring deep focus and creative flow." },
		{ name: "Technology", description: "Endless curiosity about hardware, modern AI, and tomorrow's tools." },
		{ name: "Cats", description: "Calm, curious companions who remind me to take mindful breaks." },
		{ name: "Programming", description: "The genuine joy of solving puzzles and building ideas line by line." },
		{ name: "Design", description: "Care for typography, visual balance, and intuitive user experiences." },
		{ name: "Nature", description: "Recharging outdoors to gain fresh perspectives and calm energy." },
		{ name: "Travel", description: "Eagerness to explore cultures, meet people, and broaden horizons." },
		{ name: "Cooking", description: "Experimenting with recipes and sharing hearty meals with loved ones." },
	],
};

export const i18nSignposts: Record<Language, Record<string, [string, string]>> = {
	es: {
		start: ["BIENVENIDO", "TODO COMIENZA"],
		about: ["QUIÉN SOY", "SOBRE DAVID"],
		dna: ["ADN DIGITAL", "VALORES Y MOTOR"],
		journey: ["MI CAMINO", "CRUZA EL PUENTE"],
		garden: ["JARDÍN HUMANO", "HABILIDADES"],
		skills: ["LABORATORIO TECH", "HERRAMIENTAS"],
		riwi: ["RIWI", "DONDE CREZCO"],
		interests: ["MÁS ALLÁ DEL", "CÓDIGO"],
		contact: ["CONSTRUYAMOS", "ALGO JUNTOS"],
	},
	en: {
		start: ["WELCOME", "START HERE"],
		about: ["WHO I AM", "ABOUT DAVID"],
		dna: ["DIGITAL DNA", "VALUES & DRIVE"],
		journey: ["MY JOURNEY", "CROSS THE BRIDGE"],
		garden: ["GARDEN OF PEOPLE", "HUMAN SKILLS"],
		skills: ["TECH LAB", "TOOLS & STACK"],
		riwi: ["RIWI", "WHERE I GROW"],
		interests: ["BEYOND THE", "CODE"],
		contact: ["LET'S BUILD", "SOMETHING"],
	},
};

export const i18nUI = {
	es: {
		map: "MAPA",
		menu: "MENÚ",
		travelTo: "VIAJAR A",
		choosePlace: "Elige un destino",
		explore: "EXPLORAR",
		pressToExplore: "Presiona E para explorar",
		howToMove: "CÓMO MOVERSE",
		controlsHint: "W A S D o Flechas para caminar · Shift para correr · E para interactuar · M para mapa · Ciclo continuo (60s)",
		currentlyLearning: "Aprendiendo actualmente",
		role: "Rol",
		status: "Estado",
		whatILearned: "Qué aprendí",
		comingSoon: "Próximamente",
		liveDemo: "Ver Demo",
		github: "GitHub",
		footerBrand: "MUNDO DE DAVID",
		switchLang: "Cambiar a Inglés",
		langBadge: "ES",
		timeCycleTitle: "Ciclo diurno automático continuo (60s)",
		timeNext: "Próxima fase",
		timeShortcut: "Ciclo automático de 60 segundos",
		aboutTraits: ["Curioso", "Creativo", "Sereno", "Empático", "Colaborativo", "Organizado"],
		aboutP1: "La tecnología siempre estuvo cerca. Solo necesitaba tiempo para descubrir por dónde empezar.",
		aboutP2: "A medida que crecía, la curiosidad me llevó hacia la programación y el desarrollo de software. Aprender mediante la práctica, preguntas reflexivas y el trabajo en equipo se convirtieron en mi brújula.",
		dnaLede: "Un producto útil nace de más que solo herramientas técnicas.",
		skillsLede: "Mi kit de herramientas actual, con espacio claro para seguir creciendo.",
		journeyLede: "De la curiosidad infantil a una ruta profesional que aún se sigue escribiendo.",
		riwiLede: "Riwi es el ecosistema donde crezco profesionalmente.",
		riwiP2: "Proyectos prácticos me permiten colaborar con equipos, conectar frontend y backend, y defender ideas con seguridad.",
		peopleLede: "Las habilidades humanas moldean cómo me comunico, colaboro y ayudo a que el equipo alcance su mejor versión.",
		interestsLede: "Fuera del código, estos intereses mantienen mi mente abierta y mi perspectiva variada.",
		contactLede: "¿Tienes una idea, un proyecto o simplemente quieres conectar?",
		startLede: "Cada sendero comienza con una pregunta.",
		startP2: "Recorre los senderos, sigue el río y descubre los proyectos e ideas que habitan este pequeño mundo.",
		easterEggLede: "Curiosidad detectada.",
		easterEggP2: "Ese impulso silencioso de mirar un poco más de cerca es donde comenzó todo este mundo.",
		menuDestinations: [
			{ label: "Sobre mí", pointId: "about" },
			{ label: "Habilidades", pointId: "skills" },
			{ label: "Trayectoria", pointId: "journey" },
			{ label: "Proyectos", pointId: "project-0" },
			{ label: "Riwi", pointId: "riwi" },
			{ label: "Intereses", pointId: "interest-0" },
			{ label: "Contacto", pointId: "contact" },
		],
	},
	en: {
		map: "MAP",
		menu: "MENU",
		travelTo: "TRAVEL TO",
		choosePlace: "Choose a place",
		explore: "EXPLORE",
		pressToExplore: "Press E to explore",
		howToMove: "HOW TO MOVE",
		controlsHint: "W A S D or Arrow keys to walk · Shift to sprint · E to explore stations · M for map · Continuous cycle (60s)",
		currentlyLearning: "Currently learning",
		role: "Role",
		status: "Status",
		whatILearned: "What I learned",
		comingSoon: "Coming soon",
		liveDemo: "Live demo",
		github: "GitHub",
		footerBrand: "DAVID'S WORLD",
		switchLang: "Switch to Spanish",
		langBadge: "EN",
		timeCycleTitle: "Continuous automatic day cycle (60s)",
		timeNext: "Next phase",
		timeShortcut: "Automatic 60-second cycle",
		aboutTraits: ["Curious", "Creative", "Calm", "Empathetic", "Collaborative", "Organized"],
		aboutP1: "Technology was always close. I just needed time to discover where I wanted to begin.",
		aboutP2: "As I grew, curiosity led me toward programming and software development. Once I started building with code, exploration became a direction. Learning through practice and collaboration.",
		dnaLede: "A useful product grows from more than technical tools.",
		skillsLede: "My current toolkit, with clear room left to grow.",
		journeyLede: "From childhood curiosity to a professional path still being written.",
		riwiLede: "Riwi is where I grow professionally.",
		riwiP2: "Practical projects let me learn with a team, connect frontend and backend work, and practice sharing ideas.",
		peopleLede: "People skills shape how I communicate, collaborate, and help a group do its best work.",
		interestsLede: "Outside the code, these interests keep my curiosity open and my perspective varied.",
		contactLede: "Have an idea, a project or just want to connect?",
		startLede: "Every path starts with a question.",
		startP2: "Walk the trails, follow the water, and discover the work and ideas growing across this little world.",
		easterEggLede: "Curiosity detected.",
		easterEggP2: "That quiet urge to look a little closer is where this whole world began.",
		menuDestinations: [
			{ label: "About", pointId: "about" },
			{ label: "Skills", pointId: "skills" },
			{ label: "Journey", pointId: "journey" },
			{ label: "Projects", pointId: "project-0" },
			{ label: "Riwi", pointId: "riwi" },
			{ label: "Interests", pointId: "interest-0" },
			{ label: "Contact", pointId: "contact" },
		],
	},
} as const;

export const i18nTimeNames: Record<Language, Record<string, string>> = {
	es: {
		dawn: "AMANECER",
		day: "MEDIODÍA",
		sunset: "ATARDECER",
		night: "NOCHE",
		midnight: "MEDIANOCHE",
	},
	en: {
		dawn: "DAWN",
		day: "MIDDAY",
		sunset: "SUNSET",
		night: "NIGHT",
		midnight: "MIDNIGHT",
	},
};

