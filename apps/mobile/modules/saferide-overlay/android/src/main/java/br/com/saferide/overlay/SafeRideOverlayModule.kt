package br.com.saferide.overlay

import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SafeRideOverlayModule : Module() {
 companion object { @Volatile var emitAction:((String)->Unit)?=null }
 override fun definition() = ModuleDefinition {
  Name("SafeRideOverlay")
  Events("onAction")
  OnCreate { emitAction={ action -> sendEvent("onAction",mapOf("action" to action)) } }
  OnDestroy { emitAction=null }
  Function("hasPermission") {
   val context=appContext.reactContext ?: throw IllegalStateException("Aplicativo indisponível")
   (context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).areNotificationsEnabled()
  }
  Function("isRunning") { OverlayService.running }
  Function("start") {
   val context=appContext.reactContext ?: throw IllegalStateException("Aplicativo indisponível")
   val intent=Intent(context,OverlayService::class.java).setAction(OverlayService.START)
   if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) context.startForegroundService(intent) else context.startService(intent)
  }
  Function("update") { value: String -> OverlayService.updateSummary(value.take(500)) }
  Function("setPhase") { value: String -> OverlayService.updatePhase(value) }
  Function("stop") { val context=appContext.reactContext ?: throw IllegalStateException("Aplicativo indisponível");context.stopService(Intent(context,OverlayService::class.java)) }
 }
}
