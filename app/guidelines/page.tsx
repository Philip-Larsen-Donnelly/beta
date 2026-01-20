import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { BookOpen, Bug, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function GuidelinesPage() {
  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Welcome, Beta Tester</h1>
        <p className="text-muted-foreground">
          Thank you for helping us improve the DHIS2 platform. Please follow these guidelines to ensure effective testing.
        </p>
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowRight className="h-5 w-5 text-primary" />
            Quick Start
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
            <li>Review the testing guidelines below</li>
            <li>
              Go to the <strong>Testing</strong> page and select the campaign and components you want to test
            </li>
            <li>Update your progress status as you test each component</li>
            <li>Submit bug reports when you find issues</li>
          </ol>
          <Button asChild className="mt-2">
            <Link href="/testing">Start Testing</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Guidelines Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              Testing Guidelines
            </CardTitle>
            <CardDescription>How to test effectively</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1.5">
              <li>Test the components based on the use cases most important to you.
              </li>
              <li>Try edge cases and unexpected inputs</li>
              <li>Test on different devices and browsers if possible</li>
              <li>Document steps to reproduce any bugs found</li>
              <li>Check both happy paths and error scenarios</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="h-5 w-5 text-primary" />
              Bug Reporting
            </CardTitle>
            <CardDescription>How to submit useful bug reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ul className="list-inside list-disc space-y-1.5">
            <li>Only report bugs that are new in this release</li>
              <li>Use clear, descriptive titles</li>
              <li>Include steps to reproduce the issue</li>
              <li>Describe expected vs actual behavior</li>
            <li>Set appropriate severity (see Severity Guide below)</li>
            </ul>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
