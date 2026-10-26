import ExpoModulesCore
import Foundation
import AVFoundation

@MainActor private final class TestSpeech {
  static let shared = TestSpeech()
  private let synthesizer = AVSpeechSynthesizer()
  func speak(_ text: String) {
    let utterance = AVSpeechUtterance(string: text)
    let store = try? IOSCaptureRuntime.shared.store()
    let preference = (try? store?.setting("language")) ?? "auto"
    let language = preference == "ms" || (preference == "auto" && Locale.current.language.languageCode?.identifier == "ms") ? "ms-MY" : "en-MY"
    utterance.voice = AVSpeechSynthesisVoice(language: language)
    let rate = Float((try? store?.setting("tts_rate")) ?? "1") ?? 1
    utterance.rate = min(AVSpeechUtteranceMaximumSpeechRate, max(AVSpeechUtteranceMinimumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * rate))
    synthesizer.speak(utterance)
  }
}
public class PaypingCaptureModule: Module, @unchecked Sendable {
  private var observer: NSObjectProtocol?
  private func stopObserving() { if let observer { NotificationCenter.default.removeObserver(observer) }; observer = nil }
  public func definition() -> ModuleDefinition {
    Name("PaypingCapture")
    Events("onCapture")
    OnCreate { do { _ = try IOSCaptureRuntime.shared.store() } catch { NSLog("PayPing database initialization failed: %@", error.localizedDescription) } }
    OnStartObserving { [weak self] in
      guard let self, self.observer == nil else { return }
      self.observer = NotificationCenter.default.addObserver(forName: IOSCaptureRuntime.inserted, object: nil, queue: .main) { [weak self] note in
        if let id = note.userInfo?["id"] as? String { self?.sendEvent("onCapture", ["id": id]) }
      }
    }
    OnStopObserving { [weak self] in self?.stopObserving() }
    OnDestroy { [weak self] in self?.stopObserving() }
    Function("getPermissionStatus") { "granted" }
    Function("openNotificationAccessSettings") { }
    Function("isListenerConnected") { false }
    Function("getDatabaseDirectory") { try IOSCaptureRuntime.shared.store().url.deletingLastPathComponent().path }
    AsyncFunction("getInstalledApps") { () -> [[String: String]] in [] }
    Function("setSelectedApps") { (_: [[String: Any]]) in }
    Function("getSelectedApps") { () -> [[String: Any]] in [] }
    Function("reloadParsers") { try IOSCaptureRuntime.shared.store().reloadParsers() }
    Function("resetGenericConfig") { try IOSCaptureRuntime.shared.store().resetGenericConfig() }
    AsyncFunction("reparse") { (source: String?) -> Int in try IOSCaptureRuntime.shared.store().reparse(sourceApp: source) }
    Function("setSetting") { (key: String, value: String) in try IOSCaptureRuntime.shared.store().setSetting(key, value) }
    Function("getSetting") { (key: String) -> String? in try IOSCaptureRuntime.shared.store().setting(key) }
    Function("parsePreview") { (title: String, body: String, source: String, json: String?) -> [String: Any] in
      try IOSCaptureRuntime.shared.store().preview(title: title, body: body, sourceApp: source, parserJSON: json)
    }
    Function("speakTest") { (text: String) in _ = Task { @MainActor in TestSpeech.shared.speak(text) } }
  }
}
