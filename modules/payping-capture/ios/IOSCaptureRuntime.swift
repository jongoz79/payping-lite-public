import Foundation

final class IOSCaptureRuntime: @unchecked Sendable {
  static let shared = IOSCaptureRuntime()
  static let inserted = Notification.Name("PayPingCaptureInserted")
  private let lock = NSRecursiveLock()
  private var database: CaptureStore?
  private init() {}
  func store() throws -> CaptureStore {
    lock.lock(); defer { lock.unlock() }
    if let database { return database }
    let root: URL
    if let group = Bundle.main.object(forInfoDictionaryKey: "PayPingAppGroup") as? String {
      guard let container = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: group) else {
        throw EngineError.invalid("App group container is unavailable; check signing entitlements")
      }
      root = container
    } else {
      guard let documents = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { throw EngineError.invalid("Documents directory unavailable") }
      root = documents
    }
    let bundles = [Bundle.main, Bundle(for: PaypingCaptureModule.self)]
    let resourceURL = bundles.compactMap { $0.url(forResource: "PayPingCaptureResources", withExtension: "bundle") }.first
    guard let resourceURL, let resources = Bundle(url: resourceURL), let genericURL = resources.url(forResource: "generic.default", withExtension: "json") else {
      throw EngineError.invalid("Generic starter resource is missing; rebuild the native app")
    }
    let generic = try String(contentsOf: genericURL, encoding: .utf8)
    let store = try CaptureStore(url: root.appendingPathComponent("SQLite/payping.db"), genericDefault: generic)
    database = store; return store
  }
  func capture(appName: String, title: String, body: String, date: Date) throws -> CaptureOutcome {
    let milliseconds = date.timeIntervalSince1970 * 1000
    guard milliseconds.isFinite, milliseconds > Double(Int64.min), milliseconds < Double(Int64.max) else { throw EngineError.invalid("Invalid notification date") }
    let result = try store().capture(sourceApp: appName, title: title, body: body, postedAt: Int64(milliseconds))
    if let id = result.id { NotificationCenter.default.post(name: Self.inserted, object: nil, userInfo: ["id": id]) }
    return result
  }
}
