import { dateAndTime } from "@/components/dates";
import { Empty, SectionHeading } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { MutationForm } from "@/components/mutation-form";
import type { Assignment, Submission } from "./model";

function Review({ submission }: { submission: Submission }) {
  return (
    <div className="submission">
      <div className="review-label"><strong>{submission.studentName}</strong><span>{dateAndTime(submission.submittedAt)}</span></div>
      {submission.answer && <p className="preserve-lines">{submission.answer}</p>}
      {submission.fileName && <a className="text-link" href={"/api/files/submission/" + submission.id}>{submission.fileName}</a>}
      <MutationForm action="submission-review" label={submission.feedback ? "Update feedback" : "Send feedback"}>
        <input type="hidden" name="submission" value={submission.id} />
        <label>Feedback<textarea name="feedback" defaultValue={submission.feedback ?? ""} maxLength={1000} rows={3} required /></label>
      </MutationForm>
    </div>
  );
}

function StudentSubmission({ assignment, submission, closed }: { assignment: Assignment; submission?: Submission; closed: boolean }) {
  return <>
    {submission && <div className="submission">
      <strong>Your submission</strong>
      {submission.answer && <p className="preserve-lines">{submission.answer}</p>}
      {submission.fileName && <a className="text-link" href={"/api/files/submission/" + submission.id}>{submission.fileName}</a>}
      {submission.feedback && <div className="teacher-feedback"><strong>Teacher feedback</strong><p className="preserve-lines">{submission.feedback}</p></div>}
    </div>}
    {!closed && !submission?.reviewedAt && <MutationForm action="submission-save" label={submission ? "Update submission" : "Submit homework"}>
      <input type="hidden" name="assignment" value={assignment.id} />
      <label>Your answer<textarea name="answer" rows={4} defaultValue={submission?.answer} maxLength={4000} /></label>
      <label>{submission?.fileName ? "Replace PDF" : "Attach PDF"} <span className="muted">(optional, up to 5 MB)</span><input name="file" type="file" accept="application/pdf,.pdf" /></label>
      {submission?.fileName && <label className="checkbox"><input name="removeFile" type="checkbox" /> Remove existing attachment</label>}
    </MutationForm>}
    {closed && !submission && <p className="muted">The deadline has passed.</p>}
  </>;
}

export function HomeworkScreen({ assignments, submissions, teacher, now }: {
  assignments: Assignment[]; submissions: Submission[]; teacher: boolean; now: string;
}) {
  const byAssignment = new Map<number, Submission[]>();
  for (const submission of submissions) {
    const items = byAssignment.get(submission.assignmentId) ?? [];
    items.push(submission);
    byAssignment.set(submission.assignmentId, items);
  }

  return <>
    <SectionHeading title="Homework" description={teacher ? "Publish assignments and review student work." : "See deadlines, submit work, and read teacher feedback."} />
    {teacher && <details className="composer"><summary><Icon name="plus" /> Create assignment</summary>
      <MutationForm action="assignment-create" label="Publish assignment" dates={["due"]} reset>
        <label>Title<input name="title" maxLength={120} required /></label>
        <label>Instructions<textarea name="instructions" rows={4} maxLength={3000} required /></label>
        <label>Deadline (IST)<input name="due" type="datetime-local" required /></label>
      </MutationForm>
    </details>}
    <section className="panel"><h2>Assignments</h2>
      {assignments.length ? assignments.map((assignment) => {
        const responses = byAssignment.get(assignment.id) ?? [];
        const submission = responses[0];
        const closed = assignment.dueAt <= now;
        const status = teacher ? responses.length + (responses.length === 1 ? " submission" : " submissions")
          : submission?.reviewedAt ? "Reviewed" : submission ? "Submitted" : closed ? "Closed" : "To do";
        return <details className="assignment" key={assignment.id}>
          <summary>
            <span className="tone-icon gold"><Icon name="homework" /></span>
            <span className="record-copy"><strong>{assignment.title}</strong><span>Due {dateAndTime(assignment.dueAt)}</span></span>
            <span className={"tag " + (submission?.reviewedAt && !teacher ? "green" : "")}>{status}</span>
            <Icon name="chevron" size={16} />
          </summary>
          <div className="assignment-body">
            <p className="preserve-lines">{assignment.instructions}</p>
            {teacher
              ? responses.length ? responses.map((response) => <Review key={response.id} submission={response} />) : <p className="muted">No submissions yet.</p>
              : <StudentSubmission assignment={assignment} submission={submission} closed={closed} />}
          </div>
        </details>;
      }) : <Empty icon="homework">No homework has been published.</Empty>}
    </section>
  </>;
}
