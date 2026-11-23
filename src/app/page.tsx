import { Suspense } from "react";
import { Login } from "@/modules/auth/login";
import { currentUser } from "@/modules/auth/service";
import { WorkspaceClient } from "@/modules/workspace/workspace-client";
import { getWorkspace } from "@/modules/workspace/query";

async function Portal() {
  const user = await currentUser();
  if (!user) return <Login />;
  return <WorkspaceClient initial={await getWorkspace(user)} />;
}

export default function Home() {
  return <Suspense fallback={<main className="center-state" role="status">Opening your workspace…</main>}><Portal /></Suspense>;
}
