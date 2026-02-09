"use client"

import type React from "react"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

type TestpadRow = {
  step: string
  indent: number
  text: string
  kind: "step" | "category" | "comment"
}

type ResultValue = "pass" | "fail" | "blocked" | null

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

function renderIndentedText(text: string, indent: number, keyPrefix: string) {
  const paddingLeft = indent > 0 ? indent * 16 : 0
  return (
    <span style={{ paddingLeft: `${paddingLeft}px` }} className="block">
      {linkifyText(text, keyPrefix)}
    </span>
  )
}

type TestpadResultTableProps = {
  rows: TestpadRow[]
  resourceId: string
  initialResults?: Record<number, ResultValue>
}

function buildTsv(rows: TestpadRow[]) {
  const header = ["Step", "Text", "Pass", "Fail", "Blocked"]
  const lines = rows.map((row) => {
    const indentPrefix = row.indent > 0 ? "  ".repeat(row.indent) : ""
    const text = `'${indentPrefix}${row.text}`
    return [row.step || "", text, "", "", ""]
  })
  return [header, ...lines].map((line) => line.join("\t")).join("\n")
}

export function TestpadCopyButton({ rows }: { rows: TestpadRow[] }) {
  const [copied, setCopied] = useState(false)
  const tsv = useMemo(() => buildTsv(rows), [rows])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (error) {
      console.error("Failed to copy testpad TSV", error)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? "Copied" : "Copy for custom spreadsheet"}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>
        Copy a tab-separated template for customizing and using in your own spreadsheet.
      </TooltipContent>
    </Tooltip>
  )
}

export function TestpadResultTable({
  rows,
  resourceId,
  initialResults = {},
}: TestpadResultTableProps) {
  const [results, setResults] = useState<Record<number, ResultValue>>(initialResults)

  const persistResult = async (index: number, value: ResultValue) => {
    try {
      await fetch("/api/testpad-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId,
          stepIndex: index,
          result: value,
        }),
      })
    } catch (error) {
      console.error("Failed to save testpad result", error)
    }
  }

  const toggleResult = (index: number, value: ResultValue) => {
    const current = results[index] ?? null
    const nextValue = current === value ? null : value
    setResults((prev) => ({ ...prev, [index]: nextValue }))
    persistResult(index, nextValue)
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Step</TableHead>
          <TableHead className="max-w-[420px]">Text</TableHead>
          <TableHead className="text-center" colSpan={3}>
            Result
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => {
          const isStep = row.kind === "step"
          const isCategory = row.kind === "category"
          const rowClass =
            row.kind === "comment" || row.kind === "category"
              ? "bg-muted/40"
              : undefined
          const selected = results[index] ?? null

          const buttonClass = (value: Exclude<ResultValue, null>, colorClass: string) =>
            cn(
              "flex h-full min-h-10 w-full items-center justify-center px-2 border border-transparent text-xs text-muted-foreground/60 transition-colors",
              selected === value && colorClass,
            )

          return (
            <TableRow key={`${row.step}-${index}`} className={rowClass}>
              <TableCell className="font-medium">{row.step || "-"}</TableCell>
              <TableCell
                className={cn(
                  "whitespace-pre-wrap max-w-[420px]",
                  isCategory && "font-semibold",
                  row.kind === "comment" && "text-muted-foreground/80",
                )}
              >
                {renderIndentedText(row.text, row.indent, `step-${index}`)}
              </TableCell>
              {isStep ? (
                <>
                  <TableCell className="p-0">
                    <button
                      type="button"
                      className={buttonClass(
                        "pass",
                        "bg-green-500/15 border-green-500/30 text-green-700",
                      )}
                      onClick={() =>
                        toggleResult(index, selected === "pass" ? null : "pass")
                      }
                    >
                      PASS
                    </button>
                  </TableCell>
                  <TableCell className="p-0">
                    <button
                      type="button"
                      className={buttonClass(
                        "fail",
                        "bg-red-500/15 border-red-500/30 text-red-700",
                      )}
                      onClick={() =>
                        toggleResult(index, selected === "fail" ? null : "fail")
                      }
                    >
                      FAIL
                    </button>
                  </TableCell>
                  <TableCell className="p-0">
                    <button
                      type="button"
                      className={buttonClass(
                        "blocked",
                        "bg-amber-500/15 border-amber-500/30 text-amber-700",
                      )}
                      onClick={() =>
                        toggleResult(
                          index,
                          selected === "blocked" ? null : "blocked",
                        )
                      }
                    >
                      BLOCKED
                    </button>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell />
                  <TableCell />
                  <TableCell />
                </>
              )}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
