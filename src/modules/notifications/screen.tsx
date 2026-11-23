import { dateAndTime } from "@/components/dates";
import { Empty, SectionHeading } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { MutationForm } from "@/components/mutation-form";
import type { Notice } from "./model";

export function NoticeRow({ notice, compact = false }: { notice: Notice; compact?: boolean }) {
  return (
    <article className="record">
      <div className="record-main">
        <span className={"tone-icon " + (notice.category === "materials" ? "purple" : notice.category === "homework" ? "gold" : "green")}><Icon name={notice.category} /></span>
        <div className="record-copy"><h3>{notice.message}</h3><p>{dateAndTime(notice.createdAt)}</p></div>
        {!notice.readAt && !compact && <MutationForm action="notification-read" label="Mark read" compact><input name="id" type="hidden" value={notice.id} /></MutationForm>}
        {!notice.readAt && compact && <span className="unread-dot" aria-label="Unread" role="img" />}
      </div>
    </article>
  );
}

export function NotificationsScreen({ notifications, unread }: { notifications: Notice[]; unread: number }) {
  return <>
    <SectionHeading title="Notifications" description="Updates about classes, study materials, and homework." />
    <section className="panel">
      <header className="panel-heading"><h2>{unread ? unread + " unread" : "Recent updates"}</h2>
        {unread > 0 && <MutationForm action="notifications-read" label="Mark all read" compact />}
      </header>
      {notifications.length ? notifications.map((notice) => <NoticeRow key={notice.id} notice={notice} />) : <Empty icon="notifications">You’re all caught up.</Empty>}
    </section>
  </>;
}
