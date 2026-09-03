/**
 * The KHANA BANAO Master Franchise Agreement, as structured content.
 *
 * Transcribed from `public/Khana-banao-Franchise-Master.pdf` (25 pages, Aug
 * 2026 revision). Each clause is one HTML blob carrying `{{field}}`
 * placeholders, which buys two things: rendering is a single substitution
 * pass, and an admin overriding a clause replaces exactly one string.
 *
 * The wording here is the legal baseline. Change it only alongside a version
 * bump in AGREEMENT_DOCUMENT_VERSION — agreements already sent record the
 * version they were rendered from, so an old agreement never silently
 * acquires new terms.
 */

export const AGREEMENT_DOCUMENT_VERSION = "2026-08-30";

export type Clause = {
  /** Stable key. Overrides are stored against this, so never renumber it. */
  id: string;
  /** Displayed number. "" for the unnumbered front matter and schedules. */
  number: string;
  heading: string;
  html: string;
};

/** `<ul>` from an array, so the clause bodies below stay readable. */
function list(items: readonly string[]): string {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

const TIER_TABLE = `
<table class="tiers">
  <thead>
    <tr><th>Tier</th><th>Event Category</th><th>Investment</th><th>Average Order</th><th>Net Profit / Order</th><th>ROI / Order Target</th></tr>
  </thead>
  <tbody>
    <tr><th>Tier 1</th><td>Small Events</td><td>₹50,000</td><td>₹30,000</td><td>₹7,500</td><td>3 months / 7 orders / 2.3 orders per month</td></tr>
    <tr><th>Tier 2</th><td>Mid-Scale Events</td><td>₹2,00,000</td><td>₹1,50,000</td><td>₹37,500</td><td>3 months / 6 orders / 2 orders per month</td></tr>
    <tr><th>Tier 3</th><td>Corporate Events</td><td>₹5,00,000</td><td>₹3,00,000</td><td>₹75,000</td><td>6 months / 7 orders / 1.2 orders per month</td></tr>
    <tr><th>Tier 4</th><td>VIP Events</td><td>₹10,00,000</td><td>₹7,00,000</td><td>₹1,75,000</td><td>6 months / 6 orders / 1 order per month</td></tr>
  </tbody>
</table>`;

export const AGREEMENT_CLAUSES: readonly Clause[] = [
  {
    id: "parties",
    number: "1",
    heading: "PARTIES AND EFFECTIVE DATE",
    html: `
<p>This Franchise Agreement (“Agreement”) is made on <strong>{{agreement_date}}</strong> at <strong>{{execution_place}}</strong> by and between:</p>
<p class="party-label">FRANCHISOR</p>
<p><strong>FOOD CHAIN SYSTEM</strong>, owner/operator of the <strong>KHANA BANAO</strong> brand, having its registered office at:</p>
<p class="address">Outer Ring Rd, near New Horizon College, Kaverappa Layout, Devarabisanahalli, Kadubeesanahalli, Bengaluru, Karnataka – 560103</p>
<p>Hereinafter referred to as the <strong>“Franchisor”</strong>.</p>
<p class="party-label">AND</p>
<dl class="party-details">
  <dt>Name</dt><dd>{{franchisee_name}}</dd>
  <dt>Address</dt><dd>{{franchisee_address}}</dd>
  <dt>PAN/GST</dt><dd>{{franchisee_pan_gst}}</dd>
  <dt>Phone</dt><dd>{{franchisee_phone}}</dd>
  <dt>Email</dt><dd>{{franchisee_email}}</dd>
</dl>
<p>Hereinafter referred to as the <strong>“Franchisee”</strong>.</p>
<p>The Franchisor and Franchisee are collectively referred to as the <strong>“Parties”</strong> and individually as a <strong>“Party.”</strong></p>`,
  },
  {
    id: "purpose",
    number: "2",
    heading: "PURPOSE AND FRANCHISE GRANT",
    html: `
<p>The Franchisor grants the Franchisee a limited, conditional and non-transferable licence to operate an authorised KHANA BANAO franchise within the approved territory and selected franchise tier, using the Franchisor’s approved brand, recipes, SOPs, systems, technology and marketing framework.</p>
<p>The franchise shall operate under the <strong>Franchise Owned and Franchise Operated (FOFO)</strong> model.</p>
<p>The Franchisee shall remain an independent business operator and shall be responsible for local execution, staffing, customer service, statutory compliance and operating costs.</p>
<p>Nothing contained in this Agreement shall be interpreted as creating a partnership, joint venture, employer-employee relationship or agency relationship between the Parties, except for any limited authority expressly granted in writing by the Franchisor.</p>`,
  },
  {
    id: "business_model",
    number: "3",
    heading: "APPROVED BUSINESS MODEL",
    html: `
<p>The Franchisee may undertake the following approved business activities, subject to the selected franchise tier and the Franchisor's operational guidelines:</p>
${list([
  "Small events and packed meals",
  "Mid-scale events and celebrations",
  "Wedding and engagement catering",
  "Corporate catering and office meal contracts",
  "VIP / premium events",
  "Chef-on-demand",
  "Event catering services",
  "Other services expressly approved by the Franchisor",
])}
<p>The Franchisor may modify, expand or update the approved service categories from time to time based on the development of the KHANA BANAO business model.</p>`,
  },
  {
    id: "tiers",
    number: "4",
    heading: "FRANCHISE TIERS AND ROI PLANNING",
    html: `
<p>The following commercial planning figures are based on the KHANA BANAO franchise model:</p>
${TIER_TABLE}
<p>The website planning figures are based on a standard <strong>25% net-profit planning margin</strong> after ingredients, direct labour, logistics, packaging and central royalties.</p>
<p>The above figures are intended for business planning and franchise model presentation. Actual results may vary depending upon bookings, customer demand, pricing, market conditions, operating costs and the Franchisee’s management and execution.</p>
<p>The selected tier, applicable investment, territory and commercial terms shall be specifically recorded in <strong>Schedule A</strong>.</p>`,
  },
  {
    id: "term",
    number: "5",
    heading: "TERM AND RENEWAL",
    html: `
<p>The initial term of this Agreement shall be <strong>one (1) year</strong> from the Effective Date unless terminated earlier in accordance with this Agreement.</p>
<p>Renewal may be granted for an additional period subject to:</p>
${list([
  "satisfactory performance;",
  "compliance with SOPs and brand standards;",
  "payment of all outstanding dues;",
  "continued availability of the territory;",
  "satisfactory customer-service standards; and",
  "mutual written consent of the Parties.",
])}
<p>Renewal shall <strong>not be automatic</strong>.</p>`,
  },
  {
    id: "fees",
    number: "6",
    heading: "FRANCHISE FEE, ROYALTY AND OTHER PAYMENTS",
    html: `
<p>The Franchise Fee payable by the Franchisee shall be:</p>
<p class="amount">₹ {{franchise_fee_amount}}</p>
<p class="amount-words">(Rupees {{franchise_fee_words}} only)</p>
<p>The Franchise Fee shall be payable in accordance with Schedule A.</p>
<h4>Royalty</h4>
<p>The applicable royalty rate shall be the exact percentage specified in Schedule A.</p>
<p>The KHANA BANAO franchise model may provide an applicable royalty range of <strong>8%–10% of Gross Revenue</strong>, and the specific applicable percentage shall be confirmed and recorded in Schedule A.</p>
<p>No verbal statement or informal communication shall modify the agreed royalty rate.</p>
<h4>Payment</h4>
<p>Royalty and other applicable recurring charges shall be paid within the prescribed payment cycle.</p>
<p>Overdue amounts may attract interest at the rate of <strong>18% per annum</strong>, without prejudice to the Franchisor’s other contractual rights.</p>
<p>The Franchisee shall not make any deduction, set-off or adjustment against amounts payable to the Franchisor except where required by applicable law or expressly approved in writing.</p>`,
  },
  {
    id: "gross_revenue",
    number: "7",
    heading: "DEFINITION OF GROSS REVENUE",
    html: `
<p>For the purpose of calculating royalty:</p>
<p><strong>“Gross Revenue”</strong> means the total amount billed, invoiced, received or receivable from customers for products and services carried out under or using the KHANA BANAO franchise, whether paid by:</p>
${list([
  "cash;",
  "UPI;",
  "bank transfer;",
  "credit/debit card;",
  "online payment;",
  "online platform; or",
  "any other payment method.",
])}
<p>GST and other statutory taxes collected on behalf of the Government shall be excluded.</p>
<p>No other deduction, expense, commission, discount or adjustment shall be excluded unless expressly approved in writing by the Franchisor.</p>
<p>The Franchisee shall not route, split or receive KHANA BANAO business through personal accounts, third-party accounts or any other arrangement for the purpose of reducing royalty or other contractual payments.</p>`,
  },
  {
    id: "territory",
    number: "8",
    heading: "TERRITORY AND EXCLUSIVITY",
    html: `
<p>The approved territory shall be clearly identified in <strong>Schedule A</strong>.</p>
<p>Where territorial protection/exclusivity is granted, such protection shall remain subject to the Franchisee:</p>
${list([
  "remaining operational;",
  "complying with the Agreement;",
  "maintaining required quality standards;",
  "following SOPs;",
  "paying all dues on time; and",
  "fulfilling any minimum operational conditions stated in Schedule A.",
])}
<p>The Franchisor may suspend or withdraw territorial protection where the Franchisee fails to satisfy the applicable conditions, subject to appropriate notice where a cure is reasonably possible.</p>
<p>Territory protection shall not restrict the Franchisor from handling:</p>
${list([
  "national accounts;",
  "strategic accounts;",
  "online/platform business;",
  "corporate accounts;",
  "customers originating outside the territory;",
  "events taking place outside the protected territory; or",
  "other categories specifically excluded in Schedule A.",
])}
<p>The Franchisee shall not sub-franchise, assign, transfer, sell, pledge or otherwise dispose of its franchise rights without prior written approval from the Franchisor.</p>`,
  },
  {
    id: "brand_ip",
    number: "9",
    heading: "BRAND AND INTELLECTUAL PROPERTY",
    html: `
<p>The Franchisee may use the following only for the authorised KHANA BANAO business:</p>
${list([
  "KHANA BANAO name;",
  "KHANA BANAO logo;",
  "trademarks;",
  "recipes and menus;",
  "proprietary know-how;",
  "SOPs;",
  "operations manuals;",
  "marketing creatives;",
  "website;",
  "mobile application;",
  "CRM;",
  "dashboards;",
  "approved vendor/rate-card systems; and",
  "other proprietary materials supplied by the Franchisor.",
])}
<p>All intellectual-property rights shall remain exclusively with the Franchisor or its licensors.</p>
<p>The Franchisee receives only a limited licence to use the relevant intellectual property during the valid term of this Agreement.</p>
<p>No ownership, goodwill or independent trademark right is transferred to the Franchisee.</p>
<p>The Franchisee shall not:</p>
${list([
  "register the KHANA BANAO name or logo;",
  "copy the brand;",
  "reproduce proprietary materials;",
  "modify the brand without permission;",
  "license the brand to another person;",
  "sell or transfer proprietary materials;",
  "use the brand outside the authorised business; or",
  "claim ownership over any KHANA BANAO intellectual property.",
])}`,
  },
  {
    id: "franchisor_responsibilities",
    number: "10",
    heading: "FRANCHISOR RESPONSIBILITIES",
    html: `
<p>Subject to the Franchisee complying with this Agreement, the Franchisor shall provide appropriate support including:</p>
${list([
  "Brand marketing;",
  "App and website support;",
  "Lead routing;",
  "Tier qualification;",
  "CRM/platform support;",
  "Tier 3 and Tier 4 sales-closing support where applicable;",
  "Initial team training;",
  "SOPs and recipes;",
  "Operational support;",
  "Kitchen/event execution guidance;",
  "Hygiene and food-safety training support;",
  "Vendor/network guidance;",
  "Marketing creatives/content kit;",
  "Approved campaigns;",
  "Menu updates; and",
  "Other support forming part of the approved franchise package.",
])}
<p>Support shall remain subject to the Franchisee fulfilling its obligations and maintaining the required operational capacity.</p>`,
  },
  {
    id: "franchisee_responsibilities",
    number: "11",
    heading: "FRANCHISEE RESPONSIBILITIES",
    html: `
<p>The Franchisee shall be responsible for:</p>
${list([
  "Client interaction;",
  "Menu customisation;",
  "Tasting sessions;",
  "Quotations;",
  "Venue inspections;",
  "Site management;",
  "Advance and balance collections;",
  "Food preparation;",
  "Food-quality checks;",
  "Hygiene;",
  "Transport;",
  "Live counters;",
  "Event execution;",
  "Staff recruitment;",
  "Staff supervision;",
  "Staff payments;",
  "Premises;",
  "Kitchen;",
  "Equipment;",
  "Utilities;",
  "Local licences;",
  "Registrations;",
  "Taxes;",
  "Statutory compliance;",
  "Daily/periodic sales reporting;",
  "CRM reporting;",
  "Customer service; and",
  "Maintaining KHANA BANAO brand standards.",
])}
<p>The Franchisee shall ensure that all employees, chefs, contractors and event staff engaged by it comply with applicable KHANA BANAO standards.</p>`,
  },
  {
    id: "investment_costs",
    number: "12",
    heading: "INVESTMENT AND OPERATING COSTS",
    html: `
<p>Unless specifically included in Schedule A, the Franchisee shall bear all costs associated with:</p>
${list([
  "Premises/shop or commercial kitchen;",
  "Rent;",
  "Interior/setup;",
  "Kitchen equipment;",
  "Staff salaries;",
  "Staff payments;",
  "Electricity;",
  "Water;",
  "Utilities;",
  "Licences;",
  "Registrations;",
  "Local taxes;",
  "Insurance;",
  "Transport;",
  "Logistics;",
  "Event execution; and",
  "Working capital.",
])}
<p>The Franchisee shall maintain sufficient working capital to operate the franchise effectively.</p>`,
  },
  {
    id: "training",
    number: "13",
    heading: "TRAINING",
    html: `
<p>Initial training shall be mandatory for the Franchisee and designated staff.</p>
<p>The KHANA BANAO franchise model provides for initial team training of <strong>up to seven days</strong>, as applicable to the selected franchise package and training plan.</p>
<p>The Franchisor may require refresher, corrective or additional training where required for:</p>
${list([
  "quality;",
  "food safety;",
  "operational standards;",
  "customer service; or",
  "SOP compliance.",
])}
<p>Completion of training shall not transfer responsibility for the Franchisee’s business or statutory compliance to the Franchisor.</p>`,
  },
  {
    id: "marketing",
    number: "14",
    heading: "MARKETING, LEADS AND CRM",
    html: `
<p>The Franchisor may generate and route leads through:</p>
${list([
  "Digital marketing;",
  "Social media;",
  "Website;",
  "Mobile applications;",
  "Online platforms;",
  "Corporate relationships;",
  "Wedding/event channels;",
  "Marketing campaigns; and",
  "Other business-development channels.",
])}
<p>Lead allocation may depend upon:</p>
${list([
  "territory;",
  "franchise tier;",
  "operational capacity;",
  "customer requirements;",
  "availability;",
  "qualification; and",
  "performance.",
])}
<p>The Franchisee shall respond to assigned leads promptly and maintain complete and accurate CRM records.</p>
<p>Customer and lead information obtained through Franchisor systems shall be handled only for authorised business purposes and in accordance with applicable law.</p>`,
  },
  {
    id: "technology",
    number: "15",
    heading: "TECHNOLOGY AND SYSTEM ACCESS",
    html: `
<p>The Franchisee shall use only approved:</p>
${list([
  "POS;",
  "Billing software;",
  "CRM;",
  "Mobile application;",
  "Website dashboard; and",
  "Other technology systems designated by the Franchisor.",
])}
<p>Access credentials are authorised for approved users only.</p>
<p>The Franchisee shall not:</p>
${list([
  "share credentials with unauthorised persons;",
  "interfere with platform security;",
  "reverse engineer systems;",
  "copy software;",
  "misuse system information; or",
  "permit unauthorised access.",
])}
<p>The Franchisor may suspend system access where required due to security, payment default, serious non-compliance or termination.</p>`,
  },
  {
    id: "confidentiality",
    number: "16",
    heading: "CONFIDENTIALITY",
    html: `
<p>The following shall be treated as confidential information:</p>
${list([
  "Recipes;",
  "Menus;",
  "SOPs;",
  "Manuals;",
  "Training materials;",
  "Customer information;",
  "Lead information;",
  "Supplier details;",
  "Vendor rates;",
  "Pricing;",
  "Margins;",
  "Commercial terms;",
  "Software credentials;",
  "Business processes;",
  "Marketing strategies; and",
  "Other non-public information of the Franchisor.",
])}
<p>The Franchisee shall not disclose, copy, sell, publish, transfer or use confidential information outside the authorised KHANA BANAO business.</p>
<p>These confidentiality obligations shall continue after expiry or termination to the extent permitted by applicable law.</p>`,
  },
  {
    id: "quality_audit",
    number: "17",
    heading: "QUALITY, AUDIT AND CORRECTIVE ACTION",
    html: `
<p>The Franchisor shall have the right to inspect or audit the Franchisee’s:</p>
${list([
  "Operations;",
  "Records;",
  "Food quality;",
  "Hygiene;",
  "Kitchen;",
  "Event execution;",
  "Customer service;",
  "Brand usage;",
  "CRM;",
  "Billing;",
  "Technology compliance; and",
  "Other relevant franchise operations.",
])}
<p>The Franchisee shall provide reasonable access and cooperation.</p>
<p>Non-compliance may result in:</p>
${list([
  "Corrective action;",
  "Retraining;",
  "Written warning;",
  "Suspension of lead access;",
  "Suspension of platform access;",
  "Suspension of brand use where necessary; or",
  "Termination,",
])}
<p>depending upon the seriousness and nature of the breach.</p>`,
  },
  {
    id: "compliance",
    number: "18",
    heading: "COMPLIANCE AND INSURANCE",
    html: `
<p>The Franchisee shall obtain and maintain all licences, registrations, permissions and approvals applicable to its operations.</p>
<p>This may include applicable:</p>
${list([
  "Food-safety requirements;",
  "Tax registrations;",
  "Premises permissions;",
  "Local business licences;",
  "Labour-related requirements; and",
  "Other statutory requirements.",
])}
<p>The Franchisee shall maintain appropriate insurance, where applicable, including:</p>
${list(["Premises;", "Employees/staff;", "Public liability;", "Fire; and", "Equipment."])}
<p>Evidence of insurance shall be provided to the Franchisor upon reasonable request.</p>`,
  },
  {
    id: "cancellation",
    number: "19",
    heading: "CANCELLATION AND REFUND",
    html: `
<p>The Franchise Fee shall be <strong>non-refundable</strong> after execution of this Agreement and commencement of onboarding, except where the Franchisor expressly agrees otherwise in writing or where a refund is required by applicable law.</p>
<p>Any refundable amount, if applicable, shall be settled after adjustment of:</p>
${list([
  "outstanding dues;",
  "applicable costs;",
  "damages;",
  "services already provided; and",
  "other legitimate contractual liabilities.",
])}
<p>Voluntary withdrawal, change of mind, failure to commence operations or failure to arrange the required investment after onboarding shall not by itself create a refund entitlement.</p>`,
  },
  {
    id: "no_guarantee",
    number: "20",
    heading: "NO GUARANTEE OF BUSINESS RESULTS",
    html: `
<p>The tier investments, average order values, net-profit figures, order counts and ROI timelines published or communicated as part of the KHANA BANAO franchise model are intended as business-planning figures.</p>
<p>They shall not constitute a guarantee of:</p>
${list([
  "Revenue;",
  "Profit;",
  "Orders;",
  "Customer volume;",
  "ROI;",
  "Payback period; or",
  "Recovery of investment.",
])}
<p>Actual business results depend on market demand, bookings, pricing, operating costs, competition, execution and the Franchisee’s management.</p>
<p>The Franchisee acknowledges that the franchise is an independent business opportunity and that business performance may vary.</p>`,
  },
  {
    id: "no_promises",
    number: "21",
    heading: "NO UNAUTHORISED COMMERCIAL PROMISES",
    html: `
<p>The Franchisee shall not represent, promise or guarantee to any customer, prospective franchisee or third party, on behalf of KHANA BANAO or Food Chain System:</p>
${list([
  "Guaranteed revenue;",
  "Guaranteed profit;",
  "Guaranteed ROI;",
  "Guaranteed number of orders;",
  "Guaranteed payback period;",
  "Refund;",
  "Discount;",
  "Employment;",
  "Service level; or",
  "Any other commercial outcome,",
])}
<p>unless expressly authorised in writing by the Franchisor.</p>
<p>The Franchisee shall not convert the ROI or order figures published by KHANA BANAO into a personal guarantee or promise to any third party.</p>`,
  },
  {
    id: "records",
    number: "22",
    heading: "RECORDS, AUDIT AND PAYMENT TRANSPARENCY",
    html: `
<p>The Franchisee shall maintain complete and accurate records relating to:</p>
${list([
  "Customer enquiries;",
  "Bookings;",
  "Quotations;",
  "Invoices;",
  "Payments;",
  "Refunds;",
  "Sales;",
  "Customer information;",
  "CRM records; and",
  "Other records reasonably required by the Franchisor.",
])}
<p>The Franchisor may reconcile CRM, booking, billing and payment information for the purpose of verifying Gross Revenue and royalty.</p>
<p>The Franchisee shall provide reasonable access to such records when requested.</p>`,
  },
  {
    id: "independent",
    number: "23",
    heading: "INDEPENDENT BUSINESS RELATIONSHIP",
    html: `
<p>The Franchisee is an independent business operator.</p>
<p>Nothing in this Agreement shall create:</p>
${list([
  "Employer-employee relationship;",
  "Partnership;",
  "Joint venture;",
  "Principal-agent relationship; or",
  "Any other relationship except the contractual franchise relationship expressly established under this Agreement.",
])}
<p>The Franchisee shall not represent that it has authority to bind the Franchisor.</p>
<p>The Franchisee shall not:</p>
${list([
  "Make unauthorised commitments;",
  "Give unauthorised discounts;",
  "Make unauthorised commercial promises; or",
  "Create liabilities on behalf of the Franchisor.",
])}`,
  },
  {
    id: "indemnity",
    number: "24",
    heading: "INDEMNITY",
    html: `
<p>To the extent permitted by applicable law, the Franchisee shall indemnify and hold harmless the Franchisor, its owners, officers and authorised personnel from third-party claims, losses, penalties, costs and reasonable legal expenses arising from:</p>
${list([
  "Franchisee negligence;",
  "Unlawful conduct;",
  "Food-safety or regulatory non-compliance;",
  "Employment-related matters arising from Franchisee personnel;",
  "Unauthorised representations;",
  "Misuse of KHANA BANAO brand/IP;",
  "Customer claims arising from Franchisee operations;",
  "Breach of this Agreement; or",
  "Other acts or omissions attributable to the Franchisee.",
])}
<p>The indemnity shall not apply to the extent a claim is finally determined to have resulted from the Franchisor’s own wilful misconduct or from liability that cannot lawfully be excluded.</p>`,
  },
  {
    id: "liability",
    number: "25",
    heading: "LIMITATION OF LIABILITY",
    html: `
<p>To the maximum extent permitted by law, the Franchisor shall not be liable for indirect, consequential, special or loss-of-profit damages arising from:</p>
${list([
  "Franchisee business operations;",
  "Market conditions;",
  "Customer decisions;",
  "Third-party acts;",
  "Local competition;",
  "Franchisee management; or",
  "Other matters outside the Franchisor’s reasonable control.",
])}
<p>Nothing in this Agreement shall exclude or limit liability that cannot lawfully be excluded or limited.</p>`,
  },
  {
    id: "termination",
    number: "26",
    heading: "TERMINATION",
    html: `
<p>The Franchisor may terminate this Agreement for material breach, subject where appropriate to a written cure period of <strong>{{cure_period}}</strong>.</p>
<p>Immediate termination may be exercised for serious matters including:</p>
${list([
  "Fraud;",
  "Deliberate falsification;",
  "Serious food-safety violation;",
  "Misuse of trademarks;",
  "Unauthorised transfer;",
  "Unauthorised sub-franchising;",
  "Serious reputational harm;",
  "Unlawful conduct;",
  "Material misuse of confidential information;",
  "Serious customer misconduct; or",
  "Other serious breach of the Agreement.",
])}
<p>Non-payment of franchise fees, royalties or other material dues may result in:</p>
${list([
  "Suspension of services;",
  "Suspension of leads;",
  "Suspension of technology access;",
  "Other contractual remedies; and/or",
  "Termination if not cured.",
])}
<p>The Franchisee may terminate for a material breach by the Franchisor that remains uncured after <strong>30 days’</strong> written notice, subject to settlement of all outstanding amounts and return of Franchisor property.</p>`,
  },
  {
    id: "post_termination",
    number: "27",
    heading: "POST-TERMINATION OBLIGATIONS",
    html: `
<p>Upon expiry or termination, the Franchisee shall immediately or within the period specified by the Franchisor:</p>
${list([
  "Stop representing itself as a KHANA BANAO franchise;",
  "Stop using KHANA BANAO branding;",
  "Stop using KHANA BANAO trademarks;",
  "Remove KHANA BANAO signboards;",
  "Remove branded materials;",
  "Stop using KHANA BANAO marketing material;",
  "Return or destroy manuals and confidential materials;",
  "Return or disable software, CRM, app and dashboard access;",
  "Stop unauthorised use of customer/lead data;",
  "Settle all outstanding fees and royalties; and",
  "Return all Franchisor property.",
])}
<p>Termination shall not affect accrued payment obligations or provisions which are intended by their nature to survive termination.</p>`,
  },
  {
    id: "force_majeure",
    number: "28",
    heading: "FORCE MAJEURE",
    html: `
<p>Neither Party shall be liable for delay or failure caused by circumstances beyond its reasonable control, including:</p>
${list([
  "Natural disasters;",
  "Pandemics;",
  "War;",
  "Government restrictions;",
  "Civil disturbances;",
  "Major infrastructure failures; or",
  "Similar events beyond reasonable control.",
])}
<p>The affected Party shall take reasonable steps to mitigate the effect of such circumstances and provide reasonable notice where practicable.</p>`,
  },
  {
    id: "disputes",
    number: "29",
    heading: "DISPUTE RESOLUTION",
    html: `
<p>The Parties shall first attempt to resolve disputes through good-faith mutual discussion.</p>
<p>If the dispute remains unresolved, it shall be referred to arbitration in accordance with the <strong>Arbitration and Conciliation Act, 1996</strong>, as amended from time to time.</p>
<p>The seat of arbitration shall be <strong>{{arbitration_seat}}</strong>.</p>
<p>The arbitration proceedings shall be conducted in English unless otherwise mutually agreed.</p>
<p>Subject to applicable law, courts at <strong>{{arbitration_seat}}</strong> shall have jurisdiction in matters requiring court intervention.</p>`,
  },
  {
    id: "governing_law",
    number: "30",
    heading: "GOVERNING LAW",
    html: `<p>This Agreement shall be governed by and construed in accordance with the laws of India.</p>`,
  },
  {
    id: "notices",
    number: "31",
    heading: "NOTICES",
    html: `
<p>Notices under this Agreement may be delivered through:</p>
${list(["Hand delivery;", "Recognised courier;", "Registered post; or", "Email"])}
<p>to the addresses and contact details recorded in Schedule A or otherwise formally notified by either Party.</p>
<p>Email communication may be treated as received when successful transmission is recorded, subject to applicable law and proof of delivery.</p>`,
  },
  {
    id: "general",
    number: "32",
    heading: "GENERAL PROVISIONS",
    html: `
<h4>Entire Agreement</h4>
<p>This Agreement together with its schedules constitutes the complete understanding between the Parties regarding the franchise arrangement.</p>
<h4>Amendments</h4>
<p>Any amendment or modification shall be made in writing and approved by authorised representatives of the Parties.</p>
<h4>Assignment</h4>
<p>The Franchisee shall not assign or transfer its rights or obligations without prior written approval of the Franchisor.</p>
<p>The Franchisor may restructure, reorganise or transfer its business rights subject to applicable law.</p>
<h4>Severability</h4>
<p>If any provision is held invalid or unenforceable, the remaining provisions shall continue to remain effective to the extent legally permissible.</p>
<h4>Waiver</h4>
<p>Failure to enforce any provision or right shall not constitute a waiver of that right or provision.</p>
<h4>Counterparts and Electronic Signatures</h4>
<p>The Parties may execute counterparts and use legally permissible electronic signatures.</p>
<h4>Language</h4>
<p>English shall be the controlling language of this Agreement.</p>`,
  },
  {
    id: "schedule_a",
    number: "",
    heading: "SCHEDULE A — COMMERCIAL AND TERRITORY DETAILS",
    html: `
<table class="schedule">
  <thead><tr><th>Item</th><th>Final details</th></tr></thead>
  <tbody>
    <tr><th>Effective Date</th><td>{{effective_date}}</td></tr>
    <tr><th>Franchisee Legal Name</th><td>{{franchisee_legal_name}}</td></tr>
    <tr><th>Selected Tier</th><td>{{selected_tier}}</td></tr>
    <tr><th>Approved Territory</th><td>{{approved_territory}}</td></tr>
    <tr><th>Territory Status</th><td>{{territory_status}}</td></tr>
    <tr><th>Franchise Fee</th><td>₹ {{franchise_fee_amount}}</td></tr>
    <tr><th>Applicable Royalty</th><td>{{royalty_percent}}%</td></tr>
    <tr><th>Royalty Basis</th><td>Gross Revenue</td></tr>
    <tr><th>Payment Cycle</th><td>{{payment_cycle}}</td></tr>
    <tr><th>Marketing Contribution</th><td>{{marketing_contribution}}</td></tr>
    <tr><th>Security Deposit</th><td>{{security_deposit}}</td></tr>
    <tr><th>Training</th><td>{{training_terms}}</td></tr>
    <tr><th>Renewal Fee</th><td>{{renewal_fee}}</td></tr>
    <tr><th>Cure Period</th><td>{{cure_period}}</td></tr>
    <tr><th>Arbitration Seat</th><td>{{arbitration_seat}}</td></tr>
    <tr><th>Authorised Franchisor Signatory</th><td>{{authorised_signatory}}</td></tr>
  </tbody>
</table>
<h4>Commercial Clarification</h4>
<p>The Parties shall clearly identify in this Schedule whether the selected Tier investment represents:</p>
<p>(a) the franchise fee/package fee; or</p>
<p>(b) a total initial investment comprising specified components.</p>
<p>The inclusions and exclusions applicable to the selected franchise package shall be recorded clearly before execution.</p>`,
  },
  {
    id: "schedule_b",
    number: "",
    heading: "SCHEDULE B — SUPPLEMENTAL COMMERCIAL & PROTECTIVE CLAUSES",
    html: `
<p>This Schedule B forms an integral part of the Agreement. Except for the clarifications and additional protections specifically stated below, all other terms and conditions of the Agreement shall remain unchanged.</p>
<h4>1. Gross Revenue</h4>
<p>The definition of Gross Revenue contained in Clause 7 shall apply for all royalty and revenue-reporting purposes.</p>
<h4>2. Commercial Clarity</h4>
<p>The exact Franchise Fee, Tier Investment, Royalty, Marketing Contribution, Security Deposit and other applicable charges shall be determined by Schedule A.</p>
<p>No amount shall be treated as payable unless it is expressly stated in the Agreement or Schedule A, except statutory amounts or other obligations expressly arising under the Agreement.</p>
<h4>3. Territory Protection</h4>
<p>Any territorial protection is conditional upon continued compliance, active operation, timely payment and maintenance of KHANA BANAO standards.</p>
<h4>4. Commercial Representation</h4>
<p>The Franchisee shall not make unauthorised promises or representations concerning ROI, profit, revenue, orders, refunds, discounts or other commercial outcomes.</p>
<h4>5. Customer and Lead Information</h4>
<p>Customer and lead information obtained through KHANA BANAO systems shall be used only for authorised business purposes and shall not be copied, sold, transferred or misused.</p>
<h4>6. Records and Verification</h4>
<p>The Franchisee shall maintain accurate business records and cooperate with reasonable verification of bookings, sales, payments and royalty calculations.</p>
<h4>7. Continuing Obligations</h4>
<p>Confidentiality, intellectual-property protection, accrued payment obligations, customer/lead information protection, indemnity, dispute resolution and other provisions intended by their nature to survive termination shall continue after expiry or termination.</p>`,
  },
  {
    id: "acknowledgement",
    number: "",
    heading: "ACKNOWLEDGEMENT",
    html: `
<p>The Franchisee confirms that:</p>
<ol>
  <li>The Franchisee has read and understood this Agreement.</li>
  <li>The Franchisee understands that the franchise is an independent business opportunity.</li>
  <li>The Franchisee understands that actual business performance may vary.</li>
  <li>The Franchisee has had an opportunity to seek independent professional/legal advice before signing.</li>
  <li>The Franchisee has not relied upon any unauthorised oral promise or representation not contained in this Agreement.</li>
  <li>The Franchisee agrees to comply with KHANA BANAO SOPs, brand standards, technology requirements and applicable laws.</li>
</ol>`,
  },
  {
    id: "signatures",
    number: "",
    heading: "SIGNATURES",
    html: `
<p>The Parties confirm that they have read, understood and agreed to the terms of this Agreement and voluntarily execute the same.</p>

<div class="sign-grid">
  <section class="sign-block">
    <h4>For Food Chain System / KHANA BANAO</h4>
    <p class="sign-role">Franchisor</p>
    <dl>
      <dt>Name</dt><dd>{{franchisor_signatory_name}}</dd>
      <dt>Designation</dt><dd>{{franchisor_signatory_designation}}</dd>
    </dl>
    <p class="sign-line">Signature</p>
    <dl>
      <dt>Date</dt><dd>{{franchisor_sign_date}}</dd>
      <dt>Place</dt><dd>{{franchisor_sign_place}}</dd>
    </dl>
    <p class="sign-line">Company Seal</p>
  </section>

  <section class="sign-block">
    <h4>For the Franchisee</h4>
    <p class="sign-role">Franchisee</p>
    <dl>
      <dt>Name</dt><dd>{{franchisee_signatory_name}}</dd>
      <dt>Designation</dt><dd>{{franchisee_signatory_designation}}</dd>
    </dl>
    <p class="sign-line">Signature</p>
    <dl>
      <dt>Date</dt><dd>{{franchisee_sign_date}}</dd>
      <dt>Place</dt><dd>{{franchisee_sign_place}}</dd>
    </dl>
    <p class="sign-line">Franchisee Seal</p>
  </section>

  <section class="sign-block">
    <h4>Witness 1</h4>
    <dl>
      <dt>Name</dt><dd>{{witness1_name}}</dd>
      <dt>Address</dt><dd>{{witness1_address}}</dd>
      <dt>Contact</dt><dd>{{witness1_contact}}</dd>
    </dl>
    <p class="sign-line">Signature</p>
  </section>

  <section class="sign-block">
    <h4>Witness 2</h4>
    <dl>
      <dt>Name</dt><dd>{{witness2_name}}</dd>
      <dt>Address</dt><dd>{{witness2_address}}</dd>
      <dt>Contact</dt><dd>{{witness2_contact}}</dd>
    </dl>
    <p class="sign-line">Signature</p>
  </section>
</div>

<dl class="execution">
  <dt>Execution Place</dt><dd>{{execution_place}}</dd>
  <dt>Date</dt><dd>{{agreement_date}}</dd>
</dl>`,
  },
  {
    id: "execution_note",
    number: "",
    heading: "FINAL EXECUTION NOTE",
    html: `
<p>Schedule A must be completely filled and verified before execution.</p>
<p>The Parties should verify the applicable stamp duty, registration/execution requirements and other legal requirements for the jurisdiction in which the Agreement is executed.</p>
<p>The final agreement should be reviewed by an appropriately qualified Indian legal professional before execution.</p>`,
  },
];

/** Lookup used by the editor and the renderer. */
export const CLAUSE_BY_ID = new Map(
  AGREEMENT_CLAUSES.map((clause) => [clause.id, clause] as const),
);
