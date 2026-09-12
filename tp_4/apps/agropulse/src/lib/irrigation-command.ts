export type CommandStatus = 'pending' | 'applied' | 'failed' | 'cancelled';

const statusMeta: Record<CommandStatus, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: '#c78932' },
  applied: { label: 'Aplicado', color: '#549c60' },
  failed: { label: 'Fallido', color: '#d65c4a' },
  cancelled: { label: 'Cancelado', color: '#87918b' },
};

export function validateCommandDuration(input: string): { value: number | null; error: string | null; valid: boolean } {
  if (!/^\d+$/.test(input.trim())) return { value: null, error: 'Ingresá un número entero de 1 a 120 minutos.', valid: false };
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1 || value > 120) return { value: null, error: 'Ingresá un número entero de 1 a 120 minutos.', valid: false };
  return { value, error: null, valid: true };
}

export function describeCommandStatus(status: CommandStatus) { return statusMeta[status]; }

export function createClientRequestId(): string {
  const cryptoObject = globalThis.crypto as Crypto & { randomUUID?: () => string } | undefined;
  if (cryptoObject?.randomUUID) return cryptoObject.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
}
