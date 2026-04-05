import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createInitialState, tick, sendPacket,
  killInstance, scaleUp, killZone, simulateAttack, ALGO
} from './simulation/simulationEngine';
import { listInstances, launchInstance, terminateInstance } from './api/instancesApi';
import NetworkCanvas from './components/Network/NetworkCanvas';
import Controls from './components/Controls/Controls';
import EventLog from './components/EventLog';
 
const USE_REAL_API = !!import.meta.env.VITE_API_URL;
 
function mapAwsInstance(awsInst, zoneId) {
  const stateMap = {
    running:       'healthy',
    pending:       'booting',
    stopped:       'dead',
    stopping:      'dead',
    terminated:    'dead',
    shutting_down: 'dead',
  };
  return {
    id:           awsInst.id,
    zoneId,
    status:       stateMap[awsInst.state] || 'dead',
    load:         0,
    requests:     0,
    bootProgress: awsInst.state === 'pending' ? 0.5 : 1,
  };
}
 
function App() {
  const [sim, setSim] = useState(createInitialState);
  const [trafficOn, setTrafficOn] = useState(false);
  const trafficRef = useRef(false);
 
  useEffect(() => {
    const id = setInterval(() => setSim(s => tick(s)), 300);
    return () => clearInterval(id);
  }, []);
 
  useEffect(() => { trafficRef.current = trafficOn; }, [trafficOn]);
 
  useEffect(() => {
    const id = setInterval(() => {
      if (trafficRef.current && !USE_REAL_API) setSim(s => sendPacket(s));
    }, 600);
    return () => clearInterval(id);
  }, []);
 
  useEffect(() => {
    if (!USE_REAL_API) return;
    const poll = async () => {
      try {
        const instances = await listInstances();
        setSim(s => ({
          ...s,
          zones: s.zones.map(z => {
            const azSuffix = z.id === 'az-1' ? '1a' : '1b';
            const zoneInstances = instances.filter(i => i.az && i.az.endsWith(azSuffix));
            return {
              ...z,
              instances: zoneInstances.length > 0
                ? zoneInstances.map(i => mapAwsInstance(i, z.id))
                : z.instances,
            };
          }),
        }));
      } catch (err) {
        console.error('AWS poll failed:', err);
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);
 
  const handlers = {
    onSendOne: () => setSim(s => sendPacket(s)),
    onToggleTraffic: () => setTrafficOn(v => !v),
 
    onKillInstance: useCallback(async (instanceId) => {
      if (USE_REAL_API) {
        try { await terminateInstance(instanceId); }
        catch (err) { console.error('Terminate failed:', err); }
      }
      setSim(s => killInstance(s, instanceId));
    }, []),
 
    onScaleUp: async (zoneId) => {
      if (USE_REAL_API) {
        try {
          const az = zoneId === 'az-1' ? 'us-east-1a' : 'us-east-1b';
          await launchInstance(az);
        } catch (err) { console.error('Launch failed:', err); }
      }
      setSim(s => scaleUp(s, zoneId));
    },
 
    onKillZone:   (zoneId) => setSim(s => killZone(s, zoneId)),
    onAttack:     () => setSim(s => simulateAttack(s)),
    onToggleAlgo: () => setSim(s => ({ ...s, algo: s.algo === ALGO.LEAST_LOAD ? ALGO.ROUND_ROBIN : ALGO.LEAST_LOAD })),
    onReset:      () => { setSim(createInitialState()); setTrafficOn(false); },
  };
 
  return (
    <div style={{ height: '100vh', background: '#050509', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #1a1a2e', background: 'rgba(7,7,15,0.9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)' }} />
          <span style={{ fontSize: 11, letterSpacing: 3, color: '#52525b', textTransform: 'uppercase' }}>Cloud System Simulator</span>
          {USE_REAL_API && (
            <span style={{ fontSize: 9, letterSpacing: 2, color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', padding: '2px 8px', borderRadius: 4 }}>
              LIVE AWS
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#3f3f46' }}>
          <span>ALGO: <span style={{ color: '#818cf8' }}>{sim.algo === 'least_load' ? 'Least Load' : 'Round Robin'}</span></span>
          <span>REQUESTS: <span style={{ color: '#e4e4e7' }}>{sim.loadBalancer.requests}</span></span>
          <span style={{ color: USE_REAL_API ? '#34d399' : '#52525b' }}>{USE_REAL_API ? '● AWS' : '○ SIM'}</span>
        </div>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <NetworkCanvas sim={sim} onKillInstance={handlers.onKillInstance} />
        <div style={{ width: 280, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #1a1a2e', flexShrink: 0, overflow: 'hidden' }}>
          <Controls sim={sim} trafficOn={trafficOn} handlers={handlers} />
          <EventLog events={sim.events} />
        </div>
      </div>
    </div>
  );
}
 
export default App;
 