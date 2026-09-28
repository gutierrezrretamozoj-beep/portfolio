import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "David's World | José Gutiérrez",
  description: "Curious by nature, developer by passion. Enter and explore the personal world of José David Gutiérrez.",
  openGraph: {
    title: "David's World",
    description: "Curious by nature, developer by passion.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
