import type { Metadata } from "next";
import { AdobeComparison } from "../../../optimizely-slides";

export const metadata: Metadata = {
  title: "Adobe Target → Optimizely — Concept Translation Map",
  description:
    "A reference guide translating Adobe Target concepts to Optimizely across core testing, personalization, analytics, technical implementation, and data platform.",
};

export default function AdobeComparisonPage() {
  return <AdobeComparison />;
}
