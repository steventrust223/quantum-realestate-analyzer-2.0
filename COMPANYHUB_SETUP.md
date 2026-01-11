# Quantum Real Estate Analyzer v2.0 — CompanyHub CRM Configuration Guide

## 🔮 Overview

CompanyHub CRM is the **central deal tracking and pipeline management** component of the Quantum Real Estate Analyzer. This guide configures CompanyHub to work seamlessly with your **AI-driven, psychology-powered wholesaling system** across all 7 deal strategies.

### **Philosophy**
- **AI-driven decision-making** at every stage
- **Psychological negotiation advantage** baked into messaging
- **Automation over manual work** for maximum efficiency
- **Visual clarity + motivation** in every interaction

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deal Types Supported](#deal-types-supported)
3. [Integration Architecture](#integration-architecture)
4. [Custom Fields Setup](#custom-fields-setup)
5. [Pipeline Configuration](#pipeline-configuration)
6. [Quantum Layer Integration](#quantum-layer-integration)
7. [Buyers Matching Engine](#buyers-matching-engine)
8. [CRM Sync Log](#crm-sync-log)
9. [Import Hub & Webhooks](#import-hub--webhooks)
10. [Strategic Edge Features](#strategic-edge-features)
11. [Automation Setup](#automation-setup)
12. [Best Practices](#best-practices)

---

## ✅ Prerequisites

Before configuring CompanyHub, ensure you have:

1. **CompanyHub Account** with API access (get from companyhub.com/api)
2. **API Key** (found in CompanyHub: Settings → Integrations → API Keys)
3. **Quantum Real Estate Analyzer** initialized (run Setup → Initialize System)
4. **Google Sheets** with admin access
5. **All integration tools**:
   - Browse.AI account (browse.ai)
   - SMS-iT CRM account (sms-it.com)
   - Ohmylead account (ohmylead.com)
   - SignWell account (signwell.com)
   - Book Like A Boss (optional) (booklikeaboss.com)

---

## 🏗️ Deal Types Supported

The Quantum Analyzer supports **7 deal strategies** (not just wholesaling):

### **1. Wholesaling (Assignment)**
- **Pipeline**: Lead → Analysis → Contact → Offer → Under Contract → Marketed → Assigned → Closed
- **Key Metric**: Assignment fee
- **CompanyHub Stage**: `wholesaling_pipeline`
- **Quantum Strategy**: "Assignment (Wholesaling)"

### **2. Sub-To (Subject-To)**
- **Pipeline**: Lead → Analysis → Contact → Terms Negotiation → Due Diligence → Under Contract → Closed
- **Key Metric**: Monthly cash flow spread
- **CompanyHub Stage**: `sub2_pipeline`
- **Quantum Strategy**: "Sub2 (Subject-To)"

### **3. Wraparounds**
- **Pipeline**: Lead → Analysis → Contact → Wrap Structuring → Legal Review → Under Contract → Closed
- **Key Metric**: Interest rate spread + monthly income
- **CompanyHub Stage**: `wrap_pipeline`
- **Quantum Strategy**: "Wraparound"

### **4. JV / Partnerships**
- **Pipeline**: Lead → Analysis → Partner Sourcing → Deal Structuring → Joint Contract → Project Management → Exit
- **Key Metric**: Profit split %
- **CompanyHub Stage**: `jv_pipeline`
- **Quantum Strategy**: "JV / Partnership"

### **5. STR / MTR / LTR (Rentals)**
- **Pipeline**: Lead → Analysis → Financing → Purchase → Renovation → Tenant Placement → Management
- **Key Metric**: Monthly cash flow + appreciation
- **CompanyHub Stage**: `rental_pipeline`
- **Quantum Strategy**: "Rental (Buy & Hold)"

### **6. Fix & Flip**
- **Pipeline**: Lead → Analysis → Purchase → Renovation → Marketing → Sold
- **Key Metric**: Net profit after rehab
- **CompanyHub Stage**: `flip_pipeline`
- **Quantum Strategy**: "Fix & Flip"

### **7. Virtual Wholesaling**
- **Pipeline**: Lead → Remote Analysis → Virtual Contact → Virtual Contract → Remote Disposition → Closed
- **Key Metric**: Assignment fee (remote markets)
- **CompanyHub Stage**: `virtual_pipeline`
- **Quantum Strategy**: "Virtual Wholesaling"

---

## 🔌 Integration Architecture

### **Data Flow**

```
Browse.AI (Facebook/Zillow/PropStream scraping)
    ↓
Import Hub (Quantum Analyzer)
    ↓
Master Database (AI Analysis + Scoring)
    ↓
Verdict Sheet (Ranked deals + AI verdicts)
    ↓
CompanyHub CRM (Pipeline tracking)
    ↓
SMS-iT CRM (Messaging & negotiation bots)
    ↓
SignWell (Contract e-signatures)
    ↓
Ohmylead (Web lead tracking)
```

### **Integration Tools**

#### **1. Browse.AI → Lead Ingestion**
- **Purpose**: Scrape leads from Facebook Marketplace, Zillow, PropStream, Craigslist
- **Webhook URL**: Deploy as Google Apps Script web app
- **Import Function**: `importBrowseAILeads()`
- **Staging Area**: Import Hub sheet
- **API Docs**: https://docs.browse.ai

**Setup Steps**:
1. Create Browse.AI robot for your target source (e.g., "Facebook Marketplace - [City]")
2. Configure robot to capture: Address, Price, Bedrooms, Baths, Sqft, Seller Contact
3. Copy API key and Robot ID
4. Add to Settings sheet: `BROWSE_AI_API_KEY`, `BROWSE_AI_ROBOT_ID`
5. Enable webhook notifications in Browse.AI (optional)
6. Run: Menu → Integrations → Import Browse.AI Leads

#### **2. SMS-iT CRM → Messaging & Negotiation Bots**
- **Purpose**: Automated SMS campaigns, seller psychology profiling, negotiation bots
- **Sync Function**: `syncToSMSiT(propertyId, contactInfo)`
- **Campaigns**: `hot_lead`, `follow_up`, `cold_nurture`, `contract_reminder`
- **API Docs**: https://api-docs.sms-it.com

**Setup Steps**:
1. Get SMS-iT API key from Settings → API
2. Copy Workspace ID
3. Add to Settings: `SMSIT_API_KEY`, `SMSIT_WORKSPACE_ID`
4. Configure campaigns in SMS-iT:
   - **Hot Lead**: Immediate response for 🔥 HOT DEALs (triggers within 2 hours)
   - **Follow-up**: 3-day cadence for motivated sellers
   - **Cold Nurture**: Weekly touchpoints for long-term leads
5. Map Quantum fields to SMS-iT custom fields:
   - `propertyId` → Custom Field 1
   - `dealClassifier` → Tag
   - `sellerMotivation` → Custom Field 2
   - `hotSeller` → Tag

#### **3. CompanyHub CRM → Pipeline & Deal Tracking**
- **Purpose**: Visual pipeline management, team coordination, deal tracking
- **Sync Function**: `syncToCompanyHub(dealData)`
- **Pipeline Stages**: See [Pipeline Configuration](#pipeline-configuration)
- **API Docs**: https://docs.companyhub.com/api

**Setup Steps**:
1. Get CompanyHub API key from Settings → Integrations
2. Add to Settings: `COMPANYHUB_API_KEY`
3. Create 7 custom pipelines in CompanyHub (one per deal type)
4. Map Quantum stages to CompanyHub stages (see mapping table below)
5. Enable auto-sync: Settings → `AUTO_CRM_SYNC` = TRUE

#### **4. Ohmylead → Web & Ad Lead Intake**
- **Purpose**: Capture leads from landing pages, Facebook ads, Google ads
- **Sync Function**: `syncOhmylead()`
- **Lead Sources**: Web forms, ad campaigns, chatbots
- **API Docs**: https://docs.ohmylead.com

**Setup Steps**:
1. Get Ohmylead API key
2. Add to Settings: `OHMYLEAD_API_KEY`
3. Configure lead forms in Ohmylead to capture:
   - Property address
   - Seller name, phone, email
   - Motivation level (dropdown)
   - Preferred contact method
4. Run hourly sync: Enabled by default via `runHourlySync()`

#### **5. SignWell → Contract E-Signatures**
- **Purpose**: Send contracts for e-signature (purchase agreements, assignments, Sub2 docs)
- **Send Function**: `sendToSignWell(propertyId, contractType, signers)`
- **Contract Types**: `purchase_agreement`, `assignment_contract`, `sub2_agreement`, `wrap_agreement`
- **API Docs**: https://www.signwell.com/api/docs

**Setup Steps**:
1. Get SignWell API key from Settings → API Keys
2. Add to Settings: `SIGNWELL_API_KEY`
3. Upload contract templates to SignWell:
   - Purchase Agreement (wholesaling)
   - Assignment Contract
   - Subject-To Agreement
   - Wraparound Agreement
   - JV Partnership Agreement
4. Map merge fields to Quantum fields:
   - `{{propertyAddress}}` → Master Database: Property Address
   - `{{sellerName}}` → Master Database: Seller Name
   - `{{purchasePrice}}` → Offers & Disposition: Offer Amount
5. Use: Offers & Disposition sheet → Send to SignWell button

#### **6. Book Like A Boss (Optional) → Appointment Scheduling**
- **Purpose**: Schedule seller consultations automatically
- **Create Link Function**: `createBookingLink(propertyId, sellerInfo)`
- **API Docs**: https://booklikeaboss.com/api

**Setup Steps**:
1. Get API key from Book Like A Boss
2. Add to Settings: `BOOK_LIKE_A_BOSS_API_KEY`
3. Configure service: "Seller Consultation" (30 min)
4. Booking links auto-generated in Seller Messages

---

## 🗂️ Custom Fields Setup

CompanyHub must have these **18+ custom fields** to capture Quantum Analyzer intelligence:

### **Property Valuation Fields**

| Field Name | Type | Description | Quantum Source |
|------------|------|-------------|----------------|
| `quantum_property_id` | Text | Unique property ID | Master Database: Property ID |
| `asking_price` | Currency | Seller asking price | Master Database: Asking Price |
| `estimated_arv` | Currency | After Repair Value | Master Database: Estimated ARV |
| `estimated_repairs` | Currency | Repair cost estimate | Master Database: Estimated Repairs |
| `mao_wholesale` | Currency | Max Allowable Offer (wholesale) | Master Database: MAO - Wholesale |
| `mao_sub2` | Currency | MAO for Sub2 | Master Database: MAO - Sub2 |
| `mao_wrap` | Currency | MAO for Wraparound | Master Database: MAO - Wraparound |
| `mao_rental` | Currency | MAO for Rental | Master Database: MAO - Rental |
| `recommended_mao` | Currency | AI-recommended MAO | Master Database: Recommended MAO |

### **Scoring & Analytics Fields**

| Field Name | Type | Description | Quantum Source |
|------------|------|-------------|----------------|
| `equity_percent` | Number | Equity percentage | Master Database: Equity % |
| `market_volume_score` | Number (1-10) | Market activity score | Master Database: Market Volume Score |
| `sales_velocity_score` | Number (1-10) | How fast market moves | Master Database: Sales Velocity Score |
| `exit_risk_score` | Number (1-10) | Risk of not exiting | Master Database: Exit Risk Score |
| `overall_deal_score` | Number (1-100) | Composite deal score | Master Database: Overall Deal Score |

### **Deal Classification Fields**

| Field Name | Type | Description | Values |
|------------|------|-------------|--------|
| `deal_classifier` | Dropdown | AI deal classification | 🔥 HOT DEAL, 🧱 PORTFOLIO FOUNDATION, ✅ SOLID DEAL, ❌ PASS |
| `flip_strategy_recommendation` | Dropdown | Best strategy | Assignment, Sub2, Wrap, Rental, JV, Virtual, Fix-Flip |

### **Seller Psychology Fields** (⚡ Strategic Edge)

| Field Name | Type | Description | Quantum Source |
|------------|------|-------------|----------------|
| `seller_motivation_score` | Number (1-10) | How motivated | Master Database: Seller Motivation Score |
| `seller_urgency` | Dropdown | Urgency level | Low, Medium, High, URGENT |
| `hot_seller` | Checkbox | Behavioral hot signals | Master Database: Hot Seller? |
| `seller_situation` | Dropdown | Life event | Divorce, Probate, Job Loss, Inherited, Downsizing, Financial Distress |
| `psychology_profile` | Dropdown | Seller type | Analytical, Emotional, Driver, Amiable |
| `seller_message` | Long Text | Psychology-optimized message | Master Database: Seller Message |
| `follow_up_strategy` | Long Text | AI follow-up cadence | Master Database: Follow-up Strategy |

### **Market Intelligence Fields**

| Field Name | Type | Description | Quantum Source |
|------------|------|-------------|----------------|
| `location_heat` | Number (1-10) | ZIP code hotness | Master Database: Location Heat |
| `market_trend` | Dropdown | Market direction | Rising, Stable, Declining |
| `neighborhood_grade` | Dropdown | Area quality | A, B, C, D |

### **AI Analysis Fields**

| Field Name | Type | Description | Quantum Source |
|------------|------|-------------|----------------|
| `ai_notes` | Long Text | Human-readable insights | Master Database: AI Notes |
| `ai_confidence` | Number (1-100) | AI confidence level | Master Database: AI Confidence |
| `risk_warnings` | Long Text | Red flags | Master Database: Risk Warnings |
| `opportunity_notes` | Long Text | Upsides | Master Database: Opportunity Notes |
| `last_ai_analysis_date` | Date | Last AI run | Master Database: Last AI Analysis Date |

### **CRM Integration Fields**

| Field Name | Type | Description | Notes |
|------------|------|-------------|-------|
| `smsit_contact_id` | Text | SMS-iT CRM ID | For message tracking |
| `ohmylead_lead_id` | Text | Ohmylead lead ID | For source tracking |
| `signwell_document_id` | Text | SignWell contract ID | For signature status |

**To Create Custom Fields in CompanyHub**:
1. Go to Settings → Custom Fields
2. Select "Deals" entity
3. Click "Add Custom Field"
4. Create each field above with exact names (use underscores, not spaces)
5. Set field types as specified
6. For dropdowns, add exact values listed

---

## 🔄 Pipeline Configuration

### **Stage Mapping: Quantum Analyzer → CompanyHub**

#### **Wholesaling Pipeline**

| Quantum Stage | CompanyHub Stage | Automation Actions |
|---------------|------------------|-------------------|
| New | lead | Auto-analyze (AI Engine) |
| Analyzing | analyzing | Run deal scoring |
| Contacted | contact_made | Log in Sellers CRM |
| Offer Made | offer_pending | Create Offers & Disposition record |
| Under Contract | under_contract | Send to SignWell |
| Marketed | disposition_active | Match buyers, send emails |
| Assigned | assignment_signed | Sync to SMS-iT (buyer campaign) |
| Closed | won | Calculate profit, update financials |
| Dead | lost | Archive, log reason |

#### **Sub2 Pipeline**

| Quantum Stage | CompanyHub Stage | Automation Actions |
|---------------|------------------|-------------------|
| New | lead | Auto-analyze |
| Analyzing | analyzing | Calculate Sub2 cash flow |
| Contacted | contact_made | Psychology profiling |
| Terms Negotiation | terms_discussion | Generate wrap scenarios |
| Due Diligence | due_diligence | Title check, mortgage verification |
| Under Contract | under_contract | Send Sub2 agreement to SignWell |
| Closed | won | Setup payment tracking |

#### **Wraparound Pipeline**

| Quantum Stage | CompanyHub Stage | Automation Actions |
|---------------|------------------|-------------------|
| New | lead | Auto-analyze |
| Analyzing | analyzing | Calculate interest rate spread |
| Contacted | contact_made | Assess seller's existing loan |
| Wrap Structuring | structuring | Generate wrap terms (AI) |
| Legal Review | legal_review | Attorney review trigger |
| Under Contract | under_contract | Send wrap agreement to SignWell |
| Closed | won | Setup wrap note tracking |

#### **JV / Partnership Pipeline**

| Quantum Stage | CompanyHub Stage |
|---------------|------------------|
| New | lead |
| Analyzing | analyzing |
| Partner Sourcing | partner_search |
| Deal Structuring | structuring |
| Joint Contract | under_contract |
| Project Management | execution |
| Exit | closed |

#### **Rental (STR/MTR/LTR) Pipeline**

| Quantum Stage | CompanyHub Stage |
|---------------|------------------|
| New | lead |
| Analyzing | analyzing |
| Financing | financing |
| Purchase | under_contract |
| Renovation | rehab |
| Tenant Placement | leasing |
| Management | portfolio |

#### **Virtual Wholesaling Pipeline**

| Quantum Stage | CompanyHub Stage |
|---------------|------------------|
| New | lead |
| Remote Analysis | analyzing |
| Virtual Contact | contact_made |
| Virtual Contract | under_contract |
| Remote Disposition | marketing |
| Closed | won |

**To Configure Pipelines in CompanyHub**:
1. Go to Settings → Pipelines
2. Create 7 pipelines (one per deal type)
3. Add stages as listed above
4. Set probability percentages for forecasting
5. Enable automation triggers for stage transitions

---

## 🧠 Quantum Layer Integration

The **Quantum Layer** is the AI intelligence that powers psychological negotiations and deal analysis.

### **Quantum Layer Components**

#### **1. Deal Analysis & Verdicts**
- **Function**: `analyzeProperty(propertyId)`
- **Runs**: Automatically on new leads (if `AUTO_ANALYSIS_ENABLED = TRUE`)
- **Output**: Deal score, classifier, MAO calculations, AI notes
- **CompanyHub Sync**: Auto-pushes to custom fields

#### **2. Seller Psychology Profiling**
- **Function**: `profileSellerPsychology(property)`
- **Profiles**:
  - **Analytical**: Numbers-focused, wants data
  - **Emotional**: Life event stress, needs empathy
  - **Driver**: Wants fast results, no-nonsense
  - **Amiable**: Relationship-focused, needs trust
- **CompanyHub Field**: `psychology_profile`
- **Usage**: AI-generated seller messages tailored to profile

#### **3. HOT DEAL Detection**
- **Function**: `detectHotSeller(property)`
- **Triggers**:
  - Equity ≥ 30% + Motivation ≥ 8
  - Days on market > 120
  - Seller situation = Divorce/Probate/Foreclosure
  - Response time < 2 hours
- **CompanyHub Field**: `hot_seller` (checkbox)
- **Automation**: Auto-alerts via email/SMS, flags in Verdict Sheet

#### **4. Behavior Analysis**
- **Signals Tracked**:
  - Response time (hours)
  - Price reductions
  - Listing duration
  - Communication style
- **CompanyHub Field**: `seller_urgency`
- **Usage**: Prioritize contact sequence

#### **5. Strategy Selection**
- **Function**: `recommendStrategy(property)`
- **Evaluates**: All 7 strategies with scores
- **CompanyHub Field**: `flip_strategy_recommendation`
- **Output**: Primary + Secondary strategy with reasoning

#### **6. Risk Assessment**
- **Function**: `identifyRiskWarnings(property)`
- **Red Flags**:
  - Low equity (< 10%)
  - High exit risk
  - Extensive repairs (> $100K)
  - Slow market (velocity score < 4)
- **CompanyHub Field**: `risk_warnings`

### **Enabling Quantum Layer in CompanyHub**

1. **Verify Custom Fields**: Ensure all fields created (see Custom Fields Setup)
2. **Enable Auto-Analysis**: Settings sheet → `AUTO_ANALYSIS_ENABLED` = TRUE
3. **Enable HOT DEAL Alerts**: Settings sheet → `AUTO_HOT_DEAL_ALERTS` = TRUE
4. **Configure Thresholds**:
   - `HOT_DEAL_EQUITY_THRESHOLD` = 30 (%)
   - `HOT_DEAL_MOTIVATION_THRESHOLD` = 8 (1-10)
   - `SOLID_DEAL_EQUITY_THRESHOLD` = 20 (%)
5. **Test**: Add a test lead to Import Hub, watch it flow through AI analysis

---

## 🤝 Buyers Matching Engine

The **Buyers Matching Engine** intelligently matches properties to buyers based on 4 criteria:

### **Matching Criteria**

1. **ZIP Code Match** (25% weight)
   - Perfect match: Buyer's preferred ZIPs include property ZIP (10/10)
   - Nearby: Same 3-digit ZIP prefix (7/10)
   - No match: (3/10)

2. **Strategy Match** (30% weight)
   - Perfect: Buyer's preferred strategy = Property's recommended strategy (10/10)
   - Compatible: Related strategies (e.g., Wholesale ↔ Fix-Flip) (7/10)
   - Mismatch: (4/10)

3. **Price Band Match** (20% weight)
   - Sweet spot: 40-70% of buyer's max budget (10/10)
   - Within range: Inside buyer's min-max (6-8/10)
   - Outside with tolerance: Within 15% (5/10)

4. **Exit Speed Match** (15% weight)
   - Perfect: Buyer's exit preference = Property's market velocity (10/10)
   - Adjacent: (e.g., Medium ↔ Quick Flip) (7/10)
   - Mismatch: (4/10)

5. **Buyer History Bonus** (10% weight)
   - Experience: 10+ deals closed (+3)
   - Speed: Avg close time ≤ 30 days (+2)
   - Reliability score (1-10)

### **Match Quality Tiers**

| Total Score | Match Quality | Recommendation | CompanyHub Action |
|-------------|---------------|----------------|-------------------|
| 90-100 | PERFECT | SEND IMMEDIATELY | Auto-email + SMS |
| 75-89 | STRONG | Send | Email to buyer |
| 60-74 | GOOD | Monitor | Add to watch list |
| < 60 | WEAK | Don't Send | Skip |

### **Setup in CompanyHub**

1. **Buyers Database Sheet**: Populate with:
   - Buyer name, contact info
   - `Preferred ZIPs` (comma-separated, e.g., "30309,30314,30318")
   - `Preferred Strategy` (e.g., "Wholesaling")
   - `Min Price` / `Max Price` (e.g., $50,000 / $200,000)
   - `Exit Speed Preference` (Quick Flip, Medium, Long Hold)
   - `Deals Completed` (integer)
   - `Avg Close Time` (days)
   - `Reliability Score` (1-10)
   - `Active?` = Yes

2. **Run Matching**:
   - Menu → Buyers & Sellers → Match Buyers to Deals
   - Or auto-run via daily scheduler

3. **Review Matches**: Check Buyers Matching Engine sheet for results

4. **Send to Buyers**:
   - Manual: Click "Send" in Buyers Matching sheet
   - Auto: Enable `AUTO_SEND_MATCHED_DEALS = TRUE` (coming soon)

5. **Track in CompanyHub**:
   - Sync match results to CompanyHub
   - Create "Deal Match" activity
   - Log buyer response

---

## 📊 CRM Sync Log

The **CRM Sync Log** tracks all integration activity across CompanyHub, SMS-iT, Ohmylead.

### **What's Logged**

| Event | System | Action | Details |
|-------|--------|--------|---------|
| Import leads | Browse.AI | Push | Records imported count |
| Analyze property | Quantum AI | Analysis | Property ID, score, classifier |
| Sync to CRM | CompanyHub | Create Deal | Deal ID, stage |
| Send SMS | SMS-iT | Send SMS | Contact ID, message sent |
| Send contract | SignWell | Create Document | Document ID, signers |
| Webhook received | Browse.AI | Webhook | Payload summary |
| Hourly sync | System | Auto Sync | Records affected |

### **Log Columns**

- Timestamp
- CRM System (CompanyHub, SMS-iT, Ohmylead, Browse.AI, SignWell)
- Action (Push, Pull, Update, Delete, Send, Webhook)
- Status (Success, Failed, Partial)
- Records Affected (count)
- Details (error message or success info)
- Property ID (if applicable)
- Triggered By (Auto, Manual, User Name)
- Duration (seconds)
- API Response Code

### **View Log**

- **Sheet**: CRM Sync Log
- **Filter**: By date, system, status
- **Alerts**: Failed syncs trigger admin email

---

## 📥 Import Hub & Webhooks

The **Import Hub** is the staging area for all incoming leads before AI analysis.

### **Lead Sources**

1. **Browse.AI** (automated scraping)
2. **Ohmylead** (web forms)
3. **Manual entry** (CSV import or direct input)
4. **Zapier** (if integrated)

### **Import Hub Workflow**

```
Browse.AI scrapes lead
    ↓
Webhook hits Google Apps Script (optional)
    ↓
Lead added to Import Hub sheet
    ↓
Auto-validation (address, price, required fields)
    ↓
If valid: Move to Master Database
    ↓
AI analyzes property (auto or manual)
    ↓
Results populate Master Database
    ↓
Syncs to CompanyHub, SMS-iT, Ohmylead
```

### **Setting Up Browse.AI Webhooks**

1. **Deploy Web App**:
   - In Google Apps Script, click: Deploy → New Deployment
   - Type: Web app
   - Execute as: Me
   - Access: Anyone
   - Copy web app URL

2. **Configure Browse.AI Webhook**:
   - Go to Browse.AI robot settings
   - Enable "Webhook notifications"
   - Paste web app URL
   - Event: "Task completed successfully"
   - Save

3. **Test Webhook**:
   - Run Browse.AI robot manually
   - Check Import Hub for new lead
   - Check CRM Sync Log for webhook event

### **Manual Import**

- **CSV Upload**: File → Import → Choose CSV with columns: Address, City, State, ZIP, Price, Beds, Baths, Sqft
- **Direct Entry**: Add row to Import Hub sheet manually

---

## ⚔️ Strategic Edge Features

The **Strategic Edge** is your psychological warfare layer built into CompanyHub.

### **1. Psychological Warfare in Messaging**

Every seller message is **AI-optimized** based on psychology profile:

- **Analytical Sellers**: Data-heavy, numbers-focused
  > "I've analyzed your property at [address] and believe there may be a mutually beneficial opportunity. I'd like to schedule a call to discuss the numbers."

- **Emotional Sellers**: Empathetic, solution-focused
  > "I understand selling [address] is likely an emotional decision. I specialize in helping homeowners in your situation find stress-free solutions."

- **Driver Sellers**: Fast, results-oriented
  > "I'm interested in [address] and can move quickly if the numbers work. Are you available for a quick call this week?"

- **Amiable Sellers**: Relationship-building
  > "Thank you for considering working with me on [address]. I'd love to get to know you and understand what you're hoping to accomplish."

**CompanyHub Integration**:
- Field: `seller_message` (auto-populated by AI)
- Use: Copy/paste into SMS-iT campaigns or emails
- Update: Re-run AI analysis if seller profile changes

### **2. Deal Timing Optimization**

The system calculates **optimal contact times** based on urgency:

| Seller Type | Response Time | Follow-up Cadence |
|-------------|---------------|-------------------|
| 🔥 Hot Seller | Within 2 hours | Daily for 3 days, then every 3 days |
| High Motivation (7-8) | Within 24 hours | Every 3 days for 2 weeks, then weekly |
| Medium Motivation (5-6) | Within 48 hours | Weekly for 4 weeks, then bi-weekly |
| Low Motivation (1-4) | Within 1 week | Bi-weekly, long-term nurture |

**CompanyHub Integration**:
- Field: `follow_up_strategy` (AI-generated)
- Task: Auto-create CompanyHub tasks for follow-ups
- Alert: Email/SMS reminders on follow-up due dates

### **3. ZIP Heat Awareness**

Track which ZIP codes are **hot markets** for competitive advantage:

- **Market Intelligence Sheet**: Tracks per-ZIP metrics
  - Median home price
  - Days on market (avg)
  - Sales volume
  - Market heat score (1-10)
  - Best strategy (by ZIP)

**CompanyHub Integration**:
- Field: `location_heat` (1-10)
- Usage: Prioritize hot ZIP codes, adjust pricing strategy
- Dashboard: Show "Hottest ZIPs This Month"

### **4. Buyer Demand Weighting**

Not all deals are equal — prioritize what **buyers actually want**:

- **Buyers Database**: Track buyer preferences
- **Matching Engine**: Scores each deal against buyer demand
- **Strategy**: Focus acquisition on:
  - High-demand ZIPs
  - Buyer-preferred price bands
  - Fast-moving strategies

**CompanyHub Integration**:
- Field: `buyer_demand_score` (future enhancement)
- Usage: Filter Verdict Sheet by "Most Wanted by Buyers"

### **5. Market Dominance Mindset**

Built to scale **nationally** for virtual wholesaling:

- **Virtual Wholesaling Pipeline**: Remote deal flow
- **Market Intelligence**: Multi-market tracking
- **Remote Tools**: All integrations work remotely (SMS, e-signatures)
- **Buyer Network**: National buyer database with market preferences

**CompanyHub Integration**:
- Pipeline: `virtual_pipeline`
- Fields: `market_name`, `local_partner`, `remote_status`

---

## ⚙️ Automation Setup

### **Automation Features**

1. **Auto-Analyze New Leads**
   - Trigger: New row added to Import Hub
   - Action: Run AI analysis, populate Master Database
   - Toggle: Menu → Automation → Enable Auto-Analysis

2. **Auto-Flag HOT DEALS**
   - Trigger: Deal score ≥ 70 AND equity ≥ 30%
   - Action: Email + SMS alert to admin
   - Toggle: Menu → Automation → Enable Auto-HOT DEAL Alerts

3. **Auto-Send SMS** (Optional)
   - Trigger: HOT DEAL detected OR Follow-up due
   - Action: Send SMS via SMS-iT using psychology-optimized message
   - Toggle: Menu → Automation → Enable Auto-SMS

4. **Auto-Sync to CRMs**
   - Trigger: Deal status change OR New SOLID DEAL
   - Action: Sync to CompanyHub, SMS-iT, Ohmylead
   - Toggle: Settings → `AUTO_CRM_SYNC` = TRUE

5. **Daily Scheduler** (8 AM)
   - Analyze pending properties
   - Send HOT DEAL alerts
   - Match buyers to deals
   - Send follow-up reminders
   - Update market intelligence

6. **Hourly Scheduler**
   - Import Ohmylead leads
   - Check SignWell document statuses
   - Sync CRMs

### **Enable Automation**

1. Run: Menu → Setup → Initialize System (creates triggers)
2. Verify: Menu → Run Diagnostics (shows trigger count)
3. Configure: Settings sheet (set thresholds, enable flags)
4. Test: Add test lead, watch automation flow

---

## ✅ Best Practices

### **Daily Operations**

- [ ] Check **Verdict Sheet** for new HOT DEALS (9 AM)
- [ ] Review **CRM Sync Log** for errors (9:15 AM)
- [ ] Update deal statuses in **Master Database** (real-time)
- [ ] Respond to **matched buyers** in Buyers Matching sheet (throughout day)
- [ ] Log all seller communications in **Sellers CRM** (immediately)

### **Weekly Reviews**

- [ ] Run **Market Intelligence** update (Monday 8 AM)
- [ ] Review **Buyers Matching** results (Monday 10 AM)
- [ ] Analyze **pipeline velocity** (days in each stage)
- [ ] Update **buyer preferences** based on new market data
- [ ] Refine **AI thresholds** if needed (Settings sheet)

### **Monthly Procedures**

- [ ] Audit **custom field sync** (CompanyHub ↔ Quantum)
- [ ] Review **deal classifiers** accuracy (adjust thresholds)
- [ ] Clean **inactive buyers** from database
- [ ] Update **seller psychology profiles** based on outcomes
- [ ] Generate **financial reports** (profit by strategy)

### **Security**

- [ ] **API Keys**: Store in Settings sheet, never share
- [ ] **Webhook URLs**: Use Apps Script built-in auth, don't expose publicly
- [ ] **Backups**: Weekly export of Master Database
- [ ] **Access Control**: Restrict CompanyHub API key to specific IPs (if possible)

---

## 📚 Additional Resources

- **Quantum Analyzer User Guide**: Run Menu → User Guide
- **API Documentation**:
  - Browse.AI: https://docs.browse.ai
  - SMS-iT: https://api-docs.sms-it.com
  - CompanyHub: https://docs.companyhub.com/api
  - Ohmylead: https://docs.ohmylead.com
  - SignWell: https://www.signwell.com/api/docs
- **Support**: Check CRM Sync Log for detailed error messages
- **Community**: (Future) Quantum Analyzer user forum

---

## 🎯 Summary Checklist

Before going live, verify:

- [ ] All 7 pipelines created in CompanyHub
- [ ] All 18+ custom fields added to CompanyHub Deals
- [ ] Browse.AI API key configured (Settings sheet)
- [ ] SMS-iT API key + workspace ID configured
- [ ] CompanyHub API key configured
- [ ] Ohmylead API key configured
- [ ] SignWell API key + templates configured
- [ ] Automation toggles enabled (AUTO_ANALYSIS, AUTO_CRM_SYNC)
- [ ] Daily + Hourly triggers active (check via Diagnostics)
- [ ] Test lead processed successfully (Import Hub → Master DB → CompanyHub)
- [ ] Buyers database populated with at least 5 buyers
- [ ] Admin email + phone configured for alerts

---

**Version**: 2.0
**Last Updated**: January 2026
**Quantum Real Estate Analyzer** — Where AI meets psychology for wholesale domination.
