"use client";
import { useI18n } from "@/i18n/provider";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  History,
  Landmark,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  UserRound,
  Zap,
} from "lucide-react";
type Role = "citizen" | "officer";
export default function AuthPanel({
  role = "citizen",
  register = false,
}: {
  role?: Role;
  register?: boolean;
}) {
  const { t, tt, locale, setLocale, formatDate } = useI18n();

  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const officer = role === "officer";
  async function submit(path: string, body: unknown) {
    setBusy(path);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/service/" + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign-in failed");
      if (path === "register" && !result.authenticated) {
        setMessage(result.message);
        return;
      }
      router.push(officer ? "/admin" : "/verify");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  return (
    <div className="login-wrap auth-wrap">
      <section className="login-aside">
        {officer ? <Landmark size={46} /> : <UserRound size={46} />}
        <h1>
          {officer
            ? t("administrative_access_1aab3")
            : t("citizen_corner_07f3b")}
        </h1>
        <p>
          {officer
            ? t("document_review_audit_history_and_mutation_decisions_cfc48")
            : t("find_land_records_compare_deeds_and_understand_7e845")}
        </p>
        <div>
          <ShieldCheck />
          {officer
            ? t("officer_permissions_are_verified_on_the_server_603fc")
            : t("easy_access_to_published_land_records_9fa16")}
        </div>
        <div>
          <History />
          {officer
            ? t("a_preserved_history_of_every_correction_78768")
            : t("land_history_linked_to_source_documents_40fe0")}
        </div>
        <div>
          <LockKeyhole />
          {t("secure_login_and_separate_access_permissions_93afb")}
        </div>
        <div className="auth-role-links">
          <Link className={!officer ? "current" : ""} href="/login">
            {t("citizen_login_aeb30")}
          </Link>
          <Link className={officer ? "current" : ""} href="/admin/login">
            {t("administrative_login_f1c0b")}
          </Link>
        </div>
      </section>
      <div className="login-form">
        <span className="kicker">
          {register
            ? t("citizen_registration")
            : officer
              ? t("officer_access")
              : t("citizen_access")}
        </span>
        <h2>
          {register
            ? t("create_a_citizen_account_3f840")
            : officer
              ? t("sign_in_as_an_officer_3e894")
              : t("sign_in_as_a_citizen_3b91b")}
        </h2>
        <p>
          {register
            ? t("register_with_your_email_address_and_password_c3d75")
            : t("judges_can_enter_a_demo_in_one_41612")}
        </p>
        {!register && (
          <>
            <button
              data-testid={
                officer ? "demo-officer-login" : "demo-citizen-login"
              }
              className="button demo-login-button"
              disabled={!!busy}
              onClick={() => submit("demo-login", { role })}
            >
              {busy === "demo-login" ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <Zap size={18} />
              )}{" "}
              {officer
                ? t("one_click_officer_demo_d553d")
                : t("one_click_citizen_demo_63ff4")}
              <ArrowRight size={16} />
            </button>
            <small className="demo-explanation">
              {t("no_password_needed_shared_fictional_demo_account_2b600")}
              {officer ? t("no_real_citizen_data_95a55") : ""}
            </small>
            <div className="auth-divider">
              <span>{t("or_sign_in_with_email_b13d5")}</span>
            </div>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            if (register && values.get("password") !== values.get("confirm")) {
              setError(t("passwords_do_not_match_2e9b7"));
              return;
            }
            submit(register ? "register" : "login", {
              name: values.get("name"),
              email: values.get("email"),
              password: values.get("password"),
              role,
            });
          }}
        >
          <>
            {register && (
              <label>
                {t("your_name_cf6cc")}
                <input
                  name="name"
                  autoComplete="name"
                  required
                  minLength={2}
                  maxLength={100}
                />
              </label>
            )}
          </>
          <label>
            {t("email_1c41a")}
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            {t("password_16a47")}
            <input
              name="password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              required
              minLength={register ? 8 : undefined}
              maxLength={128}
            />
          </label>
          {register && (
            <label>
              {t("confirm_password_63dab")}
              <input
                name="confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
              />
            </label>
          )}
          {error && (
            <div role="alert" className="alert error">
              {tt(error)}
            </div>
          )}
          {message && (
            <div role="status" className="alert success">
              <CheckCircle2 size={17} />
              {tt(message)}
            </div>
          )}
          <button disabled={!!busy} className="button primary">
            {busy && busy !== "demo-login" ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <LockKeyhole size={17} />
            )}{" "}
            {register ? t("register_a9a9e") : t("sign_in_with_email_14f1b")}
          </button>
        </form>
        <div className="auth-bottom">
          {register ? (
            <>
              {t("already_have_an_account_4608c")}
              <Link href="/login">{t("citizen_login_aeb30")}</Link>
            </>
          ) : officer ? (
            <>
              {t("officer_accounts_are_provided_by_an_administrator_d5c3b")}{" "}
              <Link href="/login">{t("citizen_login_aeb30")}</Link>
            </>
          ) : (
            <>
              {t("new_here_18c7d")}
              <Link href="/register">{t("register_a9a9e")}</Link>
            </>
          )}
        </div>
        {register && (
          <small>
            {t("registration_is_citizen_only_email_confirmation_may_52bfb")}
          </small>
        )}
      </div>
    </div>
  );
}
