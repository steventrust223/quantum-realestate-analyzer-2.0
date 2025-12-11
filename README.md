# Quantum Real Estate Analyzer v2.0

**Ultimate Wholesaling & Sub2 Real Estate Business Management System**

A comprehensive, full-stack web application for real estate investors specializing in wholesaling and Subject-To (Sub2) deals. Features advanced property analysis with the Quantum Analysis Engine, deal pipeline management, CRM functionality, and business automation tools.

## Features

### Core Modules

- **Property Analysis with Quantum Engine**
  - Wholesale deal analysis with ROI calculations
  - Subject-To deal analysis with cashflow projections
  - ARV (After Repair Value) calculator with comp adjustments
  - Repair cost estimator with detailed breakdowns
  - Deal scoring (0-100) with letter grades
  - Risk assessment and success probability
  - SWOT analysis for each deal

- **Deal Management**
  - Visual pipeline board (Kanban-style)
  - Separate pipelines for Wholesaling and Sub2 deals
  - Deal status tracking with history
  - One-click deal advancement through stages

- **Buyer & Seller Database (CRM)**
  - Cash buyer management with preferences
  - Motivated seller tracking with motivation scoring
  - CSV import functionality
  - Contact filtering and search
  - VIP buyer designation

- **CompanyHub**
  - Company profile management
  - Team member management with roles
  - Document management system
  - Role-based permissions (Admin, Acquisition, Disposition, Marketing, Finance)

- **Marketing Center**
  - Campaign management
  - Lead tracking by source
  - Marketing channel configuration
  - Campaign ROI tracking

- **Reports & Analytics**
  - Real-time dashboard metrics
  - Deal type distribution charts
  - Revenue analysis
  - KPI tracking
  - Export to CSV/JSON

- **Automation Hub**
  - Task management with priorities
  - Workflow automation
  - Email templates for common communications
  - Task status tracking

- **Settings**
  - General preferences (currency, timezone, date format)
  - Pipeline stage customization
  - Notification preferences
  - Integration configuration
  - Data export/backup

## Technology Stack

- **Backend**: Node.js with Express.js
- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Data Storage**: JSON file-based (no database required)
- **API**: RESTful API architecture

## Installation

### Prerequisites

- Node.js 14+ installed
- npm (Node Package Manager)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/your-repo/quantum-realestate-analyzer-2.0.git
cd quantum-realestate-analyzer-2.0
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Open your browser and navigate to:
```
http://localhost:3000
```

## Project Structure

```
quantum-realestate-analyzer-2.0/
├── server.js                 # Express server with all API endpoints
├── package.json              # Project dependencies
├── models/
│   └── DataStore.js          # JSON-based data persistence layer
├── utils/
│   └── QuantumAnalyzer.js    # Advanced property analysis engine
├── public/                   # Frontend files
│   ├── control-center.html   # Main dashboard
│   ├── analyze.html          # Property analysis module
│   ├── companyhub.html       # Company management
│   ├── deals.html            # Deal pipeline management
│   ├── buyers.html           # Buyer/Seller CRM
│   ├── marketing.html        # Marketing campaigns
│   ├── reports.html          # Analytics dashboard
│   ├── automation.html       # Task & workflow automation
│   └── settings.html         # System settings
├── data/                     # JSON data storage (auto-created)
│   ├── properties.json
│   ├── deals.json
│   ├── buyers.json
│   ├── sellers.json
│   ├── team.json
│   ├── company.json
│   ├── documents.json
│   ├── marketing.json
│   ├── automation.json
│   ├── analytics.json
│   └── settings.json
└── README.md
```

## API Endpoints

### Dashboard
- `GET /api/dashboard` - Get dashboard summary with metrics

### Properties
- `GET /api/properties` - List all properties
- `POST /api/properties` - Add new property
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Analysis
- `POST /api/analyze/wholesale` - Run wholesale deal analysis
- `POST /api/analyze/sub2` - Run Subject-To deal analysis
- `POST /api/analyze/arv` - Calculate ARV with comps
- `POST /api/analyze/repairs` - Estimate repair costs

### Deals
- `GET /api/deals` - List deals (with optional filters)
- `GET /api/deals/:id` - Get single deal
- `POST /api/deals` - Create deal
- `PUT /api/deals/:id` - Update deal
- `DELETE /api/deals/:id` - Delete deal
- `GET /api/deals/pipeline/:type` - Get pipeline view

### Buyers
- `GET /api/buyers` - List buyers
- `POST /api/buyers` - Add buyer
- `PUT /api/buyers/:id` - Update buyer
- `DELETE /api/buyers/:id` - Delete buyer
- `POST /api/buyers/match` - Match buyers to deal criteria

### Sellers
- `GET /api/sellers` - List sellers
- `POST /api/sellers` - Add seller
- `PUT /api/sellers/:id` - Update seller
- `DELETE /api/sellers/:id` - Delete seller

### Team & Company
- `GET /api/team` - Get team with members and roles
- `POST /api/team/members` - Add team member
- `PUT /api/team/members/:id` - Update member
- `DELETE /api/team/members/:id` - Remove member
- `GET /api/company` - Get company profile
- `PUT /api/company` - Update company

### Marketing
- `GET /api/marketing` - Get campaigns and leads
- `POST /api/marketing/campaigns` - Create campaign
- `POST /api/marketing/leads` - Add lead

### Automation
- `GET /api/automation` - Get workflows and tasks
- `POST /api/automation/workflows` - Create workflow
- `POST /api/automation/tasks` - Create task
- `PUT /api/automation/tasks/:id` - Update task

### Analytics
- `GET /api/analytics` - Get analytics data
- `GET /api/analytics/metrics` - Get current metrics
- `GET /api/reports/summary` - Generate summary report

### Settings
- `GET /api/settings` - Get settings
- `PUT /api/settings` - Update settings

### Import/Export
- `POST /api/import/buyers` - Bulk import buyers
- `POST /api/import/sellers` - Bulk import sellers
- `GET /api/export/deals` - Export all deals

## Quantum Analysis Engine

The Quantum Analyzer provides sophisticated deal analysis:

### Wholesale Analysis
- **Max Allowable Offer (MAO)**: Calculated using 70% rule
- **Equity Spread**: ARV - Purchase Price - Repairs
- **Assignment Fee Estimate**: Based on equity position
- **Deal Score**: 0-100 weighted score
- **Risk Assessment**: Identifies potential issues
- **Success Probability**: Likelihood of deal closing

### Sub2 Analysis
- **Equity Position**: ARV - Existing Mortgage
- **Monthly/Annual Cashflow**: Rent - Mortgage Payment
- **Cash-on-Cash Return**: Annual cashflow / Investment
- **Due-on-Sale Risk Assessment**: Evaluates lender risk
- **Exit Strategy Analysis**: Multiple exit options rated

### Scoring Factors
- Equity ratio (25%)
- ARV confidence (20%)
- Property condition (15%)
- Seller motivation (15%)
- Location quality (10%)
- Market trend (10%)
- Time on market (5%)

## Usage Guide

### Getting Started

1. **Configure Your Company**
   - Navigate to CompanyHub
   - Enter company profile information
   - Add team members with appropriate roles

2. **Build Your Buyer Database**
   - Go to Buyer Database
   - Add cash buyers with their preferences
   - Import existing contacts via CSV

3. **Analyze Properties**
   - Use Property Analysis module
   - Enter property details
   - Review Quantum Analysis results
   - Save promising properties

4. **Create Deals**
   - Go to Deal Management
   - Create new deal from analyzed property
   - Track through pipeline stages

5. **Monitor Performance**
   - Check Reports & Analytics
   - Review KPIs and metrics
   - Export reports as needed

### Pipeline Stages

**Wholesaling Pipeline:**
Lead → Contact Made → Property Analysis → Under Contract → Marketed → Assigned → Closed

**Sub2 Pipeline:**
Lead → Contact Made → Property Analysis → Terms Negotiation → Due Diligence → Under Contract → Closed

## License

MIT License

## Support

For questions and support, please open an issue on GitHub.

---

**Version**: 2.0.0
**Built for**: Real Estate Wholesalers and Creative Finance Investors
