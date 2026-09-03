import { describe, expect, it } from "vitest";
import { wrapEmailHtml } from "@/lib/email/layout";

describe("email layout", () => {
  it("uses the Khana Banao logo hosted on Brevo's image CDN", () => {
    const html = wrapEmailHtml("<p>Your application is ready.</p>");

    expect(html).toContain(
      'src="https://img.mailinblue.com/11977921/images/rnb/original/6a9948b125aaba004d88d558.png"',
    );
    expect(html).toContain(
      'alt="Khana Banao — Powered by Food Chain System"',
    );
    expect(html).not.toContain("r.mail.khanabanaopartner.com");
  });
});
