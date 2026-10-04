import Link from "next/link";
import { slotLabel, visibleTradeLabel } from "@/lib/constants";
import { formatIsoDate } from "@/lib/dates";
import type { JobSummary } from "@/lib/desk";
import { StatusBadge } from "@/components/status-badge";

export function JobCard({ job }: { job: JobSummary }) {
  return (
    <Link href={`/jobs/${job.id}`} className="card block transition hover:border-ink">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-stone">
          {[visibleTradeLabel(job.trade), formatIsoDate(job.scheduledDate), slotLabel(job.timeSlot)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        <StatusBadge status={job.status} />
      </div>
      <h2 className="mt-1 font-display text-2xl leading-tight">{job.customerName}</h2>
      <p className="text-stone">{job.address}</p>
      <p className="mt-2 line-clamp-2">{job.description}</p>
      <p className="mt-3 text-sm font-bold">
        {job.materialCount === 0
          ? "No materials yet"
          : `${job.boughtCount} of ${job.materialCount} bought`}
        {" · "}
        {job.signed ? "Signed" : "Not signed"}
      </p>
    </Link>
  );
}
