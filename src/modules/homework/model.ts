export type Assignment = {
  id: number;
  title: string;
  instructions: string;
  dueAt: string;
};
export type Submission = {
  id: number;
  assignmentId: number;
  studentName: string;
  answer: string;
  fileName: string | null;
  submittedAt: string;
  feedback: string | null;
  reviewedAt: string | null;
};
