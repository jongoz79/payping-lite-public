package expo.modules.paypingcapture

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.util.Locale
import java.util.UUID

class CaptureSpeech(private val context: Context) {
  private val main = Handler(Looper.getMainLooper())
  private val audio = context.getSystemService(AudioManager::class.java)
  private val attributes = AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_SONIFICATION)
    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build()
  private var focusRequest: AudioFocusRequest? = null
  private var focused = false
  private var tts: TextToSpeech? = null
  private var closed = false
  private var ready = false
  private var current: String? = null
  private data class Announcement(var text: String, val key: String? = null,
    var count: Int = 1, var total: Long = 0, val parsed: Map<String, Any?>? = null, val language: String = "en")
  private val pending = ArrayDeque<Announcement>()
  private var awake = false
  /** Hold CaptureWake while anything is queued or speaking; release once idle. */
  private fun updateWake() {
    val busy = !closed && (current != null || pending.isNotEmpty())
    if (busy && !awake) { CaptureWake.begin(context); awake = true }
    else if (!busy && awake) { CaptureWake.end(); awake = false }
  }
  private val focusListener = AudioManager.OnAudioFocusChangeListener { change -> main.post {
    if (change < 0) { pending.clear(); current = null; tts?.stop(); abandonFocus(); updateWake() }
  } }
  fun speak(text: String) { main.post {
    if (closed) return@post
    pending.add(Announcement(text))
    updateWake()
    if (tts == null) initialize() else if (ready) flush()
  } }
  /** The wake hold spans the hand-off to the main thread so the CPU cannot sleep before the queue owns it. */
  fun payment(parsed: Map<String, Any?>) {
    CaptureWake.begin(context)
    main.post { try { enqueue(parsed) } finally { CaptureWake.end() } }
  }
  private fun enqueue(parsed: Map<String, Any?>) {
    if (closed) return
    val store = CaptureStore.get(context)
    val language = AnnouncementText.language(store.setting("language"))
    val text = AnnouncementText.fromParsed(parsed, language, store.setting("tts_template_in"), store.setting("tts_template_out")) ?: return
    val key = "${parsed["direction"]}:${parsed["currency"]}:$language"
    val existing = pending.firstOrNull { it.key == key }
    if (existing == null) pending.add(Announcement(text, key, total = parsed["amountMinor"] as Long, parsed = parsed, language = language))
    else { existing.count++; existing.total += parsed["amountMinor"] as Long }
    updateWake()
    if (tts == null) initialize() else if (ready) flush()
  }
  private fun initialize() {
    tts = TextToSpeech(context) { status -> main.post initialized@{
      if (closed) return@initialized
      ready = status == TextToSpeech.SUCCESS
      if (!ready) { pending.clear(); tts?.shutdown(); tts = null; Log.w("PayPingTTS", "Engine unavailable"); updateWake(); return@initialized }
      tts?.setAudioAttributes(attributes)
      tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
        override fun onStart(id: String) { Log.i("PayPingTTS", "Started $id") }
        override fun onDone(id: String) { Log.i("PayPingTTS", "Completed $id"); complete(id) }
        @Deprecated("Platform callback") override fun onError(id: String) { Log.w("PayPingTTS", "Failed $id"); complete(id) }
        override fun onError(id: String, errorCode: Int) { Log.w("PayPingTTS", "Failed $id code=$errorCode"); complete(id) }
      })
      flush()
    } }
  }
  private fun complete(id: String) { main.post {
    if (current == id) { current = null; abandonFocus(); if (!closed) flush(); updateWake() }
  } }
  @Suppress("DEPRECATION") private fun requestFocus() {
    val result = if (Build.VERSION.SDK_INT >= 26) {
      val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(attributes).setOnAudioFocusChangeListener(focusListener, main).build()
      focusRequest = request
      audio.requestAudioFocus(request)
    } else audio.requestAudioFocus(focusListener, AudioManager.STREAM_SYSTEM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
    focused = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    Log.i("PayPingTTS", if (focused) "Ducking focus granted" else "Ducking focus denied; announcement continues without ducking")
  }
  @Suppress("DEPRECATION") private fun abandonFocus() {
    if (focused) {
      if (Build.VERSION.SDK_INT >= 26) focusRequest?.let { audio.abandonAudioFocusRequest(it) }
      else audio.abandonAudioFocus(focusListener)
      Log.i("PayPingTTS", "Ducking focus released")
    }
    focused = false; focusRequest = null
  }
  private fun flush() {
    if (!ready || closed || current != null || pending.isEmpty()) return
    val store = CaptureStore.get(context)
    val spokenLanguage = pending.first().let { if (it.parsed != null) it.language else AnnouncementText.language(store.setting("language")) }
    val language = Locale.forLanguageTag(if (spokenLanguage == "ms") "ms-MY" else "en-MY")
    val voices = tts?.voices.orEmpty().filter { !it.isNetworkConnectionRequired }
    val voice = voices.firstOrNull { it.locale == language }
      ?: voices.firstOrNull { it.locale.language == language.language }
      ?: tts?.defaultVoice?.takeIf { !it.isNetworkConnectionRequired }
      ?: voices.firstOrNull()
    if (voice == null) { pending.clear(); Log.w("PayPingTTS", "No offline voice installed"); updateWake(); return }
    tts?.voice = voice
    tts?.setSpeechRate((store.setting("tts_rate")?.toFloatOrNull() ?: 1f).coerceIn(0.1f, 3f))
    if (store.setting("tts_duck") != "false") requestFocus()
    val id = UUID.randomUUID().toString(); current = id
    val announcement = pending.removeFirst()
    val text = if (announcement.count == 1 || announcement.parsed == null) announcement.text else {
      val total = announcement.parsed + mapOf("amountMinor" to announcement.total, "counterparty" to null)
      AnnouncementText.batch(announcement.count, total, announcement.language).orEmpty()
    }
    Log.i("PayPingTTS", "Announcing count=${announcement.count} language=$spokenLanguage")
    if (tts?.speak(text, TextToSpeech.QUEUE_ADD, null, id) == TextToSpeech.ERROR) complete(id)
  }
  fun close() { main.post {
    closed = true; pending.clear(); current = null; ready = false; tts?.shutdown(); tts = null; abandonFocus(); updateWake()
  } }
  companion object { fun text(parsed: Map<String, Any?>): String? = AnnouncementText.fromParsed(parsed) }
}
