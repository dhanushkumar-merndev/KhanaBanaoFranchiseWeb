/**
 * Single source of truth for public-site copy, contact details and image slots.
 * Swap the files under /public/images with real photography (same file names,
 * or point these paths somewhere else) and the layout stays intact.
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
  { label: "What We Provide", href: "#what-we-provide" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
  { label: "Contact", href: "#contact" },
] as const;

export const images = {
  /**
   * `logo-mark.png` is `logo.png` with its transparent padding trimmed
   * (2600x2000 -> 2520x854). The original is untouched at /logo.png.
   * Regenerate with: node scripts/trim-logo.mjs
   */
  logo: "/logo-mark.png",
  logoWidth: 2520,
  logoHeight: 854,
  heroFeast: "/images/hero-feast.svg",
  flavours: [
    { src: "/images/flavour-1.svg", alt: "Live catering counter at an event" },
    { src: "/images/flavour-2.svg", alt: "Buffet spread laid out for guests" },
    { src: "/images/flavour-3.svg", alt: "Wedding table setting" },
    { src: "/images/flavour-4.svg", alt: "Signature curry served in a handi" },
    { src: "/images/flavour-5.svg", alt: "Traditional Indian sweets platter" },
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
    "Kitchen setup",
    "Staff & service",
    "Rent & licenses",
    "Daily operations",
    "Local event execution",
    "Delivery logistics",
  ],
  us: [
    "Brand & recipes",
    "Vendor network",
    "Packaging standards",
    "Leads & marketing",
    "Swiggy/Zomato onboarding",
    "Training & support",
  ],
} as const;

export const feeHighlights = [
  {
    icon: "money",
    body: "Low-investment FOFO model — you own and operate your unit",
  },
  { icon: "percent", body: "Just 7% royalty on executed orders" },
  { icon: "shield", body: "Protected territory — your area stays yours" },
  {
    icon: "docs",
    body: "Every component handed over with full documentation",
  },
] as const;

export const franchiseFee = {
  amount: 50000,
  display: "50,000",
  royalty: "7%",
} as const;

export const eligibility = [
  {
    icon: "wallet",
    title: "Investment capacity",
    body: "₹50,000 franchise fee plus working capital for kitchen, staff and licences.",
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
  { label: "One-time franchise fee", value: "₹50,000", note: "Fixed" },
  {
    label: "Kitchen setup & equipment",
    value: "₹1.5L – ₹4L",
    note: "Varies by city and scale",
  },
  {
    label: "Licences & registration",
    value: "₹15K – ₹30K",
    note: "FSSAI, GST, trade licence",
  },
  {
    label: "Working capital (first 2 months)",
    value: "₹1L – ₹2L",
    note: "Raw material, staff, logistics",
  },
  { label: "Royalty", value: "7%", note: "On executed orders only" },
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
    a: "The one-time franchise fee is ₹50,000. Beyond that you invest in your own kitchen setup, licences and working capital — typically ₹2.5L to ₹6L depending on your city and the scale you start at. There are no hidden onboarding charges.",
  },
  {
    q: "What is the royalty structure?",
    a: "A flat 7% royalty on orders you actually execute. If you do not run an event in a given month, there is no royalty for that month — we do not charge minimum guarantees.",
  },
  {
    q: "Is my territory protected?",
    a: "Yes. Every partner is allotted a defined territory in the agreement, and we do not appoint another partner inside it while your franchise is active and in good standing.",
  },
  {
    q: "Do I need prior food or catering experience?",
    a: "No. Many of our partners come from completely different backgrounds. We train you and your team on recipes, kitchen SOPs, hygiene standards and event execution before you go live.",
  },
  {
    q: "Who brings the orders?",
    a: "We run the brand's marketing — Instagram and Facebook lead generation, corporate tie-ups, wedding bookings and aggregator onboarding — and route qualified leads in your territory to you. You execute locally.",
  },
  {
    q: "How long does it take to launch?",
    a: "Most partners go live in 30 to 45 days from signing, assuming your kitchen premises and licences are in place. Training and onboarding run in parallel with your setup.",
  },
  {
    q: "What ongoing support do I get?",
    a: "A dedicated support owner, ongoing chef and operations guidance, refreshed marketing creatives, updated rate cards and vendor introductions — for as long as your franchise is active.",
  },
] as const;

export const processTimeline = [
  "Franchise Enquiry",
  "Business Discussion",
  "Application Review",
  "Franchise Approval",
  "Franchise Agreement",
  "Payment",
  "Franchise Activation",
  "Training",
  "Business Setup",
  "Go Live",
  "Ongoing Support",
] as const;
