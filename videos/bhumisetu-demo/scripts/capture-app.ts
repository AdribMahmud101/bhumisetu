import { chromium, type Page, type Locator } from '@playwright/test';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dir, '../../..');
const assets = resolve(repo, 'videos/bhumisetu-demo/assets');
const raw = resolve(repo, '.local/video/raw');
const base = 'https://bhumisetu.adribmahmud.workers.dev';
const bn = JSON.parse(readFileSync(resolve(repo, 'src/i18n/bn.json'), 'utf8'));
const mode = process.argv[2] || 'stills';
mkdirSync(assets, { recursive:true }); mkdirSync(raw, { recursive:true });
const browser = await chromium.launch({ channel:'chromium', headless:true });
const context = await browser.newContext({
  viewport:{width:1440,height:900}, deviceScaleFactor:2,
  ...(mode !== 'citizen' ? { storageState:resolve(repo,'.local/video-officer-session.json') } : {}),
  ...(mode !== 'stills' ? {recordVideo:{dir:raw,size:{width:1440,height:900}}} : {}),
});
await context.addCookies([{name:'bs-locale',value:'bn',url:base}]);
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const pointer=document.createElement('div'); pointer.id='capture-pointer';
    pointer.style.cssText='position:fixed;left:-50px;top:-50px;width:18px;height:18px;border:3px solid #086447;border-radius:50%;background:#ffffffaa;z-index:2147483647;pointer-events:none;box-shadow:0 0 0 4px #08644720';
    document.body.append(pointer);
    addEventListener('mousemove',e=>{pointer.style.left=(e.clientX-9)+'px';pointer.style.top=(e.clientY-9)+'px'});
  });
});
const page=await context.newPage();
page.setDefaultTimeout(20000);
const started=Date.now(); const events:any[]=[];
const mark=(name:string,extra={})=>{const event={name,time:(Date.now()-started)/1000,...extra};events.push(event);console.log(JSON.stringify(event))};
const pause=(ms:number)=>page.waitForTimeout(ms);
async function go(path:string){await page.goto(base+path,{waitUntil:'domcontentloaded'});await page.waitForLoadState('networkidle').catch(()=>{});await pause(450)}
async function shot(name:string, locator?:Locator){await pause(250);if(locator) await locator.screenshot({path:resolve(assets,name+'.png')});else await page.screenshot({path:resolve(assets,name+'.png')});mark('screenshot',{asset:name+'.png'})}
async function click(locator:Locator){await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();if(b)await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:16});await pause(300);await locator.click();await pause(400)}
try {
  if(mode==='stills'){
    await go('/');await shot('homepage');
    await page.getByText(bn['citizen_services_1c9e3']||'ভূমি যাচাই এখন আরও সহজ',{exact:false}).first().scrollIntoViewIfNeeded().catch(()=>{});
    await go('/admin');await shot('workspace');
    await go('/admin/land/LND-MOCK-001');
    await page.getByTestId('category-khatian').waitFor();await shot('documents');
    const qrWait=page.waitForEvent('download');await click(page.getByTestId('download-land-qr'));const qr=await qrWait;await qr.saveAs(resolve(assets,'record-qr.png'));mark('qr-export');
    await click(page.getByTestId('review-doc-DOC-DEED-002'));await page.getByTestId('edit-reason-input').waitFor();await shot('source-review');
    await click(page.getByRole('button',{name:bn['cancel_action'],exact:true}).first()).catch(async()=>{await page.keyboard.press('Escape');await go('/admin/land/LND-MOCK-001')});
    await go('/admin/land/LND-MOCK-001');
    await click(page.getByRole('tab',{name:bn['officer_activity_audit_trail_title'],exact:true}));
    await page.getByTestId('parcel-audit-tab-panel').waitFor();await pause(500);
    await page.getByTestId('parcel-audit-tab-panel').scrollIntoViewIfNeeded();await shot('audit');
    const audit=page.locator('[data-testid^="audit-entry-"]');
    const edits=audit.filter({hasText:/207-A|২০২|দাগ নম্বর/});
    if(await edits.count())await shot('audit-detail',edits.first());else if(await audit.count())await shot('audit-detail',audit.first());
    await go('/verify/LND-MOCK-001');await page.getByTestId('risk-indicator-score').waitFor();await page.getByTestId('risk-indicator-score').scrollIntoViewIfNeeded();await shot('conflict-overview');
    const quota=page.locator('.quota-panel,.quota-card,.quota').first();if(await quota.count())await shot('area-conflict',quota);
    await page.getByTestId('evidence-panel').scrollIntoViewIfNeeded();await shot('evidence');await shot('evidence-detail',page.getByTestId('evidence-panel'));
    await click(page.getByRole('tab',{name:bn['land_history_741f6'],exact:true}));await page.getByTestId('timeline-event-card').first().waitFor();await shot('history');
    await go('/admin/land/LND-MOCK-001');await page.getByTestId('print-land-record').waitFor();
    await page.evaluate(()=>{window.print=()=>{}});await click(page.getByTestId('print-land-record'));
    await page.emulateMedia({media:'print'});await page.pdf({path:resolve(repo,'.local/video/record-dossier.pdf'),format:'A4',printBackground:true});await page.emulateMedia({media:'screen'});mark('actual-print-export');
  }
  if(mode==='ocr'){
    await go('/admin');await page.evaluate(()=>sessionStorage.removeItem('bs-intake-id'));
    await click(page.getByRole('button',{name:bn['create_land_record_8f76d'],exact:true}));
    await page.locator('select[name=category]').selectOption('KHATIAN');await page.locator('select[name=subtype]').selectOption('RS');
    await page.locator('input[name=file]').setInputFiles(resolve(repo,'demo assets/khotian.jpg'));await shot('ocr-upload');
    const response=page.waitForResponse(r=>r.url().includes('/intake-extract/')&&r.request().method()==='POST',{timeout:120000});
    mark('upload-click');await click(page.getByRole('button',{name:bn['intake_upload'],exact:true}));mark('processing');
    const res=await response;const data=await res.json();mark('actual-ocr-response',{status:res.status(),ready:res.ok(),fieldKeys:Object.keys(data.fields||data.extracted_json||{})});
    if(!res.ok())throw new Error('Actual OCR failed: '+JSON.stringify(data).slice(0,200));
    await page.getByTestId('intake-edit-field-official_number').waitFor();
    const ocrFields=await page.locator('[data-testid^="intake-edit-field-"]').evaluateAll(els=>els.map(el=>({field:el.getAttribute('data-testid'),value:(el as HTMLInputElement).value})));
    writeFileSync(resolve(repo,'.local/video/ocr-result-fields.json'),JSON.stringify(ocrFields,null,2));
    await shot('ocr-result');mark('result-visible');await pause(1700);
    // Genuine officer corrections against the source: form number is not Khatian number,
    // the source has no issue date, and 0.15 acre equals 15 decimals.
    const number=page.getByTestId('intake-edit-field-official_number');await click(number);await number.fill('');await number.pressSequentially('১০৫',{delay:170});mark('khatian-corrected');
    await page.getByTestId('intake-edit-field-document_date').fill('');
    await page.getByTestId('intake-edit-field-khatian_ref').fill('১০৫');
    const area=page.getByTestId('intake-edit-field-area_decimals');await click(area);await area.fill('');await area.pressSequentially('১৫',{delay:180});mark('area-unit-corrected');await pause(1200);await shot('ocr-editable');
    await page.getByTestId('intake-edit-field-area_decimals').scrollIntoViewIfNeeded();await pause(1500);await shot('ocr-area');await shot('ocr-fields',page.locator('.ocr-field-review'));mark('end-content');await pause(800);
    await click(page.getByTestId('abort-intake'));mark('intake-aborted');
  }
  if(mode==='deed'){
    await go('/verify/deed');await page.getByTestId('p2-deed-verifier').waitFor();
    await page.locator('input[type=file]').first().setInputFiles(resolve(repo,'.local/fixtures/TAMPERED-DEED-502.pdf'));await shot('deed-upload');
    const extraction=page.waitForResponse(r=>r.url().includes('/verify-deed')&&r.request().method()==='POST',{timeout:120000});
    mark('deed-extract-click');await click(page.getByTestId('p2-verify-pdf-btn'));
    const res=await extraction;const data=await res.json();mark('actual-deed-extraction',{status:res.status(),fields:data.extracted});if(!res.ok())throw new Error('Deed OCR failed');
    await page.getByTestId('p2-fields-review-panel').waitFor();await page.getByTestId('p2-input-deed-number').scrollIntoViewIfNeeded();await shot('deed-extracted');mark('deed-review-visible');
    await page.getByTestId('p2-input-land-id').fill('LND-MOCK-001');await pause(1000);
    await click(page.getByTestId('p2-confirm-verify-btn'));await page.getByTestId('p2-verdict-banner').waitFor({timeout:30000});
    mark('actual-deed-result');await page.getByTestId('p2-verdict-banner').scrollIntoViewIfNeeded();await shot('deed-result');await pause(1400);
    await page.getByTestId('p2-comparison-matrix').scrollIntoViewIfNeeded();await shot('deed-comparison');await shot('deed-comparison-detail',page.getByTestId('p2-comparison-matrix'));await pause(3000);mark('end-content');
  }
  if(mode==='citizen'){
    await go('/verify');await shot('citizen-search');
    await page.getByTestId('land-search-input').fill('LND-MOCK-001');await pause(600);await click(page.getByTestId('land-search-btn'));
    await page.getByTestId('master-land-id').waitFor();mark('citizen-id-result');await shot('citizen-record');await pause(500);
    await click(page.getByRole('tab',{name:bn['land_history_741f6'],exact:true}));await shot('citizen-history');await pause(1300);
    await go('/verify');mark('qr-file-selected');await page.getByTestId('citizen-qr-upload').setInputFiles(resolve(assets,'record-qr.png'));
    await page.getByTestId('master-land-id').waitFor();mark('actual-qr-result');await shot('citizen-qr-result');await pause(1600);mark('end-content');
  }
} finally {
  writeFileSync(resolve(repo,'.local/video/'+mode+'-events.json'),JSON.stringify(events,null,2));
  const video=page.video();await context.close();if(video){const target=resolve(raw,mode+'.webm');await video.saveAs(target);console.log('RECORDED',target)}await browser.close();
}
