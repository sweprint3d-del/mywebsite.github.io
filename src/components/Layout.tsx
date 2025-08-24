import Head from "next/head";
import Header from "./Header";
import Footer from "./Footer";

type Props = { title?: string; children: React.ReactNode };

export default function Layout({ title, children }: Props) {
  const pageTitle = title ? `${title} – Carl’s 3D‑verkstad` : "Carl’s 3D‑verkstad";
  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content="3D‑utskrifter på beställning i Sverige – Carl’s 3D‑verkstad" />
        <link rel="icon" href="/logo.png" />
      </Head>
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
        <Header />
        <main className="px-4 sm:px-6 lg:px-8 py-10">{children}</main>
        <Footer />
      </div>
    </>
  );
}
