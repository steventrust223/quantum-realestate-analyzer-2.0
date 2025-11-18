# 🏡 Quantum Real Estate Analyzer – Ultimate Edition v2.0

A comprehensive Google Sheets + Apps Script system for real estate investing analysis, focused on wholesaling, Subject-To, wraparound financing, and various exit strategies (STR/MTR/LTR).

## 📋 Overview

This system provides:

- **Multi-source lead management** (web forms, scraped lists, manual entry)
- **Automated MAO calculations** (Maximum Allowable Offer)
- **Deal classification** (HOT/SOLID/PORTFOLIO/PASS)
- **Exit strategy recommendations** (Wholesale, Sub2, Wrap, STR, MTR, LTR)
- **Market velocity & volume scoring**
- **Buyer matching engine**
- **Professional HTML UI** (Control Center, Lead Intake, Deal Review, Settings)
- **Comprehensive analytics dashboard**

## 📁 File Structure

### Apps Script Files (.gs)

| File | Purpose |
|------|---------|
| `RE_config.gs` | Central configuration, constants, sheet names, headers |
| `RE_utils.gs` | Utility functions (logging, ID generation, formatters) |
| `RE_setup.gs` | Sheet creation, formatting, onOpen menu |
| `RE_import.gs` | Lead import & normalization engine |
| `RE_mao.gs` | MAO & repair calculations |
| `RE_analysis.gs` | Risk scoring, deal classification, velocity |
| `RE_exit_strategy.gs` | Exit strategy recommendation engine |
| `RE_buyer_match.gs` | Buyer matching logic |
| `RE_verdict.gs` | Hot deals view builder |
| `RE_dashboard.gs` | Analytics & KPI population |
| `RE_ui.gs` | HTML UI functions & form handlers |

### HTML Files

| File | Purpose |
|------|---------|
| `re_control_center.html` | Main dashboard sidebar |
| `re_lead_intake.html` | Quick lead entry form |
| `re_deal_review.html` | Top deals review panel |
| `re_settings.html` | System settings editor |
| `re_help.html` | Help & documentation |

## 🚀 Installation

### Step 1: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Quantum Real Estate Analyzer"

### Step 2: Add Apps Script Code

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete the default `Code.gs` file
3. For each `.gs` file in this project:
   - Click the **+** button next to "Files"
   - Select "Script"
   - Name it exactly as shown (e.g., `RE_config`, `RE_utils`, etc.)
   - Copy and paste the corresponding code
4. For each `.html` file:
   - Click the **+** button next to "Files"
   - Select "HTML"
   - Name it exactly as shown (e.g., `re_control_center`, `re_lead_intake`, etc.)
   - Copy and paste the corresponding HTML code

### Step 3: Initial Setup

1. **Save** the Apps Script project (Ctrl/Cmd + S)
2. **Refresh** your Google Sheet
3. You should see a new menu: **🏡 Quantum RE Analyzer**
4. Click the menu → **🔧 Setup / Refresh Structure**
5. Authorize the script when prompted
6. Wait for setup to complete

### Step 4: Start Using

1. Add sample buyers (automatically added during setup)
2. Add a test lead via **Lead Intake** or directly to `LEADS_DIRECT` sheet
3. Click **🔄 Run Import → Master Sync**
4. Click **📊 Run Full Analysis (All Deals)**
5. Open **🎛️ Control Center** to see results!

## 📊 Sheet Structure

### 🟠 Import / Raw Leads (Orange tabs)
- **LEADS_WEB** – Web form & ad leads (Facebook, Google, landing pages)
- **LEADS_SCRAPED** – Scraped leads (Browse.AI, lists, etc.)
- **LEADS_DIRECT** – Manually entered leads

### 🔵 Core Analysis (Blue tabs)
- **MASTER_PROPERTIES** – Normalized master table for all properties
- **MAO_ENGINE** – Repair, ARV, MAO, offer logic
- **DEAL_CLASSIFIER** – HOT DEAL / SOLID / PORTFOLIO / PASS classification
- **EXIT_STRATEGY** – Recommended strategy (Wholesale, Sub2, Wrap, STR, MTR, LTR)
- **BUYER_MATCH** – Property-to-buyer matching

### 🟢 Market & Velocity (Green tabs)
- **MARKET_DATA** – ZIP-level stats (DOM, price ranges, volume)
- **SALES_VELOCITY** – Velocity scores & tiers for each property
- **MARKET_VOLUME_SCORE** – Market "heat" scores

### 🟣 Supporting (Purple tabs)
- **LEADS_TRACKER** – Contact attempts, stages, temperature
- **BUYERS_DB** – Cash buyers & terms
- **OFFERS_DISPO** – Offers made, responses, dispositions

### ⚫ System (Grey tabs)
- **SETTINGS** – Thresholds & config
- **SYSTEM_LOG** – Internal event log
- **DASHBOARD_ANALYTICS** – KPIs and summary metrics

## 🎯 Key Features

### 1. MAO Calculation Engine

Calculates Maximum Allowable Offer using:
- ARV (After Repair Value)
- Repair estimates (Light vs Full)
- Holding costs
- Closing costs
- Target profit
- Assignment/wholesale fees

**Formula:**
```
MAO = (ARV × MaxOfferPercent) – Repairs – Holding – Closing – Profit – Fee
```

### 2. Deal Classification

Automatically classifies every deal:
- **🔥 HOT DEAL**: High profit (>$25k), high margin (>15%), acceptable risk (<60)
- **✅ SOLID**: Good profit (>$15k), decent margin (>10%), acceptable risk (<70)
- **💼 PORTFOLIO**: Lower profit but stable (>$8k, >5% margin)
- **❌ PASS**: Doesn't meet criteria

### 3. Exit Strategy Recommendations

Analyzes each property and recommends best strategy:
- **Wholesale**: Fast flip with assignment fee
- **Wholetail**: Light repairs, quick sale
- **Sub2**: Subject-to existing financing (low equity, positive cash flow)
- **Wraparound**: Seller financing structure
- **STR**: Short-term rental (Airbnb)
- **MTR**: Mid-term rental (travel nurses, corporate)
- **LTR**: Long-term rental (traditional)

### 4. Buyer Matching

Matches properties to buyers based on:
- Geographic preferences (ZIP, City)
- Price range
- Strategy preference
- Property type
- Repair tolerance

### 5. Market Velocity Scoring

Scores properties based on:
- Days on Market (DOM)
- Sales volume per month
- Market heat level
- Price point tier
- Velocity tier (A/B/C/D)

## ⚙️ Settings & Configuration

Access via **⚙️ Settings** in the menu. Key settings:

### MAO Settings
- `mao.wholesale.maxOfferPercent` – 70% (Max offer % of ARV)
- `mao.wholesale.targetProfit` – $15,000
- `mao.wholesale.assignmentFee` – $10,000
- `mao.closingCostPercent` – 3%
- `mao.holdingCostsPerMonth` – $1,000

### Classification Thresholds
- `classify.hotDeal.minProfit` – $25,000
- `classify.hotDeal.minMargin` – 15%
- `classify.hotDeal.maxRisk` – 60
- `classify.solid.minProfit` – $15,000
- `classify.solid.minMargin` – 10%

### Exit Strategy
- `exit.wholesale.minEquity` – 20%
- `exit.sub2.minEquity` – 10%
- `exit.str.minCashflow` – $500/mo
- `exit.rentEstimate.multiplier` – 0.008 (Monthly rent = ARV × 0.008)

## 🔧 Customization

### Adding Custom Hazard Flags

Edit `RE_config.gs` → `HAZARD_FLAGS` object:

```javascript
const HAZARD_FLAGS = {
  NO_TITLE: 'No Title',
  LOW_EQUITY: 'Low Equity',
  // Add your custom flags here
  YOUR_FLAG: 'Your Description'
};
```

### Adjusting MAO Formulas

Edit `RE_mao.gs` → `RE_calculateMAOForProperty()` function.

### Integrating CRM/Email

Look for functions marked `STUB` in the code:
- `RE_sendPropertyToBuyer()` in `RE_buyer_match.gs`
- `RE_blastToMatchedBuyers()` in `RE_buyer_match.gs`

Wire these to your CRM (CompanyHub, SMS-iT, etc.) or email system.

## 📈 Workflow

### Daily Workflow

1. **Import new leads** (from web forms, lists, etc.)
2. **Run Import → Master Sync**
3. **Run Full Analysis**
4. **Open Control Center** → Review hot deals
5. **Open Deal Review** → Take action on top deals
6. **Update LEADS_TRACKER** with contact outcomes

### Weekly Workflow

1. **Update MARKET_DATA** with current ZIP stats
2. **Review and update BUYERS_DB**
3. **Run Rebuild Verdict** to refresh hot deals view
4. **Review DASHBOARD_ANALYTICS** for KPIs
5. **Clean up SYSTEM_LOG** (optional)

## 🎨 UI Components

### Control Center (Sidebar)
- Quick metrics (Hot Deals, Solid Deals, Total Properties)
- Quick action buttons
- Action items list
- Recent activity log

### Lead Intake (Modal Dialog)
- Fast lead entry form
- Auto-populates LEADS_DIRECT
- Auto-imports to MASTER_PROPERTIES

### Deal Review Panel (Modal Dialog)
- Shows top 25 deals sorted by profit
- Quick actions: Make Offer, Send to Buyers, Mark Under Contract
- Detailed metrics for each deal

### Settings (Modal Dialog)
- Edit all system settings
- Organized by category
- Live save with validation

## 🔍 Troubleshooting

### Issue: Menu doesn't appear
- **Solution**: Refresh the sheet, or close and reopen

### Issue: Authorization errors
- **Solution**: Go to Extensions → Apps Script → Run any function → Authorize

### Issue: Import not working
- **Solution**: Check SYSTEM_LOG sheet for errors
- Verify leads have required fields (Address, City, State, ZIP)

### Issue: MAO shows $0
- **Solution**: Ensure ARV is populated (run `RE_estimateARVs()`)
- Check that Asking Price exists

### Issue: No hot deals found
- **Solution**: Adjust thresholds in SETTINGS
- Verify properties have been analyzed (run Full Analysis)

## 📝 Future Enhancements

Planned features for future versions:

- [ ] Integration with Zillow/Redfin API for accurate ARV
- [ ] SMS/Email automation via Twilio/SendGrid
- [ ] Document generation (contracts, assignments, LOIs)
- [ ] CRM sync (CompanyHub, Podio, REI BlackBook)
- [ ] Advanced comp analysis
- [ ] Automated marketing to buyers
- [ ] Mobile app companion
- [ ] MLS integration

## 📄 License

This project is provided as-is for educational and commercial use. Customize freely for your business needs.

## 🙏 Acknowledgments

Built for real estate investors who need powerful analysis tools without expensive software subscriptions.

Inspired by the "Quantum" system architecture used in CarHawk and Thrifty Mobile systems.

---

**Version:** 2.0
**Last Updated:** 2025-01-18
**Author:** Your Senior System Architect

For support or questions, check the **📚 Help / Overview** in the menu.
