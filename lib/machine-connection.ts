/**
 * Turns a running instance into something a student can act on.
 *
 * The page used to print an IP and a port as two separate values and leave the
 * rest to the reader, which is fine for a web challenge and useless for a pwn
 * one — the address is right there but the command to reach it is not.
 */
export type MachineProtocol = 'http' | 'https' | 'tcp' | 'ssh';

const PROTOCOLS: MachineProtocol[] = ['http', 'https', 'tcp', 'ssh'];

export function isMachineProtocol(value: unknown): value is MachineProtocol {
  return (
    typeof value === 'string' && PROTOCOLS.includes(value as MachineProtocol)
  );
}

/**
 * Falls back to the category when a machine does not state its protocol.
 *
 * Existing machines predate the field, so a guess is better than showing
 * nothing — web challenges are served over HTTP and everything else is a raw
 * socket far more often than not. Admins override it per machine.
 */
export function resolveProtocol(
  serviceProtocol: string | null | undefined,
  category: string | null | undefined
): MachineProtocol {
  if (isMachineProtocol(serviceProtocol)) return serviceProtocol;
  return (category ?? '').toLowerCase() === 'web' ? 'http' : 'tcp';
}

export type MachineConnection = {
  protocol: MachineProtocol;
  host: string;
  port: number;
  /** What the student copies or clicks. */
  display: string;
  /** Set only when the address is something a browser can open. */
  href: string | null;
};

export function buildConnection(
  host: string,
  port: number,
  protocol: MachineProtocol
): MachineConnection {
  const base = { protocol, host, port };

  switch (protocol) {
    case 'http':
    case 'https':
      return {
        ...base,
        display: `${protocol}://${host}:${port}`,
        href: `${protocol}://${host}:${port}`,
      };
    case 'ssh':
      return {
        ...base,
        display: `ssh root@${host} -p ${port}`,
        href: null,
      };
    case 'tcp':
    default:
      // netcat is what a pwn challenge is actually reached with, and it is not
      // something a browser can follow — hence no href.
      return {
        ...base,
        display: `nc ${host} ${port}`,
        href: null,
      };
  }
}
