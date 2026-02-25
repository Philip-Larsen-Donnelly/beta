import type React from "react"

import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { requireProfile } from "@/lib/auth"
import { query } from "@/lib/db"
import { MarkdownContent } from "@/components/markdown-content"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChevronLeft } from "lucide-react"
import { TestpadCopyButton, TestpadResultTable } from "@/components/testpad-result-table"

type ResourceRow = {
  id: string
  component_id: string
  name: string
  type: "markdown" | "testpad"
  content: string | null
  component_name: string | null
}

type TestpadStep = {
  step: string
  indent: number
  text: string
}

type TestpadRow = TestpadStep & {
  kind: "step" | "category" | "comment"
}

type StoredResult = {
  step_index: number
  result: "pass" | "fail" | "blocked"
}

function linkifyUrls(text: string, keyPrefix: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  const nodes: React.ReactNode[] = []
  parts.forEach((part, index) => {
    if (!part) return
    if (part.match(urlRegex)) {
      nodes.push(
        <a
          key={`${keyPrefix}-url-${index}`}
          href={part}
          className="text-primary underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          {part}
        </a>,
      )
    } else {
      nodes.push(part)
    }
  })
  return nodes
}

function linkifyText(text: string, keyPrefix: string) {
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  const nodes: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = markdownLinkRegex.exec(text)) !== null) {
    const [full, label, url] = match
    if (match.index > lastIndex) {
      nodes.push(
        ...linkifyUrls(text.slice(lastIndex, match.index), `${keyPrefix}-txt`),
      )
    }
    nodes.push(
      <a
        key={`${keyPrefix}-md-${match.index}`}
        href={url}
        className="text-primary underline underline-offset-2"
        target="_blank"
        rel="noreferrer"
      >
        {label}
      </a>,
    )
    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    nodes.push(
      ...linkifyUrls(text.slice(lastIndex), `${keyPrefix}-tail`),
    )
  }

  return nodes
}

function renderLinkedMultilineText(text: string) {
  const lines = text.split(/\r?\n/)
  return lines.map((line, index) => (
    <span key={`desc-${index}`}>
      {linkifyText(line, `desc-${index}`)}
      {index < lines.length - 1 && <br />}
    </span>
  ))
}

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }
    current += char
  }
  values.push(current)
  return values
}

/**
 * Split CSV content into logical records, handling multi-line quoted values.
 * A quoted value can span multiple lines — we need to join those lines into
 * a single record before passing to parseCsvLine.
 */
function splitCsvRecords(content: string): string[] {
  const rawLines = content.split(/\r?\n/)
  const records: string[] = []
  let pending = ""
  let openQuotes = false

  for (const line of rawLines) {
    if (openQuotes) {
      pending += "\n" + line
    } else {
      pending = line
    }

    // Count unescaped quotes to determine if we're inside a quoted field
    let quotes = 0
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          i++ // skip escaped quote
        } else {
          quotes++
        }
      }
    }

    if (openQuotes) {
      // If odd number of quotes, the open quote is now closed
      if (quotes % 2 === 1) {
        openQuotes = false
      }
    } else {
      // If odd number of quotes, a quoted field is left open
      if (quotes % 2 === 1) {
        openQuotes = true
      }
    }

    if (!openQuotes) {
      records.push(pending)
      pending = ""
    }
  }

  // If there's a dangling record, push it anyway
  if (pending) {
    records.push(pending)
  }

  return records
}

function parseTestpad(content: string) {
  const lines = splitCsvRecords(content)
  let inScript = false
  let name = ""
  let description = ""
  let headerIndex = -1
  let currentKey: string | null = null

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const trimmed = line.trim()
    if (trimmed === "SCRIPT" || trimmed === "TEMPLATE") {
      inScript = true
      currentKey = null
      continue
    }
    if (inScript) {
      if (trimmed === "REPORT COMMENTS") {
        inScript = false
        currentKey = null
        continue
      }
      if (trimmed.length === 0) continue

      const fields = parseCsvLine(line)
      const key = fields[0]?.trim()
      const hasNewKey = key && fields.length > 1

      if (hasNewKey) {
        currentKey = key
        if (key === "Name") {
          name = fields.slice(1).join(",").trim()
        } else if (key === "Description") {
          description = fields.slice(1).join(",").trim()
        }
      } else if (currentKey === "Description" && !line.includes(",")) {
        description = description ? `${description}\n${line}` : line
      }
    }

    if (
      headerIndex === -1 &&
      trimmed.toLowerCase().startsWith("number,indent,text")
    ) {
      headerIndex = index
    }
  }

  const steps: TestpadStep[] = []
  if (headerIndex >= 0) {
    for (let i = headerIndex + 1; i < lines.length; i += 1) {
      const raw = lines[i]
      if (!raw || raw.trim().length === 0) continue
      const fields = parseCsvLine(raw)
      if (fields.length < 3) continue
      const step = fields[0]?.trim()
      const indentValue = Number.parseInt(fields[1] ?? "0", 10)
      const text = fields[2]?.trim()
      if (!step && !text) continue
      steps.push({
        step: step || "",
        indent: Number.isNaN(indentValue) ? 0 : indentValue,
        text: text || "",
      })
    }
  }

  return { name, description, steps }
}

function classifySteps(steps: TestpadStep[]): TestpadRow[] {
  return steps.map((step, index) => {
    const next = steps[index + 1]
    const hasChild = next ? next.indent > step.indent : false
    const trimmed = step.text.trim()
    const isComment = trimmed.startsWith("//") || trimmed.startsWith("--")
    if (hasChild) {
      return { ...step, kind: "category" }
    }
    if (isComment) {
      return { ...step, kind: "comment" }
    }
    return { ...step, kind: "step" }
  })
}

export default async function ResourcePage({
  params,
}: {
  params: Promise<{ resourceId: string }>
}) {
  const { resourceId } = await params
  const profile = await requireProfile()
  if (!profile) {
    redirect("/auth/login")
  }

  const { rows } = await query<ResourceRow>(
    `SELECT r.*, c.name AS component_name
     FROM component_resources r
     LEFT JOIN components c ON c.id = r.component_id
     WHERE r.id = $1
     LIMIT 1`,
    [resourceId],
  )

  const resource = rows[0] ?? null
  if (!resource) {
    notFound()
  }

  const backLink = `/testing/${resource.component_id}`
  const backLabel = resource.component_name ? `Back to ${resource.component_name}` : "Back to Component"

  const content = resource.content ?? ""
  const parsedTestpad = resource.type === "testpad" ? parseTestpad(content) : null
  const testpadRows = parsedTestpad ? classifySteps(parsedTestpad.steps) : []
  let initialResults: Record<number, "pass" | "fail" | "blocked" | null> = {}

  if (resource.type === "testpad") {
    const { rows: resultRows } = await query<StoredResult>(
      `SELECT step_index, result
       FROM testpad_results
       WHERE user_id = $1 AND resource_id = $2`,
      [profile.id, resource.id],
    )
    initialResults = resultRows.reduce<Record<number, "pass" | "fail" | "blocked" | null>>(
      (acc: Record<number, "pass" | "fail" | "blocked" | null>, row: StoredResult) => {
        acc[row.step_index] = row.result
        return acc
      },
      {},
    )
  }

  return (
    <div className="space-y-6">
      <Link href={backLink}>
        <Button variant="ghost" size="sm">
          <ChevronLeft className="h-4 w-4 mr-1" />
          {backLabel}
        </Button>
      </Link>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{resource.name}</h1>
      </div>

      {resource.type === "markdown" ? (
        <Card>
          <CardContent className="pt-4">
            {content ? (
              <MarkdownContent content={content} />
            ) : (
              <p className="text-sm text-muted-foreground">No markdown content available.</p>
            )}
          </CardContent>
        </Card>
      ) : resource.type === "video" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Video</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 space-y-3">
            {content ? (
              <>
                {/\.(mp4|webm|ogg)(\?.*)?$/i.test(content.trim()) ? (
                  <video controls className="w-full rounded-md border">
                    <source src={content.trim()} />
                    Your browser does not support the video tag.
                  </video>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <a
                      href={content.trim()}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline underline-offset-2"
                    >
                      Open video
                    </a>
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No video link provided.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">
                  {parsedTestpad?.name || "Testpad"}
                </CardTitle>
                <div className="flex items-center">
                  <div className="border rounded-md p-3 bg-muted/5 text-sm max-w-md">
                    <p className="text-sm text-muted-foreground mb-2">
                      Run some or all of the test steps here and record results, or copy the steps into your own spreadsheet to adapt and track testing.
                    </p>
                    <div className="flex justify-end">
                      <TestpadCopyButton rows={testpadRows} />
                    </div>
                  </div>
                </div>
              </div>
            {parsedTestpad?.description && (
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {renderLinkedMultilineText(parsedTestpad.description)}
              </p>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            {parsedTestpad && parsedTestpad.steps.length > 0 ? (
              <TestpadResultTable
                rows={testpadRows}
                resourceId={resource.id}
                initialResults={initialResults}
              />
            ) : (
              <p className="text-sm text-muted-foreground">No testpad steps found.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
