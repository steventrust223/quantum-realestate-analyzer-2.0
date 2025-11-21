# 🏢 CompanyHub CRM Integration Setup Guide
## Enterprise-Grade Configuration for CarHawk + Quantum Real Estate Analyzer

This guide will walk you through setting up a unified CompanyHub CRM that serves **both** your CarHawk vehicle flipping business and your Quantum Real Estate Analyzer.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [CompanyHub Object Structure](#object-structure)
3. [Field Configuration](#field-configuration)
4. [API Setup](#api-setup)
5. [Google Sheets Configuration](#sheets-configuration)
6. [Testing Your Integration](#testing)
7. [Sync Workflows](#sync-workflows)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

### What This Integration Does

**RE Analyzer → CompanyHub:**
- Syncs HOT and SOLID properties to CompanyHub PROPERTIES object
- Auto-creates CONTACT records for sellers
- Auto-creates RE DEALS for hot deals
- Updates status when deals progress
- Tracks all sync activity in SYNC_LOG

**CompanyHub → RE Analyzer:**
- Receives webhooks when deal stages change
- Updates property status in MASTER_PROPERTIES
- Logs all incoming updates

### Key Features

✅ **Deduplication** - Uses MD5 hash to prevent duplicate records
✅ **Bidirectional Sync** - Changes flow both ways
✅ **Comprehensive Logging** - Every sync event is tracked
✅ **Manual Override** - "Push to CRM" checkbox for edge cases
✅ **Enterprise-Grade** - Built for scale and reliability

---

## 🏗 Object Structure

### Required CompanyHub Objects

Create the following custom objects in CompanyHub:

#### 1. **CONTACTS** (Built-in - Already Exists)
Use this for ALL people across both systems.

**Key Configuration:**
- Enable multi-select for "Contact Type" field
- Add custom field: "System Origin" (dropdown: CarHawk, RE Analyzer, Both)
- Add custom field: "Source Platform" (dropdown: Facebook, Craigslist, OfferUp, eBay, Web Form, Scraped List, etc.)

#### 2. **PROPERTIES** (Custom Object - CREATE THIS)
For real estate inventory.

**Create in CompanyHub:**
1. Go to Settings → Objects
2. Click "Create Custom Object"
3. Name: `PROPERTIES`
4. Icon: 🏠
5. Add fields (see Field Configuration below)

#### 3. **VEHICLES** (Custom Object - For CarHawk)
For car inventory.

*Note: This is for CarHawk integration. If you only use RE Analyzer, you can skip this.*

#### 4. **RE DEALS** (Custom Object - CREATE THIS)
For real estate transactions.

**Create in CompanyHub:**
1. Go to Settings → Objects
2. Click "Create Custom Object"
3. Name: `RE DEALS`
4. Icon: 💰
5. Add fields (see Field Configuration below)

#### 5. **SYNC_LOG** (Custom Object - CREATE THIS)
For integration audit trail.

**Create in CompanyHub:**
1. Go to Settings → Objects
2. Click "Create Custom Object"
3. Name: `SYNC_LOG`
4. Icon: 📋
5. Add fields (see Field Configuration below)

#### 6. **LEAD SOURCES** (Custom Object - CREATE THIS)
For tracking lead source performance.

**Create in CompanyHub:**
1. Go to Settings → Objects
2. Click "Create Custom Object"
3. Name: `LEAD SOURCES`
4. Icon: 📊
5. Add fields (see Field Configuration below)

#### 7. **BUYER PROFILES** (Custom Object - CREATE THIS)
For advanced investor matching.

**Create in CompanyHub:**
1. Go to Settings → Objects
2. Click "Create Custom Object"
3. Name: `BUYER PROFILES`
4. Icon: 👤
5. Add fields (see Field Configuration below)

---

## 🔧 Field Configuration

### CONTACTS Fields

Add these custom fields to the built-in CONTACTS object:

| Field Name | Type | Options/Description |
|------------|------|---------------------|
| **Contact Type** | Multi-select | Car Seller, Car Buyer, RE Seller, RE Buyer, Cash Buyer, Investor, Wholesaler, Landlord, Sub2 Buyer, Wrap Buyer |
| **System Origin** | Dropdown | CarHawk, RE Analyzer, Both |
| **Source Platform** | Dropdown | Facebook, Craigslist, OfferUp, eBay, Web Form, Scraped List, SMS-iT, OhMyLead, Referral, Direct Call |
| **Lead Source** | Relationship | → LEAD SOURCES |
| **Temperature** | Dropdown | Hot, Warm, Cold |
| **Motivation Level** | Dropdown | Very High, High, Medium, Low, Unknown |
| **Best Contact Time** | Text | Free text |
| **Dedupe Hash** | Text (Hidden) | Auto-populated by sync |

### PROPERTIES Fields

| Field Name | Type | Description |
|------------|------|-------------|
| **Property ID** | Text (Unique) | From Sheets (e.g., PROP-20250118-12345) |
| **Address** | Text | Full street address |
| **City** | Text | City name |
| **State** | Text | 2-letter state code |
| **ZIP** | Text | ZIP code |
| **County** | Text | County name |
| **Property Type** | Dropdown | SFR, Condo, Townhouse, Multi-family, Land, Commercial |
| **Beds** | Number | Number of bedrooms |
| **Baths** | Number | Number of bathrooms |
| **Sqft** | Number | Square footage |
| **Year Built** | Number | Year |
| **Occupancy Status** | Dropdown | Vacant, Owner Occupied, Tenant Occupied |
| **Asking Price** | Currency | Seller's asking price |
| **ARV** | Currency | After Repair Value |
| **Repair Estimate** | Currency | Total repair costs |
| **MAO** | Currency | Maximum Allowable Offer |
| **Suggested Offer** | Currency | Calculated initial offer |
| **Profit Potential** | Currency | Expected profit |
| **Profit Margin %** | Number | Percentage |
| **Deal Class** | Dropdown | HOT DEAL, SOLID, PORTFOLIO, PASS |
| **Exit Strategy** | Dropdown | Wholesale, Wholetail, Sub2, Wraparound, STR, MTR, LTR, Trash/Pass |
| **Market Volume Score** | Number | 0-100 score |
| **Sales Velocity Score** | Number | 0-100 score |
| **Risk Score** | Number | 0-100 score |
| **Hazard Flags** | Text | Comma-separated flags |
| **Status** | Dropdown | New, Analyzing, Ready to Offer, Offer Made, Under Contract, Assigned, Closed, Dead |
| **Seller** | Relationship | → CONTACTS |
| **Import Source** | Dropdown | LEADS_WEB, LEADS_SCRAPED, LEADS_DIRECT |
| **System Origin** | Text | Always "RE Analyzer" |
| **Source Platform** | Text | From import source |
| **Dedupe Hash** | Text (Hidden) | MD5 hash for deduplication |
| **Sheets Row** | Number | Row number in Google Sheets |
| **Notes** | Long Text | Free text |

### RE DEALS Fields

| Field Name | Type | Description |
|------------|------|-------------|
| **Deal Name** | Text | Auto-generated (e.g., "123 Main St - Wholesale") |
| **Property** | Relationship | → PROPERTIES |
| **Seller** | Relationship | → CONTACTS |
| **Buyer** | Relationship | → CONTACTS or BUYER PROFILES |
| **Deal Class** | Dropdown | HOT DEAL, SOLID, PORTFOLIO |
| **Offer Amount** | Currency | Offer amount |
| **Offer Type** | Dropdown | Cash, Financing, Sub2, Seller Finance, Wraparound |
| **Assignment Fee** | Currency | Wholesale assignment fee |
| **Expected Profit** | Currency | Total expected profit |
| **Exit Strategy** | Dropdown | Wholesale, Sub2, Wrap, STR, MTR, LTR |
| **Stage** | Dropdown | New Lead, Contacted, Analyzing, Offer Made, Negotiating, Under Contract, Closed, Dead |
| **System Tag** | Text | Always "RE Analyzer" |
| **Notes** | Long Text | Free text |

### LEAD SOURCES Fields

| Field Name | Type | Description |
|------------|------|-------------|
| **Source ID** | Text (Auto) | Auto-generated |
| **Platform Name** | Text | Facebook, Craigslist, etc. |
| **Category** | Multi-select | Auto, Real Estate, Both |
| **Monthly Leads** | Number | Tracked automatically |
| **Cost Per Lead** | Currency | Your tracking |
| **Conversion Rate %** | Number | Calculated |
| **HOT Deals Count** | Number | Tracked automatically |
| **Total Revenue** | Currency | Sum of closed deals |
| **Volume Score** | Number | 0-100 |
| **Status** | Dropdown | Active, Paused, Disabled |

### BUYER PROFILES Fields

| Field Name | Type | Description |
|------------|------|-------------|
| **Buyer** | Relationship | → CONTACTS |
| **Max Rehab Level** | Dropdown | Light, Full, Structural |
| **Property Types** | Multi-select | SFR, Condo, Townhouse, Multi-family |
| **Preferred ZIPs** | Long Text | Comma-separated ZIPs |
| **Excluded ZIPs** | Long Text | Comma-separated ZIPs |
| **No Basement** | Checkbox | Exclusion flag |
| **No Slab** | Checkbox | Exclusion flag |
| **No HOA** | Checkbox | Exclusion flag |
| **Min Cap Rate %** | Number | Minimum cap rate |
| **Max LTV %** | Number | Maximum loan-to-value |
| **Strategy** | Multi-select | Wholesale, Sub2, STR, MTR, LTR, Fix&Flip |
| **Avg Close Speed (days)** | Number | Performance tracking |
| **Total Deals** | Number | Historical count |
| **Status** | Dropdown | Active, Inactive, Do Not Contact |

---

## 🔐 API Setup

### Step 1: Get Your CompanyHub API Key

1. Log in to CompanyHub
2. Go to **Settings** → **API & Integrations**
3. Click **Generate API Key**
4. Copy your API key (it will look like: `ch_live_abc123...`)
5. **IMPORTANT**: Save this securely - you won't be able to see it again!

### Step 2: Get Your Account URL

Your CompanyHub account URL format:
```
https://[yourcompany].companyhub.com
```

Example:
```
https://steventrust.companyhub.com
```

---

## 📊 Google Sheets Configuration

### Step 1: Add API Credentials to SETTINGS Sheet

1. Open your **Quantum Real Estate Analyzer** spreadsheet
2. Go to the **SETTINGS** sheet
3. Find (or add) these settings:

| Setting Key | Setting Value | Description |
|-------------|---------------|-------------|
| `companyhub.apiKey` | `ch_live_abc123...` | Your API key from above |
| `companyhub.accountUrl` | `https://yourcompany.companyhub.com` | Your account URL |
| `companyhub.autoSyncEnabled` | `FALSE` | Start with manual sync, change to TRUE later |
| `companyhub.syncOnlyHotSolid` | `TRUE` | Only sync HOT and SOLID deals |
| `companyhub.autoCreateContacts` | `TRUE` | Auto-create seller contacts |
| `companyhub.autoCreateDeals` | `HOT_ONLY` | Only create deals for HOT properties |
| `companyhub.dedupeStrategy` | `HASH_ADDRESS_COMBO` | Use hash + address deduplication |

### Step 2: Run Setup

1. In Google Sheets, click **🏡 Quantum RE Analyzer** menu
2. Click **🔧 Setup / Refresh Structure**
3. Wait for setup to complete
4. Verify **SYNC_LOG** sheet was created

### Step 3: Test Connection

1. Click **🏡 Quantum RE Analyzer** menu
2. Hover over **🏢 CompanyHub CRM**
3. Click **🔗 Test Connection**
4. You should see: **✅ Connected to CompanyHub successfully!**

If you see an error, check:
- API Key is correct
- Account URL is correct (no trailing slash)
- You have internet connection
- CompanyHub account is active

---

## ✅ Testing Your Integration

### Test 1: Manual Single Property Sync

1. **Add a test property:**
   - Go to **LEADS_DIRECT** sheet
   - Add a row with fake data (123 Test St, etc.)

2. **Import to Master:**
   - Menu → **🔄 Run Import → Master Sync**

3. **Run Analysis:**
   - Menu → **📊 Run Full Analysis**

4. **Mark as HOT:**
   - Go to **MASTER_PROPERTIES**
   - Find your test property
   - Manually change **Deal Class** to `HOT DEAL`
   - Check the **Push to CRM** checkbox

5. **Sync to CompanyHub:**
   - Menu → **🏢 CompanyHub CRM** → **📤 Sync HOT/SOLID Deals**
   - Wait for confirmation

6. **Verify in CompanyHub:**
   - Log in to CompanyHub
   - Go to **PROPERTIES** object
   - Find your test property
   - Verify all fields populated correctly

7. **Check Sync Log:**
   - Menu → **🏢 CompanyHub CRM** → **📋 View Sync Log**
   - Find your sync entry
   - Status should be **Success**

### Test 2: Bulk Sync

1. Import 5-10 test leads
2. Run full analysis
3. Some should classify as HOT/SOLID
4. Run bulk sync: **📤 Sync HOT/SOLID Deals**
5. Verify all synced to CompanyHub
6. Check SYNC_LOG for any errors

### Test 3: Webhook (Bidirectional Sync)

*Coming soon - webhook setup guide*

---

## 🔄 Sync Workflows

### Daily Workflow

1. **Morning:**
   - Import new leads from all sources
   - Run Full Analysis
   - Review Control Center for hot deals

2. **Sync to CRM:**
   - Control Center → **📤 Sync HOT/SOLID to CRM**
   - Or use menu → **🏢 CompanyHub CRM** → **📤 Sync HOT/SOLID Deals**

3. **Work in CompanyHub:**
   - Contact sellers
   - Move deals through pipeline stages
   - Changes sync back to Sheets automatically (if webhooks configured)

### What Gets Synced?

**Auto-Synced (if `syncOnlyHotSolid = TRUE`):**
- Properties with **Deal Class** = HOT DEAL or SOLID
- Properties with **Push to CRM** checkbox = TRUE

**Not Synced:**
- PORTFOLIO deals (unless Push to CRM is checked)
- PASS deals (unless Push to CRM is checked)
- Properties without seller name + phone

**Auto-Created:**
- CONTACT record for seller (if phone + name exist)
- RE DEAL record (if `autoCreateDeals` = HOT_ONLY or HOT_SOLID)

---

## 🔧 Troubleshooting

### Error: "CompanyHub not configured"

**Solution:**
- Open SETTINGS sheet
- Add `companyhub.apiKey` and `companyhub.accountUrl`
- Make sure there are no extra spaces

### Error: "HTTP 401 Unauthorized"

**Solution:**
- Your API key is invalid or expired
- Generate a new API key in CompanyHub
- Update SETTINGS sheet

### Error: "Property already exists"

**Solution:**
- This is normal - the system found an existing record and updated it
- Check SYNC_LOG for confirmation
- Deduplication is working correctly

### Sync Successful But No Records in CompanyHub

**Solution:**
1. Check you created the **PROPERTIES** custom object
2. Verify field names match exactly (case-sensitive)
3. Check CompanyHub API permissions
4. Review SYNC_LOG for detailed error messages

### How to Reset and Start Over

1. Delete all records from CompanyHub PROPERTIES object
2. In Sheets, go to MASTER_PROPERTIES
3. Clear columns: `CRM Synced`, `CRM Record ID`, `Last Sync Date`
4. Re-run sync

---

## 📞 Support

For issues or questions:

1. Check **SYNC_LOG** sheet for detailed error messages
2. Check **SYSTEM_LOG** sheet for system errors
3. Review CompanyHub API documentation: [companyhub.com/api](https://companyhub.com/api)
4. Contact CompanyHub support if API issues persist

---

## 🎉 You're All Set!

Your enterprise-grade CRM integration is now live. You can:

✅ Sync properties automatically
✅ Track all deals in one place
✅ Manage contacts across both businesses
✅ Monitor sync activity with comprehensive logs
✅ Scale to thousands of properties

**Next Steps:**
1. Import your real leads
2. Run analysis
3. Start syncing to CompanyHub
4. Build your real estate empire! 🚀

---

**Version:** 2.0 Enterprise Edition
**Last Updated:** 2025-01-18
**Maintained By:** Your Senior System Architect
