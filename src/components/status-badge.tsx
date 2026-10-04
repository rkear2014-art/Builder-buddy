import { STATUS_LABELS, statusClass, type JobStatus } from "@/lib/constants";

export function StatusBadge({ status }: { status: JobStatus }) {
  return <span className={statusClass(status)}>{STATUS_LABELS[status]}</span>;
}
