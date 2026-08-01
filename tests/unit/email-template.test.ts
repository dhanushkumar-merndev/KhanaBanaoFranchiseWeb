import { describe, expect, it } from "vitest";
import {
  extractVariables,
  htmlToText,
  missingVariables,
  renderTemplate,
} from "@/lib/email/render";

describe("email template variables", () => {
  it("substitutes known placeholders", () => {
    expect(
      renderTemplate("Hello {{applicant_name}}, lead {{lead_number}}.", {
        applicant_name: "Ramesh",
        lead_number: "KB-L00042",
      }),
    ).toBe("Hello Ramesh, lead KB-L00042.");
  });

  it("tolerates whitespace inside the braces", () => {
    expect(
      renderTemplate("Hi {{  applicant_name  }}", { applicant_name: "Priya" }),
    ).toBe("Hi Priya");
  });

  it("leaves an unsupplied placeholder visible rather than blanking it", () => {
    // A typo in a template should be obvious in the preview, not silent.
    expect(renderTemplate("Hi {{applicant_nmae}}", { applicant_name: "Priya" })).toBe(
      "Hi {{applicant_nmae}}",
    );
  });

  it("escapes values so applicant input cannot inject markup", () => {
    expect(
      renderTemplate("Hello {{applicant_name}}", {
        applicant_name: '<script>alert("x")</script>',
      }),
    ).toBe("Hello &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
  });

  it("lists the placeholders a template uses, without duplicates", () => {
    expect(
      extractVariables(
        "{{applicant_name}} — {{lead_number}} — {{applicant_name}}",
      ).sort(),
    ).toEqual(["applicant_name", "lead_number"]);
  });

  it("reports which placeholders the caller forgot", () => {
    expect(
      missingVariables("{{applicant_name}} {{application_link}}", {
        applicant_name: "Ramesh",
      }),
    ).toEqual(["application_link"]);

    expect(
      missingVariables("{{applicant_name}}", { applicant_name: "Ramesh" }),
    ).toEqual([]);
  });
});

describe("html to text fallback", () => {
  it("turns markup into a readable plain-text body", () => {
    expect(
      htmlToText("<p>Hello <strong>Ramesh</strong></p><p>Welcome</p>"),
    ).toBe("Hello Ramesh\n\nWelcome");
  });

  it("decodes the entities it introduced when escaping", () => {
    expect(htmlToText("A &amp; B &lt;tag&gt; &quot;q&quot;")).toBe(
      'A & B <tag> "q"',
    );
  });

  it("collapses runs of blank lines", () => {
    expect(htmlToText("<p>a</p><p></p><p></p><p>b</p>")).toBe("a\n\nb");
  });
});
