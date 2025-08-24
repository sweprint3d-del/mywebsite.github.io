import { useRef, useState } from "react";
import Layout from "../components/Layout";
import ColorSelect from "../components/ColorSelect";
import type { ColorOption } from "../lib/colors";
import MaterialsInfo from "../components/MaterialsInfo";

type Breakdown = {
    grams: number;
    packagingGrams: number;
    materialCost: number;
    fileFee: number;
    baseFee: number;
    shipping: number;
    total: number;
    items: Array<{
      index: number;
      name: string;
      material: string;
      color: string;
      copies: number;
      gramsEach: number;
      gramsTotal: number;
      perGram: number;
      materialCost: number;
    }>;
  };
  
  

type CartItem = {
  id: string;
  file: File;
  name: string;
  material: string;
  color: string;
  copies: number;
  availColors: ColorOption[];
};

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function Home() {
  // cart
  const [items, setItems] = useState<CartItem[]>([]);
  const [materialDefault, setMaterialDefault] = useState("PLA");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // availability cache per material (so we don’t refetch repeatedly)
  const [colorsCache, setColorsCache] = useState<Record<string, ColorOption[]>>({});

  // pricing
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [busyQuote, setBusyQuote] = useState(false);
  const [busyOrder, setBusyOrder] = useState(false);

  // customer
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // shipping
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Sverige");
  const [phone, setPhone] = useState("");

  async function loadColorsFor(material: string): Promise<ColorOption[]> {
    const key = material.toUpperCase();
    if (colorsCache[key]) return colorsCache[key];
    const res = await fetch(`/api/availability?material=${encodeURIComponent(key)}`);
    const list = res.ok ? ((await res.json()) as ColorOption[]) : [];
    setColorsCache((m) => ({ ...m, [key]: list }));
    return list;
  }

  // add files → one cart item per file
  async function onFilesChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const colors = await loadColorsFor(materialDefault);
    const defaultColor = colors[0]?.value || "white";
    const newItems: CartItem[] = files.map((f) => ({
      id: uid(),
      file: f,
      name: f.name,
      material: materialDefault,
      color: defaultColor,
      copies: 1,
      availColors: colors,
    }));
    setItems((prev) => [...prev, ...newItems]);
    setBreakdown(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((x) => x.id !== id));
    setBreakdown(null);
  }
  function duplicateItem(id: string) {
    setItems((prev) => {
      const src = prev.find((x) => x.id === id);
      if (!src) return prev;
      const copy: CartItem = {
        ...src,
        id: uid(),
        file: new File([src.file], src.file.name, { type: src.file.type }),
      };
      return [...prev, copy];
    });
    setBreakdown(null);
  }
  async function changeItemMaterial(id: string, material: string) {
    const colors = await loadColorsFor(material);
    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              material,
              availColors: colors,
              color: colors.some((c) => c.value === it.color) ? it.color : colors[0]?.value || "white",
            }
          : it
      )
    );
    setBreakdown(null);
  }
  function changeItemColor(id: string, color: string) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, color } : it)));
    setBreakdown(null);
  }
  function changeCopies(id: string, copies: number) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, copies: Math.max(1, copies) } : it)));
    setBreakdown(null);
  }

  const uniqueFileCount = items.length;

  async function doQuote() {
    if (items.length === 0) {
      alert("Lägg till minst en STL/OBJ-fil först.");
      return;
    }
    setBusyQuote(true);
    try {
      const form = new FormData();
      for (const it of items) form.append("files", it.file);
      form.append(
        "itemsMeta",
        JSON.stringify(
          items.map((it) => ({
            name: it.name,
            material: it.material,
            color: it.color,
            copies: it.copies,
          }))
        )
      );
      const res = await fetch("/api/quote", { method: "POST", body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.error || "Kunde inte beräkna pris.");
        return;
      }
      setBreakdown(j.breakdown as Breakdown);
    } finally {
      setBusyQuote(false);
    }
  }

  async function submitOrder() {
    if (!name || !email || !addressLine1 || !postalCode || !city) {
      alert("Fyll i namn, e-post, adress, postnummer och ort.");
      return;
    }
    if (items.length === 0) {
      alert("Lägg till minst en STL/OBJ-fil först.");
      return;
    }
    setBusyOrder(true);
    try {
      const form = new FormData();
      form.append("name", name);
      form.append("email", email);
      form.append("addressLine1", addressLine1);
      form.append("addressLine2", addressLine2);
      form.append("postalCode", postalCode);
      form.append("city", city);
      form.append("country", country);
      form.append("phone", phone);
      for (const it of items) form.append("files", it.file);
      form.append(
        "itemsMeta",
        JSON.stringify(
          items.map((it) => ({
            name: it.name,
            material: it.material,
            color: it.color,
            copies: it.copies,
          }))
        )
      );
      const res = await fetch("/api/order", { method: "POST", body: form });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.error || "Något gick fel. Försök igen.");
        return;
      }
      setBreakdown(j.breakdown || null);
      alert(`Tack! Din beställning har skickats.${j.orderNumber ? `\nOrdernummer: ${j.orderNumber}` : ""}`);

      // reset
      setItems([]);
      setBreakdown(null);
      setName("");
      setEmail("");
      setAddressLine1("");
      setAddressLine2("");
      setPostalCode("");
      setCity("");
      setCountry("Sverige");
      setPhone("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } finally {
      setBusyOrder(false);
    }
  }

  return (
    <Layout>
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Beställ 3D-utskrift</h1>
          <p className="mt-2 text-gray-600">
            Ladda upp STL/OBJ, välj material & färg <em>per fil</em>, och få en prisuppskattning direkt innan du fyller i
            leveransuppgifter.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: Files/cart + customer form (two separate cards) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Upload + default material + quote button */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">
                    Lägg till 3D-filer (STL/OBJ, max 100 MB per fil)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".stl,.obj"
                    multiple
                    onChange={onFilesChosen}
                    className="w-full cursor-pointer rounded-xl border bg-white px-3 py-2"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Varje extra fil lägger till 10 kr (kopior räknas inte som extra filer).
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">
                    Standardmaterial för nya uppladdningar
                    <MaterialsInfo material={materialDefault} />
                  </label>
                  <select
                    value={materialDefault}
                    onChange={(e) => setMaterialDefault(e.target.value)}
                    className="w-full rounded-xl border bg-white px-3 py-2"
                  >
                    <option>PLA</option>
                    <option>PETG</option>
                    <option>ABS</option>
                    <option>ASA</option>
                    <option>TPU</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Item list */}
            <div className="rounded-2xl border bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Dina objekt</h2>
              {items.length === 0 ? (
                <p className="text-sm text-gray-600">Inga filer tillagda ännu. Lägg till filer ovan.</p>
              ) : (
                <div className="space-y-3">
                  {items.map((it, idx) => (
                    <div key={it.id} className="rounded-xl border p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">{it.name}</div>
                          <div className="text-xs text-gray-500">Objekt #{idx + 1}</div>
                        </div>
                        <button
                          onClick={() => duplicateItem(it.id)}
                          className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          Duplicera
                        </button>
                        <button
                          onClick={() => removeItem(it.id)}
                          className="rounded-lg border px-2 py-1 text-sm hover:bg-gray-50"
                        >
                          Ta bort
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium flex items-center">
                            Material
                            <MaterialsInfo material={it.material} />
                          </label>
                          <select
                            value={it.material}
                            onChange={(e) => changeItemMaterial(it.id, e.target.value)}
                            className="w-full rounded-xl border bg-white px-3 py-2"
                          >
                            <option>PLA</option>
                            <option>PETG</option>
                            <option>ABS</option>
                            <option>ASA</option>
                            <option>TPU</option>
                          </select>
                        </div>
                        <div>
                          <ColorSelect
                            value={it.color}
                            onChange={(v) => changeItemColor(it.id, v)}
                            options={it.availColors}
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-sm font-medium">Kopior</label>
                          <input
                            type="number"
                            min={1}
                            value={it.copies}
                            onChange={(e) => changeCopies(it.id, parseInt(e.target.value || "1", 10))}
                            className="w-full rounded-xl border px-3 py-2"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <button
                  onClick={doQuote}
                  disabled={items.length === 0 || busyQuote}
                  className="rounded-xl bg-black px-5 py-2.5 text-white hover:bg-black/90 disabled:opacity-60"
                >
                  {busyQuote ? "Beräknar…" : "Beräkna pris"}
                </button>
              </div>
            </div>

            {/* Customer + shipping + submit */}
            <div className="rounded-2xl border bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-3">Kund- & leveransuppgifter</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium">Namn</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">E-post</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Adress</label>
                  <input
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Gata och nummer"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-medium">Adressrad 2 (valfritt)</label>
                  <input
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                    placeholder="Lgh, c/o, etc."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Postnummer</label>
                  <input
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Ort</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Land</label>
                  <input
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Telefon (valfritt)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={submitOrder}
                  disabled={items.length === 0 || busyOrder}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {busyOrder ? "Skickar…" : "Skicka beställning"}
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Receipt */}
          <aside className="rounded-2xl border bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Kvitto</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Antal filer</span>
                <span>{items.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Totala kopior</span>
                <span>{items.reduce((s, i) => s + i.copies, 0)}</span>
              </div>
            </div>

            {breakdown ? (
                <div className="mt-4 text-sm">
                    <div className="rounded-lg border p-3 bg-gray-50">
                    {breakdown.items.map((it) => (
                        <div key={it.index} className="py-2 border-b last:border-0">
                        <div className="flex justify-between">
                            <span className="truncate mr-2">{it.name}</span>
                            <span className="text-gray-600">
                            {it.material} / {it.color} × {it.copies}
                            </span>
                        </div>
                        <div className="flex justify-between text-xs text-gray-600">
                            <span>
                            {it.gramsEach} g per kopia · {it.perGram} kr/g
                            </span>
                            <span>{it.materialCost} kr</span>
                        </div>
                        </div>
                    ))}
                    </div>

                    <div className="mt-4 space-y-1">
                    <div className="flex justify-between">
                        <span>Startavgift</span>
                        <span>{breakdown.baseFee} kr</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Material</span>
                        <span>{breakdown.materialCost} kr</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Filavgift</span>
                        <span>{breakdown.fileFee} kr</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Frakt (inkl. ~{breakdown.packagingGrams} g emballage)</span>
                        <span>{breakdown.shipping} kr</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-2">
                        <span>Totalt</span>
                        <span>{breakdown.total} kr</span>
                    </div>
                    </div>
                </div>
                ) : (
                <p className="mt-4 text-sm text-gray-600">
                    Använd “Beräkna pris” ovan för att se en detaljerad kostnadsuppdelning.
                </p>
                )}
          </aside>
        </div>
      </section>
    </Layout>
  );
}
