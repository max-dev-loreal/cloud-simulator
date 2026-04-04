import { useState, useEffect, useRef, useCallback } from 'react';
import {
  createInitialState, tick, sendPacket,
  killInstance, scaleUp, killZone, simulateAttack, ALGO
} from './simulation/simulationEngine';
import NetworkCanvas from './components/Network/NetworkCanvas';
import Controls from './components/Controls/Controls';
import EventLog from './components/EventLog';
 
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
      if (trafficRef.current) setSim(s => sendPacket(s));
    }, 600);
    return () => clearInterval(id);
  }, []);
 
  const handlers = {
    onSendOne: () => setSim(s => sendPacket(s)),
    onToggleTraffic: () => setTrafficOn(v => !v),
    onKillInstance: useCallback((id) => setSim(s => killInstance(s, id)), []),
    onScaleUp: (zoneId) => setSim(s => scaleUp(s, zoneId)),
    onKillZone: (zoneId) => setSim(s => killZone(s, zoneId)),
    onAttack: () => setSim(s => simulateAttack(s)),
    onToggleAlgo: () => setSim(s => ({ ...s, algo: s.algo === ALGO.LEAST_LOAD ? ALGO.ROUND_ROBIN : ALGO.LEAST_LOAD })),
    onReset: () => { setSim(createInitialState()); setTrafficOn(false); },
  };
 
  return (
    <div style={{ height: '100vh', background: '#050509', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: '1px solid #1a1a2e', background: 'rgba(7,7,15,0.9)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d399', boxShadow: '0 0 8px rgba(52,211,153,0.8)', animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, letterSpacing: 3, color: '#52525b', textTransform: 'uppercase' }}>Cloud System Simulator</span>
        </div>
        <div style={{ display: 'flex', gap: 20, fontSize: 11, color: '#3f3f46' }}>
          <span>ALGO: <span style={{ color: '#818cf8' }}>{sim.algo === 'least_load' ? 'Least Load' : 'Round Robin'}</span></span>
          <span>REQUESTS: <span style={{ color: '#e4e4e7' }}>{sim.loadBalancer.requests}</span></span>
        </div>
      </div>
 
      {/* Body */}
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
