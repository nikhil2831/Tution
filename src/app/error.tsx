"use client";

export default function WorkspaceError({ reset }: { reset: () => void }) {
  return (
    <main className="center-state">
      <h1>Tuition Desk is unavailable</h1>
      <p>We couldn’t load your workspace. Try again in a moment.</p>
      <button className="button primary" onClick={reset}>Try again</button>
    </main>
  );
}
