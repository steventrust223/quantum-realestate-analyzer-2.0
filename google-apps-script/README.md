# Google Apps Script Implementation Guide
## Quantum Real Estate Analyzer v2.0

This guide will walk you through pulling the Google Apps Script files from GitHub and implementing them in your Google Sheets.

---

## 📋 Table of Contents

1. [File Structure Overview](#file-structure-overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [File Organization](#file-organization)
5. [Configuration](#configuration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## 📁 File Structure Overview

The Google Apps Script is organized into **MULTIPLE FILES** for better organization and maintainability:

```
google-apps-script/
├── Code.gs                 # Main entry point & core functions
├── UI.gs                   # User interface, menus, and dialogs
├── DataManagement.gs       # Data CRUD operations
├── Utilities.gs            # Helper functions
├── Reports.gs              # Report generation & analytics
├── API.gs                  # External API integrations
└── README.md               # This file
```

### Why Multiple Files?

✅ **Better Organization**: Each file has a specific purpose
✅ **Easier Maintenance**: Find and update code quickly
✅ **Team Collaboration**: Multiple people can work on different modules
✅ **Debugging**: Isolate issues to specific functional areas
✅ **Scalability**: Add new features without cluttering existing code

---

## ✅ Prerequisites

Before you begin, ensure you have:

- [ ] Google Account
- [ ] Access to Google Sheets
- [ ] Basic understanding of Google Apps Script (helpful but not required)
- [ ] GitHub account (to access this repository)

---

## 🚀 Step-by-Step Implementation

### Method 1: Clone Repository & Copy Files (Recommended)

#### Step 1: Clone the Repository

```bash
# Clone the repository to your local machine
git clone https://github.com/steventrust223/quantum-realestate-analyzer-2.0.git

# Navigate to the google-apps-script folder
cd quantum-realestate-analyzer-2.0/google-apps-script
```

#### Step 2: Create a New Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Click **"+ Blank"** to create a new spreadsheet
3. Name it: **"Quantum Real Estate Analyzer v2.0"**

#### Step 3: Open Apps Script Editor

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. This opens the Google Apps Script editor in a new tab
3. You'll see a default `Code.gs` file with a `myFunction()` placeholder

#### Step 4: Add Script Files

**IMPORTANT: You need to create MULTIPLE files, not just one!**

For each `.gs` file in the repository:

1. **Code.gs** (Already exists - replace content):
   - Delete the default `myFunction()` code
   - Open `Code.gs` from the repository
   - Copy ALL content from `Code.gs`
   - Paste into the Apps Script editor

2. **UI.gs** (Create new file):
   - In Apps Script editor, click **+ (Plus icon)** next to "Files"
   - Select **"Script"**
   - Name it: `UI` (it will automatically add .gs)
   - Copy content from `UI.gs` in repository
   - Paste into the new file

3. **DataManagement.gs** (Create new file):
   - Click **+ (Plus icon)** → **Script**
   - Name it: `DataManagement`
   - Copy content from `DataManagement.gs`
   - Paste into the new file

4. **Utilities.gs** (Create new file):
   - Click **+ (Plus icon)** → **Script**
   - Name it: `Utilities`
   - Copy content from `Utilities.gs`
   - Paste into the new file

5. **Reports.gs** (Create new file):
   - Click **+ (Plus icon)** → **Script**
   - Name it: `Reports`
   - Copy content from `Reports.gs`
   - Paste into the new file

6. **API.gs** (Create new file):
   - Click **+ (Plus icon)** → **Script**
   - Name it: `API`
   - Copy content from `API.gs`
   - Paste into the new file

#### Step 5: Save the Project

1. Click **💾 Save project** (or Ctrl+S / Cmd+S)
2. Name your project: **"Quantum RE Analyzer"**

#### Step 6: Authorize the Script

1. In Apps Script editor, select the function dropdown (next to "Debug")
2. Choose **`initializeSpreadsheet`**
3. Click **▶ Run**
4. You'll see an "Authorization required" dialog
5. Click **Review Permissions**
6. Select your Google account
7. Click **Advanced** → **Go to Quantum RE Analyzer (unsafe)**
8. Click **Allow**

#### Step 7: Initialize Your Spreadsheet

1. After authorization, the script will run
2. Go back to your Google Sheet
3. Refresh the page
4. You should now see a new menu: **"🏡 Quantum RE Analyzer"**

#### Step 8: Run Initialization

1. Click **🏡 Quantum RE Analyzer** menu
2. In Apps Script editor, run **`initializeSpreadsheet`** function
3. This creates all required sheets:
   - Dashboard
   - Active Deals
   - Wholesaling Pipeline
   - Sub2 Pipeline
   - Sellers
   - Buyers
   - Properties
   - Financial Tracking
   - Team Members
   - Documents
   - Settings

---

### Method 2: Direct Download from GitHub (Alternative)

#### Step 1: Download Files from GitHub

1. Go to the repository: `https://github.com/steventrust223/quantum-realestate-analyzer-2.0`
2. Navigate to `google-apps-script/` folder
3. Click on each `.gs` file
4. Click **"Raw"** button
5. Copy the content (Ctrl+A, Ctrl+C)

#### Step 2: Follow Steps 2-8 from Method 1

Same process as above for creating sheet, opening Apps Script, and adding files.

---

## 📂 File Organization in Apps Script Editor

After implementation, your Apps Script project should look like this:

```
📁 Quantum RE Analyzer
  📄 Code.gs
  📄 UI.gs
  📄 DataManagement.gs
  📄 Utilities.gs
  📄 Reports.gs
  📄 API.gs
```

**Visual Reference:**
```
Files
  ├─ 📄 Code.gs
  ├─ 📄 UI.gs
  ├─ 📄 DataManagement.gs
  ├─ 📄 Utilities.gs
  ├─ 📄 Reports.gs
  └─ 📄 API.gs
```

---

## ⚙️ Configuration

### Step 1: Configure Settings

1. Go to your Google Sheet
2. Click on the **"Settings"** sheet
3. Fill in your company information:

| Setting | Value | Description |
|---------|-------|-------------|
| Company Name | [Your Company] | Your business name |
| Company Email | [Your Email] | Primary email |
| Company Phone | [Your Phone] | Business phone |
| Default Assignment Fee % | 10 | Default wholesale fee |
| Target Profit Minimum | 15000 | Minimum profit per deal |
| Email Notifications | Yes | Enable/disable emails |

### Step 2: Optional API Integrations

If you want to use external APIs (optional):

1. Add settings for:
   - Real Estate API Key (for property data)
   - Twilio Account SID (for SMS)
   - Twilio Auth Token
   - Twilio Phone Number
   - DocuSign API Key
   - Google Drive Folder ID

### Step 3: Add Team Members

1. Go to **"Team Members"** sheet
2. Add your team with:
   - Name
   - Role (Admin, Acquisition Manager, etc.)
   - Email
   - Access level

---

## 🧪 Testing

### Test the Menu

1. Close and reopen your Google Sheet
2. You should see **"🏡 Quantum RE Analyzer"** menu
3. Click it to see all menu options

### Test Property Analysis

1. Click **Quantum RE Analyzer** → **Analyze Property**
2. Enter a test address: "123 Main St, Anytown, USA"
3. Click **OK**
4. You should see analysis results
5. Check the **"Properties"** sheet for the saved data

### Test Dashboard

1. Click **Quantum RE Analyzer** → **View Dashboard**
2. Dashboard should display current metrics
3. Click **Update Dashboard** to refresh data

### Test Deal Management

1. Click **Deal Management** → **Add New Deal**
2. Fill in deal information
3. Check **"Active Deals"** sheet for new entry

---

## 🔧 Troubleshooting

### Issue: Menu Not Appearing

**Solution:**
1. Close and reopen the Google Sheet
2. If still not showing, go to Apps Script editor
3. Run the `onOpen()` function manually
4. Refresh the sheet

### Issue: "Authorization Required" Error

**Solution:**
1. Run `initializeSpreadsheet` function in Apps Script
2. Click "Review Permissions"
3. Authorize the script with your Google account

### Issue: Functions Not Working

**Solution:**
1. Check Apps Script editor for errors (red underlines)
2. Ensure all 6 files are created
3. Verify file names match exactly:
   - `Code.gs`
   - `UI.gs`
   - `DataManagement.gs`
   - `Utilities.gs`
   - `Reports.gs`
   - `API.gs`

### Issue: Missing Sheets

**Solution:**
1. Go to Apps Script editor
2. Select `initializeSpreadsheet` function
3. Click Run
4. All required sheets will be created

### Issue: "Cannot read property" Error

**Solution:**
1. Run `initializeSpreadsheet` first
2. Ensure all required sheets exist
3. Check that sheet names match exactly (case-sensitive)

---

## 📚 Additional Resources

### Documentation

- [Google Apps Script Documentation](https://developers.google.com/apps-script)
- [Google Sheets API Reference](https://developers.google.com/sheets/api)
- [CompanyHub Setup Guide](../COMPANYHUB_SETUP.md)

### Video Tutorials

- Creating Google Apps Script Projects
- Working with Google Sheets Data
- Building Custom Menus

### Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/steventrust223/quantum-realestate-analyzer-2.0/issues)
- **Email Support**: Contact your team administrator
- **Community**: Join real estate investing forums

---

## 🎯 Quick Reference

### Common Functions

| Function | Purpose | How to Run |
|----------|---------|------------|
| `onOpen()` | Creates custom menu | Runs automatically on sheet open |
| `initializeSpreadsheet()` | Sets up all sheets | Run once during setup |
| `analyzeProperty()` | Analyze a property | Menu → Analyze Property |
| `updateDashboard()` | Refresh dashboard | Menu → View Dashboard |
| `addNewDeal()` | Add deal to pipeline | Menu → Deal Management → Add New Deal |
| `generateMonthlyReport()` | Create monthly report | Menu → Reports → Generate Monthly Report |

### Sheet Reference

| Sheet Name | Purpose |
|------------|---------|
| Dashboard | Overview metrics |
| Active Deals | All current deals |
| Wholesaling Pipeline | Wholesale deal tracking |
| Sub2 Pipeline | Subject-to deal tracking |
| Sellers | Seller database |
| Buyers | Buyer database |
| Properties | Analyzed properties |
| Financial Tracking | Income & expenses |
| Team Members | Team roster |
| Documents | Document tracking |
| Settings | System configuration |

---

## 📝 Notes

### Single File vs Multiple Files

**❌ DON'T:** Put all code in one `Code.gs` file
- Hard to maintain
- Difficult to debug
- Cluttered and unorganized

**✅ DO:** Use multiple files as provided
- Clean organization
- Easy to find specific functions
- Better collaboration
- Professional structure

### Best Practices

1. **Keep Settings Updated**: Regularly update the Settings sheet
2. **Back Up Data**: Periodically export sheets to CSV
3. **Test Before Using**: Test all functions with sample data first
4. **Document Changes**: Keep notes on customizations
5. **Update Regularly**: Pull latest changes from GitHub

---

## 🔄 Updating Scripts from GitHub

When updates are available:

1. Pull latest changes from GitHub:
   ```bash
   git pull origin main
   ```

2. In Apps Script editor, open each file

3. Copy updated content from repository

4. Paste into corresponding Apps Script file

5. Save project

6. Test thoroughly before using in production

---

## ✅ Completion Checklist

- [ ] Cloned repository from GitHub
- [ ] Created new Google Sheet
- [ ] Opened Apps Script editor
- [ ] Created all 6 script files
- [ ] Copied content from repository to each file
- [ ] Saved Apps Script project
- [ ] Authorized the script
- [ ] Ran `initializeSpreadsheet()` function
- [ ] Verified custom menu appears
- [ ] Configured Settings sheet
- [ ] Tested property analysis
- [ ] Tested deal management
- [ ] Tested dashboard
- [ ] Added team members
- [ ] Ready to use!

---

## 🎉 You're All Set!

Your Quantum Real Estate Analyzer is now ready to use. Start analyzing properties, managing deals, and growing your real estate business!

For questions or support, refer to the [CompanyHub Setup Guide](../COMPANYHUB_SETUP.md) or open an issue on GitHub.

**Happy Analyzing! 🏡📊**
