export type OAuthErrorKind = 'unsupported' | 'no-browser' | 'oauth' | 'network';

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly kind: OAuthErrorKind
  ) {
    super(message);
    this.name = 'OAuthError';
  }
}
