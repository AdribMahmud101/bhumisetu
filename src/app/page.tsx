import { Files, ScanLine, ShieldCheck, Workflow } from "lucide-react";
const capabilities = [
  { icon: Files, title: "Digitize land records", detail: "Organize Khatian, Porcha, deeds, and mutation records." },
  { icon: ScanLine, title: "Review extracted evidence", detail: "Extract document fields and preserve corrections in an audit trail." },
  { icon: ShieldCheck, title: "Verify before buying", detail: "Explain conflicting records through rule-based risk indicators." },
  { icon: Workflow, title: "Support mutation review", detail: "Link deed verification to an officer review workflow." },
];
export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12 md:py-20">
      <header className="flex items-center justify-between border-b border-emerald-900/15 pb-6">
        <span className="text-xl font-bold">ভূমিসেতু · BhumiSetu</span>
        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">LandTech 2026</span>
      </header>
      <section className="max-w-3xl py-20">
        <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-emerald-700">LandArchive BD</p>
        <h1 className="text-4xl font-bold leading-tight md:text-6xl">Clear records.<br />Better land decisions.</h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">A foundation for searchable land records, document verification, and evidence-based review in Bangladesh.</p>
        <p className="mt-6 rounded-lg border border-emerald-900/15 bg-white p-4 text-sm text-slate-600">Development scaffold. Document processing and verification workflows are being built. All demonstration data must be synthetic.</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {capabilities.map(({ icon: Icon, title, detail }) => <article key={title} className="rounded-xl border border-emerald-900/10 bg-white p-6"><Icon aria-hidden="true" className="mb-5 h-6 w-6 text-emerald-700" /><h2 className="font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{detail}</p></article>)}
      </section>
    </main>
  );
}
