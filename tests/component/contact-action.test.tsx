import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { ContactAction } from "@/components/contact/contact-action";
import { site } from "@/lib/site";

vi.mock("qrcode", () => ({
  default: { toDataURL: vi.fn(() => Promise.resolve("data:image/png;base64,qr")) },
}));

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: "(max-width: 767px)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("ContactAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMobileViewport(false);
  });

  it("generates a phone QR code locally on desktop", async () => {
    render(<ContactAction kind="phone">Call us</ContactAction>);

    fireEvent.click(screen.getByRole("link", { name: "Call us" }));

    expect(
      screen.getByRole("heading", { name: "Connect with Khana Banao" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        site.phoneHref,
        expect.any(Object),
      );
    });
    expect(await screen.findByAltText(/QR code to call/i)).toBeInTheDocument();
  });

  it("offers call and WhatsApp choices on mobile", () => {
    setMobileViewport(true);
    render(<ContactAction kind="phone">Call us</ContactAction>);

    fireEvent.click(screen.getByRole("link", { name: "Call us" }));

    expect(
      screen.getByRole("heading", { name: "Choose how to connect" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Call now/i })).toHaveAttribute(
      "href",
      site.phoneHref,
    );
    expect(screen.getByRole("link", { name: /WhatsApp/i })).toHaveAttribute(
      "href",
      site.whatsappHref,
    );
    expect(QRCode.toDataURL).not.toHaveBeenCalled();
  });

  it("generates an email QR code on desktop", async () => {
    render(<ContactAction kind="email">Email us</ContactAction>);

    fireEvent.click(screen.getByRole("link", { name: "Email us" }));

    expect(
      screen.getByRole("heading", { name: "Email Khana Banao" }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        `mailto:${site.email}`,
        expect.any(Object),
      );
    });
  });

  it("uses the selected lead's details instead of the public contact details", async () => {
    render(
      <ContactAction
        kind="phone"
        value="+91 74069 15854"
        whatsapp="+91 98765 43210"
      >
        Lead phone
      </ContactAction>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Lead phone" }));
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        "tel:+917406915854",
        expect.any(Object),
      );
    });

    fireEvent.click(screen.getByRole("button", { name: "WhatsApp" }));
    await waitFor(() => {
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        "https://wa.me/919876543210",
        expect.any(Object),
      );
    });
  });
});
