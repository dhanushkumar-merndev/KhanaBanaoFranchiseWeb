import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { SmoothScroll } from "@/components/motion/smooth-scroll";

/**
 * Route group — the URLs stay /privacy and /terms. It exists so both legal
 * pages get the public header, footer and Lenis smooth scrolling without
 * either page repeating them.
 */
export default function LegalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <SmoothScroll />
      <Header />
      {children}
      <Footer />
    </>
  );
}
