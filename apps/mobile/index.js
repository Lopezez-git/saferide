import 'expo-router/entry';
import { AppRegistry, Platform } from 'react-native';
import { overlay } from './src/lib/overlay';

// Keeps the React Native timer runtime alive only while the user-enabled Android
// foreground service is running. The active simulation remains in the app.
if (Platform.OS === 'android') AppRegistry.registerHeadlessTask('SafeRideBackground', () => async () => {
  await new Promise(resolve => {
    const timer = setInterval(() => {
      if (!overlay.running()) { clearInterval(timer); resolve(); }
    }, 1000);
  });
});
