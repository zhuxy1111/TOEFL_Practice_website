"""Windows startup, optional PDF setup and diagnostics. No admin rights required."""
from pathlib import Path
import argparse, importlib.util, os, shutil, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]

def venv_python(root=ROOT):
    return root / '.venv' / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')

def setup_pdf():
    target = venv_python()
    if not target.is_file():
        print('Creating a project-only Python environment...', flush=True)
        subprocess.run([sys.executable, '-m', 'venv', str(ROOT / '.venv')], check=True)
    print('Installing text PDF support from PyPI (internet connection required)...', flush=True)
    subprocess.run([str(target), '-X', 'utf8', '-m', 'pip', 'install', '-r', str(ROOT / 'requirements.txt')], cwd=ROOT, check=True)
    print('PDF support installed. Reopen Start Practice.bat. Scanned PDFs also need Poppler and Tesseract on PATH.', flush=True)

def check_setup():
    print('Practice Studio setup check (no AI requests)')
    print('Python 3.10+: ' + ('OK' if sys.version_info >= (3, 10) else 'MISSING'))
    print('Text PDF support (pypdf): ' + ('OK' if importlib.util.find_spec('pypdf') else 'Run Install PDF Support.bat'))
    for program in ['pdftoppm', 'tesseract']:
        print(program + ': ' + ('OK' if shutil.which(program) else 'Not on PATH (needed only for scanned PDF OCR)'))
    from local_grader import codex_binary, codex_invocation
    binary = codex_binary()
    try: ready = bool(binary and codex_invocation(binary))
    except OSError: ready = False
    print('Codex CLI: ' + ('Found; sign in with ChatGPT separately' if ready else 'Not found; optional for writing feedback'))
    print('Questions, answers, keys and account tokens are not included in this check.')

def main(argv=None):
    parser = argparse.ArgumentParser()
    actions = parser.add_mutually_exclusive_group()
    actions.add_argument('--install-pdf', action='store_true')
    actions.add_argument('--check', action='store_true')
    parser.add_argument('--lang', choices=['zh','en'])
    parser.add_argument('--port', type=int)
    parser.add_argument('--no-open', action='store_true')
    args = parser.parse_args(argv)
    if sys.version_info < (3, 10):
        print('Python 3.10 or newer is required.'); return 1
    os.chdir(ROOT)
    try:
        if args.install_pdf: setup_pdf(); return 0
        if args.check: check_setup(); return 0
        cmd = [sys.executable, '-X', 'utf8', str(ROOT/'tools/serve.py')]
        if args.lang: cmd += ['--lang', args.lang]
        if args.port is not None: cmd += ['--port', str(args.port)]
        if args.no_open: cmd += ['--no-open']
        return subprocess.call(cmd, cwd=ROOT)
    except KeyboardInterrupt: return 0
    except (OSError, subprocess.CalledProcessError):
        print('Setup or startup failed. Check the messages above, Python installation and internet connection.'); return 1

if __name__ == '__main__':
    if hasattr(sys.stdout, 'reconfigure'): sys.stdout.reconfigure(encoding='utf-8')
    raise SystemExit(main())
