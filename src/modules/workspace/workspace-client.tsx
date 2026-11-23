"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Brand } from "@/components/brand";
import { shortDate } from "@/components/dates";
import { Empty } from "@/components/feedback";
import { send } from "@/components/http-client";
import { Icon, type IconName } from "@/components/icon";
import { RefreshWorkspace } from "@/components/mutation-form";
import { HomeworkScreen } from "@/modules/homework/screen";
import { MaterialRow, MaterialsScreen } from "@/modules/materials/screen";
import { NoticeRow, NotificationsScreen } from "@/modules/notifications/screen";
import { ClassRow, ScheduleScreen } from "@/modules/scheduling/screen";
import type { Section, Workspace } from "./model";

const navigation: { key: Section; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "schedule", label: "Class schedule" },
  { key: "materials", label: "Study materials" },
  { key: "homework", label: "Homework" },
  { key: "notifications", label: "Notifications" },
];

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}
function currentSection() {
  const hash = window.location.hash.slice(1);
  return navigation.find(({ key }) => key === hash)?.key ?? "overview";
}
function initialSection(): Section { return "overview"; }

function Metric({ icon, title, value, tone }: { icon: IconName; title: string; value: number; tone: string }) {
  return <a href={"#" + icon} className="metric"><span className={"tone-icon " + tone}><Icon name={icon} /></span><span><strong>{value}</strong><span>{title}</span></span></a>;
}

function Overview({ data }: { data: Workspace }) {
  const teacher = data.user.role === "teacher";
  const upcoming = data.classes.filter((item) => item.endsAt > data.now);
  const submitted = new Set(data.submissions.map((item) => item.assignmentId));
  const pending = teacher ? data.submissions.filter((item) => !item.reviewedAt).length
    : data.assignments.filter((item) => item.dueAt > data.now && !submitted.has(item.id)).length;

  return <>
    <header className="welcome">
      <div>
        <p className="welcome-date"><Icon name="schedule" size={17} /> {shortDate(data.now)}</p>
        <h1>Welcome, {data.user.name.split(" ")[0]}.</h1>
        <p>{teacher ? "Manage your classes, materials, and student work." : "Keep track of your classes, materials, and homework."}</p>
      </div>
      <div className="welcome-art" aria-hidden="true"><Icon name="brand" size={138} /></div>
    </header>
    <div className="metrics">
      <Metric icon="schedule" title="Upcoming classes" value={upcoming.length} tone="green" />
      <Metric icon="homework" title={teacher ? "To review" : "Homework to do"} value={pending} tone="gold" />
      <Metric icon="materials" title="Study materials" value={data.materials.length} tone="purple" />
    </div>
    <div className="overview-grid">
      <section className="panel">
        <header className="panel-heading"><h2>Upcoming classes</h2><a href="#schedule" className="text-link">Full schedule</a></header>
        {upcoming.length ? upcoming.slice(0, 3).map((meeting) => <ClassRow key={meeting.id} meeting={meeting} />) : <Empty icon="schedule">No upcoming classes.</Empty>}
      </section>
      <section className="panel">
        <header className="panel-heading"><h2>Recent updates</h2><a href="#notifications" className="text-link">View all</a></header>
        {data.notifications.length ? data.notifications.slice(0, 3).map((notice) => <NoticeRow key={notice.id} notice={notice} compact />) : <Empty icon="notifications">No updates yet.</Empty>}
      </section>
    </div>
    {data.materials.length > 0 && <section className="panel">
      <header className="panel-heading"><h2>Latest study materials</h2><a href="#materials" className="text-link">View all</a></header>
      {data.materials.slice(0, 2).map((material) => <MaterialRow key={material.id} material={material} />)}
    </section>}
  </>;
}

export function WorkspaceClient({ initial }: { initial: Workspace }) {
  const section = useSyncExternalStore(subscribe, currentSection, initialSection);
  const [data, setData] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const refreshVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++refreshVersion.current;
    const response = await send("/api/workspace", { cache: "no-store" });
    const latest: Workspace = await response.json();
    if (version === refreshVersion.current) setData(latest);
  }, []);

  async function refreshFromButton() {
    setRefreshing(true);
    setError("");
    try { await refresh(); }
    catch (problem) { setError(problem instanceof Error ? problem.message : "Could not refresh."); }
    finally { setRefreshing(false); }
  }

  async function signOut() {
    setLoggingOut(true);
    setError("");
    try {
      await send("/api/session", { method: "DELETE" });
      window.location.replace("/");
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Could not sign out.");
      setLoggingOut(false);
    }
  }

  const teacher = data.user.role === "teacher";
  const initials = data.user.name.split(/\s+/).slice(0, 2).map((word) => word[0]).join("");
  return (
    <RefreshWorkspace.Provider value={refresh}>
      <div className="shell">
        <aside className="sidebar">
          <Brand />
          <nav aria-label="Workspace">
            {navigation.map(({ key, label }) => <a key={key} href={"#" + key} aria-current={section === key ? "page" : undefined}>
              <Icon name={key} /><span>{label}</span>
              {key === "notifications" && data.unread > 0 && <span className="nav-count">{data.unread}</span>}
            </a>)}
          </nav>
          <div className="sidebar-footer">
            <div className="profile"><span className="avatar">{initials}</span><span><strong>{data.user.name}</strong><small>{teacher ? "Teacher" : "Student"}</small></span></div>
            <button className="button flat" disabled={loggingOut} onClick={signOut}><Icon name="logout" size={18} /> {loggingOut ? "Signing out…" : "Sign out"}</button>
          </div>
        </aside>
        <main className="workspace">
          <div className="topbar"><span>{navigation.find(({ key }) => key === section)?.label}</span><button className="button small" disabled={refreshing} onClick={refreshFromButton}><Icon name="refresh" size={16} /> {refreshing ? "Refreshing…" : "Refresh"}</button></div>
          {error && <p className="error top-error" role="alert">{error}</p>}
          {section === "overview" && <Overview data={data} />}
          {section === "schedule" && <ScheduleScreen classes={data.classes} now={data.now} teacher={teacher} />}
          {section === "materials" && <MaterialsScreen materials={data.materials} teacher={teacher} />}
          {section === "homework" && <HomeworkScreen assignments={data.assignments} submissions={data.submissions} now={data.now} teacher={teacher} />}
          {section === "notifications" && <NotificationsScreen notifications={data.notifications} unread={data.unread} />}
        </main>
      </div>
    </RefreshWorkspace.Provider>
  );
}
