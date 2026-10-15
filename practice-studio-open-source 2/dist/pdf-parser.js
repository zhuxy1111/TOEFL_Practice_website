'use strict';
// Rule-based draft generation. All document text is untrusted data, never instructions.
var PDFDrafts=(()=>{
 const defaults={fill:180,daily:300,academic:600,email:420,discussion:600,repeat:20,interview:45};
 const kindNames={fill:tr('阅读填词'),daily:tr('生活阅读'),academic:tr('学术阅读'),email:tr('邮件写作'),discussion:tr('学术讨论'),repeat:tr('听与复述'),interview:tr('模拟面试')};
 const keyHeading=/^(?:answer(?:\s+key)?s?|参考答案|答案)(?:\s*[:：].*)?$/i;
 function normalize(text){return String(text??'').replace(/\r\n?/g,'\n').replace(/\u00ad/g,'').replace(/[ﬁﬂ]/g,c=>c==='ﬁ'?'fi':'fl').replace(/([A-Za-z])\s*(_(?:\s*_)+)/g,(_,a,b)=>a+'_'.repeat((b.match(/_/g)||[]).length)).replace(/([A-Za-z]) +(_+)/g,'$1$2').split('\n').map(l=>l.trim()).join('\n').trim()}
 function detect(text){
  if(/(?:write an email|邮件写作|邮件任务)/i.test(text)||/^To:\s*.+\nSubject:/mi.test(text))return 'email';
  if(/(?:academic discussion|学术讨论|Professor\s*:)/i.test(text))return 'discussion';
  if(/(?:listen and repeat|听与复述|听后复述)/i.test(text))return 'repeat';
  if(/(?:take an interview|模拟面试|interview questions)/i.test(text))return 'interview';
  if(/(?:complete the words|阅读填词|阅读填空|[A-Za-z]+_{1,})/i.test(text))return 'fill';
  if(/(?:read in daily life|生活阅读|日常生活阅读|read (?:an? )?(?:email|notice|advertisement|text message|schedule))/i.test(text))return 'daily';
  if(/(?:read an academic passage|学术阅读|academic passage)/i.test(text))return 'academic';
  if(/^\s*[ABCD][.)．]\s+\S/m.test(text))return 'academic';
  return null;
 }
 function header(line){
  if(/^(?:#{1,3}\s*)?(?:(?:Task|Set|题组)\s*#?\s*\d+\s*[:.、-]|(?:邮件写作|学术讨论)[-—－](?:真题[-—－])?\d+|\d+[.)、]\s+(?:Read\b|Complete the Words\b|Write an Email\b|Academic Discussion\b|Listen and Repeat\b|Take an Interview\b))/i.test(line))return true;
  const m=line.match(/^\d+[.)、]\s+([A-Za-z\u4e00-\u9fff][^.!?？。]{1,80})$/);
  return !!m&&m[1].split(/\s+/).length<=10&&!/^(?:What|Which|Why|How|Where|When|Who|According to)\b/i.test(m[1]);
 }
 function split(pages,strategy){
  const usable=pages.map(p=>({number:p.number,text:normalize(p.text),method:p.method||'text'})).filter(p=>p.text);
  if(strategy==='whole')return usable.length?[{text:usable.map(p=>p.text).join('\n\n'),pages:usable.map(p=>p.number)}]:[];
  if(strategy==='page')return usable.map(p=>({text:p.text,pages:[p.number]}));
  let chunks=[],active=null;
  for(let page of usable){
   let lines=page.text.split('\n'),marks=lines.map((l,i)=>header(l)?i:-1).filter(i=>i>=0);
   if(marks.length){
    if(marks[0]>0){let lead=lines.slice(0,marks[0]).join('\n').trim();if(lead&&active&&!keyHeading.test(lead.split('\n')[0])){active.text+='\n'+lead;if(!active.pages.includes(page.number))active.pages.push(page.number)}else if(lead.length>60&&!/^(?:part\s*\d|目录|contents)/i.test(lead))chunks.push({text:lead,pages:[page.number]})}
    marks.forEach((start,j)=>{active={text:lines.slice(start,marks[j+1]??lines.length).join('\n'),pages:[page.number]};chunks.push(active)});
   }else if(active&&(!keyHeading.test(lines[0]))&&(header(active.text.split('\n')[0])||/^(?:Q(?:uestion)?\s*\d|\d+[.)]\s*(?:What|Which|Why|How)|[ABCD][.)]\s)/i.test(lines[0]))){active.text+='\n\n'+page.text;active.pages.push(page.number)}
   else {active={text:page.text,pages:[page.number]};chunks.push(active)}
  }
  return chunks;
 }
 function reading(text){
  const lines=text.split('\n').flatMap(line=>(line.match(/\b[ABCD][.)．]\s+/g)||[]).length>=3?line.replace(/\s+([ABCD][.)．])\s+/g,'\n$1 ').split('\n'):[line]);
  let passage=[],questions=[],q=null,keyMode=false,answerMap={};
  const option=/^\(?([ABCD])(?:[.)．]|\))\s*(.+)$/;
  const numbered=/^(?:Q(?:uestion)?\s*)?(\d+)[.)、:]\s*(.+)$/i;
  const questionLike=/^(?:What|Which|Why|How|Where|When|Who|According to|The (?:word|phrase|author|passage)|It (?:can|may) be inferred|Identify the sentence|Look at the four)\b/i;
  for(let i=0;i<lines.length;i++){
   let line=lines[i].trim();if(!line)continue;
   let single=line.match(/^(?:Answer|答案)\s*[:：]\s*([ABCD])\s*$/i);if(single){if(q)q.answer=single[1].toUpperCase();continue}
   if(keyHeading.test(line)){keyMode=true;continue}
   if(keyMode){for(let m of line.matchAll(/(?:Q\s*)?(\d+)[.)、:\s]+([ABCD])\b/gi))answerMap[+m[1]]=m[2].toUpperCase();continue}
   let opt=line.match(option);
   if(opt&&q){q.options.push({label:opt[1],text:opt[2]});continue}
   let num=line.match(numbered),stem=num?num[2]:line;
   let upcoming=lines.slice(i+1,i+12).some(l=>/^A[.)．]\s*\S/.test(l.trim()));
   let isQuestion=(num&&!header(line)&&questionLike.test(stem))||(questionLike.test(stem)&&upcoming&&(!q||q.options.length>=4));
   if(isQuestion){q={stem,options:[],answer:null,_number:num?+num[1]:questions.length+1};questions.push(q);continue}
   if(q){if(!q.options.length)q.stem+=' '+line;else q.options[q.options.length-1].text+=' '+line}
   else if(!header(line)&&!/^Read (?:an academic passage|in daily life)\.?$/i.test(line))passage.push(line);
  }
  for(let item of questions){if(!item.answer)item.answer=answerMap[item._number]??null;delete item._number}
  return {passage:passage.join('\n'),questions};
 }
 function speaking(text,kind){
  let lines=text.split('\n').filter(l=>l&&!header(l)&&!new RegExp('^(?:'+(kind==='repeat'?'Listen and repeat(?: only once)?':'Take an Interview|Interview Questions')+')[.!:]?$','i').test(l));
  let qs=[],numbered=lines.some(l=>/^(?:Q\s*\d+\s*[.:)]?\s*|\d+[.)、]\s+)/i.test(l));
  for(let l of lines){let m=l.match(/^(?:Q\s*\d+\s*[.:)]?\s*|\d+[.)、]\s+)(.+)$/i);if(m)qs.push({stem:m[1]});else if(numbered&&qs.length)qs[qs.length-1].stem+=' '+l;else if(!numbered)qs.push({stem:l})}
  return qs;
 }
 function parse(pages,kind='auto',strategy='auto'){
  const groups=split(pages,strategy),prefix='pdf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
  return groups.map((g,i)=>{
   let raw=g.text,detected=detect(raw),actual=kind==='auto'?(detected||'email'):kind,warnings=[];
   if(!Object.hasOwn(defaults,actual))throw Error(tr('不支持的题型'));
   if(!detected&&kind==='auto')warnings.push(tr('未能确定题型，请选择正确题型并整理内容。'));
   if(g.pages.length>1)warnings.push(tr('草稿跨页，请检查是否合并了不同题目。'));
   let first=raw.split('\n').find(l=>l.length>3)||tr('PDF 题目');
   let title=first.replace(/^(?:Task|Set|题组)\s*#?\d+\s*[:.、-]\s*/i,'').slice(0,140);
   let q={id:prefix+'-'+i,kind:actual,title,seconds:defaults[actual]};
   if(['email','discussion'].includes(actual)){
    q.prompt=raw;q.to=raw.match(/^To\s*:\s*(.+)$/mi)?.[1]||'';q.subject=raw.match(/^Subject\s*:\s*(.+)$/mi)?.[1]||'';
   }else if(actual==='fill'){
    let parts=raw.split(/\n(?:Answers?|参考答案|答案)\s*[:：]?\s*/i);q.passage=parts[0].replace(/^(?:Complete the Words|阅读填词|阅读填空)\s*\n/i,'');
    let gaps=[...q.passage.matchAll(/([A-Za-z]+)(_+)/g)],answers=parts[1]?.split(/[,，/\s]+/).filter(Boolean)||[];
    q.answers=answers.length===gaps.length&&answers.every((a,j)=>a.toLowerCase().startsWith(gaps[j][1].toLowerCase())&&a.length===gaps[j][0].length)?answers:[];
    if(!gaps.length)warnings.push(tr('未识别到词首与下划线，请手动修正填词段落。'));
    if(!q.answers.length)warnings.push(tr('没有可靠的完整单词答案，请补充或保留为空。'));
   }else if(['daily','academic'].includes(actual)){
    Object.assign(q,reading(raw));if(!q.questions.length){q.questions=[{stem:'',options:[],answer:null}];warnings.push(tr('未能分离问题，请从左侧原文补充题干和选项。'))}
    if(q.questions.some(x=>x.options.length&&x.options.length!==4))warnings.push(tr('部分选项不完整，请补齐 A–D 或改为文字作答。'));
    if(q.questions.some(x=>!x.answer))warnings.push(tr('部分参考答案未识别，留空的题目不会计分。'));
    if(!q.passage.trim())warnings.push(tr('没有独立阅读材料，请从原文补充。'));
   }else {q.questions=speaking(raw,actual);if(!q.questions.length)q.questions=[{stem:''}];warnings.push(tr('请确认每行是一道完整的口语题，长句未被错误拆分。'))}
   return {question:q,raw,pages:g.pages,warnings,selected:!(kind==='auto'&&!detected)};
  });
 }
 return {normalize,detect,split,reading,speaking,parse,defaults,kindNames};
})();
