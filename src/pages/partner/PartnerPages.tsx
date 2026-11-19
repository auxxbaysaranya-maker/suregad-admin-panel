import { useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Check, Loader2, MapPin, PauseCircle, PlayCircle, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { api } from "../../lib/api";
import { useList } from "../../lib/panels";
import { cn, titleCase } from "../../lib/utils";
import { Badge, Card, Empty } from "../../components/ui";
import { PageHeader } from "../../components/PanelShell";

interface JobsPayload {
  partner: { verificationStatus: string; paused?: boolean; serviceRadiusKm?: number };
  jobs: { _id: string; number: string; status: string; productTitle?: string; city?: string; appointmentAt?: string; offerExpiresAt?: string }[];
}

const OPEN = ["accepted", "scheduled", "in_progress"];

export function PartnerJobsPage() {
  const data = useList<JobsPayload>("jobs", "/partner/jobs");
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const partner = data.data?.partner;
  const jobs = data.data?.jobs || [];
  const approved = partner?.verificationStatus === "approved";

  async function act(id: string, action: "accept" | "reject") {
    setBusy(id + action);
    try {
      await api.post(`/partner/jobs/${id}/${action}`, action === "reject" ? { reason: "Unavailable" } : {});
      await client.invalidateQueries({ queryKey: ["jobs"] });
    } finally {
      setBusy("");
    }
  }
  async function togglePause() {
    setBusy("pause");
    try {
      await api.patch("/partner/availability", { paused: !partner?.paused });
      await client.invalidateQueries({ queryKey: ["jobs"] });
    } finally {
      setBusy("");
    }
  }

  const groups = [
    { title: "New offers", rows: jobs.filter((job) => job.status === "offered") },
    { title: "In progress", rows: jobs.filter((job) => OPEN.includes(job.status)) },
    { title: "Completed and past", rows: jobs.filter((job) => job.status !== "offered" && !OPEN.includes(job.status)) },
  ];

  return (
    <div>
      <PageHeader
        title="Inspection jobs"
        description="Accept jobs near you, book the visit, and file the checklist report."
        actions={
          partner ? (
            <button type="button" disabled={busy === "pause"} onClick={() => void togglePause()} className={cn("inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 transition", partner.paused ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-white text-ink ring-line hover:ring-brand-300")}>
              {partner.paused ? <PlayCircle size={16} /> : <PauseCircle size={16} />} {partner.paused ? "Resume new jobs" : "Pause new jobs"}
            </button>
          ) : null
        }
      />

      {partner ? (
        <div className={cn("mb-6 flex items-start gap-3 rounded-[22px] p-4 ring-1", approved ? "bg-emerald-50 ring-emerald-200" : "bg-amber-50 ring-amber-200")}>
          {approved ? <ShieldCheck className="mt-0.5 shrink-0 text-emerald-700" size={20} /> : <ShieldAlert className="mt-0.5 shrink-0 text-amber-700" size={20} />}
          <div className="text-[14px]">
            <p className={cn("font-semibold", approved ? "text-emerald-900" : "text-amber-900")}>
              {approved ? "Your partner profile is approved" : `Profile ${titleCase(partner.verificationStatus)}`}
            </p>
            <p className="text-muted">
              {approved
                ? `You receive offers for buyers within ${partner.serviceRadiusKm ?? 15} km${partner.paused ? " — currently paused" : ""}.`
                : "Jobs are offered once the SureGad team approves your profile."}
            </p>
          </div>
        </div>
      ) : null}

      {data.isLoading ? <div className="skeleton h-40 rounded-3xl" /> : null}
      {data.isError ? <Empty title="No partner profile" body="Sign up as a partner to receive inspection jobs." /> : null}
      {data.isSuccess && !jobs.length ? <Empty title="No jobs yet" body="Approved partners get a job when a buyer pays for an inspection inside their service area." /> : null}

      <div className="space-y-8">
        {groups.filter((group) => group.rows.length).map((group) => (
          <section key={group.title}>
            <h2 className="mb-3 text-[20px]">{group.title} <span className="font-sans text-[14px] font-medium text-muted">({group.rows.length})</span></h2>
            <div className="grid gap-3 md:grid-cols-2">
              {group.rows.map((job) => (
                <Card key={job._id} className="flex flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{job.productTitle || job.number}</p>
                      <p className="mt-1 flex items-center gap-1 text-[13px] text-muted"><MapPin size={13} /> {job.city || "City not listed"} · {job.number}</p>
                    </div>
                    <Badge tone={job.status === "offered" ? "amber" : OPEN.includes(job.status) ? "blue" : "slate"}>{titleCase(job.status)}</Badge>
                  </div>
                  {job.appointmentAt ? (
                    <p className="flex items-center gap-1.5 text-[13px] text-ink-soft"><CalendarClock size={14} /> {new Date(job.appointmentAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                  ) : null}
                  {job.status === "offered" ? (
                    <div className="mt-auto grid grid-cols-2 gap-2">
                      <button type="button" disabled={Boolean(busy)} onClick={() => void act(job._id, "accept")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-gradient py-2.5 text-[13px] font-semibold text-white shadow-glow disabled:opacity-60">
                        {busy === job._id + "accept" ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Accept
                      </button>
                      <button type="button" disabled={Boolean(busy)} onClick={() => void act(job._id, "reject")} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white py-2.5 text-[13px] font-semibold ring-1 ring-line hover:ring-red-200 disabled:opacity-60">
                        {busy === job._id + "reject" ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />} Decline
                      </button>
                    </div>
                  ) : OPEN.includes(job.status) ? (
                    <Link to={`/partner/jobs/${job._id}`} className="mt-auto inline-flex items-center justify-center rounded-full bg-ink py-2.5 text-[13px] font-semibold text-white">Open job</Link>
                  ) : null}
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
