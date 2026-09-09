import type { Geo } from "@/lib/types";

export interface JournalEntry {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  geo: Geo;
  title: string;
  body: string;
  tags: string[];
  links: string[];
  createdAt: string;
  updatedAt: string;
}

export const JOURNAL_TEMPLATES: { label: string; title: string; tags: string[]; body: string }[] = [
  {
    label: "Pre-release call",
    title: "Call: <release> — <date>",
    tags: ["call"],
    body: "**Consensus:** \n**My call:** \n**Why:** \n**Market pricing going in:** \n**If beat:** \n**If miss:** \n**Risk to the call:** ",
  },
  {
    label: "Post-mortem",
    title: "Post-mortem: <event>",
    tags: ["post-mortem"],
    body: "**What happened:** \n**What I expected:** \n**Where the gap came from:** \n**Market reaction vs. what I'd have guessed:** \n**Lesson / rule change:** ",
  },
  {
    label: "Decision-maker read",
    title: "<Institution>: <document>",
    tags: ["dm"],
    body: "**Document:** \n**Key lines (quoted):** \n**Change vs. last time:** \n**What they are optimising for right now:** \n**Implication for the view:** ",
  },
  {
    label: "Weekly review",
    title: "Week in review — w/c <date>",
    tags: ["weekly"],
    body: "**Theme of the week:** \n**Best call:** \n**Worst call:** \n**Positioning / flows worth noting:** \n**Next week's set-up:** ",
  },
];

export const sampleJournal: JournalEntry[] = [
  {
    id: "j-2026-09-05-payrolls",
    date: "2026-09-05",
    geo: "US",
    title: "Post-mortem: August payrolls +22k vs 75k consensus",
    tags: ["post-mortem", "labour", "fed"],
    body:
      "**What happened:** NFP +22k (cons 75k), unemployment 4.3%, two-month revision -21k. Household survey soft too.\n" +
      "**What I expected:** In-line print, small downside risk from federal hiring freeze — did not have 22k on the card.\n" +
      "**Where the gap came from:** Health care carried July; it faded. Birth-death model still flattering the headline.\n" +
      "**Market reaction:** 2Y -12bp, 10Y -3bp on the day; Sep cut fully priced, Dec now ~70bp. Equities shrugged, DXY -0.4%.\n" +
      "**Lesson:** Watch the BLS response-rate footnote and JOLTS quits before leaning on consensus. Fade the first-hour move next time — the curve steepener was the trade, not duration.",
    links: ["https://www.bls.gov/news.release/empsit.nr0.htm"],
    createdAt: "2026-09-05T15:10:00Z",
    updatedAt: "2026-09-05T15:10:00Z",
  },
  {
    id: "j-2026-09-07-boe",
    date: "2026-09-07",
    geo: "UK",
    title: "BoE 18 Sep set-up: hold 4.00%, but 5–4 vote risk cuts both ways",
    tags: ["call", "boe", "gilts"],
    body:
      "**Consensus:** Hold at 4.00%, QT pace cut from £100bn to ~£70bn.\n" +
      "**My call:** Hold, 7–2. QT taper is the real news — long end reacts more to the gilt sales skew than to the rate vote.\n" +
      "**Why:** Services CPI 5.0% still too hot; Bailey's Jackson Hole tone was 'gradual and careful'. Pay growth cooling but from 4.8%.\n" +
      "**If dovish surprise:** 2s10s steepener already stretched; 10Y gilt 4.45% → 4.30% quickly, sterling -0.8%.\n" +
      "**Risk to the call:** Aug CPI (17 Sep) at 3.9% or above forces a hawkish dissent narrative into the MPC.",
    links: ["https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes/2026/september-2026"],
    createdAt: "2026-09-07T18:40:00Z",
    updatedAt: "2026-09-07T18:40:00Z",
  },
  {
    id: "j-2026-09-08-china",
    date: "2026-09-08",
    geo: "CN",
    title: "China trade: exports +4.4% y/y, imports +1.3% — domestic demand still the weak leg",
    tags: ["dm", "trade", "pboc"],
    body:
      "**Document:** GAC August trade data.\n" +
      "**Key lines:** Exports to ASEAN +22.5% y/y; exports to US -33.1% y/y (fifth straight double-digit drop). Imports +1.3% vs 3.0% consensus.\n" +
      "**Change vs last time:** Export growth slowing from 7.2% in July; re-routing via ASEAN stays the story.\n" +
      "**Implication:** Supports the deflation-drag view for CPI on Wed (cons 0.1%). PBoC likely stays on hold; watch for a 10bp 7-day RR cut into Q4 if PPI stays below -2%.",
    links: ["http://english.customs.gov.cn/"],
    createdAt: "2026-09-08T08:20:00Z",
    updatedAt: "2026-09-08T08:20:00Z",
  },
];
