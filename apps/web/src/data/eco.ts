import type { EcoSeries, PolicyPanel, SeriesPoint, Geo, EcoCategory } from "@/lib/types";

/** Build monthly history ending at `end` (YYYY-MM) from an array of values (oldest → newest). */
function monthly(end: string, values: number[]): SeriesPoint[] {
  const [y, m] = end.split("-").map(Number);
  const out: SeriesPoint[] = [];
  for (let i = values.length - 1; i >= 0; i--) {
    const idx = values.length - 1 - i;
    const d = new Date(Date.UTC(y, m - 1 - idx, 1));
    out.unshift({ period: d.toISOString().slice(0, 7), value: values[i] });
  }
  return out;
}
function quarterly(end: string, values: number[]): SeriesPoint[] {
  // end e.g. "2026-Q2"
  const [y, q] = [Number(end.slice(0, 4)), Number(end.slice(6))];
  const out: SeriesPoint[] = [];
  for (let i = 0; i < values.length; i++) {
    let qq = q - (values.length - 1 - i);
    let yy = y;
    while (qq <= 0) { qq += 4; yy -= 1; }
    out.push({ period: `${yy}-Q${qq}`, value: values[i] });
  }
  return out;
}

type Def = {
  id: string; geo: Geo; category: EcoCategory; name: string; unit: string;
  frequency: EcoSeries["frequency"]; history: SeriesPoint[]; consensus?: number;
  sourceName: string; sourceUrl: string; nextRelease?: string; note?: string; higherIsHot?: boolean;
};

function build(d: Def): EcoSeries {
  const h = d.history;
  return { ...d, latest: h[h.length - 1], previous: h[h.length - 2] };
}

const ONS = "https://www.ons.gov.uk";
const FRED = (s: string) => `https://fred.stlouisfed.org/series/${s}`;
const NBS = "https://www.stats.gov.cn/english/PressRelease/";
const BOE_DB = "https://www.bankofengland.co.uk/boeapps/database/";

const defs: Def[] = [
  // ======================= UK =======================
  // Activity & Spending
  { id: "uk_gdp_m", geo: "UK", category: "activity", name: "GDP monthly", unit: "% m/m", frequency: "M", consensus: 0.1, nextRelease: "2026-09-11", sourceName: "ONS", sourceUrl: `${ONS}/economy/grossdomesticproductgdp/bulletins/gdpmonthlyestimateuk/latest`,
    history: monthly("2026-06", [0.5, 0.2, 0.0, -0.1, 0.4, 0.3, 0.0, -0.3, 0.2, 0.1, 0.4, 0.4]) },
  { id: "uk_gdp_q", geo: "UK", category: "activity", name: "GDP quarterly", unit: "% q/q", frequency: "Q", nextRelease: "2026-09-30", sourceName: "ONS", sourceUrl: `${ONS}/economy/grossdomesticproductgdp/bulletins/gdpfirstquarterlyestimateuk/latest`,
    history: quarterly("2026-Q2", [0.7, 0.5, 0.0, 0.1, 0.7, 0.3, 0.4, 0.3]) },
  { id: "uk_services", geo: "UK", category: "activity", name: "Index of Services", unit: "% m/m", frequency: "M", nextRelease: "2026-09-11", sourceName: "ONS", sourceUrl: `${ONS}/economy/economicoutputandproductivity/output/bulletins/indexofservices/latest`,
    history: monthly("2026-06", [0.4, 0.2, 0.1, -0.1, 0.4, 0.3, 0.0, -0.3, 0.2, 0.1, 0.3, 0.3]) },
  { id: "uk_ip", geo: "UK", category: "activity", name: "Index of Production", unit: "% m/m", frequency: "M", consensus: 0.0, nextRelease: "2026-09-11", sourceName: "ONS", sourceUrl: `${ONS}/economy/economicoutputandproductivity/output/bulletins/indexofproduction/latest`,
    history: monthly("2026-06", [1.1, -0.6, -0.4, 0.2, -0.5, -0.1, 0.6, -0.9, -0.2, 0.3, 0.9, 0.7]) },
  { id: "uk_retail", geo: "UK", category: "activity", name: "Retail Sales volumes", unit: "% m/m", frequency: "M", nextRelease: "2026-09-19", sourceName: "ONS", sourceUrl: `${ONS}/businessindustryandtrade/retailindustry/bulletins/retailsales/latest`,
    history: monthly("2026-07", [1.0, -0.7, 0.3, 1.9, -0.6, 0.7, 0.5, 1.2, -2.8, 0.9, 0.3, 0.6]) },
  { id: "uk_construction", geo: "UK", category: "activity", name: "Construction Output", unit: "% m/m", frequency: "M", nextRelease: "2026-09-11", sourceName: "ONS", sourceUrl: `${ONS}/businessindustryandtrade/constructionindustry/bulletins/constructionoutputingreatbritain/latest`,
    history: monthly("2026-06", [0.6, -0.3, 0.3, 0.4, -0.2, 0.2, 0.3, -0.1, 0.9, -0.4, 0.5, 1.2]) },
  { id: "uk_pmi_comp", geo: "UK", category: "activity", name: "Composite PMI (final)", unit: "index", frequency: "M", nextRelease: "2026-09-23", sourceName: "S&P Global / CIPS", sourceUrl: "https://www.pmi.spglobal.com/Public/Release/PressReleases",
    history: monthly("2026-08", [50.8, 51.5, 50.9, 50.4, 51.5, 48.5, 51.5, 50.3, 52.0, 51.5, 53.0, 53.5]) },
  { id: "uk_bus_inv", geo: "UK", category: "activity", name: "Business Investment", unit: "% q/q", frequency: "Q", nextRelease: "2026-09-30", sourceName: "ONS", sourceUrl: `${ONS}/economy/grossdomesticproductgdp/bulletins/businessinvestment/latest`,
    history: quarterly("2026-Q2", [1.2, -1.4, 2.2, 5.9, -4.0, 0.6, 1.1, 0.4]) },

  // Labour & Household Income
  { id: "uk_unemp", geo: "UK", category: "labour", name: "Unemployment rate (3m)", unit: "%", frequency: "M", consensus: 4.7, nextRelease: "2026-09-15", sourceName: "ONS", sourceUrl: `${ONS}/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/mgsx/lms`,
    history: monthly("2026-06", [4.3, 4.4, 4.4, 4.4, 4.4, 4.5, 4.6, 4.7, 4.7, 4.7, 4.7, 4.7]) },
  { id: "uk_awe", geo: "UK", category: "labour", name: "Average Weekly Earnings (regular, 3m y/y)", unit: "%", frequency: "M", consensus: 4.6, nextRelease: "2026-09-15", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/employmentandlabourmarket/peopleinwork/earningsandworkinghours/bulletins/averageweeklyearningsingreatbritain/latest`,
    history: monthly("2026-06", [5.9, 5.6, 5.9, 5.9, 5.8, 5.6, 5.3, 5.2, 5.0, 5.0, 5.0, 4.8]) },
  { id: "uk_payrolls", geo: "UK", category: "labour", name: "PAYE payrolled employees", unit: "k m/m", frequency: "M", nextRelease: "2026-09-15", sourceName: "ONS / HMRC", sourceUrl: `${ONS}/employmentandlabourmarket/peopleinwork/earningsandworkinghours/bulletins/earningsandemploymentfrompayasyouearnrealtimeinformationuk/latest`,
    history: monthly("2026-07", [-8, 12, -20, -35, -47, -25, -55, -109, -41, -26, -8, -15]) },
  { id: "uk_vacancies", geo: "UK", category: "labour", name: "Vacancies (3m)", unit: "k", frequency: "M", nextRelease: "2026-09-15", sourceName: "ONS", sourceUrl: `${ONS}/employmentandlabourmarket/peoplenotinwork/unemployment/timeseries/ap2y/lms`,
    history: monthly("2026-06", [831, 818, 812, 802, 788, 781, 770, 761, 750, 736, 727, 718]) },
  { id: "uk_inactivity", geo: "UK", category: "labour", name: "Inactivity rate (16–64)", unit: "%", frequency: "M", nextRelease: "2026-09-15", sourceName: "ONS", sourceUrl: `${ONS}/employmentandlabourmarket/peoplenotinwork/economicinactivity/timeseries/lf2s/lms`,
    history: monthly("2026-06", [21.8, 21.6, 21.5, 21.5, 21.4, 21.5, 21.4, 21.3, 21.1, 21.0, 21.0, 21.0]) },
  { id: "uk_claimant", geo: "UK", category: "labour", name: "Claimant count change", unit: "k", frequency: "M", nextRelease: "2026-09-15", sourceName: "ONS / DWP", sourceUrl: `${ONS}/employmentandlabourmarket/peoplenotinwork/outofworkbenefits/timeseries/bcjd/unem`,
    history: monthly("2026-07", [12.1, 8.4, 23.6, -15.4, 33.1, 21.4, 5.2, -21.2, 25.9, 8.8, 4.1, 17.6]) },

  // Inflation & Costs
  { id: "uk_cpi", geo: "UK", category: "inflation", name: "CPI", unit: "% y/y", frequency: "M", consensus: 3.7, nextRelease: "2026-09-16", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/economy/inflationandpriceindices/bulletins/consumerpriceinflation/latest`,
    history: monthly("2026-07", [2.2, 1.7, 2.3, 2.6, 2.5, 3.0, 2.8, 2.6, 3.5, 3.4, 3.6, 3.8]) },
  { id: "uk_core_cpi", geo: "UK", category: "inflation", name: "Core CPI", unit: "% y/y", frequency: "M", consensus: 3.7, nextRelease: "2026-09-16", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/economy/inflationandpriceindices/timeseries/dko8/mm23`,
    history: monthly("2026-07", [3.6, 3.2, 3.3, 3.5, 3.2, 3.7, 3.5, 3.4, 3.8, 3.5, 3.7, 3.8]) },
  { id: "uk_services_cpi", geo: "UK", category: "inflation", name: "Services CPI", unit: "% y/y", frequency: "M", nextRelease: "2026-09-16", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/economy/inflationandpriceindices/timeseries/kf8h/mm23`,
    history: monthly("2026-07", [5.6, 4.9, 5.0, 5.0, 4.4, 5.0, 4.7, 4.7, 5.4, 4.7, 4.7, 5.0]) },
  { id: "uk_ppi_out", geo: "UK", category: "inflation", name: "PPI output prices", unit: "% y/y", frequency: "M", nextRelease: "2026-09-16", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/economy/inflationandpriceindices/bulletins/producerpriceinflation/latest`,
    history: monthly("2026-07", [0.5, -0.3, -0.5, 0.0, 0.2, 0.3, 0.5, 0.6, 0.7, 0.4, 0.6, 0.9]) },
  { id: "uk_rents", geo: "UK", category: "inflation", name: "Private rents (PIPR)", unit: "% y/y", frequency: "M", nextRelease: "2026-09-16", higherIsHot: true, sourceName: "ONS", sourceUrl: `${ONS}/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/latest`,
    history: monthly("2026-07", [8.4, 8.7, 9.1, 9.0, 8.7, 8.1, 7.7, 7.4, 7.0, 6.7, 6.7, 6.4]) },
  { id: "uk_shop_prices", geo: "UK", category: "inflation", name: "BRC Shop Price Index", unit: "% y/y", frequency: "M", nextRelease: "2026-09-30", higherIsHot: true, sourceName: "BRC / NIQ", sourceUrl: "https://brc.org.uk/insight/content/economics/shop-price-index/",
    history: monthly("2026-08", [-0.6, -0.8, -0.6, -1.0, -0.7, -0.7, -0.4, -0.1, 0.4, 0.7, 0.9, 1.1]) },
  { id: "uk_infl_exp", geo: "UK", category: "inflation", name: "Inflation Attitudes: 1Y-ahead expectations", unit: "%", frequency: "Q", nextRelease: "2026-09-12", higherIsHot: true, sourceName: "BoE / Ipsos", sourceUrl: "https://www.bankofengland.co.uk/inflation-attitudes-survey",
    history: quarterly("2026-Q2", [2.8, 2.7, 3.0, 3.0, 3.4, 3.2, 3.6, 3.7]) },

  // Credit, Housing & Financial Transmission
  { id: "uk_mortgage_appr", geo: "UK", category: "credit", name: "Mortgage approvals (house purchase)", unit: "k", frequency: "M", nextRelease: "2026-09-29", sourceName: "Bank of England", sourceUrl: `${BOE_DB}fromshowcolumns.asp?Travel=NIxSTxTIx&SearchText=LPMVTVX`,
    history: monthly("2026-07", [64.9, 65.6, 68.1, 66.0, 66.5, 65.4, 64.7, 60.2, 63.0, 64.5, 66.1, 65.8]) },
  { id: "uk_net_lending", geo: "UK", category: "credit", name: "Net mortgage lending", unit: "£bn", frequency: "M", nextRelease: "2026-09-29", sourceName: "Bank of England", sourceUrl: `${BOE_DB}`,
    history: monthly("2026-07", [2.5, 2.9, 3.4, 3.6, 4.2, 3.3, 13.0, -0.8, 2.1, 5.3, 4.2, 3.8]) },
  { id: "uk_consumer_credit", geo: "UK", category: "credit", name: "Consumer credit growth", unit: "% y/y", frequency: "M", nextRelease: "2026-09-29", sourceName: "Bank of England", sourceUrl: `${BOE_DB}`,
    history: monthly("2026-07", [7.7, 7.4, 6.8, 6.5, 6.4, 6.4, 6.5, 6.5, 6.7, 6.9, 7.0, 7.1]) },
  { id: "uk_hpi", geo: "UK", category: "credit", name: "House Price Index (official)", unit: "% y/y", frequency: "M", nextRelease: "2026-09-16", sourceName: "ONS / HM Land Registry", sourceUrl: `${ONS}/economy/inflationandpriceindices/bulletins/housepriceindex/latest`,
    history: monthly("2026-06", [3.0, 3.4, 3.3, 4.6, 4.9, 5.4, 6.4, 3.5, 3.9, 3.9, 3.4, 3.7]) },
  { id: "uk_halifax", geo: "UK", category: "credit", name: "Halifax HPI", unit: "% y/y", frequency: "M", nextRelease: "2026-10-07", sourceName: "Halifax", sourceUrl: "https://www.halifax.co.uk/media-centre/house-price-index.html",
    history: monthly("2026-08", [4.7, 3.9, 4.8, 3.3, 3.0, 2.9, 2.8, 3.2, 2.5, 2.5, 2.4, 2.4]) },
  { id: "uk_insolvencies", geo: "UK", category: "credit", name: "Company insolvencies (E&W)", unit: "count", frequency: "M", nextRelease: "2026-09-19", sourceName: "Insolvency Service", sourceUrl: "https://www.gov.uk/government/collections/insolvency-service-official-statistics",
    history: monthly("2026-07", [1975, 1720, 1747, 1966, 1971, 2035, 1992, 2011, 2238, 2043, 2081, 2043]) },
  { id: "uk_m4", geo: "UK", category: "credit", name: "M4ex money growth", unit: "% y/y", frequency: "M", nextRelease: "2026-09-29", sourceName: "Bank of England", sourceUrl: `${BOE_DB}`,
    history: monthly("2026-07", [3.4, 3.7, 3.9, 4.1, 4.3, 4.0, 3.8, 4.1, 4.4, 4.5, 4.4, 4.5]) },

  // Government & External
  { id: "uk_psnb", geo: "UK", category: "government", name: "Public Sector Net Borrowing (ex banks)", unit: "£bn", frequency: "M", nextRelease: "2026-09-19", sourceName: "ONS", sourceUrl: `${ONS}/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/latest`,
    history: monthly("2026-07", [16.6, 18.2, 11.2, 17.8, -15.4, 10.7, 16.4, 20.2, 17.7, 20.7, 6.6, 1.1]) },
  { id: "uk_psnb_ytd", geo: "UK", category: "government", name: "PSNB fiscal-year-to-date vs OBR profile", unit: "£bn", frequency: "M", nextRelease: "2026-09-19", sourceName: "ONS / OBR", sourceUrl: "https://obr.uk/public-finances-databank/",
    history: monthly("2026-07", [0, 0, 0, 0, 0, 0, 0, 0, 1.1, 3.6, 5.3, 6.7]), note: "Cumulative overshoot vs March forecast profile" },
  { id: "uk_debt_gdp", geo: "UK", category: "government", name: "Public sector net debt", unit: "% GDP", frequency: "M", nextRelease: "2026-09-19", sourceName: "ONS", sourceUrl: `${ONS}/economy/governmentpublicsectorandtaxes/publicsectorfinance/timeseries/hf6x/pusf`,
    history: monthly("2026-07", [94.8, 95.1, 95.3, 95.8, 95.4, 95.5, 95.6, 95.9, 95.8, 96.0, 96.2, 96.1]) },
  { id: "uk_debt_interest", geo: "UK", category: "government", name: "Central govt debt interest (12m rolling)", unit: "£bn", frequency: "M", nextRelease: "2026-09-19", sourceName: "ONS", sourceUrl: `${ONS}/economy/governmentpublicsectorandtaxes/publicsectorfinance/bulletins/publicsectorfinances/latest`,
    history: monthly("2026-07", [104, 105, 105, 106, 107, 108, 109, 110, 111, 111, 112, 113]) },
  { id: "uk_trade", geo: "UK", category: "government", name: "Trade balance (goods & services)", unit: "£bn", frequency: "M", consensus: -6.0, nextRelease: "2026-09-11", sourceName: "ONS", sourceUrl: `${ONS}/economy/nationalaccounts/balanceofpayments/bulletins/uktrade/latest`,
    history: monthly("2026-06", [-2.8, -3.3, -4.4, -3.0, -3.6, -5.2, -2.4, -3.8, -6.9, -4.4, -4.0, -5.6]) },
  { id: "uk_ca", geo: "UK", category: "government", name: "Current account balance", unit: "% GDP", frequency: "Q", nextRelease: "2026-09-30", sourceName: "ONS", sourceUrl: `${ONS}/economy/nationalaccounts/balanceofpayments/bulletins/balanceofpayments/latest`,
    history: quarterly("2026-Q1", [-2.7, -3.0, -3.7, -2.9, -3.1, -3.4, -2.8, -3.2]) },
  { id: "uk_fdi", geo: "UK", category: "government", name: "Inward FDI flows", unit: "£bn", frequency: "Q", nextRelease: "2026-09-30", sourceName: "ONS", sourceUrl: `${ONS}/economy/nationalaccounts/balanceofpayments/bulletins/foreigndirectinvestmentinvolvingukcompanies/latest`,
    history: quarterly("2026-Q1", [9.1, 7.8, 5.2, 8.9, 11.4, 6.3, 7.9, 10.2]) },

  // Other
  { id: "uk_dmp_price_exp", geo: "UK", category: "other", name: "BoE DMP: 1Y-ahead own-price expectations", unit: "%", frequency: "M", nextRelease: "2026-10-01", higherIsHot: true, sourceName: "Bank of England DMP", sourceUrl: "https://www.bankofengland.co.uk/decision-maker-panel",
    history: monthly("2026-08", [3.6, 3.7, 3.8, 3.9, 4.0, 3.9, 3.9, 3.7, 3.7, 3.7, 3.6, 3.6]) },
  { id: "uk_dmp_wage_exp", geo: "UK", category: "other", name: "BoE DMP: expected wage growth (1Y)", unit: "%", frequency: "M", nextRelease: "2026-10-01", higherIsHot: true, sourceName: "Bank of England DMP", sourceUrl: "https://www.bankofengland.co.uk/decision-maker-panel",
    history: monthly("2026-08", [4.0, 4.0, 4.0, 3.9, 3.9, 3.8, 3.8, 3.7, 3.7, 3.6, 3.6, 3.5]) },
  { id: "uk_gfk", geo: "UK", category: "other", name: "GfK Consumer Confidence", unit: "index", frequency: "M", nextRelease: "2026-09-19", sourceName: "GfK", sourceUrl: "https://www.gfk.com/products/gfk-consumer-confidence-barometer",
    history: monthly("2026-08", [-21, -20, -19, -22, -20, -20, -23, -23, -20, -18, -19, -17]) },
  { id: "uk_lloyds_bb", geo: "UK", category: "other", name: "Lloyds Business Barometer", unit: "%", frequency: "M", nextRelease: "2026-09-30", sourceName: "Lloyds Bank", sourceUrl: "https://www.lloydsbankinggroup.com/insights/business-barometer.html",
    history: monthly("2026-08", [50, 47, 42, 39, 37, 49, 49, 39, 50, 50, 51, 54]) },
  { id: "uk_agents", geo: "UK", category: "other", name: "BoE Agents' Scores: employment intentions", unit: "score", frequency: "Q", nextRelease: "2026-09-17", sourceName: "Bank of England Agents", sourceUrl: "https://www.bankofengland.co.uk/agents-summary",
    history: quarterly("2026-Q2", [0.5, 0.4, 0.2, -0.3, -0.8, -1.1, -1.2, -1.0]) },

  // ======================= US =======================
  { id: "us_gdp", geo: "US", category: "activity", name: "Real GDP (annualised)", unit: "% q/q saar", frequency: "Q", nextRelease: "2026-09-25", sourceName: "BEA", sourceUrl: "https://www.bea.gov/data/gdp/gross-domestic-product",
    history: quarterly("2026-Q2", [3.0, 3.1, 2.4, -0.5, 3.3, 2.1, 1.6, 2.4]) },
  { id: "us_retail", geo: "US", category: "activity", name: "Retail Sales", unit: "% m/m", frequency: "M", nextRelease: "2026-09-16", sourceName: "Census Bureau", sourceUrl: FRED("RSAFS"),
    history: monthly("2026-07", [0.6, 0.4, 0.7, 0.4, -0.9, 0.2, 1.7, -0.1, 0.9, 0.6, 0.9, 0.5]) },
  { id: "us_ism_mfg", geo: "US", category: "activity", name: "ISM Manufacturing PMI", unit: "index", frequency: "M", nextRelease: "2026-10-01", sourceName: "ISM", sourceUrl: "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/pmi/",
    history: monthly("2026-08", [47.2, 46.5, 48.4, 49.3, 50.9, 50.3, 49.0, 48.7, 48.5, 49.0, 48.0, 48.7]) },
  { id: "us_ism_svc", geo: "US", category: "activity", name: "ISM Services PMI", unit: "index", frequency: "M", nextRelease: "2026-10-03", sourceName: "ISM", sourceUrl: "https://www.ismworld.org/supply-management-news-and-reports/reports/ism-report-on-business/services/",
    history: monthly("2026-08", [54.9, 56.0, 52.1, 54.1, 52.8, 53.5, 50.8, 51.6, 49.9, 50.8, 50.1, 52.0]) },
  { id: "us_ip", geo: "US", category: "activity", name: "Industrial Production", unit: "% m/m", frequency: "M", nextRelease: "2026-09-17", sourceName: "Federal Reserve", sourceUrl: FRED("INDPRO"),
    history: monthly("2026-07", [-0.3, 0.2, 0.4, 0.5, 0.8, 0.2, -0.2, 0.1, 0.0, 0.4, 0.3, -0.1]) },

  { id: "us_nfp", geo: "US", category: "labour", name: "Nonfarm Payrolls", unit: "k m/m", frequency: "M", nextRelease: "2026-10-02", sourceName: "BLS", sourceUrl: FRED("PAYEMS"),
    history: monthly("2026-08", [78, 44, 261, 323, 111, 102, 158, 19, 79, 14, 79, 54]) },
  { id: "us_unemp", geo: "US", category: "labour", name: "Unemployment rate", unit: "%", frequency: "M", nextRelease: "2026-10-02", sourceName: "BLS", sourceUrl: FRED("UNRATE"),
    history: monthly("2026-08", [4.1, 4.2, 4.1, 4.0, 4.1, 4.2, 4.2, 4.2, 4.1, 4.2, 4.3, 4.4]) },
  { id: "us_ahe", geo: "US", category: "labour", name: "Average Hourly Earnings", unit: "% y/y", frequency: "M", nextRelease: "2026-10-02", higherIsHot: true, sourceName: "BLS", sourceUrl: FRED("CES0500000003"),
    history: monthly("2026-08", [4.0, 4.0, 4.2, 4.1, 4.0, 3.8, 3.8, 3.9, 3.8, 3.7, 3.9, 3.7]) },
  { id: "us_jolts", geo: "US", category: "labour", name: "JOLTS job openings", unit: "mn", frequency: "M", nextRelease: "2026-09-30", sourceName: "BLS", sourceUrl: FRED("JTSJOL"),
    history: monthly("2026-07", [7.86, 7.44, 8.16, 7.51, 7.76, 7.57, 7.19, 7.39, 7.77, 7.44, 7.18, 7.05]) },
  { id: "us_claims", geo: "US", category: "labour", name: "Initial jobless claims (4wk avg)", unit: "k", frequency: "W", nextRelease: "2026-09-10", sourceName: "DOL", sourceUrl: FRED("IC4WSA"),
    history: monthly("2026-08", [228, 231, 236, 224, 219, 226, 224, 222, 231, 244, 240, 236]) },

  { id: "us_cpi", geo: "US", category: "inflation", name: "CPI", unit: "% y/y", frequency: "M", consensus: 2.9, nextRelease: "2026-09-10", higherIsHot: true, sourceName: "BLS", sourceUrl: FRED("CPIAUCSL"),
    history: monthly("2026-07", [2.5, 2.4, 2.6, 2.7, 2.9, 3.0, 2.8, 2.4, 2.3, 2.4, 2.7, 2.7]) },
  { id: "us_core_cpi", geo: "US", category: "inflation", name: "Core CPI", unit: "% y/y", frequency: "M", consensus: 3.1, nextRelease: "2026-09-10", higherIsHot: true, sourceName: "BLS", sourceUrl: FRED("CPILFESL"),
    history: monthly("2026-07", [3.2, 3.3, 3.3, 3.3, 3.2, 3.3, 3.1, 2.8, 2.8, 2.8, 2.9, 3.1]) },
  { id: "us_core_pce", geo: "US", category: "inflation", name: "Core PCE", unit: "% y/y", frequency: "M", nextRelease: "2026-09-26", higherIsHot: true, sourceName: "BEA", sourceUrl: FRED("PCEPILFE"),
    history: monthly("2026-07", [2.7, 2.7, 2.8, 2.9, 2.9, 2.7, 2.8, 2.7, 2.6, 2.8, 2.8, 2.9]) },
  { id: "us_ppi", geo: "US", category: "inflation", name: "PPI Final Demand", unit: "% y/y", frequency: "M", consensus: 3.3, nextRelease: "2026-09-09", higherIsHot: true, sourceName: "BLS", sourceUrl: FRED("PPIFIS"),
    history: monthly("2026-07", [1.9, 2.0, 2.6, 3.0, 3.5, 3.7, 3.4, 2.7, 2.5, 2.7, 2.4, 3.3]) },
  { id: "us_umich_exp", geo: "US", category: "inflation", name: "UMich 1Y inflation expectations", unit: "%", frequency: "M", consensus: 4.7, nextRelease: "2026-09-11", higherIsHot: true, sourceName: "University of Michigan", sourceUrl: "https://www.sca.isr.umich.edu/",
    history: monthly("2026-08", [2.7, 2.9, 2.6, 2.8, 3.3, 4.3, 5.0, 6.5, 6.6, 5.0, 4.5, 4.8]) },

  { id: "us_mortgage_rate", geo: "US", category: "credit", name: "30Y fixed mortgage rate", unit: "%", frequency: "W", nextRelease: "2026-09-10", sourceName: "Freddie Mac", sourceUrl: FRED("MORTGAGE30US"),
    history: monthly("2026-08", [6.35, 6.12, 6.72, 6.85, 6.96, 6.85, 6.65, 6.81, 6.76, 6.84, 6.72, 6.50]) },
  { id: "us_case_shiller", geo: "US", category: "credit", name: "Case-Shiller 20-city HPI", unit: "% y/y", frequency: "M", nextRelease: "2026-09-30", sourceName: "S&P DJI", sourceUrl: FRED("SPCS20RSA"),
    history: monthly("2026-06", [5.2, 4.6, 4.2, 4.3, 4.5, 4.7, 4.5, 4.1, 3.4, 2.8, 2.1, 1.9]) },
  { id: "us_ci_loans", geo: "US", category: "credit", name: "C&I loan growth", unit: "% y/y", frequency: "W", nextRelease: "2026-09-11", sourceName: "Federal Reserve H.8", sourceUrl: FRED("BUSLOANS"),
    history: monthly("2026-08", [-0.6, -0.9, -0.4, 0.2, 0.7, 1.4, 1.9, 2.3, 2.6, 2.9, 3.0, 3.1]) },
  { id: "us_sloos", geo: "US", category: "credit", name: "SLOOS: net % tightening C&I standards", unit: "%", frequency: "Q", nextRelease: "2026-11-09", sourceName: "Federal Reserve", sourceUrl: "https://www.federalreserve.gov/data/sloos.htm",
    history: quarterly("2026-Q3", [15.6, 7.9, 0.0, 6.2, 18.5, 9.7, 3.4, 5.1]) },

  { id: "us_deficit", geo: "US", category: "government", name: "Federal budget balance (12m rolling)", unit: "$bn", frequency: "M", nextRelease: "2026-09-11", sourceName: "US Treasury", sourceUrl: FRED("MTSDS133FMS"),
    history: monthly("2026-08", [-1897, -1833, -1912, -1960, -2010, -1980, -1955, -1920, -1890, -1875, -1860, -1845]) },
  { id: "us_trade", geo: "US", category: "government", name: "Trade balance", unit: "$bn", frequency: "M", nextRelease: "2026-10-07", sourceName: "Census / BEA", sourceUrl: FRED("BOPGSTB"),
    history: monthly("2026-07", [-78.2, -84.4, -73.8, -78.3, -98.4, -130.7, -138.3, -60.3, -71.5, -60.2, -71.8, -78.3]) },
  { id: "us_interest_gdp", geo: "US", category: "government", name: "Net interest outlays", unit: "% GDP", frequency: "Q", nextRelease: "2026-10-30", sourceName: "BEA / CBO", sourceUrl: FRED("A091RC1Q027SBEA"),
    history: quarterly("2026-Q2", [3.0, 3.1, 3.1, 3.2, 3.2, 3.2, 3.3, 3.3]) },

  { id: "us_nfib", geo: "US", category: "other", name: "NFIB Small Business Optimism", unit: "index", frequency: "M", consensus: 100.5, nextRelease: "2026-09-08", sourceName: "NFIB", sourceUrl: "https://www.nfib.com/surveys/small-business-economic-trends/",
    history: monthly("2026-07", [91.5, 93.7, 101.7, 105.1, 102.8, 100.7, 97.4, 95.8, 98.8, 98.6, 98.6, 100.3]) },
  { id: "us_conf_board", geo: "US", category: "other", name: "Conference Board Consumer Confidence", unit: "index", frequency: "M", nextRelease: "2026-09-29", sourceName: "Conference Board", sourceUrl: "https://www.conference-board.org/topics/consumer-confidence",
    history: monthly("2026-08", [98.7, 99.2, 111.7, 104.7, 104.1, 98.3, 92.9, 86.0, 98.0, 93.0, 97.2, 97.4]) },

  // ======================= CHINA =======================
  { id: "cn_gdp", geo: "CN", category: "activity", name: "Real GDP", unit: "% y/y", frequency: "Q", nextRelease: "2026-10-20", sourceName: "NBS", sourceUrl: NBS,
    history: quarterly("2026-Q2", [5.3, 4.7, 4.6, 5.4, 5.4, 5.2, 5.0, 4.8]) },
  { id: "cn_ip", geo: "CN", category: "activity", name: "Industrial Production", unit: "% y/y", frequency: "M", consensus: 5.7, nextRelease: "2026-09-15", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [4.5, 5.4, 5.3, 5.4, 6.2, 5.9, 7.7, 6.1, 5.8, 6.8, 5.7, 5.7]) },
  { id: "cn_retail", geo: "CN", category: "activity", name: "Retail Sales", unit: "% y/y", frequency: "M", consensus: 3.9, nextRelease: "2026-09-15", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [2.1, 3.2, 4.8, 3.0, 3.7, 4.0, 5.9, 5.1, 6.4, 4.8, 3.7, 3.7]) },
  { id: "cn_fai", geo: "CN", category: "activity", name: "Fixed Asset Investment (YTD)", unit: "% y/y", frequency: "M", consensus: 1.4, nextRelease: "2026-09-15", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [3.4, 3.4, 3.3, 3.3, 3.2, 4.1, 4.2, 4.0, 3.7, 2.8, 1.6, 1.6]) },
  { id: "cn_pmi_mfg", geo: "CN", category: "activity", name: "NBS Manufacturing PMI", unit: "index", frequency: "M", nextRelease: "2026-09-30", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-08", [49.1, 49.8, 50.1, 50.3, 50.1, 49.1, 50.2, 50.5, 49.0, 49.5, 49.7, 49.4]) },

  { id: "cn_unemp", geo: "CN", category: "labour", name: "Surveyed urban unemployment", unit: "%", frequency: "M", nextRelease: "2026-09-15", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [5.3, 5.1, 5.0, 5.0, 5.1, 5.2, 5.4, 5.2, 5.1, 5.0, 5.0, 5.2]) },
  { id: "cn_youth_unemp", geo: "CN", category: "labour", name: "Youth unemployment (16–24, ex-students)", unit: "%", frequency: "M", nextRelease: "2026-09-17", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [18.8, 17.6, 17.1, 16.1, 15.7, 16.1, 16.9, 16.5, 15.8, 14.9, 14.5, 17.8]) },

  { id: "cn_cpi", geo: "CN", category: "inflation", name: "CPI", unit: "% y/y", frequency: "M", consensus: 0.1, nextRelease: "2026-09-09", higherIsHot: true, sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [0.6, 0.4, 0.3, 0.2, 0.1, 0.5, -0.7, -0.1, -0.1, 0.1, 0.1, 0.0]) },
  { id: "cn_ppi", geo: "CN", category: "inflation", name: "PPI", unit: "% y/y", frequency: "M", consensus: -2.6, nextRelease: "2026-09-09", higherIsHot: true, sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [-1.8, -2.8, -2.9, -2.5, -2.3, -2.3, -2.2, -2.5, -2.7, -3.3, -3.6, -2.9]) },
  { id: "cn_core_cpi", geo: "CN", category: "inflation", name: "Core CPI", unit: "% y/y", frequency: "M", nextRelease: "2026-09-09", higherIsHot: true, sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [0.3, 0.1, 0.2, 0.3, 0.4, 0.6, -0.1, 0.5, 0.5, 0.6, 0.7, 0.8]) },

  { id: "cn_tsf", geo: "CN", category: "credit", name: "Aggregate Financing (TSF) new", unit: "CNY tn", frequency: "M", consensus: 2.4, nextRelease: "2026-09-10", sourceName: "PBoC", sourceUrl: "http://www.pbc.gov.cn/en/3688247/3688978/index.html",
    history: monthly("2026-07", [3.03, 3.76, 1.40, 2.34, 2.86, 7.06, 2.23, 5.89, 1.16, 2.29, 4.20, 1.16]) },
  { id: "cn_new_loans", geo: "CN", category: "credit", name: "New yuan loans", unit: "CNY tn", frequency: "M", consensus: 0.9, nextRelease: "2026-09-10", sourceName: "PBoC", sourceUrl: "http://www.pbc.gov.cn/en/3688247/3688978/index.html",
    history: monthly("2026-07", [0.90, 1.59, 0.50, 0.58, 0.99, 5.13, 1.01, 3.64, 0.28, 0.62, 2.24, -0.05]) },
  { id: "cn_home_prices", geo: "CN", category: "credit", name: "70-city new home prices", unit: "% m/m", frequency: "M", nextRelease: "2026-09-15", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [-0.7, -0.7, -0.5, -0.2, -0.1, -0.1, -0.1, -0.1, -0.1, -0.2, -0.3, -0.3]) },
  { id: "cn_m2", geo: "CN", category: "credit", name: "M2 growth", unit: "% y/y", frequency: "M", nextRelease: "2026-09-10", sourceName: "PBoC", sourceUrl: "http://www.pbc.gov.cn/en/3688247/3688978/index.html",
    history: monthly("2026-07", [6.3, 6.8, 7.5, 7.1, 7.3, 7.0, 7.0, 7.0, 8.0, 7.9, 8.3, 8.8]) },

  { id: "cn_trade", geo: "CN", category: "government", name: "Trade balance", unit: "$bn", frequency: "M", nextRelease: "2026-10-13", sourceName: "GACC", sourceUrl: "http://english.customs.gov.cn/",
    history: monthly("2026-08", [91.0, 81.7, 95.7, 97.4, 104.8, 170.5, 20.6, 102.6, 96.2, 103.2, 114.8, 98.2, 102.3, 104.8].slice(2)) },
  { id: "cn_fx_res", geo: "CN", category: "government", name: "FX reserves", unit: "$tn", frequency: "M", nextRelease: "2026-10-07", sourceName: "SAFE", sourceUrl: "https://www.safe.gov.cn/en/",
    history: monthly("2026-08", [3.29, 3.26, 3.20, 3.22, 3.20, 3.21, 3.23, 3.28, 3.29, 3.32, 3.32, 3.29]) },
  { id: "cn_lgfv", geo: "CN", category: "government", name: "Local govt special bond issuance (YTD)", unit: "CNY tn", frequency: "M", nextRelease: "2026-10-01", sourceName: "MoF", sourceUrl: "http://www.mof.gov.cn/en/",
    history: monthly("2026-08", [3.6, 3.9, 4.0, 4.0, 0.3, 0.7, 1.0, 1.4, 1.9, 2.3, 2.7, 3.2]) },

  { id: "cn_caixin_svc", geo: "CN", category: "other", name: "Caixin Services PMI", unit: "index", frequency: "M", nextRelease: "2026-10-09", sourceName: "Caixin / S&P Global", sourceUrl: "https://www.pmi.spglobal.com/Public/Release/PressReleases",
    history: monthly("2026-08", [50.3, 52.0, 51.5, 52.2, 51.0, 51.4, 51.9, 50.7, 51.1, 50.6, 52.6, 53.0]) },
  { id: "cn_consumer_conf", geo: "CN", category: "other", name: "Consumer Confidence Index", unit: "index", frequency: "M", nextRelease: "2026-09-25", sourceName: "NBS", sourceUrl: NBS,
    history: monthly("2026-07", [86.4, 85.7, 86.9, 86.2, 87.5, 86.9, 88.4, 87.4, 88.0, 88.0, 87.9, 88.6]) },
];

export const ecoSeries: EcoSeries[] = defs.map(build);

export const seriesFor = (geo: Geo, category: EcoCategory) =>
  ecoSeries.filter((s) => s.geo === geo && s.category === category);

export const seriesById = (id: string) => ecoSeries.find((s) => s.id === id);

export const policyPanels: PolicyPanel[] = [
  {
    geo: "UK",
    centralBank: "Bank of England",
    policyRateLabel: "Bank Rate",
    policyRate: "4.00%",
    lastDecision: { date: "2026-08-06", action: "Cut 25bp to 4.00%", vote: "5–4 (two-round vote; 4 for hold)", url: "https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes" },
    nextMeeting: { date: "2026-09-17", label: "MPC decision & minutes", url: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates" },
    nextFiscalEvent: { date: "2026-11-25", label: "Autumn Budget + OBR EFO", url: "https://www.gov.uk/government/organisations/hm-treasury" },
    marketPricing: "SONIA: 3bp cut priced for Sep; next full cut Dec; terminal ~3.50% by mid-2027",
  },
  {
    geo: "US",
    centralBank: "Federal Reserve",
    policyRateLabel: "Fed Funds target",
    policyRate: "4.25–4.50%",
    lastDecision: { date: "2026-07-29", action: "Hold", vote: "9–2 (Waller, Bowman dissent for cut)", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
    nextMeeting: { date: "2026-09-16", label: "FOMC decision, SEP & presser", url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm" },
    nextFiscalEvent: { date: "2026-09-30", label: "FY27 appropriations deadline (shutdown risk)", url: "https://www.congress.gov/" },
    marketPricing: "OIS: 32bp for Sep (25 fully priced, 30% odds of 50); 68bp by Dec; terminal ~3.10%",
  },
  {
    geo: "CN",
    centralBank: "People's Bank of China",
    policyRateLabel: "7-day reverse repo",
    policyRate: "1.40%",
    lastDecision: { date: "2026-05-20", action: "Cut 10bp; 1Y/5Y LPR to 3.00%/3.50%", vote: "n/a (not published)", url: "http://www.pbc.gov.cn/en/3688110/3688172/index.html" },
    nextMeeting: { date: "2026-09-22", label: "Monthly LPR fixing", url: "http://www.pbc.gov.cn/en/3688110/3688172/index.html" },
    nextFiscalEvent: { date: "2026-10-20", label: "Q3 GDP; NPC Standing Committee (Oct) — possible bond quota top-up", url: "http://www.npc.gov.cn/englishnpc/" },
    marketPricing: "Street: 10bp RRR/policy cut in Q4; CGB 10Y range 1.6–1.9%",
  },
];
