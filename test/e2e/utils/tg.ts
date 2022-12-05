import { fetch } from 'undici';

// tgpak_${base32([id]_[testX-...])}
export const PROJECT_PAK_1 =
  'tgpak_gfpxizltoqys2ylenvuw4lljnvyg64tumvsc24dsn5vgky3ufvuw24dmnfrws5a';
export const PROJECT_PAK_2 =
  'tgpak_gjpxizltoqzc2ylenvuw4lljnvyg64tumvsc24dsn5vgky3ufvuw24dmnfrws5a';
export const PROJECT_PAK_3 =
  'tgpak_gnpxizltoqzs2ylenvuw4lljnvyg64tumvsc24dsn5vgky3ufvuw24dmnfrws5a';

export function requestGet(url: string, key?: string) {
  return fetch(new URL(url, 'http://localhost:22222/'), {
    headers: key ? { 'x-api-key': key } : undefined,
  }).then((r) => (r.status === 201 ? null : (r.json() as any)));
}

export function requestPost(url: string, body?: any, key?: string) {
  return fetch(new URL(url, 'http://localhost:22222/'), {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    headers: key
      ? { 'content-type': 'application/json', 'x-api-key': key }
      : { 'content-type': 'application/json' },
  }).then((r) => (r.status === 201 ? null : (r.json() as any)));
}

export function requestPut(url: string, body?: any, key?: string) {
  return fetch(new URL(url, 'http://localhost:22222/'), {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    headers: key
      ? { 'content-type': 'application/json', 'x-api-key': key }
      : { 'content-type': 'application/json' },
  }).then((r) => (r.status === 201 ? null : (r.json() as any)));
}

export function requestDelete(url: string, body?: any, key?: string) {
  return fetch(new URL(url, 'http://localhost:22222/'), {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
    headers: key
      ? { 'content-type': 'application/json', 'x-api-key': key }
      : { 'content-type': 'application/json' },
  }).then(() => null);
}

let userToken: string;
export async function getUserPat() {
  if (!userToken) {
    const login = await requestPost(
      'http://localhost:22222/api/public/generatetoken',
      { username: 'admin', password: 'admin' }
    );

    const pat = await fetch('http://localhost:22222/v2/pats', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${login.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ description: 'e2e test pat', expiresAt: null }),
    }).then((r) => r.json() as any);

    userToken = pat.token;
  }

  return userToken;
}

export async function setBackendProperty(name: string, value: any) {
  const res = await requestPut(
    'http://localhost:22222/internal/properties/set',
    { name, value }
  );

  // Undici doesn't like unread bodies
  if (res.body) {
    for await (const _ of res.body);
  }
}
