import AppIntents
import Foundation

// Background text -> native store -> result structure adapted from MattFaz/actuali's
// ParseAndQueueTransactionIntent and LogTransactionIntent (MIT). No server/AI parsing is used.
public struct LogBankNotificationIntent: AppIntent {
  public static var title: LocalizedStringResource { "Log Bank Notification" }
  public static var description: IntentDescription { IntentDescription("Parse and save a notification on this device. Returns text for a separate Speak Text action.") }
  public static var openAppWhenRun: Bool { false }

  @Parameter(title: "App Name") public var appName: String
  @Parameter(title: "Title", default: "") public var title: String
  @Parameter(title: "Body", default: "") public var body: String
  // Optional Date avoids a frozen metadata default; omitted dates resolve to now at execution.
  @Parameter(title: "Date") public var date: Date?

  public init() {}
  public static var parameterSummary: some ParameterSummary {
    Summary("Log notification from \(\.$appName)") { \.$title; \.$body; \.$date }
  }
  public func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
    let app = appName, heading = title, text = body, posted = date ?? Date()
    let result = try await Task.detached(priority: .utility) {
      try IOSCaptureRuntime.shared.capture(appName: app, title: heading, body: text, date: posted)
    }.value
    // The shortcut speaks this value exactly once. Info, none, duplicates and disabled TTS return empty text.
    return .result(value: result.spokenText, dialog: IntentDialog(stringLiteral: result.spokenText))
  }
}
