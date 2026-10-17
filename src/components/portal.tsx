"use client";
import Link from "next/link";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Download,
  FileCheck2,
  FileSearch,
  Files,
  Fingerprint,
  Globe2,
  History,
  Landmark,
  Layers3,
  LayoutDashboard,
  Loader2,
  LockKeyhole,
  LogOut,
  MapPinned,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Analysis,
  categories,
  Category,
  emptyFields,
  fieldLabels,
  Fields,
  Land,
  LandDocument,
} from "@/lib/domain";
import { prepareDocument } from "@/lib/pdf-client";
type View =
  | "home"
  | "verify"
  | "record"
  | "admin"
  | "land"
  | "mutations"
  | "login";
type Bundle = { land: Land; documents: LandDocument[]; analysis: Analysis };
async function api(path: string, body?: unknown) {
  const response = await fetch("/api/service/" + path, {
    method: body ? "POST" : "GET",
    headers:
      body && !(body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : undefined,
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}
function Badge({
  children,
  tone = "green",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"badge " + tone}>{children}</span>;
}
function Busy() {
  return (
    <div className="loading">
      <Loader2 className="spin" /> তথ্য লোড হচ্ছে · Loading records
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="empty">
      <FileSearch size={36} />
      <h3>{text}</h3>
      <p>নতুন তথ্য যুক্ত হলে এখানে দেখা যাবে।</p>
    </div>
  );
}
export default function Portal({ view, id }: { view: View; id?: string }) {
  const [isOfficer, setOfficer] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [lands, setLands] = useState<Land[]>([]);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState("overview");
  const [review, setReview] = useState<LandDocument | null>(null);
  const [create, setCreate] = useState(false);
  const [cases, setCases] = useState<any[]>([]);
  const [origin, setOrigin] = useState("");
  const router = useRouter();
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const session = await api("session");
      setOfficer(session.officer);
      if (["admin", "land", "mutations"].includes(view) && !session.officer) {
        router.replace("/login");
        return;
      }
      if (view === "record" || view === "land")
        setBundle(await api("land/" + id));
      else if (view === "mutations") setCases(await api("mutations"));
      else if (view !== "login") setLands(await api("lands"));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [view, id, router]);
  useEffect(() => {
    refresh();
    setOrigin(window.location.origin);
  }, [refresh]);
  const run = async (action: () => Promise<void>) => {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("query") || "")
      .trim()
      .toUpperCase();
    if (q) router.push("/verify/" + encodeURIComponent(q));
  };
  return (
    <>
      <div className="utility">
        <div className="container flex-between">
          <span>LandTech 2026 · ডিজিটাল ভূমি সেবার উদ্ভাবন</span>
          <span className="utility-right">
            <Globe2 size={13} /> বাংলাদেশ{" "}
            <span className="utility-divider">|</span> বাংলা / EN
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">
              <Landmark size={28} />
            </span>
            <span>
              <strong>
                ভূমিসেতু<span className="brand-en">BhumiSetu</span>
              </strong>
              <small>স্বচ্ছ নথি, সুরক্ষিত আগামী</small>
            </span>
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <nav className={mobile ? "nav open" : "nav"}>
            <Link className={view === "home" ? "active" : ""} href="/">
              হোম
            </Link>
            <Link
              className={["verify", "record"].includes(view) ? "active" : ""}
              href="/verify"
            >
              নাগরিক সেবা
            </Link>
            <Link
              className={
                ["admin", "land", "mutations"].includes(view) ? "active" : ""
              }
              href="/admin"
            >
              অফিস কর্নার
            </Link>
            <Link href="/#how-it-works">যেভাবে কাজ করে</Link>
          </nav>
          <div className="header-action">
            {isOfficer ? (
              <button
                className="button outline small"
                onClick={() =>
                  run(async () => {
                    await api("logout", {});
                    router.push("/");
                    await refresh();
                  })
                }
              >
                <LogOut size={15} /> লগ আউট
              </button>
            ) : (
              <Link className="button primary small" href="/login">
                <LockKeyhole size={15} /> অফিস লগইন
              </Link>
            )}
          </div>
        </div>
      </header>
      <div className="prototype-strip">
        <span className="dot" /> কার্যকরী হ্যাকাথন প্রোটোটাইপ · সব প্রদর্শনী
        তথ্য কাল্পনিক · সরকারি পোর্টাল নয়
      </div>
      {view !== "home" && (
        <div className="container breadcrumb">
          <Link href="/">হোম</Link>
          <ChevronRight size={13} />
          <Link
            href={
              ["admin", "land", "mutations"].includes(view)
                ? "/admin"
                : "/verify"
            }
          >
            {["admin", "land", "mutations"].includes(view)
              ? "অফিস কর্নার"
              : "নাগরিক সেবা"}
          </Link>
          {id && (
            <>
              <ChevronRight size={13} />
              <span>{id}</span>
            </>
          )}
        </div>
      )}
      <main className={view === "home" ? "" : "container workspace"}>
        {error && (
          <div role="alert" className="alert error">
            <ShieldAlert size={20} />
            <span>
              {error === "NOT_FOUND"
                ? "রেকর্ড পাওয়া যায়নি / Record not found or not published"
                : error}
            </span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="alert success">
            <CheckCircle2 size={20} />
            {notice}
          </div>
        )}
        {view === "home" && (
          <>
            <section className="hero">
              <div className="container hero-grid">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="dot" /> নথি থেকে নির্ভরযোগ্য সিদ্ধান্ত
                  </span>
                  <h1>
                    জমির নথি হোক স্বচ্ছ।
                    <br />
                    <span>সিদ্ধান্ত হোক নিশ্চিন্ত।</span>
                  </h1>
                  <p>
                    খতিয়ান, পর্চা, দলিল ও নামজারি—এক ঠিকানায়। জমি কেনার আগে
                    দেখুন নথির ইতিহাস, অমিল এবং সম্ভাব্য দ্বৈত বিক্রয়ের প্রমাণ।
                  </p>
                  <form className="hero-search" onSubmit={search}>
                    <Search size={22} />
                    <input
                      name="query"
                      aria-label="Land ID"
                      placeholder="জমির ইউনিক আইডি লিখুন"
                      required
                    />
                    <button className="button primary" type="submit">
                      যাচাই করুন <ArrowRight size={18} />
                    </button>
                  </form>
                  <div className="hero-sample">
                    কাল্পনিক রেকর্ড দেখুন{" "}
                    <Link href="/verify/LND-MOCK-001">
                      LND-MOCK-001 <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <div className="hero-trust">
                    <span>
                      <ShieldCheck size={16} /> প্রমাণভিত্তিক বিশ্লেষণ
                    </span>
                    <span>
                      <Fingerprint size={16} /> নথির ডিজিটাল অখণ্ডতা
                    </span>
                  </div>
                </div>
                <div className="hero-visual">
                  <div className="visual-caption">
                    <span className="live-dot" /> একটি জমি। সব নথি। স্পষ্ট
                    চিত্র।
                  </div>
                  <div className="parcel-map">
                    <div className="map-grid" />
                    <svg
                      viewBox="0 0 460 260"
                      aria-label="Illustrative parcel diagram"
                    >
                      <path
                        d="M45 170L160 104 337 126 225 204Z"
                        fill="#d6e6b6"
                        stroke="#fff"
                        strokeWidth="4"
                      />
                      <path
                        d="M160 104L225 40 400 75 337 126Z"
                        fill="#e4edce"
                        stroke="#fff"
                        strokeWidth="4"
                      />
                      <path
                        d="M45 170L95 220 225 247 225 204Z"
                        fill="#abc98e"
                        stroke="#fff"
                        strokeWidth="4"
                      />
                      <path
                        d="M225 204L337 126 400 166 283 251Z"
                        fill="#81ac75"
                        stroke="#fff"
                        strokeWidth="4"
                      />
                      <path
                        d="M160 104L225 204 337 126"
                        fill="#c7dca7"
                        stroke="#53784f"
                        strokeWidth="2"
                        strokeDasharray="5 4"
                      />
                      <circle cx="224" cy="137" r="22" fill="#075d46" />
                      <path
                        d="M217 137l5 5 10-11"
                        stroke="white"
                        strokeWidth="3"
                        fill="none"
                      />
                      <text
                        x="225"
                        y="182"
                        textAnchor="middle"
                        fill="#254d34"
                        fontSize="13"
                      >
                        দাগ নং ২০৭
                      </text>
                    </svg>
                    <span className="map-label">
                      <MapPinned size={13} /> কাল্পনিক জমির চিত্র · মানচিত্র নয়
                    </span>
                  </div>
                  <div className="floating-document">
                    <span className="file-icon">
                      <Files size={22} />
                    </span>
                    <div>
                      <strong>সমন্বিত ভূমি রেকর্ড</strong>
                      <small>খতিয়ান · পর্চা · দলিল · নামজারি</small>
                    </div>
                    <ShieldCheck size={23} className="text-green" />
                  </div>
                  <div className="visual-bottom">
                    <span>নথির ইতিহাস</span>
                    <span className="timeline-dots">
                      <i />
                      <b />
                      <i />
                      <b />
                      <i />
                    </span>
                    <span>
                      প্রমাণসহ রিপোর্ট <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="container services">
              <div className="section-heading">
                <div>
                  <span className="kicker">নাগরিক সেবা</span>
                  <h2>ভূমি যাচাই এখন আরও সহজ</h2>
                </div>
                <p>একটি জমির সম্পূর্ণ চিত্র, এক প্ল্যাটফর্মে।</p>
              </div>
              <div className="service-grid">
                {[
                  {
                    icon: FileSearch,
                    title: "জমির রেকর্ড অনুসন্ধান",
                    en: "Find land records",
                    description: "ইউনিক আইডি দিয়ে একসাথে সব নথি খুঁজুন।",
                    href: "/verify",
                    color: "green",
                  },
                  {
                    icon: Fingerprint,
                    title: "দলিলের তথ্য যাচাই",
                    en: "Verify a document",
                    description:
                      "সংরক্ষিত নথির সঙ্গে কপি ও তথ্য মিলিয়ে দেখুন।",
                    href: "/verify?tab=compare",
                    color: "purple",
                  },
                  {
                    icon: ShieldAlert,
                    title: "দ্বৈত বিক্রয় শনাক্তকরণ",
                    en: "Detect conflicting sales",
                    description: "সম্ভাব্য সংঘাত দেখুন কারণ ও প্রমাণসহ।",
                    href: "/verify/LND-MOCK-001",
                    color: "orange",
                  },
                  {
                    icon: ClipboardCheck,
                    title: "স্মার্ট নামজারি পর্যালোচনা",
                    en: "Mutation review",
                    description: "নথির অসংগতি যাচাই করে সিদ্ধান্ত নিন।",
                    href: "/admin/mutations",
                    color: "blue",
                  },
                ].map((s) => (
                  <Link className="service-card" key={s.en} href={s.href}>
                    <span className={"service-icon " + s.color}>
                      <s.icon size={26} />
                    </span>
                    <h3>{s.title}</h3>
                    <small>{s.en}</small>
                    <p>{s.description}</p>
                    <span className="service-link">
                      সেবা গ্রহণ করুন <ArrowRight size={17} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <span className="kicker">সহজ তিনটি ধাপ</span>
                    <h2>আপনার সিদ্ধান্তের পাশে প্রমাণ</h2>
                  </div>
                  <Badge>AI reads · Rules explain · Officers decide</Badge>
                </div>
                <div className="steps">
                  {[
                    [
                      "01",
                      "জমি খুঁজুন",
                      "ইউনিক আইডি দিয়ে প্রকাশিত রেকর্ড খুলুন।",
                    ],
                    [
                      "02",
                      "প্রমাণ দেখুন",
                      "দলিল, জমির পরিমাণ ও ইতিহাস মিলিয়ে দেখুন।",
                    ],
                    [
                      "03",
                      "জেনে সিদ্ধান্ত নিন",
                      "অমিল ও অসম্পূর্ণ যাচাই বুঝে পরবর্তী পদক্ষেপ নিন।",
                    ],
                  ].map(([n, t, d]) => (
                    <div key={n}>
                      <span className="step-number">{n}</span>
                      <h3>{t}</h3>
                      <p>{d}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <section className="container sample-section">
              <div>
                <ShieldCheck size={36} />
                <h2>বিশ্বাসের ভিত্তি—স্বচ্ছতা</h2>
                <p>
                  AI তথ্য সংগ্রহে সহায়তা করে। বিশ্লেষণের প্রতিটি সংকেতের পাশে
                  থাকে উৎস নথি। আইনগত সিদ্ধান্তের জন্য সংশ্লিষ্ট কর্তৃপক্ষের
                  যাচাই প্রয়োজন।
                </p>
              </div>
              <Link className="button outline" href="/verify/LND-MOCK-001">
                নমুনা বিশ্লেষণ দেখুন <ArrowRight size={17} />
              </Link>
            </section>
          </>
        )}
        {view === "verify" && (
          <>
            <PageHeading
              kicker="CITIZEN SERVICES"
              title="জমি কেনার আগে যাচাই করুন"
              description="প্রকাশিত রেকর্ড, নথির ইতিহাস ও সম্ভাব্য সংঘাত একসঙ্গে দেখুন।"
            />
            <div className="search-panel">
              <form className="record-search" onSubmit={search}>
                <Search size={22} />
                <input
                  data-testid="land-search-input"
                  name="query"
                  aria-label="Land ID"
                  placeholder="উদাহরণ: LND-MOCK-001"
                  required
                />
                <button
                  data-testid="land-search-btn"
                  className="button primary"
                >
                  রেকর্ড খুঁজুন <ArrowRight size={17} />
                </button>
              </form>
              <p>
                <LockKeyhole size={14} /> এখানে শুধুমাত্র পর্যালোচিত ও প্রকাশিত
                নথি দেখানো হয়।
              </p>
            </div>
            <div className="section-heading">
              <h2>প্রকাশিত নমুনা রেকর্ড</h2>
              <Badge>স্পষ্টভাবে চিহ্নিত কাল্পনিক তথ্য</Badge>
            </div>
            {loading ? <Busy /> : <LandList lands={lands} admin={false} />}
          </>
        )}
        {view === "login" && (
          <div className="login-wrap">
            <section className="login-aside">
              <Landmark size={46} />
              <h1>অফিস কর্নার</h1>
              <p>নথির পর্যালোচনা থেকে সিদ্ধান্ত—প্রতিটি ধাপে জবাবদিহিতা।</p>
              <div>
                <ShieldCheck /> অনুমোদিত কর্মকর্তার প্রবেশাধিকার
              </div>
              <div>
                <History /> প্রতিটি সংশোধনের অডিট ইতিহাস
              </div>
              <div>
                <LockKeyhole /> সুরক্ষিত মূল নথি
              </div>
            </section>
            <form
              className="login-form"
              onSubmit={(e) => {
                e.preventDefault();
                const b = new FormData(e.currentTarget);
                run(async () => {
                  await api("login", {
                    email: b.get("email"),
                    password: b.get("password"),
                  });
                  router.push("/admin");
                });
              }}
            >
              <span className="kicker">OFFICER ACCESS</span>
              <h2>আপনার অ্যাকাউন্টে প্রবেশ করুন</h2>
              <p>শুধুমাত্র অনুমোদিত প্রোটোটাইপ কর্মকর্তার জন্য।</p>
              <label>
                ইমেইল
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                পাসওয়ার্ড
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </label>
              <button disabled={busy} className="button primary">
                {busy ? (
                  <Loader2 className="spin" size={17} />
                ) : (
                  <LockKeyhole size={17} />
                )}{" "}
                নিরাপদ লগইন
              </button>
              <small>
                অফিসার লগইন একটি বাস্তব Supabase Auth সেশন ব্যবহার করে।
              </small>
            </form>
          </div>
        )}
        {view === "admin" && (
          <>
            <PageHeading
              kicker="OFFICER WORKSPACE"
              title="ভূমি রেকর্ড ব্যবস্থাপনা"
              description="একটি জমি, চার ধরনের নথি—সংরক্ষণ, পর্যালোচনা ও প্রকাশ করুন।"
              action={
                <button
                  className="button primary"
                  onClick={() => setCreate(true)}
                >
                  <Plus size={17} /> নতুন জমির রেকর্ড
                </button>
              }
            />
            <div className="stats-grid">
              <Stat
                label="মাস্টার ল্যান্ড রেকর্ড"
                value={lands.length}
                icon={<Layers3 />}
              />
              <Stat
                label="প্রকাশিত রেকর্ড"
                value={lands.filter((l) => l.is_finalized).length}
                icon={<FileCheck2 />}
              />
              <Stat
                label="খসড়া রেকর্ড"
                value={lands.filter((l) => !l.is_finalized).length}
                icon={<Clock3 />}
              />
              <Link href="/admin/mutations" className="stat-link">
                <ClipboardCheck />
                <span>
                  নামজারি পর্যালোচনা
                  <small>
                    Mutation workspace <ArrowRight size={14} />
                  </small>
                </span>
              </Link>
            </div>
            {loading ? <Busy /> : <LandList lands={lands} admin />}
          </>
        )}
        {(view === "record" || view === "land") &&
          (loading ? (
            <Busy />
          ) : (
            bundle && (
              <>
                <PageHeading
                  kicker={
                    view === "land"
                      ? "MASTER LAND WORKSPACE"
                      : "LAND RECORD & EVIDENCE"
                  }
                  title={
                    view === "land"
                      ? "জমির নথি ও পর্যালোচনা"
                      : "জমির সমন্বিত রেকর্ড"
                  }
                  description={`${bundle.land.mouza} · ${bundle.land.upazila}, ${bundle.land.district}`}
                  action={
                    <>
                      {view === "land" ? (
                        <button
                          className="button primary"
                          disabled={busy}
                          onClick={() =>
                            run(async () => {
                              await api("publish/" + id, {});
                              setNotice(
                                "রেকর্ড প্রকাশিত হয়েছে / Record published",
                              );
                              await refresh();
                            })
                          }
                        >
                          <CheckCircle2 size={17} /> পর্যালোচিত রেকর্ড প্রকাশ
                        </button>
                      ) : (
                        <button
                          className="button outline"
                          onClick={() => window.print()}
                        >
                          <Download size={17} /> রিপোর্ট / PDF
                        </button>
                      )}
                    </>
                  }
                />
                <div className="record-identity">
                  <div className="identity-icon">
                    <MapPinned size={29} />
                  </div>
                  <div>
                    <span className="muted tiny">
                      ইউনিক ল্যান্ড আইডি · অভ্যন্তরীণ পরিচিতি
                    </span>
                    <h2 data-testid="master-land-id">
                      {bundle.land.unique_land_id}
                    </h2>
                  </div>
                  <div className="identity-status">
                    <Badge tone={bundle.land.is_finalized ? "green" : "amber"}>
                      {bundle.land.is_finalized
                        ? "প্রকাশিত রেকর্ড"
                        : "খসড়া রেকর্ড"}
                    </Badge>
                    <span className="tiny muted">
                      কাল্পনিক নমুনা / Synthetic data only
                    </span>
                  </div>
                </div>
                <div className="record-meta">
                  <div>
                    <span>খতিয়ান নম্বর</span>
                    <strong>{bundle.land.current_khatian_no || "—"}</strong>
                  </div>
                  <div>
                    <span>দাগ নম্বর</span>
                    <strong>{bundle.land.dag_number}</strong>
                  </div>
                  <div>
                    <span>রেকর্ডে জমির পরিমাণ</span>
                    <strong data-testid="recorded-area">
                      {bundle.land.total_area_decimals} <small>শতাংশ</small>
                    </strong>
                  </div>
                  <div>
                    <span>মৌজা / JL</span>
                    <strong>
                      {bundle.land.mouza} / {bundle.land.jl_number}
                    </strong>
                  </div>
                </div>
                <div className="tabs" role="tablist">
                  {[
                    ["overview", "বিশ্লেষণ ও প্রমাণ", ShieldCheck],
                    ["documents", "নথিসমূহ", Files],
                    ["history", "জমির ইতিহাস", History],
                    ...(view === "record"
                      ? [["compare", "দলিল যাচাই", Fingerprint]]
                      : []),
                  ].map(([key, title, Icon]) => (
                    <button
                      key={String(key)}
                      role="tab"
                      aria-selected={tab === key}
                      className={tab === key ? "selected" : ""}
                      onClick={() => setTab(String(key))}
                    >
                      {typeof Icon !== "string" && <Icon size={17} />}{" "}
                      {String(title)}
                    </button>
                  ))}
                </div>
                {tab === "overview" && (
                  <>
                    <div className="analysis-grid">
                      <section className="panel risk-panel">
                        <div className="panel-top">
                          <span className="kicker">
                            RULE-BASED RISK INDICATOR
                          </span>
                          <ShieldAlert size={20} />
                        </div>
                        <div
                          className={
                            "risk-circle " +
                            (bundle.analysis.score ? "risk-high" : "risk-low")
                          }
                          style={
                            {
                              "--score": `${bundle.analysis.score}%`,
                            } as React.CSSProperties
                          }
                        >
                          <div>
                            <strong data-testid="risk-indicator-score">
                              {bundle.analysis.score}
                            </strong>
                            <span>/ 100</span>
                          </div>
                        </div>
                        <h3>{bundle.analysis.status}</h3>
                        <p>Estimated Risk Score (Rule-Based Indicator)</p>
                        <small>
                          এটি জালিয়াতির সম্ভাবনা বা আইনগত রায় নয়।
                        </small>
                        <div className="risk-foot">
                          <span>{bundle.analysis.coverage} পর্যালোচিত নথি</span>
                          <span>{bundle.analysis.signals.length} সংকেত</span>
                        </div>
                      </section>
                      <section className="panel quota-panel">
                        <div className="panel-top">
                          <div>
                            <span className="kicker">AREA & SHARE CHECK</span>
                            <h3>জমির পরিমাণের হিসাব</h3>
                          </div>
                          <Layers3 size={22} />
                        </div>
                        <div className="quota-numbers">
                          <div>
                            <strong>{bundle.analysis.recorded}</strong>
                            <span>শতাংশ রেকর্ডে</span>
                          </div>
                          <span className="versus">বনাম</span>
                          <div
                            className={
                              bundle.analysis.sold > bundle.analysis.recorded
                                ? "text-red"
                                : ""
                            }
                          >
                            <strong>{bundle.analysis.sold}</strong>
                            <span>শতাংশ বিক্রয় দলিলে</span>
                          </div>
                        </div>
                        <div className="quota-track">
                          <span
                            style={{
                              width: `${Math.min(100, (bundle.analysis.sold / bundle.analysis.recorded) * 100)}%`,
                            }}
                          />
                          {bundle.analysis.excess > 0 && (
                            <i
                              style={{
                                width: `${Math.min(40, (bundle.analysis.excess / bundle.analysis.recorded) * 100)}%`,
                              }}
                            />
                          )}
                        </div>
                        <div className="quota-legend">
                          <span>
                            <i /> রেকর্ডকৃত সীমা: {bundle.analysis.recorded}
                          </span>
                          <span className="text-red">
                            {bundle.analysis.excess > 0
                              ? `+${bundle.analysis.excess} শতাংশ অতিরিক্ত`
                              : "উপলব্ধ নথির ভিত্তিতে হিসাব"}
                          </span>
                        </div>
                        <div
                          className={
                            "quota-message " +
                            (bundle.analysis.score ? "warning" : "clear")
                          }
                        >
                          <ShieldAlert size={20} />
                          <span>
                            {bundle.analysis.score
                              ? "বিক্রয় ও রেকর্ডের অসংগতি আছে। সিদ্ধান্তের আগে উৎস নথি ও সংশ্লিষ্ট কর্তৃপক্ষের যাচাই প্রয়োজন।"
                              : "উপলব্ধ নথিতে সংঘাত পাওয়া যায়নি। এটি সম্পূর্ণ যাচাই বা ক্রয়ের ছাড়পত্র নয়।"}
                          </span>
                        </div>
                        <div className="mini-process">
                          <span>
                            রেকর্ড সংগ্রহ <Check size={13} />
                          </span>
                          <ChevronRight size={14} />
                          <span>
                            নিয়মভিত্তিক বিশ্লেষণ <Check size={13} />
                          </span>
                          <ChevronRight size={14} />
                          <span>মানবিক পর্যালোচনা</span>
                        </div>
                      </section>
                    </div>
                    <section
                      className="panel evidence"
                      data-testid="evidence-panel"
                    >
                      <div className="section-heading">
                        <div>
                          <span className="kicker">
                            EVERY ALERT HAS A SOURCE
                          </span>
                          <h2>সংঘাতের কারণ ও প্রমাণ</h2>
                        </div>
                        <Badge tone={bundle.analysis.score ? "red" : "green"}>
                          {bundle.analysis.signals.length} signals
                        </Badge>
                      </div>
                      {bundle.analysis.signals.length ? (
                        bundle.analysis.signals.map((s) => (
                          <div className="signal" key={s.id}>
                            <div className="signal-heading">
                              <span className="signal-mark">
                                <ShieldAlert size={18} />
                              </span>
                              <h3>{s.title}</h3>
                              <Badge tone="red">+{s.points}</Badge>
                            </div>
                            <p>{s.detail}</p>
                            <div className="evidence-links">
                              {s.evidence.map((docId) => {
                                const d = bundle.documents.find(
                                  (doc) => doc.id === docId,
                                );
                                return (
                                  d && (
                                    <a
                                      key={d.id}
                                      href={"/api/service/document/" + d.id}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      <Files size={13} />
                                      {d.official_number} ·{" "}
                                      {d.buyer_or_current_owner}{" "}
                                      <ArrowUpRight size={12} />
                                    </a>
                                  )
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="alert success">
                          <CheckCircle2 /> No conflict found in available
                          records. Review the coverage below before making a
                          decision.
                        </div>
                      )}
                      <div className="comparison-table">
                        <table>
                          <thead>
                            <tr>
                              <th>বিক্রয় দলিল</th>
                              <th>বিক্রেতা</th>
                              <th>ক্রেতা</th>
                              <th>জমি (শতাংশ)</th>
                              <th>উৎস</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bundle.documents
                              .filter((d) => d.category === "DEED")
                              .map((d) => (
                                <tr key={d.id}>
                                  <td>
                                    <strong>{d.official_number || "—"}</strong>
                                    <small>{d.document_date}</small>
                                  </td>
                                  <td>{d.seller_or_prior_owner || "—"}</td>
                                  <td>{d.buyer_or_current_owner || "—"}</td>
                                  <td>{d.area_decimals ?? "—"}</td>
                                  <td>
                                    <a
                                      className="text-link"
                                      target="_blank"
                                      rel="noreferrer"
                                      href={"/api/service/document/" + d.id}
                                    >
                                      নথি দেখুন <ArrowUpRight size={13} />
                                    </a>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <div className="coverage-grid">
                      <section
                        className="panel"
                        data-testid="external-checks-panel"
                      >
                        <span className="kicker">VERIFICATION COVERAGE</span>
                        <h3>যা এখনও যাচাই করা হয়নি</h3>
                        {bundle.analysis.missing.map((s) => (
                          <div className="coverage-row" key={s}>
                            <CircleHelp size={17} />
                            <span>{s}</span>
                            <Badge tone="gray">তথ্য অনুপস্থিত</Badge>
                          </div>
                        ))}
                      </section>
                      <section className="panel qr-panel">
                        <QRCodeSVG
                          value={origin + "/verify/" + id}
                          size={108}
                        />
                        <div>
                          <h3>এক স্ক্যানে প্রকাশিত রেকর্ড</h3>
                          <p>
                            এই QR অনুমোদিত তথ্যের পেজ খুলবে; ব্যক্তিগত নথির
                            অনুমতি এড়িয়ে যাবে না।
                          </p>
                          <small>{bundle.analysis.version}</small>
                        </div>
                      </section>
                    </div>
                  </>
                )}
                {tab === "documents" && (
                  <>
                    <div className="category-grid">
                      {Object.entries(categories).map(([key, c]) => (
                        <div
                          className="category-card"
                          data-testid={"category-" + key.toLowerCase()}
                          key={key}
                        >
                          <span className="service-icon green">
                            <Files size={22} />
                          </span>
                          <div>
                            <h3>{c.bn}</h3>
                            <span>
                              {c.en} ·{" "}
                              {
                                bundle.documents.filter(
                                  (d) => d.category === key,
                                ).length
                              }{" "}
                              নথি
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {view === "land" && (
                      <UploadPanel
                        id={id!}
                        busy={busy}
                        onUpload={(files, category, subtype) =>
                          run(async () => {
                            for (const file of files) {
                              const content = await prepareDocument(file);
                              const form = new FormData();
                              form.append("file", file);
                              form.append("category", category);
                              form.append("subtype", subtype);
                              const doc = await api("upload/" + id, form);
                              await refresh();
                              try {
                                await api("extract/" + doc.id, content);
                              } catch (e) {
                                await refresh();
                                throw e;
                              }
                            }
                            setNotice(
                              "নথির তথ্য সংগ্রহ হয়েছে। মূল নথির সঙ্গে মিলিয়ে পর্যালোচনা করুন।",
                            );
                            await refresh();
                          })
                        }
                      />
                    )}
                    <section className="panel document-list">
                      <h3>সংরক্ষিত নথিসমূহ</h3>
                      {bundle.documents.length ? (
                        bundle.documents.map((d) => (
                          <div className="document-row" key={d.id}>
                            <span className="file-icon">
                              <Files />
                            </span>
                            <div className="document-detail">
                              <strong>
                                {d.official_number || d.file_name}
                              </strong>
                              <span>
                                {categories[d.category].bn} · {d.sub_type} ·{" "}
                                {d.document_date || "তারিখ পর্যালোচনা বাকি"}
                              </span>
                              {d.extraction_status === "FAILED" && (
                                <small className="text-red">
                                  Extraction failed: {d.extraction_error}
                                </small>
                              )}
                            </div>
                            <Badge
                              tone={
                                d.verification_status === "VERIFIED"
                                  ? "green"
                                  : "amber"
                              }
                            >
                              {d.verification_status === "VERIFIED"
                                ? "পর্যালোচিত"
                                : "যাচাই বাকি"}
                            </Badge>
                            {view === "land" ? (
                              <div className="review-actions">
                                {d.extraction_status === "FAILED" && (
                                  <button
                                    disabled={busy}
                                    className="button outline small"
                                    onClick={() =>
                                      run(async () => {
                                        const response = await fetch(
                                          "/api/service/document/" + d.id,
                                        );
                                        if (!response.ok)
                                          throw new Error(
                                            "Source download failed",
                                          );
                                        const file = new File(
                                          [await response.blob()],
                                          d.file_name,
                                          { type: d.mime_type },
                                        );
                                        await api(
                                          "extract/" + d.id,
                                          await prepareDocument(file),
                                        );
                                        await refresh();
                                      })
                                    }
                                  >
                                    পুনরায় তথ্য সংগ্রহ
                                  </button>
                                )}
                                <button
                                  className="button outline small"
                                  data-testid={"review-doc-" + d.doc_code}
                                  onClick={() => setReview(d)}
                                >
                                  পর্যালোচনা <ArrowRight size={14} />
                                </button>
                              </div>
                            ) : (
                              <a
                                className="button outline small"
                                href={"/api/service/document/" + d.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                উৎস নথি <ArrowUpRight size={14} />
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <Empty text="এখনও কোনো নথি যুক্ত হয়নি" />
                      )}
                    </section>
                  </>
                )}
                {tab === "history" && (
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <span className="kicker">DOCUMENT-LINKED TIMELINE</span>
                        <h2>জমির রেকর্ডের ইতিহাস</h2>
                        <p>
                          খতিয়ান, দলিল ও নামজারি পৃথক ধরনের রেকর্ড; এগুলো আইনগত
                          মালিকানার রায় নয়।
                        </p>
                      </div>
                    </div>
                    <div className="timeline">
                      {bundle.documents
                        .filter((d) => d.verification_status === "VERIFIED")
                        .map((d) => (
                          <article
                            className="timeline-event"
                            data-testid="timeline-event-card"
                            key={d.id}
                          >
                            <span className="timeline-point" />
                            <div className="timeline-date">
                              {d.document_date || "তারিখ অনুপস্থিত"}
                            </div>
                            <div className="timeline-card">
                              <Badge
                                tone={
                                  d.category === "DEED" && bundle.analysis.score
                                    ? "amber"
                                    : "green"
                                }
                              >
                                {categories[d.category].bn} · {d.sub_type}
                              </Badge>
                              <h3>{d.official_number}</h3>
                              <p>
                                {d.seller_or_prior_owner && (
                                  <>
                                    {d.seller_or_prior_owner}{" "}
                                    <ArrowRight size={13} />{" "}
                                  </>
                                )}
                                {d.buyer_or_current_owner || "তথ্য অনুপস্থিত"}
                              </p>
                              <div className="flex-between">
                                <span className="muted">
                                  {d.area_decimals ?? "—"} শতাংশ · দাগ{" "}
                                  {d.dag_number}
                                </span>
                                <a
                                  href={"/api/service/document/" + d.id}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-link"
                                >
                                  উৎস নথি দেখুন <ArrowUpRight size={13} />
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                    <div className="alert info">
                      <CircleHelp size={18} /> সর্বশেষ রেকর্ডীয় ব্যক্তি:{" "}
                      {[...bundle.documents]
                        .filter(
                          (d) =>
                            d.verification_status === "VERIFIED" &&
                            d.document_date &&
                            d.buyer_or_current_owner,
                        )
                        .sort((a, b) =>
                          b.document_date!.localeCompare(a.document_date!),
                        )[0]?.buyer_or_current_owner || "তথ্য অনুপস্থিত"}
                      । এটি নিশ্চিত আইনগত মালিকানার ঘোষণা নয়।
                    </div>
                  </section>
                )}
                {tab === "compare" && <ComparePanel id={id!} />}
                <div className="report-disclaimer">
                  <ShieldCheck size={18} />
                  <p>
                    শুধুমাত্র উপলব্ধ কাল্পনিক নথির ভিত্তিতে তৈরি যাচাই সহায়িকা।
                    এটি সরকারি সনদ, আইনগত মালিকানার ঘোষণা বা ক্রয়ের অনুমোদন
                    নয়।{" "}
                    <span>
                      {bundle.analysis.version} ·{" "}
                      {new Date().toLocaleDateString("en-GB")}
                    </span>
                  </p>
                </div>
              </>
            )
          ))}
        {view === "mutations" && (
          <>
            <PageHeading
              kicker="SMART MUTATION REVIEW"
              title="নামজারি পর্যালোচনা"
              description="দলিল যাচাই থেকে তৈরি কেস—সংঘাত থাকলে শুনানির জন্য পাঠান।"
            />
            {loading ? (
              <Busy />
            ) : cases.length ? (
              cases.map((c) => (
                <MutationCard
                  key={c.id}
                  item={c}
                  busy={busy}
                  onDecision={(status, reason) =>
                    run(async () => {
                      await api("decision/" + c.id, { status, reason });
                      setNotice("কেসের সিদ্ধান্ত সংরক্ষিত হয়েছে");
                      await refresh();
                    })
                  }
                />
              ))
            ) : (
              <Empty text="এখনও কোনো নামজারি কেস নেই" />
            )}
          </>
        )}
      </main>
      <footer className="footer">
        <div className="container footer-main">
          <div>
            <Link href="/" className="footer-brand">
              <Landmark size={24} /> ভূমিসেতু
            </Link>
            <p>নথি থেকে প্রমাণ। প্রমাণ থেকে সচেতন সিদ্ধান্ত।</p>
          </div>
          <div>
            <strong>উপযোগী লিংক</strong>
            <Link href="/verify">নাগরিক যাচাই</Link>
            <Link href="/admin">অফিস কর্নার</Link>
          </div>
          <div>
            <strong>প্রকল্পের তথ্য</strong>
            <a
              href="https://github.com/AdribMahmud101/bhumisetu"
              target="_blank"
              rel="noreferrer"
            >
              সোর্স কোড <ArrowUpRight size={13} />
            </a>
            <span>LandTech 2026 · P3</span>
          </div>
          <div className="footer-note">
            <ShieldCheck size={23} />
            <span>
              শুধুমাত্র কাল্পনিক তথ্য
              <br />
              সরকারি সিস্টেমের সঙ্গে সংযুক্ত নয়
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 BhumiSetu · LandArchive BD</span>
          <span>হ্যাকাথন প্রোটোটাইপ · AI সহায়তায় নির্মিত</span>
        </div>
      </footer>
      {create && (
        <div className="modal-backdrop">
          <section className="modal">
            <div className="flex-between">
              <h2>নতুন জমির রেকর্ড</h2>
              <button
                className="icon-button"
                aria-label="Close"
                onClick={() => setCreate(false)}
              >
                <X />
              </button>
            </div>
            <p className="muted">
              এটি নথির সংগ্রহ তৈরি করে; সরকারি দলিল তৈরি করে না।
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const b = Object.fromEntries(new FormData(e.currentTarget));
                run(async () => {
                  const land = await api("create", b);
                  setCreate(false);
                  router.push("/admin/land/" + land.unique_land_id);
                });
              }}
            >
              <div className="form-grid">
                {[
                  ["district", "জেলা"],
                  ["upazila", "উপজেলা"],
                  ["mouza", "মৌজা"],
                  ["jl_number", "JL নম্বর"],
                  ["dag_number", "দাগ নম্বর"],
                  ["current_khatian_no", "খতিয়ান নম্বর"],
                  ["total_area_decimals", "জমির পরিমাণ (শতাংশ)"],
                ].map(([key, title]) => (
                  <label key={key}>
                    {title}
                    <input
                      name={key}
                      required
                      type={key === "total_area_decimals" ? "number" : "text"}
                      step="0.01"
                      min={key === "total_area_decimals" ? "0.01" : undefined}
                    />
                  </label>
                ))}
              </div>
              <button className="button primary" disabled={busy}>
                খসড়া তৈরি করুন <ArrowRight size={16} />
              </button>
            </form>
          </section>
        </div>
      )}
      {review && (
        <ReviewDialog
          document={review}
          onClose={() => setReview(null)}
          onSave={async (fields, reason, status) => {
            await api("review/" + review.id, { fields, reason, status });
            await refresh();
            setNotice("পর্যালোচনা ও অডিট ইতিহাস সংরক্ষিত হয়েছে");
          }}
        />
      )}
    </>
  );
}
function PageHeading({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="kicker">{kicker}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="page-actions">{action}</div>
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: ReactNode;
}) {
  return (
    <div className="stat">
      <span className="stat-icon">{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </div>
  );
}
function LandList({ lands, admin }: { lands: Land[]; admin: boolean }) {
  return lands.length ? (
    <div className="land-grid">
      {lands.map((l) => (
        <Link
          className="land-card"
          key={l.id}
          href={(admin ? "/admin/land/" : "/verify/") + l.unique_land_id}
        >
          <div className="flex-between">
            <span className="service-icon green">
              <MapPinned size={23} />
            </span>
            <Badge tone={l.is_finalized ? "green" : "amber"}>
              {l.is_finalized ? "প্রকাশিত" : "খসড়া"}
            </Badge>
          </div>
          <h3>{l.unique_land_id}</h3>
          <p>
            {l.mouza} · {l.upazila}
          </p>
          <div className="land-card-meta">
            <span>
              দাগ <strong>{l.dag_number}</strong>
            </span>
            <span>
              <strong>{l.total_area_decimals}</strong> শতাংশ
            </span>
          </div>
          <div className="land-card-link">
            {admin ? "নথি পর্যালোচনা করুন" : "রেকর্ড ও বিশ্লেষণ দেখুন"}{" "}
            <ArrowRight size={16} />
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <Empty text="কোনো প্রকাশিত রেকর্ড পাওয়া যায়নি" />
  );
}
function UploadPanel({
  id,
  busy,
  onUpload,
}: {
  id: string;
  busy: boolean;
  onUpload: (files: File[], category: Category, subtype: string) => void;
}) {
  const [category, setCategory] = useState<Category>("KHATIAN");
  const [subtype, setSubtype] = useState("CS");
  return (
    <section className="panel upload-panel">
      <div>
        <h3>নতুন নথি যুক্ত করুন</h3>
        <p>
          PDF / PNG / JPEG · সর্বোচ্চ 5 MB, 3 পৃষ্ঠা · একাধিক নথি যুক্ত করা যায়
        </p>
      </div>
      <div className="upload-controls">
        <label>
          বিভাগ
          <select
            value={category}
            onChange={(e) => {
              const k = e.target.value as Category;
              setCategory(k);
              setSubtype(categories[k].types[0]);
            }}
          >
            {Object.entries(categories).map(([k, c]) => (
              <option key={k} value={k}>
                {c.bn} · {c.en}
              </option>
            ))}
          </select>
        </label>
        <label>
          নথির ধরন
          <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
            {categories[category].types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label
          className={"button primary file-button " + (busy ? "disabled" : "")}
        >
          {busy ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}{" "}
          {busy ? "সংগ্রহ ও বিশ্লেষণ চলছে…" : "নথি আপলোড ও তথ্য সংগ্রহ"}
          <input
            aria-label="Upload documents"
            type="file"
            multiple
            accept="application/pdf,image/png,image/jpeg"
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length)
                onUpload(Array.from(e.target.files), category, subtype);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <small>
        প্রত্যেক নথির উৎস সংরক্ষিত হয়। AI-এর সংগৃহীত তথ্য কর্মকর্তার পর্যালোচনা
        ছাড়া প্রকাশিত হবে না। {id}
      </small>
    </section>
  );
}
function ComparePanel({ id }: { id: string }) {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel compare-panel">
      <span className="kicker">DOCUMENT INTEGRITY & FIELD COMPARISON</span>
      <h2>আপনার দলিলের কপি মিলিয়ে দেখুন</h2>
      <p>
        প্রথমে আসল ফাইলের SHA-256 মিলিয়ে দেখা হয়। ভিন্ন কপি হলে AI সংগৃহীত
        তথ্য সংরক্ষিত দলিলের সঙ্গে তুলনা করে।
      </p>
      <label className="dropzone">
        <Fingerprint size={35} />
        <strong>
          {busy
            ? "প্রকৃত নথি বিশ্লেষণ করা হচ্ছে…"
            : "দলিলের PDF বা ছবি নির্বাচন করুন"}
        </strong>
        <span>সর্বোচ্চ 5 MB · 3 পৃষ্ঠা</span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          aria-label="Compare deed"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            setResult(null);
            try {
              const form = new FormData();
              form.append("file", file);
              const content = await prepareDocument(file);
              form.append("pages", JSON.stringify(content.pages));
              form.append("text", content.text);
              setResult(await api("compare/" + id, form));
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
              e.target.value = "";
            }
          }}
        />
      </label>
      {error && <div className="alert error">{error}</div>}
      {result && (
        <div className="compare-result">
          <Badge
            tone={
              result.status === "Mismatch found"
                ? "red"
                : result.status === "Matched"
                  ? "green"
                  : "amber"
            }
          >
            {result.status}
          </Badge>
          <h3>{result.mode}</h3>
          <p>{result.detail}</p>
          {result.document && (
            <p>
              Reviewed document: <strong>{result.document}</strong>
            </p>
          )}
          {result.rows.length > 0 && (
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>তথ্য</th>
                    <th>সংরক্ষিত রেকর্ড</th>
                    <th>আপলোড করা কপি</th>
                    <th>ফলাফল</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r: any) => (
                    <tr
                      key={r.key}
                      className={r.status === "Mismatch" ? "mismatch" : ""}
                    >
                      <td>{fieldLabels[r.key as keyof Fields]}</td>
                      <td>{r.stored ?? "—"}</td>
                      <td>{r.uploaded ?? "অস্পষ্ট"}</td>
                      <td>
                        <Badge
                          tone={
                            r.status === "Mismatch"
                              ? "red"
                              : r.status === "Unknown"
                                ? "amber"
                                : "green"
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
function ReviewDialog({
  document: doc,
  onClose,
  onSave,
}: {
  document: LandDocument;
  onClose: () => void;
  onSave: (fields: Fields, reason: string, status: string) => Promise<void>;
}) {
  const [fields, setFields] = useState<Fields>(
    Object.fromEntries(
      Object.keys(emptyFields).map((k) => [k, doc[k as keyof Fields]]),
    ) as unknown as Fields,
  );
  const [reason, setReason] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audit = useCallback(
    () =>
      api("audit/" + doc.id)
        .then(setLogs)
        .catch((e) => setError(e.message)),
    [doc.id],
  );
  useEffect(() => {
    audit();
  }, [audit]);
  const save = async (status: string) => {
    setBusy(true);
    setError("");
    try {
      await onSave(fields, reason, status);
      await audit();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="modal-backdrop">
      <section
        className="review-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Document review"
      >
        <div className="review-header">
          <div>
            <span className="kicker">SOURCE-FIRST DOCUMENT REVIEW</span>
            <h2>{doc.official_number || doc.file_name}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close review"
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="review-body">
          <div className="source-preview">
            <div className="flex-between">
              <span>মূল নথি / Original source</span>
              <a
                href={"/api/service/document/" + doc.id}
                target="_blank"
                rel="noreferrer"
              >
                আলাদা খুলুন <ArrowUpRight size={13} />
              </a>
            </div>
            {doc.mime_type === "application/pdf" ? (
              <iframe
                title="Original document"
                src={"/api/service/document/" + doc.id}
              />
            ) : (
              <Image
                unoptimized
                width={640}
                height={850}
                alt="Original uploaded document"
                src={"/api/service/document/" + doc.id}
              />
            )}
            <small>SHA-256: {doc.sha256}</small>
          </div>
          <div className="review-fields">
            <h3>সংগৃহীত তথ্য মিলিয়ে দেখুন</h3>
            <p>
              অস্পষ্ট বা অনুপস্থিত মান অনুমান করে পূরণ করবেন না। প্রতিটি সংশোধন
              অডিট ইতিহাসে থাকবে।
            </p>
            {Object.entries(fieldLabels).map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  data-testid={"edit-field-" + key}
                  type={
                    key === "area_decimals"
                      ? "number"
                      : key.includes("date")
                        ? "date"
                        : "text"
                  }
                  step="0.01"
                  value={fields[key as keyof Fields] ?? ""}
                  onChange={(e) =>
                    setFields({
                      ...fields,
                      [key]:
                        e.target.value === ""
                          ? null
                          : key === "area_decimals"
                            ? Number(e.target.value)
                            : e.target.value,
                    })
                  }
                />
              </label>
            ))}
            <label>
              সংশোধন / পর্যালোচনার কারণ *
              <textarea
                data-testid="edit-reason-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="মূল নথির সঙ্গে মিলিয়ে পর্যালোচনার কারণ লিখুন"
              />
            </label>
            {error && <div className="alert error">{error}</div>}
            <div className="review-actions">
              <button
                disabled={busy || reason.trim().length < 3}
                className="button outline"
                data-testid="save-audit-correction-btn"
                onClick={() => save("PENDING")}
              >
                সংশোধন সংরক্ষণ
              </button>
              <button
                disabled={busy || reason.trim().length < 3}
                className="button primary"
                onClick={() => save("VERIFIED")}
              >
                <CheckCircle2 size={16} /> যাচাই সম্পন্ন
              </button>
              <button
                disabled={busy || reason.trim().length < 3}
                className="button danger"
                onClick={() => save("NEEDS_CORRECTION")}
              >
                সংশোধনের জন্য ফেরত
              </button>
            </div>
            <section className="audit-section">
              <h3>সংশোধনের অডিট ইতিহাস</h3>
              <div className="audit-log" data-testid="audit-log-table">
                {logs.length ? (
                  logs.map((l) => (
                    <div key={l.id}>
                      <strong>{l.field_name}</strong>
                      <p>
                        <del>{l.previous_value ?? "ফাঁকা"}</del> →{" "}
                        <ins>{l.new_value ?? "ফাঁকা"}</ins>
                      </p>
                      <span>{l.reason}</span>
                      <small>
                        {new Date(l.created_at).toLocaleString()} ·{" "}
                        {l.admin_id.slice(0, 8)}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>এখনও কোনো সংশোধন হয়নি।</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </section>
    </div>
  );
}
function MutationCard({
  item: c,
  busy,
  onDecision,
}: {
  item: any;
  busy: boolean;
  onDecision: (status: string, reason: string) => void;
}) {
  const [reason, setReason] = useState("");
  return (
    <section
      className="panel mutation-card"
      data-testid={"mutation-case-" + c.case_number}
    >
      <div className="section-heading">
        <div>
          <span className="kicker">{c.case_number}</span>
          <h2>
            {c.land_documents?.buyer_or_current_owner || "পর্যালোচনা বাকি"}
          </h2>
          <p>
            দলিল {c.land_documents?.official_number} ·{" "}
            {c.land_documents?.area_decimals} শতাংশ ·{" "}
            <Link href={"/admin/land/" + c.land.unique_land_id}>
              {c.land.unique_land_id}
            </Link>
          </p>
        </div>
        <Badge tone={c.analysis.score ? "red" : "green"}>
          {c.display_status}
        </Badge>
      </div>
      <div className="mutation-evidence">
        <strong>Risk indicator: {c.analysis.score}/100</strong>
        {c.analysis.signals.map((s: any) => (
          <p key={s.id}>
            {s.title} · +{s.points}
            <small>{s.detail}</small>
          </p>
        ))}
      </div>
      {c.decision_reason && (
        <div className="alert info">
          সংরক্ষিত সিদ্ধান্ত: {c.status} · {c.decision_reason}
        </div>
      )}
      <label>
        কর্মকর্তার সিদ্ধান্তের কারণ
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="পর্যালোচনার সিদ্ধান্ত ও কারণ লিখুন"
        />
      </label>
      <div className="review-actions">
        <button
          disabled={busy || reason.trim().length < 3}
          className="button outline"
          onClick={() => onDecision("HEARING_REQUIRED", reason)}
        >
          শুনানির জন্য পাঠান
        </button>
        <button
          disabled={
            busy ||
            reason.trim().length < 3 ||
            c.analysis.score > 0 ||
            c.analysis.pending > 0
          }
          className="button primary"
          onClick={() => onDecision("APPROVED", reason)}
        >
          <CheckCircle2 size={16} /> প্রোটোটাইপ অনুমোদন
        </button>
        <button
          disabled={busy || reason.trim().length < 3}
          className="button danger"
          onClick={() => onDecision("REJECTED", reason)}
        >
          আবেদন প্রত্যাখ্যান
        </button>
      </div>
      <small className="muted">
        সিস্টেম সরকারি নামজারি বা DCR ইস্যু করে না। সংঘাত বা অসম্পূর্ণ
        পর্যালোচনা থাকলে অনুমোদন অবরুদ্ধ।
      </small>
    </section>
  );
}
