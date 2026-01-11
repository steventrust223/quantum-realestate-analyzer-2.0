# 🔮 Quantum Real Estate Analyzer v2.0

**The most advanced, AI-powered real estate wholesaling system built on Google Sheets + Apps Script**

---

## 🎯 Overview

The Quantum Real Estate Analyzer is a hyper-advanced, beginner-friendly system designed for **real estate wholesalers** who want to dominate their markets using **AI-driven decision-making**, **psychological negotiation tactics**, and **extreme automation**.

### **Philosophy**

- ✨ **AI-driven decisions** — Let artificial intelligence analyze deals, score properties, and recommend strategies
- 🧠 **Psychological advantage** — Auto-generated seller messages tailored to personality types
- ⚡ **Automation over manual work** — Auto-import leads, auto-analyze, auto-match buyers, auto-sync CRMs
- 🎨 **Visual clarity + motivation** — Color-coded sheets, dashboards, and clean UX

---

## 🏗️ Deal Types Supported

Unlike basic wholesaling tools, the Quantum Analyzer handles **7 different deal strategies**:

1. **Wholesaling (Assignment)** — Classic wholesaling with assignment fees
2. **Sub-To (Subject-To)** — Take over existing mortgages, cash flow from day one
3. **Wraparounds** — Owner financing with interest rate spreads
4. **JV / Partnerships** — Joint ventures for bigger deals
5. **STR / MTR / LTR** — Short-term, medium-term, and long-term rentals
6. **Fix & Flip** — Buy, renovate, sell for profit
7. **Virtual Wholesaling** — Remote wholesaling in any market nationwide

---

## ✨ Key Features

### **🤖 AI & Quantum Layer**

- **Deal Analysis & Verdicts**: Auto-analyze properties, calculate deal scores (1-100)
- **Seller Psychology Profiling**: Classify sellers as Analytical, Emotional, Driver, or Amiable
- **HOT DEAL Detection**: Auto-flag 🔥 HOT DEALS based on equity, motivation, and behavioral signals
- **Strategy Recommendations**: AI evaluates all 7 strategies and recommends the best fit
- **MAO Calculations**: Dynamic Max Allowable Offer for every strategy
- **Risk Assessment**: Identify red flags automatically (low equity, high repairs, slow markets)
- **Psychologically-Optimized Messaging**: Generate seller messages tailored to their personality

### **🔌 Integrations**

- **Browse.AI** — Scrape leads from Facebook, Zillow, PropStream, Craigslist
- **SMS-iT CRM** — Automated SMS campaigns, negotiation bots, seller psychology tracking
- **CompanyHub CRM** — Visual pipeline management, deal tracking across 7 pipelines
- **Ohmylead** — Capture leads from landing pages, Facebook ads, Google ads
- **SignWell** — Send contracts for e-signature (purchase agreements, assignments, Sub2 docs)
- **Book Like A Boss** — Auto-schedule seller consultations

### **🤝 Buyers Matching Engine**

Intelligently match properties to buyers using:
- **ZIP Code Match** (25% weight) — Preferred locations
- **Strategy Match** (30% weight) — Investment strategy alignment
- **Price Band Match** (20% weight) — Budget fit
- **Exit Speed Match** (15% weight) — Quick flip, medium, or long hold
- **Buyer History** (10% weight) — Experience, reliability, close speed

**Match Quality Tiers**: PERFECT (90-100), STRONG (75-89), GOOD (60-74), WEAK (<60)

### **⚡ Automation**

- **Auto-Analyze**: New leads automatically analyzed on import
- **Auto-Flag HOT DEALS**: Email + SMS alerts for exceptional opportunities
- **Auto-SMS**: Optional automated SMS via SMS-iT
- **Auto-Sync to CRMs**: Status changes trigger multi-CRM updates
- **Daily Scheduler**: Analyze pending deals, match buyers, send reminders
- **Hourly Scheduler**: Import leads, check contracts, sync CRMs

### **⚔️ Strategic Edge**

- **Psychological Warfare**: Messaging engineered for maximum seller compliance
- **Deal Timing Optimization**: Contact at optimal moments based on urgency signals
- **ZIP Heat Awareness**: Track and prioritize hot markets
- **Buyer Demand Weighting**: Focus acquisition on what buyers actually want
- **Market Dominance**: Built to scale nationally for virtual wholesaling

---

## 📊 System Architecture

### **18 Sheets**

1. **📥 Import Hub** — Staging area for Browse.AI, Ohmylead, manual imports
2. **🗄️ Master Database** — Cleaned, normalized property data with AI analysis
3. **⚡ Verdict Sheet** — Ranked deals, AI verdicts, action buttons
4. **📊 Lead Scoring & Risk** — Equity, motivation, behavior, location heat scoring
5. **🎯 Flip Strategy Engine** — Evaluates all 7 strategies with detailed scoring
6. **💰 Offers & Disposition** — Track offers, counters, contracts, assignments
7. **🤝 Buyers Matching Engine** — Auto-matched buyers with quality scores
8. **🔄 CRM Sync Log** — All integration activity tracked
9. **📈 Dashboard & Analytics** — Real-time KPIs and metrics
10. **⚙️ Settings & Controls** — Feature flags, thresholds, API keys
11. **👥 Sellers CRM** — Seller contact management
12. **🏠 Buyers Database** — Buyer preferences, history, reliability
13. **📣 Marketing Leads** — Lead source tracking
14. **🔥 Deal Pipelines** — Stage-by-stage deal tracking
15. **💵 Financial Tracking** — Revenue, expenses, profit margins
16. **👨‍💼 Team Management** — User roles, permissions, performance
17. **📄 Documents & Templates** — Contract storage and management
18. **🌍 Market Intelligence** — ZIP-level market data

### **8 Apps Script Files** (5,900+ lines)

- **Code.gs** — Main system, menu, initialization (690 lines)
- **DataModels.gs** — Column definitions for all 18 sheets (750 lines)
- **AIEngine.gs** — Quantum Layer: analysis, psychology, HOT DEAL detection (620 lines)
- **Integrations.gs** — External integrations: Browse.AI, SMS-iT, CompanyHub, etc. (570 lines)
- **BuyersMatching.gs** — Intelligent buyer matching engine (430 lines)
- **AutomationEngine.gs** — Triggers, schedulers, auto-analysis (520 lines)
- **UIHelpers.gs** — Formatting, exports, dashboards, conditional formatting (450 lines)
- **appsscript.json** — Manifest with OAuth scopes

---

## 🚀 Quick Start

### **Prerequisites**

1. **Google Account** with Google Sheets access
2. **API Keys** (optional but recommended):
   - Browse.AI account (browse.ai)
   - SMS-iT CRM account (sms-it.com)
   - CompanyHub CRM account (companyhub.com)
   - Ohmylead account (ohmylead.com)
   - SignWell account (signwell.com)

### **Installation**

1. **Create a new Google Sheet**
2. **Open Apps Script**: Extensions → Apps Script
3. **Copy all .gs files** from this repository into the script editor:
   - Code.gs
   - DataModels.gs
   - AIEngine.gs
   - Integrations.gs
   - BuyersMatching.gs
   - AutomationEngine.gs
   - UIHelpers.gs
4. **Replace `appsscript.json`** with the provided manifest
5. **Save the project** (Ctrl+S / Cmd+S)
6. **Reload the spreadsheet**
7. **Run**: 🔮 Quantum Analyzer menu → Setup → Initialize System
8. **Configure**: Add API keys to Settings sheet
9. **Test**: Import a sample lead

---

## 📖 Documentation

- **[COMPANYHUB_SETUP.md](./COMPANYHUB_SETUP.md)** — Complete CompanyHub CRM configuration guide (825 lines)
  - All 7 deal type pipelines
  - Correct integrations setup
  - 18+ custom fields configuration
  - Quantum Layer integration
  - Buyers Matching Engine setup
  - Strategic Edge features

- **control-center.html** — Dashboard UI mockup (can be customized)

---

## 🎓 How to Use

### **1. Import Leads**

**Option A: Browse.AI** (Automated)
- Configure Browse.AI robot to scrape Facebook Marketplace, Zillow, PropStream
- Run: Menu → Integrations → Import Browse.AI Leads

**Option B: Ohmylead** (Web Forms)
- Connect Ohmylead landing pages
- Leads auto-import hourly

**Option C: Manual Entry**
- Add leads directly to Import Hub sheet
- Or import CSV: File → Import

### **2. AI Analysis**

Leads are **automatically analyzed** (if `AUTO_ANALYSIS_ENABLED = TRUE`):
- ARV estimation
- Repair cost calculation
- MAO for all 7 strategies
- Deal scoring (1-100)
- Deal classification (🔥 HOT DEAL, 🧱 PORTFOLIO, ✅ SOLID, ❌ PASS)
- Seller psychology profiling
- AI-generated insights & seller messages

View results in **Master Database** or **Verdict Sheet**.

### **3. Contact Sellers**

- Check **Verdict Sheet** for ranked deals
- Review AI-generated **Seller Message** (psychology-optimized)
- Copy message to SMS-iT CRM or email
- Log communication in Sellers CRM

### **4. Match Buyers**

- Run: Menu → Buyers & Sellers → Match Buyers to Deals
- Check **Buyers Matching Engine** sheet for results
- Send deals to PERFECT and STRONG matches
- Track buyer responses

### **5. Make Offers & Close**

- Create offer in **Offers & Disposition** sheet
- Send contract via: Menu → Integrations → Send to SignWell
- Track contract status (pending, signed, completed)
- Update deal status to "Closed" when funded

### **6. Monitor Dashboard**

- **Dashboard & Analytics** sheet shows real-time metrics:
  - Active Leads
  - 🔥 HOT DEALS Found
  - Total Pipeline Value
  - Active Buyers
  - Deal Velocity
  - Market Heat

---

## ⚙️ Settings & Customization

### **Key Settings** (Settings sheet)

| Setting | Default | Description |
|---------|---------|-------------|
| `AUTO_ANALYSIS_ENABLED` | TRUE | Auto-analyze new leads |
| `AUTO_HOT_DEAL_ALERTS` | TRUE | Send email/SMS for HOT DEALS |
| `AUTO_CRM_SYNC` | TRUE | Auto-sync to CompanyHub/SMS-iT |
| `HOT_DEAL_EQUITY_THRESHOLD` | 30 | Minimum equity % for HOT DEAL |
| `HOT_DEAL_MOTIVATION_THRESHOLD` | 8 | Minimum motivation (1-10) |
| `WHOLESALE_MAO_MULTIPLIER` | 0.70 | ARV * 70% - Repairs - Fee |
| `MATCH_SCORE_THRESHOLD` | 70 | Minimum buyer match score |

### **API Keys** (Settings sheet)

Add your API keys to enable integrations:
- `BROWSE_AI_API_KEY`
- `BROWSE_AI_ROBOT_ID`
- `SMSIT_API_KEY`
- `SMSIT_WORKSPACE_ID`
- `COMPANYHUB_API_KEY`
- `OHMYLEAD_API_KEY`
- `SIGNWELL_API_KEY`
- `BOOK_LIKE_A_BOSS_API_KEY`

---

## 🔥 Best Practices

### **Daily Operations**

- [ ] Check **Verdict Sheet** for HOT DEALS (9 AM)
- [ ] Review **CRM Sync Log** for errors (9:15 AM)
- [ ] Update deal statuses in **Master Database** (real-time)
- [ ] Respond to **matched buyers** in Buyers Matching sheet
- [ ] Log seller communications in Sellers CRM

### **Weekly Reviews**

- [ ] Run **Market Intelligence** update (Monday 8 AM)
- [ ] Review **Buyers Matching** results (Monday 10 AM)
- [ ] Analyze pipeline velocity (days in each stage)
- [ ] Update buyer preferences based on new market data
- [ ] Refine AI thresholds if needed (Settings sheet)

### **Monthly Procedures**

- [ ] Audit custom field sync (CompanyHub ↔ Quantum)
- [ ] Review deal classifier accuracy (adjust thresholds)
- [ ] Clean inactive buyers from database
- [ ] Update seller psychology profiles based on outcomes
- [ ] Generate financial reports (profit by strategy)

---

## 🛡️ Security

- **API Keys**: Stored in Settings sheet, never commit to public repos
- **Sheet Protection**: Critical sheets are protected (run Menu → Setup → Protect System Sheets)
- **Backups**: Weekly manual export recommended (File → Download → Excel)
- **Access Control**: Limit sheet sharing to team members only

---

## 📊 Performance

- **Sheets**: 18 interconnected sheets
- **Data Fields**: 75+ unique fields
- **Code Lines**: 5,900+ lines across 8 files
- **AI Functions**: 20+ analysis algorithms
- **Integrations**: 6 external tools
- **Automation**: 6 auto-triggers (daily, hourly, on-edit)
- **Capacity**: Handles 1,000+ properties efficiently

---

## 🚧 Roadmap

### **Phase 3** (Future Enhancements)

- [ ] HTML dialogs for property analysis, setup wizards
- [ ] Interactive market heat maps with ZIP overlays
- [ ] Auto-generated PDF reports with charts
- [ ] Zapier integration for additional lead sources
- [ ] Mobile app companion (view-only)
- [ ] Machine learning for improved deal scoring
- [ ] Multi-user collaboration features
- [ ] Custom dashboard widgets

---

## 🤝 Support

- **Issues**: Report bugs or feature requests on GitHub Issues
- **Documentation**: See COMPANYHUB_SETUP.md for detailed setup
- **Questions**: Check documentation first, then open an issue

---

## 📄 License

Proprietary — For authorized users only.

---

## 🎯 Summary

The Quantum Real Estate Analyzer is **not just a spreadsheet** — it's a complete **operating system** for wholesale real estate investing. With AI analysis, psychology profiling, multi-strategy support, intelligent buyer matching, and extreme automation, you'll close more deals faster than ever.

**Built for wholesalers who want to dominate their markets.**

---

**Version**: 2.0
**Last Updated**: January 2026
**Repository**: https://github.com/steventrust223/quantum-realestate-analyzer-2.0

🔮 **Where AI meets psychology for wholesale domination.**
