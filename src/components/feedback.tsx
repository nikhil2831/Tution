import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

export function Empty({ icon, children }: { icon: IconName; children: ReactNode }) {
  return <div className="empty"><Icon name={icon} size={24} /><p>{children}</p></div>;
}

export function SectionHeading({ title, description }: { title: string; description: string }) {
  return <header className="section-heading"><h1>{title}</h1><p>{description}</p></header>;
}
