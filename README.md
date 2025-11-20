# 🏡 Quantum Real Estate Analyzer v2.0

**Ultimate Wholesaling & Sub2 Investment Analysis System**

Enterprise-grade Google Apps Script application for real estate investors who need powerful deal analysis, automated lead management, and intelligent property classification.

---

## 🚀 Features

### 📊 Smart Dashboard & Control Center
- **Real-time metrics** - Track HOT deals, SOLID opportunities, total properties, and contracts
- **Action items** - Automatically identifies properties requiring immediate attention
- **Activity logging** - Comprehensive audit trail of all system operations
- **One-click operations** - Import, analyze, and classify deals with a single click

### 🎯 Intelligent Deal Classification
- **HOT** - Premium deals with excellent spread, profit, and low risk
- **SOLID** - Strong opportunities with good potential
- **MARGINAL** - Borderline deals requiring careful evaluation
- **PASS** - Properties that don't meet investment criteria

### 💰 Advanced Analysis Engine
- **MAO Calculation** - Maximum Allowable Offer based on ARV, repairs, holding costs
- **Profit Projection** - Comprehensive profit analysis including all costs
- **Risk Assessment** - 10-point risk scoring system evaluating multiple factors
- **Deal Scoring** - 0-100 score for easy comparison and ranking

### 🔄 Automated Data Management
- **Multi-source import** - Import from unlimited LEADS_* sheets
- **Duplicate detection** - Prevents duplicate property entries
- **Auto-sync** - Keep MASTER_PROPERTIES and VERDICT in sync
- **Archive management** - Auto-archive old leads

---

## 📁 Project Structure

```
quantum-realestate-analyzer-2.0/
├── appsscript.json           # Apps Script configuration
├── RE_core.gs                # Core utilities, constants, and helpers
├── RE_ui.gs                  # User interface, menu, and dialogs
├── RE_dashboard.gs           # Control Center data aggregation
├── RE_analysis.gs            # Property analysis and MAO calculation
├── RE_sync.gs                # Data import and synchronization
└── re_control_center.html    # Control Center sidebar UI
```

---

## 🛠️ Installation & Setup

### Step 1: Create a New Google Sheets Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new blank spreadsheet
3. Name it "Quantum RE Analyzer v2.0"

### Step 2: Open Apps Script Editor
1. In your spreadsheet, go to **Extensions → Apps Script**
2. Delete any default code in the editor

### Step 3: Add the Script Files
Copy and paste each file from this repository into the Apps Script editor:

1. **appsscript.json** - Click the ⚙️ settings icon → "Show appsscript.json" → paste content
2. **RE_core.gs** - Click ➕ → Script file → name it "RE_core" → paste content
3. **RE_ui.gs** - Click ➕ → Script file → name it "RE_ui" → paste content
4. **RE_dashboard.gs** - Click ➕ → Script file → name it "RE_dashboard" → paste content
5. **RE_analysis.gs** - Click ➕ → Script file → name it "RE_analysis" → paste content
6. **RE_sync.gs** - Click ➕ → Script file → name it "RE_sync" → paste content
7. **re_control_center.html** - Click ➕ → HTML file → name it "re_control_center" → paste content

### Step 4: Save and Initialize
1. Click **💾 Save** (or Ctrl/Cmd + S)
2. Close the Apps Script editor
3. **Refresh your spreadsheet**
4. You should see a new menu: **"🏡 Quantum RE Analyzer"**
5. Click **Quantum RE Analyzer → Initialize System**
6. Grant permissions when prompted

---

## 📖 Quick Start Guide

### 1️⃣ Initialize the System
- **Menu:** Quantum RE Analyzer → Initialize System
- This creates all required sheets:
  - `MASTER_PROPERTIES` - All imported properties
  - `VERDICT` - Analyzed and classified deals
  - `SYSTEM_LOG` - Activity and error logs
  - `CONFIG` - System configuration

### 2️⃣ Import Your Leads
1. Create a sheet named `LEADS_<source>` (e.g., `LEADS_Zillow`, `LEADS_DrivingForDollars`)
2. Add your property data with columns like:
   - Address, City, State, ZIP
   - Price (asking price)
   - Bedrooms, Bathrooms, Sqft
   - ARV (optional)
   - Estimated Repairs (optional)
   - Notes

3. Run **Quantum RE Analyzer → Run Full Sync**
4. Your leads will be imported into `MASTER_PROPERTIES`

### 3️⃣ Analyze Your Deals
1. Run **Quantum RE Analyzer → Run Full Analysis**
2. The system will:
   - Calculate MAO for each property
   - Assess risk scores
   - Project profit potential
   - Classify deals (HOT/SOLID/MARGINAL/PASS)
   - Rank by deal score

3. Check the `VERDICT` sheet for results

### 4️⃣ Use the Control Center
1. Open **Quantum RE Analyzer → Control Center**
2. View real-time metrics and action items
3. Run operations directly from the sidebar
4. Monitor recent activity

---

## 🎯 Understanding the Analysis

### MAO Calculation
```
MAO = (ARV × 70%) - Repairs - Holding Costs - Closing Costs
```

**Where:**
- ARV = After Repair Value
- Repairs = Estimated repair costs
- Holding Costs = $1,500/month × 6 months = $9,000
- Closing Costs = 3% of ARV

### Deal Classification Criteria

| Classification | Min Spread | Min Profit % | Max Risk |
|---------------|-----------|--------------|----------|
| **HOT** | $25,000 | 20% | 3 |
| **SOLID** | $15,000 | 12% | 5 |
| **MARGINAL** | $8,000 | 8% | 7 |
| **PASS** | Below thresholds | | |

### Risk Scoring (0-10 scale)

Points are added for:
- High repair costs (>$50,000) = +2 points
- Foundation/structural issues = +3 points
- Legal issues (probate, liens, foreclosure) = +2 points
- Location concerns = +2 points
- Age (built before 1950) = +1 point

**Lower risk scores are better!**

---

## 🔧 Configuration

Edit values in the `CONFIG` sheet or update constants in `RE_core.gs`:

| Setting | Default | Description |
|---------|---------|-------------|
| ARV_MULTIPLIER | 0.70 | MAO calculation multiplier (70% rule) |
| MIN_PROFIT | $10,000 | Minimum acceptable profit |
| HOLDING_COSTS | $1,500 | Monthly holding costs |
| HOLDING_MONTHS | 6 | Average holding period |
| CLOSING_COSTS | 3% | Closing cost percentage |
| REPAIR_ESTIMATE_SQF | $25 | Default repair estimate per sqft |

---

## 📊 Sheet Descriptions

### MASTER_PROPERTIES
Central repository of all imported properties with raw data.

**Key Columns:**
- Property ID (auto-generated unique identifier)
- Address, City, State, ZIP
- Price, Bedrooms, Bathrooms, Sqft
- ARV, Estimated Repairs
- Lead Source, Date Added, Status

### VERDICT
Analysis results with deal classifications and rankings.

**Key Columns:**
- Classification (HOT/SOLID/MARGINAL/PASS)
- Deal Score (0-100)
- MAO, Spread, Profit Potential
- Risk Score (0-10)
- Under Contract status
- Action Items, Priority

### SYSTEM_LOG
Complete activity log with color-coded event types.

**Event Types:**
- 🔵 INFO - General information
- 🟢 SUCCESS - Successful operations
- 🟡 WARNING - Warnings and alerts
- 🔴 ERROR - Errors and failures

---

## 🎨 Control Center Features

### Summary Metrics
- **Hot Deals** - Count of HOT classified properties
- **Solid Deals** - Count of SOLID opportunities
- **Total Properties** - All properties in system
- **Under Contract** - Properties currently under contract

### Quick Actions
- **🔄 Run Import → Master Sync** - Import new leads
- **📊 Run Full Analysis** - Analyze all properties
- **🏅 Rebuild Verdict** - Recalculate classifications
- **📂 Review Top Deals** - View VERDICT sheet

### Action Items
Automatically generated alerts for:
- HOT deals not under contract
- SOLID deals requiring follow-up
- Properties with specific action notes
- High-score deals (>80) needing attention

### Recent Activity
Real-time log of the last 15 system events with color coding.

---

## 🔒 Best Practices

### Data Entry
- ✅ Always include Address, City, and ZIP
- ✅ Provide ARV if known (improves accuracy)
- ✅ Add repair estimates when available
- ✅ Use Notes field for important details (foundation issues, liens, etc.)

### Workflow
1. **Daily:** Check Control Center for action items
2. **Weekly:** Run Full Sync to import new leads
3. **Weekly:** Run Full Analysis to update classifications
4. **Monthly:** Review and archive old properties

### Performance
- For large datasets (>1,000 properties), run analysis during off-peak hours
- Archive old leads regularly to maintain performance
- Remove duplicates periodically

---

## 🐛 Troubleshooting

### "Loading..." Never Goes Away
**Issue:** Control Center sidebar shows "Loading..." indefinitely

**Solutions:**
1. Check that `RE_getControlCenterData()` function exists in RE_dashboard.gs
2. Open **View → Logs** in Apps Script editor to see errors
3. Verify SYSTEM_LOG sheet exists
4. Try **Initialize System** again

### No Properties After Sync
**Issue:** Ran sync but MASTER_PROPERTIES is empty

**Solutions:**
1. Verify LEADS_* sheet has data starting in row 2
2. Check column headers match expected names
3. Ensure Address, City, and ZIP are filled
4. Check SYSTEM_LOG for sync errors

### Analysis Fails
**Issue:** Run Full Analysis shows errors

**Solutions:**
1. Verify MASTER_PROPERTIES has data
2. Check for missing Price values
3. Run Initialize System to ensure all sheets exist
4. Review SYSTEM_LOG for specific errors

---

## 🤝 Contributing

This project is open source and contributions are welcome!

**To contribute:**
1. Fork this repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - feel free to use and modify for your real estate investing business.

---

## 💡 Pro Tips

### Tip 1: Custom Lead Sources
Create multiple LEADS_* sheets for different lead sources:
- `LEADS_Zillow`
- `LEADS_DrivingForDollars`
- `LEADS_DirectMail`
- `LEADS_Auctions`

The system tracks which source each property came from!

### Tip 2: Adjust the 70% Rule
If you prefer a different MAO multiplier (e.g., 65% or 75%), update the `ARV_MULTIPLIER` in the CONFIG sheet.

### Tip 3: Risk Keywords
The system scans the Notes field for risk keywords. Always document:
- Foundation issues
- Structural problems
- Probate situations
- Liens or legal issues
- Flood zones

### Tip 4: Contract Tracking
Use `RE_markUnderContract(propertyId, buyer, contractDate)` in Apps Script to mark deals as under contract programmatically.

### Tip 5: Bulk Updates
For bulk operations, use Apps Script functions directly instead of manual editing:
- `RE_updateProperty(propertyId, updates)`
- `RE_removeDuplicates()`
- `RE_archiveOldProperties(daysOld)`

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check the SYSTEM_LOG sheet for error details
- Review the Apps Script execution logs

---

**Built with ❤️ for Real Estate Investors**

*Transform your wholesaling business with intelligent automation and data-driven deal analysis.*
