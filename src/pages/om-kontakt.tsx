import Layout from "../components/Layout";

export default function OmKontakt() {
  return (
    <Layout>
      <section className="mx-auto max-w-2xl space-y-10">
        {/* 3D-printer section */}
        <div>
          <h1 className="text-3xl font-bold mb-4">Om tjänsten</h1>
          <img
            src="/printer.png"
            alt="BambuLab P1S 3D-skrivare"
            className="w-full rounded-2xl shadow mb-4"
          />
          <p className="mb-2">
            Jag använder en <strong>BambuLab P1S</strong> – en modern FDM-skrivare med
            byggvolym <strong>256 × 256 × 256 mm</strong>. Den levererar utskrifter med
            hög precision och pålitlighet.
          </p>
          <p className="mb-2">
            Tack vare <strong>AMS-systemet</strong> kan P1S skriva ut i upp till fyra
            färger eller material i samma utskrift. Det gör det möjligt att beställa
            projekt med flerfärgseffekter eller kombinationer av material.
          </p>
          <p>
            Maskinen är optimerad för vanliga material som PLA, PETG, ABS, ASA och TPU,
            och klarar även mer krävande geometrier med stödmaterial.
          </p>
        </div>

        {/* Business info */}
        <div>
          <h2 className="text-2xl font-semibold mb-3">Liten verksamhet</h2>
          <p className="mb-2">
            Detta är en liten, hobbybaserad verksamhet med begränsat lager. Produkterna
            tillverkas på beställning, vilket innebär att leveranstiden kan variera något
            beroende på kö och tillgänglighet av filament.
          </p>
          <p className="mb-2">
            Alla försändelser skickas via <strong>PostNord</strong> enligt deras
            prisband, och betalning sker enkelt via <strong>Swish</strong>.
          </p>
          <p>
            Målet är att erbjuda hög kvalitet och personlig service snarare än
            massproduktion.
          </p>
        </div>

        {/* Who am I */}
        <div>
          <h2 className="text-2xl font-semibold mb-3">Vem är jag?</h2>
          <img
            src="/carl.jpg"
            alt="Carl"
            className="w-32 h-32 rounded-full shadow mb-4"
          />
          <p className="mb-2">
            Jag som driver denna tjänst heter Carl och brinner för 3D-utskrifter,
            teknik och att hjälpa andra att förverkliga sina idéer.
          </p>
          <p>
            Har du frågor eller specialförfrågningar är du varmt välkommen att höra av
            dig på{" "}
            <a
              href="mailto:carl.1224@outlook.com"
              className="text-blue-600 underline"
            >
              carl.1224@outlook.com
            </a>
            .
          </p>
        </div>
      </section>
    </Layout>
  );
}
