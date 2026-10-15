from pathlib import Path
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from urllib.parse import urlparse,parse_qs
import argparse,json,secrets,webbrowser
from local_grader import Grader,GradingError
from pdf_import import PDFJobs,PDFError,capabilities,MAX_BYTES
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT/'dist'),**kwargs)
 def end_headers(self):
  self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');super().end_headers()
 def safe_request(self,write=False):
  host=self.headers.get('Host','');port=self.server.server_port
  if host not in {f'127.0.0.1:{port}',f'localhost:{port}'}:return False
  origin=self.headers.get('Origin');allowed={f'http://127.0.0.1:{port}',f'http://localhost:{port}'}
  if origin and origin not in allowed:return False
  if self.headers.get('Sec-Fetch-Site')=='cross-site':return False
  if write and (origin not in allowed or not secrets.compare_digest(self.headers.get('X-Practice-Token',''),self.server.request_token)):return False
  return True
 def json(self,code,body):
  raw=json.dumps(body,ensure_ascii=False).encode();self.send_response(code);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
 def do_GET(self):
  if not self.safe_request():return self.json(403,{'error':'只允许从本机平台访问。'})
  path=urlparse(self.path).path
  if path=='/api/pdf/status':
   s=capabilities();s['requestToken']=self.server.request_token;return self.json(200,s)
  if path.startswith('/api/pdf/jobs/'):
   try:return self.json(200,self.server.pdf_jobs.get(path.rsplit('/',1)[-1]))
   except PDFError as e:return self.json(e.status,{'error':str(e)})
  if path=='/api/ai/status':
   s=self.server.grader.status();s['requestToken']=self.server.request_token;return self.json(200,s)
  if path.startswith('/api/ai/jobs/'):
   try:return self.json(200,self.server.grader.get(path.rsplit('/',1)[-1]))
   except GradingError as e:return self.json(e.status,{'error':str(e)})
  if path.startswith('/api/'):return self.json(404,{'error':'没有这个接口。'})
  super().do_GET()
 def do_POST(self):
  if not self.safe_request(write=True):return self.json(403,{'error':'请从本机练习平台发起批改。'})
  if urlparse(self.path).path=='/api/pdf/extract':
   try:
    if self.headers.get_content_type()!='application/pdf':raise PDFError('仅接受 PDF 文件。',415)
    length=int(self.headers.get('Content-Length','0'))
    if not 0<length<=MAX_BYTES:raise PDFError('PDF 最大支持 25 MB。',413)
    params=parse_qs(urlparse(self.path).query);start=int(params.get('start',['1'])[0]);end=int(params.get('end',['200'])[0]);mode=params.get('ocr',['auto'])[0]
    job=self.server.pdf_jobs.submit(self.rfile.read(length),start,end,mode);return self.json(202,job)
   except (ValueError,UnicodeError):return self.json(400,{'error':'PDF 参数无效。'})
   except PDFError as e:return self.json(e.status,{'error':str(e)})
  if urlparse(self.path).path!='/api/ai/grade':return self.json(404,{'error':'没有这个接口。'})
  try:
   length=int(self.headers.get('Content-Length','0'))
   if not 0<length<=80000:raise GradingError('请求过大或为空。',413)
   if self.headers.get_content_type()!='application/json':raise GradingError('仅接受 JSON 请求。',415)
   body=json.loads(self.rfile.read(length));job=self.server.grader.submit(body);self.json(200 if job['status']=='completed' else 202,job)
  except (ValueError,UnicodeError):self.json(400,{'error':'请求内容无效。'})
  except GradingError as e:self.json(e.status,{'error':str(e)})
 def do_DELETE(self):
  if not self.safe_request(write=True):return self.json(403,{'error':'请从本机平台操作。'})
  path=urlparse(self.path).path
  if not path.startswith('/api/pdf/jobs/'):return self.json(404,{'error':'没有这个接口。'})
  self.server.pdf_jobs.discard(path.rsplit('/',1)[-1]);return self.json(200,{'deleted':True})
 def log_message(self,fmt,*args):
  # Never log essay text, credentials, or full request bodies.
  if args and isinstance(args[0],str) and ('/api/ai/jobs/'in args[0] or '/api/pdf/jobs/'in args[0]):return
  super().log_message(fmt,*args)
def make_server(port=8767):
 server=ThreadingHTTPServer(('127.0.0.1',port),Handler);server.grader=Grader();server.pdf_jobs=PDFJobs();server.request_token=secrets.token_urlsafe(32);server.daemon_threads=True;return server
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8767);p.add_argument('--no-open',action='store_true');p.add_argument('--lang',choices=['zh','en'],default=None);args=p.parse_args()
 try:server=make_server(args.port)
 except OSError:
  print('The local port is unavailable. Close the previous startup window and try again.' if args.lang=='en' else '本机端口已被使用。请先关闭旧的“开始练习”窗口，然后重新双击启动。',flush=True);raise SystemExit(1)
 url=f'http://127.0.0.1:{server.server_port}'+(('?lang='+args.lang) if args.lang else '')
 print(('Practice Studio is running: '+url+'\nWriting feedback uses the local ChatGPT plan quota.\nKeep this window open while practicing; close it to stop.') if args.lang=='en' else 'Practice Studio 已启动：'+url+'\n写作 AI 批改使用现有 ChatGPT 套餐额度。\n保持此窗口开启即可练习，关闭窗口结束服务。',flush=True)
 if not args.no_open:webbrowser.open(url)
 try:server.serve_forever()
 except KeyboardInterrupt:server.server_close()
