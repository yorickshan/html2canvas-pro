// Real macOS WKWebView host for local filter pixel regressions. No Safari automation.
import AppKit
import WebKit

final class Probe: NSObject, WKNavigationDelegate {
    let output: URL
    let view: WKWebView
    let window: NSWindow
    let cases = ["combined", "z-order", "nested-outset", "text-box-shadow"]
    var results: [[String: Any]] = []
    var index = 0
    init(url: URL, output: URL) {
        self.output = output
        view = WKWebView(frame: NSRect(x: 0, y: 0, width: 1100, height: 1000))
        window = NSWindow(contentRect: view.frame, styleMask: [.borderless], backing: .buffered, defer: false)
        super.init()
        view.navigationDelegate = self
        window.contentView = view
        // Keep an actual window-backed view without activating or covering the user's app.
        window.setFrameOrigin(NSPoint(x: -1200, y: 0))
        window.orderBack(nil)
        view.load(URLRequest(url: url))
    }
    func fail(_ error: Error) -> Never {
        FileHandle.standardError.write(Data("WKWebView probe failed: \(error)\n".utf8))
        exit(1)
    }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { fail(error) }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) { fail(error) }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { print("WKWebView loaded fixture"); runCase() }
    func runCase() {
        if index == cases.count * 2 {
            do {
                let data = try JSONSerialization.data(withJSONObject: results, options: [.prettyPrinted, .sortedKeys])
                try data.write(to: output.appendingPathComponent("results.json"))
                print("PASS: real WKWebView captured \(results.count) native/canvas comparisons")
                window.close()
                exit(0)
            } catch { fail(error) }
        }
        print("WKWebView capture \(index + 1) / \(cases.count * 2)")
        let id = cases[index % cases.count]
        let requestedScale = index < cases.count ? 1 : 2
        view.callAsyncJavaScript("""
            const element = document.getElementById(id);
            element.scrollIntoView({block:'start'});
            await document.fonts.ready;
            const b = element.getBoundingClientRect();
            return {x:b.x, y:b.y, width:b.width, height:b.height};
            """, arguments: ["id": id], in: nil, in: .page) { result in
            switch result {
            case .failure(let error): self.fail(error)
            case .success(let value):
                guard let bounds = value as? [String: Double] else { self.fail(NSError(domain: "Invalid bounds", code: 1)) }
                let config = WKSnapshotConfiguration()
                config.rect = CGRect(x: bounds["x"]!, y: bounds["y"]!, width: bounds["width"]!, height: bounds["height"]!)
                config.snapshotWidth = NSNumber(value: bounds["width"]! * Double(requestedScale) / self.window.backingScaleFactor)
                self.view.takeSnapshot(with: config) { image, error in
                    if let error = error { self.fail(error) }
                    guard let tiff = image?.tiffRepresentation, let bitmap = NSBitmapImageRep(data: tiff), let png = bitmap.representation(using: .png, properties: [:]) else { self.fail(NSError(domain: "Empty snapshot", code: 1)) }
                    let scale = Double(bitmap.pixelsWide) / bounds["width"]!
                    self.capture(id: id, scale: scale, native: png)
                }
            }
        }
    }
    func capture(id: String, scale: Double, native: Data) {
        view.callAsyncJavaScript("""
            const {default: baseline} = await import('/build/html2canvas-pro-baseline.esm.js');
            const element = document.getElementById(id);
            const canvas = await html2canvas(element, {scale, backgroundColor:null, logging:false});
            const before = await baseline(element, {scale, backgroundColor:null, logging:false});
            const context = document.createElement('canvas').getContext('2d');
            return {png:canvas.toDataURL(), before:before.toDataURL(), width:canvas.width, height:canvas.height,
                userAgent:navigator.userAgent, canvasFilterAvailable:'filter' in context,
                leftoverIframes:document.querySelectorAll('.html2canvas-container').length};
            """, arguments: ["id": id, "scale": scale], in: nil, in: .page) { result in
            switch result {
            case .failure(let error): self.fail(error)
            case .success(let value):
                guard var row = value as? [String: Any], let encoded = row.removeValue(forKey: "png") as? String,
                    let png = Data(base64Encoded: String(encoded.split(separator: ",", maxSplits: 1)[1])) else { self.fail(NSError(domain: "Invalid canvas result", code: 1)) }
                guard let beforeUrl = row.removeValue(forKey: "before") as? String, let before = Data(base64Encoded: String(beforeUrl.split(separator: ",", maxSplits: 1)[1])) else { self.fail(NSError(domain: "Invalid baseline result", code: 1)) }
                row["id"] = id; row["scale"] = scale
                row["host"] = "macOS WKWebView"; row["os"] = ProcessInfo.processInfo.operatingSystemVersionString
                let prefix = "\(Int(scale))-\(id)"
                do {
                    try native.write(to: self.output.appendingPathComponent(prefix + "-native.png"))
                    try png.write(to: self.output.appendingPathComponent(prefix + "-capture.png"))
                    try before.write(to: self.output.appendingPathComponent(prefix + "-before.png"))
                } catch { self.fail(error) }
                self.results.append(row)
                self.index += 1
                self.runCase()
            }
        }
    }
}
let args = CommandLine.arguments
if args.count != 3 { print("Usage: FilterProbe URL OUTPUT_DIRECTORY"); exit(1) }
let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let output = URL(fileURLWithPath: args[2], isDirectory: true)
try FileManager.default.createDirectory(at: output, withIntermediateDirectories: true)
let probe = Probe(url: URL(string: args[1])!, output: output)
DispatchQueue.main.asyncAfter(deadline: .now() + 90) { probe.fail(NSError(domain: "Probe timed out", code: 1)) }
app.run()
