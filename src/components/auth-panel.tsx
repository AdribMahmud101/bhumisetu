"use client";
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
        <h1>{officer ? "প্রশাসনিক প্রবেশ" : "নাগরিক কর্নার"}</h1>
        <p>
          {officer
            ? "নথি পর্যালোচনা, অডিট ইতিহাস ও নামজারি সিদ্ধান্ত—একটি কর্মক্ষেত্রে।"
            : "জমির রেকর্ড খুঁজুন, দলিল মিলিয়ে দেখুন এবং প্রমাণসহ রিপোর্ট বুঝে নিন।"}
        </p>
        <div>
          <ShieldCheck />
          {officer
            ? "অফিসার অনুমতি সার্ভারে যাচাই করা হয়"
            : "প্রকাশিত ভূমি রেকর্ডে সহজ প্রবেশ"}
        </div>
        <div>
          <History />
          {officer
            ? "প্রতিটি সংশোধনের সংরক্ষিত ইতিহাস"
            : "উৎস নথিসহ জমির ইতিহাস"}
        </div>
        <div>
          <LockKeyhole />
          নিরাপদ লগইন ও পৃথক প্রবেশাধিকার
        </div>
        <div className="auth-role-links">
          <Link className={!officer ? "current" : ""} href="/login">
            নাগরিক লগইন
          </Link>
          <Link className={officer ? "current" : ""} href="/admin/login">
            প্রশাসনিক লগইন
          </Link>
        </div>
      </section>
      <div className="login-form">
        <span className="kicker">
          {register
            ? "CITIZEN REGISTRATION"
            : officer
              ? "OFFICER ACCESS"
              : "CITIZEN ACCESS"}
        </span>
        <h2>
          {register
            ? "নাগরিক অ্যাকাউন্ট তৈরি করুন"
            : officer
              ? "অফিসার হিসেবে প্রবেশ করুন"
              : "নাগরিক হিসেবে প্রবেশ করুন"}
        </h2>
        <p>
          {register
            ? "ইমেইল ও পাসওয়ার্ড দিয়ে নিবন্ধন করুন।"
            : "বিচারকদের জন্য এক ক্লিকে ডেমো, অথবা নিজের অ্যাকাউন্টে লগইন।"}
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
              {officer ? "এক ক্লিকে অফিসার ডেমো" : "এক ক্লিকে নাগরিক ডেমো"}
              <ArrowRight size={16} />
            </button>
            <small className="demo-explanation">
              কোনো পাসওয়ার্ড লাগবে না · শেয়ার করা কাল্পনিক ডেমো অ্যাকাউন্ট
              {officer ? " · বাস্তব তথ্য নয়" : ""}
            </small>
            <div className="auth-divider">
              <span>অথবা ইমেইল দিয়ে লগইন</span>
            </div>
          </>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            if (register && values.get("password") !== values.get("confirm")) {
              setError("পাসওয়ার্ড দুটি মিলছে না / Passwords do not match");
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
                আপনার নাম
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
            ইমেইল
            <input
              name="email"
              type="email"
              autoComplete="username"
              required
              maxLength={254}
            />
          </label>
          <label>
            পাসওয়ার্ড
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
              পাসওয়ার্ড নিশ্চিত করুন
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
              {error}
            </div>
          )}
          {message && (
            <div role="status" className="alert success">
              <CheckCircle2 size={17} />
              {message}
            </div>
          )}
          <button disabled={!!busy} className="button primary">
            {busy && busy !== "demo-login" ? (
              <Loader2 className="spin" size={17} />
            ) : (
              <LockKeyhole size={17} />
            )}{" "}
            {register ? "নিবন্ধন করুন" : "ইমেইল দিয়ে লগইন"}
          </button>
        </form>
        <div className="auth-bottom">
          {register ? (
            <>
              অ্যাকাউন্ট আছে? <Link href="/login">নাগরিক লগইন</Link>
            </>
          ) : officer ? (
            <>
              অফিসার অ্যাকাউন্ট প্রশাসক প্রদান করেন।{" "}
              <Link href="/login">নাগরিক লগইন</Link>
            </>
          ) : (
            <>
              নতুন ব্যবহারকারী? <Link href="/register">নিবন্ধন করুন</Link>
            </>
          )}
        </div>
        {register && (
          <small>
            নিবন্ধন শুধু নাগরিকের জন্য। ইমেইল নিশ্চিতকরণ প্রয়োজন হতে পারে; কোনো
            অফিসার অনুমতি দেওয়া হয় না।
          </small>
        )}
      </div>
    </div>
  );
}
