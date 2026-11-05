import { api } from './client';
import { rideStorage } from './rideStorage';
export type Ride = {
 id: string; passenger: string; origin: string; destination: string;
 originLat: number; originLon: number; destinationLat: number; destinationLon: number;
 fare: number; distanceMeters: number; plannedDistanceMeters: number;
 simulatedSeconds: number; activeSeconds: number;
 status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
 createdAt: string; updatedAt?: string; finishedAt?: string | null; pending?: boolean;
};
const INDEX='sr-ride-index', OWNER='sr-ride-owner';
const recordKey=(id:string)=>'sr-ride-'+id;
let identity: Promise<string> | null=null;
async function owner() {
 if(!identity) identity=(async()=>{const stored=await rideStorage.get(OWNER);if(stored)return stored;const {key}=await api<{key:string}>('/rides/key',{method:'POST'});await rideStorage.set(OWNER,key);return key;})().catch(error=>{identity=null;throw error;});
 return identity;
}
export async function createRideId() { await owner();return (await api<{key:string}>('/rides/key',{method:'POST'})).key; }
async function ids():Promise<string[]> { return JSON.parse(await rideStorage.get(INDEX)??'[]'); }
let writes: Promise<unknown>=Promise.resolve();
function write(ride:Ride, expectedVersion?:string) { const task=writes.then(async()=>{if(expectedVersion){const current=JSON.parse(await rideStorage.get(recordKey(ride.id))??'null') as Ride|null;if(current?.updatedAt!==expectedVersion)return;}await rideStorage.set(recordKey(ride.id),JSON.stringify(ride));const all=await ids();if(!all.includes(ride.id))await rideStorage.set(INDEX,JSON.stringify([ride.id,...all]));});writes=task.catch(()=>{});return task; }
async function local():Promise<Ride[]> { await writes;return (await Promise.all((await ids()).map(async id=>JSON.parse(await rideStorage.get(recordKey(id))??'null') as Ride|null))).filter((r):r is Ride=>!!r); }
let syncing:Promise<void>|null=null;
async function flush() {
 if(syncing)return syncing;
 syncing=(async()=>{
  const token=await owner();
  for(const ride of await local()) {
   if(!ride.pending)continue;
   const saved=await api<Ride>('/rides/'+ride.id,{method:'PUT',token,body:ride});
   await write({...saved,pending:false},ride.updatedAt);
  }
 })().finally(()=>{syncing=null;});
 return syncing;
}
export async function saveRide(ride:Ride):Promise<boolean> {
 await write({...ride,updatedAt:new Date().toISOString(),pending:true});
 try { await flush();await flush();return !JSON.parse(await rideStorage.get(recordKey(ride.id))??'{}').pending; } catch { return false; }
}
export async function loadRides():Promise<{items:Ride[];offline:boolean}> {
 try {
  await flush();const remote=await api<Ride[]>('/rides',{token:await owner()});
  const pending=(await local()).filter(r=>r.pending);
  for(const ride of remote)if(!pending.some(p=>p.id===ride.id))await write({...ride,pending:false});
  return {items:(await local()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),offline:false};
 } catch {return {items:(await local()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)),offline:true};}
}
