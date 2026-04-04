// src/simulation/simulationEngine.js
// Core simulation logic — NO React, pure JS

export const ALGO = { LEAST_LOAD: 'least_load', ROUND_ROBIN: 'round_robin' };

export function createInitialState() {
  return {
    algo: ALGO.LEAST_LOAD,
    trafficRate: 0, // 0 = stopped
    tick: 0,
    rrIndex: 0,
    packets: [],
    nextPacketId: 0,
    zones: [
      {
        id: 'az-1',
        label: 'AZ-1 / us-east-1a',
        alive: true,
        instances: [
          makeInstance('i-1', 'az-1'),
          makeInstance('i-2', 'az-1'),
        ],
      },
      {
        id: 'az-2',
        label: 'AZ-2 / us-east-1b',
        alive: true,
        instances: [
          makeInstance('i-3', 'az-2'),
          makeInstance('i-4', 'az-2'),
        ],
      },
    ],
    loadBalancer: { id: 'lb', requests: 0 },
    events: [],
  };
}

let _instanceCounter = 5;

export function makeInstance(id, zoneId) {
  return {
    id,
    zoneId,
    load: 0,
    requests: 0,
    status: 'healthy', // healthy | unhealthy | booting | dead
    bootProgress: 0,
  };
}

export function tick(state) {
  let s = { ...state, tick: state.tick + 1 };
  s = decayLoad(s);
  s = updateBootProgress(s);
  s = updateHealth(s);
  return s;
}

function decayLoad(state) {
  return {
    ...state,
    zones: state.zones.map(z => ({
      ...z,
      instances: z.instances.map(inst => ({
        ...inst,
        load: inst.status === 'dead' ? 0 : Math.max(0, inst.load - 0.025),
      })),
    })),
  };
}

function updateBootProgress(state) {
  return {
    ...state,
    zones: state.zones.map(z => ({
      ...z,
      instances: z.instances.map(inst => {
        if (inst.status !== 'booting') return inst;
        const prog = inst.bootProgress + 0.08;
        if (prog >= 1) return { ...inst, status: 'healthy', bootProgress: 1, load: 0.05 };
        return { ...inst, bootProgress: prog };
      }),
    })),
  };
}

function updateHealth(state) {
  return {
    ...state,
    zones: state.zones.map(z => ({
      ...z,
      instances: z.instances.map(inst => {
        if (inst.status === 'dead' || inst.status === 'booting') return inst;
        if (inst.load > 0.9) return { ...inst, status: 'unhealthy' };
        if (inst.load < 0.75 && inst.status === 'unhealthy') return { ...inst, status: 'healthy' };
        return inst;
      }),
    })),
  };
}

export function getEligibleInstances(state) {
  return state.zones
    .filter(z => z.alive)
    .flatMap(z => z.instances)
    .filter(i => i.status === 'healthy' && i.load < 0.9);
}

export function chooseTarget(state) {
  const eligible = getEligibleInstances(state);
  if (!eligible.length) return null;

  if (state.algo === ALGO.LEAST_LOAD) {
    return eligible.sort((a, b) => a.load - b.load)[0];
  } else {
    return eligible[state.rrIndex % eligible.length];
  }
}

export function sendPacket(state) {
  const target = chooseTarget(state);
  if (!target) return { ...state, events: addEvent(state.events, '⚠ No healthy instances available!') };

  const packet = {
    id: state.nextPacketId,
    targetId: target.id,
    progress: 0,
  };

  const newState = {
    ...state,
    nextPacketId: state.nextPacketId + 1,
    rrIndex: state.rrIndex + 1,
    packets: [...state.packets, packet],
    loadBalancer: { ...state.loadBalancer, requests: state.loadBalancer.requests + 1 },
    zones: state.zones.map(z => ({
      ...z,
      instances: z.instances.map(inst => {
        if (inst.id !== target.id) return inst;
        const newLoad = Math.min(1, inst.load + 0.12);
        return { ...inst, load: newLoad, requests: inst.requests + 1 };
      }),
    })),
  };

  return newState;
}

export function killInstance(state, instanceId) {
  const events = addEvent(state.events, `💀 ${instanceId} terminated`);
  return {
    ...state,
    events,
    zones: state.zones.map(z => ({
      ...z,
      instances: z.instances.map(inst =>
        inst.id === instanceId ? { ...inst, status: 'dead', load: 0 } : inst
      ),
    })),
  };
}

export function scaleUp(state, zoneId) {
  const id = `i-${_instanceCounter++}`;
  const events = addEvent(state.events, `🚀 ${id} booting in ${zoneId}`);
  return {
    ...state,
    events,
    zones: state.zones.map(z => {
      if (z.id !== zoneId) return z;
      return { ...z, instances: [...z.instances, { ...makeInstance(id, zoneId), status: 'booting', bootProgress: 0 }] };
    }),
  };
}

export function killZone(state, zoneId) {
  const events = addEvent(state.events, `☠ AZ ${zoneId} went down!`);
  return {
    ...state,
    events,
    zones: state.zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        alive: false,
        instances: z.instances.map(i => ({ ...i, status: 'dead', load: 0 })),
      };
    }),
  };
}

export function reviveZone(state, zoneId) {
  const events = addEvent(state.events, `♻ AZ ${zoneId} restored`);
  return {
    ...state,
    events,
    zones: state.zones.map(z => {
      if (z.id !== zoneId) return z;
      return {
        ...z,
        alive: true,
        instances: z.instances
          .filter(i => i.status === 'dead' && !i.id.startsWith('i-' + (parseInt(i.id.split('-')[1]) > 4 ? 99 : -1)))
          .map(i => ({ ...i, status: 'booting', bootProgress: 0, load: 0 }))
          .concat(z.instances.filter(i => i.status !== 'dead')),
      };
    }),
  };
}

export function simulateAttack(state) {
  let s = { ...state, events: addEvent(state.events, '🔥 DDoS attack started!') };
  for (let i = 0; i < 8; i++) s = sendPacket(s);
  return s;
}

function addEvent(events, msg) {
  const next = [{ msg, time: Date.now() }, ...events].slice(0, 6);
  return next;
}
