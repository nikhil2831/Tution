"use client";

import { createContext, useContext, useState, type FormEvent, type ReactNode } from "react";
import { indiaToUtc } from "./dates";
import { send } from "./http-client";

export const RefreshWorkspace = createContext<() => Promise<void>>(async () => {});

export function MutationForm({ action, label, children, dates = [], reset = false, compact = false }: {
  action: string;
  label: string;
  children?: ReactNode;
  dates?: string[];
  reset?: boolean;
  compact?: boolean;
}) {
  const refresh = useContext(RefreshWorkspace);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState({ error: false, text: "" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("action", action);
    setPending(true);
    setMessage({ error: false, text: "" });
    try {
      for (const field of dates) {
        const value = data.get(field);
        if (typeof value !== "string" || !value) throw new Error("Choose a valid date and time.");
        data.set(field, indiaToUtc(value));
      }
      await send("/api/workspace", { method: "POST", body: data });
      if (reset) form.reset();
      try {
        await refresh();
        setMessage({ error: false, text: compact ? "" : "Saved." });
      } catch {
        setMessage({ error: true, text: "Saved. Use Refresh to see the latest changes." });
      }
    } catch (problem) {
      setMessage({ error: true, text: problem instanceof Error ? problem.message : "Could not save. Try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={compact ? "compact-form" : "form-stack"} onSubmit={submit}>
      {children}
      <button className={compact ? "button small" : "button primary"} disabled={pending}>{pending ? "Saving…" : label}</button>
      {message.text && <p className={message.error ? "error" : "success"} role={message.error ? "alert" : "status"}>{message.text}</p>}
    </form>
  );
}
