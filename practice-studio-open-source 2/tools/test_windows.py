import contextlib, io, json, os, subprocess, sys, tempfile, unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import local_grader
import windows_start

class WindowsCompatibility(unittest.TestCase):
    def test_npm_shim_uses_node_without_shell(self):
        with tempfile.TemporaryDirectory(prefix='Practice 中文 & space ') as tmp:
            shim=Path(tmp)/'codex.cmd'
            entry=Path(tmp)/'node_modules/@openai/codex/bin/codex.js'
            entry.parent.mkdir(parents=True);entry.write_text('// Original test fixture',encoding='utf-8')
            with patch('local_grader.shutil.which',return_value='C:/Program Files/nodejs/node.exe'):
                prefix=local_grader.codex_invocation(str(shim))
                self.assertEqual(prefix,['C:/Program Files/nodejs/node.exe',str(entry)])
                args=local_grader.command(str(shim),tmp,Path(tmp)/'反馈.json')
                self.assertEqual(args[:3],prefix+['exec'])
                self.assertIn(tmp,args);self.assertIn('forced_login_method="chatgpt"',args)
                with patch('local_grader.subprocess.run',return_value=SimpleNamespace(returncode=0,stdout='Logged in using ChatGPT',stderr='')) as run:
                    self.assertTrue(local_grader.login_status(str(shim)))
                    self.assertEqual(run.call_args.args[0][:2],prefix)
                    self.assertEqual(run.call_args.kwargs['encoding'],'utf-8')
                    self.assertFalse(run.call_args.kwargs.get('shell',False))
            entry.unlink()
            with self.assertRaises(OSError):local_grader.codex_invocation(str(shim))

    def test_launcher_preserves_arguments_without_shell(self):
        with patch('windows_start.os.chdir'),patch('windows_start.subprocess.call',return_value=0) as run:
            self.assertEqual(windows_start.main(['--lang','en','--port','8871','--no-open']),0)
            args=run.call_args.args[0]
            self.assertEqual(args[:3],[sys.executable,'-X','utf8'])
            self.assertEqual(args[4:],['--lang','en','--port','8871','--no-open'])
            self.assertFalse(run.call_args.kwargs.get('shell',False))

    def test_pdf_installer_is_explicit_and_project_local(self):
        with tempfile.TemporaryDirectory(prefix='Practice 中文 ') as tmp:
            root=Path(tmp);target=root/'.venv/Scripts/python.exe'
            with patch('windows_start.ROOT',root),patch('windows_start.venv_python',return_value=target),patch('windows_start.subprocess.run') as run,contextlib.redirect_stdout(io.StringIO()):
                windows_start.setup_pdf()
                self.assertEqual(run.call_args_list[0].args[0],[sys.executable,'-m','venv',str(root/'.venv')])
                self.assertEqual(run.call_args_list[1].args[0],[str(target),'-X','utf8','-m','pip','install','-r',str(root/'requirements.txt')])

    def test_diagnostics_never_launch_grading(self):
        with patch('windows_start.os.chdir'),patch('windows_start.subprocess.call') as launch,patch('local_grader.login_status') as login,contextlib.redirect_stdout(io.StringIO()) as output:
            self.assertEqual(windows_start.main(['--check']),0)
            launch.assert_not_called();login.assert_not_called()
            self.assertIn('no AI requests',output.getvalue())

    def test_unicode_worker_transport(self):
        # Explicit UTF-8 keeps Chinese JSON valid even with a legacy Windows code page.
        result=subprocess.run([sys.executable,'-c',"import sys;sys.stdout.buffer.write('中文反馈'.encode('utf-8'))"],capture_output=True,text=True,encoding='utf-8',check=True)
        self.assertEqual(result.stdout,'中文反馈')

if __name__=='__main__':unittest.main()
