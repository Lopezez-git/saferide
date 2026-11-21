import { PermissionsAndroid, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

type OverlayModule = {hasPermission:()=>boolean;isRunning:()=>boolean;start:()=>void;stop:()=>void;update:(value:string)=>void;setPhase:(value:string)=>void;addListener:(event:string,listener:(event:{action:string})=>void)=>{remove:()=>void}};
const native = Platform.OS==='android' ? requireOptionalNativeModule<OverlayModule>('SafeRideOverlay') : null;
export const overlay = {
 available:()=>!!native,
 permission:()=>native?.hasPermission()??false,
 running:()=>native?.isRunning()??false,
 request:async()=>{if(Platform.OS==='android'&&Number(Platform.Version)>=33)return (await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS))===PermissionsAndroid.RESULTS.GRANTED;return true;},
 start:()=>native?.start(),
 stop:()=>native?.stop(),
 update:(text:string)=>{try{native?.update(text);}catch{/* O serviço pode ter sido encerrado pelo Android. */}},
 phase:(value:string)=>{try{native?.setPhase(value);}catch{/* O serviço pode ter sido encerrado pelo Android. */}},
 listen:(callback:(action:string)=>void)=>native?.addListener('onAction',event=>callback(event.action)),
};
