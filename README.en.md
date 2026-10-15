# Practice Studio

[中文说明](README.md)

A local English-practice app with your own question library. No third-party test bank, PDFs, images or official recordings are bundled. The included sample tasks are original demonstrations.

## Start

Windows users can double-click **Start Practice English.bat** at the repository root. Run **Install PDF Support.bat** before importing text PDFs. See Windows setup below.

Requires Python 3.10+. The app lives in `practice-studio-open-source 2/`. On macOS, open that folder and double-click **Start Practice.command**, or run:

```sh
cd "practice-studio-open-source 2"
python3 tools/serve.py --lang en
```

Open the printed local URL (port 8767 by default). Keep the startup window open while practicing. Use Ctrl+C to stop. Linux uses the same Python command; Windows instructions are below. Use `--port` to choose another port.

Select **中文 / English** at the top of the library or exam screen. The preference is remembered in this browser. Changing the UI preserves progress and the question-entry form. It does not translate uploaded text, answers or saved reports. Stop and save a recording before switching. Close dialogs before changing the language; PDF drafts remain available through **Continue editing drafts** until the page is refreshed.

## Bring your questions

Use **Import & manage questions** to enter a task, import JSON or extract a PDF. Check the preview before adding questions. Supported tasks: word completion, daily-life and academic reading, email writing, academic discussion, listen-and-repeat and interviews.

- JSON: up to 2 MB and 500 sets in the local library. English templates are available in the app. See [QUESTION_FORMAT.en.md](practice-studio-open-source%202/QUESTION_FORMAT.en.md).
- PDF: up to 25 MB, 1,000 pages in the file, 200 pages extracted per batch and 20 OCR pages per batch. Choose a range, task type and splitting method, then edit the draft passage, questions, choices and keys. Complex columns, tables, page breaks and answer appendices can require manual correction. Missing answers are never guessed. Illustration-based tasks need a text description.
- Encrypted PDFs must be unlocked with your own password first. Word files, standalone image uploads and audio question banks are not imported directly.

macOS PDF extraction uses PDFKit and Vision through a Swift helper. A working Swift command-line toolchain is required (`xcode-select --install` if absent). The first run compiles a helper; later runs reuse a private local cache.

On Linux, install text extraction from the app folder with:

```sh
python3 -m pip install -r requirements.txt
```

Scanned-page OCR additionally requires Poppler (`pdftoppm`) and Tesseract (including English language data) on PATH. Without OCR tools, text PDFs can still be extracted.

## Data and feedback

Questions, progress and essays stay in localStorage for the current browser/address; recordings stay in IndexedDB. Export a **full backup** before clearing data or changing devices/ports. It contains your question bank, responses, recordings and reports. Restoring replaces current data and disables automatic grading. Backups can contain private or copyrighted material; do not commit them to a public repository.

PDF files are processed temporarily on this computer and removed when processing ends or fails. Extraction results are discarded from the service after delivery; disconnected results expire after 15 minutes and retained results are bounded. The original PDF and editable drafts are held only in the current page's memory. Import your reviewed questions before refreshing. Extraction and OCR do not use cloud-model quota or paid APIs.

Optional writing feedback requires compatible local Codex installed and signed in with the student's own ChatGPT account. Manual feedback sends only the selected prompt and essay through Codex, using that local account's available quota. It does not configure an additional API key. Availability depends on the account and CLI version.

New reports use the current UI language. Chinese and English reports have separate caches; generating a report in another language uses quota again. Merely switching languages does not submit anything. Existing reports retain their text. Feedback is an unofficial 0–5 task practice score, with edits and a revised example. Speaking recordings are not AI-scored. Automatic writing feedback is off by default and can be explicitly enabled in settings.

**Clear questions & records** removes this address's browser data and recordings. Local AI reports and compiled PDF helpers are separate: stop the server and delete `.local-data/` if you want to remove them too. No shared online question bank or multi-user server is provided. Do not expose the local server publicly; it uses the computer owner's account.

## Open-source scope and checks

```sh
cd "practice-studio-open-source 2"
node tools/test_bank.mjs
node tools/test_pdf_parser.mjs
node tools/test_i18n.mjs
node tools/test_feedback.mjs
python3 -m unittest discover -s tools -p 'test_*.py'
```

Tests use original fixtures and mocked feedback, not cloud-model calls. The app is unaffiliated with or endorsed by ETS or any training provider. Static hosting supports JSON/form practice; local AI feedback and PDF extraction/OCR require the local server.

## Windows startup and PDF setup

1. Install Python 3.10+ from [python.org](https://www.python.org/downloads/windows/), with the Python launcher or Add Python to PATH enabled.
2. Fully extract the repository. Double-click **Start Practice.bat** at the repository root, or **Start Practice English.bat** for English. Keep the window open; press Ctrl+C to stop. The launcher checks Python and opens the browser.
3. For text PDFs, double-click **Install PDF Support.bat**. This explicitly downloads dependencies from PyPI into the app's own `.venv/`, without modifying system Python or requiring administrator access. Restart the app afterward. Normal startup never installs packages.
4. **Check Setup.bat** checks Python, PDF support, OCR tools and Codex discovery. It makes no grading requests and does not print account tokens.

Scanned PDFs additionally need [Poppler](https://poppler.freedesktop.org/) and [Tesseract](https://tesseract-ocr.github.io/tessdoc/Installation.html) with English language data. Add the folders containing `pdftoppm.exe` and `tesseract.exe` to PATH, reopen the startup window and run Check Setup. Text PDFs and manual/JSON entry work without OCR.

Optional AI feedback needs a compatible Codex CLI installed on **native Windows**, signed in with your own ChatGPT account. See the [official Codex CLI guide](https://developers.openai.com/codex/cli). For npm installations, install Node.js first, run `npm install -g @openai/codex`, then run `codex` and choose ChatGPT sign-in. Reopen the app startup window afterward. A WSL-only installation is not visible to native Windows; run the entire Python service inside WSL if using that route. No extra API key is configured.

Windows launchers, explicit UTF-8 handling and npm Codex resolution are included. Checks for this change ran on macOS; native Windows startup, device recording and real AI requests still need validation on Windows hardware. Windows file privacy depends on the user's folder ACLs; keep `.local-data/` out of shared/public folders.

## Feedback and suggestions

Use **Feedback** at the top of the library or in Settings, or open [Report a problem](https://github.com/zhuxy1111/TOEFL_Practice_website/issues/new?template=bug_report.yml) / [Suggest an improvement](https://github.com/zhuxy1111/TOEFL_Practice_website/issues/new?template=feature_request.yml). GitHub requires sign-in and issues are public. Include steps, expected/actual behavior and app/system/browser versions. Do not attach complete question banks, personal essays or recordings.

Links open the GitHub form without submitting it. Review and copy the displayed system information if useful; it includes only app version, OS, browser version and UI language. It never reads questions, answers, recordings or account details.

Maintainers can edit the repository URL, version and optional HTTPS `feedbackForm` in `practice-studio-open-source 2/dist/project.js`. The external-form option stays hidden until configured. Enable Issues and commit `.github/ISSUE_TEMPLATE/` to the default branch for GitHub templates to work.

GitHub Actions runs import, UI, feedback and local-server checks on Windows, macOS and Linux after commits. It never runs real AI grading. See the repository Actions tab for actual results.
