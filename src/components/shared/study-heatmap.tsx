"use client";

interface HeatmapCell {
  date: string;
  minutes: number;
}

interface StudyHeatmapProps {
  data: HeatmapCell[];
  weeks?: number;
}

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function StudyHeatmap({ data, weeks = 20 }: StudyHeatmapProps) {
  // build a map of date -> minutes
  const dataMap = new Map<string, number>();
  for (const d of data) dataMap.set(d.date, d.minutes);

  // generate the grid: weeks (columns) × 7 days (rows)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cells: { date: string; minutes: number }[][] = [];

  // start from `weeks` weeks ago, aligned to Sunday
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (weeks * 7 - 1) - today.getDay());

  for (let w = 0; w < weeks; w++) {
    const week: { date: string; minutes: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const dateStr = date.toISOString().slice(0, 10);
      const isFuture = date > today;
      week.push({
        date: dateStr,
        minutes: isFuture ? -1 : (dataMap.get(dateStr) ?? 0),
      });
    }
    cells.push(week);
  }

  // determine month labels (show when week starts a new month)
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  cells.forEach((week, w) => {
    const firstDay = new Date(week[0].date + "T00:00:00");
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ week: w, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  });

  function colorFor(minutes: number): string {
    if (minutes < 0) return "transparent"; // future
    if (minutes === 0) return "var(--muted)";
    if (minutes < 30) return "color-mix(in oklch, var(--brand) 25%, var(--muted))";
    if (minutes < 60) return "color-mix(in oklch, var(--brand) 45%, var(--muted))";
    if (minutes < 120) return "color-mix(in oklch, var(--brand) 65%, var(--muted))";
    if (minutes < 180) return "color-mix(in oklch, var(--brand) 85%, var(--muted))";
    return "var(--brand)";
  }

  function tooltip(cell: { date: string; minutes: number }): string {
    if (cell.minutes < 0) return "";
    const d = new Date(cell.date + "T00:00:00");
    const dateStr = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    return cell.minutes > 0 ? `${dateStr}: ${cell.minutes}m` : `${dateStr}: no study`;
  }

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const studyDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div>
      {/* month labels */}
      <div className="mb-1.5 flex gap-[3px] pl-7 text-[10px] text-muted-foreground">
        {cells.map((_, w) => {
          const label = monthLabels.find((m) => m.week === w);
          return (
            <div key={w} className="w-[11px] sm:w-[13px]">
              {label ? label.label : ""}
            </div>
          );
        })}
      </div>

      <div className="flex gap-1.5">
        {/* day labels */}
        <div className="flex flex-col gap-[3px] pr-1 text-[9px] text-muted-foreground">
          {DAY_LABELS.map((d, i) => (
            <div key={i} className="h-[11px] leading-[11px] sm:h-[13px] sm:leading-[13px]">{d}</div>
          ))}
        </div>

        {/* grid */}
        <div className="flex gap-[3px] overflow-x-auto no-scrollbar">
          {cells.map((week, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {week.map((cell, d) => (
                <div
                  key={d}
                  title={tooltip(cell)}
                  className="h-[11px] w-[11px] rounded-[2px] transition-all hover:ring-1 hover:ring-foreground/20 sm:h-[13px] sm:w-[13px]"
                  style={{ background: colorFor(cell.minutes) }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* legend + stats */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 30, 60, 120, 180].map((m) => (
            <div
              key={m}
              className="h-[11px] w-[11px] rounded-[2px]"
              style={{ background: colorFor(m) }}
            />
          ))}
          <span>More</span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          <span className="font-medium text-foreground">{studyDays}</span> study days · <span className="font-medium text-foreground">{Math.round(totalMinutes / 60)}h</span> total
        </div>
      </div>
    </div>
  );
}
