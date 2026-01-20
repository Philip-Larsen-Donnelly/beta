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
import { updateUser, deleteUser, deleteUsers, adminChangeUserPassword } from "@/lib/actions"
import { formatDateTime } from "@/lib/utils"

interface AdminUserListProps {
  users: Profile[]
}

type SortField = "username" | "email" | "organisation" | "created_at" | "is_admin"
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
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordError, setPasswordError] = useState("")

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

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    setIsLoading(true)
    const result = await adminChangeUserPassword(userForPassword.id, newPassword)

    if (!result.success) {
      setPasswordError(result.error || "Failed to change password")
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setPasswordDialogOpen(false)
    setUserForPassword(null)
    setNewPassword("")
    setConfirmPassword("")
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
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
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
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{user.organisation || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDateTime(user.created_at)}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={user.is_admin} onCheckedChange={() => handleToggleAdmin(user)} />
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
                          setNewPassword("")
                          setConfirmPassword("")
                          setPasswordError("")
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium">
                {userForPassword?.username || userForPassword?.display_name || userForPassword?.email}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
