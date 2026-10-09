import { useState } from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type PeriodPreset = "1M" | "3M" | "6M" | "12M" | "all" | "custom";

export interface PeriodFilterState {
  preset: PeriodPreset;
  startDate?: string | undefined; // YYYY-MM-DD
  endDate?: string | undefined;   // YYYY-MM-DD
}

interface PeriodFilterProps {
  value: PeriodFilterState;
  onChange: (value: PeriodFilterState) => void;
  className?: string;
  showAllOption?: boolean;
}

export function isDateInPeriod(
  dateValue: string | Date | null | undefined,
  filter: PeriodFilterState
): boolean {
  if (!dateValue) return false;
  if (filter.preset === "all") return true;

  const targetDate = new Date(dateValue).getTime();
  if (isNaN(targetDate)) return false;

  const now = new Date();

  if (filter.preset === "1M") {
    const past = new Date(now);
    past.setDate(past.getDate() - 30);
    return targetDate >= past.getTime();
  }

  if (filter.preset === "3M") {
    const past = new Date(now);
    past.setDate(past.getDate() - 90);
    return targetDate >= past.getTime();
  }

  if (filter.preset === "6M") {
    const past = new Date(now);
    past.setDate(past.getDate() - 180);
    return targetDate >= past.getTime();
  }

  if (filter.preset === "12M") {
    const past = new Date(now);
    past.setDate(past.getDate() - 365);
    return targetDate >= past.getTime();
  }

  if (filter.preset === "custom") {
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      if (!isNaN(start) && targetDate < start) return false;
    }
    if (filter.endDate) {
      // Include the entire end day
      const end = new Date(filter.endDate);
      end.setHours(23, 59, 59, 999);
      if (!isNaN(end.getTime()) && targetDate > end.getTime()) return false;
    }
    return true;
  }

  return true;
}

export function PeriodFilter({
  value,
  onChange,
  className = "",
  showAllOption = true,
}: PeriodFilterProps) {
  const [customOpen, setCustomOpen] = useState(false);
  const [tempStart, setTempStart] = useState(value.startDate || "");
  const [tempEnd, setTempEnd] = useState(value.endDate || "");

  const presets: { id: PeriodPreset; label: string }[] = [
    { id: "1M", label: "1M" },
    { id: "3M", label: "3M" },
    { id: "6M", label: "6M" },
    { id: "12M", label: "12M" },
  ];

  if (showAllOption) {
    presets.push({ id: "all", label: "All Time" });
  }

  const handleSelectPreset = (preset: PeriodPreset) => {
    onChange({ preset });
  };

  const handleApplyCustom = () => {
    onChange({
      preset: "custom",
      startDate: tempStart || undefined,
      endDate: tempEnd || undefined,
    });
    setCustomOpen(false);
  };

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border">
        {presets.map((p) => {
          const isActive = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleSelectPreset(p.id)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                isActive
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p.label}
            </button>
          );
        })}

        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                value.preset === "custom"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarIcon className="size-3" />
              <span>
                {value.preset === "custom" && (value.startDate || value.endDate)
                  ? `${value.startDate ?? "..."} → ${value.endDate ?? "..."}`
                  : "Custom"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold text-foreground">Custom Date Range</span>
                <button
                  type="button"
                  onClick={() => setCustomOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">Start Date</label>
                  <Input
                    type="date"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground">End Date</label>
                  <Input
                    type="date"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => {
                    setTempStart("");
                    setTempEnd("");
                    onChange({ preset: "1M" });
                    setCustomOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleApplyCustom}
                >
                  Apply
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
