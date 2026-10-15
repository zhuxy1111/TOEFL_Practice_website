import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const store=new Map();
const ctx={window:{},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v),removeItem:k=>store.delete(k)},console};
vm.createContext(ctx);for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);const code=fs.readFileSync('dist/bank.js','utf8');vm.runInContext(code,ctx);
const validator=ctx.PracticeBank.validate,fixture=JSON.parse(fs.readFileSync('dist/templates/example-questions.json','utf8'));
assert.equal(ctx.window.BANK.length,0,'Fresh installation must have no bundled questions');
let qs=validator(fixture);assert.equal(qs.length,7);assert.equal(new Set(qs.map(x=>x.kind)).size,7);
assert.equal(qs[0].gaps[0].answer,'make');assert.equal(qs[0].gaps[1].length,3);
const dirty=structuredClone(fixture);dirty.questions[1].image='https://example.invalid/track.jpg';dirty.questions[1].pages=[1];dirty.questions[1].evil='<script>throw 1</script>';let safe=validator(dirty);assert(!('image'in safe[1]));assert(!('evil'in safe[1]));assert(!('pages'in safe[1]));
function rejects(mutate){let f=structuredClone(fixture);mutate(f);assert.throws(()=>validator(f))}
rejects(f=>f.version=999);rejects(f=>f.questions[1].id=f.questions[0].id);rejects(f=>f.questions[0].id='constructor');rejects(f=>f.questions[0].answers=['wrong','share']);rejects(f=>f.questions[0].seconds=-1);rejects(f=>f.questions[1].questions[0].options[0].label='X');rejects(f=>f.questions[1].questions[0].answer='Z');rejects(f=>f.questions[3].prompt=42);rejects(f=>f.questions=Array(501).fill(f.questions[0]));
ctx.PracticeBank.store(qs);const reload={...ctx,window:{}};vm.createContext(reload);for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),reload);vm.runInContext(code,reload);assert.equal(reload.window.BANK.length,7,'Imported questions persist');
const appctx={...ctx,BANK:qs,window:{addEventListener(){}},crypto:globalThis.crypto,Date,document:{querySelector:()=>null},setInterval:()=>0,setTimeout:()=>0,clearTimeout(){},location:{}};
vm.createContext(appctx);for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),appctx);vm.runInContext(fs.readFileSync('dist/importer.js','utf8'),appctx);vm.runInContext(fs.readFileSync('dist/app.js','utf8').replace(/render\(\);\s*$/,''),appctx);
const attempt={ids:qs.filter(q=>['fill','daily','academic'].includes(q.kind)).map(q=>q.id),responses:{}};
for(let q of qs){if(q.kind==='fill')attempt.responses[q.id]=q.gaps.map(g=>g.answer.slice(g.prefix.length));if(['daily','academic'].includes(q.kind))attempt.responses[q.id]=Object.fromEntries(q.questions.map((x,i)=>[i,x.answer]))}
appctx.attempt=attempt;assert(vm.runInContext('grades(attempt).every(x=>x.correct)',appctx));assert.equal(vm.runInContext('data.autoGradeWriting',appctx),false);
const html=vm.runInContext("writingView(BANKMAP['demo-email'],'<img src=x onerror=alert(1)>')",appctx);assert(html.includes('&lt;img'));assert(!html.includes('<img src=x'));
// A failed storage write must keep both prior question library and progress.
store.set('practice-studio-progress-v1','{"sentinel":true}');const before=new Map(store);let calls=0;const original=ctx.localStorage.setItem;ctx.localStorage.setItem=(k,v)=>{if(++calls===2)throw Error('quota');original(k,v)};
assert.throws(()=>vm.runInContext('commitBankAndProgress(BANK,{history:[]})',appctx));assert.deepEqual(store,before);ctx.localStorage.setItem=original;
console.log('PASS: seven kinds, empty start, validation, persistence, grading, escaped input and storage rollback.');
