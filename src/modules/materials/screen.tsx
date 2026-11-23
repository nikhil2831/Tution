import { shortDate } from "@/components/dates";
import { Empty, SectionHeading } from "@/components/feedback";
import { Icon } from "@/components/icon";
import { MutationForm } from "@/components/mutation-form";
import type { Material } from "./model";

export function MaterialRow({ material }: { material: Material }) {
  return (
    <article className="record">
      <div className="record-main">
        <span className="tone-icon purple"><Icon name="materials" /></span>
        <div className="record-copy">
          <h3>{material.title}</h3>
          {material.description && <p>{material.description}</p>}
          <p>PDF · {material.fileSize < 1024 * 1024 ? Math.max(1, Math.round(material.fileSize / 1024)) + " KB" : (material.fileSize / (1024 * 1024)).toFixed(1) + " MB"} · {shortDate(material.createdAt)}</p>
        </div>
        <a href={"/api/files/material/" + material.id} className="button small" aria-label={"Download " + material.title}><Icon name="download" size={16} /> PDF</a>
      </div>
    </article>
  );
}

export function MaterialsScreen({ materials, teacher }: { materials: Material[]; teacher: boolean }) {
  return <>
    <SectionHeading title="Study materials" description="Download class notes and practice resources." />
    {teacher && <details className="composer"><summary><Icon name="plus" /> Upload material</summary>
      <MutationForm action="material-create" label="Publish material" reset>
        <label>Title<input name="title" maxLength={120} required /></label>
        <label>Description <span className="muted">(optional)</span><textarea name="description" maxLength={500} rows={3} /></label>
        <label>PDF file <span className="muted">(up to 5 MB)</span><input name="file" type="file" accept="application/pdf,.pdf" required /></label>
      </MutationForm>
    </details>}
    <section className="panel"><h2>Files</h2>
      {materials.length ? materials.map((material) => <MaterialRow key={material.id} material={material} />) : <Empty icon="materials">No study materials have been published.</Empty>}
    </section>
  </>;
}
