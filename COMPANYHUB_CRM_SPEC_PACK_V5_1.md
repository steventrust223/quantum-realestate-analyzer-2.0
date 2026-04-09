# CompanyHub Unified CRM Spec Pack v5.1 — Institutional Disposition Addendum

> **Scope**: Addendum to v5.0. Covers Pipeline B (Real Estate) modifications required
> by the Institutional Buyer / Hedge Fund Disposition Layer added to the Quantum
> Real Estate Analyzer v2.0 spreadsheet engine.
>
> **System boundary**: The spreadsheet remains the Decision Engine + Deal Intelligence
> Layer. CompanyHub remains the Execution Engine + Relationship System. SMS-iT
> remains the Outreach Engine. This addendum does NOT move scoring or analysis
> into CompanyHub — it defines how institutional disposition data flows INTO
> CompanyHub for execution.

---

## 1. Object Model Additions

### 1A. New Table: `Institutional Buyers` (17 fields)

> Extends the existing Buyers table (17 fields in v5.0) with institutional-specific
> attributes. Can be implemented as a separate table or as an extended view of Buyers
> with a `Buyer Class = Institutional` filter.

| # | Field Name | Type | Required | Default | Validation | Notes |
|---|---|---|---|---|---|---|
| 1 | `buyer_id` | Text (PK) | Yes | Auto | Format: `IB-{timestamp36}` | Links to Deals via disposition records |
| 2 | `buyer_name` | Text | Yes | — | Max 200 chars | Company or individual name |
| 3 | `buyer_type` | Picklist | Yes | `SFR Fund` | See picklist below | Institutional classification |
| 4 | `primary_contact_name` | Text | No | — | — | Day-to-day contact |
| 5 | `primary_contact_title` | Text | No | — | — | e.g. "Acquisitions Director" |
| 6 | `email` | Email | Yes | — | Valid email | Primary contact email |
| 7 | `phone` | Phone | Yes | — | E.164 format | Primary contact phone |
| 8 | `company` | Text | No | — | — | Parent company if different from buyer_name |
| 9 | `website` | URL | No | — | Valid URL | Buyer website |
| 10 | `target_markets` | Multi-text | No | — | Comma-separated | States + cities of interest |
| 11 | `preferred_zips` | Multi-text | No | — | Comma-separated 5-digit | Target ZIP codes |
| 12 | `buy_box_json` | Long Text | No | — | Valid JSON | Serialized buy box criteria (see Section 3) |
| 13 | `buyer_status` | Picklist | Yes | `Active` | Active, Paused, Inactive, Blacklisted | Lifecycle status |
| 14 | `warmth_status` | Picklist | Yes | `Cold` | Hot, Warm, Cool, Cold | Engagement temperature |
| 15 | `reliability_tier` | Picklist | No | `BRONZE` | PLATINUM, GOLD, SILVER, BRONZE | Calculated from response/close rates |
| 16 | `proof_of_funds` | Boolean | No | `false` | — | POF on file? |
| 17 | `tags` | Multi-text | No | — | Namespace-prefixed | See Tag Taxonomy (Section 6) |

**Buyer Type picklist values** (10):
`SFR Fund`, `Multifamily Fund`, `REIT`, `Private Equity`, `Family Office`,
`Local Landlord (5-20 units)`, `Regional Operator (20-100 units)`,
`Turnkey Provider`, `Fix & Flip Fund`, `Build-to-Rent`

### 1B. New Table: `Disposition Log` (22 fields)

> Tracks every deal-to-buyer touchpoint from package sent through close/pass.
> One record per deal+buyer combination. This is the CRM-side mirror of the
> spreadsheet's Disposition Tracker sheet.

| # | Field Name | Type | Required | Default | Validation | Notes |
|---|---|---|---|---|---|---|
| 1 | `disposition_id` | Text (PK) | Yes | Auto | Format: `DSP-{timestamp36}` | Primary key |
| 2 | `deal_id` | Lookup (Deals) | Yes | — | Must exist in Deals | FK to Deals table |
| 3 | `buyer_id` | Lookup (Inst Buyers) | Yes | — | Must exist | FK to Institutional Buyers |
| 4 | `disposition_tier` | Picklist | Yes | — | See picklist | From spreadsheet scoring |
| 5 | `match_score` | Number | No | — | 0-100 | Buy box match score from spreadsheet |
| 6 | `match_reason` | Long Text | No | — | — | Human-readable match explanation |
| 7 | `package_sent` | Boolean | No | `false` | — | Deal package sent to buyer? |
| 8 | `sent_date` | DateTime | No | — | — | When package was sent |
| 9 | `sent_via` | Picklist | No | — | Email, SMS, Portal, In-Person | Delivery channel |
| 10 | `follow_up_count` | Number | No | `0` | >= 0 | Total follow-ups made |
| 11 | `last_follow_up` | DateTime | No | — | — | Most recent follow-up timestamp |
| 12 | `next_follow_up_due` | DateTime | No | — | — | Calculated: last + interval |
| 13 | `response_status` | Picklist | Yes | `No Contact` | See picklist | Current response state |
| 14 | `interest_level` | Picklist | No | — | Hot, Warm, Lukewarm, Not Interested | Buyer's expressed interest |
| 15 | `negotiation_status` | Picklist | No | `Not Started` | See picklist | Negotiation phase |
| 16 | `offer_received` | Currency | No | — | >= 0 | Buyer's offer amount |
| 17 | `counter_sent` | Currency | No | — | >= 0 | Our counter amount |
| 18 | `final_terms` | Long Text | No | — | — | Agreed terms summary |
| 19 | `closed` | Boolean | No | `false` | — | Deal closed with this buyer? |
| 20 | `pass_reason` | Text | No | — | — | Why buyer passed |
| 21 | `assigned_to` | Lookup (Team) | No | — | — | Team member managing this disposition |
| 22 | `notes` | Long Text | No | — | — | Free-form notes |

**Disposition Tier picklist** (5):
`SEND NOW`, `HOLD FOR PORTFOLIO`, `LOCAL LANDLORD FIRST`, `REVIEW MANUALLY`, `NOT A FIT`

**Response Status picklist** (7):
`No Contact`, `Sent - Awaiting`, `Viewed`, `Interested`, `Passed`, `Negotiating`, `Closed`

**Negotiation Status picklist** (6):
`Not Started`, `Initial Discussion`, `Offer Made`, `Counter`, `Terms Agreed`, `Dead`

### 1C. New Table: `Portfolio Bundles` (16 fields)

> Groups of deals packaged together for institutional bulk buyers.

| # | Field Name | Type | Required | Default | Validation | Notes |
|---|---|---|---|---|---|---|
| 1 | `portfolio_id` | Text (PK) | Yes | Auto | Format: `PF-{timestamp36}` | Primary key |
| 2 | `portfolio_name` | Text | Yes | — | Max 200 chars | e.g. "Dallas SFR 3-Pack Q1 2026" |
| 3 | `deal_count` | Number | Yes | — | >= 2 | Number of deals in bundle |
| 4 | `deal_ids` | Multi-text | Yes | — | Comma-separated Deal IDs | Linked deals |
| 5 | `state` | Text | No | — | 2-letter | Primary state |
| 6 | `city` | Text | No | — | — | Primary city |
| 7 | `zip_cluster` | Multi-text | No | — | — | ZIP codes covered |
| 8 | `total_cost` | Currency | Yes | — | >= 0 | Total portfolio acquisition cost |
| 9 | `total_annual_rent` | Currency | No | — | >= 0 | Combined annual rent |
| 10 | `avg_cap_rate` | Percent | No | — | 0-1 | Portfolio-level cap rate |
| 11 | `appeal_tier` | Picklist | Yes | — | See picklist | From spreadsheet scoring |
| 12 | `appeal_score` | Number | No | — | 0-100 | Institutional appeal score |
| 13 | `target_buyer_type` | Picklist | No | — | Same as Buyer Type | Ideal buyer profile |
| 14 | `package_status` | Picklist | Yes | `Draft` | Draft, Ready, Sent, Under Review, Accepted, Rejected | Lifecycle |
| 15 | `assigned_buyers` | Multi-lookup | No | — | FK to Inst Buyers | Buyers this was sent to |
| 16 | `notes` | Long Text | No | — | — | Free-form |

**Appeal Tier picklist** (5):
`BULK READY`, `STRONG PORTFOLIO`, `LOCAL PACKAGE`, `MIXED QUALITY`, `DO NOT BUNDLE`

### 1D. Field Additions to Existing `Deals` Table (12 new fields)

> These fields are added to the existing 60-field Deals table defined in v5.0.
> They carry institutional intelligence from the spreadsheet into CompanyHub.

| # | Field Name | Type | Required | Default | Validation | Mapped From (Sheet Column) |
|---|---|---|---|---|---|---|
| 61 | `institutional_grade` | Picklist | No | — | See picklist | Master DB → `Institutional Grade` |
| 62 | `institutional_score` | Number | No | — | 0-100 | Master DB → `Institutional Grade Score` |
| 63 | `disposition_priority` | Picklist | No | — | See picklist | Master DB → `Disposition Priority` |
| 64 | `portfolio_eligible` | Boolean | No | `false` | — | Master DB → `Portfolio Eligible` |
| 65 | `portfolio_group_id` | Text | No | — | — | Master DB → `Portfolio Group Suggestion` |
| 66 | `cap_rate` | Percent | No | — | 0-1 | Master DB → `Cap Rate` |
| 67 | `cash_on_cash` | Percent | No | — | 0-1 | Master DB → `Cash-on-Cash Return` |
| 68 | `estimated_annual_rent` | Currency | No | — | >= 0 | Master DB → `Estimated Annual Rent` |
| 69 | `neighborhood_grade` | Text | No | — | A/B/C/D/F | Master DB → `Neighborhood Grade` |
| 70 | `best_buyer_type` | Text | No | — | — | Master DB → `Best Buyer Type` |
| 71 | `best_match_buyer` | Lookup (Inst Buyers) | No | — | — | Master DB → `Best Match Buyer` |
| 72 | `package_ready` | Boolean | No | `false` | — | Master DB → `Package Ready?` |

**Institutional Grade picklist** (5):
`INSTITUTIONAL PRIME`, `INSTITUTIONAL FIT`, `LOCAL LANDLORD FIT`, `PORTFOLIO ONLY`, `NOT INSTITUTIONAL`

**Disposition Priority picklist** (5):
`SEND NOW`, `HOLD FOR PORTFOLIO`, `LOCAL LANDLORD FIRST`, `REVIEW MANUALLY`, `NOT A FIT`

### 1E. Field Additions to Existing `Contacts` Table (3 new fields)

> When a disposition involves a new buyer contact not yet in Contacts, auto-create.

| # | Field Name | Type | Required | Default | Validation | Notes |
|---|---|---|---|---|---|---|
| 11 | `institutional_buyer_id` | Lookup (Inst Buyers) | No | — | — | Links contact to institutional buyer record |
| 12 | `buyer_role` | Picklist | No | — | Principal, Acquisitions, Asset Mgr, Analyst, Other | Role at the buying entity |
| 13 | `deals_touched` | Number | No | `0` | >= 0 | Running count of dispositions involving this contact |

### 1F. Updated Table Counts

| Table | v5.0 Fields | v5.1 Fields | Delta |
|---|---|---|---|
| Contacts | 10 | 10 | — |
| Deals | 60 | 72 | +12 |
| Properties | 54 | 54 | — |
| Vehicles | 42 | 42 | — |
| Buyers | 17 | 17 | — |
| Maintenance Log | 14 | 14 | — |
| **Institutional Buyers** | — | **17** | **NEW** |
| **Disposition Log** | — | **22** | **NEW** |
| **Portfolio Bundles** | — | **16** | **NEW** |
| **TOTAL** | **197** | **255** | **+58** |

---

## 2. Pipeline B Stage Updates

### 2A. Existing Pipeline B Stages (v5.0 — unchanged)

> The core 10-stage RE pipeline is NOT modified. Institutional disposition runs
> as a **parallel track** alongside the existing pipeline, not a replacement.

```
New Lead → Analyzed → Skip Traced → Contacted → Negotiating →
Under Contract → Closing → Closed → Nurture → Dead
```

### 2B. New Parallel Track: Institutional Disposition Pipeline

> This is a **sub-pipeline** that activates on Deals where `institutional_grade`
> is not `NOT INSTITUTIONAL`. It runs alongside Pipeline B — a deal can be in
> `Negotiating` on Pipeline B while simultaneously in `Package Sent` on the
> disposition track.

```
Scored → Matched → Package Ready → Package Sent → Awaiting Response →
Interested → Negotiating (Dispo) → Terms Agreed → Closed (Dispo) | Passed
```

| Stage | Entry Criteria | Exit Criteria | Auto-actions |
|---|---|---|---|
| **Scored** | `institutional_grade` is set by spreadsheet sync | Buyer match found with score >= 50 | Tag `FLAG:INST-SCORED` |
| **Matched** | At least one buyer matched | Package completeness >= 75% | Create Disposition Log record |
| **Package Ready** | `package_ready = true` | Package sent to buyer | Tag `FLAG:PKG-READY` |
| **Package Sent** | `package_sent = true` on Disposition Log | Buyer responds or 5-day timeout | Start follow-up sequence |
| **Awaiting Response** | Package delivered, no response yet | Buyer responds | Auto follow-up at day 2, day 5 |
| **Interested** | `response_status = Interested` | Negotiation begins or buyer cools | Tag `FLAG:BUYER-HOT`, notify team |
| **Negotiating (Dispo)** | `negotiation_status != Not Started` | Terms agreed or dead | — |
| **Terms Agreed** | `negotiation_status = Terms Agreed` | Closed or fell through | Create task: "Prepare closing docs" |
| **Closed (Dispo)** | `closed = true` | — (terminal) | Update buyer reliability metrics |
| **Passed** | `response_status = Passed` | — (terminal) | Log pass reason, update buyer stats |

### 2C. Stage Mapping: Spreadsheet → CompanyHub

> When the spreadsheet syncs disposition data, it maps its internal states to
> CompanyHub stages using this logic (from `prepareDispositionForCRMExport()`):

| Spreadsheet Condition | CompanyHub Pipeline B Stage | Disposition Sub-Stage |
|---|---|---|
| New deal synced, Verdict != PASS | `New Lead` | — |
| `institutional_grade` calculated | `Analyzed` | `Scored` |
| Buyer matched, package not sent | `Analyzed` | `Package Ready` |
| `Sent Package? = Yes` | `Contacted` | `Package Sent` |
| `Response Status = Interested` | `Contacted` | `Interested` |
| `Negotiation Status != Not Started` | `Negotiating` | `Negotiating (Dispo)` |
| `Negotiation Status = Terms Agreed` | `Under Contract` | `Terms Agreed` |
| `Closed? = Yes` | `Closed` | `Closed (Dispo)` |
| `Response Status = Passed` or `Negotiation Status = Dead` | `Dead` | `Passed` |

### 2D. CRM_STAGES Constant Update

> The 9-stage CRM_STAGES array in Config.gs remains unchanged. These are the
> Pipeline B master stages. The disposition sub-pipeline is tracked via the
> `Disposition Log` table's `response_status` and `negotiation_status` fields.

```
'Hot Deal', 'Contacted', 'Negotiating', 'Inspecting',
'Bought', 'Repairing', 'Listed', 'Sold', 'Dead'
```

---

## 3. Field Dictionary Additions

> Format mirrors v5.0 exactly: Field Name, Object, Type, Picklist Values,
> Required, Default, Validation, Sheet Column Mapping.

### 3A. Deals Table — New Fields

| Field Name | Object | Type | Picklist Values | Req? | Default | Validation | Sheet Column |
|---|---|---|---|---|---|---|---|
| `institutional_grade` | Deals | Picklist | INSTITUTIONAL PRIME, INSTITUTIONAL FIT, LOCAL LANDLORD FIT, PORTFOLIO ONLY, NOT INSTITUTIONAL | No | — | — | Master DB → `Institutional Grade` |
| `institutional_score` | Deals | Number | — | No | — | 0-100, integer | Master DB → `Institutional Grade Score` |
| `disposition_priority` | Deals | Picklist | SEND NOW, HOLD FOR PORTFOLIO, LOCAL LANDLORD FIRST, REVIEW MANUALLY, NOT A FIT | No | — | — | Master DB → `Disposition Priority` |
| `portfolio_eligible` | Deals | Boolean | — | No | `false` | — | Master DB → `Portfolio Eligible` |
| `portfolio_group_id` | Deals | Text | — | No | — | Max 50 chars | Master DB → `Portfolio Group Suggestion` |
| `cap_rate` | Deals | Percent | — | No | — | 0.00-1.00 | Master DB → `Cap Rate` |
| `cash_on_cash` | Deals | Percent | — | No | — | 0.00-1.00 | Master DB → `Cash-on-Cash Return` |
| `estimated_annual_rent` | Deals | Currency | — | No | — | >= 0 | Master DB → `Estimated Annual Rent` |
| `neighborhood_grade` | Deals | Text | — | No | — | A, B, C, D, F | Master DB → `Neighborhood Grade` |
| `best_buyer_type` | Deals | Text | — | No | — | Max 100 chars | Master DB → `Best Buyer Type` |
| `best_match_buyer` | Deals | Lookup | — | No | — | FK → Inst Buyers | Master DB → `Best Match Buyer` |
| `package_ready` | Deals | Boolean | — | No | `false` | — | Master DB → `Package Ready?` |

### 3B. Institutional Buyers Table — All Fields

| Field Name | Object | Type | Picklist Values | Req? | Default | Validation | Sheet Column |
|---|---|---|---|---|---|---|---|
| `buyer_id` | Inst Buyers | Text (PK) | — | Yes | Auto | `IB-{ts36}` | Institutional Buyers → `Buyer ID` |
| `buyer_name` | Inst Buyers | Text | — | Yes | — | Max 200 | Institutional Buyers → `Buyer Name` |
| `buyer_type` | Inst Buyers | Picklist | SFR Fund, Multifamily Fund, REIT, Private Equity, Family Office, Local Landlord (5-20 units), Regional Operator (20-100 units), Turnkey Provider, Fix & Flip Fund, Build-to-Rent | Yes | `SFR Fund` | — | Institutional Buyers → `Buyer Type` |
| `primary_contact_name` | Inst Buyers | Text | — | No | — | Max 200 | Institutional Buyers → `Primary Contact Name` |
| `primary_contact_title` | Inst Buyers | Text | — | No | — | Max 100 | Institutional Buyers → `Primary Contact Title` |
| `email` | Inst Buyers | Email | — | Yes | — | Valid email | Institutional Buyers → `Email` |
| `phone` | Inst Buyers | Phone | — | Yes | — | E.164 | Institutional Buyers → `Phone` |
| `company` | Inst Buyers | Text | — | No | — | Max 200 | Institutional Buyers → `Company` |
| `website` | Inst Buyers | URL | — | No | — | Valid URL | Institutional Buyers → `Website` |
| `target_markets` | Inst Buyers | Multi-text | — | No | — | CSV | Institutional Buyers → `Target Market State` + `Target Market City` |
| `preferred_zips` | Inst Buyers | Multi-text | — | No | — | CSV 5-digit | Institutional Buyers → `Preferred ZIP Codes` |
| `asset_type` | Inst Buyers | Picklist | SFR, Duplex, Triplex, Fourplex, Condo, Townhouse, Mobile Home, Multi-Family, Any | No | `SFR` | — | Institutional Buyers → `Asset Type` |
| `preferred_strategy` | Inst Buyers | Picklist | LTR, STR, MTR, Flip, Wholesale, Creative, Any | No | `LTR` | — | Institutional Buyers → `Preferred Strategy` |
| `min_price` | Inst Buyers | Currency | — | No | — | >= 0 | Institutional Buyers → `Min Price` |
| `max_price` | Inst Buyers | Currency | — | No | — | >= min_price | Institutional Buyers → `Max Price` |
| `min_cap_rate` | Inst Buyers | Percent | — | No | — | 0.00-1.00 | Institutional Buyers → `Min Cap Rate` |
| `max_rehab_budget` | Inst Buyers | Currency | — | No | — | >= 0 | Institutional Buyers → `Max Rehab Budget` |
| `min_beds` | Inst Buyers | Number | — | No | — | >= 0 | Institutional Buyers → `Min Beds` |
| `bulk_buyer` | Inst Buyers | Boolean | — | No | `false` | — | Institutional Buyers → `Bulk Buyer?` |
| `min_portfolio_size` | Inst Buyers | Number | — | No | — | >= 2 | Institutional Buyers → `Minimum Portfolio Size` |
| `cash_buyer` | Inst Buyers | Boolean | — | No | `false` | — | Institutional Buyers → `Cash Buyer?` |
| `proof_of_funds` | Inst Buyers | Boolean | — | No | `false` | — | Institutional Buyers → `Proof of Funds On File?` |
| `buyer_status` | Inst Buyers | Picklist | Active, Paused, Inactive, Blacklisted | Yes | `Active` | — | Institutional Buyers → `Buyer Status` |
| `warmth_status` | Inst Buyers | Picklist | Hot, Warm, Cool, Cold | Yes | `Cold` | — | Institutional Buyers → `Warmth Status` |
| `priority_score` | Inst Buyers | Number | — | No | — | 0-100 | Institutional Buyers → `Priority Score` |
| `deals_sent` | Inst Buyers | Number | — | No | `0` | >= 0, auto-incremented | Institutional Buyers → `Deals Sent` |
| `deals_responded` | Inst Buyers | Number | — | No | `0` | >= 0, auto-incremented | Institutional Buyers → `Deals Responded` |
| `deals_closed` | Inst Buyers | Number | — | No | `0` | >= 0, auto-incremented | Institutional Buyers → `Deals Closed` |
| `response_rate` | Inst Buyers | Percent | — | No | — | Calc: responded/sent | Institutional Buyers → `Response Rate` |
| `close_rate` | Inst Buyers | Percent | — | No | — | Calc: closed/sent | Institutional Buyers → `Close Rate` |
| `avg_response_time_hrs` | Inst Buyers | Number | — | No | — | >= 0, decimal | Institutional Buyers → `Avg Response Time (hrs)` |
| `reliability_tier` | Inst Buyers | Picklist | PLATINUM, GOLD, SILVER, BRONZE | No | `BRONZE` | Auto-calc from rates | Institutional Buyers → `Buyer Reliability Tier` |
| `tags` | Inst Buyers | Multi-text | — | No | — | Namespace-prefixed | Institutional Buyers → `Tags` |

**Reliability Tier auto-calculation rules:**
- **PLATINUM**: `close_rate >= 0.40` AND `response_rate >= 0.80`
- **GOLD**: `close_rate >= 0.25` AND `response_rate >= 0.60`
- **SILVER**: `close_rate >= 0.10` AND `response_rate >= 0.40`
- **BRONZE**: Everything else

### 3C. Disposition Log Table — All Fields

| Field Name | Object | Type | Picklist Values | Req? | Default | Validation | Sheet Column |
|---|---|---|---|---|---|---|---|
| `disposition_id` | Dispo Log | Text (PK) | — | Yes | Auto | `DSP-{ts36}` | Disposition Tracker → `Disposition ID` |
| `deal_id` | Dispo Log | Lookup (Deals) | — | Yes | — | Must exist | Disposition Tracker → `Deal ID` |
| `address` | Dispo Log | Text | — | No | — | Denormalized from Deal | Disposition Tracker → `Address` |
| `buyer_id` | Dispo Log | Lookup (Inst Buyers) | — | Yes | — | Must exist | Disposition Tracker → `Buyer ID` |
| `buyer_name` | Dispo Log | Text | — | No | — | Denormalized from Buyer | Disposition Tracker → `Buyer Name` |
| `buyer_type` | Dispo Log | Text | — | No | — | Denormalized | Disposition Tracker → `Buyer Type` |
| `contact_name` | Dispo Log | Text | — | No | — | — | Disposition Tracker → `Contact Name` |
| `email` | Dispo Log | Email | — | No | — | Valid email | Disposition Tracker → `Email` |
| `phone` | Dispo Log | Phone | — | No | — | E.164 | Disposition Tracker → `Phone` |
| `matched_by_system` | Dispo Log | Boolean | — | No | `true` | — | Disposition Tracker → `Matched By System?` |
| `disposition_tier` | Dispo Log | Picklist | SEND NOW, HOLD FOR PORTFOLIO, LOCAL LANDLORD FIRST, REVIEW MANUALLY, NOT A FIT | Yes | — | — | Disposition Tracker → `Disposition Tier` |
| `package_sent` | Dispo Log | Boolean | — | No | `false` | — | Disposition Tracker → `Sent Package?` |
| `sent_date` | Dispo Log | DateTime | — | No | — | — | Disposition Tracker → `Sent Date` |
| `last_follow_up` | Dispo Log | DateTime | — | No | — | — | Disposition Tracker → `Last Follow-Up` |
| `follow_up_count` | Dispo Log | Number | — | No | `0` | >= 0 | Disposition Tracker → `Follow-Up Count` |
| `response_status` | Dispo Log | Picklist | No Contact, Sent - Awaiting, Viewed, Interested, Passed, Negotiating, Closed | Yes | `No Contact` | — | Disposition Tracker → `Response Status` |
| `interest_level` | Dispo Log | Picklist | Hot, Warm, Lukewarm, Not Interested | No | — | — | Disposition Tracker → `Interest Level` |
| `negotiation_status` | Dispo Log | Picklist | Not Started, Initial Discussion, Offer Made, Counter, Terms Agreed, Dead | No | `Not Started` | — | Disposition Tracker → `Negotiation Status` |
| `offer_received` | Dispo Log | Currency | — | No | — | >= 0 | Disposition Tracker → `Offer Received` |
| `counter_sent` | Dispo Log | Currency | — | No | — | >= 0 | Disposition Tracker → `Counter Sent` |
| `final_terms` | Dispo Log | Long Text | — | No | — | — | Disposition Tracker → `Final Terms` |
| `closed` | Dispo Log | Boolean | — | No | `false` | — | Disposition Tracker → `Closed?` |
| `pass_reason` | Dispo Log | Text | — | No | — | Max 500 chars | Disposition Tracker → `Pass Reason` |
| `next_action` | Dispo Log | Text | — | No | — | — | Disposition Tracker → `Next Action` |
| `assigned_to` | Dispo Log | Lookup (Team) | — | No | — | — | Disposition Tracker → `Assigned To` |
| `notes` | Dispo Log | Long Text | — | No | — | — | Disposition Tracker → `Notes` |

### 3D. Portfolio Bundles Table — All Fields

| Field Name | Object | Type | Picklist Values | Req? | Default | Validation | Sheet Column |
|---|---|---|---|---|---|---|---|
| `portfolio_id` | Portfolio | Text (PK) | — | Yes | Auto | `PF-{ts36}` | Portfolio Builder → `Portfolio Group ID` |
| `portfolio_name` | Portfolio | Text | — | Yes | — | Max 200 | Portfolio Builder → `Portfolio Name` |
| `deal_count` | Portfolio | Number | — | Yes | — | >= 2 | Portfolio Builder → `Deal Count` |
| `state` | Portfolio | Text | — | No | — | 2-letter | Portfolio Builder → `State` |
| `city` | Portfolio | Text | — | No | — | — | Portfolio Builder → `City` |
| `zip_cluster` | Portfolio | Multi-text | — | No | — | CSV | Portfolio Builder → `ZIP Cluster` |
| `asset_type_mix` | Portfolio | Text | — | No | — | — | Portfolio Builder → `Asset Type Mix` |
| `strategy_mix` | Portfolio | Text | — | No | — | — | Portfolio Builder → `Strategy Mix` |
| `avg_asking_price` | Portfolio | Currency | — | No | — | >= 0 | Portfolio Builder → `Average Asking Price` |
| `avg_cap_rate` | Portfolio | Percent | — | No | — | 0-1 | Portfolio Builder → `Average Cap Rate` |
| `avg_cash_on_cash` | Portfolio | Percent | — | No | — | 0-1 | Portfolio Builder → `Average Cash-on-Cash Return` |
| `total_portfolio_cost` | Portfolio | Currency | — | No | — | >= 0 | Portfolio Builder → `Total Estimated Portfolio Cost` |
| `total_annual_rent` | Portfolio | Currency | — | No | — | >= 0 | Portfolio Builder → `Total Estimated Annual Rent` |
| `appeal_tier` | Portfolio | Picklist | BULK READY, STRONG PORTFOLIO, LOCAL PACKAGE, MIXED QUALITY, DO NOT BUNDLE | Yes | — | — | Portfolio Builder → `Bulk Buyer Fit` |
| `appeal_score` | Portfolio | Number | — | No | — | 0-100 | Portfolio Builder → `Institutional Appeal Score` |
| `package_status` | Portfolio | Picklist | Draft, Ready, Sent, Under Review, Accepted, Rejected | Yes | `Draft` | — | Portfolio Builder → `Package Status` |
| `assigned_buyers` | Portfolio | Multi-text | — | No | — | CSV buyer IDs | Portfolio Builder → `Assigned Buyer Targets` |
| `notes` | Portfolio | Long Text | — | No | — | — | Portfolio Builder → `Notes` |

---

## 4. Automation Rules (IF/THEN Logic)

> Adds to the existing 26 automations in v5.0. New automations are numbered
> A27–A41. All fire on record create or field update unless noted.

### 4A. Institutional Scoring Automations

**A27 — Tag institutional grade on sync**
```
IF   Deal.institutional_grade IS SET (on create or update)
AND  Deal.institutional_grade != "NOT INSTITUTIONAL"
THEN Tag Deal with "TIER:INST-{grade}" (e.g., TIER:INST-PRIME)
AND  Tag Deal with "FLAG:INSTITUTIONAL"
```

**A28 — Auto-assign disposition priority tag**
```
IF   Deal.disposition_priority IS SET
THEN Tag Deal with "FLAG:DISPO-{priority}" (e.g., FLAG:DISPO-SEND-NOW)
AND  IF Deal.disposition_priority = "SEND NOW"
     THEN Create Task: "Send deal package for {address}" assigned to Disposition Manager, due TODAY
```

**A29 — Portfolio eligibility flag**
```
IF   Deal.portfolio_eligible = true
AND  Deal.portfolio_group_id IS NOT EMPTY
THEN Tag Deal with "FLAG:PORTFOLIO-ELIGIBLE"
AND  Tag Deal with "Q:PORTFOLIO-{portfolio_group_id}"
```

### 4B. Buyer Matching Automations

**A30 — Disposition record created**
```
IF   Disposition Log record IS CREATED
AND  Disposition Log.matched_by_system = true
THEN Tag linked Deal with "FLAG:BUYER-MATCHED"
AND  Increment Inst Buyer.deals_sent by 1
AND  IF Inst Buyer.warmth_status = "Cold"
     THEN Update Inst Buyer.warmth_status to "Cool"
```

**A31 — Package sent trigger**
```
IF   Disposition Log.package_sent CHANGES TO true
THEN Update Disposition Log.sent_date to NOW()
AND  Update Disposition Log.response_status to "Sent - Awaiting"
AND  Tag Deal with "FLAG:PKG-SENT"
AND  Create Task: "Follow up with {buyer_name} on {address}" due in 2 days
AND  Start SMS-iT sequence: "Institutional Package Follow-Up" for buyer contact
```

**A32 — Auto follow-up reminder (Tier 1 — SEND NOW deals)**
```
IF   Disposition Log.disposition_tier = "SEND NOW"
AND  Disposition Log.package_sent = true
AND  Disposition Log.response_status = "Sent - Awaiting"
AND  DAYS_SINCE(Disposition Log.sent_date) >= 2
AND  Disposition Log.follow_up_count < 3
THEN Create Task: "PRIORITY: Follow up #{follow_up_count+1} with {buyer_name}" due TODAY
AND  Tag Deal with "FLAG:FOLLOW-UP-DUE"
```

**A33 — Auto follow-up reminder (Standard deals)**
```
IF   Disposition Log.disposition_tier != "SEND NOW"
AND  Disposition Log.package_sent = true
AND  Disposition Log.response_status = "Sent - Awaiting"
AND  DAYS_SINCE(Disposition Log.last_follow_up OR Disposition Log.sent_date) >= 5
AND  Disposition Log.follow_up_count < 3
THEN Create Task: "Follow up #{follow_up_count+1} with {buyer_name}" due TODAY
```

### 4C. Response & Negotiation Automations

**A34 — Buyer responds with interest**
```
IF   Disposition Log.response_status CHANGES TO "Interested"
THEN Tag Deal with "FLAG:BUYER-HOT"
AND  Update Inst Buyer.warmth_status to "Hot"
AND  Increment Inst Buyer.deals_responded by 1
AND  Create Task: "Buyer {buyer_name} interested in {address} — begin negotiation" due TODAY, priority HIGH
AND  Notify Disposition Manager via email
AND  Update Inst Buyer.avg_response_time_hrs (calc from sent_date to now)
```

**A35 — Buyer passes**
```
IF   Disposition Log.response_status CHANGES TO "Passed"
THEN Tag Deal with "FLAG:BUYER-PASSED-{buyer_id}"
AND  Increment Inst Buyer.deals_responded by 1
AND  IF ALL Disposition Log records for this Deal have response_status = "Passed"
     THEN Tag Deal with "FLAG:ALL-BUYERS-PASSED"
     AND  Create Task: "All buyers passed on {address} — review pricing or repackage"
```

**A36 — Negotiation status changes**
```
IF   Disposition Log.negotiation_status CHANGES TO "Offer Made"
THEN Update Deal stage to "Negotiating" (Pipeline B)
AND  Tag Deal with "FLAG:OFFER-IN"

IF   Disposition Log.negotiation_status CHANGES TO "Terms Agreed"
THEN Update Deal stage to "Under Contract" (Pipeline B)
AND  Tag Deal with "FLAG:TERMS-AGREED"
AND  Create Task: "Prepare closing documents for {address}" due in 3 days
```

**A37 — Deal closed via disposition**
```
IF   Disposition Log.closed CHANGES TO true
THEN Update Deal stage to "Closed" (Pipeline B)
AND  Increment Inst Buyer.deals_closed by 1
AND  Recalculate Inst Buyer.response_rate, close_rate, reliability_tier
AND  Tag Deal with "FLAG:DISPO-CLOSED"
AND  Tag Deal with "ACQ:{buyer_type}" (e.g., ACQ:SFR-FUND)
AND  Remove tags: FLAG:FOLLOW-UP-DUE, FLAG:BUYER-HOT
```

### 4D. Portfolio Automations

**A38 — Portfolio bundle created**
```
IF   Portfolio Bundle record IS CREATED
AND  Portfolio Bundle.appeal_tier IN ("BULK READY", "STRONG PORTFOLIO")
THEN Create Task: "Review portfolio {portfolio_name} for distribution" due in 1 day
AND  Tag all linked Deals with "Q:PORTFOLIO-{portfolio_id}"
```

**A39 — Portfolio sent to buyer**
```
IF   Portfolio Bundle.package_status CHANGES TO "Sent"
THEN Create Disposition Log records for each deal+buyer combination (if not exists)
AND  Tag all linked Deals with "FLAG:PORTFOLIO-SENT"
```

### 4E. Reliability & Hygiene Automations

**A40 — Buyer reliability tier recalculation (nightly)**
```
TRIGGER: Nightly at 3 AM (after spreadsheet sync at 2 AM)
FOR EACH Inst Buyer WHERE deals_sent >= 3:
  RECALCULATE response_rate = deals_responded / deals_sent
  RECALCULATE close_rate = deals_closed / deals_sent
  UPDATE reliability_tier per tier rules (Section 3B)
  IF reliability_tier CHANGED
  THEN Tag Inst Buyer with "TIER:{new_tier}" and remove old tier tag
```

**A41 — Stale disposition cleanup**
```
IF   Disposition Log.response_status = "Sent - Awaiting"
AND  DAYS_SINCE(Disposition Log.sent_date) > 30
AND  Disposition Log.follow_up_count >= 3
THEN Update Disposition Log.response_status to "Passed"
AND  Set Disposition Log.pass_reason to "No response after 30 days / 3 follow-ups"
AND  Tag Deal with "FLAG:DISPO-TIMEOUT"
```

### 4F. Updated Automation Count

| Category | v5.0 | v5.1 | Delta |
|---|---|---|---|
| Lead & Deal automations | 12 | 12 | — |
| CRM Sync automations | 6 | 6 | — |
| SLA / Speed-to-Lead | 4 | 4 | — |
| Reporting | 4 | 4 | — |
| **Institutional Disposition** | **—** | **15** | **+15** |
| **TOTAL** | **26** | **41** | **+15** |

---

## 5. Dedup Rules for New Tables

> Extends the existing dedup rules (Address+ZIP or Listing URL for RE, Phone for Contacts).

| Table | Dedup Key | Logic |
|---|---|---|
| Institutional Buyers | `buyer_name` + `email` | Case-insensitive match. On collision: update existing, don't create duplicate. |
| Disposition Log | `deal_id` + `buyer_id` | One record per deal-buyer pair. On collision: update existing record. |
| Portfolio Bundles | `portfolio_id` | System-generated, guaranteed unique. |
| Deals (institutional fields) | Existing dedup (Address+ZIP) | Institutional fields are appended to existing deal record on sync. |

---

## 6. Tag Taxonomy Additions

> Extends the existing 60 tags across 6 namespaces. New tags use existing namespaces
> plus no new namespace prefixes needed.

### 6A. New Tags by Namespace

**V: (Verdict) — 0 new** (unchanged)

**Q: (Qualification) — 6 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `Q:INST-PRIME` | Deal | `institutional_grade = INSTITUTIONAL PRIME` |
| `Q:INST-FIT` | Deal | `institutional_grade = INSTITUTIONAL FIT` |
| `Q:LOCAL-FIT` | Deal | `institutional_grade = LOCAL LANDLORD FIT` |
| `Q:PORTFOLIO-ONLY` | Deal | `institutional_grade = PORTFOLIO ONLY` |
| `Q:NOT-INST` | Deal | `institutional_grade = NOT INSTITUTIONAL` |
| `Q:PORTFOLIO-{id}` | Deal | Deal assigned to portfolio bundle |

**STRAT: (Strategy) — 2 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `STRAT:BULK-DISPO` | Deal | Disposition priority = SEND NOW and bulk buyer matched |
| `STRAT:LOCAL-DISPO` | Deal | Disposition priority = LOCAL LANDLORD FIRST |

**SRC: (Source) — 1 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `SRC:QUANTUM-INST` | Inst Buyer, Dispo Log | Record created via Quantum spreadsheet sync |

**ACQ: (Acquisition Channel) — 5 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `ACQ:SFR-FUND` | Deal | Closed via SFR Fund buyer |
| `ACQ:REIT` | Deal | Closed via REIT buyer |
| `ACQ:PE-FUND` | Deal | Closed via Private Equity buyer |
| `ACQ:LOCAL-LL` | Deal | Closed via Local Landlord buyer |
| `ACQ:TURNKEY` | Deal | Closed via Turnkey Provider buyer |

**FLAG: (Operational Flag) — 12 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `FLAG:INSTITUTIONAL` | Deal | Has institutional grade != NOT INSTITUTIONAL |
| `FLAG:INST-SCORED` | Deal | Institutional scoring complete |
| `FLAG:BUYER-MATCHED` | Deal | At least one institutional buyer matched |
| `FLAG:PKG-READY` | Deal | Package completeness >= 75% |
| `FLAG:PKG-SENT` | Deal | Package sent to at least one buyer |
| `FLAG:FOLLOW-UP-DUE` | Deal | Follow-up reminder pending |
| `FLAG:BUYER-HOT` | Deal | Buyer expressed interest |
| `FLAG:BUYER-PASSED-{id}` | Deal | Specific buyer passed |
| `FLAG:ALL-BUYERS-PASSED` | Deal | All matched buyers passed |
| `FLAG:OFFER-IN` | Deal | Buyer made an offer |
| `FLAG:TERMS-AGREED` | Deal | Terms agreed, pending close |
| `FLAG:DISPO-CLOSED` | Deal | Disposition closed successfully |
| `FLAG:DISPO-TIMEOUT` | Deal | Disposition timed out (30 days, no response) |
| `FLAG:PORTFOLIO-ELIGIBLE` | Deal | Eligible for portfolio bundling |
| `FLAG:PORTFOLIO-SENT` | Deal | Part of a sent portfolio bundle |

**TIER: (Tier/Classification) — 4 new**
| Tag | Applied To | Trigger |
|---|---|---|
| `TIER:PLATINUM` | Inst Buyer | Reliability tier = PLATINUM |
| `TIER:GOLD` | Inst Buyer | Reliability tier = GOLD |
| `TIER:SILVER` | Inst Buyer | Reliability tier = SILVER |
| `TIER:BRONZE` | Inst Buyer | Reliability tier = BRONZE |

### 6B. Updated Tag Count

| Namespace | v5.0 | v5.1 | Delta |
|---|---|---|---|
| V: | 8 | 8 | — |
| Q: | 12 | 18 | +6 |
| STRAT: | 10 | 12 | +2 |
| SRC: | 8 | 9 | +1 |
| ACQ: | 6 | 11 | +5 |
| FLAG: | 10 | 25 | +15 |
| TIER: | 6 | 10 | +4 |
| **TOTAL** | **60** | **93** | **+33** |

---

## 7. Dashboard & Report Updates

### 7A. New Dashboard: Institutional Disposition Dashboard

> Recommended as a dedicated CompanyHub dashboard tab alongside existing dashboards.

**KPI Cards (8):**

| KPI | Source | Calculation |
|---|---|---|
| Total Institutional Deals | Deals table | COUNT WHERE `institutional_grade` != "NOT INSTITUTIONAL" |
| SEND NOW Queue | Deals table | COUNT WHERE `disposition_priority` = "SEND NOW" AND no Dispo Log with `closed = true` |
| Active Buyers | Inst Buyers table | COUNT WHERE `buyer_status` = "Active" |
| Packages Sent (30d) | Dispo Log | COUNT WHERE `package_sent = true` AND `sent_date` >= NOW() - 30d |
| Response Rate (30d) | Dispo Log | COUNT(responded) / COUNT(sent) in last 30 days |
| Deals Closed (30d) | Dispo Log | COUNT WHERE `closed = true` AND close date >= NOW() - 30d |
| Portfolios Active | Portfolio Bundles | COUNT WHERE `package_status` IN ("Ready", "Sent", "Under Review") |
| Avg Days to Response | Dispo Log | AVG(first_response_date - sent_date) for responded dispositions |

**Charts (4):**

| Chart | Type | Data |
|---|---|---|
| Institutional Grade Distribution | Horizontal stacked bar | Count of deals per grade tier |
| Disposition Funnel | Funnel | Scored → Matched → Sent → Responded → Interested → Closed |
| Buyer Reliability Distribution | Donut | Count of buyers per reliability tier |
| Top 10 Markets by Deal Volume | Bar | Deal count grouped by ZIP, top 10 |

### 7B. New Saved Filters (12)

| # | Filter Name | Table | Criteria |
|---|---|---|---|
| F47 | Institutional Prime Deals | Deals | `institutional_grade = "INSTITUTIONAL PRIME"` |
| F48 | SEND NOW Queue | Deals | `disposition_priority = "SEND NOW"` AND `package_ready = true` |
| F49 | Portfolio-Eligible Deals | Deals | `portfolio_eligible = true` |
| F50 | Unmatched Institutional | Deals | `institutional_grade` IN (PRIME, FIT) AND no Dispo Log record |
| F51 | Active Institutional Buyers | Inst Buyers | `buyer_status = "Active"` |
| F52 | Platinum/Gold Buyers | Inst Buyers | `reliability_tier` IN ("PLATINUM", "GOLD") |
| F53 | Pending Follow-Ups | Dispo Log | `response_status = "Sent - Awaiting"` AND `next_follow_up_due <= TODAY()` |
| F54 | Interested Buyers | Dispo Log | `response_status = "Interested"` |
| F55 | Active Negotiations | Dispo Log | `negotiation_status` NOT IN ("Not Started", "Dead") AND `closed = false` |
| F56 | Closed Dispositions (30d) | Dispo Log | `closed = true` AND close date >= NOW() - 30d |
| F57 | Bulk Ready Portfolios | Portfolio Bundles | `appeal_tier = "BULK READY"` |
| F58 | All Buyer Passes | Dispo Log | `response_status = "Passed"` last 30 days |

### 7C. Updated Filter Count

| Category | v5.0 | v5.1 | Delta |
|---|---|---|---|
| Deal filters | 18 | 22 | +4 |
| Contact filters | 8 | 8 | — |
| Property filters | 12 | 12 | — |
| Vehicle filters | 4 | 4 | — |
| Buyer filters | 4 | 6 | +2 |
| **Institutional Dispo filters** | **—** | **6** | **+6** |
| **TOTAL** | **46** | **58** | **+12** |

---

## 8. Sheets → CompanyHub Sync Mapping

### 8A. Sync Direction & Trigger

| Direction | Trigger | Frequency | Function |
|---|---|---|---|
| Sheets → CompanyHub | `syncToCompanyHub()` | Nightly at 2 AM (via `nightlyRefresh`) or on-demand | Pushes Deals with Verdict != PASS |
| Sheets → CompanyHub | `syncDispositionsToCompanyHub()` | After institutional workflow or on-demand | Pushes Disposition Tracker records |
| CompanyHub → Sheets | Not implemented (v5.1) | — | Future: pull response_status back to tracker |

### 8B. Deal Sync — New Column Mappings

> Extends the existing deal sync payload (`buildCompanyHubDealPayload`).
> These 12 fields are appended to the existing `properties` and `customFields` objects.

| Sheet Column (Master DB) | CompanyHub Field | Payload Location | Notes |
|---|---|---|---|
| `Institutional Grade` | `institutional_grade` | `customFields.institutionalGrade` | Picklist value |
| `Institutional Grade Score` | `institutional_score` | `customFields.institutionalScore` | 0-100 |
| `Disposition Priority` | `disposition_priority` | `customFields.dispositionPriority` | Picklist value |
| `Portfolio Eligible` | `portfolio_eligible` | `customFields.portfolioEligible` | Boolean |
| `Portfolio Group Suggestion` | `portfolio_group_id` | `customFields.portfolioGroupId` | Text |
| `Cap Rate` | `cap_rate` | `properties.capRate` | Decimal (0.08 = 8%) |
| `Cash-on-Cash Return` | `cash_on_cash` | `properties.cashOnCash` | Decimal |
| `Estimated Annual Rent` | `estimated_annual_rent` | `properties.estimatedAnnualRent` | Currency |
| `Neighborhood Grade` | `neighborhood_grade` | `properties.neighborhoodGrade` | A/B/C/D/F |
| `Best Buyer Type` | `best_buyer_type` | `customFields.bestBuyerType` | Text |
| `Best Match Buyer` | `best_match_buyer` | `customFields.bestMatchBuyer` | Buyer name |
| `Package Ready?` | `package_ready` | `customFields.packageReady` | Boolean |

### 8C. Disposition Sync — Full Column Mapping

> From `syncDispositionsToCompanyHub()`. Creates Deal records in CompanyHub
> named `DISPO: {address} -> {buyer_name}`.

| Sheet Column (Disposition Tracker) | CompanyHub Payload Field | Location |
|---|---|---|
| `Deal ID` | `customFields.quantumDealId` | customFields |
| `Address` | `name` (as `DISPO: {address} -> {buyer}`) | root |
| `Buyer ID` | `customFields.quantumBuyerId` | customFields |
| `Buyer Name` | `properties.buyerName` | properties |
| `Buyer Type` | `properties.buyerType` | properties |
| `Email` | `properties.contactEmail` | properties |
| `Phone` | `properties.contactPhone` | properties |
| `Disposition Tier` | `properties.dispositionTier` | properties |
| `Response Status` | `properties.responseStatus` | properties |
| `Negotiation Status` | `properties.negotiationStatus` | properties |
| `Closed?` | — (used for stage calc) | — |
| *(calculated)* | `stage` | root — see stage mapping below |

**Stage calculation logic (from code):**
```javascript
let crmStage = 'Hot Deal';                                    // Default
if (closed)                        crmStage = 'Sold';         // Terminal win
if (negoStatus === 'Dead' ||
    responseStatus === 'Passed')   crmStage = 'Dead';         // Terminal loss
if (negoStatus &&
    negoStatus !== 'Not Started')  crmStage = 'Negotiating';  // Active nego
if (responseStatus === 'Interested') crmStage = 'Contacted';  // Engaged
if (sentPackage === 'Yes')         crmStage = 'Contacted';    // Reached out
```

### 8D. Sync Dedup & Idempotency

| Concern | Handling |
|---|---|
| **Deal dedup** | Existing: `CRM Synced = Yes` flag on Master DB prevents re-push. On institutional field update, uses `CRM Record ID` for PATCH instead of POST. |
| **Disposition dedup** | Key: `deal_id + buyer_id`. `syncDispositionsToCompanyHub()` checks for existing CompanyHub record before creating. |
| **Rate limiting** | 200ms sleep between API calls (`Utilities.sleep(200)`). CompanyHub standard rate limit: 100 req/min. |
| **Error handling** | `crmFetch_()` retries on 429/5xx with exponential backoff (1s, 2s). Non-retryable on 4xx. All results logged to Sync Log sheet. |
| **Partial failure** | Function continues on individual record failure. Returns `{ synced: N, errors: N }`. No rollback — CRM records are append-only. |

---

## 9. Sensible Defaults Summary

> All defaults documented here. Change in CompanyHub admin or via Quantum Settings sheet.

| Setting | Default | Where Set | Notes |
|---|---|---|---|
| Min institutional score for sync | 60 | Config.gs `DEFAULTS.minInstitutionalScore` | Deals below this won't generate disposition records |
| Min buy box match score | 50 | Config.gs `DEFAULTS.minMatchScore` | Matches below this are filtered out |
| Min package completeness | 75% | Config.gs `DEFAULTS.packageCompletenessThreshold` | Packages below this aren't marked "Ready" |
| Min portfolio size | 3 deals | Config.gs `DEFAULTS.minPortfolioSize` | Fewer than 3 deals won't form a portfolio |
| Follow-up interval (SEND NOW) | 2 days | A32 automation | Priority deals get faster follow-up |
| Follow-up interval (Standard) | 5 days | A33 automation | Regular cadence |
| Max follow-ups before timeout | 3 | A32/A33 automation | After 3, auto-pass at 30 days (A41) |
| Stale disposition timeout | 30 days | A41 automation | Auto-marked as Passed |
| Default buyer status | Active | Inst Buyers table | New buyers start active |
| Default warmth status | Cold | Inst Buyers table | Must earn warmer status |
| Default reliability tier | BRONZE | Inst Buyers table | Recalculated after 3+ deals sent |
| API rate limit delay | 200ms | `syncDispositionsToCompanyHub()` | Between each API call |
| Nightly sync time | 2:00 AM | `createTriggers()` | Runs full pipeline + institutional workflow |
| Reliability recalc time | 3:00 AM | A40 automation | After spreadsheet sync completes |
| CRM sync enabled | false | Settings sheet `crm_companyhub_enabled` | Must be explicitly enabled |

---

## 10. Migration Notes (v5.0 → v5.1)

### 10A. Non-Breaking Changes
- All new tables are additive — no existing tables modified structurally
- 12 new fields on Deals are all optional with no defaults that affect existing logic
- All new automations (A27-A41) only fire on new institutional fields, so they won't trigger on existing records
- Tag additions don't affect existing tag-based filters

### 10B. Required Setup Steps
1. Create 3 new tables in CompanyHub: Institutional Buyers, Disposition Log, Portfolio Bundles
2. Add 12 new fields to existing Deals table
3. Add 3 new fields to existing Contacts table
4. Create 15 new automation rules (A27-A41)
5. Add 33 new tags to tag taxonomy
6. Create 12 new saved filters
7. Build Institutional Disposition Dashboard
8. Enable `crm_companyhub_enabled` in Quantum Settings sheet
9. Enter CompanyHub API URL and API key in Settings

### 10C. Rollback
- Delete the 3 new tables (no FK dependencies from existing tables)
- Remove 12 Deal fields (no existing logic references them)
- Disable automations A27-A41
- Set `crm_companyhub_enabled = false`

---

*End of CompanyHub CRM Spec Pack v5.1 Addendum. This document covers all object model,
pipeline, field dictionary, automation, tag, dashboard, and sync mapping changes required
to support the Institutional Buyer / Hedge Fund Disposition Layer. It slots into the
existing v5.0 spec pack without modifying any previously defined structure.*

**Version**: 5.1
**Last Updated**: April 2026
**Addendum For**: Quantum Real Estate Analyzer v2.0 — Institutional Disposition Layer
