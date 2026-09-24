type Page = {
  tone: 'ok' | 'error';
  badge: string;
  heading: string;
  text: string;
};

const TOLGEE_LOGO = `<svg class="logo" viewBox="0 0 110 37" fill="none" role="img" aria-label="Tolgee"><path fill="#EC407A" d="M21.58.73a3.26 3.26 0 0 0 .6 5.43.62.62 0 0 1-.57 1.1 4.5 4.5 0 0 1-2.2-2.5 14 14 0 0 0-6.36 3.48c-5.27 4.65-6.59 11.81-3.14 16.32a7.7 7.7 0 0 0-1.71 3.58 4 4 0 0 0 1.1 3.46c1.77 1.83 4.12 1.35 6 .98 1.27-.26 2.47-.5 3.18 0 .72.5.67.73.7.85.4 1.79-1.1 2.66-1.48 3.11a.28.28 0 0 0 .22.46 4 4 0 0 0 2.34-.82 3.3 3.3 0 0 0 1.1-3.13l-.07-.3a3.6 3.6 0 0 0-1.65-2.13c-1.49-.94-3.3-.58-4.85-.26-1.88.37-3.08.55-3.91-.33a1.8 1.8 0 0 1-.44-1.5q.28-1.28 1.1-2.28c4.17 3.28 10.98 2.58 15.9-1.8a14.6 14.6 0 0 0 4.03-5.43 4.4 4.4 0 0 1-2.6-2.63.6.6 0 0 1 .6-.83.6.6 0 0 1 .56.41 3.3 3.3 0 0 0 1.96 1.93 3.25 3.25 0 0 0 4.08-1.82 3.22 3.22 0 0 0-3.23-4.44.63.63 0 0 1-.63-.8.6.6 0 0 1 .53-.44c.86-.06 1.72.11 2.48.52.5-2.7.64-6.02-.4-7.18-.78-.89-3.96-1.54-6.76-1.49q.2.94 0 1.88a.6.6 0 0 1-.72.47.6.6 0 0 1-.5-.7A3.24 3.24 0 0 0 23.41 0q-1.01.1-1.83.74m12.16 4.03a1 1 0 0 1-.1 1.18c-.26.22-.54-.1-.8-.4-.26-.29-.6-.65-.35-.87a1.1 1.1 0 0 1 1.25.09"/><path fill="#2C3C52" fill-rule="evenodd" d="M85.37 23.97a5.8 5.8 0 0 1-3.61 5.4q-1.1.45-2.3.45h-1.48v-2.95h1.46q.6 0 1.18-.18c.59-.2 1.07-.63 1.35-1.19q.2-.4.32-.83-.19.29-.5.45-.33.2-.71.3a4 4 0 0 1-1.61.15 6 6 0 0 1-2.3-.33 5.5 5.5 0 0 1-3.14-3.1 6.7 6.7 0 0 1 0-4.96 6 6 0 0 1 3.14-3.21q1.09-.47 2.3-.47.55 0 1.1.14 1.1.3 2.05.96.45.33.88.73l1.1-1.36h.71zm6.83-1.36q.16.06.34.07h.34q.42 0 .83-.11t.75-.34q.73-.46 1.1-1.25l2.2 2.2q-.4.6-.95 1.08a6 6 0 0 1-6.12 1 5.8 5.8 0 0 1-3.17-3.18 6.5 6.5 0 0 1 0-4.93 5.6 5.6 0 0 1 3.14-3.16 6 6 0 0 1 5.01.22 6 6 0 0 1 2.05 1.88zm11.5 0q.17.06.34.07h.35q.43 0 .84-.11t.74-.34a3 3 0 0 0 1.08-1.25l2.2 2.2q-.4.6-.95 1.08-.52.46-1.15.78a6 6 0 0 1-2.71.66A5.8 5.8 0 0 1 99 22.08a6.5 6.5 0 0 1 0-4.93 5.6 5.6 0 0 1 3.14-3.16 6 6 0 0 1 5.01.22 6 6 0 0 1 2.06 1.88zm-36.35-3.04q0 1.24-.46 2.39-.45 1.07-1.27 1.92-.81.82-1.88 1.28a5.9 5.9 0 0 1-7.69-3.2 6.2 6.2 0 0 1 0-4.82q.44-1.09 1.27-1.92a6 6 0 0 1 1.88-1.27q1.1-.48 2.28-.47 1.2 0 2.3.43a5.7 5.7 0 0 1 3.14 3.17q.48 1.2.46 2.5zm-15.32 5.85h-3.07V13.11H44.3v-3.09h12.36v3.09h-4.64zm19.91 0h-2.97V9.35h2.97zm-7.56-5.85q0-.66-.23-1.28a3 3 0 0 0-1.56-1.63 3.2 3.2 0 0 0-2.28 0 2.8 2.8 0 0 0-1.54 1.63 3.7 3.7 0 0 0 0 2.57q.22.55.61.99.4.41.93.65.51.25 1.1.24a2.7 2.7 0 0 0 2.02-.85q.41-.43.63-.98.24-.62.23-1.28zm18.02 0q0-.6-.24-1.17a3.2 3.2 0 0 0-1.56-1.7 2.5 2.5 0 0 0-1.1-.26q-.57 0-1.1.21a3 3 0 0 0-.92.6 3 3 0 0 0-.63.99q-.23.64-.22 1.33 0 .66.22 1.3.22.55.63.98.4.4.92.62.53.21 1.1.22.58-.01 1.1-.26.53-.27.93-.7.41-.44.63-1 .24-.55.26-1.16zm11.3-3a1 1 0 0 0-.4-.08h-.4q-.59 0-1.1.21-.54.22-.93.64-.41.42-.63.97-.23.63-.22 1.3v.78q-.02.22.1.4.05.18.13.35zm11.5 0a1 1 0 0 0-.4-.1l-.4.02q-.58 0-1.1.21-.54.22-.93.64-.4.42-.62.97-.24.63-.22 1.3v.78q-.03.22.08.4.06.18.15.35z" clip-rule="evenodd"/></svg>`;

const STYLE = `*{box-sizing:border-box}
body{
margin:0;
background:#fdfdff;
color:#1f2d40de;
font:15px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif
}
main{
max-width:520px;
margin:32vh auto 0;
padding:24px
}
.top{
display:flex;
align-items:center;
justify-content:space-between;
gap:16px
}
.logo{
height:32px;
width:auto;
flex-shrink:0
}
.card{
padding:clamp(24px,7vw,40px);
border:1px solid #e1e5eb;
border-radius:8px;
background:#fff
}
.status{
display:inline-block;
padding:4px 8px;
border-radius:99px;
font-size:13px;
font-weight:500;
white-space:nowrap
}
.status.ok{
background:#e6faf0;
color:#008144
}
.status.error{
background:#ffe5ea;
color:#ad001f
}
h1{
margin:12px 0 0;
font-size:24px;
font-weight:400;
line-height:1.235
}
p{
margin:6px 0 0;
color:#1f2d4099;
line-height:1.5
}`;

function page({ tone, badge, heading, text }: Page): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Tolgee CLI</title>
<style>
${STYLE}
</style>
</head>
<body>
<main>
<div class="card">
<div class="top">
<span class="status ${tone}">${badge}</span>
${TOLGEE_LOGO}
</div>
<h1>${heading}</h1>
<p>${text}</p>
</div>
</main>
</body>
</html>`;
}

export const LOGGED_IN_PAGE = page({
  tone: 'ok',
  badge: '✓ Connected',
  heading: 'You’re logged in',
  text: 'You can close this tab and return to your terminal.',
});

export const LOGIN_FAILED_PAGE = page({
  tone: 'error',
  badge: '✕ Not connected',
  heading: 'Login failed',
  text: 'Go back to your terminal to see what went wrong.',
});
