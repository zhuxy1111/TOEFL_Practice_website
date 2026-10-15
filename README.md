# Practice Studio
如果觉得还不错，请给我个star⭐️
[English documentation](README.en.md)

自带题库的本地英语练习平台。首次启动是空题库，不附带第三方试题、PDF、图片或官方音频。

## 启动

Windows 用户可直接在仓库最外层双击 **Start Practice.bat**；首次识别 PDF 前运行 **Install PDF Support.bat**。详细步骤见下方「Windows 启动与 PDF 安装」。

需要 Python 3.10+。程序在 `practice-studio-open-source 2/` 子文件夹中；macOS 进入该文件夹后可以双击「开始练习.command」，或在项目目录运行：

```sh
cd "practice-studio-open-source 2"
python3 tools/serve.py
```

打开 http://127.0.0.1:8767 。保持启动窗口开启，按 Ctrl+C 结束服务。Linux 使用同一 Python 命令；Windows 启动方式见下方。端口可用 `--port` 指定。

纯前端练习也可以由任意静态服务器托管 `dist/`；此时本机 AI 批改及 PDF 提取 / OCR 不可用，JSON 导入和手动录题仍可使用。不要把本机批改服务暴露到公网，它使用启动电脑自己的登录和额度，不是多用户服务。

## 中英文界面

首页顶部和考试页头部可切换「中文 / English」，选择保存在当前浏览器。界面切换不翻译题目、PDF 原文、学生作答或已有报告；练习进度和录题表单会保留。录音中请先停止并等待保存，弹窗内请先关闭再切换，PDF 校对草稿可点「稍后继续」后切换语言再打开。

新写作报告采用请求时的界面语言。中文和英文报告分别缓存并保留；生成另一种语言需要再次使用额度，切换界面本身不会触发批改。原句与修改示例继续使用英语。

`Start Practice.command` 使用英文启动入口；也可运行 `python3 tools/serve.py --lang en`。两种入口使用同一程序及同一网址下的题库，不会复制用户数据。英文说明见 [README.en.md](README.en.md)，英文题库格式见 [QUESTION_FORMAT.en.md](practice-studio-open-source%202/QUESTION_FORMAT.en.md)。

## 导入题目

1. 打开「导入与管理题库」。
2. 上传自己的 PDF，或直接填写题目表单 / 导入 JSON。
3. PDF 会在本机提取文字和生成草稿，可按题型及页码整理。
4. 对照原文修改草稿，确认材料使用权后加入题库。
5. 返回题库开始计时练习。

支持阅读填词、生活阅读、学术阅读、邮件写作、学术讨论、听与复述、模拟面试。JSON 最多 2 MB、总计 500 组；未知字段会被丢弃。题目只显示纯文本，不执行 HTML 或 JavaScript，也不加载题目文件提供的远程地址。

支持文字 PDF 提取和扫描 PDF 本机 OCR；暂不支持直接导入 Word、单独图片或录音题库。口语使用浏览器合成语音，不代表官方音频。模板中的七组题为本项目新编演示材料，不是官方试题。详见 [题库格式](practice-studio-open-source%202/QUESTION_FORMAT.md)。

## PDF 识别

从「导入与管理题库」选择 PDF，设置页码、题型和拆题方式，再点击「识别并整理草稿」。支持按标题自动拆分、每页一组或将整个范围作为一组；草稿可逐组修改题型、标题、阅读材料、问题、选项、参考答案和时限，也可取消导入某一组。

- 单文件最多 25 MB，PDF 最多 1000 页，每批最多提取 200 页；扫描 OCR 每批最多 20 页，可分批处理。
- macOS 使用系统 PDFKit / Vision，由 Swift 小程序调用。需要已安装可用的 Swift 命令行工具；如尚未安装，可先执行 `xcode-select --install` 并完成系统安装。首次使用会编译本机程序，后续复用 `.local-data/pdf-runtime/` 中的编译缓存。
- Linux 的文字提取先在程序目录安装 `python3 -m pip install -r requirements.txt`。扫描 OCR 额外需要 `pdftoppm`（Poppler）和 `tesseract`（含英语语言数据）在 PATH 中；没有 OCR 时会显示缺失提示，文字版仍可导入。
- 规则识别只生成草稿。复杂多栏、表格、跨页题和答案集中在附录的材料可能需要手动拆分或补充答案。程序不会猜测缺失答案；没有参考答案的阅读题不计分。图片题目前需另行补充文字说明，导入结果不保留题中插图。
- 加密 PDF 请先用自己的密码解锁；损坏文件或超时会给出提示。

PDF 仅发送到当前电脑的本地服务，临时文件在处理完成或失败后清除，不写入题库目录。结果在浏览器收到后请求清除服务内存副本；断开连接的结果最多保留 15 分钟并限制数量。文本草稿和原 PDF 浏览器链接只在当前页面内存中保存，刷新前请确认入库。最终入库仅保存校对后的文字题目，不保存原 PDF。PDF 提取、OCR 和规则拆题不调用云端大模型，不使用付费 API 或 ChatGPT 套餐额度。手动批改写作时仍会发送所选题目和该篇作文。

## 保存、备份与删除

题库、进度和作文存入当前网址的 localStorage，录音存入 IndexedDB。不同浏览器、设备、端口的记录不互通。没有公共题库、云端同步或多用户账户。

「导出题目 JSON」只导出题目；「导出完整备份」包括题目、作答、报告和录音。恢复完整备份会替换当前数据；恢复后自动批改保持关闭，旧的后台任务标识会被清除。备份可能含受版权保护的材料和个人数据，勿提交到公开仓库。

「清空题库与记录」删除当前网址下的浏览器题库、记录、报告副本和录音。本机 AI 生成的缓存报告另存于 `.local-data/writing-feedback.json`，如需删除，请先停止服务，再删除 `.local-data/` 文件夹。

## 可选写作 AI 批改

需要电脑已安装兼容的 Codex CLI，并已通过自己的 ChatGPT 账户登录。默认模型由 `tools/local_grader.py` 中的 `MODEL` 指定，适用性取决于该账户和 CLI 版本；未登录也可练习。

默认不自动批改。手动点击「AI 批改」会把所选题目和该篇作文通过 Codex 发给模型；如果主动开启自动批改，交卷后会执行相同传输。不会把其他题库材料一并发送。该模式使用本机账户可用的套餐额度，不配置额外 API 密钥。账户权益、额度和 CLI 可用性以服务提供方为准。

报告给出 0–5 分单题练习评分、具体修改和改写示例，不是官方考试评分。目前不支持口语 AI 录音评分。缓存指纹包含题目内容和作文，改变题目不会误用旧报告。模型被限制为只生成反馈，不执行题目中的指令。

## 开源范围

本项目与 ETS、培训机构无隶属、赞助或认可关系。

## 检查

```sh
cd "practice-studio-open-source 2"
node tools/test_bank.mjs
node tools/test_pdf_parser.mjs
node tools/test_i18n.mjs
node tools/test_feedback.mjs
python3 -m unittest discover -s tools -p 'test_*.py'
```

测试使用原创示例和模拟反馈，不触发模型调用或使用登录额度。

## Windows 启动与 PDF 安装

1. 从 [Python 官网](https://www.python.org/downloads/windows/) 安装 Python 3.10 或更新版本，启用 Python launcher 或 Add Python to PATH。
2. 下载并完整解压仓库，双击仓库最外层的 **Start Practice.bat**。英文入口是 **Start Practice English.bat**。启动器会检查 Python 版本，自动打开浏览器；保持窗口开启，按 Ctrl+C 停止。
3. 需要识别文字型 PDF 时，双击 **Install PDF Support.bat**。它联网从 PyPI 安装 `requirements.txt` 到程序自己的 `.venv/`，不更改系统 Python，不需要管理员权限。安装后重新启动平台；普通启动不会联网安装任何内容。
4. **Check Setup.bat** 检查 Python、PDF 依赖、OCR 工具和 Codex 是否可找到，不触发批改、不输出账户令牌。

扫描 PDF 的 OCR 还需安装 [Poppler](https://poppler.freedesktop.org/) 和 [Tesseract（Windows 安装说明）](https://tesseract-ocr.github.io/tessdoc/Installation.html)，安装英语语言数据，并将 `pdftoppm.exe`、`tesseract.exe` 所在目录加入 PATH；重新打开启动窗口后用 Check Setup 检查。未安装 OCR 时，文字型 PDF 和手动 / JSON 导入仍可使用。

可选 AI 批改需要 **Windows 本机**安装兼容的 Codex CLI 并通过自己的 ChatGPT 登录。参考 [OpenAI 官方 CLI 说明](https://developers.openai.com/codex/cli)；如果使用 npm 安装，先安装 Node.js，再运行 `npm install -g @openai/codex`，运行 `codex` 选择 ChatGPT 登录。安装后重开平台启动窗口。仅在 WSL 内安装不等于 Windows 服务能找到；如果使用 WSL，请在 WSL 中完整运行 Python 服务。项目不会切换到额外 API 付费。

Windows 启动器、UTF-8 文件处理和 npm Codex 启动方式已补齐；当前修改在 macOS 上检查，Windows 实机启动、设备录音和真实 AI 请求仍需 Windows 用户验证。Windows 的访问权限由系统账户和文件夹 ACL 管理，请勿将 `.local-data/` 放在公共共享目录。

## 反馈与建议

平台首页右上角及设置页提供「反馈与建议」，可选择 [报告问题](https://github.com/zhuxy1111/TOEFL_Practice_website/issues/new?template=bug_report.yml) 或 [提出建议](https://github.com/zhuxy1111/TOEFL_Practice_website/issues/new?template=feature_request.yml)。GitHub 需要登录，内容公开。请描述操作步骤、预期与实际结果，附上版本、系统和浏览器信息；勿上传完整题库、个人作文或录音。

按钮只打开 GitHub 表单，不会自动提交。系统信息仅包含版本、操作系统、浏览器版本和界面语言，可查看后复制；不读取题库、作文、录音或账户信息。

维护者可修改 `practice-studio-open-source 2/dist/project.js` 中的仓库地址、版本号及可选 `feedbackForm` 链接。尚未配置外部问卷时，平台不显示问卷入口；以后填入 HTTPS 问卷地址即可为没有 GitHub 账户的学生提供反馈渠道。仓库需要开启 Issues，并将 `.github/ISSUE_TEMPLATE/` 提交到默认分支，模板才会在 GitHub 生效。

仓库附带 GitHub Actions 检查：提交后会在 Windows、macOS、Linux 上运行导入、界面、反馈和本地服务测试，不运行真实 AI 批改。请以仓库 Actions 页的实际运行结果为准。
