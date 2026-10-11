import { createHash, randomBytes } from 'crypto';

export type PkcePair = {
  verifier: string;
  challenge: string;
};

/**
 * RFC 7636 §4.1: 43-128 characters of unreserved ASCII, which 32 random bytes
 * encode to exactly.
 */
export function createPkcePair(): PkcePair {
  const verifier = base64url(randomBytes(32));
  return {
    verifier,
    challenge: base64url(createHash('sha256').update(verifier).digest()),
  };
}

export function createState() {
  return base64url(randomBytes(32));
}

function base64url(buffer: Buffer) {
  return buffer.toString('base64url');
}
