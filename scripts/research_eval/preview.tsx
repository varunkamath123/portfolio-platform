// Renders before/after answers side by side into a static HTML file for eyeballing.
// Usage: npx tsx scripts/research_eval/preview.tsx <beforeDir> <afterDir> <q01,q04,...>
import { readFileSync, writeFileSync } from 'fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { Markdown } from '../../components/Markdown'

// Verbatim copy of the old regex renderer (app/(user)/ask/page.tsx @ 584bce6)
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3 style="color:white;font-weight:600;margin-top:1rem;margin-bottom:0.25rem;font-size:0.9rem">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="color:white;font-weight:700;margin-top:1.25rem;margin-bottom:0.5rem">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="color:white;font-weight:700;margin-top:1.5rem;margin-bottom:0.5rem">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:white">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#1a2a1a;border-radius:3px;padding:0 4px;color:var(--green);font-size:0.75rem">$1</code>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:1rem;color:#a0b8a0;margin-bottom:2px">$1</li>')
    .replace(/\n\n/g, '</p><p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/^/, '<p style="color:#a0b8a0;font-size:0.875rem;margin-bottom:0.75rem">')
    .replace(/$/, '</p>')
}

const [beforeDir, afterDir, list] = process.argv.slice(2)
const card = 'background:#0f1a0f;border:1px solid #1c301c;border-radius:12px;padding:16px'
const strip = (s: string) => s.replace(/^<!--[\s\S]*?-->\n/, '')

const sections = list.split(',').map(q => {
  const raw = readFileSync(`${afterDir}/${q}.md`, 'utf8')
  const title = raw.match(/^<!-- ([\s\S]*?) -->/)?.[1] ?? q
  const before = markdownToHtml(strip(readFileSync(`${beforeDir}/${q}.md`, 'utf8')))
  const after = renderToStaticMarkup(<Markdown>{strip(raw)}</Markdown>)
  return `<section style="margin-bottom:48px">
    <h2 style="color:#16c784;font:600 15px system-ui;margin:0 0 12px">${q.toUpperCase()} — ${title}</h2>
    <div class="cols">
      <div><p class="lbl">BEFORE (old prompt + regex renderer)</p><div style="${card}">${before}</div></div>
      <div><p class="lbl">AFTER (new prompt + Markdown component)</p><div style="${card}">${after}</div></div>
    </div></section>`
}).join('\n')

writeFileSync('scripts/research_eval/out/preview.html', `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Research before/after</title>
<script src="https://cdn.tailwindcss.com"></script>
<style>:root{--bg:#080c08;--bg-card:#0f1a0f;--green:#16c784;--muted:#6b8f6b;--border:#1c301c}
body{background:#080c08;margin:0;padding:24px;font-family:system-ui,sans-serif}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start}
.cols>div{width:min(100%,640px)} .lbl{color:#6b8f6b;font:600 11px system-ui;letter-spacing:.05em;margin:0 0 6px}
@media(max-width:900px){.cols{grid-template-columns:1fr}}</style></head>
<body>${sections}</body></html>`)
console.log('wrote scripts/research_eval/out/preview.html')
