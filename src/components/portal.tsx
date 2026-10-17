"use client";
import { useI18n, LanguageSwitch } from "@/i18n/provider";
import Link from "next/link";
import Image from "next/image";
import AuthPanel from "./auth-panel";
import DocumentFieldsEditor from "./document-fields-editor";
import dynamic from "next/dynamic";
const DocxPreview = dynamic(() => import("./docx-preview"), { ssr: false });
import CreateLandDialog from "./create-land-dialog";
import { explainSignal } from "@/i18n/evidence";
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
import { DOCUMENT_ACCEPT, DOCX_MIME } from "@/lib/document-types";
type View =
  | "home"
  | "verify"
  | "record"
  | "admin"
  | "land"
  | "mutations"
  | "login"
  | "register";
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
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  return (
    <div className="loading">
      <Loader2 className="spin" /> {t("loading_records_f15e0")}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  return (
    <div className="empty">
      <FileSearch size={36} />
      <h3>{text}</h3>
      <p>{t("new_information_will_appear_here_when_it_a4796")}</p>
    </div>
  );
}
export default function Portal({
  view,
  id,
  authRole = "citizen",
}: {
  view: View;
  id?: string;
  authRole?: "citizen" | "officer";
}) {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  const [isOfficer, setOfficer] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [lands, setLands] = useState<Land[]>([]);
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState(view === "land" ? "documents" : "overview");
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
      setAuthenticated(session.authenticated);
      if (["admin", "land", "mutations"].includes(view) && !session.officer) {
        router.replace("/admin/login");
        return;
      }
      if (view === "record" || view === "land")
        setBundle(await api("land/" + id));
      else if (view === "mutations") setCases(await api("mutations"));
      else if (!["login", "register"].includes(view))
        setLands(await api("lands"));
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
          <span>
            {t("landtech_2026_innovation_in_digital_land_services_edc90")}
          </span>
          <span className="utility-right">
            <Globe2 size={13} /> {t("bangladesh_8ecd2")}{" "}
            <span className="utility-divider">|</span>
            <LanguageSwitch />
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
                {t("bhumisetu_782d0")}
                <span className="brand-en" translate="no">
                  BhumiSetu
                </span>
              </strong>
              <small>{t("clear_records_a_secure_tomorrow_c27ff")}</small>
            </span>
          </Link>
          <button
            className="icon-button mobile-menu"
            aria-label={t("open_navigation_0ed77")}
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
          <nav className={mobile ? "nav open" : "nav"}>
            <Link className={view === "home" ? "active" : ""} href="/">
              {t("home_932f2")}
            </Link>
            <Link
              className={["verify", "record"].includes(view) ? "active" : ""}
              href="/verify"
            >
              {t("citizen_services_e895b")}
            </Link>
            <Link
              className={
                ["admin", "land", "mutations"].includes(view) ? "active" : ""
              }
              href="/admin"
            >
              {t("officer_workspace_e4eee")}
            </Link>
            <Link href="/#how-it-works">{t("how_it_works_56da8")}</Link>
          </nav>
          <div className="header-action">
            {authenticated ? (
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
                <LogOut size={15} /> {t("log_out_d8929")}
              </button>
            ) : (
              <div className="entry-buttons">
                <Link className="button outline small" href="/login">
                  {t("login_dfab6")}
                </Link>
                <Link className="button outline small" href="/register">
                  {t("registration_21138")}
                </Link>
                <Link className="button primary small" href="/admin/login">
                  {t("administrative_41312")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <div className="prototype-strip">
        <span className="dot" />{" "}
        {t("working_hackathon_prototype_all_demonstration_data_is_d73db")}
      </div>
      {view !== "home" && (
        <div className="container breadcrumb">
          <Link href="/">{t("home_932f2")}</Link>
          <ChevronRight size={13} />
          <Link
            href={
              ["admin", "land", "mutations"].includes(view)
                ? "/admin"
                : "/verify"
            }
          >
            {["admin", "land", "mutations"].includes(view)
              ? t("officer_workspace_e4eee")
              : t("citizen_services_e895b")}
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
                ? t("record_not_found_or_not_published_e997c")
                : tt(error)}
            </span>
            <button
              className="icon-button"
              onClick={() => setError("")}
              aria-label={t("dismiss_48845")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {notice && (
          <div role="status" className="alert success">
            <CheckCircle2 size={20} />
            {tt(notice)}
          </div>
        )}
        {view === "home" && (
          <>
            <section className="hero">
              <div className="container hero-grid">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="dot" />{" "}
                    {t("from_documents_to_informed_decisions_9dd50")}
                  </span>
                  <h1>
                    {t("keep_land_records_clear_6d099")}
                    <br />
                    <span>{t("make_informed_decisions_f8ebd")}</span>
                  </h1>
                  <p>
                    {t("khatian_porcha_deeds_and_mutation_records_in_3e323")}
                  </p>
                  <form className="hero-search" onSubmit={search}>
                    <Search size={22} />
                    <input
                      name="query"
                      aria-label={t("land_id_dbdcc")}
                      placeholder={t("enter_the_unique_land_id_45f9e")}
                      required
                    />
                    <button className="button primary" type="submit">
                      {t("verify_now_bbe5c")}
                      <ArrowRight size={18} />
                    </button>
                  </form>
                  <div className="hero-sample">
                    {t("explore_a_fictional_record_47e2f")}{" "}
                    <Link href="/verify/LND-MOCK-001">
                      LND-MOCK-001 <ArrowUpRight size={13} />
                    </Link>
                  </div>
                  <div className="hero-trust">
                    <span>
                      <ShieldCheck size={16} />{" "}
                      {t("evidence_based_analysis_ae4a1")}
                    </span>
                    <span>
                      <Fingerprint size={16} />{" "}
                      {t("digital_document_integrity_ad1fe")}
                    </span>
                  </div>
                </div>
                <div className="hero-visual">
                  <div className="visual-caption">
                    <span className="live-dot" />{" "}
                    {t("one_parcel_every_document_a_clearer_picture_2413b")}
                  </div>
                  <div className="parcel-map">
                    <div className="map-grid" />
                    <svg
                      viewBox="0 0 460 260"
                      aria-label={t("illustrative_parcel_diagram_27795")}
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
                        {t("dag_no_207_e7097")}
                      </text>
                    </svg>
                    <span className="map-label">
                      <MapPinned size={13} />{" "}
                      {t(
                        "illustrative_fictional_parcel_not_a_survey_map_c2851",
                      )}
                    </span>
                  </div>
                  <div className="floating-document">
                    <span className="file-icon">
                      <Files size={22} />
                    </span>
                    <div>
                      <strong>{t("integrated_land_record_44e09")}</strong>
                      <small>{t("khatian_porcha_deed_mutation_f6d3f")}</small>
                    </div>
                    <ShieldCheck size={23} className="text-green" />
                  </div>
                  <div className="visual-bottom">
                    <span>{t("document_history_370d9")}</span>
                    <span className="timeline-dots">
                      <i />
                      <b />
                      <i />
                      <b />
                      <i />
                    </span>
                    <span>
                      {t("evidence_backed_report_a4058")}
                      <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="container services">
              <div className="section-heading">
                <div>
                  <span className="kicker">{t("citizen_services_e895b")}</span>
                  <h2>{t("land_verification_made_easier_e7d58")}</h2>
                </div>
                <p>{t("a_complete_view_of_one_parcel_on_bc265")}</p>
              </div>
              <div className="service-grid">
                {[
                  {
                    icon: FileSearch,
                    title: t("search_land_records_15dd5"),
                    en: t("find_land_records_0b7f7"),
                    description: t(
                      "find_related_documents_together_using_a_unique_317c2",
                    ),
                    href: "/verify",
                    color: "green",
                  },
                  {
                    icon: Fingerprint,
                    title: t("check_document_details_6f08f"),
                    en: t("verify_a_document_72e38"),
                    description: t(
                      "compare_a_copy_and_its_fields_against_19fe9",
                    ),
                    href: "/verify?tab=compare",
                    color: "purple",
                  },
                  {
                    icon: ShieldAlert,
                    title: t("detect_conflicting_sales_a95f0"),
                    en: t("detect_conflicting_sales_eb7e3"),
                    description: t(
                      "review_potential_conflicts_with_reasons_and_evidence_d1cea",
                    ),
                    href: "/verify/LND-MOCK-001",
                    color: "orange",
                  },
                  {
                    icon: ClipboardCheck,
                    title: t("smart_mutation_review_4d683"),
                    en: t("mutation_review_fb883"),
                    description: t(
                      "review_document_discrepancies_before_making_a_decision_15746",
                    ),
                    href: "/admin/mutations",
                    color: "blue",
                  },
                ].map((s) => (
                  <Link className="service-card" key={s.en} href={s.href}>
                    <span className={"service-icon " + s.color}>
                      <s.icon size={26} />
                    </span>
                    <h3>{tt(s.title)}</h3>
                    <small>{s.en}</small>
                    <p>{s.description}</p>
                    <span className="service-link">
                      {t("access_service_921dc")}
                      <ArrowRight size={17} />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
            <section className="how-section" id="how-it-works">
              <div className="container">
                <div className="section-heading">
                  <div>
                    <span className="kicker">
                      {t("three_simple_steps_0bc5f")}
                    </span>
                    <h2>{t("evidence_to_support_your_decision_5afb3")}</h2>
                  </div>
                  <Badge>
                    {t("ai_reads_rules_explain_officers_decide_90041")}
                  </Badge>
                </div>
                <div className="steps">
                  {[
                    [
                      "01",
                      t("find_a_parcel_ce1bb"),
                      t("open_a_published_record_using_its_unique_0ff5d"),
                    ],
                    [
                      "02",
                      t("review_the_evidence_fed7e"),
                      t("compare_deeds_land_areas_and_the_recorded_6a316"),
                    ],
                    [
                      "03",
                      t("decide_with_understanding_0abb1"),
                      t(
                        "understand_discrepancies_and_missing_checks_before_taking_c98c3",
                      ),
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
                <h2>{t("trust_begins_with_transparency_2ecab")}</h2>
                <p>
                  {t("ai_helps_collect_document_fields_each_analysis_a430f")}
                </p>
              </div>
              <Link className="button outline" href="/verify/LND-MOCK-001">
                {t("explore_the_sample_analysis_3ff5f")}
                <ArrowRight size={17} />
              </Link>
            </section>
          </>
        )}
        {view === "verify" && (
          <>
            <PageHeading
              kicker={t("citizen_services_28127")}
              title={t("verify_before_you_buy_4d646")}
              description={t(
                "review_published_records_document_history_and_potential_bdc21",
              )}
            />
            <div className="search-panel">
              <form className="record-search" onSubmit={search}>
                <Search size={22} />
                <input
                  data-testid="land-search-input"
                  name="query"
                  aria-label={t("land_id_dbdcc")}
                  placeholder={t("example_lnd_mock_001_99fc2")}
                  required
                />
                <button
                  data-testid="land-search-btn"
                  className="button primary"
                >
                  {t("find_record_edd2b")}
                  <ArrowRight size={17} />
                </button>
              </form>
              <p>
                <LockKeyhole size={14} />{" "}
                {t("only_reviewed_and_published_records_are_displayed_510f3")}
              </p>
            </div>
            <div className="section-heading">
              <h2>{t("published_sample_records_e251b")}</h2>
              <Badge>{t("clearly_labeled_fictional_data_89f82")}</Badge>
            </div>
            {loading ? <Busy /> : <LandList lands={lands} admin={false} />}
          </>
        )}
        {(view === "login" || view === "register") && (
          <AuthPanel role={authRole} register={view === "register"} />
        )}
        {view === "admin" && (
          <>
            <PageHeading
              kicker={t("officer_workspace_e662e")}
              title={t("land_record_management_20904")}
              description={t(
                "one_parcel_four_document_categories_store_review_13da8",
              )}
              action={
                <button
                  className="button primary"
                  onClick={() => setCreate(true)}
                >
                  <Plus size={17} /> {t("create_land_record_8f76d")}
                </button>
              }
            />
            <div className="stats-grid">
              <Stat
                label={t("master_land_records_d4a7d")}
                value={lands.length}
                icon={<Layers3 />}
              />
              <Stat
                label={t("published_records_324dc")}
                value={lands.filter((l) => l.is_finalized).length}
                icon={<FileCheck2 />}
              />
              <Stat
                label={t("draft_records_17866")}
                value={lands.filter((l) => !l.is_finalized).length}
                icon={<Clock3 />}
              />
              <Link href="/admin/mutations" className="stat-link">
                <ClipboardCheck />
                <span>
                  {t("mutation_review_1a212")}
                  <small>
                    {t("mutation_workspace_14066")}
                    <ArrowRight size={14} />
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
                    view === "land" ? t("master_workspace") : t("land_evidence")
                  }
                  title={
                    view === "land"
                      ? t("land_documents_and_review_9d77f")
                      : t("integrated_land_record_8aa39")
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
                              setNotice(t("record_published_42e08"));
                              await refresh();
                            })
                          }
                        >
                          <CheckCircle2 size={17} />{" "}
                          {t("publish_reviewed_record_55e11")}
                        </button>
                      ) : (
                        <button
                          className="button outline"
                          onClick={() => window.print()}
                        >
                          <Download size={17} /> {t("report_pdf_49a93")}
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
                      {t("unique_land_id_internal_identifier_ec0ee")}
                    </span>
                    <h2 data-testid="master-land-id">
                      {bundle.land.unique_land_id}
                    </h2>
                  </div>
                  <div className="identity-status">
                    <Badge tone={bundle.land.is_finalized ? "green" : "amber"}>
                      {bundle.land.is_finalized
                        ? t("published_record_badge")
                        : t("draft_records_17866")}
                    </Badge>
                    <span className="tiny muted">
                      {t("fictional_sample_data_only_cc7b4")}
                    </span>
                  </div>
                </div>
                <div className="record-meta">
                  <div>
                    <span>{t("khatian_number_74e57")}</span>
                    <strong>{bundle.land.current_khatian_no || "—"}</strong>
                  </div>
                  <div>
                    <span>{t("dag_number_03982")}</span>
                    <strong>{bundle.land.dag_number}</strong>
                  </div>
                  <div>
                    <span>{t("recorded_land_area_91f11")}</span>
                    <strong data-testid="recorded-area">
                      {bundle.land.total_area_decimals}{" "}
                      <small>{t("decimals_2dd44")}</small>
                    </strong>
                  </div>
                  <div>
                    <span>{t("mouza_jl_ace98")}</span>
                    <strong>
                      {bundle.land.mouza} / {bundle.land.jl_number}
                    </strong>
                  </div>
                </div>
                <div className="tabs" role="tablist">
                  {[
                    ["overview", t("analysis_and_evidence_1d8c5"), ShieldCheck],
                    ["documents", t("documents_58873"), Files],
                    ["history", t("land_history_741f6"), History],
                    ...(view === "record"
                      ? [["compare", t("verify_document_465e4"), Fingerprint]]
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
                            {t("rule_based_risk_indicator_f4894")}
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
                        <h3>{tt(bundle.analysis.status)}</h3>
                        <p>
                          {t("estimated_risk_score_rule_based_indicator_966a5")}
                        </p>
                        <small>
                          {t("this_is_neither_a_fraud_probability_nor_6e834")}
                        </small>
                        <div className="risk-foot">
                          <span>
                            {bundle.analysis.coverage}{" "}
                            {t("reviewed_documents_307e7")}
                          </span>
                          <span>
                            {bundle.analysis.signals.length}{" "}
                            {t("signals_cf65c")}
                          </span>
                        </div>
                      </section>
                      <section className="panel quota-panel">
                        <div className="panel-top">
                          <div>
                            <span className="kicker">
                              {t("area_share_check_4b8a1")}
                            </span>
                            <h3>{t("land_area_comparison_f7df9")}</h3>
                          </div>
                          <Layers3 size={22} />
                        </div>
                        <div className="quota-numbers">
                          <div>
                            <strong>{bundle.analysis.recorded}</strong>
                            <span>{t("decimals_recorded_d8f3f")}</span>
                          </div>
                          <span className="versus">{t("versus_393d3")}</span>
                          <div
                            className={
                              bundle.analysis.sold > bundle.analysis.recorded
                                ? "text-red"
                                : ""
                            }
                          >
                            <strong>{bundle.analysis.sold}</strong>
                            <span>{t("decimals_in_sale_deeds_61290")}</span>
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
                            <i /> {t("recorded_limit_ff206")}
                            {bundle.analysis.recorded}
                          </span>
                          <span className="text-red">
                            {bundle.analysis.excess > 0
                              ? t("excess_area", {
                                  area: bundle.analysis.excess,
                                })
                              : t("based_on_available_records_7a562")}
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
                              ? t(
                                  "there_are_inconsistencies_between_sales_and_records_344e6",
                                )
                              : t(
                                  "no_conflict_was_found_in_available_records_364c7",
                                )}
                          </span>
                        </div>
                        <div className="mini-process">
                          <span>
                            {t("collect_records_33146")}
                            <Check size={13} />
                          </span>
                          <ChevronRight size={14} />
                          <span>
                            {t("rule_based_analysis_35f49")}
                            <Check size={13} />
                          </span>
                          <ChevronRight size={14} />
                          <span>{t("human_review_20a6a")}</span>
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
                            {t("every_alert_has_a_source_80011")}
                          </span>
                          <h2>{t("conflict_reasons_and_evidence_686fc")}</h2>
                        </div>
                        <Badge tone={bundle.analysis.score ? "red" : "green"}>
                          {bundle.analysis.signals.length} {t("signals_c1d2c")}
                        </Badge>
                      </div>
                      {bundle.analysis.signals.length ? (
                        bundle.analysis.signals.map((s) => (
                          <div className="signal" key={s.id}>
                            <div className="signal-heading">
                              <span className="signal-mark">
                                <ShieldAlert size={18} />
                              </span>
                              <h3>{tt(s.title)}</h3>
                              <Badge tone="red">+{s.points}</Badge>
                            </div>
                            <p>{explainSignal(s, bundle.documents, t)}</p>
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
                          <CheckCircle2 />{" "}
                          {t(
                            "no_conflict_found_in_available_records_review_08f79",
                          )}
                        </div>
                      )}
                      <div className="comparison-table">
                        <table>
                          <thead>
                            <tr>
                              <th>{t("sale_deed_86094")}</th>
                              <th>{t("seller_e77b5")}</th>
                              <th>{t("buyer_980bc")}</th>
                              <th>{t("area_decimals_5b0ba")}</th>
                              <th>{t("source_2a15e")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {bundle.documents
                              .filter((d) => d.category === "DEED")
                              .map((d) => (
                                <tr key={d.id}>
                                  <td>
                                    <strong>{d.official_number || "—"}</strong>
                                    <small>
                                      {d.document_date
                                        ? formatDate(d.document_date)
                                        : "—"}
                                    </small>
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
                                      {t("view_document_fa168")}
                                      <ArrowUpRight size={13} />
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
                        <span className="kicker">
                          {t("verification_coverage_4390f")}
                        </span>
                        <h3>{t("checks_not_yet_completed_be022")}</h3>
                        {bundle.analysis.missing.map((s) => (
                          <div className="coverage-row" key={s}>
                            <CircleHelp size={17} />
                            <span>{tt(s)}</span>
                            <Badge tone="gray">
                              {t("data_unavailable_dcb14")}
                            </Badge>
                          </div>
                        ))}
                      </section>
                      <section className="panel qr-panel">
                        <QRCodeSVG
                          value={origin + "/verify/" + id}
                          size={108}
                        />
                        <div>
                          <h3>
                            {t("scan_to_open_the_published_record_d6544")}
                          </h3>
                          <p>
                            {t("this_qr_opens_the_permitted_record_page_6316c")}
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
                            <h3>{tt(c.bn)}</h3>
                            <span>
                              {tt(c.en)} ·{" "}
                              {
                                bundle.documents.filter(
                                  (d) => d.category === key,
                                ).length
                              }{" "}
                              {t("documents_bffb8")}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {view === "land" && (
                      <UploadPanel
                        id={id!}
                        busy={busy}
                        onUpload={(files, category, subtype, enhance) =>
                          run(async () => {
                            for (const file of files) {
                              const content = await prepareDocument(file, {
                                enhance,
                              });
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
                              t(
                                "document_fields_have_been_extracted_review_them_0ef99",
                              ),
                            );
                            await refresh();
                          })
                        }
                      />
                    )}
                    <section className="panel document-list">
                      <h3>{t("stored_documents_edc82")}</h3>
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
                                {tt(categories[d.category].bn)} ·{" "}
                                {tt(d.sub_type)} ·{" "}
                                {d.document_date
                                  ? formatDate(d.document_date)
                                  : t("date_awaiting_review_2c598")}
                              </span>
                              {d.extraction_status === "FAILED" && (
                                <small className="text-red">
                                  {t("extraction_failed_d6554")}
                                  {tt(d.extraction_error)}
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
                                ? t("reviewed_03a01")
                                : t("review_pending_97137")}
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
                                    {t("retry_extraction_6b5ce")}
                                  </button>
                                )}
                                <button
                                  className="button outline small"
                                  data-testid={"review-doc-" + d.doc_code}
                                  onClick={() => setReview(d)}
                                >
                                  {t("review_5885b")}
                                  <ArrowRight size={14} />
                                </button>
                              </div>
                            ) : (
                              <a
                                className="button outline small"
                                href={"/api/service/document/" + d.id}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {t("source_document_c24cf")}
                                <ArrowUpRight size={14} />
                              </a>
                            )}
                          </div>
                        ))
                      ) : (
                        <Empty
                          text={t("no_documents_have_been_added_yet_9d822")}
                        />
                      )}
                    </section>
                  </>
                )}
                {tab === "history" && (
                  <section className="panel">
                    <div className="section-heading">
                      <div>
                        <span className="kicker">
                          {t("document_linked_timeline_7e858")}
                        </span>
                        <h2>{t("land_record_history_0107a")}</h2>
                        <p>
                          {t(
                            "khatian_entries_deeds_and_mutation_records_are_98181",
                          )}
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
                              {d.document_date
                                ? formatDate(d.document_date)
                                : t("date_unavailable_3fc6b")}
                            </div>
                            <div className="timeline-card">
                              <Badge
                                tone={
                                  d.category === "DEED" && bundle.analysis.score
                                    ? "amber"
                                    : "green"
                                }
                              >
                                {tt(categories[d.category].bn)} ·{" "}
                                {tt(d.sub_type)}
                              </Badge>
                              <h3>{d.official_number}</h3>
                              <p>
                                {d.seller_or_prior_owner && (
                                  <>
                                    {d.seller_or_prior_owner}{" "}
                                    <ArrowRight size={13} />{" "}
                                  </>
                                )}
                                {d.buyer_or_current_owner ||
                                  t("data_unavailable_dcb14")}
                              </p>
                              <div className="flex-between">
                                <span className="muted">
                                  {d.area_decimals ?? "—"}{" "}
                                  {t("decimals_dag_635c2")} {d.dag_number}
                                </span>
                                <a
                                  href={"/api/service/document/" + d.id}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-link"
                                >
                                  {t("view_source_document_024b8")}
                                  <ArrowUpRight size={13} />
                                </a>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                    <div className="alert info">
                      <CircleHelp size={18} />{" "}
                      {t("latest_recorded_party_8aaf1")}{" "}
                      {[...bundle.documents]
                        .filter(
                          (d) =>
                            d.verification_status === "VERIFIED" &&
                            d.document_date &&
                            d.buyer_or_current_owner,
                        )
                        .sort((a, b) =>
                          b.document_date!.localeCompare(a.document_date!),
                        )[0]?.buyer_or_current_owner ||
                        t("data_unavailable_dcb14")}
                      {t("this_is_not_a_declaration_of_confirmed_77c94")}
                    </div>
                  </section>
                )}
                {tab === "compare" && <ComparePanel id={id!} />}
                <div className="report-disclaimer">
                  <ShieldCheck size={18} />
                  <p>
                    {t(
                      "verification_aid_based_only_on_available_fictional_56af6",
                    )}{" "}
                    <span>
                      {bundle.analysis.version} · {formatDate(new Date())}
                    </span>
                  </p>
                </div>
              </>
            )
          ))}
        {view === "mutations" && (
          <>
            <PageHeading
              kicker={t("smart_mutation_review_09895")}
              title={t("mutation_review_1a212")}
              description={t(
                "cases_created_from_reviewed_deeds_refer_conflicts_8d333",
              )}
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
                      setNotice(t("case_decision_saved_d2e43"));
                      await refresh();
                    })
                  }
                />
              ))
            ) : (
              <Empty text={t("no_mutation_cases_yet_e0865")} />
            )}
          </>
        )}
      </main>
      <footer className="footer">
        <div className="container footer-main">
          <div>
            <Link href="/" className="footer-brand">
              <Landmark size={24} /> {t("bhumisetu_782d0")}
            </Link>
            <p>
              {t(
                "documents_into_evidence_evidence_into_informed_decisions_5487b",
              )}
            </p>
          </div>
          <div>
            <strong>{t("useful_links_ec888")}</strong>
            <Link href="/verify">{t("citizen_verification_9b240")}</Link>
            <Link href="/admin">{t("officer_workspace_e4eee")}</Link>
          </div>
          <div>
            <strong>{t("project_information_c78d0")}</strong>
            <a
              href="https://github.com/AdribMahmud101/bhumisetu"
              target="_blank"
              rel="noreferrer"
            >
              {t("source_code_2d4e9")}
              <ArrowUpRight size={13} />
            </a>
            <span>LandTech 2026 · P3</span>
          </div>
          <div className="footer-note">
            <ShieldCheck size={23} />
            <span>
              {t("fictional_data_only_dff30")}
              <br />
              {t("not_connected_to_government_systems_4911f")}
            </span>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 BhumiSetu · LandArchive BD</span>
          <span>{t("hackathon_prototype_built_with_ai_assistance_c6c18")}</span>
        </div>
      </footer>
      {create && <CreateLandDialog onClose={() => setCreate(false)} />}
      {review && (
        <ReviewDialog
          document={review}
          onClose={() => setReview(null)}
          onSave={async (fields, reason, status) => {
            await api("review/" + review.id, { fields, reason, status });
            await refresh();
            setNotice(t("review_and_audit_history_saved_ab810"));
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
  const { t, tt, locale, setLocale, formatDate } = useI18n();

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
              {l.is_finalized ? t("published_6c91d") : t("draft_e3f9e")}
            </Badge>
          </div>
          <h3>{l.unique_land_id}</h3>
          <p>
            {l.mouza} · {l.upazila}
          </p>
          <div className="land-card-meta">
            <span>
              {t("dag_ba3ed")}
              <strong>{l.dag_number}</strong>
            </span>
            <span>
              <strong>{l.total_area_decimals}</strong> {t("decimals_2dd44")}
            </span>
          </div>
          <div className="land-card-link">
            {admin
              ? t("review_documents_96806")
              : t("view_record_and_analysis_0a7de")}{" "}
            <ArrowRight size={16} />
          </div>
        </Link>
      ))}
    </div>
  ) : (
    <Empty text={t("no_published_records_found_8118b")} />
  );
}
function UploadPanel({
  id,
  busy,
  onUpload,
}: {
  id: string;
  busy: boolean;
  onUpload: (
    files: File[],
    category: Category,
    subtype: string,
    enhance: boolean,
  ) => void;
}) {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  const [category, setCategory] = useState<Category>("KHATIAN");
  const [subtype, setSubtype] = useState("CS");
  const [enhance, setEnhance] = useState(true);
  return (
    <section className="panel upload-panel">
      <div>
        <h3>{t("add_new_documents_c9c24")}</h3>
        <p>{t("pdf_png_jpeg_up_to_5_mb_7129f")}</p>
      </div>
      <label className="ocr-enhance-control">
        <input
          type="checkbox"
          checked={enhance}
          disabled={busy}
          onChange={(e) => setEnhance(e.target.checked)}
        />
        {t("ocr_enhance")}
      </label>
      <p className="muted">{t("ocr_enhance_help")}</p>
      <div className="upload-controls">
        <label>
          {t("category_d9096")}
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
                {tt(c.bn)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("document_type_82172")}
          <select value={subtype} onChange={(e) => setSubtype(e.target.value)}>
            {categories[category].types.map((t) => (
              <option key={t} value={t}>
                {tt(t)}
              </option>
            ))}
          </select>
        </label>
        <label
          className={"button primary file-button " + (busy ? "disabled" : "")}
        >
          {busy ? <Loader2 size={18} className="spin" /> : <Upload size={18} />}{" "}
          {busy
            ? t("uploading_and_extracting_37c0f")
            : t("upload_and_extract_document_fields_bc3eb")}
          <input
            aria-label={t("upload_documents_b19cb")}
            type="file"
            multiple
            accept={DOCUMENT_ACCEPT}
            disabled={busy}
            onChange={(e) => {
              if (e.target.files?.length)
                onUpload(
                  Array.from(e.target.files),
                  category,
                  subtype,
                  enhance,
                );
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <small>
        {t("each_original_source_is_retained_ai_extracted_eb663")}
        {id}
      </small>
    </section>
  );
}
function ComparePanel({ id }: { id: string }) {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="panel compare-panel">
      <span className="kicker">
        {t("document_integrity_field_comparison_e2c8b")}
      </span>
      <h2>{t("compare_your_copy_of_a_deed_2b62a")}</h2>
      <p>{t("first_the_original_file_s_sha_256_96e50")}</p>
      <label className="dropzone">
        <Fingerprint size={35} />
        <strong>
          {busy
            ? t("analyzing_the_actual_document_5a120")
            : t("choose_a_deed_pdf_or_image_11061")}
        </strong>
        <span>{t("up_to_5_mb_3_pages_d575c")}</span>
        <input
          type="file"
          accept={DOCUMENT_ACCEPT}
          aria-label={t("compare_deed_f2722")}
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
      {error && <div className="alert error">{tt(error)}</div>}
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
            {tt(result.status)}
          </Badge>
          <h3>{tt(result.mode)}</h3>
          <p>{tt(result.detail)}</p>
          {result.document && (
            <p>
              {t("reviewed_document_7782c")}
              <strong>{result.document}</strong>
            </p>
          )}
          {result.rows.length > 0 && (
            <div className="comparison-table">
              <table>
                <thead>
                  <tr>
                    <th>{t("field_3731b")}</th>
                    <th>{t("enrolled_record_851c1")}</th>
                    <th>{t("uploaded_copy_1e15f")}</th>
                    <th>{t("result_efffe")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r: any) => (
                    <tr
                      key={r.key}
                      className={r.status === "Mismatch" ? "mismatch" : ""}
                    >
                      <td>{tt(fieldLabels[r.key as keyof Fields])}</td>
                      <td>{r.stored ?? "—"}</td>
                      <td>{r.uploaded ?? t("unclear_c137b")}</td>
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
                          {tt(r.status)}
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
  const { t, tt, locale, setLocale, formatDate } = useI18n();

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
        aria-label={t("document_review_da28f")}
      >
        <div className="review-header">
          <div>
            <span className="kicker">
              {t("source_first_document_review_bdff6")}
            </span>
            <h2>{doc.official_number || doc.file_name}</h2>
          </div>
          <LanguageSwitch idPrefix="dialog-locale" />
          <button
            className="icon-button"
            aria-label={t("close_review_337f9")}
            onClick={onClose}
          >
            <X />
          </button>
        </div>
        <div className="review-body">
          <div className="source-preview">
            <div className="flex-between">
              <span>{t("original_source_70902")}</span>
              <a
                href={"/api/service/document/" + doc.id}
                target="_blank"
                rel="noreferrer"
              >
                {t("open_separately_c807b")}
                <ArrowUpRight size={13} />
              </a>
            </div>
            {doc.mime_type === DOCX_MIME ? (
              <DocxPreview src={"/api/service/document/" + doc.id} />
            ) : doc.mime_type === "application/pdf" ? (
              <iframe
                title={t("original_document_92349")}
                src={"/api/service/document/" + doc.id}
              />
            ) : (
              <Image
                unoptimized
                width={640}
                height={850}
                alt={t("original_uploaded_document_a7e66")}
                src={"/api/service/document/" + doc.id}
              />
            )}
            <small>SHA-256: {doc.sha256}</small>
          </div>
          <div className="review-fields">
            <h3>{t("review_the_extracted_fields_4515e")}</h3>
            <p>{t("do_not_guess_unclear_or_missing_values_b4c66")}</p>
            <DocumentFieldsEditor
              fields={fields}
              disabled={busy}
              onChange={setFields}
            />
            <label>
              {t("correction_review_reason_9a46a")}
              <textarea
                data-testid="edit-reason-input"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t(
                  "explain_the_correction_or_review_against_the_52d49",
                )}
              />
            </label>
            {error && <div className="alert error">{tt(error)}</div>}
            <div className="review-actions">
              <button
                disabled={busy || reason.trim().length < 3}
                className="button outline"
                data-testid="save-audit-correction-btn"
                onClick={() => save("PENDING")}
              >
                {t("save_correction_69ef5")}
              </button>
              <button
                disabled={busy || reason.trim().length < 3}
                className="button primary"
                onClick={() => save("VERIFIED")}
              >
                <CheckCircle2 size={16} /> {t("mark_verified_85f1b")}
              </button>
              <button
                disabled={busy || reason.trim().length < 3}
                className="button danger"
                onClick={() => save("NEEDS_CORRECTION")}
              >
                {t("return_for_correction_bf012")}
              </button>
            </div>
            <section className="audit-section">
              <h3>{t("correction_audit_history_8369d")}</h3>
              <div className="audit-log" data-testid="audit-log-table">
                {logs.length ? (
                  logs.map((l) => (
                    <div key={l.id}>
                      <strong>
                        {tt(
                          fieldLabels[l.field_name as keyof Fields] ||
                            l.field_name,
                        )}
                      </strong>
                      <p>
                        <del>{l.previous_value ?? t("empty_1aa25")}</del> →{" "}
                        <ins>{l.new_value ?? t("empty_1aa25")}</ins>
                      </p>
                      <span>{l.reason}</span>
                      <small>
                        {formatDate(l.created_at, true)} ·{" "}
                        {l.admin_id.slice(0, 8)}
                      </small>
                    </div>
                  ))
                ) : (
                  <p>{t("no_corrections_yet_64ac0")}</p>
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
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  const [reason, setReason] = useState("");
  return (
    <section
      className="panel mutation-card"
      data-testid={"mutation-case-" + c.case_number}
      data-status={c.display_status}
    >
      <div className="section-heading">
        <div>
          <span className="kicker">{c.case_number}</span>
          <h2>
            {c.land_documents?.buyer_or_current_owner ||
              t("awaiting_review_ee5cc")}
          </h2>
          <p>
            {t("deed_7cc56")}
            {c.land_documents?.official_number} ·{" "}
            {c.land_documents?.area_decimals} {t("decimals_288cb")}{" "}
            <Link href={"/admin/land/" + c.land.unique_land_id}>
              {c.land.unique_land_id}
            </Link>
          </p>
        </div>
        <Badge tone={c.analysis.score ? "red" : "green"}>
          {tt(c.display_status)}
        </Badge>
      </div>
      <div className="mutation-evidence">
        <strong>
          {t("risk_indicator_fc0f1")}
          {c.analysis.score}/100
        </strong>
        {c.analysis.signals.map((s: any) => (
          <p key={s.id}>
            {tt(s.title)} · +{s.points}
            <small>{explainSignal(s, c.documents || [], t)}</small>
          </p>
        ))}
      </div>
      {c.decision_reason && (
        <div className="alert info">
          {t("saved_decision_c33b0")}
          {tt(c.status)} · {c.decision_reason}
        </div>
      )}
      <label>
        {t("officer_decision_reason_a1544")}
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("enter_the_review_decision_and_its_reason_1afb7")}
        />
      </label>
      <div className="review-actions">
        <button
          disabled={busy || reason.trim().length < 3}
          className="button outline"
          onClick={() => onDecision("HEARING_REQUIRED", reason)}
        >
          {t("refer_for_hearing_a8aac")}
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
          <CheckCircle2 size={16} /> {t("prototype_approval_02a6e")}
        </button>
        <button
          disabled={busy || reason.trim().length < 3}
          className="button danger"
          onClick={() => onDecision("REJECTED", reason)}
        >
          {t("reject_application_c6c49")}
        </button>
      </div>
      <small className="muted">
        {t("this_system_does_not_issue_government_mutation_3abfd")}
      </small>
    </section>
  );
}
