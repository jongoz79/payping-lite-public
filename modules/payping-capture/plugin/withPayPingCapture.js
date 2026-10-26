const { withInfoPlist, withEntitlementsPlist, withAppDelegate } = require('expo/config-plugins');
module.exports = (config, options = {}) => {
  const groups = config.ios?.entitlements?.['com.apple.security.application-groups'] || [];
  const group = options.appGroup || groups[0];
  config = withInfoPlist(config, mod => {
    if (group) mod.modResults.PayPingAppGroup = group;
    else delete mod.modResults.PayPingAppGroup;
    return mod;
  });
  if (group) config = withEntitlementsPlist(config, mod => {
    mod.modResults['com.apple.security.application-groups'] = [...new Set([...(mod.modResults['com.apple.security.application-groups'] || []), group])];
    return mod;
  });
  return withAppDelegate(config, mod => {
    if (mod.modResults.language !== 'swift') throw new Error('PayPing App Intents require a Swift AppDelegate');
    const marker = '// PayPing App Intents discovery';
    if (!mod.modResults.contents.includes(marker)) {
      mod.modResults.contents = 'import AppIntents\nimport PaypingCapture\n' + mod.modResults.contents + `
${marker}
@available(iOS 18.0, *)
struct PayPingApplicationIntents: AppIntentsPackage {
  static var includedPackages: [any AppIntentsPackage.Type] { [PayPingIntentPackage.self] }
}
`;
    }
    return mod;
  });
};
