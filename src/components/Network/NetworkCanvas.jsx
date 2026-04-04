import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LBNode, InstanceNode } from './Node';

const LB_X = 0.5;
const LB_Y = 0.18;
const AZ_LAYOUT = { 'az-1': { xFrac: 0.25 }, 'az-2': { xFrac: 0.75 } };
const INST_ROWS = [0.58, 0.78];

function useSize(ref) {
  const [size, setSize] = useState({ w: 800, h: 600 });
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(e => {
      const { width, height } = e[0].contentRect;
      setSize({ w: width, h: height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return size;
}

function getInstPos(inst, zoneId, idx, size) {
  const az = AZ_LAYOUT[zoneId] || { xFrac: 0.5 };
  const col = idx % 2;
  const row = Math.floor(idx / 2);
  const x = (az.xFrac + (col - 0.5) * 0.13) * size.w;
  const y = (INST_ROWS[0] + row * 0.21) * size.h;
  return { x, y };
}

function getLBPos(size) {
  return { x: LB_X * size.w, y: LB_Y * size.h };
}

export default function NetworkCanvas({ sim, onKillInstance }) {
  const containerRef = useRef(null);
  const size = useSize(containerRef);
  const [packets, setPackets] = useState([]);
  const packetId = useRef(0);
  const prevRequests = useRef(sim.loadBalancer.requests);

  useEffect(() => {
    const curr = sim.loadBalancer.requests;
    if (curr <= prevRequests.current) { prevRequests.current = curr; return; }
    prevRequests.current = curr;

    // find last target from events (simple: just animate toward all eligible)
    // We'll fire a packet toward the instance with highest requests delta
    const allInst = sim.zones.flatMap(z => z.instances);
    const target = allInst.filter(i => i.status === 'healthy').sort((a,b) => b.requests - a.requests)[0];
    if (!target) return;

    const zone = sim.zones.find(z => z.instances.some(i => i.id === target.id));
    if (!zone) return;
    const idx = zone.instances.findIndex(i => i.id === target.id);
    const from = getLBPos(size);
    const to = getInstPos(target, zone.id, idx, size);

    const id = packetId.current++;
    setPackets(prev => [...prev, { id, from, to }]);
    setTimeout(() => setPackets(prev => prev.filter(p => p.id !== id)), 750);
  }, [sim.loadBalancer.requests]);

  const lbPos = getLBPos(size);

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: '#050509' }}>
      {/* Grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#6b7280" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)"/>
      </svg>

      {/* Lines + Packets */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {sim.zones.flatMap(zone =>
          zone.instances.map((inst, idx) => {
            const to = getInstPos(inst, zone.id, idx, size);
            const alive = inst.status !== 'dead';
            const isUnhealthy = inst.status === 'unhealthy';
            return (
              <line key={inst.id + '-l'}
                x1={lbPos.x} y1={lbPos.y} x2={to.x} y2={to.y}
                stroke={alive ? (isUnhealthy ? 'rgba(239,68,68,0.2)' : 'rgba(52,211,153,0.12)') : 'rgba(80,80,80,0.07)'}
                strokeWidth={alive ? 1.5 : 1}
                strokeDasharray={isUnhealthy ? '4 6' : inst.status === 'dead' ? '2 10' : 'none'}
              />
            );
          })
        )}
        <AnimatePresence>
          {packets.map(pk => (
            <motion.circle key={pk.id} r={4} fill="#22d3ee"
              style={{ filter: 'drop-shadow(0 0 5px rgba(34,211,238,0.9))' }}
              initial={{ cx: pk.from.x, cy: pk.from.y, opacity: 1, scale: 1 }}
              animate={{ cx: pk.to.x, cy: pk.to.y, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeIn' }}
            />
          ))}
        </AnimatePresence>
      </svg>

      {/* AZ containers */}
      {sim.zones.map(zone => {
        const az = AZ_LAYOUT[zone.id];
        if (!az) return null;
        const cx = az.xFrac * size.w;
        const zW = size.w * 0.36;
        const zH = size.h * 0.55;
        return (
          <div key={zone.id} className="absolute rounded-2xl border pointer-events-none"
            style={{
              left: cx - zW / 2, top: size.h * 0.41,
              width: zW, height: zH,
              borderColor: zone.alive ? 'rgba(99,102,241,0.18)' : 'rgba(239,68,68,0.2)',
              background: zone.alive ? 'rgba(99,102,241,0.03)' : 'rgba(239,68,68,0.04)',
            }}>
            <span className="absolute -top-3 left-4 text-[10px] uppercase tracking-widest px-2 font-mono"
              style={{ color: zone.alive ? 'rgba(129,140,248,0.8)' : 'rgba(248,113,113,0.9)', background: '#050509' }}>
              {zone.label}{!zone.alive && ' ⚠ DOWN'}
            </span>
          </div>
        );
      })}

      {/* LB */}
      <div className="absolute" style={{ left: lbPos.x, top: lbPos.y, transform: 'translate(-50%,-50%)' }}>
        <LBNode requests={sim.loadBalancer.requests} />
      </div>

      {/* Instances */}
      {sim.zones.flatMap(zone =>
        zone.instances.map((inst, idx) => {
          const pos = getInstPos(inst, zone.id, idx, size);
          return (
            <div key={inst.id} className="absolute" style={{ left: pos.x, top: pos.y, transform: 'translate(-50%,-50%)' }}>
              <InstanceNode instance={inst} onClick={onKillInstance} />
            </div>
          );
        })
      )}
    </div>
  );
}
