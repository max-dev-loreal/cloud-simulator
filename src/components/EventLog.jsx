import { motion, AnimatePresence } from 'framer-motion';
 
export default function EventLog({ events }) {
  return (
    <div style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: '#3f3f46', textTransform: 'uppercase', marginBottom: 6, fontFamily: 'monospace' }}>Event Log</span>
      <AnimatePresence initial={false}>
        {events.map((ev, i) => (
          <motion.div key={ev.time + ev.msg}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1 - i * 0.15, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ fontSize: 11, color: '#71717a', borderBottom: '1px solid #18181b', paddingBottom: 4, fontFamily: 'monospace', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {ev.msg}
          </motion.div>
        ))}
      </AnimatePresence>
      {events.length === 0 && (
        <span style={{ fontSize: 10, color: '#27272a', fontFamily: 'monospace' }}>No events yet...</span>
      )}
    </div>
  );
}