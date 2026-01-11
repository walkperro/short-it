import type { Metadata } from "next";
import InfoClient from "./InfoClient";

export const metadata: Metadata = {
  title: "Info",
  description: "About Short-It, FAQ, and contact info.",
  alternates: { canonical: "/info" },
};

export default function InfoPage() {
  return <InfoClient />;
}
