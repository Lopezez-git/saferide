package br.com.saferide.overlay

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

class SimulationTaskService : HeadlessJsTaskService() {
 override fun getTaskConfig(intent:Intent?):HeadlessJsTaskConfig =
  HeadlessJsTaskConfig("SafeRideBackground",Arguments.createMap(),0,true)
}
