import time,unittest
from unittest.mock import patch
from pdf_import import PDFJobs,PDFError,MAX_BYTES
class PDFTests(unittest.TestCase):
 def setUp(self):
  self.calls=0
  def run(raw,start,end,mode):self.calls+=1;return {'totalPages':1,'pages':[{'number':1,'text':'Original test text','method':'text'}],'warnings':[]}
  self.jobs=PDFJobs(runner=run);self.cap=patch('pdf_import.capabilities',return_value={'available':True});self.cap.start()
 def tearDown(self):self.cap.stop()
 def wait(self,job):
  for _ in range(100):
   result=self.jobs.get(job['id'])
   if result['status']not in {'queued','running'}:return result
   time.sleep(.01)
  self.fail('Extraction timed out')
 def test_temporary_result_and_discard(self):
  job=self.wait(self.jobs.submit(b'%PDF-1.4\ntest',1,1,'never'));self.assertEqual(job['status'],'completed');self.assertEqual(self.calls,1);self.assertNotIn('raw',job);self.jobs.discard(job['id'])
  with self.assertRaises(PDFError):self.jobs.get(job['id'])
 def test_reject_invalid_files_and_limits(self):
  for args in [(b'plain text',1,1,'auto'),(b'%PDF-'+b'x'*MAX_BYTES,1,1,'auto'),(b'%PDF-',0,1,'auto'),(b'%PDF-',5,4,'auto'),(b'%PDF-',1,201,'auto'),(b'%PDF-',1,1,'remote')]:
   with self.assertRaises(PDFError):self.jobs.submit(*args)
 def test_failure_does_not_expose_exception(self):
  def fail(*args):raise RuntimeError('private /secret/path')
  self.jobs.runner=fail;job=self.wait(self.jobs.submit(b'%PDF-1.4',1,1));self.assertEqual(job['status'],'failed');self.assertNotIn('secret',job['error'])
 def test_expired_result_is_removed(self):
  job=self.wait(self.jobs.submit(b'%PDF-1.4',1,1));self.jobs.jobs[job['id']]['createdAt']=time.time()-1000
  with self.assertRaises(PDFError):self.jobs.get(job['id'])
 def test_result_retention_bounded(self):
  for _ in range(8):self.wait(self.jobs.submit(b'%PDF-1.4',1,1))
  self.assertLessEqual(len(self.jobs.jobs),3)
if __name__=='__main__':unittest.main()
