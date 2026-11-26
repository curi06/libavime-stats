import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planilla en vivo" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
