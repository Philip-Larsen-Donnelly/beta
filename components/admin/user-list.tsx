"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Trash2, Shield, Search, ArrowUpDown, ArrowUp, ArrowDown, KeyRound } from "lucide-react"
import type { Profile } from "@/lib/types"
import { updateUser, deleteUser, deleteUsers, createUsers, createInviteForProfile } from "@/lib/actions"
import { formatDateTime } from "@/lib/utils"

interface AdminUserListProps {
  users: Profile[]
}

type SortField = "username" | "email" | "organisation" | "created_at" | "is_admin" | "is_hisp"
type SortDirection = "asc" | "desc"
type FilterType = "all" | "admin" | "user"

export function AdminUserList({ users: initialUsers }: AdminUserListProps) {
  const router = useRouter()
  const [users, setUsers] = useState(initialUsers)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [sortField, setSortField] = useState<SortField>("created_at")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")
  const [filterType, setFilterType] = useState<FilterType>("all")

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [userForPassword, setUserForPassword] = useState<Profile | null>(null)
  const [passwordError, setPasswordError] = useState("")
  const [passwordResetLink, setPasswordResetLink] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [bulkMode, setBulkMode] = useState(false)
  const [newUserUsername, setNewUserUsername] = useState("")
  const [newUserEmail, setNewUserEmail] = useState("")
  const [newUserOrganisation, setNewUserOrganisation] = useState("")
  const [bulkText, setBulkText] = useState("")
  const [createError, setCreateError] = useState("")
  const [createLoading, setCreateLoading] = useState(false)
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false)
  const [newUserIsHisp, setNewUserIsHisp] = useState(false)
  const [newUserCreateInvite, setNewUserCreateInvite] = useState(true)
  const [createdResults, setCreatedResults] = useState<
    { username: string; email: string; password: string; success: boolean; error?: string; user?: Profile }[]
  >([])
  const [resultDialogOpen, setResultDialogOpen] = useState(false)
  const [showBulkHelp, setShowBulkHelp] = useState(false)

  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users]

    // Filter by type
    if (filterType === "admin") {
      result = result.filter((u) => u.is_admin)
    } else if (filterType === "user") {
      result = result.filter((u) => !u.is_admin)
    }

    // Search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (u) =>
          (u.username?.toLowerCase() || "").includes(query) ||
          (u.display_name?.toLowerCase() || "").includes(query) ||
          (u.email?.toLowerCase() || "").includes(query) ||
          (u.organisation?.toLowerCase() || "").includes(query),
      )
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | boolean | null = null
      let bVal: string | boolean | null = null

      switch (sortField) {
        case "username":
          aVal = a.username || a.display_name || ""
          bVal = b.username || b.display_name || ""
          break
        case "email":
          aVal = a.email || ""
          bVal = b.email || ""
          break
        case "organisation":
          aVal = a.organisation || ""
          bVal = b.organisation || ""
          break
        case "created_at":
          aVal = a.created_at || ""
          bVal = b.created_at || ""
          break
        case "is_admin":
          aVal = a.is_admin
          bVal = b.is_admin
          break
        case "is_hisp":
          aVal = a.is_hisp
          bVal = b.is_hisp
          break
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortDirection === "asc" ? (aVal ? 1 : -1) - (bVal ? 1 : -1) : (bVal ? 1 : -1) - (aVal ? 1 : -1)
      }

      const comparison = String(aVal || "").localeCompare(String(bVal || ""))
      return sortDirection === "asc" ? comparison : -comparison
    })

    return result
  }, [users, searchQuery, sortField, sortDirection, filterType])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
    return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3" /> : <ArrowDown className="ml-1 h-3 w-3" />
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedUsers.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredAndSortedUsers.map((u) => u.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]))
  }

  const handleToggleAdmin = async (user: Profile) => {
    const newIsAdmin = !user.is_admin

    // Optimistic update
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_admin: newIsAdmin } : u)))

    const result = await updateUser(user.id, { is_admin: newIsAdmin })

    if (!result.success) {
      // Revert on error
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_admin: !newIsAdmin } : u)))
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return

    setIsLoading(true)
    const result = await deleteUser(userToDelete.id)

    if (result.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id))
      setSelectedIds((prev) => prev.filter((id) => id !== userToDelete.id))
    }

    setIsLoading(false)
    setUserToDelete(null)
    setDeleteDialogOpen(false)
    router.refresh()
  }

  const handleBulkDelete = async () => {
    setIsLoading(true)
    const result = await deleteUsers(selectedIds)

    if (result.success) {
      setUsers((prev) => prev.filter((u) => !selectedIds.includes(u.id)))
      setSelectedIds([])
    }

    setIsLoading(false)
    setBulkDeleteDialogOpen(false)
    router.refresh()
  }

  const handleChangePassword = async () => {
    if (!userForPassword) return

    setPasswordError("")
    setPasswordResetLink("")

    setIsLoading(true)
    const result = await createInviteForProfile(userForPassword.id)

    if (!result.success) {
      setPasswordError(result.error || "Failed to create reset link")
      setIsLoading(false)
      return
    }

    const token = result.invite?.token
    if (!token) {
      setPasswordError("Failed to create reset link")
      setIsLoading(false)
      return
    }

    const origin = typeof window !== "undefined" ? window.location.origin : ""
    setPasswordResetLink(origin ? `${origin}/auth/invite/${token}` : token)

    setIsLoading(false)
  }

  const handleToggleHisp = async (user: Profile) => {
    const newIsHisp = !user.is_hisp
    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_hisp: newIsHisp } : u)))
    const result = await updateUser(user.id, { is_hisp: newIsHisp })
    if (!result.success) {
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_hisp: !newIsHisp } : u)))
    }
  }

  const adminCount = users.filter((u) => u.is_admin).length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="admin">Admins Only</SelectItem>
              <SelectItem value="user">Non-Admins</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setAddDialogOpen(true)}>Add User</Button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredAndSortedUsers.length && filteredAndSortedUsers.length > 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("username")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Username
                  <SortIcon field="username" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("email")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Email
                  <SortIcon field="email" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("organisation")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Organisation
                  <SortIcon field="organisation" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort("created_at")}
                  className="flex items-center font-medium hover:text-foreground"
                >
                  Registered
                  <SortIcon field="created_at" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  onClick={() => toggleSort("is_admin")}
                  className="flex items-center justify-center font-medium hover:text-foreground w-full"
                >
                  Admin
                  <SortIcon field="is_admin" />
                </button>
              </TableHead>
              <TableHead className="text-center">
                <button
                  onClick={() => toggleSort("is_hisp")}
                  className="flex items-center justify-center font-medium hover:text-foreground w-full"
                >
                  HISP
                  <SortIcon field="is_hisp" />
                </button>
              </TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedUsers.map((user) => (
                <TableRow key={user.id} className={selectedIds.includes(user.id) ? "bg-primary/5" : undefined}>
                  <TableCell>
                    <Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggleSelect(user.id)} />
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {user.username || user.display_name || "—"}
                      {user.is_admin && (
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="mr-1 h-3 w-3" />
                          Admin
                        </Badge>
                      )}
                      {user.is_hisp && (
                        <Badge variant="secondary" className="text-xs">
                          HISP
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.organisation || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(user.created_at)}</TableCell>
                      <TableCell className="text-center">
                        <Switch checked={user.is_admin} onCheckedChange={() => handleToggleAdmin(user)} />
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch checked={user.is_hisp} onCheckedChange={() => handleToggleHisp(user)} />
                      </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Change password"
                        onClick={() => {
                          setUserForPassword(user)
                          setPasswordError("")
                          setPasswordResetLink("")
                          setPasswordDialogOpen(true)
                        }}
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => {
                          setUserToDelete(user)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredAndSortedUsers.length} of {users.length} users
        </span>
        <span>
          {adminCount} admin{adminCount !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Delete single user dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">
                {userToDelete?.username || userToDelete?.display_name || userToDelete?.email}
              </span>
              ? This action cannot be undone and will remove all their data including bug reports and component
              statuses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.length} Users</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedIds.length} user{selectedIds.length !== 1 ? "s" : ""}? This
              action cannot be undone and will remove all their data including bug reports and component statuses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isLoading}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Create Reset Link</DialogTitle>
            <DialogDescription>
              Generate a one-time reset link for{" "}
              <span className="font-medium">
                {userForPassword?.username || userForPassword?.display_name || userForPassword?.email}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {passwordResetLink && (
              <div className="space-y-2">
                <Label htmlFor="passwordResetLink">Reset Link</Label>
                <div className="flex items-center gap-2">
                  <Input id="passwordResetLink" value={passwordResetLink} readOnly />
                  <Button
                    onClick={() => {
                      try {
                        navigator.clipboard.writeText(passwordResetLink)
                      } catch (e) {
                        // ignore
                      }
                    }}
                    disabled={!passwordResetLink}
                  >
                    Copy Link
                  </Button>
                </div>
              </div>
            )}
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setUserForPassword(null)
                setPasswordResetLink("")
                setPasswordError("")
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isLoading}>
              {isLoading ? "Generating..." : "Generate Reset Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Users</DialogTitle>
            <DialogDescription>
              Create a single user or paste multiple users (one per line) as CSV: username,email[,organisation]
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-4">
              <Label>Mode</Label>
              <Select value={bulkMode ? "bulk" : "single"} onValueChange={(v) => setBulkMode(v === "bulk")}> 
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="bulk">Bulk (CSV lines)</SelectItem>
                </SelectContent>
              </Select>
            </div>

                  {!bulkMode ? (
              <div className="grid gap-2">
                <Label htmlFor="addUsername">Username</Label>
                <Input id="addUsername" value={newUserUsername} onChange={(e) => setNewUserUsername(e.target.value)} />

                    <Label htmlFor="addEmail">Email (optional)</Label>
                    <Input id="addEmail" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} />

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch checked={newUserIsAdmin} onCheckedChange={(v) => setNewUserIsAdmin(!!v)} />
                        <span className="text-sm">Admin</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={newUserIsHisp} onCheckedChange={(v) => setNewUserIsHisp(!!v)} />
                        <span className="text-sm">HISP</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch checked={newUserCreateInvite} onCheckedChange={(v) => setNewUserCreateInvite(!!v)} />
                        <span className="text-sm">Create invite link (copyable)</span>
                      </div>
                    </div>

                    <Label htmlFor="addOrganisation">Organisation (optional)</Label>
                    <Input id="addOrganisation" value={newUserOrganisation} onChange={(e) => setNewUserOrganisation(e.target.value)} />
              </div>
            ) : (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="bulkText">Bulk users</Label>
                    <Button variant="ghost" size="sm" onClick={() => setShowBulkHelp((s) => !s)}>
                      {showBulkHelp ? "Hide help" : "Format help"}
                    </Button>
                  </div>
                  <textarea
                    id="bulkText"
                    className="w-full rounded-md border p-2"
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`one per line: username,email(optional),organisation(optional),is_admin(optional),is_hisp(optional)`}
                  />
                  {showBulkHelp && (
                    <div className="text-sm text-muted-foreground">
                      Format: <code>username,email(optional),organisation(optional),is_admin(optional),is_hisp(optional)</code> -
                      example: <code>alice,alice@example.com,OrgName,true,false</code>
                    </div>
                  )}
                </div>
            )}

            {createError && <p className="text-sm text-destructive">{createError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)} disabled={createLoading}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setCreateError("")
                setCreateLoading(true)

                try {
                  let payload: any[] = []
                  if (!bulkMode) {
                      if (!newUserUsername) {
                        setCreateError("Username is required")
                        setCreateLoading(false)
                        return
                      }
                      payload = [
                        {
                          username: newUserUsername,
                          email: newUserEmail || null,
                          // no password provided; server will generate one
                          organisation: newUserOrganisation || null,
                          is_admin: newUserIsAdmin,
                          is_hisp: newUserIsHisp,
                        },
                      ]
                  } else {
                    const lines = bulkText.split("\n").map((l) => l.trim()).filter(Boolean)
                    for (const line of lines) {
                      const parts = line.split(",").map((p) => p.trim())
                      if (parts.length < 1) continue
                      // CSV: username,email(optional),organisation(optional),is_admin(optional),is_hisp(optional)
                      const isAdmin = parts[3] ? /^(1|true|yes)$/i.test(parts[3]) : false
                      const isHisp = parts[4] ? /^(1|true|yes)$/i.test(parts[4]) : false
                      payload.push({ username: parts[0], email: parts[1] || null, organisation: parts[2] || null, is_admin: isAdmin, is_hisp: isHisp })
                    }
                    if (payload.length === 0) {
                      setCreateError("No valid lines found in bulk input")
                      setCreateLoading(false)
                      return
                    }
                  }

                  const result = await createUsers(payload)

                  if (!result || !result.success) {
                    setCreateError("Failed to create users")
                    setCreateLoading(false)
                    return
                  }

                  // Map results back to payload so we can show passwords and invite links for successful creations
                  const results = result.results || []
                  const mapped = await Promise.all(results.map(async (r: any, idx: number) => {
                    const base = {
                      username: payload[idx]?.username,
                      email: payload[idx]?.email,
                      password: payload[idx]?.password,
                      success: !!r.success,
                      error: r.error,
                      user: r.user,
                    }
                    if (base.success && newUserCreateInvite && r.user && r.user.id) {
                      try {
                        const inviteRes = await createInviteForProfile(r.user.id)
                        if (inviteRes?.success && inviteRes.invite?.token) {
                          // build a copyable link using current origin
                          const origin = typeof window !== 'undefined' ? window.location.origin : ''
                          base['invite_link'] = origin ? `${origin}/auth/invite/${inviteRes.invite.token}` : inviteRes.invite.token
                        }
                      } catch (e) {
                        // ignore invite creation errors, leave invite_link undefined
                      }
                    }
                    return base
                  }))

                  const created = mapped.filter((m) => m.success).map((m) => m.user)
                  if (created.length > 0) setUsers((prev) => [...created, ...prev])

                  const errors = mapped.filter((m) => !m.success)
                  if (errors.length > 0) setCreateError(errors.map((e) => e.error).join(", "))

                  setCreatedResults(mapped)
                  setResultDialogOpen(true)

                  setCreateLoading(false)
                  setAddDialogOpen(false)
                  setNewUserUsername("")
                  setNewUserEmail("")
                  setNewUserIsAdmin(false)
                  setNewUserIsHisp(false)
                  setNewUserOrganisation("")
                  setBulkText("")
                  router.refresh()
                } catch (e: any) {
                  setCreateError(e?.message || String(e))
                  setCreateLoading(false)
                }
              }}
              disabled={createLoading}
            >
              {createLoading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resultDialogOpen} onOpenChange={setResultDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Created Users</DialogTitle>
            <DialogDescription>
              Review created accounts and copy passwords to send to users. Passwords are shown only once here.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {createdResults.map((r, i) => (
              <div key={`${r.username}-${i}`} className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium">{r.username} {r.success ? <span className="text-sm text-green-600">(created)</span> : <span className="text-sm text-destructive">(failed)</span>}</div>
                  <div className="text-sm text-muted-foreground">{r.email}</div>
                  {r.error && <div className="text-sm text-destructive">{r.error}</div>}
                </div>
                <div className="flex items-center gap-2">
                  {r.password && (
                    <>
                      <Input value={r.password || ""} readOnly className="w-[260px]" />
                      <Button
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(r.password || "")
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        Copy
                      </Button>
                    </>
                  )}
                  {r.invite_link && (
                    <>
                      <Input value={r.invite_link} readOnly className="w-[420px]" />
                      <Button
                        onClick={() => {
                          try {
                            navigator.clipboard.writeText(r.invite_link || "")
                          } catch (e) {
                            // ignore
                          }
                        }}
                      >
                        Copy Link
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={() => setResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
