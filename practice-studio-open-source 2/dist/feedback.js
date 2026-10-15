'use strict';
var PracticeFeedback = (() => {
 function config() { return window.PRACTICE_PROJECT || {}; }
 function https(value) { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
 function repository() { const value = https(config().repository); return /^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/.test(value) ? value.replace(/\/$/, '') : ''; }
 function environment() {
  const ua = typeof navigator === 'undefined' ? '' : navigator.userAgent || '';
  const os = /Windows/i.test(ua) ? 'Windows' : /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iOS / iPadOS' : /Mac/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Unknown';
  const browser = /Edg\/([\d.]+)/.exec(ua) || /Firefox\/([\d.]+)/.exec(ua) || /Chrome\/([\d.]+)/.exec(ua) || /Version\/([\d.]+).*Safari/.exec(ua);
  const name = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari/.test(ua) ? 'Safari' : 'Unknown';
  return `Practice Studio: ${config().version || 'unknown'}\nOS: ${os}\nBrowser: ${name}${browser ? ' ' + browser[1] : ''}\nUI: ${I18N.lang()}`;
 }
 function issueURL(kind) {
  const base = repository(); if (!base) return '';
  const url = new URL(base + '/issues/new');
  url.searchParams.set('template', kind === 'feature' ? 'feature_request.yml' : 'bug_report.yml');
  url.searchParams.set('environment', environment());
  return url.href;
 }
 function button() { return L`<button class="feedback-button" data-action="feedback">反馈与建议 ↗</button>`; }
 function settings() { return L`<div class="settings-card"><h3>反馈与建议</h3><p>遇到问题或有新想法？欢迎告诉我们。</p><p>项目版本：${esc(config().version || 'unknown')}</p><div class="import-buttons">${button()}${repository() ? L`<a class="btn secondary" href="${esc(repository())}" target="_blank" rel="noopener noreferrer">开源仓库 ↗</a>` : ''}</div></div>`; }
 function show() {
  if (document.querySelector('.overlay')) return;
  const previous = document.activeElement;
  const base = repository(), form = https(config().feedbackForm);
  modal(L`<h2 id="feedback-title">反馈与建议</h2><p>遇到问题或有新想法？欢迎告诉我们。</p><p class="feedback-notice">GitHub 反馈内容公开。请勿附上完整题库、个人作答或录音；截图请先遮住个人信息。</p><div class="feedback-choices">${base ? L`<a class="feedback-choice" href="${esc(issueURL('bug'))}" target="_blank" rel="noopener noreferrer"><b>报告问题 ↗</b><span>描述发生了什么、操作步骤和预期结果。</span></a><a class="feedback-choice" href="${esc(issueURL('feature'))}" target="_blank" rel="noopener noreferrer"><b>提出建议 ↗</b><span>告诉我们想完成什么，以及希望如何改进。</span></a>` : L`<p>维护者尚未配置反馈链接。</p>`}${form ? L`<a class="feedback-choice" href="${esc(form)}" target="_blank" rel="noopener noreferrer"><b>没有 GitHub？通过表单反馈 ↗</b></a>` : ''}</div><label class="feedback-info-label" for="feedback-info">可附上的系统信息</label><textarea id="feedback-info" class="feedback-info" readonly spellcheck="false">${esc(environment())}</textarea><p>反馈链接会预填以上系统信息，可在 GitHub 修改后提交。不会读取题目、作答、录音或账户信息。</p><div class="modal-actions"><button class="btn secondary" id="copy-feedback-info">复制系统信息</button><button class="btn" id="close-feedback">关闭</button></div>`);
  const dialog = document.querySelector('.modal'); dialog.setAttribute('aria-labelledby', 'feedback-title');
  const close = () => { closeModal(); if (previous && previous.isConnected) previous.focus(); };
  document.querySelector('#close-feedback').onclick = close;
  document.querySelector('#copy-feedback-info').onclick = async () => {
   const field = document.querySelector('#feedback-info');
   try { await navigator.clipboard.writeText(field.value); toast(tr('系统信息已复制')); }
   catch { field.focus(); field.select(); toast(tr('请按 Ctrl+C 或 Command+C 复制')); }
  };
  dialog.onkeydown = e => {
   if (e.key === 'Escape') { e.preventDefault(); close(); }
   if (e.key !== 'Tab') return;
   const items = [...dialog.querySelectorAll('a[href],button,textarea')];
   if (e.shiftKey && (document.activeElement === items[0] || document.activeElement === dialog)) { e.preventDefault(); items.at(-1).focus(); }
   else if (!e.shiftKey && document.activeElement === items.at(-1)) { e.preventDefault(); items[0].focus(); }
  };
 }
 return { environment, issueURL, button, settings, show };
})();
