import AppKit
import Foundation

// Fixed black-on-white text only; no file reads except system font loading.
// The two literal lines arrive from the accompanying Node generator.
guard CommandLine.arguments.count == 4 else {
    fatalError("Usage: generate-ocr-fixture.swift OUTPUT.png LINE_ONE LINE_TWO")
}
let destination = URL(fileURLWithPath: CommandLine.arguments[1])
let lines = Array(CommandLine.arguments[2...3])
let width = 1600, height = 420, fontSize = 64.0
guard let font = NSFont(name: "Helvetica-Bold", size: CGFloat(fontSize)),
      let bitmap = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: width,
          pixelsHigh: height, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true,
          isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
      let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
    fatalError("The system font or bitmap context is unavailable")
}
NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
context.shouldAntialias = true
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)).fill()
let attributes: [NSAttributedString.Key: Any] = [.font: font, .foregroundColor: NSColor.black]
for (index, line) in lines.enumerated() {
    (line as NSString).draw(at: NSPoint(x: 80, y: CGFloat(280 - index * 150)), withAttributes: attributes)
}
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()
guard let png = bitmap.representation(using: .png, properties: [:]) else {
    fatalError("PNG encoding failed")
}
try png.write(to: destination)
let recipe: [String: Any] = ["width": width, "height": height, "font": font.fontName,
    "fontSize": fontSize, "lines": lines, "background": "white", "foreground": "black",
    "platform": "macOS AppKit", "containsUserMaterial": false]
let data = try JSONSerialization.data(withJSONObject: recipe, options: [.sortedKeys])
print(String(data: data, encoding: .utf8)!)
