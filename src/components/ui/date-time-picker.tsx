"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Calendar, Clock, X } from "lucide-react";

// ─── helpers ─────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/** Parse a "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" string into a Date or null */
function parseValue(value: string, dateOnly?: boolean): Date | null {
  if (!value) return null;
  if (dateOnly && value.includes("-")) {
    const cleanVal = value.split("T")[0];
    const [y, m, d] = cleanVal.split("-").map(Number);
    const localDate = new Date(y, m - 1, d);
    return isNaN(localDate.getTime()) ? null : localDate;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date into "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" */
function toInputValue(d: Date, dateOnly?: boolean): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (dateOnly) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

/** Format a Date for the display trigger button */
function formatDisplay(d: Date, dateOnly?: boolean): string {
  const dateStr = d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  if (dateOnly) return dateStr;
  return dateStr + " · " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// ─── component ────────────────────────────────────────────────────────────────

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: Date;
  dateOnly?: boolean;
  align?: "top" | "bottom";
  dropdownAlign?: "left" | "right";
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  className = "",
  minDate,
  dateOnly = false,
  align = "bottom",
  dropdownAlign = "left",
}: DateTimePickerProps) {
  const current = parseValue(value, dateOnly);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"date" | "time">("date");

  // Calendar navigation state
  const [viewYear, setViewYear] = useState(current ? current.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(current ? current.getMonth() : new Date().getMonth());

  // Selected date/time working copies
  const [selDate, setSelDate] = useState<number | null>(current ? current.getDate() : null);
  const [selMonth, setSelMonth] = useState<number>(current ? current.getMonth() : new Date().getMonth());
  const [selYear, setSelYear] = useState<number>(current ? current.getFullYear() : new Date().getFullYear());
  const [selHour, setSelHour] = useState<number>(current ? current.getHours() : 0);
  const [selMinute, setSelMinute] = useState<number>(current ? current.getMinutes() : 0);

  const ref = useRef<HTMLDivElement>(null);

  // Sync internal state when external value changes
  useEffect(() => {
    const d = parseValue(value, dateOnly);
    if (d) {
      setSelDate(d.getDate());
      setSelMonth(d.getMonth());
      setSelYear(d.getFullYear());
      setSelHour(d.getHours());
      setSelMinute(d.getMinutes());
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value, dateOnly]);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = useCallback((
    date: number, month: number, year: number, hour: number, minute: number
  ) => {
    const d = new Date(year, month, date, hour, minute);
    onChange(toInputValue(d, dateOnly));
  }, [onChange, dateOnly]);

  const handleDayClick = (day: number, month: number, year: number) => {
    setSelDate(day);
    setSelMonth(month);
    setSelYear(year);
    commit(day, month, year, selHour, selMinute);
    if (!dateOnly) {
      setTab("time"); // auto-switch to time tab
    } else {
      setOpen(false); // close dropdown if date-only
    }
  };

  const handleTimeChange = (hour: number, minute: number) => {
    setSelHour(hour);
    setSelMinute(minute);
    if (selDate !== null) commit(selDate, selMonth, selYear, hour, minute);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const clear = () => {
    setSelDate(null);
    onChange("");
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  // Days from previous month to fill first row
  const leadingDays = Array.from({ length: firstDay }, (_, i) => ({
    day: prevMonthDays - firstDay + i + 1,
    type: "prev" as const,
  }));
  // Days in current month
  const currentDays = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    type: "current" as const,
  }));
  // Trailing days to fill grid to a multiple of 7
  const total = leadingDays.length + currentDays.length;
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  const trailingDays = Array.from({ length: trailing }, (_, i) => ({
    day: i + 1,
    type: "next" as const,
  }));

  const allDays = [...leadingDays, ...currentDays, ...trailingDays];

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
  };
  const isSelected = (day: number, month: number, year: number) =>
    selDate === day && selMonth === month && selYear === year;

  const isDisabled = (day: number, month: number, year: number) => {
    if (!minDate) return false;
    const d = new Date(year, month, day);
    const min = new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());
    return d < min;
  };

  // Hours/minutes options
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`
          w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left
          transition-all duration-150
          ${open
            ? "border-zari bg-white shadow-[0_0_0_3px_rgba(180,148,60,0.12)]"
            : "border-line bg-white hover:border-zari/50"
          }
          ${current ? "text-ink" : "text-taupe"}
        `}
      >
        <Calendar size={15} className={current ? "text-zari" : "text-muted"} />
        <span className="flex-1 truncate font-medium">
          {current ? formatDisplay(current, dateOnly) : (placeholder === "Select date & time" && dateOnly ? "Select date" : placeholder)}
        </span>
        {current && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); clear(); }}
            className="text-muted hover:text-danger p-0.5 rounded hover:bg-danger/10 transition-colors"
          >
            <X size={13} />
          </span>
        )}
      </button>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div className={`absolute z-50 ${align === "top" ? "bottom-full mb-2" : "top-full mt-2"} ${dropdownAlign === "right" ? "right-0" : "left-0"} w-[320px] bg-white rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.14)] border border-line overflow-hidden`}>
          {/* Header */}
          <div className="bg-ink text-ivory px-4 pt-4 pb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-ivory/50 mb-1">
              {dateOnly ? "Select Date" : tab === "date" ? "Select Date" : "Select Time"}
            </p>
            <p className="text-lg font-bold font-display">
              {selDate != null
                ? `${MONTHS[selMonth].slice(0, 3)} ${String(selDate).padStart(2, "0")}, ${selYear}`
                : "—"}
              {!dateOnly && tab === "time" && selDate != null && (
                <span className="ml-2 text-zari">
                  {String(selHour).padStart(2, "0")}:{String(selMinute).padStart(2, "0")}
                </span>
              )}
            </p>

            {/* Tab switcher */}
            {!dateOnly && (
              <div className="flex gap-1 mt-3">
                {(["date", "time"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide transition-all
                      ${tab === t ? "bg-zari text-white" : "bg-white/10 text-ivory/70 hover:bg-white/20"}`}
                  >
                    {t === "date" ? <Calendar size={11} /> : <Clock size={11} />}
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── DATE TAB ── */}
          {tab === "date" && (
            <div className="p-3">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={prevMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-taupe hover:text-ink"
                >
                  <ChevronLeft size={15} />
                </button>
                <div className="flex items-center gap-1">
                  <select
                    value={viewMonth}
                    onChange={(e) => setViewMonth(Number(e.target.value))}
                    className="text-xs font-bold text-ink bg-transparent hover:bg-cream/80 px-1 py-0.5 rounded cursor-pointer outline-none border border-line/20 hover:border-line transition-all"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                    className="text-xs font-bold text-ink bg-transparent hover:bg-cream/80 px-1 py-0.5 rounded cursor-pointer outline-none border border-line/20 hover:border-line transition-all"
                  >
                    {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={nextMonth}
                  className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-cream transition-colors text-taupe hover:text-ink"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_SHORT.map((d) => (
                  <div key={d} className="text-center text-[10px] font-bold text-muted py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7 gap-y-0.5">
                {allDays.map(({ day, type }, idx) => {
                  const m = type === "prev" ? (viewMonth === 0 ? 11 : viewMonth - 1)
                    : type === "next" ? (viewMonth === 11 ? 0 : viewMonth + 1)
                    : viewMonth;
                  const y = type === "prev" ? (viewMonth === 0 ? viewYear - 1 : viewYear)
                    : type === "next" ? (viewMonth === 11 ? viewYear + 1 : viewYear)
                    : viewYear;

                  const selected = isSelected(day, m, y);
                  const today = isToday(day, m, y);
                  const disabled = isDisabled(day, m, y);
                  const other = type !== "current";

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDayClick(day, m, y)}
                      className={`
                        relative h-8 w-full flex items-center justify-center rounded-full text-[12px] font-semibold
                        transition-all duration-100
                        ${selected
                          ? "bg-ink text-ivory font-bold shadow-sm"
                          : today
                          ? "bg-zari/15 text-zari-deep ring-1 ring-zari/30"
                          : other
                          ? "text-muted hover:bg-cream/80"
                          : disabled
                          ? "text-muted/30 cursor-not-allowed"
                          : "text-ink hover:bg-cream"
                        }
                      `}
                    >
                      {day}
                      {today && !selected && (
                        <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-zari" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-line mt-2">
                <button
                  type="button"
                  onClick={clear}
                  className="text-[11px] text-taupe hover:text-danger font-bold transition-colors"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    handleDayClick(now.getDate(), now.getMonth(), now.getFullYear());
                    setViewMonth(now.getMonth());
                    setViewYear(now.getFullYear());
                  }}
                  className="text-[11px] text-zari-deep font-bold hover:underline transition-colors"
                >
                  Today
                </button>
              </div>
            </div>
          )}

          {/* ── TIME TAB ── */}
          {tab === "time" && (
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Hours */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Hour</p>
                  <div className="grid grid-cols-4 gap-1 max-h-[180px] overflow-y-auto scrollbar-hide pr-0.5">
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleTimeChange(h, selMinute)}
                        className={`
                          h-8 rounded-lg text-[12px] font-bold transition-all duration-100
                          ${selHour === h
                            ? "bg-ink text-ivory shadow-sm"
                            : "bg-cream/60 text-ink hover:bg-cream"
                          }
                        `}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes */}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Minute</p>
                  <div className="grid grid-cols-3 gap-1 max-h-[180px] overflow-y-auto scrollbar-hide pr-0.5">
                    {minutes.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleTimeChange(selHour, m)}
                        className={`
                          h-8 rounded-lg text-[12px] font-bold transition-all duration-100
                          ${selMinute === m
                            ? "bg-ink text-ivory shadow-sm"
                            : "bg-cream/60 text-ink hover:bg-cream"
                          }
                        `}
                      >
                        :{String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Current selection display */}
              <div className="mt-4 bg-cream/50 rounded-xl p-3 flex items-center justify-between">
                <div className="text-xs text-taupe font-medium">
                  {selDate != null
                    ? `${MONTHS[selMonth].slice(0, 3)} ${String(selDate).padStart(2, "0")}, ${selYear}`
                    : "No date selected"}
                </div>
                <div className="text-base font-bold text-ink font-display">
                  {String(selHour).padStart(2, "0")}:{String(selMinute).padStart(2, "0")}
                </div>
              </div>

              {/* Done button */}
              <button
                type="button"
                disabled={selDate === null}
                onClick={() => setOpen(false)}
                className="mt-3 w-full bg-ink hover:bg-ink/90 disabled:bg-muted/30 text-ivory py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
