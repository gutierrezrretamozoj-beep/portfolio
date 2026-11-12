import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

const VIRTUAL_MODELS_ID = "virtual:models-manifest";
const RESOLVED_VIRTUAL_MODELS_ID = `\0${VIRTUAL_MODELS_ID}`;

function isValidGlbHeader(filePath: string): boolean {
	try {
		const fd = fs.openSync(filePath, "r");
		const header = Buffer.alloc(4);
		const bytesRead = fs.readSync(fd, header, 0, 4, 0);
		fs.closeSync(fd);
		return bytesRead === 4 && header.toString("ascii") === "glTF";
	} catch {
		return false;
	}
}

function scanModelsDirectory(modelsRoot: string): Record<string, string> {
	const manifest: Record<string, string> = {};
	if (!fs.existsSync(modelsRoot)) return manifest;

	const walk = (dir: string) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath);
				continue;
			}
			if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".glb")) continue;
			if (!isValidGlbHeader(fullPath)) continue;

			const rel = path.relative(modelsRoot, fullPath).split(path.sep).join("/");
			const key = rel.slice(0, -4);
			manifest[key] = `/models/${rel}`;
		}
	};

	walk(modelsRoot);
	return manifest;
}

function modelsManifestPlugin(): Plugin {
	const modelsRoot = fileURLToPath(new URL("./public/models", import.meta.url));

	return {
		name: "portfolio-models-manifest",
		resolveId(id) {
			if (id === VIRTUAL_MODELS_ID) return RESOLVED_VIRTUAL_MODELS_ID;
		},
		load(id) {
			if (id !== RESOLVED_VIRTUAL_MODELS_ID) return;
			const manifest = scanModelsDirectory(modelsRoot);
			return `export const AVAILABLE_MODELS = ${JSON.stringify(manifest)};\n`;
		},
		configureServer(server) {
			if (!fs.existsSync(modelsRoot)) return;
			server.watcher.add(modelsRoot);
			const invalidate = (file: string) => {
				if (!file.toLowerCase().endsWith(".glb")) return;
				const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_MODELS_ID);
				if (mod) {
					server.moduleGraph.invalidateModule(mod);
					server.ws.send({ type: "full-reload" });
				}
			};
			server.watcher.on("add", invalidate);
			server.watcher.on("unlink", invalidate);
			server.watcher.on("change", invalidate);
		},
	};
}

export default defineConfig({
	plugins: [
		modelsManifestPlugin(),
		react({
			babel: {
				plugins: [["babel-plugin-react-compiler", {}]],
			},
		}),
	],
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
		},
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (!id.includes("node_modules")) return;
					if (id.includes("/three/")) return "three-vendor";
					if (id.includes("/@react-three/fiber/")) return "r3f-vendor";
					if (id.includes("/@react-three/drei/") || id.includes("/maath/")) return "drei-vendor";
				},
			},
		},
	},
});
