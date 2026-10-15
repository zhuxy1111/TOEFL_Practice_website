'use strict';
// Translate authored UI fragments before inserting values. Imported text is never translated.
var I18N=(()=>{
 const key='practice-studio-language';let language='zh';
 try{if(localStorage.getItem(key)==='en')language='en';const requested=new URLSearchParams(location.search||'').get('lang');if(['zh','en'].includes(requested))language=requested}catch{}
 const dictionary=window.UI_TRANSLATIONS||{};const reverse=Object.fromEntries(Object.entries(dictionary).map(([zh,en])=>[en.trim().replace(/\s+/g,' '),zh]));
 const norm=s=>s.trim().replace(/\s+/g,' ');
 const escapeRE=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const patterns=[];
 for(const [zh,en]of Object.entries(dictionary)){
  if(!zh.includes('{'))continue;
  let positions=[];let cursor=0,pattern='';
  for(const m of zh.matchAll(/\{(\d+)\}/g)){pattern+=escapeRE(zh.slice(cursor,m.index))+'([\\s\\S]*?)';positions.push(+m[1]);cursor=m.index+m[0].length}
  pattern+=escapeRE(zh.slice(cursor));patterns.push({re:new RegExp('^'+pattern+'$'),positions,en});
 }
 function translate(source,...args){
  source=String(source??'');if(/<[a-z!/]/i.test(source))return template([source]);const normalized=norm(source);let out=source;
  if(language==='en'){
   if(Object.hasOwn(dictionary,normalized)){out=dictionary[normalized];if(source!==source.trim())out=(source.match(/^\s*/)?.[0]||'')+out+(source.match(/\s*$/)?.[0]||'')}
   else for(const p of patterns){let match=normalized.match(p.re);if(match){const values={};p.positions.forEach((n,i)=>values[n]=match[i+1]);out=p.en.replace(/\{(\d+)\}/g,(m,n)=>values[n]??m);break}}
  }
  if(language==='zh'&&!Object.hasOwn(dictionary,normalized)&&Object.hasOwn(reverse,normalized))out=reverse[normalized];
  return args.length?out.replace(/\{(\d+)\}/g,(m,n)=>String(args[n]??m)):out;
 }
 function fragment(source){
  let indices=[],normalized=source.replace(/\uE000(\d+)\uE001/g,(_,n)=>'{'+(indices.push(n)-1)+'}');
  let translated=translate(normalized);
  return translated.replace(/\{(\d+)\}/g,(m,n)=>indices[n]!==undefined?'\uE000'+indices[n]+'\uE001':m);
 }
 function template(strings,...values){
  const skeleton=strings.map((s,i)=>s+(i<values.length?'\uE000'+i+'\uE001':'')).join('');
  const translated=/<[a-z!/]/i.test(skeleton)?skeleton.split(/(<[^>]*>)/g).map(part=>part.startsWith('<')?part.replace(/((?:placeholder|aria-label|title|alt)=")([^"]*)(")/g,(_,a,value,b)=>a+fragment(value).replace(/"/g,'&quot;')+b):fragment(part)).join(''):fragment(skeleton);
  return translated.replace(/\uE000(\d+)\uE001/g,(_,n)=>String(values[n]??''));
 }
 function set(next){if(!['zh','en'].includes(next))throw Error('Unsupported UI language');try{localStorage.setItem(key,next)}catch{}language=next;if(typeof document!=='undefined'&&document.documentElement){document.documentElement.lang=next==='en'?'en':'zh-CN';document.title=next==='en'?'Practice Studio · Your question library':'Practice Studio · 自带题库练习'}}
 return {t:translate,template,lang:()=>language,locale:()=>language==='en'?'en-US':'zh-CN',set};
})();
function tr(source,...args){return I18N.t(source,...args)}
function L(strings,...values){return I18N.template(strings,...values)}
function languageSwitcher(){return `<label class="language-switch"><span>${tr('界面语言')}</span><select data-ui-language aria-label="${tr('界面语言')}"><option value="zh" ${I18N.lang()==='zh'?'selected':''}>中文</option><option value="en" ${I18N.lang()==='en'?'selected':''}>English</option></select></label>`}
function sectionLabel(section){return {Reading:tr('阅读'),Writing:tr('写作'),Speaking:tr('口语')}[section]||section}
function attemptTitle(attempt){if(attempt.ids.length!==1)return tr('今日组合练习');const q=BANKMAP[attempt.ids[0]];return q?TYPES[q.kind].name+' · '+q.title:attempt.title}
function bindLanguageControls(){document.querySelectorAll('[data-ui-language]').forEach(select=>select.onchange=()=>{
 const next=select.value;
 if(typeof mediaBusy!=='undefined'&&(mediaBusy||recording)){select.value=I18N.lang();return toast(tr('请先停止录音并等待保存'))}
 if(document.querySelector('.overlay')){select.value=I18N.lang();return toast(tr('请先关闭当前窗口，再切换语言。'))}
 const fields=[...document.querySelectorAll('#question-form input:not([type=file]),#question-form textarea,#question-form select,.pdf-options input,.pdf-options select')].filter(el=>el.id).map(el=>[el.id,el.value,el.checked]);
 if(typeof session==='function'&&session())syncTime();
 I18N.set(next);try{const url=new URL(location.href);if(url.searchParams.has('lang')){url.searchParams.delete('lang');history.replaceState(null,'',url)}}catch{}render();
 const kindField=fields.find(([id])=>id==='question-kind');
 if(kindField&&document.querySelector('#question-kind')){document.querySelector('#question-kind').value=kindField[1];questionFields()}
 for(const[id,value,checked]of fields){const el=document.getElementById(id);if(el){el.value=value;if(el.type==='checkbox')el.checked=checked}}
});}
if(typeof document!=='undefined'&&document.documentElement)I18N.set(I18N.lang());
