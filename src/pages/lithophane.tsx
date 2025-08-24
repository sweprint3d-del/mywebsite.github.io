import { useState, useRef } from "react";
import Layout from "../components/Layout";
import Image from "next/image";

export default function LithophaneOrder() {
  const [images, setImages] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("Sverige");
  const [phone, setPhone] = useState("");

  const imgInputRef = useRef<HTMLInputElement | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    setImages(Array.from(e.target.files));
  }

  async function submitOrder() {
    if (!name || !email || images.length !== 4) {
      alert("Fyll i namn, e-post och ladda upp exakt 4 bilder.");
      return;
    }
    if (!addressLine1 || !postalCode || !city) {
      alert("Fyll i adress, postnummer och ort.");
      return;
    }
    const formData = new FormData();
    formData.append("name", name);
    formData.append("email", email);

    formData.append("addressLine1", addressLine1);
    formData.append("addressLine2", addressLine2);
    formData.append("postalCode", postalCode);
    formData.append("city", city);
    formData.append("country", country);
    formData.append("phone", phone);

    images.forEach(img => formData.append("images", img));

    const res = await fetch("/api/lithophane", { method: "POST", body: formData });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(j.error || "Något gick fel. Försök igen.");
      return;
    }
    alert("Tack! Din beställning har skickats.");

    setName(""); setEmail(""); setImages([]);
    setAddressLine1(""); setAddressLine2(""); setPostalCode(""); setCity(""); setCountry("Sverige"); setPhone("");
    if (imgInputRef.current) imgInputRef.current.value = "";
  }

  return (
    <Layout>
      <section className="mx-auto max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Beställ Lithophane-lampa</h1>
        <img
          src="/lithophane-cube.jpg"
          alt="Exempel på lithophane-kub"
          className="rounded-xl shadow max-w-full"
        />
        <p className="mb-2">Ladda upp 4 bilder. Om de inte är kvadratiska beskärs de av oss.</p>
        <p className="mb-6">Fast pris: <span className="font-semibold">500 kr</span> (vit PLA, inkl. LED och strömbrytare).</p>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block mb-1 text-sm font-medium">Namn</label>
              <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">E-post</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block mb-1 text-sm font-medium">Adress</label>
              <input value={addressLine1} onChange={e => setAddressLine1(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div className="sm:col-span-2">
              <label className="block mb-1 text-sm font-medium">Adressrad 2 (valfritt)</label>
              <input value={addressLine2} onChange={e => setAddressLine2(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Postnummer</label>
              <input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Ort</label>
              <input value={city} onChange={e => setCity(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Land</label>
              <input value={country} onChange={e => setCountry(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
            <div>
              <label className="block mb-1 text-sm font-medium">Telefon (valfritt)</label>
              <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-xl border px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block mb-1 text-sm font-medium">Bilder (exakt 4)</label>
            <input ref={imgInputRef} type="file" accept="image/*" multiple onChange={handleFiles}
                   className="w-full rounded-xl border bg-white px-3 py-2 cursor-pointer" />
          </div>

          <button onClick={submitOrder}
                  className="rounded-xl bg-emerald-600 px-5 py-2.5 text-white hover:bg-emerald-700">
            Skicka beställning
          </button>
        </div>
      </section>
    </Layout>
  );
}