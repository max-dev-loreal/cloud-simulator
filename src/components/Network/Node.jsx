import { motion } from 'framer-motion';
 
const STATUS_STYLES = {
  healthy:   { border: '#10b98133', bg: '#05291866', dot: '#34d399', dotGlow: 'rgba(52,211,153,0.8)',  text: '#34d399', boxGlow: '0 0 16px rgba(52,211,153,0.15)' },
  unhealthy: { border: '#ef444466', bg: '#2d051166', dot: '#f87171', dotGlow: 'rgba(248,113,113,0.8)', text: '#f87171', boxGlow: '0 0 20px rgba(239,68,68,0.3)' },
  booting:   { border: '#f59e0b44', bg: '#1c130066', dot: '#fbbf24', dotGlow: 'rgba(251,191,36,0.8)',  text: '#fbbf24', boxGlow: '0 0 12px rgba(245,158,11,0.2)' },
  dead:      { border: '#ffffff11', bg: '#0a0a0f66', dot: '#3f3f46', dotGlow: 'none',                  text: '#52525b', boxGlow: 'none' },
};
 
const LB_STYLE = {
  border: '#3b82f6aa',
  bg: '#030d2666',
  dot: '#60a5fa',
  dotGlow: 'rgba(96,165,250,0.9)',
  text: '#93c5fd',
  boxGlow: '0 0 28px rgba(59,130,246,0.3)',
};
 
function loadColor(load) {
  if (load > 0.8) return '#f87171';
  if (load > 0.5) return '#fbbf24';
  return '#34d399';
}
 
export function LBNode({ requests }) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18 }}
      style={{
        width: 112, height: 112,
        borderRadius: 20,
        border: `1px solid ${LB_STYLE.border}`,
        background: LB_STYLE.bg,
        boxShadow: LB_STYLE.boxGlow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* ping ring */}
      <motion.div
        animate={{ scale: [1, 1.4], opacity: [0.4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
        style={{
          position: 'absolute', inset: 0,
          borderRadius: 20,
          border: `1px solid ${LB_STYLE.border}`,
          pointerEvents: 'none',
        }}
      />
      {/* inner dark */}
      <div style={{ position: 'absolute', inset: 6, borderRadius: 14, background: 'rgba(0,0,0,0.4)' }} />
 
      {/* dot */}
      <div style={{
        position: 'absolute', top: 8, right: 8,
        width: 9, height: 9, borderRadius: '50%',
        background: LB_STYLE.dot,
        boxShadow: `0 0 8px ${LB_STYLE.dotGlow}`,
      }} />
 
      <span style={{ position: 'relative', fontSize: 16, fontWeight: 900, letterSpacing: 3, color: LB_STYLE.text, fontFamily: 'monospace' }}>LB</span>
      <span style={{ position: 'relative', fontSize: 9, letterSpacing: 2, color: '#3b82f6aa', marginTop: 4, textTransform: 'uppercase', fontFamily: 'monospace' }}>Load Balancer</span>
      <span style={{ position: 'relative', fontSize: 9, color: '#3b82f688', marginTop: 2, fontFamily: 'monospace' }}>{requests} req</span>
    </motion.div>
  );
}
 
export function InstanceNode({ instance, onClick }) {
  const st = STATUS_STYLES[instance.status] || STATUS_STYLES.healthy;
  const loadPct = Math.round((instance.load || 0) * 100);
 
  return (
    <motion.div
      key={instance.id}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: instance.status === 'dead' ? 0.35 : 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      onClick={() => instance.status !== 'dead' && onClick(instance.id)}
      title={instance.status !== 'dead' ? 'Click to kill' : ''}
      style={{
        width: 96, height: 96,
        borderRadius: 14,
        border: `1px solid ${st.border}`,
        background: st.bg,
        boxShadow: st.boxGlow,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        cursor: instance.status !== 'dead' ? 'pointer' : 'default',
        backdropFilter: 'blur(6px)',
        transition: 'box-shadow 0.3s, border-color 0.3s',
      }}
      whileHover={instance.status !== 'dead' ? { scale: 1.05, brightness: 1.2 } : {}}
      whileTap={instance.status !== 'dead' ? { scale: 0.95 } : {}}
    >
      <div style={{ position: 'absolute', inset: 4, borderRadius: 10, background: 'rgba(0,0,0,0.3)' }} />
 
      {/* status dot */}
      <div style={{
        position: 'absolute', top: 7, right: 7,
        width: 7, height: 7, borderRadius: '50%',
        background: st.dot,
        boxShadow: st.dotGlow !== 'none' ? `0 0 6px ${st.dotGlow}` : 'none',
      }} />
 
      <span style={{ position: 'relative', fontSize: 13, fontWeight: 900, letterSpacing: 1, color: '#e4e4e7', fontFamily: 'monospace' }}>
        {instance.id}
      </span>
 
      {/* load bar */}
      <div style={{ position: 'relative', width: 64, marginTop: 8 }}>
        <div style={{ width: '100%', height: 3, background: '#27272a', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            animate={{ width: loadPct + '%' }}
            transition={{ duration: 0.4 }}
            style={{ height: '100%', borderRadius: 2, background: loadColor(instance.load) }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
          <span style={{ fontSize: 9, color: st.text, fontFamily: 'monospace' }}>{loadPct}%</span>
          <span style={{ fontSize: 9, color: '#52525b', fontFamily: 'monospace' }}>{instance.requests}r</span>
        </div>
      </div>
 
      {/* booting overlay */}
      {instance.status === 'booting' && (
        <div style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', pointerEvents: 'none' }}>
          <motion.div
            animate={{ height: (instance.bootProgress * 100) + '%' }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.3)' }}
          />
        </div>
      )}
    </motion.div>
  );
}