"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

function GoogleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65Z" />
      <path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.77 24c0-1.6.28-3.14.76-4.59l-7.98-6.19A23.94 23.94 0 0 0 0 24c0 3.88.93 7.54 2.56 10.78l7.97-6.19Z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" />
    </svg>
  );
}

export function GoogleButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const callback = new URL("/auth/callback", window.location.origin);
      if (next) callback.searchParams.set("next", next);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callback.toString(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error) throw error;
      // On success the browser navigates to Google; keep the spinner up.
    } catch (cause) {
      setLoading(false);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Could not start Google sign-in. Please try again.",
      );
    }
  };

  return (
    <button
      type="button"
      onClick={signIn}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-line bg-surface px-6 py-3.5 text-sm font-semibold text-ink shadow-sm transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <LoaderCircle className="size-5 animate-spin text-brand-crimson" />
      ) : (
        <GoogleMark className="size-5" />
      )}
      {loading ? "Redirecting to Google…" : "Continue with Google"}
    </button>
  );
}
