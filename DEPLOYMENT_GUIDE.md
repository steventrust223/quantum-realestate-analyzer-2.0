# 🚀 Quantum Real Estate Analyzer v2.0 - Deployment Guide

**Step-by-step instructions to deploy your system to Google Sheets**

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Google Account with Google Sheets access
- [ ] All 8 .gs files from the repository
- [ ] API keys ready (optional, can configure later):
  - [ ] Browse.AI API key + Robot ID
  - [ ] SMS-iT CRM API key + Workspace ID
  - [ ] CompanyHub API key
  - [ ] Ohmylead API key
  - [ ] SignWell API key
  - [ ] Book Like A Boss API key (optional)

---

## 🏗️ Step 1: Create New Google Sheet

1. Go to **[Google Sheets](https://sheets.google.com)**
2. Click **"+ Blank"** to create a new spreadsheet
3. Rename it: **"Quantum Real Estate Analyzer v2.0"**
4. **Bookmark this URL** — this is your command center

---

## 💻 Step 2: Open Apps Script Editor

1. In your new Google Sheet, click: **Extensions → Apps Script**
2. A new tab will open with the Apps Script editor
3. You'll see a default `Code.gs` file with some placeholder code

---

## 📂 Step 3: Copy All Script Files

### **3.1: Replace Code.gs**

1. In Apps Script editor, **delete all default code** in Code.gs
2. Open `Code.gs` from the repository
3. **Copy the entire contents** (Ctrl+A, Ctrl+C / Cmd+A, Cmd+C)
4. **Paste into Apps Script** Code.gs (Ctrl+V / Cmd+V)
5. Click **Save** (💾 icon or Ctrl+S / Cmd+S)

### **3.2: Add DataModels.gs**

1. Click **+ (Plus icon)** next to "Files" → Select **"Script"**
2. Name it: `DataModels`
3. **Delete the default function**
4. Open `DataModels.gs` from repository
5. **Copy entire contents** and paste
6. Click **Save**

### **3.3: Add AIEngine.gs**

1. Click **+** → **Script**
2. Name it: `AIEngine`
3. Delete default, copy from `AIEngine.gs`, paste
4. **Save**

### **3.4: Add Integrations.gs**

1. Click **+** → **Script**
2. Name it: `Integrations`
3. Copy from `Integrations.gs`, paste
4. **Save**

### **3.5: Add BuyersMatching.gs**

1. Click **+** → **Script**
2. Name it: `BuyersMatching`
3. Copy from `BuyersMatching.gs`, paste
4. **Save**

### **3.6: Add AutomationEngine.gs**

1. Click **+** → **Script**
2. Name it: `AutomationEngine`
3. Copy from `AutomationEngine.gs`, paste
4. **Save**

### **3.7: Add UIHelpers.gs**

1. Click **+** → **Script**
2. Name it: `UIHelpers`
3. Copy from `UIHelpers.gs`, paste
4. **Save**

### **3.8: Replace appsscript.json**

1. In left sidebar, find **`appsscript.json`**
2. Click to open it
3. **Delete all existing content**
4. Copy entire contents from `appsscript.json` in repository
5. **Paste** and **Save**

**Your Apps Script editor should now show:**
```
📁 Files
  ├── Code.gs
  ├── DataModels.gs
  ├── AIEngine.gs
  ├── Integrations.gs
  ├── BuyersMatching.gs
  ├── AutomationEngine.gs
  ├── UIHelpers.gs
  └── appsscript.json
```

---

## ⚙️ Step 4: Configure Project Settings

1. Click **Project Settings** (⚙️ gear icon in left sidebar)
2. Verify:
   - **Show "appsscript.json" manifest file**: ✅ Checked
   - **Runtime**: V8
3. Scroll to **Script Properties** (optional — can use Settings sheet instead)

---

## 🔐 Step 5: Authorize Permissions

1. In Apps Script editor, select **Code.gs** in dropdown
2. Select function: **`onOpen`** from dropdown
3. Click **Run** (▶️ play button)
4. **Authorization popup will appear:**
   - Click **Review Permissions**
   - Choose your Google account
   - Click **Advanced** → **Go to Quantum Real Estate Analyzer (unsafe)**
   - Click **Allow**

**Permissions needed:**
- ✅ View and manage spreadsheets
- ✅ Send email
- ✅ Connect to external services
- ✅ Run when away

---

## 📊 Step 6: Initialize the System

1. **Go back to your Google Sheet tab** (refresh if needed)
2. You should now see a new menu: **🔮 Quantum Analyzer**
3. Click: **🔮 Quantum Analyzer → Setup → Initialize System**
4. A dialog will appear: "This will take 30-60 seconds..."
5. Click **OK**

**The system will now:**
- ✅ Create all 18 sheets
- ✅ Set up column headers
- ✅ Apply formatting (frozen headers, colors)
- ✅ Configure default settings (50+ settings)
- ✅ Setup automation triggers

**Wait for completion message:** "✅ System Initialized Successfully!"

---

## 🎨 Step 7: Verify Installation

After initialization, your Google Sheet should have **18 new tabs**:

```
📥 Import Hub
🗄️ Master Database
⚡ Verdict Sheet (Command Center)
📊 Lead Scoring & Risk
🎯 Flip Strategy Engine
💰 Offers & Disposition
🤝 Buyers Matching Engine
🔄 CRM Sync Log
📈 Dashboard & Analytics
⚙️ Settings & Controls
👥 Sellers CRM
🏠 Buyers Database
📣 Marketing Leads
🔥 Deal Pipelines
💵 Financial Tracking
👨‍💼 Team Management
📄 Documents & Templates
🌍 Market Intelligence
```

**Check:**
- [ ] All sheets created
- [ ] Headers are bold, purple, and frozen
- [ ] Settings sheet has 50+ rows of configuration
- [ ] Dashboard shows metric cards

---

## 🔌 Step 8: Configure API Integrations (Optional)

1. **Go to Settings & Controls sheet**
2. Scroll to **"INTEGRATION KEYS"** section (around row 35)
3. **Add your API keys** in column B (Value):

| Setting Key | Your Value | Where to Get It |
|-------------|------------|-----------------|
| `BROWSE_AI_API_KEY` | Your API key | browse.ai → Settings → API Keys |
| `BROWSE_AI_ROBOT_ID` | Your robot ID | browse.ai → Robot → ID in URL |
| `SMSIT_API_KEY` | Your API key | sms-it.com → Settings → API |
| `SMSIT_WORKSPACE_ID` | Your workspace ID | sms-it.com → Workspace Settings |
| `COMPANYHUB_API_KEY` | Your API key | companyhub.com → Settings → Integrations → API |
| `OHMYLEAD_API_KEY` | Your API key | ohmylead.com → Settings → API |
| `SIGNWELL_API_KEY` | Your API key | signwell.com → Settings → API Keys |
| `BOOK_LIKE_A_BOSS_API_KEY` | Your API key | booklikeaboss.com → API Settings |

**Note:** You can configure these later. The system works without them for manual data entry.

---

## 🔧 Step 9: Customize Settings

In **Settings & Controls** sheet, review and adjust:

### **Feature Flags** (Row 2-6)
- `AUTO_ANALYSIS_ENABLED` → **TRUE** (auto-analyze new leads)
- `AUTO_HOT_DEAL_ALERTS` → **TRUE** (email alerts for 🔥 HOT DEALS)
- `AUTO_SMS_ENABLED` → **FALSE** (set TRUE after SMS-iT configured)
- `AUTO_CRM_SYNC` → **TRUE** (auto-sync to CRMs)

### **Deal Thresholds** (Row 8-13)
- `HOT_DEAL_EQUITY_THRESHOLD` → **30** (minimum equity % for HOT DEAL)
- `HOT_DEAL_MOTIVATION_THRESHOLD` → **8** (minimum motivation 1-10)
- `MIN_ARV` → **50000** (minimum ARV to analyze)

### **MAO Multipliers** (Row 15-19)
- `WHOLESALE_MAO_MULTIPLIER` → **0.70** (ARV * 70% - Repairs)
- `SUB2_MAO_MULTIPLIER` → **0.85**
- `WRAP_MAO_MULTIPLIER` → **0.90**

### **Notifications** (Row 47-49)
- `ADMIN_EMAIL` → **your@email.com** (for system alerts)
- `ADMIN_PHONE` → **+1234567890** (for SMS alerts)

---

## 🧪 Step 10: Test with Sample Data

### **Test 1: Manual Lead Entry**

1. Go to **📥 Import Hub** sheet
2. Add a test lead in row 2:

| Import Date | Source | Property Address | City | State | ZIP | Asking Price |
|-------------|--------|------------------|------|-------|-----|--------------|
| 1/11/2026 | Manual | 123 Main St | Atlanta | GA | 30309 | 150000 |

3. Fill in remaining columns (beds, baths, sqft, etc.)
4. Go to menu: **🔮 Quantum Analyzer → Deal Analysis → Analyze New Property**
5. Check **Master Database** for analysis results
6. Check **Verdict Sheet** for AI verdict

### **Test 2: Run Diagnostics**

1. Menu: **🔮 Quantum Analyzer → Setup → Run Diagnostics**
2. Review system status report
3. Verify:
   - ✅ All sheets present
   - ✅ Triggers active
   - ✅ Settings configured

### **Test 3: Dashboard Update**

1. Add data to **Master Database** or **Buyers Database**
2. Menu: **🔮 Quantum Analyzer → Reports & Analytics → View Dashboard**
3. Dashboard should show updated metrics

---

## 🎯 Step 11: Start Using the System

### **Daily Workflow:**

1. **Morning (9 AM):**
   - Check **📈 Dashboard** for overnight activity
   - Review **⚡ Verdict Sheet** for 🔥 HOT DEALS
   - Check **🔄 CRM Sync Log** for errors

2. **Import Leads:**
   - **Option A:** Menu → Integrations → Import Browse.AI Leads
   - **Option B:** Add to Import Hub manually
   - **Option C:** Leads auto-import from Ohmylead (hourly)

3. **Review AI Analysis:**
   - Go to **🗄️ Master Database**
   - Review AI Notes, Deal Classifier, Strategy Recommendation
   - Check psychologically-optimized Seller Messages

4. **Contact Sellers:**
   - Copy AI-generated message from Master Database
   - Send via SMS-iT CRM or email
   - Log contact in **👥 Sellers CRM**

5. **Match Buyers:**
   - Menu → Buyers & Sellers → Match Buyers to Deals
   - Check **🤝 Buyers Matching Engine** sheet
   - Send deals to PERFECT/STRONG matches

6. **Make Offers:**
   - Create offer in **💰 Offers & Disposition**
   - Menu → Integrations → Send to SignWell
   - Track contract status

7. **Close Deals:**
   - Update status to "Closed" in Master Database
   - Log in **💵 Financial Tracking**
   - Celebrate! 🎉

---

## 🔒 Step 12: Security & Backup

### **Security:**

1. **Protect System Sheets:**
   - Menu: **Setup → Protect System Sheets** (optional)
   - This prevents accidental editing of Settings

2. **Share Carefully:**
   - Click **Share** button in Google Sheets
   - Add team members with appropriate permissions:
     - **Editor:** Full access
     - **Commenter:** View + comment only
     - **Viewer:** Read-only

3. **API Keys:**
   - **Never share** your Settings sheet publicly
   - **Never commit** API keys to public repositories

### **Backup:**

1. **Weekly Export:**
   - File → Download → Microsoft Excel (.xlsx)
   - Save to Google Drive or local backup

2. **Version History:**
   - File → Version History → See Version History
   - Google Sheets auto-saves versions

---

## 🐛 Troubleshooting

### **Issue: Menu doesn't appear**

**Solution:**
1. Refresh the page (F5 / Cmd+R)
2. Re-run authorization: Apps Script → Run `onOpen`
3. Check: Tools → Script Editor → Check for errors

### **Issue: "Initialize System" fails**

**Solution:**
1. Check script quotas: Apps Script → Executions
2. Ensure all 8 .gs files are copied correctly
3. Run diagnostics: Menu → Setup → Run Diagnostics

### **Issue: Integrations not working**

**Solution:**
1. Verify API keys in Settings sheet (column B)
2. Check CRM Sync Log for error details
3. Test each integration individually from menu

### **Issue: Automation not triggering**

**Solution:**
1. Check Settings: `AUTO_ANALYSIS_ENABLED` = TRUE
2. Verify triggers: Apps Script → Triggers (clock icon)
3. Re-run: Menu → Setup → Initialize System

### **Issue: Conditional formatting not applied**

**Solution:**
1. Manually apply: Menu → Setup → Run Custom Menu Function
2. Or add data to trigger formatting rules

---

## 📚 Next Steps

### **After Deployment:**

1. **Read Documentation:**
   - [ ] README.md — Overview and features
   - [ ] COMPANYHUB_SETUP.md — Complete CRM configuration

2. **Configure CompanyHub:**
   - [ ] Create 7 pipelines in CompanyHub
   - [ ] Add 18+ custom fields
   - [ ] Map stages to Quantum Analyzer

3. **Setup Browse.AI:**
   - [ ] Create robots for Facebook, Zillow, PropStream
   - [ ] Configure webhook (optional)
   - [ ] Test lead import

4. **Add Buyers:**
   - [ ] Populate **🏠 Buyers Database** with preferences
   - [ ] Include: ZIPs, strategy, price range, exit speed

5. **Customize:**
   - [ ] Adjust AI thresholds in Settings
   - [ ] Customize MAO multipliers for your market
   - [ ] Configure email/SMS alerts

---

## ✅ Deployment Checklist

**Before going live:**

- [ ] All 8 .gs files copied to Apps Script
- [ ] System initialized (18 sheets created)
- [ ] Settings reviewed and customized
- [ ] API keys added (if using integrations)
- [ ] Admin email/phone configured for alerts
- [ ] Test lead analyzed successfully
- [ ] Dashboard showing metrics
- [ ] Diagnostics passed
- [ ] Team members added with permissions
- [ ] First backup created

---

## 🎉 You're Live!

**Your Quantum Real Estate Analyzer is now operational!**

Start importing leads, let the AI analyze them, and watch as the system:
- 🔥 Auto-flags HOT DEALS
- 🧠 Profiles seller psychology
- 🤝 Matches buyers intelligently
- 💰 Calculates MAO for all 7 strategies
- 📧 Sends alerts and reminders
- 🔄 Syncs to all your CRMs

**Welcome to wholesale domination.** 🔮

---

## 🆘 Need Help?

- **Documentation:** See README.md and COMPANYHUB_SETUP.md
- **Issues:** Check CRM Sync Log for error details
- **Diagnostics:** Menu → Setup → Run Diagnostics
- **Support:** Open an issue on GitHub

---

**Version**: 2.0
**Last Updated**: January 2026

🚀 **Deploy with confidence. Dominate with intelligence.**
