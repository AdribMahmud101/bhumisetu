import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BhumiSetu | LandArchive BD",
  description: "Digital land records and evidence-based verification for Bangladesh.",
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
