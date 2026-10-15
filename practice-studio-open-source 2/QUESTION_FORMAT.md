# 题库 JSON 格式

下载 `dist/templates/example-questions.json`，修改后通过页面导入。不要上传 `.js` 文件。PDF 可以在页面的独立 PDF 导入入口识别、校对后入库；本文件描述 JSON 格式。

根对象为 `{ "format": "practice-studio-questions", "version": 1, "questions": [...] }`，也接受直接提供题目数组。若提供 format/version，它们必须匹配。

每组共同字段：

| 字段 | 说明 |
|---|---|
| id | 唯一编号，1–64 字符，以字母或数字开头，其余可用字母、数字、下划线、连字符。不得与当前题库重复 |
| kind | fill / daily / academic / email / discussion / repeat / interview |
| title | 标题，最多 160 字符 |
| seconds | 整数，10–7200 秒；口语为每小题，其余为整组。省略时使用训练默认值 |

## 写作：email / discussion

`prompt` 填写完整要求、讨论背景和发言，最多 20000 字符。email 可用 `to`（最多 300）、`subject`（最多 500）。这些都是纯文本。

## 阅读：daily / academic

`passage` 是材料。`questions` 包含 1–50 个对象。每个对象有 `stem` 问题文字、`options` 选项数组和可选的 `answer`。

选择题必须提供 A、B、C、D 四项，格式为 `{ "label": "A", "text": "选项内容" }`；参考答案填对应字母。`options: []` 表示文字作答，`answer` 可填参考句。答案留空或 null 时不计分。参考句按英文字符及数字忽略大小写和标点核对，仅供练习。

## 填词：fill

`passage` 用词首加下划线表示缺字，每条下划线代表一个字母，如 `We ma__ a plan.`。

`answers` 按出现顺序填写**完整单词**，如 `["make"]`，须与词首及总字数匹配。也可用空数组表示无参考答案。空格的位置及长度由程序计算，无需填写 `gaps`。

## 口语：repeat / interview

`questions` 为 1–50 个 `{ "stem": "一句复述文本或面试问题" }`。播放使用浏览器语音合成，不接受远程音频或题目脚本。录音保存在学生自己的浏览器。

## 导入限制

最多 500 组，JSON 文件最多 2 MB。JSON 题库不接受远程图片、可执行 HTML / JavaScript、PDF 内嵌文件等附加资源。未在格式中定义的字段不会保存。重复 id 会阻止本次导入，不会覆盖已有作答。

练习时长是训练设置，未实现官方考试的自适应选题、组句或听力模块。
