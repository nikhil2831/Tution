"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { Brand } from "@/components/brand";
import { send } from "@/components/http-client";
import styles from "./login.module.css";

export function Login() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await send("/api/session", { method: "POST", body: new FormData(event.currentTarget) });
      window.location.reload();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Sign-in failed. Try again.");
      setPending(false);
    }
  }

  return (
    <main className={styles.layout}>
      <section className={styles.formArea} aria-labelledby="sign-in-title">
        <header className={styles.brandRow}><Brand /></header>
        <div className={styles.formContent}>
          <h1 id="sign-in-title">Welcome back.</h1>
          <p className={styles.intro}>Sign in to your tuition workspace.</p>
          <form className={styles.form} aria-busy={pending} onSubmit={submit}>
            <div className={styles.field}>
              <label htmlFor="login-identifier">Email or User ID</label>
              <input id="login-identifier" name="identifier" type="text" autoComplete="username"
                autoCapitalize="none" spellCheck={false} placeholder="Enter your email or user ID" maxLength={254} required />
            </div>
            <div className={styles.field}>
              <label htmlFor="login-password">Password</label>
              <div className={styles.passwordField}>
                <input id="login-password" name="password" type={showPassword ? "text" : "password"}
                  autoComplete="current-password" placeholder="Enter your password" maxLength={128} required />
                <button type="button" aria-controls="login-password" onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
            {error && <p className="error" role="alert">{error}</p>}
            <button className={styles.submit} disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
          </form>
          <p className={styles.help}>Need an account? Contact your tuition administrator.</p>
        </div>
      </section>

      <figure className={styles.hero}>
        <Image
          src="/images/classroom-tutoring.png"
          alt="A teacher guiding three schoolchildren through a workbook exercise"
          width={1122}
          height={1402}
          sizes="(max-width: 760px) 100vw, (max-width: 1664px) 54vw, 864px"
          loading="eager"
          fetchPriority="high"
          className={styles.photo}
        />
        <figcaption className={styles.caption}>
          <p className={styles.heroTitle}>Ready for your next class.</p>
          <p>Check your schedule, find study materials, and keep up with homework.</p>
        </figcaption>
      </figure>
    </main>
  );
}
