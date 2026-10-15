import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx={window:{},URL,URLSearchParams,navigator:{userAgent:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0.0.0'},localStorage:{getItem(){return null},setItem(){}},console};
vm.createContext(ctx);
for(const f of ['translations.js','i18n.js','project.js','feedback.js'])vm.runInContext(fs.readFileSync('dist/'+f,'utf8'),ctx);
ctx.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let html='';ctx.modal=value=>html=value;
const modal={setAttribute(){},querySelectorAll(){return []}};
const fields=new Map([['.modal',modal],['#close-feedback',{}],['#copy-feedback-info',{}]]);
ctx.document={querySelector:s=>fields.get(s)||null,activeElement:null};
for(const lang of ['zh','en']){
 ctx.I18N.set(lang);ctx.PracticeFeedback.show();
 const bug=new URL(ctx.PracticeFeedback.issueURL('bug'));
 assert.equal(bug.origin,'https://github.com');assert.equal(bug.pathname,'/zhuxy1111/TOEFL_Practice_website/issues/new');assert.equal(bug.searchParams.get('template'),'bug_report.yml');
 assert.deepEqual([...bug.searchParams.keys()],['template','environment']);assert(bug.searchParams.get('environment').includes('OS: Windows'));
 assert.equal(new URL(ctx.PracticeFeedback.issueURL('feature')).searchParams.get('template'),'feature_request.yml');
 assert(html.includes(lang==='en'?'Report a problem':'报告问题'));assert(html.includes('noopener noreferrer'));
 assert(html.includes(lang==='en'?'public':'公开'));assert(!html.includes('No GitHub account?'));
 if(lang==='en')assert(!/[\u3400-\u9fff]/.test(html),'English feedback contains untranslated UI');
}
// Fork configuration must never introduce executable or unencrypted URLs.
ctx.window.PRACTICE_PROJECT={version:'1.1.0',repository:'javascript:alert(1)',feedbackForm:'http://example.com'};
ctx.PracticeFeedback.show();assert.equal(ctx.PracticeFeedback.issueURL('bug'),'');assert(!html.includes('javascript:'));assert(!html.includes('http://example.com'));
ctx.window.PRACTICE_PROJECT={version:'1.1.0',repository:'https://github.com/owner/repo',feedbackForm:'https://example.com/feedback'};
ctx.PracticeFeedback.show();assert(html.includes('No GitHub account?'));assert(html.includes('https://example.com/feedback'));
console.log('PASS: bilingual feedback, correct issue templates, minimal system information and safe optional links.');
