"""Temporary, local PDF extraction. Uploaded PDFs never enter dist or the AI grader."""
from pathlib import Path
import hashlib,importlib.util,json,os,platform,shutil,subprocess,sys,tempfile,threading,time,uuid
ROOT=Path(__file__).resolve().parents[1]
MAX_BYTES=25*1024*1024
_NATIVE_LOCK=threading.Lock()
class PDFError(Exception):
 def __init__(self,message,status=400):super().__init__(message);self.status=status

def capabilities():
 native=platform.system()=='Darwin' and bool(shutil.which('swift'))
 text=native or importlib.util.find_spec('pypdf') is not None
 ocr=native or bool(shutil.which('pdftoppm') and shutil.which('tesseract'))
 return {'available':text,'ocr':ocr,'requestToken':None,'maxBytes':MAX_BYTES,'maxPages':200,'maxOCRPages':20,'message':'PDF 在本机临时处理，不发送给 AI。' if text else '需要先安装 PDF 依赖：python3 -m pip install -r requirements.txt'}

def extract_file(path,start=1,end=200,mode='auto'):
 """Runs in an isolated subprocess with a timeout managed by PDFJobs."""
 from pypdf import PdfReader
 reader=PdfReader(path,strict=False)
 if reader.is_encrypted and not reader.decrypt(''):raise PDFError('PDF 已加密，请先解锁后导入。')
 total=len(reader.pages);end=min(end,total)
 if total>1000 or start>end:raise PDFError('页码无效，或 PDF 超过 1000 页。')
 if mode=='force' and end-start>=20:raise PDFError('强制文字识别每次最多 20 页，请缩小页码范围。')
 pages=[];warnings=[];ocr_count=0;characters=0
 for number in range(start,end+1):
  page=reader.pages[number-1]
  # Layout extraction is optional; plain extraction remains available on older files.
  try:text=page.extract_text(extraction_mode='layout') or ''
  except Exception:text=page.extract_text() or ''
  method='text'
  needs_ocr=mode=='force' or (mode=='auto' and sum(c.isalpha() for c in text)<30)
  if needs_ocr:
   if ocr_count>=20:warnings.append(f'第 {number} 页超过本次 OCR 限额，请分批导入。')
   elif shutil.which('pdftoppm') and shutil.which('tesseract'):
    ocr_count+=1
    with tempfile.TemporaryDirectory(prefix='practice-ocr-') as tmp:
     prefix=str(Path(tmp)/'page')
     try:
      subprocess.run(['pdftoppm','-f',str(number),'-l',str(number),'-scale-to','2000','-singlefile','-png',str(path),prefix],capture_output=True,timeout=30,check=True)
      result=subprocess.run(['tesseract',prefix+'.png','stdout','-l','eng','--psm','3'],capture_output=True,text=True,timeout=45,check=True)
      if result.stdout.strip():text=result.stdout;method='ocr'
     except (OSError,subprocess.SubprocessError):warnings.append(f'第 {number} 页 OCR 未完成，请检查本机 OCR 依赖。')
   else:warnings.append(f'第 {number} 页文字较少：本机未配置 OCR，可安装 Poppler 和 Tesseract 或复制文字手动输入。')
  text=text[:80000];characters+=len(text)
  if characters>1500000:raise PDFError('文字过多，请分批导入较小的页码范围。',413)
  pages.append({'number':number,'text':text,'method':method})
 if start!=1 or end!=total:warnings.append(f'本次提取第 {start}–{end} 页，PDF 共 {total} 页。')
 if ocr_count:warnings.append('OCR 结果请核对下划线、数字、选项和多栏文字顺序。')
 return {'totalPages':total,'pages':pages,'warnings':warnings,'engine':'pypdf / optional local OCR'}

def native_helper():
 # Cache only the compiled program and public SDK modules, never PDF content.
 source=ROOT/'tools/pdf_extract_macos.swift'
 fingerprint=hashlib.sha256(source.read_bytes()+platform.machine().encode()).hexdigest()[:16]
 cache=ROOT/'.local-data/pdf-runtime';binary=cache/('extract-'+fingerprint)
 with _NATIVE_LOCK:
  if binary.is_file():return binary
  cache.mkdir(parents=True,exist_ok=True,mode=0o700)
  compiler=shutil.which('swiftc')
  if not compiler:raise PDFError('需要 macOS Swift 命令行工具，或安装 requirements.txt。',503)
  with tempfile.TemporaryDirectory(prefix='build-',dir=cache) as build:
   target=Path(build)/'extract'
   result=subprocess.run([compiler,'-module-cache-path',str(cache/'modules'),str(source),'-o',str(target)],capture_output=True,text=True,timeout=180)
   if result.returncode:raise PDFError('无法准备 macOS PDF 识别程序，请检查 Swift 命令行工具。',503)
   target.chmod(0o700);target.replace(binary)
 return binary

def run_extraction(raw,start,end,mode):
 with tempfile.TemporaryDirectory(prefix='practice-pdf-') as tmp:
  source=Path(tmp)/'input.pdf';source.write_bytes(raw);source.chmod(0o600)
  native=platform.system()=='Darwin' and shutil.which('swift')
  if native:
   try:helper=native_helper()
   except (PDFError,subprocess.TimeoutExpired):
    if importlib.util.find_spec('pypdf') is None:raise PDFError('请安装 macOS Swift 命令行工具，或用 pip 安装 requirements.txt。',503)
    helper=None
   args=([str(helper),str(source),str(start),str(end),mode] if helper else [sys.executable,str(Path(__file__).resolve()),str(source),str(start),str(end),mode])
  else:
   args=[sys.executable,str(Path(__file__).resolve()),str(source),str(start),str(end),mode]
  # No shell evaluation, user-controlled file paths, model calls or persistent PDF copies.
  try:result=subprocess.run(args,capture_output=True,text=True,timeout=240,cwd=tmp)
  except subprocess.TimeoutExpired:raise PDFError('识别超时，请缩小页码范围后重试。',504)
  except OSError:raise PDFError('无法启动本机 PDF 识别程序，请检查运行依赖。',503)
  if result.returncode:raise PDFError('PDF 识别程序未能运行。macOS 请检查 Swift 命令行工具；其他系统请安装 requirements.txt。',503)
  try:payload=json.loads(result.stdout)
  except ValueError:raise PDFError('PDF 识别未返回有效结果，请更换文件或减少页码。',422)
  if 'error' in payload:raise PDFError(payload['error'],payload.get('status',400))
  if not payload.get('pages'):raise PDFError('没有可识别的页面。',422)
  return payload

class PDFJobs:
 def __init__(self,runner=None):
  self.jobs={};self.lock=threading.Lock();self.gate=threading.Semaphore(1);self.runner=runner or run_extraction
 def submit(self,raw,start=1,end=200,mode='auto'):
  if not isinstance(raw,bytes) or not raw.startswith(b'%PDF-'):raise PDFError('请选择有效的 PDF 文件。')
  if not 0<len(raw)<=MAX_BYTES:raise PDFError('PDF 最大支持 25 MB。',413)
  if type(start)is not int or type(end)is not int or not 1<=start<=end<=1000 or end-start>=200:raise PDFError('每次支持连续 1–200 页，页码范围为 1–1000。')
  if mode not in {'auto','never','force'}:raise PDFError('文字识别模式无效。')
  if not capabilities()['available']:raise PDFError(capabilities()['message'],503)
  with self.lock:
   now=time.time()
   for key in list(self.jobs):
    if self.jobs[key]['status']not in {'queued','running'} and now-self.jobs[key]['createdAt']>900:del self.jobs[key]
   if sum(j['status']in {'queued','running'} for j in self.jobs.values())>=2:raise PDFError('PDF 识别队列已满，请等待当前任务完成。',429)
   # Bound retained text in memory, including when a browser disconnects.
   completed=[key for key,j in self.jobs.items() if j['status']not in {'queued','running'}]
   while len(completed)>=3:del self.jobs[completed.pop(0)]
   jid=uuid.uuid4().hex;job={'id':jid,'status':'queued','createdAt':now};self.jobs[jid]=job
  threading.Thread(target=self._run,args=(jid,raw,start,end,mode),daemon=True).start()
  return dict(job)
 def _run(self,jid,raw,start,end,mode):
  with self.gate:
   with self.lock:self.jobs[jid]['status']='running'
   try:
    result=self.runner(raw,start,end,mode)
    with self.lock:self.jobs[jid].update(status='completed',result=result)
   except Exception as e:
    with self.lock:self.jobs[jid].update(status='failed',error=str(e) if isinstance(e,PDFError) else '无法识别这份 PDF，请尝试文字版或更小的页码范围。')
 def get(self,jid):
  with self.lock:
   if jid not in self.jobs:raise PDFError('识别结果已过期，请重新选择 PDF。',404)
   if self.jobs[jid]['status']not in {'queued','running'} and time.time()-self.jobs[jid]['createdAt']>900:
    del self.jobs[jid];raise PDFError('识别结果已过期，请重新选择 PDF。',404)
   return dict(self.jobs[jid])
 def discard(self,jid):
  with self.lock:
   if jid in self.jobs and self.jobs[jid]['status']not in {'queued','running'}:del self.jobs[jid]

if __name__=='__main__':
 try:
  # Limit resource use for untrusted compressed PDF content on Unix.
  if os.name=='posix':
   import resource
   resource.setrlimit(resource.RLIMIT_AS,(2*1024**3,2*1024**3))
   resource.setrlimit(resource.RLIMIT_CPU,(180,180))
  print(json.dumps(extract_file(Path(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]),sys.argv[4]),ensure_ascii=False))
 except PDFError as e:print(json.dumps({'error':str(e),'status':e.status},ensure_ascii=False))
 except Exception:print(json.dumps({'error':'PDF 可能损坏或无法读取。请尝试重新导出。','status':422},ensure_ascii=False))
