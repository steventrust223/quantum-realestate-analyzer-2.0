/**
 * DataStore - JSON-based persistent storage for Quantum Real Estate Analyzer
 * Provides CRUD operations for all data entities
 */

const fs = require('fs');
const path = require('path');

class DataStore {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.ensureDataDir();
        this.initializeDataFiles();
    }

    ensureDataDir() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
    }

    initializeDataFiles() {
        const defaultData = {
            'properties.json': { properties: [], lastUpdated: new Date().toISOString() },
            'deals.json': { deals: [], lastUpdated: new Date().toISOString() },
            'buyers.json': { buyers: [], lastUpdated: new Date().toISOString() },
            'sellers.json': { sellers: [], lastUpdated: new Date().toISOString() },
            'team.json': { members: [], roles: this.getDefaultRoles(), lastUpdated: new Date().toISOString() },
            'company.json': { profile: null, settings: this.getDefaultSettings(), lastUpdated: new Date().toISOString() },
            'documents.json': { documents: [], templates: [], lastUpdated: new Date().toISOString() },
            'marketing.json': { campaigns: [], leads: [], lastUpdated: new Date().toISOString() },
            'automation.json': { workflows: [], emailTemplates: this.getDefaultEmailTemplates(), tasks: [], lastUpdated: new Date().toISOString() },
            'analytics.json': { metrics: this.getDefaultMetrics(), reports: [], lastUpdated: new Date().toISOString() },
            'settings.json': { general: this.getDefaultGeneralSettings(), integrations: {}, notifications: {}, lastUpdated: new Date().toISOString() }
        };

        for (const [filename, defaultContent] of Object.entries(defaultData)) {
            const filePath = path.join(this.dataDir, filename);
            if (!fs.existsSync(filePath)) {
                fs.writeFileSync(filePath, JSON.stringify(defaultContent, null, 2));
            }
        }
    }

    getDefaultRoles() {
        return [
            { id: 'admin', name: 'Admin', permissions: ['all'], description: 'Full system access' },
            { id: 'acquisition', name: 'Acquisition Manager', permissions: ['properties', 'sellers', 'deals.create', 'deals.edit'], description: 'Property analysis, seller CRM, contract management' },
            { id: 'disposition', name: 'Disposition Manager', permissions: ['buyers', 'deals.assign', 'deals.close'], description: 'Buyer database, deal assignment, closing coordination' },
            { id: 'marketing', name: 'Marketing', permissions: ['marketing', 'leads'], description: 'Lead generation, campaigns, advertising' },
            { id: 'finance', name: 'Finance', permissions: ['analytics', 'reports', 'expenses'], description: 'Financial dashboard, reporting, expense tracking' }
        ];
    }

    getDefaultSettings() {
        return {
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            timezone: 'America/New_York',
            dealTypes: ['Wholesaling', 'Sub2', 'Creative Finance', 'Fix & Flip'],
            pipelineStages: {
                wholesaling: ['Lead', 'Contact Made', 'Property Analysis', 'Under Contract', 'Marketed', 'Assigned', 'Closed'],
                sub2: ['Lead', 'Contact Made', 'Property Analysis', 'Terms Negotiation', 'Due Diligence', 'Under Contract', 'Closed']
            }
        };
    }

    getDefaultEmailTemplates() {
        return [
            {
                id: 'initial_seller_contact',
                name: 'Initial Seller Contact',
                subject: 'Interested in Your Property at {{address}}',
                body: 'Hello {{sellerName}},\n\nI came across your property at {{address}} and I am interested in discussing a potential purchase.\n\nWould you be available for a brief call this week?\n\nBest regards,\n{{companyName}}'
            },
            {
                id: 'follow_up',
                name: 'Follow-up Email',
                subject: 'Following Up - {{address}}',
                body: 'Hello {{sellerName}},\n\nI wanted to follow up on my previous message regarding your property at {{address}}.\n\nI remain very interested and would love to discuss this further at your convenience.\n\nBest regards,\n{{companyName}}'
            },
            {
                id: 'buyer_notification',
                name: 'New Deal for Buyers',
                subject: 'Hot Deal Alert: {{address}}',
                body: 'Hello {{buyerName}},\n\nWe have a new investment opportunity that matches your criteria:\n\nAddress: {{address}}\nARV: {{arv}}\nAsking Price: {{askingPrice}}\nEstimated Profit: {{profit}}\n\nContact us immediately if interested!\n\nBest regards,\n{{companyName}}'
            },
            {
                id: 'deal_update',
                name: 'Deal Status Update',
                subject: 'Update on {{address}}',
                body: 'Hello {{contactName}},\n\nThis is an update on the property at {{address}}.\n\nNew Status: {{status}}\nNotes: {{notes}}\n\nPlease let us know if you have any questions.\n\nBest regards,\n{{companyName}}'
            }
        ];
    }

    getDefaultMetrics() {
        return {
            totalDeals: 0,
            activeDeals: 0,
            closedDeals: 0,
            totalRevenue: 0,
            totalProfit: 0,
            propertiesAnalyzed: 0,
            activeBuyers: 0,
            activeSellers: 0,
            monthlyRevenue: [],
            dealsByType: { wholesaling: 0, sub2: 0, other: 0 },
            conversionRate: 0,
            avgDealTime: 0
        };
    }

    getDefaultGeneralSettings() {
        return {
            companyName: 'My Real Estate Company',
            email: '',
            phone: '',
            address: '',
            website: '',
            logo: null,
            theme: 'light',
            language: 'en'
        };
    }

    // Generic CRUD operations
    read(filename) {
        const filePath = path.join(this.dataDir, filename);
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error(`Error reading ${filename}:`, error);
            return null;
        }
    }

    write(filename, data) {
        const filePath = path.join(this.dataDir, filename);
        try {
            data.lastUpdated = new Date().toISOString();
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error(`Error writing ${filename}:`, error);
            return false;
        }
    }

    // Properties
    getProperties() {
        return this.read('properties.json')?.properties || [];
    }

    addProperty(property) {
        const data = this.read('properties.json');
        property.id = this.generateId();
        property.createdAt = new Date().toISOString();
        property.updatedAt = new Date().toISOString();
        data.properties.push(property);
        this.write('properties.json', data);
        return property;
    }

    updateProperty(id, updates) {
        const data = this.read('properties.json');
        const index = data.properties.findIndex(p => p.id === id);
        if (index !== -1) {
            data.properties[index] = { ...data.properties[index], ...updates, updatedAt: new Date().toISOString() };
            this.write('properties.json', data);
            return data.properties[index];
        }
        return null;
    }

    deleteProperty(id) {
        const data = this.read('properties.json');
        data.properties = data.properties.filter(p => p.id !== id);
        return this.write('properties.json', data);
    }

    // Deals
    getDeals() {
        return this.read('deals.json')?.deals || [];
    }

    addDeal(deal) {
        const data = this.read('deals.json');
        deal.id = this.generateId();
        deal.createdAt = new Date().toISOString();
        deal.updatedAt = new Date().toISOString();
        deal.history = [{ status: deal.status, timestamp: new Date().toISOString(), note: 'Deal created' }];
        data.deals.push(deal);
        this.write('deals.json', data);
        this.updateMetrics();
        return deal;
    }

    updateDeal(id, updates) {
        const data = this.read('deals.json');
        const index = data.deals.findIndex(d => d.id === id);
        if (index !== -1) {
            const oldStatus = data.deals[index].status;
            data.deals[index] = { ...data.deals[index], ...updates, updatedAt: new Date().toISOString() };
            if (updates.status && updates.status !== oldStatus) {
                data.deals[index].history.push({
                    status: updates.status,
                    timestamp: new Date().toISOString(),
                    note: updates.statusNote || `Status changed from ${oldStatus} to ${updates.status}`
                });
            }
            this.write('deals.json', data);
            this.updateMetrics();
            return data.deals[index];
        }
        return null;
    }

    deleteDeal(id) {
        const data = this.read('deals.json');
        data.deals = data.deals.filter(d => d.id !== id);
        const result = this.write('deals.json', data);
        this.updateMetrics();
        return result;
    }

    // Buyers
    getBuyers() {
        return this.read('buyers.json')?.buyers || [];
    }

    addBuyer(buyer) {
        const data = this.read('buyers.json');
        buyer.id = this.generateId();
        buyer.createdAt = new Date().toISOString();
        buyer.updatedAt = new Date().toISOString();
        buyer.dealHistory = [];
        data.buyers.push(buyer);
        this.write('buyers.json', data);
        this.updateMetrics();
        return buyer;
    }

    updateBuyer(id, updates) {
        const data = this.read('buyers.json');
        const index = data.buyers.findIndex(b => b.id === id);
        if (index !== -1) {
            data.buyers[index] = { ...data.buyers[index], ...updates, updatedAt: new Date().toISOString() };
            this.write('buyers.json', data);
            return data.buyers[index];
        }
        return null;
    }

    deleteBuyer(id) {
        const data = this.read('buyers.json');
        data.buyers = data.buyers.filter(b => b.id !== id);
        const result = this.write('buyers.json', data);
        this.updateMetrics();
        return result;
    }

    // Sellers
    getSellers() {
        return this.read('sellers.json')?.sellers || [];
    }

    addSeller(seller) {
        const data = this.read('sellers.json');
        seller.id = this.generateId();
        seller.createdAt = new Date().toISOString();
        seller.updatedAt = new Date().toISOString();
        data.sellers.push(seller);
        this.write('sellers.json', data);
        this.updateMetrics();
        return seller;
    }

    updateSeller(id, updates) {
        const data = this.read('sellers.json');
        const index = data.sellers.findIndex(s => s.id === id);
        if (index !== -1) {
            data.sellers[index] = { ...data.sellers[index], ...updates, updatedAt: new Date().toISOString() };
            this.write('sellers.json', data);
            return data.sellers[index];
        }
        return null;
    }

    deleteSeller(id) {
        const data = this.read('sellers.json');
        data.sellers = data.sellers.filter(s => s.id !== id);
        const result = this.write('sellers.json', data);
        this.updateMetrics();
        return result;
    }

    // Team
    getTeam() {
        return this.read('team.json');
    }

    addTeamMember(member) {
        const data = this.read('team.json');
        member.id = this.generateId();
        member.createdAt = new Date().toISOString();
        member.status = 'active';
        data.members.push(member);
        this.write('team.json', data);
        return member;
    }

    updateTeamMember(id, updates) {
        const data = this.read('team.json');
        const index = data.members.findIndex(m => m.id === id);
        if (index !== -1) {
            data.members[index] = { ...data.members[index], ...updates };
            this.write('team.json', data);
            return data.members[index];
        }
        return null;
    }

    deleteTeamMember(id) {
        const data = this.read('team.json');
        data.members = data.members.filter(m => m.id !== id);
        return this.write('team.json', data);
    }

    // Company
    getCompany() {
        return this.read('company.json');
    }

    updateCompany(updates) {
        const data = this.read('company.json');
        if (updates.profile) {
            data.profile = { ...data.profile, ...updates.profile };
        }
        if (updates.settings) {
            data.settings = { ...data.settings, ...updates.settings };
        }
        return this.write('company.json', data);
    }

    // Documents
    getDocuments() {
        return this.read('documents.json');
    }

    addDocument(document) {
        const data = this.read('documents.json');
        document.id = this.generateId();
        document.uploadedAt = new Date().toISOString();
        data.documents.push(document);
        this.write('documents.json', data);
        return document;
    }

    // Marketing
    getMarketing() {
        return this.read('marketing.json');
    }

    addCampaign(campaign) {
        const data = this.read('marketing.json');
        campaign.id = this.generateId();
        campaign.createdAt = new Date().toISOString();
        campaign.status = 'active';
        data.campaigns.push(campaign);
        this.write('marketing.json', data);
        return campaign;
    }

    addLead(lead) {
        const data = this.read('marketing.json');
        lead.id = this.generateId();
        lead.createdAt = new Date().toISOString();
        lead.status = 'new';
        data.leads.push(lead);
        this.write('marketing.json', data);
        return lead;
    }

    // Automation
    getAutomation() {
        return this.read('automation.json');
    }

    addWorkflow(workflow) {
        const data = this.read('automation.json');
        workflow.id = this.generateId();
        workflow.createdAt = new Date().toISOString();
        workflow.status = 'active';
        data.workflows.push(workflow);
        this.write('automation.json', data);
        return workflow;
    }

    addTask(task) {
        const data = this.read('automation.json');
        task.id = this.generateId();
        task.createdAt = new Date().toISOString();
        task.status = 'pending';
        data.tasks.push(task);
        this.write('automation.json', data);
        return task;
    }

    updateTask(id, updates) {
        const data = this.read('automation.json');
        const index = data.tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            data.tasks[index] = { ...data.tasks[index], ...updates };
            this.write('automation.json', data);
            return data.tasks[index];
        }
        return null;
    }

    // Analytics & Metrics
    getAnalytics() {
        return this.read('analytics.json');
    }

    updateMetrics() {
        const deals = this.getDeals();
        const buyers = this.getBuyers();
        const sellers = this.getSellers();
        const properties = this.getProperties();

        const analytics = this.read('analytics.json');

        analytics.metrics.totalDeals = deals.length;
        analytics.metrics.activeDeals = deals.filter(d => d.status !== 'Closed' && d.status !== 'Lost').length;
        analytics.metrics.closedDeals = deals.filter(d => d.status === 'Closed').length;
        analytics.metrics.totalRevenue = deals.filter(d => d.status === 'Closed').reduce((sum, d) => sum + (d.assignmentFee || d.profit || 0), 0);
        analytics.metrics.totalProfit = deals.filter(d => d.status === 'Closed').reduce((sum, d) => sum + (d.profit || 0), 0);
        analytics.metrics.propertiesAnalyzed = properties.length;
        analytics.metrics.activeBuyers = buyers.filter(b => b.status === 'active').length;
        analytics.metrics.activeSellers = sellers.filter(s => s.status === 'active').length;

        analytics.metrics.dealsByType = {
            wholesaling: deals.filter(d => d.type === 'Wholesaling').length,
            sub2: deals.filter(d => d.type === 'Sub2').length,
            other: deals.filter(d => !['Wholesaling', 'Sub2'].includes(d.type)).length
        };

        // Calculate conversion rate
        const totalLeads = deals.length;
        const closedDeals = analytics.metrics.closedDeals;
        analytics.metrics.conversionRate = totalLeads > 0 ? ((closedDeals / totalLeads) * 100).toFixed(1) : 0;

        this.write('analytics.json', analytics);
        return analytics.metrics;
    }

    // Settings
    getSettings() {
        return this.read('settings.json');
    }

    updateSettings(updates) {
        const data = this.read('settings.json');
        Object.assign(data, updates);
        return this.write('settings.json', data);
    }

    // Utility
    generateId() {
        return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get dashboard summary
    getDashboardSummary() {
        const metrics = this.updateMetrics();
        const deals = this.getDeals();
        const recentDeals = deals.slice(-5).reverse();

        return {
            metrics,
            recentDeals,
            pendingTasks: this.read('automation.json')?.tasks.filter(t => t.status === 'pending').length || 0,
            timestamp: new Date().toISOString()
        };
    }
}

module.exports = new DataStore();
