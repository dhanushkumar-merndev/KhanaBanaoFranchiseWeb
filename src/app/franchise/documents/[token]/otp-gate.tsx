"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import {
  requestDocumentAccessOtp,
  verifyDocumentAccessOtp,
} from "@/app/actions/document-access";
import { Button } from "@/components/ui/button";

export function DocumentOtpGate({
  token,
  maskedEmail,
  initialCodeSent = false,
  initialCooldown = 0,
}: {
  token: string;
  maskedEmail: string;
  initialCodeSent?: boolean;
  initialCooldown?: number;
}) {
  const router = useRouter();
  const [sent, setSent] = useState(initialCodeSent);
  const [code, setCode] = useState("");
  const [pending, setPending] = useState<"send" | "verify" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(initialCooldown);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function sendCode() {
    setPending("send");
    setMessage(null);
    const result = await requestDocumentAccessOtp(token);
    setPending(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setSent(true);
    setCooldown(result.data.retryAfterSeconds);
    setMessage(`A 6-digit code was sent to ${result.data.maskedEmail}.`);
  }

  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("verify");
    setMessage(null);
    const result = await verifyDocumentAccessOtp(token, code);
    setPending(null);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <section className="mx-auto max-w-md rounded-2xl border border-line bg-surface p-6 text-center shadow-[0_24px_60px_-40px_rgba(110,40,20,0.55)] sm:p-8">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-crimson/10 text-brand-crimson">
        {sent ? (
          <MailCheck className="size-7" aria-hidden="true" />
        ) : (
          <ShieldCheck className="size-7" aria-hidden="true" />
        )}
      </span>
      <h1 className="mt-5 font-display text-2xl font-bold text-ink">
        Verify your email
      </h1>
      <p className="mt-2 text-[0.85rem] leading-relaxed text-ink-soft">
        Before showing your documents, we need to confirm it&rsquo;s you. We&rsquo;ll
        send a one-time code to <strong className="text-ink">{maskedEmail}</strong>.
      </p>

      {sent ? (
        <form onSubmit={verify} className="mt-6 text-left">
          <label
            htmlFor="document-otp"
            className="text-[0.78rem] font-semibold uppercase tracking-wide text-ink-soft"
          >
            6-digit verification code
          </label>
          <div className="relative mt-1.5">
            <KeyRound
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-soft"
              aria-hidden="true"
            />
            <input
              id="document-otp"
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              autoFocus
              className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-4 text-center font-mono text-xl font-semibold tracking-[0.35em] text-ink outline-none transition focus:border-brand-red focus:ring-2 focus:ring-brand-red/15"
              aria-describedby={message ? "otp-message" : undefined}
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="mt-4 w-full"
            loading={pending === "verify"}
            disabled={code.length !== 6 || pending !== null}
          >
            Verify and continue
          </Button>
          <button
            type="button"
            onClick={sendCode}
            disabled={cooldown > 0 || pending !== null}
            className="mt-4 w-full text-center text-[0.78rem] font-semibold text-brand-crimson transition hover:text-brand-maroon disabled:cursor-not-allowed disabled:text-ink-soft"
          >
            {cooldown > 0 ? `Send another code in ${cooldown}s` : "Send another code"}
          </button>
        </form>
      ) : (
        <Button
          type="button"
          size="lg"
          className="mt-6 w-full"
          onClick={sendCode}
          loading={pending === "send"}
        >
          Email me a code
        </Button>
      )}

      {message && (
        <p
          id="otp-message"
          role="status"
          className="mt-4 rounded-xl bg-surface-muted px-3 py-2.5 text-[0.78rem] leading-relaxed text-ink-soft"
        >
          {message}
        </p>
      )}
      <p className="mt-5 text-[0.7rem] leading-relaxed text-ink-soft">
        The code expires after 10 minutes. For your security, never share it.
      </p>
    </section>
  );
}
