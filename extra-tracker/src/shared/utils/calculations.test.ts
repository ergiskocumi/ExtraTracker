import { describe, expect, it } from 'vitest';
import { calculatesTotalsByProject, type ProjectSummary } from './calculations';

const makeLog = (projectId: string, startTime: string, endTime: string, date = '2024-01-01') => ({
  id: crypto.randomUUID(),
  projectId,
  date,
  startTime,
  endTime,
});

const makeProject = (id: string, name: string, rate: number) => ({
  id,
  name,
  code: id,
  rate,
});

describe('calculatesTotalsByProject', () => {
  it('somma ore e importi per progetto', () => {
    const projects = [makeProject('p1', 'Alpha', 50), makeProject('p2', 'Beta', 100)];
    const logs = [
      makeLog('p1', '09:00', '11:00'), // 2h -> 100€
      makeLog('p1', '14:00', '15:30'), // 1.5h -> 75€
      makeLog('p2', '10:00', '12:00'), // 2h -> 200€
    ];

    const result = calculatesTotalsByProject(logs as any, projects as any);
    const alpha = result.find(r => r.projectId === 'p1') as ProjectSummary;
    const beta = result.find(r => r.projectId === 'p2') as ProjectSummary;

    expect(alpha.totalHours).toBeCloseTo(3.5, 5);
    expect(alpha.totalAmount).toBeCloseTo(175, 5);
    expect(beta.totalHours).toBeCloseTo(2, 5);
    expect(beta.totalAmount).toBeCloseTo(200, 5);
  });

  it('ignora log con projectId non presente', () => {
    const projects = [makeProject('p1', 'Alpha', 50)];
    const logs = [makeLog('missing', '09:00', '10:00')];

    const result = calculatesTotalsByProject(logs as any, projects as any);
    expect(result.length).toBe(0);
  });

  it('filtra progetti senza ore (0h)', () => {
    const projects = [makeProject('p1', 'Alpha', 50)];
    const logs: any[] = [];

    const result = calculatesTotalsByProject(logs, projects as any);
    expect(result).toHaveLength(0);
  });

  it('gestisce correttamente il midnight crossing (es. 23:00 -> 01:00)', () => {
    const projects = [makeProject('p1', 'NightShift', 100)]; // 100€/ora
    
    // Log che attraversa la mezzanotte: 2 ore totali
    const logs = [makeLog('p1', '23:00', '01:00')]; 

    const result = calculatesTotalsByProject(logs as any, projects as any);
    const summary = result.find(r => r.projectId === 'p1');

    expect(summary).toBeDefined();
    expect(summary?.totalHours).toBe(2); // Non deve essere filtrato, deve essere 2 ore!
    expect(summary?.totalAmount).toBe(200); // 2 ore * 100€
  });
});