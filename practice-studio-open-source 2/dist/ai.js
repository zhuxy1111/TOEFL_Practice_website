'use strict';
var AI_STATE={checked:false,available:false,local:['127.0.0.1','localhost'].includes(location.hostname),requestToken:null,message:tr('正在检查本机连接…')};
var AI_PENDING=new Map();
var AI_STATUS_PROMISE=null;
async function checkAIServer(force=false){
 if(AI_STATUS_PROMISE&&!force)return AI_STATUS_PROMISE;
 if(!AI_STATE.local){AI_STATE={...AI_STATE,checked:true,message:tr('写作 AI 批改需使用本机版')};return AI_STATE}
 AI_STATUS_PROMISE=(async()=>{try{let r=await fetch('/api/ai/status',{cache:'no-store',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error();let b=await r.json();if(b.mode!=='chatgpt-subscription-only')throw Error();AI_STATE={...AI_STATE,...b,checked:true}}catch{AI_STATE={...AI_STATE,checked:true,available:false,message:tr('请关闭旧启动窗口，再双击“开始练习.command”启用 AI 批改')}}refreshAIWidgets();return AI_STATE})();return AI_STATUS_PROMISE;
}
function refreshAIWidgets(){
 if(typeof data==='undefined')return;
 let topline=document.querySelector('.topline');if(topline&&!document.querySelector('#ai-connection-badge')){let b=document.createElement('span');b.id='ai-connection-badge';b.className='ai-connection';topline.append(b)}
 let badge=document.querySelector('#ai-connection-badge');if(badge){badge.textContent=AI_STATE.available?tr('✦ 写作 AI · 套餐额度'):AI_STATE.checked?(AI_STATE.local?tr('写作 AI · 等待连接'):tr('写作 AI · 本机版')):tr('写作 AI · 检查连接中');badge.classList.toggle('connected',AI_STATE.available)}
 let main=document.querySelector('.main');if(main&&page==='settings'&&!document.querySelector('#ai-settings-card')){let card=document.createElement('section');card.className='settings-card';card.id='ai-settings-card';card.innerHTML=L`<h3>写作 AI 批改 · 现有套餐额度</h3><p id="ai-settings-state"></p><label class="ai-autograde"><input id="ai-auto-toggle" type="checkbox" ${data.autoGradeWriting===true?'checked':''}> 交卷后自动批改写作</label><p>每篇报告包含 0–5 分练习评分、任务要点核对、扣分依据、原句修改和改写参考。开启自动批改后，每次写作交卷都会将题目和作文发送给 AI；批改与本机 Codex 共用套餐额度；相同作文会复用已生成的报告。</p><p>目前支持邮件写作和学术讨论。口语录音保留回放与下载，暂不提供录音评分。</p><button class="btn secondary" id="ai-refresh">重新检查连接</button>`;main.insertBefore(card,main.querySelector('.settings-card'));card.querySelector('#ai-auto-toggle').onchange=e=>{data.autoGradeWriting=e.target.checked;save()};card.querySelector('#ai-refresh').onclick=()=>checkAIServer(true)}
 let state=document.querySelector('#ai-settings-state');if(state)state.textContent=tr(AI_STATE.message)+(AI_STATE.available?' · '+AI_STATE.model:'');
}
function validAIReport(r){
 if(!r||typeof r!=='object'||!Number.isInteger(r.score)||r.score<0||r.score>5)return false;
 if(!['summary','improvedResponse','rewriteNote','limitations'].every(k=>typeof r[k]==='string'))return false;
 if(!Array.isArray(r.criteria)||!r.criteria.every(x=>x&&typeof x.name==='string'&&typeof x.feedback==='string'&&Number.isInteger(x.score)&&x.score>=0&&x.score<=5))return false;
 if(!Array.isArray(r.taskChecks)||!r.taskChecks.every(x=>x&&typeof x.requirement==='string'&&typeof x.evidence==='string'&&typeof x.met==='boolean'))return false;
 if(!Array.isArray(r.strengths)||!r.strengths.every(x=>typeof x==='string'))return false;
 if(!Array.isArray(r.priorities)||!r.priorities.every(x=>x&&['issue','advice','example'].every(k=>typeof x[k]==='string')))return false;
 return Array.isArray(r.corrections)&&r.corrections.every(x=>x&&['original','revised','reason','category'].every(k=>typeof x[k]==='string'));
}
function feedbackFor(h,id,language=I18N.lang()){
 const localized=h.aiFeedbackByLanguage?.[id]?.[language];if(validAIReport(localized)&&localized.taskId===id&&(localized.feedbackLanguage||'zh')===language)return localized;
 const legacy=h.aiFeedback?.[id];return validAIReport(legacy)&&legacy.taskId===id&&(legacy.feedbackLanguage||'zh')===language?legacy:null;
}
function aiSlot(q,h){
 let report=feedbackFor(h,q.id);const other=validAIReport(h.aiFeedback?.[q.id])||Object.values(h.aiFeedbackByLanguage?.[q.id]||{}).some(validAIReport);return `<section class="ai-feedback-slot" data-ai-task="${esc(q.id)}"><div class="ai-section-top"><span class="ai-eyebrow">✦ AI WRITING FEEDBACK</span><button class="btn secondary ai-grade-button" data-grade-task="${esc(q.id)}" ${!String(h.responses[q.id]||'').trim()?'disabled':''}>${report?tr('重新查看报告'):tr('AI 批改 · 套餐额度')}</button></div><div class="ai-feedback-body">${report?renderAIReport(report):'<p class="ai-intro">'+tr(other?'已保存另一种语言的报告；生成当前语言的报告会使用套餐额度。':'手动点击后，会将这道题和你的作文发送给 AI，使用本机登录的套餐额度。默认不自动提交。')+'</p>'}</div></section>`;
}
window.mountAIReview=function(h){
 const modalEl=document.querySelector('.modal');if(!modalEl)return;
 const writing=h.ids.map(id=>BANKMAP[id]).filter(q=>['email','discussion'].includes(q.kind));if(!writing.length)return;
 modalEl.classList.add('ai-modal');
 for(let q of writing){let slot=modalEl.querySelector(`[data-ai-task="${q.id}"]`);if(!slot)continue;slot.outerHTML=aiSlot(q,h)}
 modalEl.querySelectorAll('[data-grade-task]').forEach(btn=>btn.onclick=()=>{let id=btn.dataset.gradeTask;if(feedbackFor(h,id)){const slot=modalEl.querySelector(`[data-ai-task="${id}"]`);slot?.querySelector('.ai-feedback-body')?.scrollIntoView({behavior:'smooth',block:'nearest'});return}gradeWriting(h,id)});
 for(let q of writing){let pending=AI_PENDING.get(h.id+':'+q.id+':'+I18N.lang());if(pending)showAIProgress(h,q.id,pending.message||tr('批改中…'))}
 bindReportCopies(modalEl);
};
function bindReportCopies(root){root.querySelectorAll('[data-copy-rewrite]').forEach(btn=>btn.onclick=async()=>{let pre=btn.closest('.ai-rewrite').querySelector('pre');try{await navigator.clipboard.writeText(pre.textContent);toast(tr('已复制改写参考'))}catch{toast(tr('请选中改写文字后复制'))}})}
function renderAIReport(r){
 return L`<div class="ai-score"><div><b>${esc(r.score)}</b><span>/ 5</span></div><div><strong>AI 单题练习分</strong><p>${esc(r.summary)}</p></div></div><p class="ai-report-meta">${esc(tr(r.billing||'ChatGPT 套餐额度'))} · ${esc(r.model||'')} · ${r.gradedAt?new Date(r.gradedAt*1000).toLocaleString(I18N.locale()):''} · ${esc(tr('报告语言：{0}',tr((r.feedbackLanguage||'zh')==='en'?'英文报告':'中文报告')))}</p><div class="ai-criteria">${r.criteria.map(c=>`<div><span>${esc(c.name)}</span><b>${esc(c.score)}<small>/5</small></b><p>${esc(c.feedback)}</p></div>`).join('')}</div><details class="ai-detail" open><summary>任务要点核对</summary><div>${r.taskChecks.map(c=>`<p><span class="${c.met?'ai-good':'ai-needs'}">${c.met?'✓':'△'} ${esc(c.requirement)}</span><small>${esc(c.evidence)}</small></p>`).join('')}</div></details><details class="ai-detail" open><summary>优先改进</summary>${r.priorities.map((p,i)=>`<div class="ai-priority"><b>${i+1}. ${esc(p.issue)}</b><p>${esc(p.advice)}</p>${p.example?`<blockquote>${esc(p.example)}</blockquote>`:''}</div>`).join('')}</details><details class="ai-detail" open><summary>原句修改 <small>${r.corrections.length} 处</small></summary>${r.corrections.length?r.corrections.map(c=>`<div class="ai-correction"><span class="ai-category">${esc({grammar:tr('语法'),vocabulary:tr('用词'),organization:tr('组织'),tone:tr('语气'),style:tr('表达建议'),content:tr('内容')}[c.category]||tr('修改建议'))}</span><div class="ai-original">${esc(c.original)}</div><div class="ai-revised">${esc(c.revised)}</div><p>${esc(c.reason)}</p></div>`).join(''):tr('<p>没有发现需要逐句纠正的明显语言问题，可优先参考内容与组织建议。</p>')}</details><details class="ai-detail"><summary>值得保留的优点</summary><ul>${r.strengths.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></details><div class="ai-rewrite"><div class="ai-section-top"><h4>改写参考</h4><button class="chip" data-copy-rewrite>复制</button></div><p>${esc(r.rewriteNote)}</p><pre>${esc(r.improvedResponse)}</pre></div><p class="ai-disclaimer">单题 AI 练习反馈，不等同于 ETS 官方评分或科目成绩。${esc(r.limitations)}</p>`;
}
function slotFor(h,id){let el=document.querySelector(`[data-ai-task="${id}"]`);return el&&document.querySelector('.modal')?.dataset.attemptId===h.id?el:null}
function showAIProgress(h,id,message){let slot=slotFor(h,id);if(!slot)return;let b=slot.querySelector('.ai-grade-button');if(b){b.disabled=true;b.textContent=tr('正在批改…')}slot.querySelector('.ai-feedback-body').innerHTML=L`<div class="ai-loading"><span class="ai-spinner"></span><div>${esc(tr(message))}<small>可以关闭窗口，批改完成后会保存到练习记录。</small></div></div>`}
function showAIError(h,id,message){let slot=slotFor(h,id);if(!slot)return;let b=slot.querySelector('.ai-grade-button');if(b){b.disabled=false;b.textContent=tr('重试 AI 批改')}slot.querySelector('.ai-feedback-body').innerHTML=`<p class="ai-error">${esc(tr(message))}</p>`}
function saveAIResult(h,id,report,language){report.feedbackLanguage=language;h.aiFeedbackByLanguage??={};h.aiFeedbackByLanguage[id]??={};h.aiFeedbackByLanguage[id][language]=report;h.aiFeedback??={};h.aiFeedback[id]=report;if(h.aiJobs){delete h.aiJobs[id+':'+language];if(language==='zh')delete h.aiJobs[id]}save();let slot=language===I18N.lang()?slotFor(h,id):null;if(slot){slot.querySelector('.ai-feedback-body').innerHTML=renderAIReport(report);let b=slot.querySelector('.ai-grade-button');b.disabled=false;b.textContent=tr('报告已保存');bindReportCopies(slot)}}
async function gradeWriting(h,id){
 const language=I18N.lang(),jobKey=id+':'+language;let key=h.id+':'+jobKey;if(feedbackFor(h,id,language)||AI_PENDING.has(key))return;
 let answer=h.responses[id];if(typeof answer!=='string'||!answer.trim())return;
 AI_PENDING.set(key,{message:tr('正在连接本机批改服务…')});showAIProgress(h,id,tr('正在连接本机批改服务…'));
 try{
  let status=await checkAIServer();if(!status.available)throw Error(status.message);
  let jobId=h.aiJobs?.[jobKey]||(language==='zh'?h.aiJobs?.[id]:null),job;
  if(jobId){let r=await fetch('/api/ai/jobs/'+encodeURIComponent(jobId),{cache:'no-store'});if(r.ok)job=await r.json();else if(r.status===404)delete h.aiJobs[jobKey];else throw Error(tr('无法恢复上次批改任务，请稍后重试。'))}
  if(!job){let r=await fetch('/api/ai/grade',{method:'POST',headers:{'Content-Type':'application/json','X-Practice-Token':status.requestToken},body:JSON.stringify({taskId:id,question:BANKMAP[id],answer,feedbackLanguage:language}),signal:AbortSignal.timeout(30000)});job=await r.json();if(!r.ok)throw Error(job.error||tr('无法提交批改。'));h.aiJobs??={};h.aiJobs[jobKey]=job.id;save()}
  let started=Date.now();
  while(job.status==='queued'||job.status==='running'){
   let msg=job.status==='queued'?tr('正在排队，前一篇完成后会开始…'):tr('正在阅读作文、评分并整理具体建议…');AI_PENDING.set(key,{message:msg});showAIProgress(h,id,msg);
   await new Promise(resolve=>setTimeout(resolve,2500));if(Date.now()-started>330000)throw Error(tr('等待较久，任务仍会保留。稍后在练习记录中继续查看。'));
   let r=await fetch('/api/ai/jobs/'+encodeURIComponent(job.id),{cache:'no-store',signal:AbortSignal.timeout(20000)});job=await r.json();if(!r.ok)throw Error(job.error||tr('查询批改状态失败。'))
  }
  if(job.status==='failed'){if(h.aiJobs)delete h.aiJobs[jobKey];save();throw Error(job.error||tr('本次批改失败，请稍后重试。'))}
  if(job.status!=='completed'||!validAIReport(job.result))throw Error(tr('批改结果格式不完整。'));saveAIResult(h,id,job.result,language);toast(tr('写作 AI 批改已保存到练习记录'));
 }catch(e){showAIError(h,id,e.name==='TimeoutError'?tr('本机连接超时，请检查启动窗口是否仍在运行。'):e.message||tr('批改暂时不可用，作文已保留。'))}
 finally{AI_PENDING.delete(key)}
}
window.autoGradeAttempt=async function(h){if(data.autoGradeWriting!==true)return;let ids=h.ids.filter(id=>['email','discussion'].includes(BANKMAP[id].kind)&&String(h.responses[id]||'').trim());if(!ids.length)return;let state=await checkAIServer();if(!state.available)return;for(let id of ids)await gradeWriting(h,id)};
window.refreshAIWidgets=refreshAIWidgets;
document.addEventListener('DOMContentLoaded',()=>checkAIServer());
