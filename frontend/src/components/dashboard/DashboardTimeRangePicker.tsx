import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  CalendarRange,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Globe2,
} from "lucide-react";
import type {
  DashboardRefreshInterval,
  DashboardTimePresetId,
  DashboardTimeRange,
} from "../../mocks/types/executiveKpi";
import {
  QUICK_TIME_PRESETS,
  REALTIME_PRESETS,
  RELATIVE_TIME_PRESETS,
} from "../../mocks/types/executiveKpi";
import {
  compactTriggerLabel,
  createCustomTimeRange,
  createTimeRangeFromPreset,
  dateInputValue,
  daysInMonth,
  formatDashboardDateTime,
  isRealtimePreset,
  isSameDay,
  normalizeCustomRange,
  parseDateInput,
  startOfMonthDate,
  timeInputValue,
  timezoneCaption,
} from "../../utils/dashboardTimeRange";
import styles from "./DashboardTimeRangePicker.module.css";

type Props = {
  value: DashboardTimeRange;
  onChange: (next: DashboardTimeRange) => void;
};

type SectionId =
  | "presets"
  | "relative"
  | "realtime"
  | "dateRange"
  | "dateTime"
  | "advanced";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const REFRESH_OPTIONS: Array<{ id: DashboardRefreshInterval; label: string }> = [
  { id: "off", label: "Off" },
  { id: "30s", label: "30 sec" },
  { id: "1m", label: "1 min" },
  { id: "5m", label: "5 min" },
];

function rangeDates(range: DashboardTimeRange): { start: Date; end: Date } {
  return { start: new Date(range.startIso), end: new Date(range.endIso) };
}

function Section({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <button
        type="button"
        className={styles.sectionHead}
        aria-expanded={open}
        onClick={() => onToggle(id)}
      >
        <span>{title}</span>
        <ChevronDown size={16} className={open ? styles.chevronOpen : styles.chevron} aria-hidden />
      </button>
      {open ? <div className={styles.sectionBody}>{children}</div> : null}
    </section>
  );
}

function DashboardTimeRangePicker({ value, onChange }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState(() =>
    startOfMonthDate(new Date(value.startIso)),
  );
  const [pickingEnd, setPickingEnd] = useState(false);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    presets: true,
    relative: false,
    realtime: false,
    dateRange: false,
    dateTime: false,
    advanced: false,
  });

  const syncDraftFromValue = (next: DashboardTimeRange) => {
    setDraft(next);
    setViewMonth(startOfMonthDate(new Date(next.startIso)));
    setPickingEnd(false);
    setError(null);
    setOpenSections({
      presets: true,
      relative: false,
      realtime: Boolean(next.realtime),
      dateRange: next.preset === "custom" && !next.realtime,
      dateTime: next.preset === "custom" && !next.realtime,
      advanced: false,
    });
  };

  const setPanelOpen = (nextOpen: boolean) => {
    if (nextOpen) syncDraftFromValue(value);
    setOpen(nextOpen);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const triggerLabel = useMemo(() => compactTriggerLabel(value), [value]);
  const draftDates = useMemo(() => rangeDates(draft), [draft]);
  const boundsPreview = useMemo(() => {
    const { start, end } = draftDates;
    return `${formatDashboardDateTime(start)}\n↓\n${formatDashboardDateTime(end)}`;
  }, [draftDates]);

  const toggleSection = (id: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const applyPreset = (preset: DashboardTimePresetId) => {
    const refreshInterval =
      isRealtimePreset(preset)
        ? draft.refreshInterval && draft.refreshInterval !== "off"
          ? draft.refreshInterval
          : "1m"
        : "off";
    setDraft(createTimeRangeFromPreset(preset, { refreshInterval }));
    setError(null);
    const bounds = createTimeRangeFromPreset(preset);
    setViewMonth(startOfMonthDate(new Date(bounds.startIso)));
    if (isRealtimePreset(preset)) {
      setOpenSections((prev) => ({ ...prev, realtime: true, presets: false }));
    }
  };

  const selectDay = (day: Date) => {
    const { start, end } = draftDates;
    const baseStart = pickingEnd ? start : day;
    const baseEnd = pickingEnd ? day : day;
    const next = normalizeCustomRange(
      new Date(
        baseStart.getFullYear(),
        baseStart.getMonth(),
        baseStart.getDate(),
        start.getHours(),
        start.getMinutes(),
        0,
        0,
      ),
      new Date(
        baseEnd.getFullYear(),
        baseEnd.getMonth(),
        baseEnd.getDate(),
        end.getHours(),
        end.getMinutes(),
        59,
        999,
      ),
    );
    setDraft(createCustomTimeRange(next.start, next.end, "off"));
    setPickingEnd(!pickingEnd);
    setError(null);
  };

  const updateDatePart = (which: "start" | "end", isoDate: string) => {
    const parsed = parseDateInput(isoDate);
    if (!parsed) return;
    const { start, end } = draftDates;
    const source = which === "start" ? start : end;
    const nextDate = new Date(
      parsed.getFullYear(),
      parsed.getMonth(),
      parsed.getDate(),
      source.getHours(),
      source.getMinutes(),
      which === "end" ? 59 : 0,
      which === "end" ? 999 : 0,
    );
    const next = normalizeCustomRange(
      which === "start" ? nextDate : start,
      which === "end" ? nextDate : end,
    );
    setDraft(createCustomTimeRange(next.start, next.end, "off"));
    setError(null);
  };

  const updateTimePart = (which: "start" | "end", time: string) => {
    const [hh, mm] = time.split(":").map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return;
    const { start, end } = draftDates;
    const source = which === "start" ? start : end;
    const nextDate = new Date(source);
    nextDate.setHours(hh, mm, which === "end" ? 59 : 0, which === "end" ? 999 : 0);
    const next = normalizeCustomRange(
      which === "start" ? nextDate : start,
      which === "end" ? nextDate : end,
    );
    setDraft(createCustomTimeRange(next.start, next.end, "off"));
    setError(null);
  };

  const onApply = () => {
    const { start, end } = rangeDates(draft);
    if (end.getTime() < start.getTime()) {
      setError("End must be after start.");
      return;
    }
    onChange(draft);
    setOpen(false);
  };

  const onReset = () => {
    setDraft(createTimeRangeFromPreset("today"));
    setError(null);
    setPickingEnd(false);
    setViewMonth(startOfMonthDate(new Date()));
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      setPanelOpen(true);
    }
  };

  const monthLabel = viewMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const calendarDays = useMemo(() => {
    const first = startOfMonthDate(viewMonth);
    const startPad = first.getDay();
    const total = daysInMonth(viewMonth);
    const cells: Date[] = [];
    for (let i = 0; i < startPad; i += 1) {
      const d = new Date(first);
      d.setDate(d.getDate() - (startPad - i));
      cells.push(d);
    }
    for (let day = 1; day <= total; day += 1) {
      cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day));
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    return cells;
  }, [viewMonth]);

  const shiftMonth = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + delta, 1));
  };

  const shiftYear = (delta: number) => {
    setViewMonth(new Date(viewMonth.getFullYear() + delta, viewMonth.getMonth(), 1));
  };

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setPanelOpen(!open)}
        onKeyDown={onTriggerKeyDown}
      >
        {value.realtime ? <span className={styles.liveDot} aria-hidden /> : null}
        <CalendarRange size={16} className={styles.triggerIcon} aria-hidden />
        <span className={styles.triggerLabel}>{triggerLabel}</span>
        <ChevronDown
          size={16}
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className={styles.panel}
          role="dialog"
          aria-label="Time range picker"
        >
          <div className={styles.panelHeader}>
            <h2>Time Range</h2>
            <span>{timezoneCaption()}</span>
          </div>

          <div className={styles.scroll}>
            <Section
              id="presets"
              title="Quick Presets"
              open={openSections.presets}
              onToggle={toggleSection}
            >
              <div className={styles.presetGrid}>
                {QUICK_TIME_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.presetBtn} ${
                      draft.preset === item.id ? styles.presetActive : ""
                    }`}
                    onClick={() => applyPreset(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section
              id="relative"
              title="Relative Time"
              open={openSections.relative}
              onToggle={toggleSection}
            >
              <div className={styles.presetGrid}>
                {RELATIVE_TIME_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.presetBtn} ${
                      draft.preset === item.id ? styles.presetActive : ""
                    }`}
                    onClick={() => applyPreset(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </Section>

            <Section
              id="realtime"
              title="Real-Time"
              open={openSections.realtime}
              onToggle={toggleSection}
            >
              <div className={styles.presetGrid}>
                {REALTIME_PRESETS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.presetBtn} ${
                      draft.preset === item.id ? styles.presetActive : ""
                    }`}
                    onClick={() => applyPreset(item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className={styles.advancedCard} style={{ marginTop: 10 }}>
                <h4>Auto-refresh every</h4>
                <div className={styles.refreshRow}>
                  {REFRESH_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`${styles.refreshChip} ${
                        (draft.refreshInterval ?? "off") === option.id
                          ? styles.refreshChipActive
                          : ""
                      }`}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          refreshInterval: option.id,
                          realtime:
                            option.id === "off"
                              ? isRealtimePreset(prev.preset)
                              : true,
                        }))
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>

            <Section
              id="dateRange"
              title="Date Range"
              open={openSections.dateRange}
              onToggle={toggleSection}
            >
              <div className={styles.customLayout}>
                <div className={styles.calendarCard}>
                  <div className={styles.calendarNav}>
                    <div className={styles.navCluster}>
                      <button
                        type="button"
                        className={styles.navBtn}
                        aria-label="Previous year"
                        onClick={() => shiftYear(-1)}
                      >
                        «
                      </button>
                      <button
                        type="button"
                        className={styles.navBtn}
                        aria-label="Previous month"
                        onClick={() => shiftMonth(-1)}
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                    <strong>{monthLabel}</strong>
                    <div className={styles.navCluster}>
                      <button
                        type="button"
                        className={styles.navBtn}
                        aria-label="Next month"
                        onClick={() => shiftMonth(1)}
                      >
                        <ChevronRight size={16} />
                      </button>
                      <button
                        type="button"
                        className={styles.navBtn}
                        aria-label="Next year"
                        onClick={() => shiftYear(1)}
                      >
                        »
                      </button>
                    </div>
                  </div>
                  <div className={styles.weekdays}>
                    {WEEKDAYS.map((day) => (
                      <span key={day}>{day}</span>
                    ))}
                  </div>
                  <div className={styles.days}>
                    {calendarDays.map((day) => {
                      const outside = day.getMonth() !== viewMonth.getMonth();
                      const selected =
                        isSameDay(day, draftDates.start) ||
                        isSameDay(day, draftDates.end);
                      const inRange =
                        day.getTime() > draftDates.start.getTime() &&
                        day.getTime() < draftDates.end.getTime();
                      return (
                        <button
                          key={day.toISOString()}
                          type="button"
                          className={[
                            styles.dayBtn,
                            outside ? styles.dayOutside : "",
                            selected ? styles.daySelected : "",
                            inRange ? styles.dayInRange : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          onClick={() => selectDay(day)}
                        >
                          {day.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={styles.timeCard}>
                  <h4>
                    <Clock3 size={14} style={{ marginInlineEnd: 6 }} />
                    Selected dates
                  </h4>
                  <label className={styles.field}>
                    Start Date
                    <input
                      type="date"
                      value={dateInputValue(draftDates.start)}
                      onChange={(event) =>
                        updateDatePart("start", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    End Date
                    <input
                      type="date"
                      value={dateInputValue(draftDates.end)}
                      onChange={(event) =>
                        updateDatePart("end", event.target.value)
                      }
                    />
                  </label>
                  <p className={styles.rangePreview}>{boundsPreview}</p>
                </div>
              </div>
            </Section>

            <Section
              id="dateTime"
              title="Date & Time Range"
              open={openSections.dateTime}
              onToggle={toggleSection}
            >
              <div className={styles.customLayout}>
                <div className={styles.timeCard}>
                  <h4>Start</h4>
                  <label className={styles.field}>
                    Start Date
                    <input
                      type="date"
                      value={dateInputValue(draftDates.start)}
                      onChange={(event) =>
                        updateDatePart("start", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    Start Time
                    <input
                      type="time"
                      value={timeInputValue(draftDates.start)}
                      onChange={(event) =>
                        updateTimePart("start", event.target.value)
                      }
                    />
                  </label>
                </div>
                <div className={styles.timeCard}>
                  <h4>End</h4>
                  <label className={styles.field}>
                    End Date
                    <input
                      type="date"
                      value={dateInputValue(draftDates.end)}
                      onChange={(event) =>
                        updateDatePart("end", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    End Time
                    <input
                      type="time"
                      value={timeInputValue(draftDates.end)}
                      onChange={(event) =>
                        updateTimePart("end", event.target.value)
                      }
                    />
                  </label>
                </div>
              </div>
              <p className={styles.rangePreview}>{boundsPreview}</p>
            </Section>

            <Section
              id="advanced"
              title="Advanced"
              open={openSections.advanced}
              onToggle={toggleSection}
            >
              <div className={styles.advancedCard}>
                <p className={styles.tzLine}>
                  <Globe2 size={16} aria-hidden />
                  Timezone · {timezoneCaption()}
                </p>
                <label className={styles.field}>
                  Display timezone
                  <select defaultValue="Asia/Riyadh" aria-label="Timezone">
                    <option value="Asia/Riyadh">UTC+03 Riyadh</option>
                    <option value="UTC">UTC</option>
                  </select>
                </label>
                <p className={styles.rangePreview}>
                  Current draft:{" "}
                  {draft.preset === "custom"
                    ? draft.label.replace(/\n/g, " ")
                    : draft.label}
                </p>
              </div>
            </Section>
          </div>

          <div className={styles.footer}>
            <span className={styles.footerHint}>
              {pickingEnd ? "Select end date" : "Select start date · Esc closes"}
            </span>
            <div className={styles.actions}>
              <button type="button" className={styles.ghostDark} onClick={onReset}>
                Reset
              </button>
              <button
                type="button"
                className={styles.secondaryDark}
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button type="button" className={styles.primaryDark} onClick={onApply}>
                Apply
              </button>
            </div>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

export default DashboardTimeRangePicker;
