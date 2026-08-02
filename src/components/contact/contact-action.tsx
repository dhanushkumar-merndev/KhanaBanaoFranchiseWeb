"use client";

import { useEffect, useState } from "react";
import { Mail, Phone } from "lucide-react";
import QRCode from "qrcode";
import { WhatsappIcon } from "@/components/landing/icons";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { site } from "@/lib/site";
import { cn } from "@/lib/utils";

type ContactKind = "phone" | "email";
type PhoneMethod = "call" | "whatsapp";

type ContactActionProps = Omit<
  React.ComponentProps<"a">,
  "href" | "target" | "rel"
> & {
  kind: ContactKind;
  value?: string;
  whatsapp?: string | null;
};

function isMobileContactDevice() {
  if (typeof window === "undefined") return false;

  return (
    window.matchMedia("(max-width: 767px)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

function phoneHref(value: string) {
  return `tel:${value.trim().replace(/[^\d+]/g, "")}`;
}

function whatsappHref(value: string) {
  return `https://wa.me/${value.replace(/\D/g, "")}`;
}

export function ContactAction({
  kind,
  value,
  whatsapp,
  children,
  className,
  onClick,
  ...props
}: ContactActionProps) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [phoneMethod, setPhoneMethod] = useState<PhoneMethod>("call");
  const [qrCode, setQrCode] = useState<{
    href: string;
    dataUrl?: string;
    error?: boolean;
  } | null>(null);

  const phoneValue = kind === "phone" && value ? value : site.phone;
  const emailValue = kind === "email" && value ? value : site.email;
  const callHref = value ? phoneHref(phoneValue) : site.phoneHref;
  const emailHref = `mailto:${emailValue}`;
  const chatHref =
    value || whatsapp
      ? whatsappHref(whatsapp || phoneValue)
      : site.whatsappHref;
  const href = kind === "phone" ? callHref : emailHref;
  const qrHref =
    kind === "email"
      ? emailHref
      : phoneMethod === "call"
        ? callHref
        : chatHref;
  const activeQrCode = qrCode?.href === qrHref ? qrCode : null;

  useEffect(() => {
    if (!open || mobile) return;

    let cancelled = false;

    QRCode.toDataURL(qrHref, {
      width: 280,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#6D0D12", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrCode({ href: qrHref, dataUrl: url });
      })
      .catch(() => {
        if (!cancelled) setQrCode({ href: qrHref, error: true });
      });

    return () => {
      cancelled = true;
    };
  }, [mobile, open, qrHref]);

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const isMobile = isMobileContactDevice();

    // Email clients can be opened immediately on phones. Desktop visitors get
    // a QR code so they can continue from the device where email is set up.
    if (kind === "email" && isMobile) return;

    event.preventDefault();
    setMobile(isMobile);
    setPhoneMethod("call");
    setOpen(true);
  }

  return (
    <>
      <a
        href={href}
        className={className}
        onClick={handleClick}
        aria-haspopup="dialog"
        {...props}
      >
        {children}
      </a>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {kind === "email"
                ? "Email Khana Banao"
                : mobile
                  ? "Choose how to connect"
                  : "Connect with Khana Banao"}
            </DialogTitle>
            <DialogDescription>
              {mobile
                ? "Select an option and we’ll open it on your phone."
                : "Scan the QR code with your phone to continue."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="py-6">
            {mobile && kind === "phone" ? (
              <div className="grid gap-3">
                <DialogClose asChild>
                  <a
                    href={callHref}
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 text-left transition hover:border-brand-red/40 hover:bg-surface-muted"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-crimson text-white">
                      <Phone className="size-5" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">Call now</span>
                      <span className="text-sm text-ink-soft">{phoneValue}</span>
                    </span>
                  </a>
                </DialogClose>

                <DialogClose asChild>
                  <a
                    href={chatHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 text-left transition hover:border-[#25D366]/60 hover:bg-surface-muted"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#25D366] text-white">
                      <WhatsappIcon className="size-5" />
                    </span>
                    <span>
                      <span className="block font-semibold text-ink">WhatsApp</span>
                      <span className="text-sm text-ink-soft">Start a conversation</span>
                    </span>
                  </a>
                </DialogClose>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                {kind === "phone" && (
                  <div
                    className="mb-5 grid w-full grid-cols-2 gap-1 rounded-xl bg-surface-muted p-1"
                    aria-label="QR code contact method"
                  >
                    <button
                      type="button"
                      onClick={() => setPhoneMethod("call")}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                        phoneMethod === "call"
                          ? "bg-white text-brand-crimson shadow-sm"
                          : "text-ink-soft hover:text-ink",
                      )}
                    >
                      <Phone className="size-4" aria-hidden="true" />
                      Phone
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhoneMethod("whatsapp")}
                      className={cn(
                        "inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
                        phoneMethod === "whatsapp"
                          ? "bg-white text-[#178a42] shadow-sm"
                          : "text-ink-soft hover:text-ink",
                      )}
                    >
                      <WhatsappIcon className="size-4" />
                      WhatsApp
                    </button>
                  </div>
                )}

                <div className="grid size-[17.5rem] max-w-full place-items-center rounded-2xl border border-line bg-white p-3 shadow-[0_16px_36px_-28px_rgba(109,13,18,0.8)]">
                  {activeQrCode?.dataUrl ? (
                    // This data URL is created locally by qrcode in the browser.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={activeQrCode.dataUrl}
                      alt={`QR code to ${kind === "email" ? "email" : phoneMethod === "call" ? "call" : "open WhatsApp"} Khana Banao`}
                      className="size-full"
                    />
                  ) : activeQrCode?.error ? (
                    <p className="px-6 text-sm text-ink-soft">
                      We couldn’t create the QR code. Use the link below instead.
                    </p>
                  ) : (
                    <div className="size-10 animate-pulse rounded-lg bg-surface-muted" aria-label="Generating QR code" />
                  )}
                </div>

                <p className="mt-4 text-sm font-semibold text-ink">
                  {kind === "email"
                    ? emailValue
                    : phoneMethod === "call"
                      ? phoneValue
                      : "Chat with us on WhatsApp"}
                </p>
                <a
                  href={qrHref}
                  target={phoneMethod === "whatsapp" ? "_blank" : undefined}
                  rel={phoneMethod === "whatsapp" ? "noopener noreferrer" : undefined}
                  className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-brand-crimson underline underline-offset-4 hover:text-brand-maroon"
                >
                  {kind === "email" ? (
                    <Mail className="size-4" aria-hidden="true" />
                  ) : phoneMethod === "call" ? (
                    <Phone className="size-4" aria-hidden="true" />
                  ) : (
                    <WhatsappIcon className="size-4" />
                  )}
                  Open on this device instead
                </a>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
