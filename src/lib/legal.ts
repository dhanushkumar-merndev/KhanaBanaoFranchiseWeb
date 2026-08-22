/**
 * Copy for the /privacy and /terms pages.
 *
 * Kept as data rather than JSX so both pages render through one component and
 * cannot drift apart in typography or structure. The content describes what
 * this application actually does — the enquiry form, the application form, the
 * document uploads, Supabase storage and the Brevo email sender — so it should
 * be revisited whenever those flows change.
 *
 * NOT LEGAL ADVICE. This is a good-faith description of the system written by
 * the build, and it needs review by a qualified lawyer before it is relied on.
 */

import { site } from "@/lib/site";

export type LegalBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: readonly string[] };

export type LegalSection = {
  heading: string;
  blocks: readonly LegalBlock[];
};

export type LegalDoc = {
  title: string;
  /** Sits under the title, above the rule. */
  intro: string;
  /** Displayed verbatim — update by hand when the text changes. */
  updated: string;
  sections: readonly LegalSection[];
};

const UPDATED = "2 August 2026";

export const privacyDoc: LegalDoc = {
  title: "Privacy Policy",
  intro:
    `How ${site.legalName} collects, uses and protects the information you ` +
    `share when you enquire about or apply for a franchise.`,
  updated: UPDATED,
  sections: [
    {
      heading: "1. Who we are",
      blocks: [
        {
          type: "p",
          text:
            `${site.legalName} ("we", "us") operates the ${site.name} franchise ` +
            `programme and this website. If you have any question about this ` +
            `policy, contact us at ${site.email} or ${site.phone}.`,
        },
      ],
    },
    {
      heading: "2. Information we collect",
      blocks: [
        {
          type: "p",
          text: "We collect only what we need to assess and support a franchise enquiry. Depending on how far you go in the process, that may include:",
        },
        {
          type: "ul",
          items: [
            "Enquiry details — your name, mobile number, email address, preferred city and indicative investment budget.",
            "Application details — date of birth, current address, occupation, business experience, company and GST details where applicable, preferred territory, and your declared source and amount of investment.",
            "Documents you upload — identity proof, address proof, photographs, bank or financial statements and any other document we specifically request from you.",
            "Correspondence — notes from calls and meetings recorded by the team member handling your enquiry, and a log of the emails we send you.",
            "Technical data — standard server logs generated when you visit the site.",
          ],
        },
        {
          type: "p",
          text: "We do not ask for, and you should not send us, payment card numbers or full bank credentials by email or through the upload form.",
        },
      ],
    },
    {
      heading: "3. How we use your information",
      blocks: [
        {
          type: "ul",
          items: [
            "To respond to your enquiry and assign it to a member of our franchise team.",
            "To assess your application, verify the documents you provide and decide whether to offer a franchise.",
            "To prepare and manage the franchise agreement, payment and onboarding if your application is approved.",
            "To contact you about your enquiry or application by phone, email or WhatsApp.",
            "To keep internal records of the decisions taken on your application.",
          ],
        },
        {
          type: "p",
          text: "We do not sell your information, and we do not use it for advertising unrelated to the franchise programme.",
        },
      ],
    },
    {
      heading: "4. The basis on which we use it",
      blocks: [
        {
          type: "p",
          text: "We process your information because you have asked us to consider you for a franchise, and because we need it to take steps towards a possible agreement with you. Where we ask for your consent — for example to verify the documents you submit — you give it explicitly on the application form, and you can withdraw it at any time by contacting us.",
        },
      ],
    },
    {
      heading: "5. Who we share it with",
      blocks: [
        {
          type: "p",
          text: "Your information is visible to the members of our franchise team who are handling your enquiry, and to our administrators. Beyond that, we share it only with:",
        },
        {
          type: "ul",
          items: [
            "Our hosting and database provider, which stores the data on our behalf.",
            "Our transactional email provider, which delivers the notifications we send you.",
            "Professional advisers, or a public authority, where we are required to disclose it by law.",
          ],
        },
        {
          type: "p",
          text: "We do not pass your details to other franchisees, to marketing lists, or to any third party for their own purposes.",
        },
      ],
    },
    {
      heading: "6. How we protect it",
      blocks: [
        {
          type: "ul",
          items: [
            "Documents you upload are held in private storage. They are never publicly accessible, and each view is served through a link that expires after a few minutes.",
            "The upload and application links we email you are single-use, cryptographically signed, and revoked when a replacement is issued.",
            "Access to the dashboard is invitation-only. A team member can see only the enquiries assigned to them.",
            "Transport between your browser and our servers is encrypted.",
          ],
        },
        {
          type: "p",
          text: "No system is perfectly secure. If we become aware of a breach affecting your information, we will tell you and the relevant authority as required by law.",
        },
      ],
    },
    {
      heading: "7. How long we keep it",
      blocks: [
        {
          type: "p",
          text: "If you become a franchise partner, we keep your records for the life of the agreement and for as long afterwards as tax, accounting and legal obligations require. If your application does not proceed, we keep it only as long as we need it to explain the decision and to meet those same obligations. You can ask us to delete it sooner and we will do so unless we are required to retain it.",
        },
      ],
    },
    {
      heading: "8. Your rights",
      blocks: [
        {
          type: "p",
          text: "You can ask us to:",
        },
        {
          type: "ul",
          items: [
            "Give you a copy of the information we hold about you.",
            "Correct anything that is inaccurate or out of date.",
            "Delete your information, where we are not required to keep it.",
            "Stop contacting you about the franchise programme.",
          ],
        },
        {
          type: "p",
          text: `Write to ${site.email} and we will respond within a reasonable period. We may ask you to confirm your identity first.`,
        },
      ],
    },
    {
      heading: "9. Cookies",
      blocks: [
        {
          type: "p",
          text: "The public website does not use advertising or tracking cookies. The partner dashboard sets a cookie that keeps you signed in; it is essential to the service and cannot be turned off while you are logged in.",
        },
      ],
    },
    {
      heading: "10. Children",
      blocks: [
        {
          type: "p",
          text: "The franchise programme is open only to adults. We do not knowingly collect information from anyone under 18, and the application form will not accept a date of birth that indicates otherwise.",
        },
      ],
    },
    {
      heading: "11. Changes to this policy",
      blocks: [
        {
          type: "p",
          text: "If we change how we handle your information we will update this page and the date shown above. Material changes affecting applicants in progress will be notified by email.",
        },
      ],
    },
    {
      heading: "12. Contact us",
      blocks: [
        {
          type: "p",
          text: `Email ${site.email} or call ${site.phone} with any question or complaint about how we handle your information.`,
        },
      ],
    },
  ],
};

export const termsDoc: LegalDoc = {
  title: "Terms & Conditions",
  intro:
    `The terms on which ${site.legalName} makes this website and the ` +
    `${site.name} franchise enquiry process available to you.`,
  updated: UPDATED,
  sections: [
    {
      heading: "1. About these terms",
      blocks: [
        {
          type: "p",
          text: `These terms govern your use of this website and your participation in the ${site.name} franchise enquiry and application process. By submitting an enquiry or an application you accept them. If you do not accept them, please do not use the site.`,
        },
      ],
    },
    {
      heading: "2. Who can apply",
      blocks: [
        {
          type: "p",
          text: "You must be at least 18 years old and legally able to enter into a contract. You must be applying on your own behalf, or be authorised to apply on behalf of the company you name.",
        },
      ],
    },
    {
      heading: "3. Enquiry and application",
      blocks: [
        {
          type: "p",
          text: "The process runs in stages: an enquiry, a discussion with a member of our team, a detailed application, document verification, and — if we approve it — a franchise agreement, payment and onboarding. We may ask for further information at any stage.",
        },
        {
          type: "p",
          text: "Application and document links we send you are personal to you. Do not share them; anyone holding the link can see and submit against your application until it expires.",
        },
      ],
    },
    {
      heading: "4. Information you give us must be accurate",
      blocks: [
        {
          type: "p",
          text: "You confirm that the information and documents you submit are true, complete and yours to provide. We rely on them. If anything turns out to be false or misleading we may reject the application, or terminate an agreement already signed, without refund.",
        },
      ],
    },
    {
      heading: "5. We do not guarantee approval",
      blocks: [
        {
          type: "p",
          text: "Submitting an enquiry or an application does not entitle you to a franchise. We assess every application on its merits and on the territory available, and we may decline without giving reasons. Nothing on this website is an offer capable of acceptance.",
        },
      ],
    },
    {
      heading: "6. Fees",
      blocks: [
        {
          type: "p",
          text: "Franchise investment tiers start at ₹50,000 and are available at ₹2 lakh, ₹5 lakh and ₹10 lakh, depending on the event category and scale. The applicable investment, royalty and any other commercial terms are confirmed after approval and in the franchise agreement. Setup, equipment, premises, staffing and working-capital costs are discussed with you before you commit.",
        },
        {
          type: "p",
          text: "A monthly royalty of 8% to 10% of gross revenue applies for marketing and app lead allocation, as set out for your tier in the franchise agreement. All payments are in Indian rupees. Any refund position is governed by that agreement, not by this page.",
        },
      ],
    },
    {
      heading: "7. The franchise agreement prevails",
      blocks: [
        {
          type: "p",
          text: "If you are approved, the relationship between us is governed by the signed franchise agreement. Where anything on this website conflicts with that agreement, the agreement applies. Figures and descriptions on this site are indicative and are not a promise of the results you will achieve.",
        },
      ],
    },
    {
      heading: "8. Intellectual property",
      blocks: [
        {
          type: "p",
          text: `The ${site.name} name, logo, recipes, menus, training material, designs and the content of this website belong to us. You may not use them except as a signed franchise agreement expressly permits, and any such right ends when that agreement ends.`,
        },
      ],
    },
    {
      heading: "9. Acceptable use",
      blocks: [
        {
          type: "p",
          text: "You agree not to:",
        },
        {
          type: "ul",
          items: [
            "Submit false enquiries, or impersonate another person or business.",
            "Upload anything containing malware, or any document you have no right to share.",
            "Attempt to access parts of the system you have not been granted access to, or to probe, scan or disrupt it.",
            "Copy or reproduce material from this site for a competing business.",
          ],
        },
      ],
    },
    {
      heading: "10. Availability",
      blocks: [
        {
          type: "p",
          text: "We aim to keep the site available but we do not guarantee it. We may suspend, withdraw or change any part of it without notice, and we are not liable to you if it is unavailable for any period.",
        },
      ],
    },
    {
      heading: "11. Limitation of liability",
      blocks: [
        {
          type: "p",
          text: "To the extent the law allows, we are not liable for loss of profit, loss of business or any indirect or consequential loss arising from your use of this website or from an application that does not proceed. Nothing here limits liability for fraud, or for anything else that cannot lawfully be limited.",
        },
      ],
    },
    {
      heading: "12. Privacy",
      blocks: [
        {
          type: "p",
          text: "We handle the information you give us as described in our Privacy Policy, which forms part of these terms.",
        },
      ],
    },
    {
      heading: "13. Governing law",
      blocks: [
        {
          type: "p",
          text: "These terms are governed by the laws of India, and the courts of India have exclusive jurisdiction over any dispute arising from them.",
        },
      ],
    },
    {
      heading: "14. Changes",
      blocks: [
        {
          type: "p",
          text: "We may update these terms from time to time. The version published here when you submit an enquiry or application is the version that applies to it.",
        },
      ],
    },
    {
      heading: "15. Contact us",
      blocks: [
        {
          type: "p",
          text: `Email ${site.email} or call ${site.phone} if anything here is unclear.`,
        },
      ],
    },
  ],
};
