import { useState, useRef, useEffect } from "react";
import type { ColorOption } from "../lib/colors";
import { ALL_COLORS } from "../lib/colors";

export default function ColorSelect({
  value,
  onChange,
  label = "Färg",
  options, // optional override from API (availability)
}: {
  value?: string;
  onChange: (v: string) => void;
  label?: string;
  options?: ColorOption[];
}) {
  const COLORS = options && options.length > 0 ? options : ALL_COLORS;

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = COLORS.find(c => c.value === value) ?? COLORS[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // Ensure selected value is valid if options change
  useEffect(() => {
    if (!COLORS.some(c => c.value === value)) onChange(COLORS[0]?.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(COLORS)]);

  return (
    <div ref={ref} className="w-full">
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full inline-flex items-center justify-between rounded-xl border bg-white px-3 py-2 text-left shadow-sm hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: current?.hex }} />
          {current?.label ?? "—"}
        </span>
        <svg className="h-4 w-4 opacity-60" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.25a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
      </button>

      {open && (
        <div className="mt-2 max-h-64 w-full overflow-auto rounded-xl border bg-white p-2 shadow-lg">
          {COLORS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => { onChange(c.value); setOpen(false); }}
              className={`w-full flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-gray-50 ${c.value === current?.value ? "ring-2 ring-black/10" : ""}`}
            >
              <span className="h-4 w-4 rounded-full border" style={{ backgroundColor: c.hex }} />
              <span className="text-sm">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
