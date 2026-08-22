/**
 * Single source of truth for public-site copy, contact details and image slots.
 * Public-site photography is stored as optimized WebP assets under
 * /public/images so the landing page remains fast at every breakpoint.
 */

export const site = {
  name: "Khana Banao",
  legalName: "Khana Banao Catering",
  tagline: "Powered By Food Chain System",
  phone: "+91 88827 97108",
  phoneHref: "tel:+918882797108",
  whatsapp: "918882797108",
  whatsappHref:
    "https://wa.me/918882797108?text=Hi%2C%20I%27m%20interested%20in%20the%20Khana%20Banao%20franchise",
  email: "franchise@khanabanao.com",
  location: "India",
  socials: {
    instagram: "https://instagram.com/",
    facebook: "https://facebook.com/",
    youtube: "https://youtube.com/",
  },
} as const;

export const nav = [
  { label: "Home", href: "#home" },
  { label: "Why Partner", href: "#why-partner" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Plans & ROI", href: "#plans" },
  { label: "What We Provide", href: "#what-we-provide" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
] as const;
export const images = {
  /**
   * `logo-mark.png` is `logo.png` with its transparent padding trimmed
   * (2600x2000 -> 2520x854). The original is untouched at /logo.png.
   */
  logo: "/logo-mark.png",
  logoWidth: 2520,
  logoHeight: 854,
  heroFeast: "/images/hero-feast.webp",
  flavours: [
    {
      src: "/images/flavour-1.webp",
      alt: "Chef serving guests at a live Indian catering counter",
    },
    {
      src: "/images/flavour-2.webp",
      alt: "Copper handis filled with an Indian buffet spread",
    },
    {
      src: "/images/flavour-3.webp",
      alt: "Elegant wedding table with gold place settings and crimson flowers",
    },
    {
      src: "/images/flavour-4.webp",
      alt: "Signature Indian curry served steaming in a copper handi",
    },
    {
      src: "/images/flavour-5.webp",
      alt: "Traditional Indian sweets arranged on a brass celebration platter",
    },
  ],
} as const;

export const heroBadges = [
  { icon: "shield", label: "Proven\nSystem" },
  { icon: "sparkles", label: "Trusted\nBrand" },
  { icon: "wallet", label: "Low\nInvestment" },
  { icon: "headset", label: "End-to-End\nSupport" },
] as const;

export const stats = [
  { icon: "users", value: 150, suffix: "+", label: "Events Monthly" },
  { icon: "smile", value: 5000, suffix: "+", label: "Happy Customers" },
  { icon: "pin", value: 25, suffix: "+", label: "Cities" },
  { icon: "star", value: 95, suffix: "%", label: "Partner Satisfaction" },
] as const;

type WhyPartnerCard = {
  icon: "crown" | "megaphone" | "chef" | "docs";
  title: string;
  points: readonly string[];
  body?: string;
};

export const whyPartner: readonly WhyPartnerCard[] = [
  {
    icon: "crown",
    title: "The Brand Does\nThe Heavy Lifting",
    points: [
      "Trusted Khana Banao brand name & identity",
      "Ready-made recipes & proven SOPs",
      "Established vendor network & rate cards",
      "Professional packaging standards",
    ],
  },
  {
    icon: "megaphone",
    title: "We Bring You\nThe Customers",
    points: [
      "Instagram & Facebook lead generation",
      "Swiggy / Zomato onboarding support",
      "Corporate tie-ups & wedding bookings",
      "Marketing creatives & content kit",
    ],
  },
  {
    icon: "chef",
    title: "We Train\nYour Team",
    points: [
      "Kitchen & event execution SOP training",
      "Hygiene & food-safety certification",
      "Staff onboarding & conduct guidance",
      "Ongoing chef & operational support",
    ],
  },
  {
    icon: "docs",
    title: "Ready Documentation\nEvery Step",
    points: [],
    body: "Every component handed over with full documentation.",
  },
] as const;

export const howItWorks = [
  {
    icon: "clipboard",
    title: "Apply",
    body: "Submit your franchise enquiry",
  },
  {
    icon: "users",
    title: "Discussion",
    body: "Meet our team & understand the model",
  },
  {
    icon: "handshake",
    title: "Agreement",
    body: "Simple agreement & territory allotment",
  },
  {
    icon: "store",
    title: "Setup",
    body: "Kitchen setup, training and onboarding",
  },
  {
    icon: "rocket",
    title: "Launch",
    body: "Go live with our support & marketing",
  },
  {
    icon: "chart",
    title: "Grow",
    body: "We bring orders, you grow profits",
  },
] as const;

export const whoDoesWhat = {
  you: [
    "Client interaction & menu customisation",
    "Tasting sessions & quotations",
    "Venue inspections & site management",
    "Advance & balance collections",
    "Food preparation & hygiene checks",
    "Transport, live counters & execution",
  ],
  us: [
    "Brand marketing, app & website",
    "Lead routing & tier qualification",
    "CRM and platform maintenance",
    "Tier 3–4 sales closing support",
    "7-day team training",
    "SOPs, recipes & operational support",
  ],
} as const;

export const feeHighlights = [
  {
    icon: "money",
    body: "Low-investment FOFO model — you own and operate your unit",
  },
  { icon: "percent", body: "8%–10% royalty on monthly gross revenue" },
  { icon: "shield", body: "Protected territory — your area stays yours" },
  {
    icon: "docs",
    body: "Every component handed over with full documentation",
  },
] as const;

export const franchiseFee = {
  amount: 50000,
  display: "50,000",
  royalty: "8%–10%",
} as const;

export const eligibility = [
  {
    icon: "wallet",
    title: "Investment capacity",
    body: "Choose a tier from ₹50,000 to ₹10 lakh, based on the events you want to serve.",
  },
  {
    icon: "store",
    title: "Kitchen or premises",
    body: "An owned or rented commercial kitchen space in your preferred territory.",
  },
  {
    icon: "users",
    title: "Hands-on involvement",
    body: "A full-time owner-operator, or a trusted manager you appoint and supervise.",
  },
  {
    icon: "docs",
    title: "Basic compliance",
    body: "FSSAI registration, GST and a current bank account in the business name.",
  },
] as const;

export const investment = [
  { label: "Tier 1: Small events", value: "₹50,000", note: "3-month ROI target" },
  {
    label: "Tier 2: Mid-scale events",
    value: "₹2 lakh",
    note: "3-month ROI target",
  },
  {
    label: "Tier 3: Corporate events",
    value: "₹5 lakh",
    note: "6-month ROI target",
  },
  {
    label: "Tier 4: VIP events",
    value: "₹10 lakh",
    note: "6-month ROI target",
  },
  { label: "Monthly royalty", value: "8%–10%", note: "Of gross revenue" },
] as const;

export const franchiseTiers = [
  {
    tier: "Tier 1",
    name: "Small Events",
    investment: "₹50,000",
    roi: "3-month ROI target",
    scope: "House parties, small gatherings (25–100 pax) and packed meals",
    aov: "₹30,000",
    profit: "₹7,500",
    orders: "7 orders",
    monthlyTarget: "2.3 orders/month",
    cadence: "About 1 order every 10–12 days",
  },
  {
    tier: "Tier 2",
    name: "Mid-Scale Events",
    investment: "₹2 lakh",
    roi: "3-month ROI target",
    scope: "Weddings, engagements, housewarmings and anniversaries",
    aov: "₹1.5 lakh",
    profit: "₹37,500",
    orders: "6 orders",
    monthlyTarget: "2 orders/month",
    cadence: "About 1 order every 15 days",
  },
  {
    tier: "Tier 3",
    name: "Corporate Events",
    investment: "₹5 lakh",
    roi: "6-month ROI target",
    scope: "Business seminars, corporate galas and office meal contracts",
    aov: "₹3 lakh",
    profit: "₹75,000",
    orders: "7 orders",
    monthlyTarget: "1.2 orders/month",
    cadence: "About 1 order every 25 days",
  },
  {
    tier: "Tier 4",
    name: "VIP Events",
    investment: "₹10 lakh",
    roi: "6-month ROI target",
    scope: "Elite weddings, HNI celebrations and celebrity events",
    aov: "₹7 lakh",
    profit: "₹1.75 lakh",
    orders: "6 orders",
    monthlyTarget: "1 order/month",
    cadence: "About 1 order every 30 days",
  },
] as const;

export const testimonials = [
  {
    quote:
      "The support system is incredible. From training to marketing, everything was ready. Our business took off within the first month!",
    name: "Rahul S.",
    city: "Hyderabad",
  },
  {
    quote:
      "Trusted brand, great recipes and consistent leads. Khana Banao made it easy for us to grow profitably.",
    name: "Priya M.",
    city: "Bangalore",
  },
  {
    quote:
      "Professional team and complete guidance at every step. Highly recommended!",
    name: "Imran K.",
    city: "Pune",
  },
] as const;

export const faqs = [
  {
    q: "How much does a Khana Banao franchise cost?",
    a: "There are four franchise investment tiers: ₹50,000, ₹2 lakh, ₹5 lakh and ₹10 lakh. The right tier depends on the event category and scale you want to serve; your final commercial terms are confirmed in the franchise agreement.",
  },
  {
    q: "What is the royalty structure?",
    a: "The monthly royalty is 8% to 10% of gross revenue for marketing and app lead allocation. The applicable rate is confirmed for your franchise tier in the agreement.",
  },
  {
    q: "Is my territory protected?",
    a: "Yes. Every partner is allotted a defined territory in the agreement, and we do not appoint another partner inside it while your franchise is active and in good standing.",
  },
  {
    q: "Do I need prior food or catering experience?",
    a: "No. We provide a comprehensive 7-day culinary, presentation and operational-management training programme for core kitchen staff, alongside SOPs for portions, kitchen setup and uniforms.",
  },
  {
    q: "Who brings the orders?",
    a: "Khana Banao manages brand marketing, digital ads, the app, website, lead capture and geographic routing. You handle the local client relationship, quotations, collections and event execution; central sales support is available for Tier 3 and Tier 4 deals.",
  },
  {
    q: "How long does it take to launch?",
    a: "Most partners go live in 30 to 45 days from signing, assuming your kitchen premises and licences are in place. Training and onboarding run in parallel with your setup.",
  },
  {
    q: "What ongoing support do I get?",
    a: "You receive central marketing and lead routing, CRM support, standardized portion calculators, kitchen setup protocols, server-uniform guidelines, training and operational guidance.",
  },
] as const;
