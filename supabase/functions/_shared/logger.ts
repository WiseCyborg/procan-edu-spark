export const log = (
  level: 'info' | 'error' | 'warn', 
  event: string, 
  data: Record<string, unknown> = {}
) => {
  const logEntry = {
    ts: new Date().toISOString(),
    event,
    ...data
  };
  console[level](JSON.stringify(logEntry));
};
