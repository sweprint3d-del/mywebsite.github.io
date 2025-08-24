import { useEffect, useRef, useState } from "react";

const TEXTS: Record<string, string> = {
  PLA: "Snyggast finish. Fossilfri plast från förnyelsebara källor.",
  PETG: "Slag- och fukttåligt. Klarar högre temperaturer än PLA.",
  ABS: "Värmetåligt. Bra för bilar, maskiner och andra varma miljöer.",
  ASA: "Som ABS men UV-tåligt. Bäst utomhus.",
  TPU: "Flexibelt (gummi-likt). Packningar, skydd, dämpning.",
};

export default function MaterialInfo({ material }: { material: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("click", onDocClick);
    window.addEventListener("keydown", onEsc);
    return () => { window.removeEventListener("click", onDocClick); window.removeEventListener("keydown", onEsc); };
  }, []);

  const mat = (material || "").toUpperCase();
  const text = TEXTS[mat] ?? "Välj material efter användning.";

  return (
    <div ref={ref} className="relative inline-block align-middle ml-1">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border text-[10px] leading-none text-gray-600 hover:bg-gray-50"
        aria-label={`Info om ${mat}`}
        title="Kort materialinfo"
      >
        i
      </button>
      {open && (
        <div className="absolute z-40 mt-2 w-64 -left-1 rounded-xl border bg-white p-3 text-xs text-gray-700 shadow-lg">
          <div className="font-medium mb-1">{mat}</div>
          <p>{text}</p>
        </div>
      )}
    </div>
  );
}
