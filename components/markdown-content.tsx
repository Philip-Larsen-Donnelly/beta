import React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MarkdownContentProps {
  content: string
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }) {
            const language = className?.replace("language-", "") || ""
            if (inline) {
          return (
                <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>
                  {children}
                </code>
          )
        }
          return (
              <pre className="bg-muted rounded-md p-3 overflow-x-auto text-xs" {...props}>
                <code className={language ? `language-${language}` : undefined}>{children}</code>
              </pre>
            )
          },
          p({ children }) {
            return <p className="text-sm text-muted-foreground">{children}</p>
          },
          li({ children }) {
            return <li className="text-sm text-muted-foreground">{children}</li>
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">{children}</ul>
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">{children}</ol>
          },
          blockquote({ children }) {
          return (
              <blockquote className="border-l-2 border-muted-foreground/50 pl-3 text-sm text-muted-foreground">
                {children}
              </blockquote>
          )
          },
          table({ children }) {
          return (
              <div className="overflow-x-auto">
                <table className="min-w-full border border-border text-sm">{children}</table>
              </div>
          )
          },
          th({ children }) {
            return <th className="border border-border bg-muted px-2 py-1 text-left font-semibold">{children}</th>
          },
          td({ children }) {
            return <td className="border border-border px-2 py-1 text-muted-foreground">{children}</td>
          },
          a({ children, href }) {
        return (
              <a className="text-primary underline decoration-primary/50 underline-offset-2" href={href} rel="noreferrer">
                {children}
              </a>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
