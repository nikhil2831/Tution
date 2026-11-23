import { calendarDay, calendarMonth, clockTime, indiaInput, shortDate } from "@/components/dates";
import { Empty, SectionHeading } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { MutationForm } from "@/components/mutation-form";
import type { ClassMeeting } from "./model";

function ClassForm({ meeting }: { meeting?: ClassMeeting }) {
  return (
    <MutationForm action="class-save" label={meeting ? "Save changes" : "Publish class"} dates={["starts", "ends"]} reset={!meeting}>
      {meeting && <input type="hidden" name="id" value={meeting.id} />}
      <label>Class title<input name="title" maxLength={120} required defaultValue={meeting?.title} /></label>
      <div className="field-pair">
        <label>Starts (IST)<input name="starts" type="datetime-local" required defaultValue={meeting && indiaInput(meeting.startsAt)} /></label>
        <label>Ends (IST)<input name="ends" type="datetime-local" required defaultValue={meeting && indiaInput(meeting.endsAt)} /></label>
      </div>
      <label>Location<input name="location" maxLength={240} placeholder="Online or classroom address" required defaultValue={meeting?.location} /></label>
      <label>Meeting link <span className="muted">(optional)</span><input name="meeting link" type="url" maxLength={800} placeholder="https://…" defaultValue={meeting?.meetingUrl ?? ""} /></label>
    </MutationForm>
  );
}

export function ClassRow({ meeting, teacher = false }: { meeting: ClassMeeting; teacher?: boolean }) {
  return (
    <article className="record class-record">
      <div className="record-main">
        <div className="date-tile"><strong>{calendarDay(meeting.startsAt)}</strong><span>{calendarMonth(meeting.startsAt)}</span></div>
        <div className="record-copy">
          <h3>{meeting.title}</h3>
          <p>{shortDate(meeting.startsAt)} · {clockTime(meeting.startsAt)} to {clockTime(meeting.endsAt)} IST</p>
          <p><Icon name="pin" size={15} />{meeting.location}</p>
        </div>
        {meeting.meetingUrl && <a className="button small" href={meeting.meetingUrl} target="_blank" rel="noreferrer">Join class</a>}
      </div>
      {teacher && <details className="inline-details"><summary>Edit class</summary><ClassForm meeting={meeting} /></details>}
    </article>
  );
}

export function ScheduleScreen({ classes, teacher, now }: { classes: ClassMeeting[]; teacher: boolean; now: string }) {
  const upcoming = classes.filter((meeting) => meeting.endsAt > now);
  const past = classes.filter((meeting) => meeting.endsAt <= now).reverse();
  return <>
    <SectionHeading title="Class schedule" description="Class times, meeting links, and locations." />
    {teacher && <details className="composer"><summary><Icon name="plus" /> Schedule a class</summary><ClassForm /></details>}
    <section className="panel"><h2>Upcoming classes</h2>
      {upcoming.length ? upcoming.map((meeting) => <ClassRow key={meeting.id} meeting={meeting} teacher={teacher} />) : <Empty icon="schedule">No upcoming classes.</Empty>}
    </section>
    {past.length > 0 && <section className="panel"><h2>Past classes</h2>{past.map((meeting) => <ClassRow key={meeting.id} meeting={meeting} teacher={teacher} />)}</section>}
  </>;
}
