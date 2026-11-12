import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PortfolioEntry } from "@/components/PortfolioEntry";
import "@/app/globals.css";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<PortfolioEntry />
	</StrictMode>,
);