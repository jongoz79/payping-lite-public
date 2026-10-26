// Extends app.json. Release/EAS builds set PAYPING_OFFLINE=1 to strip INTERNET:
// PayPing Lite v1 makes no network calls, so the store listing must not request it.
// Debug builds keep INTERNET because the dev client loads JS from Metro.
module.exports = ({ config }) => {
  const offline = process.env.PAYPING_OFFLINE === '1';
  return {
    ...config,
    ios: {
      ...config.ios,
      // No non-exempt encryption: skips the export-compliance prompt on every TestFlight upload.
      config: { ...(config.ios?.config ?? {}), usesNonExemptEncryption: false },
    },
    android: {
      ...config.android,
      blockedPermissions: [
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
        ...(offline ? ['android.permission.INTERNET'] : []),
      ],
    },
  };
};
