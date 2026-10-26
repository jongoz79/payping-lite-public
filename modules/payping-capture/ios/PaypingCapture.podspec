require 'fileutils'

# One generic starter source of truth. Never bundle community/app-specific parsers.
generic = File.expand_path('../../../parser-library/generic.default.json', __dir__)
resources = File.join(__dir__, 'Resources')
FileUtils.mkdir_p(resources)
FileUtils.cp(generic, File.join(resources, 'generic.default.json'))

Pod::Spec.new do |s|
  s.name = 'PaypingCapture'
  s.version = '1.0.0'
  s.summary = 'On-device PayPing capture and App Intents'
  s.description = 'Native capture, shared Swift engine, SQLite migrations and Shortcuts integration.'
  s.author = 'PayPing contributors'
  s.homepage = 'https://github.com/jongoz79/payping-lite-public'
  s.platforms = { :ios => '18.0' }
  s.source = { git: 'https://github.com/jongoz79/payping-lite-public.git' }
  s.license = { type: 'GPL-3.0-or-later', file: '../../../LICENSE' }
  s.static_framework = true
  s.swift_version = '6.0'
  s.dependency 'ExpoModulesCore'
  # Bind both Swift and JS to Expo's one vendored SQLite library; system SQLite is used by Linux SwiftPM tests.
  s.dependency 'ExpoSQLite'
  s.frameworks = 'AppIntents', 'AVFoundation'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.source_files = ['*.swift', 'AppIntents/*.swift', 'Engine/Sources/PayPingEngine/*.swift']
  s.resource_bundles = { 'PayPingCaptureResources' => ['Resources/generic.default.json'] }
end
