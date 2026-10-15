import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const storage=new Map(),nodes=new Map();
const node=()=>({innerHTML:'',textContent:'',style:{},classList:{add(){},toggle(){}},dataset:{},focus(){}});
const document={documentElement:{lang:''},title:'',querySelector:s=>nodes.get(s)||null,querySelectorAll:()=>[],addEventListener(){}};
const ctx={window:{addEventListener(){}},document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},location:{hostname:'localhost',protocol:'http:'},setInterval:()=>0,setTimeout:()=>0,clearTimeout(){},Date,Math,crypto:globalThis.crypto,console};
vm.createContext(ctx);
for(const file of ['translations.js','i18n.js','bank.js','pdf-parser.js','pdf-import.js','importer.js','ai.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
ctx.BANK=ctx.window.BANK;
vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace(/render\(\);\s*$/,''),ctx);
assert.equal(ctx.I18N.lang(),'zh');assert.equal(ctx.tr('练习题库'),'练习题库');
ctx.I18N.set('en');assert.equal(storage.get('practice-studio-language'),'en');assert.equal(document.documentElement.lang,'en');assert.equal(ctx.tr('练习题库'),'Question library');
assert.equal(ctx.tr('本次仅提取第 1–20 页（PDF 共 60 页）。'),'Only pages 1–20 of 60 were extracted.');
assert.equal(vm.runInContext('L`<p>第 ${2} / ${7} 组</p>`',ctx),'<p>Set 2 of 7</p>');
assert.equal(vm.runInContext('L`<button aria-label="第 ${3} 题">练习题库</button>`',ctx),'<button aria-label="Question 3">Question library</button>');
assert.equal(ctx.tr('<p>正在批改…</p>'),'<p>Grading…</p>');
const original='练习题库 <script>doNotExecute()</script>';ctx.original=original;assert.equal(vm.runInContext('L`<pre>${original}</pre>`',ctx),'<pre>'+original+'</pre>','Interpolated data is opaque to translation');
for(const fn of ['settings()','historyPage()','emptyBankHTML()','importerPage()','pdfImportHTML()']){
 const html=vm.runInContext(fn,ctx);assert(!/[\u3400-\u9fff]/.test(html),'Untranslated English UI in '+fn+': '+html.match(/.{0,50}[\u3400-\u9fff].{0,80}/)?.[0]);
}
const q={id:'custom-safe',kind:'email',title:'练习题库',prompt:'我的学习空间 & original text',seconds:420,to:'导师',subject:'我的收藏'};ctx.q=q;
const english=vm.runInContext('writingView(q,"练习记录 <img src=x>")',ctx);assert(english.includes('我的学习空间 &amp; original text'));assert(english.includes('练习记录 &lt;img src=x&gt;'));assert(english.includes('Your Response:'));assert(!english.includes('你的作答：'));
assert.equal(vm.runInContext('TYPES.email.name',ctx),'Email Writing');ctx.I18N.set('zh');assert.equal(vm.runInContext('TYPES.email.name',ctx),'邮件写作');assert.equal(ctx.tr('English feedback'),'英文报告');
const chinese=vm.runInContext('writingView(q,"练习记录 <img src=x>")',ctx);assert(chinese.includes('你的作答：'));assert(chinese.includes('我的学习空间 &amp; original text'));
const report={score:4,summary:'评语原文保留',criteria:[],taskChecks:[],strengths:[],priorities:[],corrections:[],improvedResponse:'Example',rewriteNote:'说明保留',limitations:'练习报告',taskId:q.id,feedbackLanguage:'zh'};
ctx.h={id:'attempt',responses:{[q.id]:'Original response'},aiFeedback:{[q.id]:report}};ctx.report=report;
assert.equal(vm.runInContext('feedbackFor(h,q.id).summary',ctx),'评语原文保留');ctx.I18N.set('en');assert.equal(vm.runInContext('feedbackFor(h,q.id)',ctx),null,'Chinese report must not be mislabeled as English');
const slot=vm.runInContext('aiSlot(q,h)',ctx);assert(slot.includes('other language'));assert(slot.includes('uses plan quota'));assert(!slot.includes('评语原文保留'));
vm.runInContext('h.aiFeedbackByLanguage={[q.id]:{en:{...report,summary:"English feedback text",feedbackLanguage:"en"}}}',ctx);assert.equal(vm.runInContext('feedbackFor(h,q.id).summary',ctx),'English feedback text');
// A new page reads the saved language preference.
const fresh={window:{},localStorage:ctx.localStorage};vm.createContext(fresh);for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),fresh);assert.equal(fresh.I18N.lang(),'en');
// PDF draft labels switch without translating the draft's source text.
let pdfHTML='';ctx.modal=html=>pdfHTML=html;ctx.bindPDFEditor=()=>{};nodes.set('.modal',node());
vm.runInContext('PDF_IMPORT.drafts=PDFDrafts.parse([{number:1,text:"Write an Email\\nWrite to your club about meeting times."}],"email","whole");PDF_IMPORT.result={warnings:["本次仅提取第 1–1 页（PDF 共 2 页）。"]};PDF_IMPORT.url="blob:local-test";showPDFEditor()',ctx);
assert(pdfHTML.includes('Extracted source text'));assert(pdfHTML.includes('Only pages 1–1 of 2 were extracted.'));assert(!/[\u3400-\u9fff]/.test(pdfHTML));
const unchanged=ctx.PDF_IMPORT.drafts[0].question.prompt;ctx.I18N.set('zh');vm.runInContext('showPDFEditor()',ctx);assert(pdfHTML.includes('提取原文'));assert.equal(ctx.PDF_IMPORT.drafts[0].question.prompt,unchanged);
console.log('PASS: UI language persistence, dynamic labels, English screens, unchanged task/answer text and separate report languages.');
