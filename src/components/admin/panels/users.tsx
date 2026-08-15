"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/fetch";
import { useUI } from "@/lib/store";
import { PanelHeader, EmptyState } from "@/components/app/panel-utils";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Users as UsersIcon,
  Search,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  UserCog,
  UserX,
  Crown,
} from "lucide-react";
import {
  useAdminUsers,
  useDebounced,
  type AdminUser,
  ForbiddenState,
  ErrorState,
  isForbidden,
  timeAgo,
  fmtDate,
  initialsOf,
} from "../lib";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 8;

export function AdminUsers() {
  const { pushToast } = useUI();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [tier, setTier] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const dq = useDebounced(q, 350);

  const usersQ = useAdminUsers({
    page,
    pageSize: PAGE_SIZE,
    q: dq || undefined,
    tier: tier || undefined,
    role: role || undefined,
  });

  const invalidateUserLists = () => {
    qc.invalidateQueries({ queryKey: ["/api/admin/users"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    qc.invalidateQueries({ queryKey: ["/api/admin/revenue"] });
  };

  const patchMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) =>
      api<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: "PATCH", json: data }),
    onSuccess: (_res, vars) => {
      invalidateUserLists();
      pushToast({
        title: "User updated",
        description: `${vars.data.role || vars.data.planTier ? "Account changes saved." : "Verification toggled."}`,
        variant: "success",
      });
      setEditUser(null);
    },
    onError: (e: Error) =>
      pushToast({ title: "Update failed", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => api(`/api/admin/users/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidateUserLists();
      pushToast({ title: "User deleted", description: "The account and its data have been removed.", variant: "success" });
      setDeleteUser(null);
    },
    onError: (e: Error) =>
      pushToast({ title: "Delete failed", description: e.message, variant: "destructive" }),
  });

  if (usersQ.error && isForbidden(usersQ.error)) {
    return (
      <div>
        <PanelHeader title="Users" description="Manage accounts and access" icon={UsersIcon} />
        <ForbiddenState />
      </div>
    );
  }

  return (
    <div>
      <PanelHeader title="Users" description="Manage accounts and access" icon={UsersIcon} />

      <Card className="overflow-hidden p-0">
        {/* Filters */}
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              className="pl-9"
              aria-label="Search users"
            />
          </div>
          <Select
            value={tier || "all"}
            onValueChange={(v) => {
              setTier(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by plan">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="scholar">Scholar</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={role || "all"}
            onValueChange={(v) => {
              setRole(v === "all" ? "" : v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[140px]" aria-label="Filter by role">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table / states */}
        {usersQ.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="relative h-12 overflow-hidden rounded-lg bg-muted/40">
                <div className="skeleton-shimmer absolute inset-0" />
              </div>
            ))}
          </div>
        ) : usersQ.error ? (
          <div className="p-4">
            <ErrorState message={(usersQ.error as Error).message} onRetry={() => usersQ.refetch()} />
          </div>
        ) : !usersQ.data?.users.length ? (
          <div className="p-4">
            <EmptyState
              icon={UserX}
              title="No users match"
              description="Try adjusting your search query or plan and role filters."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersQ.data.users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-accent text-xs font-semibold">
                          {initialsOf(u.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{u.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.role === "admin" ? (
                      <Badge className="gap-1 border-brand/20 bg-brand/10 text-brand">
                        <Crown className="h-3 w-3" /> Admin
                      </Badge>
                    ) : (
                      <Badge variant="outline">User</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <PlanBadge tier={u.planTier} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.planStatus} />
                  </TableCell>
                  <TableCell>
                    {u.emailVerified ? (
                      <CheckCircle2 className="h-4 w-4 text-brand" aria-label="Verified" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" aria-label="Not verified" />
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{timeAgo(u.lastActiveAt)}</TableCell>
                  <TableCell className="pr-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Actions for ${u.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel>Manage {u.name.split(" ")[0]}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditUser(u)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit details
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <UserCog className="mr-2 h-4 w-4" /> Change role
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: u.id, data: { role: "user" } })}>
                              User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: u.id, data: { role: "admin" } })}>
                              Admin
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <ShieldCheck className="mr-2 h-4 w-4" /> Change plan
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: u.id, data: { planTier: "free" } })}>
                              Free
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: u.id, data: { planTier: "pro" } })}>
                              Pro ($9/mo)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => patchMut.mutate({ id: u.id, data: { planTier: "scholar" } })}>
                              Scholar ($19/mo)
                            </DropdownMenuItem>
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem
                          onClick={() => patchMut.mutate({ id: u.id, data: { emailVerified: !u.emailVerified } })}
                        >
                          {u.emailVerified ? (
                            <>
                              <XCircle className="mr-2 h-4 w-4" /> Revoke verification
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Mark verified
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteUser(u)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination */}
        {usersQ.data && !usersQ.error && (
          <div className="flex flex-col gap-2 border-t border-border p-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>
              {usersQ.data.total > 0
                ? `Showing ${(usersQ.data.page - 1) * usersQ.data.pageSize + 1}–${Math.min(
                    usersQ.data.page * usersQ.data.pageSize,
                    usersQ.data.total
                  )} of ${usersQ.data.total}`
                : "0 users"}
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={usersQ.data.page <= 1 || usersQ.isFetching}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </Button>
              <span className="min-w-[90px] text-center">
                Page {usersQ.data.page} of {Math.max(1, Math.ceil(usersQ.data.total / usersQ.data.pageSize))}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={usersQ.data.page * usersQ.data.pageSize >= usersQ.data.total || usersQ.isFetching}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <EditUserDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={(data) => {
          if (editUser) patchMut.mutate({ id: editUser.id, data });
        }}
        saving={patchMut.isPending}
      />

      <AlertDialog open={!!deleteUser} onOpenChange={(o) => !o && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteUser?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes their account along with subjects, tasks, notes, sessions and plans. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => deleteUser && deleteMut.mutate(deleteUser.id)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PlanBadge({ tier }: { tier: string }) {
  if (tier === "pro") {
    return (
      <Badge className="border-brand/20 bg-brand/10 text-brand capitalize">{tier}</Badge>
    );
  }
  if (tier === "scholar") {
    return (
      <Badge className="border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)] capitalize">
        {tier}
      </Badge>
    );
  }
  return <Badge variant="secondary" className="capitalize">{tier}</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "border-brand/20 bg-brand/10 text-brand"
      : status === "trialing"
        ? "border-[var(--gold)]/30 bg-[var(--gold)]/15 text-[var(--gold)]"
        : status === "past_due"
          ? "border-red-500/30 bg-red-500/10 text-red-500"
          : "border-border bg-muted text-muted-foreground";
  return <Badge variant="outline" className={cn("capitalize", cls)}>{status}</Badge>;
}

function EditUserDialog({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: AdminUser | null;
  onClose: () => void;
  onSave: (data: Partial<AdminUser>) => void;
  saving: boolean;
}) {
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {user && (
          <EditUserForm key={user.id} user={user} onClose={onClose} onSave={onSave} saving={saving} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EditUserForm({
  user,
  onClose,
  onSave,
  saving,
}: {
  user: AdminUser;
  onClose: () => void;
  onSave: (data: Partial<AdminUser>) => void;
  saving: boolean;
}) {
  const [role, setRole] = useState(user.role);
  const [planTier, setPlanTier] = useState(user.planTier);
  const [planStatus, setPlanStatus] = useState(user.planStatus);
  const [emailVerified, setEmailVerified] = useState(user.emailVerified);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit user</DialogTitle>
        <DialogDescription>
          {user.name} · {user.email}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="user-role">Role</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="user-plan">Plan tier</Label>
          <Select value={planTier} onValueChange={setPlanTier}>
            <SelectTrigger id="user-plan" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="pro">Pro · $9/mo</SelectItem>
              <SelectItem value="scholar">Scholar · $19/mo</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="user-status">Plan status</Label>
          <Select value={planStatus} onValueChange={setPlanStatus}>
            <SelectTrigger id="user-status" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="trialing">Trialing</SelectItem>
              <SelectItem value="past_due">Past due</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium">Email verified</p>
            <p className="text-xs text-muted-foreground">
              {emailVerified ? "Verified – can sign in normally." : "Unverified – limited access until confirmed."}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={emailVerified}
            onClick={() => setEmailVerified((v) => !v)}
            className={cn(
              "ring-focus relative h-6 w-11 shrink-0 rounded-full border border-transparent transition-colors",
              emailVerified ? "bg-brand" : "bg-muted"
            )}
          >
            <span
              className={cn(
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow transition-transform",
                emailVerified ? "translate-x-[22px]" : "translate-x-0.5"
              )}
            />
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={() => onSave({ role, planTier, planStatus, emailVerified })}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </>
  );
}
