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
import android.graphics.Typeface
import android.text.SpannableStringBuilder
import android.text.Spanned
import android.text.style.StyleSpan

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
  val safety=lines.firstOrNull{it.startsWith("Segurança:")}
  val pavement=lines.firstOrNull{it.startsWith("Pavimento:")}
  val safetyValue=safety?.substringAfter("Segurança:")?.substringBefore(" · ")?.trim()
  val pavementValue=pavement?.substringAfter("Pavimento:")?.substringBefore(" · ")?.trim()
  val reportValue=lines.firstOrNull{it.startsWith("Trajeto") }?.substringAfter(":")?.trim()
  val compact=listOfNotNull(safetyValue?.let{"🛡 $it (hist.)"},pavementValue?.replace("solicitações","pedidos")?.let{"🚧 $it"}).joinToString("  •  ").ifBlank{"Consultando contexto da viagem."}
  val body=SpannableStringBuilder()
  fun addLine(icon:String,label:String,value:String?) {
   if(value==null)return
   if(body.isNotEmpty())body.append("\n")
   body.append(icon).append("  ")
   val start=body.length;body.append(label);body.setSpan(StyleSpan(Typeface.BOLD),start,body.length,Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
   body.append("  ·  ").append(value)
  }
  addLine("🛡","Segurança",safetyValue?.let{"$it (histórico)"})
  addLine("🚧","Pavimento",pavementValue?.let{"$it (arquivo)"})
  addLine("💬","Relatos",reportValue)
  val details=Notification.BigTextStyle().setBigContentTitle("Contexto da viagem · Simulação").bigText(if(body.isEmpty())compact else body)
  val notification=builder(alertChannel).setSmallIcon(R.drawable.ic_saferide_notification).setColor(0xff087f71.toInt()).setContentTitle("Resumo da viagem · simulação").setContentText(compact).setStyle(details).setContentIntent(openApp()).setAutoCancel(false).setOnlyAlertOnce(true).build()
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
