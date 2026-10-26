import XCTest
@testable import PayPingEngine

func library() throws -> URL {
  if let path = ProcessInfo.processInfo.environment["PAYPING_PARSER_LIBRARY"] { return URL(fileURLWithPath: path) }
  var url = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
  while url.path != "/" {
    let root = url.appendingPathComponent("parser-library")
    if FileManager.default.fileExists(atPath: root.path) { return root }
    url.deleteLastPathComponent()
  }
  throw EngineError.invalid("Cannot find parser-library; set PAYPING_PARSER_LIBRARY")
}
func defaultGeneric() throws -> String { try String(contentsOf: library().appendingPathComponent("generic.default.json"), encoding: .utf8) }
final class ConformanceTests: XCTestCase {
  func testAllSharedAndRealFixtures() throws {
    let root = try library()
    let parsers = try FileManager.default.contentsOfDirectory(at: root.appendingPathComponent("parsers"), includingPropertiesForKeys: nil).filter { $0.pathExtension == "json" }.sorted { $0.lastPathComponent < $1.lastPathComponent }.map { try Parser.decode(String(contentsOf: $0, encoding: .utf8)) }
    let engine = RuleEngine(parsers: parsers, generic: try GenericConfig.decode(defaultGeneric()))
    var counts: [String: Int] = [:]
    for directory in ["fixtures", "fixtures-real"] {
      for file in try FileManager.default.contentsOfDirectory(at: root.appendingPathComponent(directory), includingPropertiesForKeys: nil).filter({ $0.pathExtension == "json" }).sorted(by: { $0.lastPathComponent < $1.lastPathComponent }) {
        let cases = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: file)) as? [[String: Any]])
        for fixture in cases {
          let label = "\(directory)/\(file.lastPathComponent): \(fixture["name"] ?? "")"
          let result = engine.parse(title: fixture["title"] as! String, body: fixture["body"] as! String, sourceApp: fixture["sourceApp"] as! String, platform: fixture["platform"] as! String)
          var expected = fixture["expect"] as! [String: Any]; if expected["currency"] == nil { expected["currency"] = "MYR" }
          for (key, value) in expected {
            if key == "amountMinor", let number = value as? NSNumber { XCTAssertEqual(result.amountMinor, number.int64Value, label) }
            else { XCTAssertTrue(NSDictionary(dictionary: ["v": result.dictionary[key] ?? NSNull()]).isEqual(to: ["v": value]), "\(label) \(key): expected \(value), got \(result.dictionary[key] ?? NSNull())") }
          }
          counts[directory, default: 0] += 1
        }
      }
    }
    XCTAssertGreaterThanOrEqual(counts["fixtures-real"] ?? 0, 352); XCTAssertGreaterThan(counts["fixtures"] ?? 0, 0)
    print("Swift fixture counts: \(counts)")
  }
  func testSharedValidationCodes() throws {
    let cases = try XCTUnwrap(JSONSerialization.jsonObject(with: Data(contentsOf: library().appendingPathComponent("validation-fixtures.json"))) as? [[String:Any]])
    XCTAssertGreaterThanOrEqual(cases.count,89)
    for fixture in cases {
      let expected = fixture["expect"] as! [String:Any]
      let result = Validation.result(kind:fixture["kind"] as! String,value:fixture["input"] ?? NSNull())
      let codes = (result["errors"] as? [[String:String]] ?? []).compactMap { $0["code"] }
      XCTAssertEqual(codes,expected["codes"] as! [String],fixture["name"] as! String)
      XCTAssertEqual(result["ok"] as? Bool,expected["ok"] as? Bool,fixture["name"] as! String)
      if expected["ok"] as? Bool == true && fixture["kind"] as? String == "regex" {
        let parser: [String:Any] = ["schemaVersion":1,"id":"conformance","name":"Conformance","version":1,"androidPackages":[],"iosAppNames":[],"rules":[["id":"conformance.info.v1","priority":1,"direction":"info","match":["title":fixture["input"]!]]]]
        let raw = String(data:try JSONSerialization.data(withJSONObject:parser),encoding:.utf8)!
        XCTAssertNoThrow(try Parser.decode(raw),fixture["name"] as! String)
      }
    }
  }
  func testValidationSizeAndEscapedLiteralQuantifiers() {
    XCTAssertEqual(Validation.validate(kind:"regex",value:String(repeating:"x",count:4001)).map(\.code),["REGEX_TOO_LONG"])
    XCTAssertTrue(Validation.validate(kind:"regex",value:#"\++"#).isEmpty)
    let info = #"{"schemaVersion":1,"id":"large","name":"Large","version":1e20,"androidPackages":[],"iosAppNames":["Test"],"rules":[{"id":"large.info.v1","priority":1e20,"direction":"info","match":{"title":"Receipt"},"extract":42}]}"#
    XCTAssertNoThrow(try Parser.decode(info))
    XCTAssertEqual(Validation.validate(kind:"parser",value:["description":String(repeating:"x",count:1000001)]).map(\.code),["JSON_TOO_LARGE"])
  }
  func testSharedAnnouncements() throws {
    struct Fixture: Decodable { let result: ParseResult; let language: String; let app: String?; let template: String?; let expected: String? }
    let fixtures = try JSONDecoder().decode([Fixture].self, from: Data(contentsOf: library().appendingPathComponent("tts-fixtures.json")))
    for (i, fixture) in fixtures.enumerated() {
      XCTAssertEqual(fixture.result.spokenText(language: fixture.language, app: fixture.app, templateIn: fixture.template, templateOut: fixture.template), fixture.expected ?? "", "fixture \(i)")
    }
  }
  func testWizardAmountPatternIsAccepted() throws {
    XCTAssertNoThrow(try Validation.pattern(#"You received RM (?<amount>[\d,]+(?:\.\d{1,2})?) from (?:[^,;]+?)$"#, group: "amount"))
  }

  func testInvalidFilesAndCurrencyText() throws {
    for file in try FileManager.default.contentsOfDirectory(at: library().appendingPathComponent("invalid"), includingPropertiesForKeys: nil).filter({ $0.pathExtension == "json" }) {
      let raw = try String(contentsOf: file, encoding: .utf8)
      if file.lastPathComponent.contains("generic") { XCTAssertThrowsError(try GenericConfig.decode(raw)) } else { XCTAssertThrowsError(try Parser.decode(raw)) }
    }
    XCTAssertEqual(RuleEngine.currency("JP¥"), "JPY"); XCTAssertEqual(RuleEngine.currency("hkd"), "HKD")
    XCTAssertEqual(RuleEngine.currency(nil), "MYR")
    var result = ParseResult(); result.direction = "out"; result.amountMinor = 79000; result.currency = "JPY"; result.confidence = "high"; result.counterparty = "Cafe"
    XCTAssertEqual(result.spokenText, "Minus 790 JPY, Cafe")
    result.currency = "MYR"; result.amountMinor = 1250
    XCTAssertEqual(result.spokenText, "Minus 12 ringgit 50 sen, Cafe")
    result.amountMinor = 50
    XCTAssertEqual(result.spokenText, "Minus 50 cents, Cafe")
  }
}
