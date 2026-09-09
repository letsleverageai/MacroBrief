import type { DataSource } from "@/lib/types";

/**
 * Source registry. This is the "initial link to each data source" the brief asks for —
 * official publishers post to stable URLs so these rarely need updating.
 * cost = marginal running cost at one scan/day.
 */
export const sources: DataSource[] = [
  // ---- Markets ----
  { id: "yfinance", name: "Yahoo Finance (via yfinance)", geo: "GLOBAL", feeds: ["Equities", "FX", "Commodities", "US yields"], method: "API", cadence: "Daily 05:00 UTC", cost: "Free (unofficial)", url: "https://github.com/ranaroussi/yfinance", status: "live" },
  { id: "stooq", name: "Stooq", geo: "GLOBAL", feeds: ["Index & FX history (CSV fallback)"], method: "CSV", cadence: "Daily", cost: "Free", url: "https://stooq.com/", status: "live" },
  { id: "boe_yields", name: "BoE yield curves", geo: "UK", feeds: ["Gilt nominal/real/OIS curves"], method: "CSV", cadence: "Daily", cost: "Free", url: "https://www.bankofengland.co.uk/statistics/yield-curves", status: "live" },
  { id: "ust_yields", name: "US Treasury par yield curve", geo: "US", feeds: ["UST yields"], method: "CSV", cadence: "Daily", cost: "Free", url: "https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve", status: "live" },
  { id: "chinabond", name: "ChinaBond / CFETS", geo: "CN", feeds: ["CGB yields", "USD/CNY fixing"], method: "Scrape", cadence: "Daily", cost: "Free", url: "https://www.chinamoney.com.cn/english/", status: "planned" },

  // ---- Calendar ----
  { id: "ff_cal", name: "Forex Factory calendar JSON", geo: "GLOBAL", feeds: ["Eco calendar (this week/next week, importance, consensus, previous, actual)"], method: "API", cadence: "Daily + intraday", cost: "Free", url: "https://nfs.faireconomy.media/ff_calendar_thisweek.json", status: "live" },
  { id: "ons_cal", name: "ONS release calendar", geo: "UK", feeds: ["Official release dates & links"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.ons.gov.uk/releasecalendar", status: "live" },
  { id: "bls_cal", name: "BLS / BEA release schedules", geo: "US", feeds: ["Official release dates"], method: "Scrape", cadence: "Weekly", cost: "Free", url: "https://www.bls.gov/schedule/news_release/", status: "live" },
  { id: "nbs_cal", name: "NBS release calendar", geo: "CN", feeds: ["Official release dates"], method: "Scrape", cadence: "Monthly", cost: "Free", url: "https://www.stats.gov.cn/english/PressRelease/", status: "planned" },

  // ---- Eco data ----
  { id: "ons_api", name: "ONS API (Beta)", geo: "UK", feeds: ["CPI, GDP, labour, retail, PSF, trade, HPI — 22 series"], method: "API", cadence: "Daily 08:00", cost: "Free", url: "https://developer.ons.gov.uk/", status: "live" },
  { id: "boe_db", name: "BoE Interactive Database", geo: "UK", feeds: ["Mortgage approvals, lending, M4, effective rates"], method: "CSV", cadence: "Monthly", cost: "Free", url: "https://www.bankofengland.co.uk/boeapps/database/", status: "live" },
  { id: "fred", name: "FRED API", geo: "US", feeds: ["All US macro series (BLS, BEA, Fed, Census, Freddie Mac)"], method: "API", cadence: "Daily", cost: "Free (API key)", url: "https://fred.stlouisfed.org/docs/api/fred/", status: "live" },
  { id: "nbs_data", name: "NBS data portal", geo: "CN", feeds: ["CPI/PPI, IP, retail, FAI, PMI, unemployment"], method: "Scrape", cadence: "Monthly", cost: "Free", url: "https://data.stats.gov.cn/english/", status: "live" },
  { id: "pboc_data", name: "PBoC statistics", geo: "CN", feeds: ["TSF, new loans, M2"], method: "Scrape", cadence: "Monthly", cost: "Free", url: "http://www.pbc.gov.cn/en/3688247/3688978/index.html", status: "live" },
  { id: "dbnomics", name: "DBnomics", geo: "GLOBAL", feeds: ["Aggregator fallback for ONS/NBS/IMF/OECD series"], method: "API", cadence: "Daily", cost: "Free", url: "https://db.nomics.world/", status: "live" },
  { id: "obr", name: "OBR databank", geo: "UK", feeds: ["Forecast profiles, headroom, PSF monthly commentary"], method: "CSV", cadence: "Monthly", cost: "Free", url: "https://obr.uk/data/", status: "live" },

  // ---- Decision makers ----
  { id: "govuk_atom", name: "gov.uk Atom feeds (per organisation)", geo: "UK", feeds: ["HMT", "No.10", "DBT", "DWP", "DESNZ"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.gov.uk/government/organisations/hm-treasury.atom", status: "live" },
  { id: "boe_rss", name: "Bank of England RSS", geo: "UK", feeds: ["News", "Speeches", "Publications"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.bankofengland.co.uk/rss", status: "live" },
  { id: "fed_rss", name: "Federal Reserve RSS", geo: "US", feeds: ["Press releases", "Speeches", "Testimony"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.federalreserve.gov/feeds/feeds.htm", status: "live" },
  { id: "ust_rss", name: "US Treasury press", geo: "US", feeds: ["Press releases", "Refunding"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://home.treasury.gov/news/press-releases", status: "live" },
  { id: "pboc_news", name: "PBoC English announcements", geo: "CN", feeds: ["Announcements", "Speeches", "MP reports"], method: "Scrape", cadence: "Daily", cost: "Free", url: "http://www.pbc.gov.cn/en/3688110/index.html", status: "live" },
  { id: "regulators", name: "UK regulators (FCA, PRA, Ofgem, Ofwat, Ofcom)", geo: "UK", feeds: ["News & publications"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.fca.org.uk/news/rss.xml", status: "live" },
  { id: "parliament", name: "UK Parliament bills & Hansard", geo: "UK", feeds: ["Bill stages", "Written statements"], method: "API", cadence: "Daily", cost: "Free", url: "https://bills-api.parliament.uk/", status: "planned" },

  // ---- News ----
  { id: "brave", name: "Brave Search API", geo: "GLOBAL", feeds: ["Headline discovery per geography & topic", "Freshness filter"], method: "API", cadence: "~20 queries/day", cost: "Free tier 2k/mo; $5 per 1k after", url: "https://brave.com/search/api/", status: "live" },
  { id: "rss_news", name: "Publisher RSS (FT, WSJ, Reuters via Google News, BBC, Economist)", geo: "GLOBAL", feeds: ["Headlines (title-only unless login)"], method: "RSS/Atom", cadence: "Daily", cost: "Free", url: "https://www.ft.com/rss/home", status: "live" },
  { id: "pub_logins", name: "Publisher logins (FT / WSJ / Bloomberg / Economist)", geo: "GLOBAL", feeds: ["Full-text summaries"], method: "Scrape", cadence: "Daily", cost: "Your existing subscriptions", url: "https://www.ft.com/", status: "needs_login" },
  { id: "gdelt", name: "GDELT 2.0", geo: "GLOBAL", feeds: ["Global news volume / tone backup"], method: "API", cadence: "15 min", cost: "Free", url: "https://www.gdeltproject.org/", status: "planned" },

  // ---- Positioning / sentiment ----
  { id: "cftc", name: "CFTC Commitments of Traders", geo: "US", feeds: ["Traders in Financial Futures", "Disaggregated commodities"], method: "CSV", cadence: "Weekly (Fri 20:30 UTC)", cost: "Free", url: "https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm", status: "live" },
  { id: "ice_cot", name: "ICE COT (gilts, SONIA, Brent)", geo: "UK", feeds: ["Long gilt", "Short sterling/SONIA", "Brent"], method: "CSV", cadence: "Weekly", cost: "Free", url: "https://www.ice.com/marketdata/reports/122", status: "live" },
  { id: "polymarket", name: "Polymarket Gamma API", geo: "GLOBAL", feeds: ["Rate decisions", "Politics", "Macro events"], method: "API", cadence: "Daily", cost: "Free", url: "https://docs.polymarket.com/", status: "live" },
  { id: "aaii", name: "AAII / NAAIM sentiment", geo: "US", feeds: ["Retail & adviser sentiment"], method: "Scrape", cadence: "Weekly", cost: "Free", url: "https://www.aaii.com/sentimentsurvey", status: "planned" },

  // ---- Pensions / insurers ----
  { id: "ons_mq5", name: "ONS MQ5", geo: "UK", feeds: ["Pension & insurer net investment by asset"], method: "API", cadence: "Quarterly", cost: "Free", url: "https://www.ons.gov.uk/economy/investmentspensionsandtrusts", status: "live" },
  { id: "ppf", name: "PPF 7800", geo: "UK", feeds: ["DB funding ratio"], method: "Scrape", cadence: "Monthly", cost: "Free", url: "https://www.ppf.co.uk/ppf-7800-index", status: "live" },
  { id: "dmo", name: "DMO gilt data", geo: "UK", feeds: ["Auction results", "Remit", "Holdings"], method: "CSV", cadence: "Weekly", cost: "Free", url: "https://www.dmo.gov.uk/data/", status: "live" },

  // ---- Polling ----
  { id: "yougov", name: "YouGov trackers", geo: "UK", feeds: ["Voting intention", "Leader approval"], method: "Scrape", cadence: "Weekly", cost: "Free", url: "https://yougov.co.uk/topics/politics/trackers", status: "live" },
  { id: "ipsos", name: "Ipsos Issues Index", geo: "UK", feeds: ["Most important issues"], method: "Scrape", cadence: "Monthly", cost: "Free", url: "https://www.ipsos.com/en-uk/ipsos-issues-index", status: "live" },

  // ---- LLM ----
  { id: "llm", name: "LLM summarisation (Anthropic Haiku / OpenAI mini)", geo: "GLOBAL", feeds: ["One-line outcome & consensus summaries", "Report parsing", "Headline ranking"], method: "LLM", cadence: "~60 calls/day", cost: "≈ $0.20–0.40/day", url: "https://docs.anthropic.com/", status: "live" },
];
