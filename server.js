/**
 * Quantum Real Estate Analyzer v2.0 - Server
 * Express API Server with all backend functionality
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const dataStore = require('./models/DataStore');
const quantumAnalyzer = require('./utils/QuantumAnalyzer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve control center as default
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'control-center.html'));
});

// ============================================
// DASHBOARD API
// ============================================

app.get('/api/dashboard', (req, res) => {
    try {
        const summary = dataStore.getDashboardSummary();
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// PROPERTY ANALYSIS API
// ============================================

app.get('/api/properties', (req, res) => {
    try {
        const properties = dataStore.getProperties();
        res.json({ success: true, data: properties });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/properties/:id', (req, res) => {
    try {
        const properties = dataStore.getProperties();
        const property = properties.find(p => p.id === req.params.id);
        if (property) {
            res.json({ success: true, data: property });
        } else {
            res.status(404).json({ success: false, error: 'Property not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/properties', (req, res) => {
    try {
        const property = dataStore.addProperty(req.body);
        res.json({ success: true, data: property });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/properties/:id', (req, res) => {
    try {
        const property = dataStore.updateProperty(req.params.id, req.body);
        if (property) {
            res.json({ success: true, data: property });
        } else {
            res.status(404).json({ success: false, error: 'Property not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/properties/:id', (req, res) => {
    try {
        const success = dataStore.deleteProperty(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Quantum Analysis endpoints
app.post('/api/analyze/wholesale', (req, res) => {
    try {
        const analysis = quantumAnalyzer.analyzeWholesaleDeal(req.body);
        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/analyze/sub2', (req, res) => {
    try {
        const analysis = quantumAnalyzer.analyzeSub2Deal(req.body);
        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/analyze/arv', (req, res) => {
    try {
        const { property, comps } = req.body;
        const analysis = quantumAnalyzer.calculateARV(property, comps);
        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/analyze/repairs', (req, res) => {
    try {
        const estimate = quantumAnalyzer.estimateRepairCosts(req.body);
        res.json({ success: true, data: estimate });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/analyze/market', (req, res) => {
    try {
        const analysis = quantumAnalyzer.analyzeMarket(req.body.location);
        res.json({ success: true, data: analysis });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DEALS API
// ============================================

app.get('/api/deals', (req, res) => {
    try {
        let deals = dataStore.getDeals();

        // Filter by status if provided
        if (req.query.status) {
            deals = deals.filter(d => d.status === req.query.status);
        }

        // Filter by type if provided
        if (req.query.type) {
            deals = deals.filter(d => d.type === req.query.type);
        }

        res.json({ success: true, data: deals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/deals/:id', (req, res) => {
    try {
        const deals = dataStore.getDeals();
        const deal = deals.find(d => d.id === req.params.id);
        if (deal) {
            res.json({ success: true, data: deal });
        } else {
            res.status(404).json({ success: false, error: 'Deal not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/deals', (req, res) => {
    try {
        const deal = dataStore.addDeal(req.body);
        res.json({ success: true, data: deal });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/deals/:id', (req, res) => {
    try {
        const deal = dataStore.updateDeal(req.params.id, req.body);
        if (deal) {
            res.json({ success: true, data: deal });
        } else {
            res.status(404).json({ success: false, error: 'Deal not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/deals/:id', (req, res) => {
    try {
        const success = dataStore.deleteDeal(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Pipeline endpoints
app.get('/api/deals/pipeline/:type', (req, res) => {
    try {
        const deals = dataStore.getDeals();
        const company = dataStore.getCompany();
        const pipelineType = req.params.type.toLowerCase();
        const stages = company.settings.pipelineStages[pipelineType] || [];

        const pipeline = stages.map(stage => ({
            stage,
            deals: deals.filter(d => d.type?.toLowerCase() === pipelineType && d.status === stage)
        }));

        res.json({ success: true, data: pipeline });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// BUYERS API
// ============================================

app.get('/api/buyers', (req, res) => {
    try {
        let buyers = dataStore.getBuyers();

        if (req.query.status) {
            buyers = buyers.filter(b => b.status === req.query.status);
        }

        res.json({ success: true, data: buyers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/buyers/:id', (req, res) => {
    try {
        const buyers = dataStore.getBuyers();
        const buyer = buyers.find(b => b.id === req.params.id);
        if (buyer) {
            res.json({ success: true, data: buyer });
        } else {
            res.status(404).json({ success: false, error: 'Buyer not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/buyers', (req, res) => {
    try {
        const buyer = dataStore.addBuyer(req.body);
        res.json({ success: true, data: buyer });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/buyers/:id', (req, res) => {
    try {
        const buyer = dataStore.updateBuyer(req.params.id, req.body);
        if (buyer) {
            res.json({ success: true, data: buyer });
        } else {
            res.status(404).json({ success: false, error: 'Buyer not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/buyers/:id', (req, res) => {
    try {
        const success = dataStore.deleteBuyer(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Match buyers to deals
app.post('/api/buyers/match', (req, res) => {
    try {
        const { dealCriteria } = req.body;
        const buyers = dataStore.getBuyers().filter(b => b.status === 'active');

        const matchedBuyers = buyers.filter(buyer => {
            // Match based on criteria
            const priceMatch = !buyer.maxPrice || buyer.maxPrice >= dealCriteria.askingPrice;
            const typeMatch = !buyer.preferredTypes || buyer.preferredTypes.includes(dealCriteria.propertyType);
            const locationMatch = !buyer.preferredLocations || buyer.preferredLocations.some(loc =>
                dealCriteria.location?.toLowerCase().includes(loc.toLowerCase())
            );

            return priceMatch && typeMatch && locationMatch;
        });

        res.json({ success: true, data: matchedBuyers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SELLERS API
// ============================================

app.get('/api/sellers', (req, res) => {
    try {
        const sellers = dataStore.getSellers();
        res.json({ success: true, data: sellers });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/sellers/:id', (req, res) => {
    try {
        const sellers = dataStore.getSellers();
        const seller = sellers.find(s => s.id === req.params.id);
        if (seller) {
            res.json({ success: true, data: seller });
        } else {
            res.status(404).json({ success: false, error: 'Seller not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/sellers', (req, res) => {
    try {
        const seller = dataStore.addSeller(req.body);
        res.json({ success: true, data: seller });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/sellers/:id', (req, res) => {
    try {
        const seller = dataStore.updateSeller(req.params.id, req.body);
        if (seller) {
            res.json({ success: true, data: seller });
        } else {
            res.status(404).json({ success: false, error: 'Seller not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/sellers/:id', (req, res) => {
    try {
        const success = dataStore.deleteSeller(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// TEAM API (CompanyHub)
// ============================================

app.get('/api/team', (req, res) => {
    try {
        const team = dataStore.getTeam();
        res.json({ success: true, data: team });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/team/members', (req, res) => {
    try {
        const member = dataStore.addTeamMember(req.body);
        res.json({ success: true, data: member });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/team/members/:id', (req, res) => {
    try {
        const member = dataStore.updateTeamMember(req.params.id, req.body);
        if (member) {
            res.json({ success: true, data: member });
        } else {
            res.status(404).json({ success: false, error: 'Team member not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/team/members/:id', (req, res) => {
    try {
        const success = dataStore.deleteTeamMember(req.params.id);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// COMPANY API (CompanyHub)
// ============================================

app.get('/api/company', (req, res) => {
    try {
        const company = dataStore.getCompany();
        res.json({ success: true, data: company });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/company', (req, res) => {
    try {
        const success = dataStore.updateCompany(req.body);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// DOCUMENTS API
// ============================================

app.get('/api/documents', (req, res) => {
    try {
        const documents = dataStore.getDocuments();
        res.json({ success: true, data: documents });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/documents', (req, res) => {
    try {
        const document = dataStore.addDocument(req.body);
        res.json({ success: true, data: document });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// MARKETING API
// ============================================

app.get('/api/marketing', (req, res) => {
    try {
        const marketing = dataStore.getMarketing();
        res.json({ success: true, data: marketing });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/marketing/campaigns', (req, res) => {
    try {
        const marketing = dataStore.getMarketing();
        res.json({ success: true, data: marketing.campaigns });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/marketing/campaigns', (req, res) => {
    try {
        const campaign = dataStore.addCampaign(req.body);
        res.json({ success: true, data: campaign });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/marketing/leads', (req, res) => {
    try {
        const marketing = dataStore.getMarketing();
        res.json({ success: true, data: marketing.leads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/marketing/leads', (req, res) => {
    try {
        const lead = dataStore.addLead(req.body);
        res.json({ success: true, data: lead });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AUTOMATION API
// ============================================

app.get('/api/automation', (req, res) => {
    try {
        const automation = dataStore.getAutomation();
        res.json({ success: true, data: automation });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/automation/workflows', (req, res) => {
    try {
        const automation = dataStore.getAutomation();
        res.json({ success: true, data: automation.workflows });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/automation/workflows', (req, res) => {
    try {
        const workflow = dataStore.addWorkflow(req.body);
        res.json({ success: true, data: workflow });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/automation/tasks', (req, res) => {
    try {
        const automation = dataStore.getAutomation();
        let tasks = automation.tasks;

        if (req.query.status) {
            tasks = tasks.filter(t => t.status === req.query.status);
        }

        res.json({ success: true, data: tasks });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/automation/tasks', (req, res) => {
    try {
        const task = dataStore.addTask(req.body);
        res.json({ success: true, data: task });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/automation/tasks/:id', (req, res) => {
    try {
        const task = dataStore.updateTask(req.params.id, req.body);
        if (task) {
            res.json({ success: true, data: task });
        } else {
            res.status(404).json({ success: false, error: 'Task not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/automation/templates', (req, res) => {
    try {
        const automation = dataStore.getAutomation();
        res.json({ success: true, data: automation.emailTemplates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// ANALYTICS & REPORTS API
// ============================================

app.get('/api/analytics', (req, res) => {
    try {
        const analytics = dataStore.getAnalytics();
        res.json({ success: true, data: analytics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/analytics/metrics', (req, res) => {
    try {
        const metrics = dataStore.updateMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/reports/summary', (req, res) => {
    try {
        const deals = dataStore.getDeals();
        const buyers = dataStore.getBuyers();
        const sellers = dataStore.getSellers();
        const properties = dataStore.getProperties();

        const report = {
            period: req.query.period || 'all-time',
            generatedAt: new Date().toISOString(),
            deals: {
                total: deals.length,
                active: deals.filter(d => !['Closed', 'Lost'].includes(d.status)).length,
                closed: deals.filter(d => d.status === 'Closed').length,
                lost: deals.filter(d => d.status === 'Lost').length,
                byType: {
                    wholesaling: deals.filter(d => d.type === 'Wholesaling').length,
                    sub2: deals.filter(d => d.type === 'Sub2').length,
                    other: deals.filter(d => !['Wholesaling', 'Sub2'].includes(d.type)).length
                }
            },
            revenue: {
                total: deals.filter(d => d.status === 'Closed').reduce((sum, d) => sum + (d.assignmentFee || d.profit || 0), 0),
                avgDealSize: deals.filter(d => d.status === 'Closed').length > 0
                    ? deals.filter(d => d.status === 'Closed').reduce((sum, d) => sum + (d.assignmentFee || d.profit || 0), 0) / deals.filter(d => d.status === 'Closed').length
                    : 0
            },
            contacts: {
                totalBuyers: buyers.length,
                activeBuyers: buyers.filter(b => b.status === 'active').length,
                totalSellers: sellers.length,
                activeSellers: sellers.filter(s => s.status === 'active').length
            },
            properties: {
                total: properties.length,
                analyzed: properties.filter(p => p.analysis).length
            }
        };

        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SETTINGS API
// ============================================

app.get('/api/settings', (req, res) => {
    try {
        const settings = dataStore.getSettings();
        res.json({ success: true, data: settings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.put('/api/settings', (req, res) => {
    try {
        const success = dataStore.updateSettings(req.body);
        res.json({ success });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// IMPORT/EXPORT API
// ============================================

app.post('/api/import/buyers', (req, res) => {
    try {
        const { buyers } = req.body;
        const imported = buyers.map(buyer => dataStore.addBuyer(buyer));
        res.json({ success: true, data: { imported: imported.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/import/sellers', (req, res) => {
    try {
        const { sellers } = req.body;
        const imported = sellers.map(seller => dataStore.addSeller(seller));
        res.json({ success: true, data: { imported: imported.length } });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/export/deals', (req, res) => {
    try {
        const deals = dataStore.getDeals();
        res.json({ success: true, data: deals });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// SPEED-TO-LEAD API
// ============================================

// Get Speed-to-Lead Dashboard data
app.get('/api/speed-to-lead/dashboard', (req, res) => {
    try {
        const dashboard = dataStore.getSpeedToLeadDashboard();
        res.json({ success: true, data: dashboard });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get urgent leads requiring immediate attention
app.get('/api/speed-to-lead/urgent', (req, res) => {
    try {
        const urgentLeads = dataStore.getUrgentLeads();
        res.json({ success: true, data: urgentLeads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get speed-to-lead metrics
app.get('/api/speed-to-lead/metrics', (req, res) => {
    try {
        const metrics = dataStore.updateSpeedToLeadMetrics();
        res.json({ success: true, data: metrics });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record manual lead response
app.post('/api/leads/:id/respond', (req, res) => {
    try {
        const lead = dataStore.respondToLead(req.params.id, req.body);
        if (lead) {
            res.json({ success: true, data: lead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send auto-response to lead
app.post('/api/leads/:id/auto-respond', (req, res) => {
    try {
        const { templateId } = req.body;
        const lead = dataStore.sendAutoResponse(req.params.id, templateId);
        if (lead) {
            res.json({ success: true, data: lead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update lead
app.put('/api/leads/:id', (req, res) => {
    try {
        const lead = dataStore.updateLead(req.params.id, req.body);
        if (lead) {
            res.json({ success: true, data: lead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get single lead
app.get('/api/leads/:id', (req, res) => {
    try {
        const marketing = dataStore.getMarketing();
        const lead = marketing.leads.find(l => l.id === req.params.id);
        if (lead) {
            res.json({ success: true, data: lead });
        } else {
            res.status(404).json({ success: false, error: 'Lead not found' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Bulk auto-response to pending leads
app.post('/api/speed-to-lead/bulk-respond', (req, res) => {
    try {
        const { templateId, maxLeads } = req.body;
        const urgentLeads = dataStore.getUrgentLeads();
        const leadsToRespond = urgentLeads.slice(0, maxLeads || 10);

        const responses = leadsToRespond.map(lead => {
            return dataStore.sendAutoResponse(lead.id, templateId);
        }).filter(Boolean);

        res.json({
            success: true,
            data: {
                responded: responses.length,
                leads: responses
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get lead response templates for auto-response
app.get('/api/speed-to-lead/templates', (req, res) => {
    try {
        const automation = dataStore.getAutomation();
        const templates = automation.emailTemplates.filter(t =>
            t.category === 'lead-response' || t.type === 'auto-response'
        );
        res.json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add lead response template
app.post('/api/speed-to-lead/templates', (req, res) => {
    try {
        const template = {
            ...req.body,
            category: 'lead-response',
            type: 'auto-response'
        };
        const automation = dataStore.getAutomation();
        template.id = dataStore.generateId();
        template.createdAt = new Date().toISOString();
        automation.emailTemplates.push(template);
        dataStore.write('automation.json', automation);
        res.json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get speed-to-lead settings
app.get('/api/speed-to-lead/settings', (req, res) => {
    try {
        const settings = dataStore.getSettings();
        const speedSettings = settings.speedToLead || {
            enabled: true,
            autoResponseEnabled: false,
            defaultTemplateId: null,
            alertThresholds: {
                hot: 5,      // minutes
                warm: 15,    // minutes
                cooling: 30, // minutes
                cold: 60     // minutes
            },
            notifications: {
                email: true,
                sms: false,
                browser: true
            },
            workingHours: {
                enabled: false,
                start: '09:00',
                end: '18:00',
                timezone: 'America/New_York'
            }
        };
        res.json({ success: true, data: speedSettings });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update speed-to-lead settings
app.put('/api/speed-to-lead/settings', (req, res) => {
    try {
        const settings = dataStore.getSettings();
        settings.speedToLead = {
            ...settings.speedToLead,
            ...req.body
        };
        dataStore.updateSettings(settings);
        res.json({ success: true, data: settings.speedToLead });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Quantum Real Estate Analyzer v2.0 - Server Running        ║
╠═══════════════════════════════════════════════════════════════╣
║  Control Center: http://localhost:${PORT}                        ║
║  API Base URL:   http://localhost:${PORT}/api                    ║
╚═══════════════════════════════════════════════════════════════╝
    `);
});

module.exports = app;
