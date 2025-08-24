import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

const nav = [
  { href: "/bestall", label: "Beställ" },
  { href: "/lithophane", label: "Lithophane-lampa" },
  { href: "/om-kontakt", label: "Om & kontakt" },
  // { href: "/admin", label: "Admin" },
];

export default function Header() {
  const { pathname } = useRouter();
  return (
    <header className="sticky top-0 z-30 backdrop-blur bg-white/80 border-b">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Carl’s 3D‑verkstad" width={36} height={36} className="rounded-md" />
          <span className="font-semibold text-lg tracking-tight">Carl’s 3D‑verkstad</span>
        </Link>
        <nav className="flex items-center gap-1">
          {nav.map((n) => {
            const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href));
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`px-3 py-2 rounded-xl text-sm hover:bg-gray-100 ${active ? "bg-gray-100 font-medium" : "text-gray-700"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
