import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactAction } from "@/components/contact/contact-action";
import { Leaf } from "@/components/decor/leaf";
import {
  FacebookIcon,
  InstagramIcon,
  WhatsappIcon,
  YoutubeIcon,
} from "@/components/landing/icons";
import { images, nav, site } from "@/lib/site";

const socialLinks = [
  { label: "Instagram", href: site.socials.instagram, Icon: InstagramIcon },
  { label: "Facebook", href: site.socials.facebook, Icon: FacebookIcon },
  { label: "YouTube", href: site.socials.youtube, Icon: YoutubeIcon },
  { label: "WhatsApp", href: site.whatsappHref, Icon: WhatsappIcon },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-canvas pt-14">
      <Leaf src="/decor/leaf-sprig.svg" className="right-[10%] top-2 w-16 md:w-28" speed={0.1} rotate={-14} sway opacity={0.75} />
      <Leaf src="/decor/cloche.svg" className="bottom-14 right-[3%] w-24 md:w-40" speed={-0.06} opacity={0.45} desktopOnly />
      <Leaf src="/decor/leaf-mint.svg" className="bottom-24 left-[1%] w-9 md:w-14" speed={0.12} rotate={18} sway swayDelay={0.8} desktopOnly />

      <div className="shell relative grid gap-10 pb-12 md:grid-cols-[1.4fr_1fr_1.2fr]">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images.logo}
            alt={`${site.name} — ${site.tagline}`}
            width={images.logoWidth}
            height={images.logoHeight}
            loading="lazy"
            decoding="async"
            className="h-12 w-auto"
          />
          <p className="mt-4 max-w-sm text-[0.88rem] leading-relaxed text-ink-soft">
            Premium event, wedding and corporate catering experiences — crafted
            with passion, delivered with perfection.
          </p>
          <ul className="mt-5 flex gap-2.5">
            {socialLinks.map(({ label, href, Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-red to-brand-crimson text-white shadow-[0_8px_18px_-10px_rgba(193,39,45,0.9)] transition hover:-translate-y-0.5 hover:from-brand-crimson hover:to-brand-maroon"
                >
                  <Icon className="size-4" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <nav aria-labelledby="footer-links">
          <h2
            id="footer-links"
            className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink"
          >
            Quick Links
          </h2>
          <ul className="mt-4 space-y-2.5">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="text-[0.88rem] text-ink-soft transition hover:text-brand-crimson"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
            Contact Us
          </h2>
          <ul className="mt-4 space-y-3 text-[0.88rem] text-ink-soft">
            <li>
              <ContactAction
                kind="phone"
                className="flex items-center gap-2.5 transition hover:text-brand-crimson"
              >
                <Phone className="size-4 shrink-0 text-brand-red" strokeWidth={1.8} />
                {site.phone}
              </ContactAction>
            </li>
            <li>
              <ContactAction
                kind="email"
                className="flex items-center gap-2.5 transition hover:text-brand-crimson"
              >
                <Mail className="size-4 shrink-0 text-brand-red" strokeWidth={1.8} />
                {site.email}
              </ContactAction>
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="size-4 shrink-0 text-brand-red" strokeWidth={1.8} />
              {site.location}
            </li>
          </ul>

          <ul className="mt-5 flex gap-4 text-[0.82rem] text-ink-soft">
            <li>
              <Link href="/privacy" className="transition hover:text-brand-crimson">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="transition hover:text-brand-crimson">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/login" className="transition hover:text-brand-crimson">
                Partner Login
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="relative bg-brand-maroon-dark py-3.5 text-center">
        <p className="text-[0.8rem] text-white/70">
          © {new Date().getFullYear()} {site.legalName}. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
