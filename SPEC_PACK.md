# Quantum Real Estate Analyzer 2.0 — Spreadsheet Spec Pack

> Extracted from the production codebase (`Config.gs`, `SheetManager.gs`, and 16 Apps Script modules).
> This document is the single source of truth for the spreadsheet structure.

---

## A) Workbook Purpose

The Quantum Real Estate Analyzer is a Google Sheets + Apps Script platform that ingests leads from multiple sources (Browse AI, PropStream, MLS, web/ad campaigns), runs them through five investment strategy engines (Flip, STR, MTR, LTR, Creative Finance), scores and ranks every deal with a composite Deal Score / Risk Score / Verdict system, generates offers across six offer types, matches deals to a buyer database, and manages speed-to-lead SLA compliance — producing a fully ranked, actionable deal pipeline from raw lead to disposition.

---

## B) Sheet Inventory

The workbook contains **27 sheets** organized into six groups.

### Import & Staging (5 sheets)

| Sheet Name | Purpose |
|---|---|
| **Import Hub** | Tracks import status per source (record counts, last import timestamps, actions) |
| **Staging - Browse AI** | Raw scraped lead data from Browse AI before normalization |
| **Staging - PropStream** | Raw PropStream export data before normalization |
| **Staging - MLS** | Raw MLS feed data before normalization |
| **Web & Ad Leads** | Inbound leads from website forms, Facebook Ads, and other campaigns |

### Core Data (3 sheets)

| Sheet Name | Purpose |
|---|---|
| **Master Database** | Central repository of all normalized deals (60+ columns covering full lifecycle) |
| **Enhanced Deal Analyzer** | Deep-dive analysis workspace that mirrors Master DB analysis columns per deal |
| **Lead Scoring & Risk** | Breakout sheet showing individual scoring components per deal |

### Strategy Engines (5 sheets)

| Sheet Name | Purpose |
|---|---|
| **Flip Engine** | Fix-and-flip profitability analysis (ARV, rehab, holding costs, ROI) |
| **STR Engine** | Short-Term Rental cash flow analysis (ADR, occupancy, seasonality, regulation risk) |
| **MTR Engine** | Medium-Term Rental analysis (furnished monthly rent, vacancy smoothing, stability) |
| **LTR Engine** | Long-Term Rental analysis (NOI, DSCR, CapEx reserves, rent growth) |
| **Creative Finance Engine** | Sub2, Wrap, Seller Carry, Lease Option, and Hybrid deal structure analysis |

### Outputs (6 sheets)

| Sheet Name | Purpose |
|---|---|
| **Verdict** | Ranked deal leaderboard sorted by Deal Score (best to worst) |
| **Offer & Disposition** | Generated offers with terms, response tracking, and buyer assignment |
| **Repair Estimator** | Line-item rehab cost breakdown by building system (roof, HVAC, etc.) |
| **Buyer Database** | Buyer profiles with strategy preferences, budgets, and qualification criteria |
| **Buyer Matching Engine** | Top-3 buyer matches per deal with match scores and disposition status |
| **Post-Sale Tracker** | Projected vs. actual performance tracking for closed deals |

### Admin & Config (3 sheets)

| Sheet Name | Purpose |
|---|---|
| **Settings** | All configurable parameters (strategy defaults, SLA thresholds, CRM keys, AI settings) |
| **Dashboard** | KPI summary metrics with trends |
| **Control Center** | Automation actions with run status and scheduling |

### Logs (3 sheets)

| Sheet Name | Purpose |
|---|---|
| **System Log** | Timestamped operational events across all modules |
| **Error Log** | Errors with module, message, stack trace, and resolution status |
| **Sync Log** | CRM synchronization events with system, action, record ID, and status |

---

## C) Schema for Each Core Sheet

Column annotations:
- **M** = Manual input (user-entered or imported from source)
- **C** = Calculated by Apps Script
- **S** = System-generated (timestamps, IDs)

---

### C1. Master Database (60 columns)

**Identity & Source**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string (`Q` + base-36 timestamp + random) | S |
| 2 | Source Platform | string (Browse AI, PropStream, MLS, Web) | S |
| 3 | Listing URL | url | M |
| 4 | Address | string (normalized) | M→S |
| 5 | City | string | M |
| 6 | State | string (2-letter, normalized) | M→S |
| 7 | ZIP | string (5-digit, normalized) | M→S |
| 8 | County | string | M |
| 9 | Lat | number | M |
| 10 | Lng | number | M |
| 11 | Imported At | datetime | S |
| 12 | Lead Arrival Timestamp | datetime | S |
| 13 | Source Campaign | string | M |

**Property Basics**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 14 | Asking Price | currency | M |
| 15 | Beds | integer | M |
| 16 | Baths | number | M |
| 17 | Sqft | integer | M |
| 18 | Lot Size | string/number | M |
| 19 | Year Built | integer | M |
| 20 | Property Type | enum: SFR, Duplex, Triplex, Fourplex, Condo, Townhouse, Mobile Home, Multi-Family, Land, Commercial, Other | M |

**Seller Signals**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 21 | Seller Type | enum: Owner, Agent, Investor, Bank/REO, Estate, Unknown | M |
| 22 | Motivation Signals | string (free text) | M |
| 23 | Seller Psychology Profile | string | C (MessagingAI) |
| 24 | Contact Quality Score | number (0-100) | C |

**Market Intelligence**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 25 | DOM | integer (Days on Market) | M |
| 26 | Sales Velocity Score | number (0-100) | C (MarketIntel) |
| 27 | Exit Speed Tier | enum: FAST, MOD, SLOW, STALE | C (MarketIntel) |
| 28 | Exit Risk Tier | enum: LOW, MOD, HIGH, CRIT | C (MarketIntel) |
| 29 | SOM Score | number (0-100, market saturation) | C (MarketIntel) |
| 30 | Market Heat Score | number (0-100) | C (MarketIntel) |

**Costs & Rehab**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 31 | Repair Complexity Tier | enum: COSMETIC, MODERATE, HEAVY, FULL_GUT, TEARDOWN | C (RepairEngine) |
| 32 | Est Rehab Low | currency | C (RepairEngine) |
| 33 | Est Rehab High | currency | C (RepairEngine) |
| 34 | Repair Risk Score | number (0-100) | C (RepairEngine) |

**Exit Values**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 35 | ARV | currency (After Repair Value) | M |
| 36 | Zestimate | currency | M |
| 37 | Comp Confidence Score | number (0-100) | C |

**Mortgage Data (Creative Finance inputs)**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 38 | Existing Mortgage Balance | currency | M (flagged ASSUMED or KNOWN) |
| 39 | Existing Monthly Payment | currency | M |
| 40 | Existing Interest Rate | percentage | M |
| 41 | Mortgage Data Source | enum: ASSUMED, KNOWN | M |

**MAO Variants**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 42 | MAO Flip | currency | C (StrategyEngines) |
| 43 | MAO STR | currency | C (StrategyEngines) |
| 44 | MAO MTR | currency | C (StrategyEngines) |
| 45 | MAO LTR | currency | C (StrategyEngines) |
| 46 | MAO Creative | currency | C (StrategyEngines) |
| 47 | MAO Final | currency (best of all MAOs) | C (StrategyEngines) |

**Strategy Outputs**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 48 | Best Strategy | string (Flip, STR, MTR, LTR, Creative) | C (StrategyEngines) |
| 49 | Strategy Rationale | string | C (StrategyEngines) |
| 50 | Multi-Exit Summary | string (all strategies rated side-by-side) | C (StrategyEngines, P7) |

**Offer Engine**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 51 | Offer Type Recommended | string (Cash, Sub2, Wrap, Seller Carry, Lease Option, Hybrid) | C (OfferEngine) |
| 52 | Offer Price Target | currency | C (OfferEngine) |
| 53 | Offer Terms Summary | string | C (OfferEngine) |
| 54 | Offer Risk Notes | string | C (OfferEngine) |

**Verdict**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 55 | Deal Score | number (0-100) | C (VerdictEngine) |
| 56 | Risk Score | number (0-100) | C (VerdictEngine) |
| 57 | Verdict | enum: HOT (>=80), SOLID (>=60), HOLD (>=40), PASS (<40) | C (VerdictEngine) |
| 58 | Next Action | enum: CALL NOW, MAKE OFFER, WATCH, SKIP, RESEARCH, FOLLOW UP | C (VerdictEngine) |
| 59 | Priority Rank | integer (1 = best) | C (VerdictEngine) |

**Messaging**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 60 | Seller Message | string (first-touch message text) | C (MessagingAI) |
| 61 | Follow-Up Tag | string | C (MessagingAI) |
| 62 | Deniability Angle | string | C (MessagingAI) |

**Workflow / CRM**

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 63 | Status Stage | enum: New Lead, Contacted, Analyzing, Offer Sent, Negotiating, Under Contract, Due Diligence, Closed, Dead, On Hold | M |
| 64 | Assigned To | string | M |
| 65 | CRM Synced | enum: Yes, No | S |
| 66 | CRM Record ID | string | S |
| 67 | Last Contacted At | datetime | M/S |
| 68 | SLA Tier | enum: TIER_1, TIER_2, TIER_3, BREACH | C (SpeedToLead) |
| 69 | SLA Status | enum: OPTIMAL, ACCEPTABLE, SLOW, BREACH | C (SpeedToLead) |

---

### C2. Verdict Sheet (19 columns)

All columns are **Calculated** — populated by VerdictEngine from Master DB data.

| # | Column Header | Type | Notes |
|---|---|---|---|
| 1 | Rank | integer | Priority rank, 1 = best deal |
| 2 | Deal ID | string | FK to Master Database |
| 3 | Address | string | Copied from Master DB |
| 4 | City | string | Copied |
| 5 | ZIP | string | Copied |
| 6 | Asking Price | currency | Copied |
| 7 | ARV | currency | Copied |
| 8 | Deal Score | number (0-100) | Composite score |
| 9 | Risk Score | number (0-100) | Composite risk |
| 10 | Verdict | enum: HOT, SOLID, HOLD, PASS | Color-coded conditional formatting |
| 11 | Best Strategy | string | Winning strategy from multi-exit comparison |
| 12 | Offer Type | string | Recommended offer structure |
| 13 | Offer Target | currency | Target offer price |
| 14 | Exit Speed Tier | enum: FAST, MOD, SLOW, STALE | Market velocity classification |
| 15 | SOM Score | number (0-100) | Market saturation |
| 16 | SLA Status | enum: OPTIMAL, ACCEPTABLE, SLOW, BREACH | Speed-to-lead compliance |
| 17 | Next Action | string | Recommended next step |
| 18 | Seller Message Preview | string (truncated to 100 chars) | First-touch message preview |
| 19 | Action Link | url | Listing URL for quick access |

---

### C3. Buyer Database (17 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Buyer ID | string | S |
| 2 | Buyer Name | string | M |
| 3 | Company | string | M |
| 4 | Email | string | M |
| 5 | Phone | string | M |
| 6 | ZIPs | string (comma-separated) | M |
| 7 | Strategy Preference | enum: Wholesale, Flip, STR, MTR, LTR, Creative, Any | M |
| 8 | Budget Min | currency | M |
| 9 | Budget Max | currency | M |
| 10 | Min DSCR | number | M |
| 11 | Yield Preference | string | M |
| 12 | Risk Tolerance | enum: Conservative, Moderate, Aggressive | M |
| 13 | Preferred Property Types | string | M |
| 14 | Active | enum: Yes, No | M |
| 15 | Last Deal Date | date | M/S |
| 16 | Total Deals Closed | integer | M/S |
| 17 | Notes | string | M |

---

### C4. Offer & Disposition (19 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK to Master DB) |
| 2 | Address | string | C |
| 3 | Offer Type | string | C (OfferEngine) |
| 4 | Offer Price | currency | C (OfferEngine) |
| 5 | Terms Summary | string | C (OfferEngine) |
| 6 | Cash Offer | currency | C |
| 7 | Sub2 Terms | string | C |
| 8 | Wrap Terms | string | C |
| 9 | Seller Carry Terms | string | C |
| 10 | Lease Option Terms | string | C |
| 11 | Hybrid Terms | string | C |
| 12 | Risk Notes | string | C |
| 13 | Sent Date | date | M |
| 14 | Response | string | M |
| 15 | Counter Terms | string | M |
| 16 | Status | string | M |
| 17 | Notes | string | M |
| 18 | Contract Sent | boolean | M |
| 19 | Buyer Assigned | string | M |

---

### C5. Outreach / Messaging / Skip Trace Tracking

These fields live **on the Master Database** (not separate sheets). The relevant columns are:

| Column Header | Type | M/C/S | Purpose |
|---|---|---|---|
| Contact Quality Score | number (0-100) | C | Seller contact data quality rating |
| Seller Psychology Profile | string | C (MessagingAI) | Psychological profile used for message tailoring |
| Seller Message | string | C (MessagingAI) | Auto-generated first-touch outreach text |
| Follow-Up Tag | string | C (MessagingAI) | Follow-up sequence classification |
| Deniability Angle | string | C (MessagingAI) | Strategic deniability framing |
| Last Contacted At | datetime | M/S | Timestamp of most recent outreach |
| SLA Tier | enum | C (SpeedToLead) | Response time tier classification |
| SLA Status | enum | C (SpeedToLead) | SLA compliance status |
| Status Stage | enum | M | Pipeline stage tracking |
| CRM Synced | Yes/No | S | Whether record has been pushed to CRM |
| CRM Record ID | string | S | External CRM record identifier |

The **Buyer Matching Engine** (16 columns) also serves as a disposition/outreach tracker:

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C |
| 2 | Address | string | C |
| 3 | Best Strategy | string | C |
| 4 | Asking Price | currency | C |
| 5 | ARV | currency | C |
| 6 | ZIP | string | C |
| 7 | Property Type | string | C |
| 8 | Match 1 Buyer | string | C (BuyerMatch) |
| 9 | Match 1 Score | number | C (BuyerMatch) |
| 10 | Match 2 Buyer | string | C (BuyerMatch) |
| 11 | Match 2 Score | number | C (BuyerMatch) |
| 12 | Match 3 Buyer | string | C (BuyerMatch) |
| 13 | Match 3 Score | number | C (BuyerMatch) |
| 14 | Suggested Dispo Action | string | C (BuyerMatch) |
| 15 | Matched At | datetime | S |
| 16 | Dispo Status | string | M |

---

### C6. Rental Strategy Sheets

#### STR Engine (17 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK) |
| 2 | Address | string | C |
| 3 | ADR | currency (Average Daily Rate) | M/C (MarketDataProvider) |
| 4 | Occupancy % | percentage | M (default 65%) |
| 5 | Seasonality Index | number | C |
| 6 | Regulation Risk | number (0-1) | M (default 0.5) |
| 7 | Furnish/Setup Cost | currency | M (default $8,000 + $2,000) |
| 8 | Cleaning Cost/Turn | currency | M (default $75) |
| 9 | Mgmt % | percentage | M (default 20%) |
| 10 | Platform Fees | percentage | M (default 3%) |
| 11 | STR Monthly Gross | currency | C |
| 12 | STR Monthly Net | currency | C |
| 13 | STR Annual Net | currency | C |
| 14 | Break-Even Occupancy | percentage | C |
| 15 | STR Cash-on-Cash | percentage | C |
| 16 | STR Score | number (0-100) | C |
| 17 | STR Verdict | string | C |

#### MTR Engine (16 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK) |
| 2 | Address | string | C |
| 3 | Furnished Monthly Rent | currency | M/C (MarketDataProvider) |
| 4 | Avg Stay Length | integer (months) | M (default 3) |
| 5 | Turns Per Year | number | C |
| 6 | Vacancy Smoothing Score | number | C |
| 7 | Utilities Bundle Cost | currency | M (default $200/mo) |
| 8 | Furniture Amortization | currency/mo | C (over 24 months) |
| 9 | Mgmt % | percentage | M (default 12%) |
| 10 | MTR Monthly Gross | currency | C |
| 11 | MTR Monthly Net | currency | C |
| 12 | MTR Annual Net | currency | C |
| 13 | MTR Stability Score | number | C |
| 14 | MTR Advantage Index | number | C |
| 15 | MTR Score | number (0-100) | C |
| 16 | MTR Verdict | string | C |

#### LTR Engine (20 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK) |
| 2 | Address | string | C |
| 3 | Market Rent | currency | M/C (MarketDataProvider) |
| 4 | Vacancy % | percentage | M (default 8%) |
| 5 | Effective Gross Income | currency | C |
| 6 | Maintenance Reserve % | percentage | M (default 10%) |
| 7 | Taxes | currency | M/C (MarketDataProvider) |
| 8 | Insurance | currency | M |
| 9 | CapEx Reserve | currency | C (default 5% of rent) |
| 10 | PM Fee | percentage | M (default 10%) |
| 11 | Total Operating Expenses | currency | C |
| 12 | NOI Monthly | currency | C |
| 13 | NOI Annual | currency | C |
| 14 | DSCR | number | C (target 1.25) |
| 15 | LTR Monthly Net | currency | C |
| 16 | LTR Cash-on-Cash | percentage | C |
| 17 | Hold Quality Score | number | C |
| 18 | Rent Growth Potential | percentage | C |
| 19 | LTR Score | number (0-100) | C |
| 20 | LTR Verdict | string | C |

#### Flip Engine (21 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK) |
| 2 | Address | string | C |
| 3 | ARV | currency | C (from Master DB) |
| 4 | Purchase Price | currency | C |
| 5 | Rehab Low | currency | C (RepairEngine) |
| 6 | Rehab High | currency | C (RepairEngine) |
| 7 | Rehab Mid | currency | C (average of low/high) |
| 8 | Holding Months | integer | C |
| 9 | Holding Cost | currency | C (1% of purchase/mo) |
| 10 | Agent Fees | currency | C (6% of ARV) |
| 11 | Closing Costs | currency | C (3% of ARV) |
| 12 | Total Costs | currency | C (sum of all costs) |
| 13 | Profit if Rehab Low | currency | C |
| 14 | Profit if Rehab High | currency | C |
| 15 | Profit if Rehab Mid | currency | C |
| 16 | ROI if Rehab Mid | percentage | C |
| 17 | DOM | integer | C (from Master DB) |
| 18 | Velocity Score | number | C (MarketIntel) |
| 19 | Exit Risk | string | C |
| 20 | Flip Score | number (0-100) | C |
| 21 | Flip Verdict | string | C |

#### Creative Finance Engine (31 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Deal ID | string | C (FK) |
| 2 | Address | string | C |
| 3 | Asking Price | currency | C |
| 4 | ARV | currency | C |
| 5 | Mortgage Balance [Source] | string (value + ASSUMED/KNOWN flag) | M |
| 6 | Existing Monthly Payment | currency | M |
| 7 | Existing Interest Rate | percentage | M |
| — | **Sub2 Section** | | |
| 8 | Sub2 Viable | boolean | C |
| 9 | Sub2 Entry Cost | currency | C |
| 10 | Sub2 Monthly Cash Flow | currency | C |
| 11 | Sub2 Equity Position | currency | C |
| 12 | Sub2 Risk Score | number | C |
| 13 | Sub2 Notes | string | C |
| — | **Wrap Section** | | |
| 14 | Wrap Viable | boolean | C |
| 15 | Wrap Spread | percentage | C |
| 16 | Wrap Monthly Cash Flow | currency | C |
| 17 | Wrap Down Payment | currency | C |
| 18 | Wrap Risk Score | number | C |
| 19 | Wrap Notes | string | C |
| — | **Seller Carry Section** | | |
| 20 | Carry Viable | boolean | C |
| 21 | Carry Terms | string | C |
| 22 | Carry Monthly Payment | currency | C |
| 23 | Carry Risk Score | number | C |
| 24 | Carry Notes | string | C |
| — | **Lease Option Section** | | |
| 25 | LO Viable | boolean | C |
| 26 | LO Option Fee | currency | C |
| 27 | LO Monthly Rent | currency | C |
| 28 | LO Rent Credit | currency | C |
| 29 | LO Strike Price | currency | C |
| 30 | LO Risk Score | number | C |
| 31 | LO Notes | string | C |
| — | **Hybrid Section** | | |
| 32 | Hybrid Viable | boolean | C |
| 33 | Hybrid Structure | string | C |
| 34 | Hybrid Notes | string | C |
| — | **Summary** | | |
| 35 | Best Creative Strategy | string | C |
| 36 | Creative Score | number (0-100) | C |
| 37 | Creative Verdict | string | C |

---

### C7. Settings Sheet (5 columns)

| # | Column Header | Type | M/C/S |
|---|---|---|---|
| 1 | Setting Name | string (key) | S |
| 2 | Value | string/number/boolean | M |
| 3 | Type | enum: string, number, boolean, custom | S |
| 4 | Description | string | S |
| 5 | Last Updated | datetime | S |

**Default settings rows (50+ rows) covering:**

- **General**: system_name, timezone, currency
- **Flip**: holding_cost_monthly, agent_fees, closing_costs, min/target_profit_margin
- **STR**: default_occupancy, management_fee, cleaning_per_turn, furnishing_cost, platform_fee
- **MTR**: avg_stay_length, vacancy_between_stays, utilities_bundle, management_fee
- **LTR**: vacancy_rate, maintenance_reserve, capex_reserve, property_management, target_dscr
- **Creative**: sub2_discount, wrap_spread_min/max, seller_carry_rate, lease_option_fee
- **Speed-to-Lead**: tier1/2/3 minutes and penalties, breach_penalty
- **CRM**: smsit/companyhub/ohmylead enabled flags, api_urls, api_keys, webhook_urls
- **AI**: openai_enabled, api_key, model, max_tokens
- **Automation**: nightly_refresh, dashboard_update, stl_check, crm_sync toggles

---

### Supporting Sheets (brief)

**Staging Sheets** (shared schema for Browse AI, PropStream, MLS — 19 columns):
`Source Platform`, `Listing URL`, `Address Raw`, `City`, `State`, `ZIP`, `Price Raw`, `Beds Raw`, `Baths Raw`, `Sqft Raw`, `Lot Raw`, `Year Built Raw`, `Description Raw`, `Agent/Seller Name`, `Phone/Email`, `Scrape Timestamp`, `Scrape Job Link`, `Source Sheet Name`, `Processed`

**Import Hub** (5 columns): `Source`, `Records Count`, `Last Import`, `Status`, `Action`

**Web & Ad Leads** (17 columns): `Lead ID`, `Source`, `Campaign`, `Ad Set`, `Timestamp`, `Name`, `Email`, `Phone`, `Property Address`, `Property City`, `Property State`, `Property ZIP`, `Asking Price`, `Motivation`, `Timeline`, `Notes`, `Processed`

**Lead Scoring & Risk** (14 columns): `Deal ID`, `Address`, `Motivation Score`, `Equity Score`, `Market Score`, `Condition Score`, `Seller Response Score`, `Speed-to-Lead Score`, `SOM Impact`, `Total Lead Score`, `Risk Score`, `Combined Grade`, `Scoring Notes`, `Last Scored`

**Repair Estimator** (24 columns): `Deal ID`, `Address`, `Year Built`, `Sqft`, `Property Type`, `Condition Notes`, `Roof`, `HVAC`, `Plumbing`, `Electrical`, `Foundation`, `Kitchen`, `Bathrooms`, `Flooring`, `Paint`, `Windows/Doors`, `Exterior`, `Landscaping`, `Other`, `Complexity Tier`, `Rehab Low`, `Rehab High`, `Rehab Mid`, `Risk Score`, `Notes`

**Post-Sale Tracker** (19 columns): `Deal ID`, `Address`, `Strategy Used`, `Projected Sale Price`, `Actual Sale Price`, `Price Variance`, `Projected Rent`, `Actual Rent`, `Rent Variance`, `Projected Timeline Days`, `Actual Timeline Days`, `Timeline Variance`, `Projected Profit`, `Actual Profit`, `Profit Variance`, `Close Date`, `Notes`, `Lessons Learned`, `Tune Recommendations`

**Dashboard** (5 columns): `Metric`, `Value`, `Change`, `Trend`, `Last Updated`

**Control Center** (5 columns): `Action`, `Status`, `Last Run`, `Next Scheduled`, `Notes`

**System Log** (4 columns): `Timestamp`, `Category`, `Message`, `Details`

**Error Log** (5 columns): `Timestamp`, `Module`, `Error Message`, `Stack Trace`, `Resolved`

**Sync Log** (6 columns): `Timestamp`, `CRM System`, `Action`, `Record ID`, `Status`, `Details`

---

## D) Unique Identifiers / Dedup Fields

| Identifier | Location | Format | Purpose |
|---|---|---|---|
| **Deal ID** | Master DB col 1 (and FK in all child sheets) | `Q` + base-36 timestamp + 4-char random (e.g. `QLXF4A2BKPQR`) | Primary key for every deal across all sheets |
| **Normalized Address + ZIP** | Master DB cols 4 + 7 | Lowercase, stripped of all non-alphanumeric chars, concatenated with `\|` separator | **Primary dedup key** — used by `Dedup.gs` to detect duplicates |
| **Listing URL** | Master DB col 3 | Lowercased, trimmed URL string | **Secondary dedup key** — catches duplicates from different sources with same listing |
| **Buyer ID** | Buyer Database col 1 | string | Primary key for buyer records |
| **Lead ID** | Web & Ad Leads col 1 | string | Primary key for inbound web/ad leads |

**Dedup algorithm**: Records are grouped by both (Address+ZIP) AND (Listing URL). When duplicates are found, the record with the highest data quality score is kept and missing fields are merged from duplicates. Lower-quality duplicates are deleted.

---

## E) Key Output Columns (CRM-Ready)

These are the computed fields that a downstream CRM or external system would consume:

### Scoring & Verdict

| Field | Source Module | Value Range | Description |
|---|---|---|---|
| Deal Score | VerdictEngine | 0-100 | Composite deal quality score |
| Risk Score | VerdictEngine | 0-100 | Composite risk assessment (higher = worse) |
| Verdict | VerdictEngine | HOT / SOLID / HOLD / PASS | Classification label |
| Priority Rank | VerdictEngine | 1-N integer | Rank-ordered position (1 = best) |
| Next Action | VerdictEngine | CALL NOW / MAKE OFFER / WATCH / SKIP / RESEARCH / FOLLOW UP | Recommended next step |
| Total Lead Score | Lead Scoring | 0-100 | Weighted composite of sub-scores |
| Combined Grade | Lead Scoring | string | Letter grade or tier label |

### Valuation & Offers

| Field | Source Module | Type | Description |
|---|---|---|---|
| ARV | Manual / API | currency | After Repair Value |
| MAO Flip | StrategyEngines | currency | Max Allowable Offer for flip exit |
| MAO STR | StrategyEngines | currency | Max Allowable Offer for STR exit |
| MAO MTR | StrategyEngines | currency | Max Allowable Offer for MTR exit |
| MAO LTR | StrategyEngines | currency | Max Allowable Offer for LTR exit |
| MAO Creative | StrategyEngines | currency | Max Allowable Offer for creative exit |
| MAO Final | StrategyEngines | currency | Best (highest viable) MAO across all strategies |
| Offer Price Target | OfferEngine | currency | Recommended offer amount |
| Offer Type Recommended | OfferEngine | string | Cash / Sub2 / Wrap / Seller Carry / Lease Option / Hybrid |
| Offer Terms Summary | OfferEngine | string | Human-readable terms |

### Strategy Results

| Field | Source Module | Type | Description |
|---|---|---|---|
| Best Strategy | StrategyEngines | string | Winning strategy (Flip, STR, MTR, LTR, Creative) |
| Strategy Rationale | StrategyEngines | string | Why this strategy won |
| Multi-Exit Summary | StrategyEngines | string | All strategies compared side-by-side |
| STR/MTR/LTR Score | Strategy sheets | 0-100 | Per-strategy viability score |
| STR/MTR/LTR Cash-on-Cash | Strategy sheets | percentage | Return metric per strategy |
| Flip Score | Flip Engine | 0-100 | Flip viability score |
| Creative Score | Creative Engine | 0-100 | Creative finance viability score |
| DSCR | LTR Engine | number | Debt Service Coverage Ratio |
| NOI Annual | LTR Engine | currency | Net Operating Income |

### Comp & Market Fields

| Field | Source Module | Type | Description |
|---|---|---|---|
| Comp Confidence Score | Calculated | 0-100 | Confidence in ARV/comp data |
| Sales Velocity Score | MarketIntel | 0-100 | How fast properties sell in this market |
| Exit Speed Tier | MarketIntel | FAST/MOD/SLOW/STALE | Velocity classification |
| Exit Risk Tier | MarketIntel | LOW/MOD/HIGH/CRIT | Exit risk classification |
| SOM Score | MarketIntel | 0-100 | Share of Market (saturation) |
| Market Heat Score | MarketIntel | 0-100 | Overall market temperature |

### Rental Metrics

| Field | Source Module | Type | Description |
|---|---|---|---|
| ADR | STR Engine | currency | Average Daily Rate (STR) |
| STR Monthly Net | STR Engine | currency | Net monthly cash flow from STR |
| MTR Monthly Net | MTR Engine | currency | Net monthly cash flow from MTR |
| LTR Monthly Net | LTR Engine | currency | Net monthly cash flow from LTR |
| Market Rent | LTR Engine | currency | Fair market rent estimate |
| Furnished Monthly Rent | MTR Engine | currency | Furnished rental rate |

### Speed-to-Lead / Workflow

| Field | Source Module | Type | Description |
|---|---|---|---|
| SLA Tier | SpeedToLead | TIER_1/TIER_2/TIER_3/BREACH | Response time classification |
| SLA Status | SpeedToLead | OPTIMAL/ACCEPTABLE/SLOW/BREACH | Compliance status |
| Status Stage | Manual | enum (10 values) | Pipeline stage |
| CRM Synced | System | Yes/No | Sync status flag |
| CRM Record ID | System | string | External CRM record reference |

---

## F) Automation Touchpoints (High Level)

### Scheduled Triggers (Apps Script Time-Based)

| Trigger | Frequency | Function | What It Does |
|---|---|---|---|
| **Nightly Refresh** | Daily at 2 AM | `nightlyRefresh()` | Re-runs full pipeline: import staging → dedup → market intel → strategies → verdict → offers → buyer match |
| **Dashboard Update** | Hourly | `refreshDashboard()` | Recalculates KPI metrics on Dashboard sheet |
| **Speed-to-Lead Check** | Every 5 minutes | `checkSpeedToLead()` | Scans for new leads, assigns SLA tiers, triggers escalation alerts |
| **CRM Sync** | Configurable | `syncToCRM()` | Pushes updated records to SMS-iT, CompanyHub, OhMyLead |
| **onOpen** | Spreadsheet open | `onOpen()` | Builds custom menu, stamps session |

### Pipeline Orchestration

The full pipeline runs in this order (via `runFullPipeline()`):
1. **Import** — Pull from all staging sheets into Master DB
2. **Dedup** — Find and merge duplicates
3. **Market Intel** — Calculate DOM, Velocity, Exit Risk, SOM, Market Heat
4. **Repair Engine** — Estimate rehab costs and complexity
5. **Strategy Engines** — Run all 5 strategies, compute MAOs, pick best
6. **Verdict Engine** — Score deals, assign verdicts, rank
7. **Offer Engine** — Generate offer structures
8. **Buyer Matching** — Score and assign top-3 buyers per deal
9. **Speed-to-Lead** — Update SLA compliance
10. **Messaging AI** — Generate seller outreach messages
11. **CRM Sync** — Push to external CRMs (if enabled)

### CRM Sync-Ready Fields

Fields that get pushed to external CRMs on sync:

- Deal ID, Address, City, State, ZIP
- Asking Price, ARV, Deal Score, Risk Score, Verdict
- Best Strategy, Offer Type, Offer Price Target
- Status Stage, SLA Status, Next Action
- Seller Message, Seller Psychology Profile
- CRM Record ID (for update vs. create logic)

The `CRM Synced` flag (Yes/No) on Master DB tracks whether each record has been successfully synced. The `Sync Log` sheet records every sync event with timestamp, CRM system, action, record ID, and status.

### Webhook Endpoint

`doPost(e)` in `CRMIntegrations.gs` accepts inbound webhooks from OhMyLead, parsing lead data and inserting directly into the Master Database pipeline.

### Safety Controls

- **Script Lock** (`LockService`) prevents concurrent pipeline runs
- **Settings-based toggles** control which automations are active
- **Error Log** captures all failures with stack traces for debugging
- **System Log** provides full audit trail of all operations

---

*End of Spec Pack. This document covers the complete spreadsheet structure. CRM design, UTron logic, and integration architecture are out of scope and should be designed separately using these schemas as inputs.*
