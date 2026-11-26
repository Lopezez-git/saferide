package br.com.saferide.overlay

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper





/** Keeps the user-started simulation active; offers are ordinary Android notifications. */
class OverlayService : Service() {
 companion object {
  const val START="br.com.saferide.overlay.START"
  @Volatile var running=false
  @Volatile private var instance:OverlayService?=null
  fun updateSummary(text:String){Handler(Looper.getMainLooper()).post{instance?.setSummary(text)}}
  fun updatePhase(phase:String){Handler(Looper.getMainLooper()).post{instance?.setPhase(phase)}}
 }
 private val serviceChannel="saferide_simulation_service"
 private val alertChannel="saferide_simulation_alerts"
 private val serviceId=8101
 private val alertId=8102
 private var currentPhase="idle"
 private var latestSummary="Aguardando uma corrida simulada."
 private lateinit var notifications:NotificationManager
 private val handler=Handler(Looper.getMainLooper())
 private var expiry:Runnable?=null
 override fun onBind(intent:Intent?):IBinder?=null
 private fun openApp():PendingIntent? = packageManager.getLaunchIntentForPackage(packageName)?.let {
  PendingIntent.getActivity(this,0,it,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
 }
 private fun builder(channel:String):Notification.Builder = if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O) Notification.Builder(this,channel) else @Suppress("DEPRECATION") Notification.Builder(this)
 override fun onCreate(){
  super.onCreate()
  notifications=getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
  if(Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){
   notifications.createNotificationChannel(NotificationChannel(serviceChannel,"Simulação ativa",NotificationManager.IMPORTANCE_LOW))
   notifications.createNotificationChannel(NotificationChannel(alertChannel,"Ofertas simuladas",NotificationManager.IMPORTANCE_HIGH))
  }
  val foreground=builder(serviceChannel).setSmallIcon(R.drawable.ic_saferide_notification).setContentTitle("SafeRide ativo").setContentText("Simulação em execução").setContentIntent(openApp()).setOngoing(true).build()
  startForeground(serviceId,foreground)
  instance=this;running=true
  startService(Intent(this,SimulationTaskService::class.java))
 }
 override fun onStartCommand(intent:Intent?,flags:Int,startId:Int):Int {
  val action=intent?.action
  if(currentPhase=="feedback" && action?.startsWith("feedback:")==true){
   currentPhase="resolving";expiry?.let{handler.removeCallbacks(it)};notifications.cancel(alertId)
   SafeRideOverlayModule.emitAction?.invoke(action)
  }
  return START_NOT_STICKY
 }
 private fun feedbackAction(category:String,requestCode:Int):PendingIntent {
  val intent=Intent(this,OverlayService::class.java).setAction("feedback:$category")
  return PendingIntent.getService(this,requestCode,intent,PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
 }
 private fun setSummary(value:String){latestSummary=value;if(currentPhase=="offer")showAlert()}
 private fun setPhase(value:String){
  currentPhase=value
  expiry?.let{handler.removeCallbacks(it)};expiry=null
  if(value=="offer"){showAlert()}
  else {notifications.cancel(alertId);if(value=="feedback"){
   showFeedback()
   val task=Runnable { if(currentPhase=="feedback"){notifications.cancel(alertId);SafeRideOverlayModule.emitAction?.invoke("later")} }
   expiry=task;handler.postDelayed(task,30000)
  }}
 }
 private fun showAlert(){
  val lines=latestSummary.lines().filter{it.isNotBlank()}
  fun field(prefix:String) = lines.firstOrNull { it.startsWith(prefix) }?.substringAfter(":")?.trim()
  val safety = field("Segurança:") ?: "⚪ Segurança · consultando"
  val pavement = field("Pavimento:") ?: "⚪ Pavimento · consultando"
  val hour = field("Horário:")
  val traffic = field("Trânsito:")?.let { "Trânsito · $it" }
  val body = listOfNotNull(safety, hour, pavement, traffic).joinToString("\n")
  val details = Notification.BigTextStyle().setBigContentTitle("SafeRide · oferta simulada").bigText(body)
  val notification = builder(alertChannel).setSmallIcon(R.drawable.ic_saferide_notification)
   .setContentTitle(safety).setContentText(traffic ?: pavement).setSubText("Oferta simulada")
   .setStyle(details).setContentIntent(openApp()).setOnlyAlertOnce(true).build()
  notifications.notify(alertId,notification)
 }
 private fun showFeedback(){
  val notification=builder(alertChannel).setSmallIcon(R.drawable.ic_saferide_notification).setContentTitle("Como foi o trajeto?").setContentText("Responda quando estiver parado. Toque para mais opções.").setContentIntent(openApp()).setAutoCancel(true)
   .addAction(android.R.drawable.ic_dialog_alert,"Insegurança",feedbackAction("INSECURE",1))
   .addAction(android.R.drawable.ic_dialog_alert,"Buraco",feedbackAction("POTHOLE",2))
   .addAction(android.R.drawable.ic_dialog_alert,"Via ruim",feedbackAction("BAD_ROAD",3)).build()
  notifications.notify(alertId,notification)
 }
 override fun onDestroy(){expiry?.let{handler.removeCallbacks(it)};instance=null;running=false;notifications.cancel(alertId);stopService(Intent(this,SimulationTaskService::class.java));SafeRideOverlayModule.emitAction?.invoke("stopped");super.onDestroy()}
}
