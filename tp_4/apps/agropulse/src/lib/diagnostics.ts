export type PipelineDescription = { label: string; tone: 'good' | 'warning' | 'neutral' };

export function workerLagSeconds(lastTickAt: string | null, now = new Date()): number | null {
  if (!lastTickAt) return null;
  const timestamp = new Date(lastTickAt).getTime();
  return Number.isFinite(timestamp) ? Math.max(0, (now.getTime() - timestamp) / 1000) : null;
}

export function describePipeline(status: string | null, lagSeconds: number | null): PipelineDescription {
  if (!status || lagSeconds === null) return { label: 'Sin datos', tone: 'neutral' };
  if (status === 'healthy' && lagSeconds <= 300) return { label: 'Operativo', tone: 'good' };
  return { label: 'Demorado', tone: 'warning' };
}
