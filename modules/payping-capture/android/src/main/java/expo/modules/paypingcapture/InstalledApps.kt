package expo.modules.paypingcapture

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import java.io.File
import java.util.Locale

object InstalledApps {
  // Launcher-query approach adapted from azimul-kabir/actua ImportTransactionsScreen (GPL-3.0).
  @Synchronized fun list(context: Context): List<Map<String, String>> {
    val pm = context.packageManager
    val directory = File(context.cacheDir, "payping-app-icons").apply { mkdirs() }
    return pm.queryIntentActivities(Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER), 0)
      .distinctBy { it.activityInfo.packageName }
      .filter { it.activityInfo.packageName != context.packageName }
      .map { info ->
        val pkg = info.activityInfo.packageName
        val icon = try {
          val updated = pm.getPackageInfo(pkg, 0).lastUpdateTime
          val file = File(directory, "$pkg-$updated.png")
          if (!file.exists()) {
            val drawable = info.loadIcon(pm)
            val bitmap = Bitmap.createBitmap(96, 96, Bitmap.Config.ARGB_8888)
            try {
              drawable.setBounds(0, 0, 96, 96); drawable.draw(Canvas(bitmap))
              file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
            } finally { bitmap.recycle() }
          }
          android.net.Uri.fromFile(file).toString()
        } catch (_: Exception) { "" }
        mapOf("package" to pkg, "label" to info.loadLabel(pm).toString(), "iconUri" to icon)
      }.sortedWith(compareBy({ it["label"]!!.lowercase(Locale.ROOT) }, { it["package"] }))
  }
}
