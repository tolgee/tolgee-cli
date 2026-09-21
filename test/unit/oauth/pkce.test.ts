import { createHash } from 'crypto';

import { createPkcePair, createState } from '#cli/oauth/pkce.js';

const UNRESERVED = /^[A-Za-z0-9\-._~]+$/;

describe('PKCE', () => {
  it('creates a verifier the server will accept', () => {
    const { verifier } = createPkcePair();

    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
    expect(verifier).toMatch(UNRESERVED);
  });

  it('challenges with the base64url SHA-256 of the verifier', () => {
    const { verifier, challenge } = createPkcePair();

    expect(challenge).toBe(
      createHash('sha256').update(verifier).digest('base64url')
    );
    expect(challenge).toMatch(UNRESERVED);
  });

  it('never repeats a verifier or a state', () => {
    const verifiers = new Set<string>();
    const states = new Set<string>();

    for (let i = 0; i < 50; i++) {
      verifiers.add(createPkcePair().verifier);
      states.add(createState());
    }

    expect(verifiers.size).toBe(50);
    expect(states.size).toBe(50);
  });
});
