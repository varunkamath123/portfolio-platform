import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Renders research answers. GFM adds tables, strikethrough and task lists.
// Raw HTML in the model output is NOT rendered (react-markdown default), so
// answers can't inject markup.

const text = '#c4d6c4'

const components: Components = {
  h1: ({ children }) => <h2 className="text-base font-bold text-white mt-6 mb-2 first:mt-0">{children}</h2>,
  h2: ({ children }) => (
    <h2 className="text-[15px] font-semibold text-white mt-6 mb-2 pb-1.5 first:mt-0"
      style={{ borderBottom: '1px solid var(--border)' }}>{children}</h2>
  ),
  h3: ({ children }) => <h3 className="text-sm font-semibold mt-4 mb-1.5" style={{ color: 'var(--green)' }}>{children}</h3>,
  h4: ({ children }) => <h4 className="text-sm font-semibold text-white mt-3 mb-1">{children}</h4>,
  p:  ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
  em: ({ children }) => <em className="italic" style={{ color: '#d8e8d8' }}>{children}</em>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--green)' }}>{children}</a>
  ),
  ul: ({ children }) => <ul className="mb-3 space-y-1.5 pl-5 list-disc marker:text-[var(--green)]">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 space-y-1.5 pl-5 list-decimal marker:text-[var(--muted)] marker:font-medium">{children}</ol>,
  li: ({ children }) => <li className="pl-1 [&>ul]:mt-1.5 [&>ol]:mt-1.5 [&>ul]:mb-0 [&>ol]:mb-0">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 rounded-r-lg px-4 py-2.5 [&>p]:mb-0"
      style={{ borderLeft: '3px solid var(--green)', background: 'rgba(22,199,132,0.06)', color: '#d8e8d8' }}>
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5" style={{ borderColor: 'var(--border)' }} />,
  code: ({ children }) => (
    <code className="rounded px-1 py-0.5 text-[0.8em] font-mono" style={{ background: '#1a2a1a', color: 'var(--green)' }}>{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-3 rounded-lg p-3 overflow-x-auto text-xs" style={{ background: '#0a120a', border: '1px solid var(--border)' }}>{children}</pre>
  ),
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
      <table className="w-full text-[13px] border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead style={{ background: 'rgba(22,199,132,0.07)' }}>{children}</thead>,
  th: ({ children, style }) => (
    <th className="px-3 py-2 text-left font-semibold text-white whitespace-nowrap"
      style={{ ...style, borderBottom: '1px solid var(--border)' }}>{children}</th>
  ),
  td: ({ children, style }) => (
    <td className="px-3 py-2 align-top" style={{ ...style, borderTop: '1px solid var(--border)' }}>{children}</td>
  ),
}

export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed" style={{ color: text }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{children}</ReactMarkdown>
    </div>
  )
}
