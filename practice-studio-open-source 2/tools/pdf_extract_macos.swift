// Local PDF text extraction and image OCR. No network requests or document scripts.
import Foundation
import PDFKit
import Vision
import AppKit

func finish(_ value: [String: Any]) -> Never {
    if let raw = try? JSONSerialization.data(withJSONObject: value, options: [.sortedKeys]),
       let text = String(data: raw, encoding: .utf8) { print(text) }
    exit(0)
}
let args = CommandLine.arguments
if args.count != 5 { finish(["error": "PDF 参数无效。", "status": 400]) }
guard let doc = PDFDocument(url: URL(fileURLWithPath: args[1])) else {
    finish(["error": "无法打开 PDF，文件可能损坏。", "status": 400])
}
if doc.isLocked { finish(["error": "PDF 已加密，请先用自己的密码解锁后导入。", "status": 400]) }
let total = doc.pageCount
let start = Int(args[2]) ?? 1
let end = min(Int(args[3]) ?? 200, total)
let mode = args[4]
if total > 1000 || start < 1 || start > end || end - start >= 200 {
    finish(["error": "页码无效。每次最多识别 200 页，PDF 总页数最多 1000。", "status": 400])
}
if mode == "force" && end - start >= 20 {
    finish(["error": "强制文字识别每次最多 20 页，请缩小页码范围。", "status": 400])
}
var pages = [[String: Any]]()
var warnings = [String]()
var ocrCount = 0
var totalCharacters = 0
for index in (start - 1)..<end {
    autoreleasepool {
        guard let page = doc.page(at: index) else { return }
        var text = page.string ?? ""
        var method = "text"
        let useful = text.unicodeScalars.filter { CharacterSet.letters.contains($0) }.count
        if mode == "force" || (mode == "auto" && useful < 30) {
            if ocrCount >= 20 {
                warnings.append("第 \(index + 1) 页未识别：本次已达到 20 页 OCR 限额，请分批导入。")
            } else {
                ocrCount += 1
                let bounds = page.bounds(for: .mediaBox)
                let factor = min(2.5, 2000 / max(bounds.width, bounds.height))
                let image = page.thumbnail(of: NSSize(width: bounds.width * factor, height: bounds.height * factor), for: .mediaBox)
                var rect = NSRect(origin: .zero, size: image.size)
                if let cgImage = image.cgImage(forProposedRect: &rect, context: nil, hints: nil) {
                    let request = VNRecognizeTextRequest()
                    request.recognitionLevel = .accurate
                    request.recognitionLanguages = ["en-US", "zh-Hans"]
                    request.usesLanguageCorrection = false
                    do {
                        try VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
                        let observations = (request.results ?? []).sorted {
                            if abs($0.boundingBox.midY - $1.boundingBox.midY) < 0.008 {
                                return $0.boundingBox.minX < $1.boundingBox.minX
                            }
                            return $0.boundingBox.midY > $1.boundingBox.midY
                        }
                        let recognized = observations.compactMap { $0.topCandidates(1).first?.string }.joined(separator: "\n")
                        if !recognized.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { text = recognized; method = "ocr" }
                        else { warnings.append("第 \(index + 1) 页没有识别到文字，可能为空白页或图片题。") }
                    } catch { warnings.append("第 \(index + 1) 页 OCR 未完成，请改用文字版 PDF 或手动输入。") }
                }
            }
        }
        text = String(text.prefix(80000))
        totalCharacters += text.count
        pages.append(["number": index + 1, "text": text, "method": method])
    }
    if totalCharacters > 1500000 { finish(["error": "提取文字过多，请分批导入较小的页码范围。", "status": 413]) }
}
if start != 1 || end != total { warnings.append("本次仅提取第 \(start)–\(end) 页（PDF 共 \(total) 页）。") }
if ocrCount > 0 { warnings.append("已在本机尝试 OCR；请特别核对下划线、数字、选项和多栏文字顺序。") }
finish(["totalPages": total, "pages": pages, "warnings": warnings, "engine": "PDFKit + Apple Vision"])
