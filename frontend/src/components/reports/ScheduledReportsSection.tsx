import { useEffect, useId, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CalendarClock,
  Mail,
  Pause,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type {
  EnterpriseReportType,
  ReportClassification,
  ScheduleFrequency,
  ScheduledReport,
} from "../../mocks/types/reports";
import {
  ENTERPRISE_REPORT_TYPES,
  REPORT_CLASSIFICATIONS,
} from "../../mocks/types/reports";
import {
  SCHEDULE_FREQUENCIES,
  createScheduledReport,
  deleteScheduledReport,
  listScheduledReports,
  updateScheduledReport,
} from "../../mocks/services/reportService";
import Button from "../common/Button";
import StatusBadge from "../ui/StatusBadge";
import styles from "./ScheduledReportsSection.module.css";

interface ScheduledReportsSectionProps {
  onToast?: (message: string) => void;
}

function statusTone(
  status: ScheduledReport["status"]
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "Active") return "success";
  if (status === "Paused") return "warning";
  if (status === "Failed") return "danger";
  return "neutral";
}

export default function ScheduledReportsSection({
  onToast,
}: ScheduledReportsSectionProps) {
  const [tick, setTick] = useState(0);
  const schedules = useMemo(() => listScheduledReports(), [tick]);
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const [form, setForm] = useState({
    name: "",
    reportType: "Executive Report" as EnterpriseReportType,
    frequency: "Monthly" as ScheduleFrequency,
    recipients: "",
    notificationsEnabled: true,
    emailDeliveryEnabled: true,
    nextRun: "2026-08-01",
    classification: "Confidential" as ReportClassification,
    owner: "GRCx Platform",
  });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const refresh = () => setTick((t) => t + 1);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return;
    createScheduledReport({
      name: form.name.trim(),
      reportType: form.reportType,
      frequency: form.frequency,
      recipients: form.recipients
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      notificationsEnabled: form.notificationsEnabled,
      emailDeliveryEnabled: form.emailDeliveryEnabled,
      nextRun: form.nextRun,
      classification: form.classification,
      owner: form.owner,
    });
    setOpen(false);
    setForm((f) => ({ ...f, name: "", recipients: "" }));
    refresh();
    onToast?.("Scheduled report created.");
  };

  return (
    <section className={styles.section} aria-labelledby="scheduled-title">
      <div className={styles.head}>
        <div>
          <h2 id="scheduled-title">Scheduled Reports</h2>
          <p>Automate PDF delivery without leaving the Reporting Center.</p>
        </div>
        <Button variant="primary" onClick={() => setOpen(true)}>
          <Plus size={16} aria-hidden />
          New Schedule
        </Button>
      </div>

      <div className={styles.grid}>
        {schedules.length === 0 ? (
          <div className={styles.empty}>No scheduled reports yet.</div>
        ) : (
          schedules.map((item) => (
            <article key={item.id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.reportType}</p>
                </div>
                <StatusBadge label={item.status} tone={statusTone(item.status)} />
              </div>
              <dl className={styles.meta}>
                <div>
                  <dt>Frequency</dt>
                  <dd>{item.frequency}</dd>
                </div>
                <div>
                  <dt>Next Run</dt>
                  <dd>{item.nextRun}</dd>
                </div>
                <div>
                  <dt>Owner</dt>
                  <dd>{item.owner}</dd>
                </div>
                <div>
                  <dt>Classification</dt>
                  <dd>{item.classification}</dd>
                </div>
              </dl>
              <div className={styles.flags}>
                <span>
                  <Bell size={14} aria-hidden />
                  Notifications {item.notificationsEnabled ? "On" : "Off"}
                </span>
                <span>
                  <Mail size={14} aria-hidden />
                  Email {item.emailDeliveryEnabled ? "On" : "Off"}
                </span>
              </div>
              <p className={styles.recipients}>
                Recipients: {item.recipients.join(", ") || "—"}
              </p>
              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => {
                    updateScheduledReport(item.id, {
                      status: item.status === "Active" ? "Paused" : "Active",
                    });
                    refresh();
                  }}
                >
                  {item.status === "Active" ? (
                    <Pause size={15} aria-hidden />
                  ) : (
                    <Play size={15} aria-hidden />
                  )}
                  {item.status === "Active" ? "Pause" : "Resume"}
                </button>
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => {
                    deleteScheduledReport(item.id);
                    refresh();
                    onToast?.("Schedule deleted.");
                  }}
                >
                  <Trash2 size={15} aria-hidden />
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div className={styles.overlay} onClick={() => setOpen(false)}>
              <form
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                onClick={(e) => e.stopPropagation()}
                onSubmit={submit}
              >
                <header className={styles.dialogHead}>
                  <div>
                    <h3 id={titleId}>Schedule Report</h3>
                    <p>
                      <CalendarClock size={14} aria-hidden /> Daily to yearly PDF
                      delivery
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.close}
                    aria-label="Close schedule dialog"
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} aria-hidden />
                  </button>
                </header>
                <div className={styles.dialogBody}>
                  <label>
                    Name
                    <input
                      required
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Report Type
                    <select
                      value={form.reportType}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          reportType: e.target.value as EnterpriseReportType,
                        }))
                      }
                    >
                      {ENTERPRISE_REPORT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Frequency
                    <select
                      value={form.frequency}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          frequency: e.target.value as ScheduleFrequency,
                        }))
                      }
                    >
                      {SCHEDULE_FREQUENCIES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Classification
                    <select
                      value={form.classification}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          classification: e.target
                            .value as ReportClassification,
                        }))
                      }
                    >
                      {REPORT_CLASSIFICATIONS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Next Run
                    <input
                      type="date"
                      value={form.nextRun}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nextRun: e.target.value }))
                      }
                    />
                  </label>
                  <label>
                    Recipients (comma-separated)
                    <input
                      value={form.recipients}
                      placeholder="cro@grcx.local, audit@grcx.local"
                      onChange={(e) =>
                        setForm((f) => ({ ...f, recipients: e.target.value }))
                      }
                    />
                  </label>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={form.notificationsEnabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          notificationsEnabled: e.target.checked,
                        }))
                      }
                    />
                    Enable Notifications
                  </label>
                  <label className={styles.check}>
                    <input
                      type="checkbox"
                      checked={form.emailDeliveryEnabled}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          emailDeliveryEnabled: e.target.checked,
                        }))
                      }
                    />
                    Enable Email Delivery
                  </label>
                </div>
                <footer className={styles.dialogFoot}>
                  <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary">
                    Create Schedule
                  </Button>
                </footer>
              </form>
            </div>,
            document.body
          )
        : null}
    </section>
  );
}
