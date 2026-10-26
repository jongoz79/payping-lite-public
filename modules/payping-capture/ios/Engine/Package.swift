// swift-tools-version: 6.0
import PackageDescription
let package = Package(name: "PayPingEngine", platforms: [.iOS(.v18), .macOS(.v13)],
  products: [.library(name: "PayPingEngine", targets: ["PayPingEngine"])],
  targets: [.systemLibrary(name: "CSQLite", pkgConfig: "sqlite3"),
    .target(name: "PayPingEngine", dependencies: ["CSQLite"]),
    .testTarget(name: "PayPingEngineTests", dependencies: ["PayPingEngine", "CSQLite"])])
