import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type Slide = { src: string; alt?: string; caption?: string };

type Props = {
  // Kan vara strängar eller Slide-objekt
  images: Array<string | Slide>;
  intervalMs?: number;
  aspect?: number; // w/h
  fit?: "cover" | "contain";
};

export default function Slideshow({
  images,
  intervalMs = 7000,
  aspect = 16 / 9,
  fit = "contain",
}: Props) {
  // Normalisera till {src, alt, caption}
  const slides: Slide[] = images
    .map((it) =>
      typeof it === "string" ? { src: it } : { src: it.src, alt: it.alt, caption: it.caption }
    )
    .filter((s) => !!s.src);

  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  const many = slides.length > 1;
  const next = () => setIndex((p) => (p + 1) % slides.length);
  const prev = () => setIndex((p) => (p - 1 + slides.length) % slides.length);

  useEffect(() => {
    if (!many) return;
    timerRef.current = window.setTimeout(next, intervalMs);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [index, slides.length, intervalMs, many]);

  if (slides.length === 0) {
    return (
      <div className="rounded-2xl border bg-gray-50 p-6 text-center text-sm text-gray-600">
        Inga bilder hittades i <code>/public/slide/</code>.
      </div>
    );
  }

  return (
    <figure className="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
      {/* Aspect keeper */}
      <div style={{ paddingTop: `${100 / aspect}%` }} className="relative">
        {/* TRACK — ingen hårdkodad bredd; varje slide min-w-full */}
        <div
          className="absolute inset-0 flex h-full transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={`${s.src}-${i}`} className="relative min-w-full h-full">
              <Image
                src={s.src}
                alt={s.alt || s.caption || ""}
                fill
                sizes="(min-width: 1280px) 1024px, 100vw"
                className={fit === "contain" ? "object-contain bg-black" : "object-cover"}
                priority={i === 0}
              />
            </div>
          ))}
        </div>

        {many && (
          <>
            <button
              onClick={() => { if (timerRef.current) window.clearTimeout(timerRef.current); prev(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 shadow hover:bg-white"
              aria-label="Föregående"
            >
              ←
            </button>
            <button
              onClick={() => { if (timerRef.current) window.clearTimeout(timerRef.current); next(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/80 px-3 py-2 shadow hover:bg-white"
              aria-label="Nästa"
            >
              →
            </button>
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full ${i === index ? "bg-black/80" : "bg-black/20"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Caption under bilden */}
      {(slides[index]?.caption || slides[index]?.alt) && (
        <figcaption className="border-t bg-white/70 backdrop-blur-sm px-4 py-3 text-center text-sm text-gray-700">
          {slides[index].caption || slides[index].alt}
        </figcaption>
      )}
    </figure>
  );
}
