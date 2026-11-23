export type Category = "schedule" | "materials" | "homework";
export type Notice = {
  id: number;
  category: Category;
  message: string;
  createdAt: string;
  readAt: string | null;
};
