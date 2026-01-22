# Quantum Real Estate Analyzer v2.0

**Ultimate Wholesaling & Sub2 Real Estate Analysis System**

A professional-grade, browser-based platform for real estate investors specializing in wholesaling and Subject-To (Sub2) strategies. Built for efficiency, reliability, and ease of use.

---

## Features

### Dashboard
- **Real-time Statistics**: Track active deals, revenue, properties analyzed, and buyer count
- **Quick Actions**: One-click access to all major functions
- **Recent Activity Feed**: Stay updated on deal progress
- **Responsive Design**: Works on desktop, tablet, and mobile

### Property Analyzer
- **Wholesale Analysis**: Calculate MAO (Maximum Allowable Offer) using 70/75/80% rules
- **Sub2 Analysis**: Evaluate Subject-To deals with equity and cash flow projections
- **Deal Scoring**: Automated 1-10 scoring with PURSUE/NEGOTIATE/PASS recommendations
- **ROI Calculations**: Instant buyer profit and return on investment metrics

### Deal Calculator (Workbook)
- **Quick MAO Calculator**: Instant calculations as you type
- **Mortgage Payment Calculator**: P&I calculations for any loan scenario
- **Formula Reference**: Quick access to essential real estate formulas

### Deal Pipeline
- **Full CRUD Operations**: Add, view, and manage all your deals
- **Status Tracking**: Active, Pending, and Closed deal management
- **Type Classification**: Separate tracking for Wholesale and Sub2 deals

### Buyer Database
- **Contact Management**: Store buyer information with full details
- **Budget Tracking**: Know each buyer's max purchase capacity
- **Area Preferences**: Match buyers to properties by location
- **Buyer Types**: Cash, Hard Money, and Conventional classifications

### Data Management
- **Local Storage**: All data persists in browser storage
- **Export Function**: Download your data as JSON anytime
- **Demo Mode**: Reset to sample data for testing

---

## Quick Start

### Option 1: Open Directly
Simply open `public/index.html` in your web browser.

```bash
# From project root
open public/index.html
# or
xdg-open public/index.html  # Linux
start public/index.html     # Windows
```

### Option 2: Use a Local Server
```bash
# Using Node.js serve package
npx serve public -p 3000

# Then visit http://localhost:3000
```

### Option 3: Python SimpleHTTPServer
```bash
cd public
python -m http.server 3000

# Then visit http://localhost:3000
```

---

## Project Structure

```
quantum-realestate-analyzer-2.0/
├── public/
│   ├── index.html          # Main application (start here)
│   ├── css/
│   │   └── styles.css      # Modern CSS framework
│   ├── js/
│   │   └── app.js          # Application logic & calculators
│   └── assets/             # Images, icons (if needed)
├── src/                    # Source files for future backend
│   ├── modules/            # Feature modules
│   └── utils/              # Utility functions
├── docs/                   # Additional documentation
├── control-center.html     # Legacy dashboard (reference)
├── COMPANYHUB_SETUP.md     # CompanyHub configuration guide
├── package.json            # Project configuration
└── README.md               # This file
```

---

## Usage Guide

### Analyzing a Wholesale Deal

1. Navigate to **Property Analyzer** from the sidebar
2. Select the **Wholesale Analysis** tab
3. Enter:
   - **ARV** (After Repair Value): What the property will be worth after repairs
   - **Estimated Repairs**: Total rehab cost estimate
   - **Purchase Price**: Your contracted purchase price
   - **Closing/Holding Costs**: Optional additional costs
4. Click **Analyze Deal**
5. Review results:
   - MAO at 70% and 75%
   - Your potential assignment fee
   - Buyer's projected profit and ROI
   - Deal score and recommendation

### Analyzing a Sub2 Deal

1. Navigate to **Property Analyzer**
2. Select the **Subject-To Analysis** tab
3. Enter:
   - **Property Value (ARV)**
   - **Existing Mortgage Balance**
   - **Monthly Payment (PITI)**
   - **Fair Market Rent**
4. Click **Analyze Sub2 Deal**
5. Review equity position, monthly cash flow, and deal viability

### Managing Your Pipeline

1. Click **+ New Deal** or navigate to **Deals Pipeline**
2. Fill in property details, type, and status
3. View all deals in the pipeline table
4. Track progress from Active to Closed

### Building Your Buyer List

1. Navigate to **Buyer Database**
2. Click **+ Add Buyer**
3. Enter buyer details, budget, and preferred areas
4. Use this database to quickly match properties to buyers

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Focus search box |
| `Escape` | Close any open modal |

---

## Formulas Reference

### Wholesale Formulas

```
MAO (70%) = ARV × 0.70 - Repair Costs
MAO (75%) = ARV × 0.75 - Repair Costs
Assignment Fee = MAO - Purchase Price
Buyer Profit = ARV - (Purchase + Repairs + Closing + Holding)
Buyer ROI = (Buyer Profit / Total Investment) × 100
```

### Sub2 Formulas

```
Equity Position = Property Value - Mortgage Balance
Monthly Cash Flow = Rent - Monthly Payment (PITI)
Annual Cash Flow = Monthly Cash Flow × 12
Cash on Cash Return = (Annual Cash Flow / Cash Invested) × 100
```

### General Real Estate

```
Cap Rate = Net Operating Income / Property Value
GRM (Gross Rent Multiplier) = Property Price / Annual Gross Rent
DSCR (Debt Service Coverage Ratio) = NOI / Annual Debt Service
```

---

## Technical Details

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Technologies Used
- **HTML5**: Semantic markup with accessibility features
- **CSS3**: Custom properties, Grid, Flexbox, animations
- **JavaScript (ES6+)**: Modules, async/await, destructuring
- **LocalStorage API**: Client-side data persistence

### Performance
- No external dependencies required
- Instant load times
- Responsive UI updates
- Efficient DOM manipulation

---

## Configuration

### Customizing Sample Data

Edit the `SampleData` object in `public/js/app.js` to change default demo data:

```javascript
const SampleData = {
  deals: [
    { id: 1, address: '123 Your Street', ... },
    // Add your own sample deals
  ],
  buyers: [
    { id: 1, name: 'Your Buyer', ... },
    // Add your own sample buyers
  ]
};
```

### Styling Customization

Modify CSS variables in `public/css/styles.css`:

```css
:root {
  --primary-color: #667eea;      /* Main brand color */
  --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --success: #10b981;            /* Success/positive color */
  --warning: #f59e0b;            /* Warning color */
  --danger: #ef4444;             /* Error/danger color */
}
```

---

## Roadmap

### Planned Features
- [ ] Backend API integration
- [ ] Cloud data sync
- [ ] Multi-user support
- [ ] Advanced reporting & charts
- [ ] Email/SMS automation
- [ ] MLS data integration
- [ ] Document management
- [ ] Mobile app (PWA)

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## Support

- **Documentation**: See `COMPANYHUB_SETUP.md` for module setup
- **Issues**: Report bugs via GitHub Issues
- **Email**: support@quantum-realestate.com

---

## License

MIT License - See LICENSE file for details.

---

**Built with precision for real estate professionals.**

*Quantum Real Estate Analyzer v2.0*
