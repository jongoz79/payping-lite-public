import AppIntents

// AppShortcut discovery pattern adapted from MattFaz/actuali ActualiShortcutsProvider (MIT).
public struct PayPingShortcutsProvider: AppShortcutsProvider {
  public static var appShortcuts: [AppShortcut] {
    AppShortcut(intent: LogBankNotificationIntent(), phrases: ["Log bank notification in \(.applicationName)"],
      shortTitle: "Log Bank Notification", systemImageName: "tray.and.arrow.down")
  }
}
public struct PayPingIntentPackage: AppIntentsPackage {}
