"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface CompletionConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  componentName: string
  onConfirm: () => void
}

export function CompletionConfirmationDialog({
  open,
  onOpenChange,
  componentName,
  onConfirm,
}: CompletionConfirmationDialogProps) {
  const [testedAnswer, setTestedAnswer] = useState<boolean | null>(null)
  const [testedNotes, setTestedNotes] = useState("")
  const [bugsAnswer, setBugsAnswer] = useState<boolean | null>(null)
  const [bugsNotes, setBugsNotes] = useState("")

  const reset = () => {
    setTestedAnswer(null)
    setTestedNotes("")
    setBugsAnswer(null)
    setBugsNotes("")
  }

  const handleConfirm = () => {
    if (testedAnswer === null || bugsAnswer === null) return
    onConfirm()
    reset()
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Confirm Completion</DialogTitle>
          <DialogDescription>
            Before you finish, tell us briefly what you tested for <strong>{componentName}</strong>. Answers are required to proceed.
          </DialogDescription>
        </DialogHeader>

          <div className="mt-4 space-y-6">
            <div>
              <div className="font-medium">I tested the parts of {componentName} that are important to my users.</div>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tested" checked={testedAnswer === true} onChange={() => setTestedAnswer(true)} /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="tested" checked={testedAnswer === false} onChange={() => setTestedAnswer(false)} /> No
                </label>
              </div>
              {testedAnswer === false && (
                <div className="mt-2">
                  <label className="text-sm text-muted-foreground">Briefly describe areas you didn&apos;t test (optional)</label>
                  <textarea
                    value={testedNotes}
                    onChange={(e) => setTestedNotes(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>
              )}
            </div>

            <div>
              <div className="font-medium">I&apos;ve reported all bugs I found while testing {componentName}.</div>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bugs" checked={bugsAnswer === true} onChange={() => setBugsAnswer(true)} /> Yes
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="bugs" checked={bugsAnswer === false} onChange={() => setBugsAnswer(false)} /> No
                </label>
              </div>
              {bugsAnswer === false && (
                <div className="mt-2">
                  <label className="text-sm text-muted-foreground">Briefly list or describe unreported bugs (optional)</label>
                  <textarea
                    value={bugsNotes}
                    onChange={(e) => setBugsNotes(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md text-sm"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
            <Button
              disabled={testedAnswer === null || bugsAnswer === null}
              onClick={handleConfirm}
            >
              Mark as Completed
            </Button>
          </div>
      </DialogContent>
    </Dialog>
  )
}
