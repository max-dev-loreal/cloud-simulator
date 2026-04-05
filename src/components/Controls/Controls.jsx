const IS_LIVE = !!import.meta.env.VITE_API_URL;
 
export default function Controls({ sim, trafficOn, handlers }) {
  const allInst = sim.zones.flatMap(z => z.instances);
  const healthyCount = allInst.filter(i => i.status === 'healthy').length;
  const avgLoad = allInst.reduce((s, i) => s + (i.load || 0), 0) / Math.max(allInst.length, 1);
  const loadColor = avgLoad > 0.7 ? '#f87171' : avgLoad > 0.4 ? '#fbbf24' : '#34d399';
 
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, borderBottom: '1px solid #1f1f2e', background: '#07070f' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <StatCard label="Healthy" value={healthyCount} color="#34d399" />
        <StatCard label="Avg Load" value={Math.round(avgLoad * 100) + '%'} color={loadColor} />
        <StatCard label="Total" value={allInst.length} color="#a1a1aa" />
      </div>
 
      {/* Traffic — только в симуляции */}
      {!IS_LIVE && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={handlers.onToggleTraffic}
            label={trafficOn ? '⏹ Stop' : '▶ Start Traffic'}
            color={trafficOn ? '#f87171' : '#34d399'}
            bg={trafficOn ? 'rgba(239,68,68,0.08)' : 'rgba(52,211,153,0.08)'}
            border={trafficOn ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)'}
          />
          <Btn onClick={handlers.onSendOne} label="→ 1 Req" color="#a1a1aa" bg="rgba(255,255,255,0.03)" border="rgba(255,255,255,0.1)" />
        </div>
      )}
 
      {/* Algo */}
      <Btn onClick={handlers.onToggleAlgo}
        label={`⚙ ${sim.algo === 'least_load' ? 'Least Load' : 'Round Robin'}`}
        color="#818cf8" bg="rgba(99,102,241,0.08)" border="rgba(99,102,241,0.25)" />
 
      {/* Scale */}
      <div style={{ display: 'flex', gap: 8 }}>
        {sim.zones.map(z => (
          <Btn key={z.id} onClick={() => handlers.onScaleUp(z.id)}
            label={`+ ${z.id.toUpperCase()}`}
            color="#a1a1aa" bg="rgba(255,255,255,0.03)" border="rgba(255,255,255,0.08)" flex={1} />
        ))}
      </div>
 
      {/* Danger */}
      <div style={{ borderTop: '1px solid #1a1a2e', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 9, letterSpacing: 2, color: '#3f3f46', textTransform: 'uppercase', fontFamily: 'monospace' }}>Danger Zone</span>
 
        {/* Kill Zone — только в симуляции */}
        {!IS_LIVE && (
          <div style={{ display: 'flex', gap: 8 }}>
            {sim.zones.map(z => (
              <Btn key={z.id} onClick={() => z.alive && handlers.onKillZone(z.id)}
                label={z.alive ? `☠ Kill ${z.id.toUpperCase()}` : `↓ ${z.id.toUpperCase()} Down`}
                color={z.alive ? '#f87171' : '#52525b'}
                bg={z.alive ? 'rgba(239,68,68,0.07)' : 'rgba(0,0,0,0.2)'}
                border={z.alive ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)'}
                flex={1} />
            ))}
          </div>
        )}
 
        {/* Simulate Attack — только в симуляции */}
        {!IS_LIVE && (
          <Btn onClick={handlers.onAttack} label="🔥 Simulate Attack"
            color="#fb923c" bg="rgba(251,146,60,0.08)" border="rgba(251,146,60,0.25)" />
        )}
 
        <Btn onClick={handlers.onReset} label="↺ Reset"
          color="#52525b" bg="transparent" border="rgba(255,255,255,0.06)" />
      </div>
    </div>
  );
}
 
function Btn({ label, onClick, color, bg, border, flex }) {
  return (
    <button onClick={onClick} style={{
      flex: flex || 'none',
      width: flex ? undefined : '100%',
      padding: '8px 12px',
      borderRadius: 8,
      border: `1px solid ${border}`,
      background: bg,
      color,
      fontSize: 11,
      fontFamily: 'monospace',
      letterSpacing: 1,
      cursor: 'pointer',
      transition: 'all 0.15s',
      textAlign: 'center',
    }}
    onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.3)'}
    onMouseLeave={e => e.currentTarget.style.filter = 'brightness(1)'}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      {label}
    </button>
  );
}
 
function StatCard({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      background: 'rgba(255,255,255,0.02)', borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.05)', padding: '8px 4px',
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</span>
      <span style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 2, fontFamily: 'monospace' }}>{label}</span>
    </div>
  );
}