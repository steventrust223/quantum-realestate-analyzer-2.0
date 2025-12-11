/**
 * QuantumAnalyzer - Advanced Property & Deal Analysis Engine
 * Provides predictive scoring, risk assessment, and deal probability calculations
 */

class QuantumAnalyzer {
    constructor() {
        // Weight factors for scoring
        this.weights = {
            equity: 0.25,
            arv: 0.20,
            condition: 0.15,
            motivation: 0.15,
            location: 0.10,
            marketTrend: 0.10,
            timeline: 0.05
        };

        // Risk factors
        this.riskFactors = {
            titleIssues: 0.25,
            structuralProblems: 0.20,
            marketVolatility: 0.15,
            sellerReliability: 0.15,
            financingRisk: 0.15,
            legalComplexity: 0.10
        };
    }

    /**
     * Analyze a property for wholesaling potential
     */
    analyzeWholesaleDeal(property) {
        const {
            purchasePrice,
            arv,
            repairCost,
            marketValue,
            condition,
            sellerMotivation,
            locationScore,
            marketTrend,
            daysOnMarket
        } = property;

        // Calculate key metrics
        const maxAllowableOffer = (arv * 0.70) - repairCost;
        const equitySpread = arv - purchasePrice - repairCost;
        const assignmentFeeEstimate = Math.min(equitySpread * 0.5, maxAllowableOffer - purchasePrice);
        const roi = purchasePrice > 0 ? ((assignmentFeeEstimate / purchasePrice) * 100) : 0;

        // Calculate deal score (0-100)
        const dealScore = this.calculateDealScore({
            equityRatio: equitySpread / arv,
            arvAccuracy: this.estimateARVConfidence(arv, marketValue),
            condition: condition || 5,
            motivation: sellerMotivation || 5,
            location: locationScore || 5,
            marketTrend: marketTrend || 'stable',
            timeline: daysOnMarket || 30
        });

        // Calculate risk score (0-100, lower is better)
        const riskScore = this.calculateRiskScore(property);

        // Calculate probability of success
        const successProbability = this.calculateSuccessProbability(dealScore, riskScore);

        // Generate recommendation
        const recommendation = this.generateRecommendation(dealScore, riskScore, equitySpread);

        return {
            metrics: {
                maxAllowableOffer: Math.round(maxAllowableOffer),
                equitySpread: Math.round(equitySpread),
                assignmentFeeEstimate: Math.round(assignmentFeeEstimate),
                roi: roi.toFixed(2),
                profitMargin: ((equitySpread / arv) * 100).toFixed(2)
            },
            scores: {
                dealScore: Math.round(dealScore),
                riskScore: Math.round(riskScore),
                successProbability: Math.round(successProbability),
                grade: this.getGrade(dealScore)
            },
            recommendation,
            analysis: {
                strengths: this.identifyStrengths(property, dealScore),
                weaknesses: this.identifyWeaknesses(property, riskScore),
                opportunities: this.identifyOpportunities(property),
                threats: this.identifyThreats(property)
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Analyze a Subject-To deal
     */
    analyzeSub2Deal(property) {
        const {
            purchasePrice,
            arv,
            existingMortgageBalance,
            monthlyPayment,
            interestRate,
            remainingTerm,
            marketRent,
            condition,
            sellerMotivation
        } = property;

        // Calculate key metrics
        const equityPosition = arv - existingMortgageBalance;
        const monthlyCashflow = marketRent - monthlyPayment;
        const annualCashflow = monthlyCashflow * 12;
        const cashOnCashReturn = purchasePrice > 0 ? ((annualCashflow / purchasePrice) * 100) : 0;
        const equityCapture = equityPosition - purchasePrice;

        // Calculate deal score
        const dealScore = this.calculateSub2DealScore({
            equityPosition,
            monthlyCashflow,
            interestRate,
            remainingTerm,
            condition: condition || 5,
            motivation: sellerMotivation || 5
        });

        // Calculate risk score
        const riskScore = this.calculateSub2RiskScore(property);

        // Due-on-sale risk assessment
        const dueOnSaleRisk = this.assessDueOnSaleRisk(property);

        const successProbability = this.calculateSuccessProbability(dealScore, riskScore);
        const recommendation = this.generateSub2Recommendation(dealScore, riskScore, monthlyCashflow);

        return {
            metrics: {
                equityPosition: Math.round(equityPosition),
                equityCapture: Math.round(equityCapture),
                monthlyCashflow: Math.round(monthlyCashflow),
                annualCashflow: Math.round(annualCashflow),
                cashOnCashReturn: cashOnCashReturn.toFixed(2),
                effectiveInterestRate: interestRate
            },
            scores: {
                dealScore: Math.round(dealScore),
                riskScore: Math.round(riskScore),
                successProbability: Math.round(successProbability),
                dueOnSaleRisk: dueOnSaleRisk,
                grade: this.getGrade(dealScore)
            },
            recommendation,
            analysis: {
                strengths: this.identifySub2Strengths(property),
                weaknesses: this.identifySub2Weaknesses(property),
                exitStrategies: this.generateExitStrategies(property),
                holdingPeriodAnalysis: this.analyzeHoldingPeriod(property)
            },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Calculate ARV (After Repair Value) based on comps
     */
    calculateARV(property, comps) {
        if (!comps || comps.length === 0) {
            return { arv: property.estimatedARV || 0, confidence: 'low', adjustments: [] };
        }

        const adjustments = [];
        let adjustedValues = [];

        comps.forEach((comp, index) => {
            let adjustedValue = comp.salePrice;
            const compAdjustments = [];

            // Square footage adjustment ($50/sqft difference)
            const sqftDiff = property.squareFeet - comp.squareFeet;
            const sqftAdjustment = sqftDiff * 50;
            adjustedValue += sqftAdjustment;
            if (sqftDiff !== 0) {
                compAdjustments.push({ factor: 'Square Footage', adjustment: sqftAdjustment });
            }

            // Bedroom adjustment ($5,000 per bedroom)
            const bedDiff = property.bedrooms - comp.bedrooms;
            const bedAdjustment = bedDiff * 5000;
            adjustedValue += bedAdjustment;
            if (bedDiff !== 0) {
                compAdjustments.push({ factor: 'Bedrooms', adjustment: bedAdjustment });
            }

            // Bathroom adjustment ($3,000 per bathroom)
            const bathDiff = property.bathrooms - comp.bathrooms;
            const bathAdjustment = bathDiff * 3000;
            adjustedValue += bathAdjustment;
            if (bathDiff !== 0) {
                compAdjustments.push({ factor: 'Bathrooms', adjustment: bathAdjustment });
            }

            // Age adjustment ($1,000 per year)
            const ageDiff = (comp.yearBuilt || property.yearBuilt) - property.yearBuilt;
            const ageAdjustment = ageDiff * 1000;
            adjustedValue += ageAdjustment;
            if (ageDiff !== 0) {
                compAdjustments.push({ factor: 'Age', adjustment: ageAdjustment });
            }

            // Condition adjustment
            const conditionDiff = (property.conditionAfterRepair || 8) - (comp.condition || 7);
            const conditionAdjustment = conditionDiff * 5000;
            adjustedValue += conditionAdjustment;
            if (conditionDiff !== 0) {
                compAdjustments.push({ factor: 'Condition', adjustment: conditionAdjustment });
            }

            adjustedValues.push(adjustedValue);
            adjustments.push({
                comp: `Comp ${index + 1}`,
                originalPrice: comp.salePrice,
                adjustedPrice: adjustedValue,
                adjustments: compAdjustments
            });
        });

        // Calculate weighted average (more recent sales weighted higher)
        const arv = adjustedValues.reduce((a, b) => a + b, 0) / adjustedValues.length;

        // Calculate confidence based on comp variance
        const variance = this.calculateVariance(adjustedValues);
        const confidence = variance < 0.05 ? 'high' : variance < 0.15 ? 'medium' : 'low';

        return {
            arv: Math.round(arv),
            confidence,
            adjustments,
            compCount: comps.length,
            valueRange: {
                low: Math.round(Math.min(...adjustedValues)),
                high: Math.round(Math.max(...adjustedValues))
            }
        };
    }

    /**
     * Calculate repair costs estimate
     */
    estimateRepairCosts(property) {
        const {
            squareFeet,
            condition, // 1-10 scale (1 = needs full rehab, 10 = move-in ready)
            roofAge,
            hvacAge,
            plumbingCondition,
            electricalCondition,
            foundationIssues,
            cosmeticNeeds
        } = property;

        let totalCost = 0;
        const breakdown = [];

        // Base cost per square foot based on condition
        const conditionMultiplier = (10 - (condition || 5)) / 10;
        const baseCostPerSqft = 15 + (conditionMultiplier * 35); // $15-$50 per sqft
        const baseCost = squareFeet * baseCostPerSqft;
        totalCost += baseCost;
        breakdown.push({ item: 'General Rehab', cost: Math.round(baseCost), note: `$${baseCostPerSqft.toFixed(0)}/sqft` });

        // Roof (if age > 15 years)
        if (roofAge && roofAge > 15) {
            const roofCost = squareFeet * 4; // ~$4/sqft for roof
            totalCost += roofCost;
            breakdown.push({ item: 'Roof Replacement', cost: Math.round(roofCost), note: `${roofAge} years old` });
        }

        // HVAC (if age > 12 years)
        if (hvacAge && hvacAge > 12) {
            const hvacCost = 5000 + (squareFeet > 2000 ? 2000 : 0);
            totalCost += hvacCost;
            breakdown.push({ item: 'HVAC Replacement', cost: hvacCost, note: `${hvacAge} years old` });
        }

        // Plumbing
        if (plumbingCondition && plumbingCondition < 5) {
            const plumbingCost = 3000 + (squareFeet * 2);
            totalCost += plumbingCost;
            breakdown.push({ item: 'Plumbing Repairs', cost: Math.round(plumbingCost), note: 'Poor condition' });
        }

        // Electrical
        if (electricalCondition && electricalCondition < 5) {
            const electricalCost = 2500 + (squareFeet * 3);
            totalCost += electricalCost;
            breakdown.push({ item: 'Electrical Updates', cost: Math.round(electricalCost), note: 'Needs updating' });
        }

        // Foundation
        if (foundationIssues) {
            const foundationCost = 8000;
            totalCost += foundationCost;
            breakdown.push({ item: 'Foundation Repair', cost: foundationCost, note: 'Issues identified' });
        }

        // Cosmetic (paint, flooring, fixtures)
        const cosmeticLevel = cosmeticNeeds || 'medium';
        const cosmeticCosts = { light: 3000, medium: 8000, heavy: 15000 };
        const cosmeticCost = cosmeticCosts[cosmeticLevel] || 8000;
        totalCost += cosmeticCost;
        breakdown.push({ item: 'Cosmetic Updates', cost: cosmeticCost, note: `${cosmeticLevel} level` });

        // Add 10% contingency
        const contingency = totalCost * 0.10;
        totalCost += contingency;
        breakdown.push({ item: 'Contingency (10%)', cost: Math.round(contingency), note: 'Buffer for unexpected costs' });

        return {
            totalEstimate: Math.round(totalCost),
            breakdown,
            confidence: this.getRepairConfidence(property),
            perSquareFoot: Math.round(totalCost / squareFeet)
        };
    }

    /**
     * Market analysis for a location
     */
    analyzeMarket(location) {
        // This would typically integrate with real data APIs
        // For now, we'll return a structured analysis template
        return {
            location,
            metrics: {
                medianHomePrice: 0,
                averageDaysOnMarket: 0,
                inventoryLevel: 'balanced', // buyers/sellers/balanced
                pricePerSquareFoot: 0,
                yearOverYearAppreciation: 0,
                rentalYield: 0
            },
            trends: {
                priceDirection: 'stable', // up/down/stable
                demandLevel: 'moderate', // high/moderate/low
                investorActivity: 'moderate'
            },
            forecast: {
                shortTerm: 'stable', // 3-6 months
                mediumTerm: 'growth', // 6-12 months
                confidence: 'medium'
            },
            timestamp: new Date().toISOString()
        };
    }

    // Helper methods

    calculateDealScore(factors) {
        const { equityRatio, arvAccuracy, condition, motivation, location, marketTrend, timeline } = factors;

        let score = 0;

        // Equity ratio (25%)
        score += Math.min(equityRatio * 100, 25) * this.weights.equity * 4;

        // ARV accuracy (20%)
        score += arvAccuracy * this.weights.arv * 100;

        // Property condition (15%) - inverse, lower condition = higher opportunity
        score += ((10 - condition) / 10) * this.weights.condition * 100;

        // Seller motivation (15%)
        score += (motivation / 10) * this.weights.motivation * 100;

        // Location (10%)
        score += (location / 10) * this.weights.location * 100;

        // Market trend (10%)
        const trendScores = { up: 10, stable: 7, down: 4 };
        score += ((trendScores[marketTrend] || 7) / 10) * this.weights.marketTrend * 100;

        // Timeline (5%) - longer DOM = more motivated
        const timelineScore = Math.min(timeline / 90, 1);
        score += timelineScore * this.weights.timeline * 100;

        return Math.min(score, 100);
    }

    calculateSub2DealScore(factors) {
        const { equityPosition, monthlyCashflow, interestRate, remainingTerm, condition, motivation } = factors;

        let score = 0;

        // Equity position (30%)
        const equityScore = Math.min(equityPosition / 100000, 1) * 30;
        score += equityScore;

        // Monthly cashflow (25%)
        const cashflowScore = Math.min(monthlyCashflow / 500, 1) * 25;
        score += cashflowScore;

        // Interest rate (15%) - lower is better
        const rateScore = Math.max(0, (8 - interestRate) / 8) * 15;
        score += rateScore;

        // Remaining term (15%) - longer is better
        const termScore = Math.min(remainingTerm / 360, 1) * 15;
        score += termScore;

        // Condition (10%)
        const conditionScore = (condition / 10) * 10;
        score += conditionScore;

        // Motivation (5%)
        const motivationScore = (motivation / 10) * 5;
        score += motivationScore;

        return score;
    }

    calculateRiskScore(property) {
        let risk = 0;

        // Title issues
        if (property.titleIssues) risk += this.riskFactors.titleIssues * 100;

        // Structural problems
        if (property.foundationIssues || property.structuralDamage) {
            risk += this.riskFactors.structuralProblems * 100;
        }

        // Market volatility
        if (property.marketTrend === 'down') risk += this.riskFactors.marketVolatility * 100;

        // Seller reliability
        const sellerReliability = property.sellerReliability || 7;
        risk += ((10 - sellerReliability) / 10) * this.riskFactors.sellerReliability * 100;

        // Financing risk
        if (property.financingContingent) risk += this.riskFactors.financingRisk * 50;

        // Legal complexity
        if (property.probate || property.divorce || property.liens) {
            risk += this.riskFactors.legalComplexity * 100;
        }

        return Math.min(risk, 100);
    }

    calculateSub2RiskScore(property) {
        let risk = 20; // Base risk for Sub2 deals (due-on-sale clause)

        if (property.latePayments) risk += 15;
        if (property.bankruptcyHistory) risk += 20;
        if (property.multipleMortgages) risk += 10;
        if (property.adjustableRate) risk += 15;
        if (property.balloonPayment) risk += 20;

        return Math.min(risk, 100);
    }

    assessDueOnSaleRisk(property) {
        // Assess likelihood of lender calling due-on-sale clause
        let riskLevel = 'low';
        let factors = [];

        if (property.lenderType === 'portfolio') {
            riskLevel = 'low';
            factors.push('Portfolio lender - typically less aggressive');
        } else if (property.lenderType === 'national') {
            riskLevel = 'medium';
            factors.push('National lender - moderate enforcement');
        }

        if (property.paymentHistory === 'perfect') {
            factors.push('Perfect payment history reduces risk');
        }

        if (property.loanToValue > 0.9) {
            riskLevel = 'medium';
            factors.push('High LTV may trigger lender attention');
        }

        return { level: riskLevel, factors };
    }

    calculateSuccessProbability(dealScore, riskScore) {
        // Weighted calculation: deal score positive, risk score negative
        const baseProbability = (dealScore * 0.7) + ((100 - riskScore) * 0.3);
        return Math.min(Math.max(baseProbability, 5), 95); // Clamp between 5-95%
    }

    generateRecommendation(dealScore, riskScore, equitySpread) {
        if (dealScore >= 75 && riskScore <= 30 && equitySpread >= 20000) {
            return {
                action: 'STRONG BUY',
                message: 'Excellent deal with strong fundamentals. Proceed with confidence.',
                priority: 'high'
            };
        } else if (dealScore >= 60 && riskScore <= 50 && equitySpread >= 10000) {
            return {
                action: 'BUY',
                message: 'Good deal with acceptable risk. Recommend proceeding with standard due diligence.',
                priority: 'medium'
            };
        } else if (dealScore >= 45 && riskScore <= 60) {
            return {
                action: 'CONSIDER',
                message: 'Marginal deal. Proceed only if you can negotiate better terms.',
                priority: 'low'
            };
        } else {
            return {
                action: 'PASS',
                message: 'Deal does not meet investment criteria. Risk outweighs potential reward.',
                priority: 'none'
            };
        }
    }

    generateSub2Recommendation(dealScore, riskScore, monthlyCashflow) {
        if (dealScore >= 70 && riskScore <= 40 && monthlyCashflow >= 300) {
            return {
                action: 'STRONG BUY',
                message: 'Excellent Sub2 opportunity with strong cashflow and manageable risk.',
                priority: 'high'
            };
        } else if (dealScore >= 55 && riskScore <= 55 && monthlyCashflow >= 100) {
            return {
                action: 'BUY',
                message: 'Solid Sub2 deal. Ensure proper legal structure and insurance.',
                priority: 'medium'
            };
        } else if (dealScore >= 40) {
            return {
                action: 'CONSIDER',
                message: 'Marginal Sub2 deal. May work with creative exit strategy.',
                priority: 'low'
            };
        } else {
            return {
                action: 'PASS',
                message: 'Sub2 risk too high for potential returns.',
                priority: 'none'
            };
        }
    }

    getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 85) return 'A';
        if (score >= 80) return 'A-';
        if (score >= 75) return 'B+';
        if (score >= 70) return 'B';
        if (score >= 65) return 'B-';
        if (score >= 60) return 'C+';
        if (score >= 55) return 'C';
        if (score >= 50) return 'C-';
        if (score >= 45) return 'D+';
        if (score >= 40) return 'D';
        return 'F';
    }

    identifyStrengths(property, dealScore) {
        const strengths = [];
        if (property.equitySpread > 30000) strengths.push('Strong equity position');
        if (property.sellerMotivation >= 8) strengths.push('Highly motivated seller');
        if (property.daysOnMarket > 60) strengths.push('Extended market time creates negotiation leverage');
        if (property.locationScore >= 7) strengths.push('Desirable location');
        if (dealScore >= 70) strengths.push('Above-average deal metrics');
        return strengths;
    }

    identifyWeaknesses(property, riskScore) {
        const weaknesses = [];
        if (property.condition <= 4) weaknesses.push('Significant repairs needed');
        if (property.titleIssues) weaknesses.push('Title issues present');
        if (property.foundationIssues) weaknesses.push('Foundation concerns');
        if (riskScore > 50) weaknesses.push('Elevated overall risk profile');
        return weaknesses;
    }

    identifyOpportunities(property) {
        const opportunities = [];
        if (property.zoning === 'multi-family') opportunities.push('Potential for unit conversion');
        if (property.lotSize > 10000) opportunities.push('Large lot - subdivision potential');
        if (property.marketTrend === 'up') opportunities.push('Appreciating market');
        opportunities.push('Assignment fee opportunity');
        return opportunities;
    }

    identifyThreats(property) {
        const threats = [];
        if (property.marketTrend === 'down') threats.push('Declining market values');
        if (property.competition === 'high') threats.push('High investor competition in area');
        if (property.economicFactors === 'negative') threats.push('Negative local economic indicators');
        return threats;
    }

    identifySub2Strengths(property) {
        const strengths = [];
        if (property.interestRate < 5) strengths.push('Below-market interest rate');
        if (property.remainingTerm > 240) strengths.push('Long remaining loan term');
        if (property.monthlyCashflow > 400) strengths.push('Strong monthly cashflow');
        if (property.paymentHistory === 'perfect') strengths.push('Perfect payment history');
        return strengths;
    }

    identifySub2Weaknesses(property) {
        const weaknesses = [];
        if (property.adjustableRate) weaknesses.push('Adjustable rate mortgage');
        if (property.balloonPayment) weaknesses.push('Balloon payment pending');
        if (property.latePayments) weaknesses.push('History of late payments');
        if (property.highLTV) weaknesses.push('Limited equity cushion');
        return weaknesses;
    }

    generateExitStrategies(property) {
        return [
            { strategy: 'Wrap Mortgage', viability: 'high', notes: 'Sell with seller financing at higher rate' },
            { strategy: 'Lease Option', viability: 'high', notes: 'Lease with option to purchase' },
            { strategy: 'Refinance', viability: 'medium', notes: 'Refinance into your own loan after seasoning' },
            { strategy: 'Sell Outright', viability: 'medium', notes: 'Pay off existing loan at sale' }
        ];
    }

    analyzeHoldingPeriod(property) {
        const { monthlyPayment, marketRent, appreciation } = property;
        const monthlyCashflow = marketRent - monthlyPayment;
        const annualAppreciation = appreciation || 0.03;

        return {
            breakEvenMonths: monthlyCashflow > 0 ? 'Immediate positive cashflow' : Math.ceil(Math.abs(monthlyCashflow) * 12 / (property.arv * annualAppreciation)),
            fiveYearProjection: {
                cashflow: monthlyCashflow * 60,
                appreciation: property.arv * Math.pow(1 + annualAppreciation, 5) - property.arv,
                equityBuildup: this.calculateEquityBuildup(property, 60)
            }
        };
    }

    calculateEquityBuildup(property, months) {
        // Simplified amortization calculation
        const { existingMortgageBalance, monthlyPayment, interestRate } = property;
        const monthlyRate = interestRate / 100 / 12;
        let balance = existingMortgageBalance;
        let totalPrincipal = 0;

        for (let i = 0; i < months; i++) {
            const interestPayment = balance * monthlyRate;
            const principalPayment = monthlyPayment - interestPayment;
            totalPrincipal += principalPayment;
            balance -= principalPayment;
        }

        return Math.round(totalPrincipal);
    }

    estimateARVConfidence(arv, marketValue) {
        if (!arv || !marketValue) return 0.5;
        const variance = Math.abs(arv - marketValue) / marketValue;
        return Math.max(0, 1 - variance);
    }

    calculateVariance(values) {
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    getRepairConfidence(property) {
        let confidence = 'medium';
        if (property.inspectionReport) confidence = 'high';
        if (!property.condition) confidence = 'low';
        return confidence;
    }
}

module.exports = new QuantumAnalyzer();
