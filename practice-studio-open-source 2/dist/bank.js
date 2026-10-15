'use strict';
// Import files are parsed as JSON data only; never as executable JavaScript.
var PracticeBank=(()=>{
 const key='practice-studio-questions-v1';
 const kinds=['fill','daily','academic','email','discussion','repeat','interview'];
 function fail(message){throw new Error(message)}
 function text(v,name,max=20000,required=true){if(typeof v!=='string'||v.length>max||(required&&!v.trim()))fail(name+tr('为空或过长'));return v.trim()}
 function validate(input){
  if(input&&!Array.isArray(input)&&((input.format!==undefined&&input.format!=='practice-studio-questions')||(input.version!==undefined&&input.version!==1)))fail(tr('题库格式或版本不匹配'));
  const list=Array.isArray(input)?input:input?.questions;
  if(!Array.isArray(list)||list.length>500)fail(tr('题库应包含 questions 数组，最多 500 组'));
  const ids=new Set();
  return list.map((v,i)=>{
   const label=tr('第 ')+(i+1)+tr(' 组：');
   try{
    if(!v||typeof v!=='object'||Array.isArray(v))fail(tr('题目格式不正确'));
    let id=text(v.id,'id',64);if(!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)||['constructor','prototype','__proto__'].includes(id)||ids.has(id))fail(tr('id 重复或不合法'));ids.add(id);
    if(!kinds.includes(v.kind))fail(tr('不支持的题型'));
    const q={id,kind:v.kind,title:text(v.title,tr('标题'),160),number:i+1,seconds:v.seconds??({fill:180,daily:300,academic:600,email:420,discussion:600,repeat:20,interview:45}[v.kind]),source:tr('自行导入')};
    if(!Number.isInteger(q.seconds)||q.seconds<10||q.seconds>7200)fail(tr('seconds 须为 10–7200 的整数'));
    if(['email','discussion'].includes(q.kind)){q.prompt=text(v.prompt,tr('题目要求'));q.to=text(v.to??'',tr('收件人'),300,false);q.subject=text(v.subject??'',tr('主题'),500,false)}
    else if(q.kind==='fill'){
     q.passage=text(v.passage,tr('段落'));let matches=[...q.passage.matchAll(/([A-Za-z]+)(_+)/g)];
     if(!matches.length||matches.length>50||q.passage.replace(/([A-Za-z]+)(_+)/g,'').includes('_'))fail(tr('请用英文词首加下划线表示空格，例如 ma__'));
     let answers=v.answers??[];if(!Array.isArray(answers)||answers.length&&answers.length!==matches.length)fail(tr('答案数量须与空格一致，或使用空数组'));
     q.gaps=matches.map((m,j)=>{let a=answers[j]??null;if(a!==null&&(typeof a!=='string'||!/^[A-Za-z]+$/.test(a)||!a.toLowerCase().startsWith(m[1].toLowerCase())||a.length!==m[0].length))fail(tr('第 ')+(j+1)+tr(' 个完整单词答案与空格不匹配'));return {prefix:m[1],length:m[2].length,answer:a,start:m.index,end:m.index+m[0].length}});q.answers=q.gaps.map(g=>g.answer);
    }else{
     if(['daily','academic'].includes(q.kind))q.passage=text(v.passage,tr('阅读材料'));
     if(!Array.isArray(v.questions)||!v.questions.length||v.questions.length>50)fail(tr('questions 须包含 1–50 道题'));
     q.questions=v.questions.map((x,j)=>{
      if(!x||typeof x!=='object')fail(tr('第 ')+(j+1)+tr(' 道题格式错误'));const item={stem:text(x.stem,tr('问题或句子'),5000)};
      if(['daily','academic'].includes(q.kind)){
       let options=x.options??[];if(!Array.isArray(options)||![0,4].includes(options.length))fail(tr('阅读题须有四个选项，或空数组（文字作答）'));
       item.options=options.map((o,k)=>{if(!o||o.label!=='ABCD'[k])fail(tr('选项标签须按 A、B、C、D 排列'));return {label:o.label,text:text(o.text,tr('选项'),3000)}});
       item.answer=x.answer==null||x.answer===''?null:text(x.answer,tr('参考答案'),5000);if(options.length&&item.answer&&!['A','B','C','D'].includes(item.answer))fail(tr('选择题答案须为 A、B、C、D'));
      }return item;
     });
    }return q;
   }catch(e){fail(label+e.message)}
  });
 }
 function store(questions){let normalized=validate(questions);localStorage.setItem(key,JSON.stringify(normalized));return normalized}
 return {key,kinds,validate,store};
})();
window.BANK=[];
try{let stored=localStorage.getItem(PracticeBank.key);if(stored)window.BANK=PracticeBank.validate(JSON.parse(stored))}catch(e){window.BANK_LOAD_ERROR=tr('本地题库无法读取：')+e.message+tr('。请先导出原数据再重新导入。')}
