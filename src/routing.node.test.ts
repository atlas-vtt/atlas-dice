import { describe, expect, it } from 'vitest';
import { routeToTable } from './routing.ts';

const roll = { site: 'dndbeyond', character: 'Mira', name: 'Stealth', formula: 'd20+2' } as const;
const target = (id: number): { id: number; label: string; available: boolean } => ({ id, label: `Table ${id}`, available: true });

describe('routing sheet rolls to exactly one table', () => {
  it('uses the sole ready tab automatically but requires selection for several tabs', async () => {
    const delivered: number[] = [];
    const deliver = (id: number): Promise<{ ok: true; available: true }> => { delivered.push(id); return Promise.resolve({ ok: true, available: true }); };
    expect((await routeToTable(roll, [target(1)], null, deliver)).ok).toBe(true);
    expect((await routeToTable(roll, [target(1), target(2)], null, deliver)).ok).toBe(false);
    expect((await routeToTable(roll, [target(1), target(2)], 2, deliver)).ok).toBe(true);
    expect(delivered).toEqual([1, 2]);
  });

  it('does not reroute or retry a roll after a selected tab closes or delivery becomes uncertain', async () => {
    let calls = 0;
    const deliver = (): Promise<never> => { calls += 1; return Promise.reject(new Error('closed')); };
    expect((await routeToTable(roll, [target(2)], 1, deliver)).ok).toBe(false);
    expect(calls).toBe(0);
    expect((await routeToTable(roll, [target(2)], 2, deliver)).ok).toBe(false);
    expect(calls).toBe(1);
  });

  it('distinguishes a missing player-page bridge from a disconnected table', async () => {
    const deliver = (): Promise<never> => Promise.reject(new Error('must not deliver'));
    const missing = await routeToTable(roll, [{ ...target(1), available: false, bridge: false }], null, deliver);
    expect(missing).toMatchObject({ ok: false, code: 'no-bridge' });
    if (!missing.ok) expect(missing.error).toContain('Reload your Atlas player tab');
    expect(await routeToTable(roll, [{ ...target(1), available: false, bridge: true }], null, deliver)).toMatchObject({ ok: false, code: 'not-ready' });
  });
});
