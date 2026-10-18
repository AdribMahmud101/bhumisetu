import { Metadata } from "next";
import { P2DeedVerifier } from "@/components/p2-deed-verifier";

export const metadata: Metadata = {
  title: "Deed & Ownership Verification (P2) | BhumiSetu",
  description: "Cross-check physical deed documents or QR codes against official land records.",
};

export default function DeedVerificationPage() {
  return (
    <main className="page-shell" style={{ maxWidth: 1040, margin: "0 auto", padding: "32px 16px" }}>
      <P2DeedVerifier />
    </main>
  );
}
