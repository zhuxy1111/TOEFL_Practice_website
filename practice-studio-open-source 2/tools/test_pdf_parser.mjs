import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const ctx={window:{},localStorage:{getItem:()=>null},Date,Math};vm.createContext(ctx);for(const file of ['translations.js','i18n.js'])vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx);
vm.runInContext(fs.readFileSync('dist/bank.js','utf8'),ctx);vm.runInContext(fs.readFileSync('dist/pdf-parser.js','utf8'),ctx);
const p=ctx.PDFDrafts;
const reading=`Read an email.\nClub meeting\nOur club meets on Tuesday. Bring a notebook.\n1. What should members bring?\nA. A notebook\nB. A phone\nC. A chair\nD. A ticket\nAnswer: A\n2. When does the club meet?\nA. Monday\nB. Tuesday\nC. Friday\nD. Sunday\nAnswers:\n2. B`;
let draft=p.parse([{number:1,text:reading}])[0];assert.equal(draft.question.kind,'daily');assert.equal(draft.question.questions.length,2);assert.equal(draft.question.questions[0].answer,'A');assert.equal(draft.question.questions[1].answer,'B');assert(draft.question.passage.includes('Tuesday'));ctx.PracticeBank.validate([draft.question]);
let fill=p.parse([{number:1,text:'Complete the Words\nWe ma _ _ a plan and sh_ _ _ tools.\nAnswers: make, share'}])[0];assert.equal(fill.question.kind,'fill');assert.equal(fill.question.answers.join(','),'make,share');ctx.PracticeBank.validate([fill.question]);
let noKeys=p.parse([{number:1,text:'Complete the Words\nWe ma__ a plan.'}])[0];assert.equal(noKeys.question.answers.length,0);assert(noKeys.warnings.length);ctx.PracticeBank.validate([noKeys.question]);
let emails=p.parse([{number:1,text:'Task 1: Write an Email\nWrite to your club. Suggest a time.'},{number:2,text:'Task 2: Academic Discussion\nProfessor: Should clubs meet online? Explain.'}]);assert.equal(emails.length,2);assert.equal(emails[0].question.kind,'email');assert.equal(emails[1].question.kind,'discussion');ctx.PracticeBank.validate(emails.map(x=>x.question));
const continuation=p.parse([{number:1,text:'Task 1: Read an Academic Passage\nA study compared two rooms.'},{number:2,text:'1. What was compared?\nA. Two rooms\nB. Two towns\nC. Two books\nD. Two trains'}]);assert.equal(continuation.length,1);assert.equal(continuation[0].pages.join(','),'1,2');assert.equal(continuation[0].question.questions.length,1);
let speaking=p.parse([{number:1,text:'Listen and Repeat\n1. Leave your bag by the door.\n2. Ask a volunteer for help.'}], 'repeat')[0];assert.equal(speaking.question.questions.length,2);ctx.PracticeBank.validate([speaking.question]);
let unknown=p.parse([{number:1,text:'A plain page with some unrelated notes.'}])[0];assert.equal(unknown.selected,false);assert(unknown.warnings.length);
let incomplete=p.parse([{number:1,text:'Read an email.\nHello there.\n1. What is mentioned?\nA. Something\nB. Another thing'}])[0];assert.throws(()=>ctx.PracticeBank.validate([incomplete.question]));assert(incomplete.warnings.some(s=>s.includes('选项')));
let malicious=p.parse([{number:1,text:'Write an Email\n<script>throw new Error("do not execute")</script>'}])[0];assert(malicious.question.prompt.includes('<script>')); // Plain text only, no execution.
assert.equal(p.split([{number:1,text:'Page one'},{number:2,text:'Page two'}],'whole').length,1);assert.equal(p.split([{number:1,text:'Page one'},{number:2,text:'Page two'}],'page').length,2);
let titled=p.parse([{number:1,text:'1. Campus Studio\nListen and repeat\nPlease leave your bag here.\n2. Outdoor Workshop\nListen and repeat\nBring a notebook.'}],'repeat');assert.equal(titled.length,2);
console.log('PASS: PDF draft types, options/keys, fill words, cross-page reading, speaking, missing data and untrusted text.');
