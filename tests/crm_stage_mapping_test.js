/**
 * Regression tests for the CompanyHub stage mapping and the Master DB column
 * validator.
 *
 * These exist because the last CRM defect in this stack was a correct function
 * fed the wrong column: the logic reviewed clean and the output was garbage.
 * Section [6] below is the test that would have caught it — it asserts the stage
 * comes from `Status Stage` and that a HOT verdict does not move the deal.
 *
 * Runs under plain Node against the .gs sources; no build step, no dependencies:
 *
 *   node tests/crm_stage_mapping_test.js
 *
 * Google Apps Script globals are stubbed only as far as loading Config.gs and
 * CRMIntegrations.gs requires. Nothing here touches a live spreadsheet or the
 * network.
 */

const fs=require('fs'), vm=require('vm');
const ctx={console, Object, String, Number, Array, Date, isFinite, JSON, Error, RegExp};
ctx.logEvent=()=>{}; ctx.logError=()=>{}; ctx.logSync=()=>{}; ctx.Logger={log:()=>{}};
ctx.SpreadsheetApp={getActiveSpreadsheet:()=>ctx.__ss, getUi:()=>{throw new Error('no ui')}};
ctx.CacheService={getScriptCache:()=>({get:()=>null,put:()=>{}})};
ctx.PropertiesService={getScriptProperties:()=>({getProperty:()=>null,setProperty:()=>{}})};
ctx.Utilities={sleep:()=>{}};
ctx.UrlFetchApp={fetch:()=>{throw new Error('no net')}};
vm.createContext(ctx);
for(const f of ['src/Config.gs','src/QuantumDbColumns.gs','src/CRMIntegrations.gs'])
  vm.runInContext(fs.readFileSync(f,'utf8'), ctx, {filename:f});

let pass=0, fail=0;
function t(name, fn){ try{ fn(); console.log('  PASS', name); pass++; }catch(e){ console.log('  FAIL', name, '->', e.message); fail++; } }
function eq(a,b,m){ if(a!==b) throw new Error(`${m||''} expected ${JSON.stringify(b)} got ${JSON.stringify(a)}`); }
function throws(fn, re){ let threw=false; try{fn();}catch(e){threw=true; if(re&&!re.test(e.message)) throw new Error('wrong message: '+e.message);} if(!threw) throw new Error('did not throw'); }

console.log('\n[1] Status Stage -> Blueprint stage, all 10 dropdown values + blank');
const dropdown=['New Lead','Contacted','Analyzing','Offer Sent','Negotiating','Under Contract','Due Diligence','Closed','Dead','On Hold'];
const expect={'New Lead':'New Lead','Contacted':'Contacted','Analyzing':'Analyzed','Offer Sent':'Negotiating','Negotiating':'Negotiating','Under Contract':'Under Contract','Due Diligence':'Under Contract','Closed':'Closed','Dead':'Dead','On Hold':'Nurture'};
dropdown.forEach(v=>t(`"${v}" -> "${expect[v]}"`,()=>eq(ctx.mapStatusStageToCompanyHubStage(v,'Q1'),expect[v])));
t('blank -> Analyzed', ()=>eq(ctx.mapStatusStageToCompanyHubStage('','Q1'),'Analyzed'));
t('null -> Analyzed', ()=>eq(ctx.mapStatusStageToCompanyHubStage(null,'Q1'),'Analyzed'));
t('undefined -> Analyzed', ()=>eq(ctx.mapStatusStageToCompanyHubStage(undefined,'Q1'),'Analyzed'));
t('whitespace -> Analyzed', ()=>eq(ctx.mapStatusStageToCompanyHubStage('   ','Q1'),'Analyzed'));

console.log('\n[2] Every emitted stage is in COMPANYHUB_STAGES');
t('all outputs asserted', ()=>{ dropdown.concat(['']).forEach(v=>{ const s=ctx.mapStatusStageToCompanyHubStage(v,'Q1'); if(ctx.COMPANYHUB_STAGES.indexOf(s)<0) throw new Error('unlisted stage '+s); }); });

console.log('\n[3] Unmapped values throw and name the deal');
t('unknown value throws, names deal', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('Appointment Set','Q7X9'), /Deal Q7X9.*Appointment Set/));
t('no || New default', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('Something','Q1')));
t('"New" is rejected with near-miss hint', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('New','Q1'), /Did you mean: New Lead/));
t('"Negotiation" near-miss hint', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('Negotiation','Q1'), /Did you mean: Negotiating/));
t('"Analyzed" as INPUT is rejected (near-miss guard both ways)', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('Analyzed','Q1')));
t('prototype keys rejected', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('constructor','Q1')));
t('error says nothing written', ()=>throws(()=>ctx.mapStatusStageToCompanyHubStage('Zzz','Q1'), /nothing written/));

console.log('\n[4] Output assertion catches a corrupted mapping');
t('assert rejects non-Blueprint stage', ()=>throws(()=>ctx.assertCompanyHubStage_('Qualified','test'), /not a Blueprint stage/));
t('assert rejects "Nurturing" with hint', ()=>throws(()=>ctx.assertCompanyHubStage_('Nurturing','test'), /Did you mean: Nurture/));
t('assert accepts a real stage', ()=>ctx.assertCompanyHubStage_('Under Contract','test'));

console.log('\n[5] Numeric coercion emits bare numbers');
[[150000,150000],['150000',150000],['$150,000',150000],['$1,250,000.50',1250000.5],['12%',12],[' 42 ',42],['',null],[null,null],[undefined,null],['TBD',null],[0,0],['0',0]]
 .forEach(([i,o])=>t(`${JSON.stringify(i)} -> ${JSON.stringify(o)}`,()=>eq(ctx.toCompanyHubNumber_(i),o)));
t('missing != zero', ()=>{ eq(ctx.toCompanyHubNumber_(''),null); eq(ctx.toCompanyHubNumber_(0),0); });

console.log('\n[6] Payload shape');
const headers=vm.runInContext('CONFIG.COLUMNS.MASTER_DB',ctx).slice();
const row=headers.map(()=>'');
function set(n,v){ row[headers.indexOf(n)]=v; }
set('Deal ID','Q9ABC'); set('Address','12 Elm St'); set('City','Tulsa'); set('State','OK'); set('ZIP','74101');
set('Asking Price','$150,000'); set('ARV','$240,000'); set('Deal Score',82); set('Risk Score',31);
set('Best Strategy','Flip'); set('Offer Price Target','$126,000'); set('Verdict','HOT');
set('Status Stage','Contacted'); set('Next Action','CALL NOW');
const cols=ctx.buildQuantumDbColMap_(headers);
const p=ctx.buildCompanyHubDealPayload(row,cols,'Q9ABC');
t('stage from Status Stage, not Verdict', ()=>eq(p.stage,'Contacted'));
t('HOT verdict did NOT set stage', ()=>{ if(p.stage==='Qualified') throw new Error('verdict leaked into stage'); });
t('verdict present as its own field', ()=>eq(p.customFields.verdict,'HOT'));
t('statusStage echoed', ()=>eq(p.customFields.statusStage,'Contacted'));
t('value is a bare number', ()=>eq(p.value,150000));
t('askingPrice bare', ()=>eq(p.properties.askingPrice,150000));
t('arv bare', ()=>eq(p.properties.arv,240000));
t('offerPrice bare', ()=>eq(p.properties.offerPrice,126000));
t('no currency chars anywhere in JSON', ()=>{ if(/[$%]/.test(JSON.stringify(p))) throw new Error('symbol in payload'); });

console.log('\n[7] colMap throws instead of NaN-reading');
const drifted=headers.filter(h=>h!=='Verdict');
const dcols=ctx.buildQuantumDbColMap_(drifted);
t('missing column throws, not undefined', ()=>throws(()=>dcols.value(row,'Verdict'), /not present in the live header row/));
t('old pattern would have silently yielded undefined', ()=>{ const cm={}; drifted.forEach((h,i)=>cm[h]=i+1); eq(row[cm['Verdict']-1],undefined); });

console.log('\n[8] validateQuantumDbColumns against live header rows');
function sheet(hdr){ return { getLastColumn:()=>hdr.length, getRange:()=>({getValues:()=>[hdr]}) }; }
t('exact match passes', ()=>{ const r=ctx.validateQuantumDbColumns(sheet(headers)); if(!r.ok) throw new Error(r.errors.join('; ')); eq(r.actualCount,69); });
t('69 expected', ()=>eq(ctx.validateQuantumDbColumns(sheet(headers)).expectedCount,69));
t('inserted column detected as drift', ()=>{ const h=headers.slice(); h.splice(30,0,'Surprise'); const r=ctx.validateQuantumDbColumns(sheet(h)); if(r.ok) throw new Error('drift missed'); if(!/row order has drifted/.test(r.errors.join(' '))) throw new Error(r.errors[0]); });
t('missing column detected', ()=>{ const r=ctx.validateQuantumDbColumns(sheet(headers.filter(h=>h!=='Status Stage'))); if(r.ok) throw new Error('missing column missed'); });
t('duplicate header detected', ()=>{ const h=headers.slice(); h.push('Verdict'); const r=ctx.validateQuantumDbColumns(sheet(h)); if(r.ok) throw new Error('dup missed'); if(!/appears twice/.test(r.errors.join(' '))) throw new Error(r.errors.join(' ')); });
t('trailing extra column is a warning, not an error', ()=>{ const h=headers.concat(['My Notes']); const r=ctx.validateQuantumDbColumns(sheet(h)); if(!r.ok) throw new Error('should pass: '+r.errors.join(' ')); if(!r.warnings.length) throw new Error('no warning'); });
t('assert throws on drift and names the abort', ()=>throws(()=>ctx.assertQuantumDbColumns('CompanyHub sync', sheet(headers.filter(h=>h!=='ARV'))), /aborted before writing/));
t('quantumDbColumnNumber(Status Stage) === 63', ()=>eq(ctx.quantumDbColumnNumber('Status Stage'),63));
t('quantumDbColumnNumber throws on unknown', ()=>throws(()=>ctx.quantumDbColumnNumber('Nope')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
