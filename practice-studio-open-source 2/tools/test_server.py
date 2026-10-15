import json, threading, unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from unittest.mock import patch
from serve import make_server

class ServerTests(unittest.TestCase):
    def test_local_static_and_pdf_routes(self):
        with patch('serve.Grader'):
            server=make_server(0)
        worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
        base='http://127.0.0.1:'+str(server.server_port)
        try:
            for path in ['/','/project.js','/feedback.js']:
                with urlopen(base+path,timeout=5) as response:self.assertEqual(response.status,200)
            with urlopen(base+'/api/pdf/status',timeout=5) as response:
                status=json.load(response);self.assertEqual(status['requestToken'],server.request_token)
            with self.assertRaises(HTTPError) as rejected:urlopen(Request(base+'/api/pdf/extract',data=b'%PDF-1.4 test',headers={'Content-Type':'application/pdf'}),timeout=5)
            self.assertEqual(rejected.exception.code,403);rejected.exception.close()
        finally:server.shutdown();server.server_close();worker.join(timeout=5)

if __name__=='__main__':unittest.main()
