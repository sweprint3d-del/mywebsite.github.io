import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 sm:grid-cols-3">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Carl’s 3D‑verkstad" width={32} height={32} className="rounded-md" />
          <div>
            <div className="font-semibold">Carl’s 3D‑verkstad</div>
            <div className="text-sm text-gray-500">3D‑utskrifter på beställning</div>
          </div>
        </div>

        <div className="text-sm text-gray-700">
          <div><span className="font-medium">E‑post:</span> <a className="underline" href="mailto:carl.1224@outlook.com">carl.1224@outlook.com</a></div>
          <div className="mt-1">Frakt med PostNord. Betalning via Swish efter bekräftad order.</div>
          <div className="mt-1">Liten verkstad – begränsat lager och färgutbud.</div>
        </div>

        <div className="text-sm text-gray-600 sm:text-right">
          <div>&copy; {year} Carl’s 3D‑verkstad</div>
          <div className="mt-1">
            <Link href="/om-kontakt" className="underline">Om & kontakt</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
