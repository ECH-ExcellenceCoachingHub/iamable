'use client';

import React, { useCallback, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Avatar } from '@/components/layout/app-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { StatCard } from '@/components/ui/stat-card';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import { useApi, useDebouncedValue } from '@/lib/hooks';
import { api, AdminBulkAction, AdminUserFilters } from '@/lib/api';
import { cn, formatDate, formatNumber, formatRelativeTime, getErrorMessage } from '@/lib/utils';
import { AdminUser, AdminUserStats, isActive } from './types';
import { UserFormModal } from './user-form-modal';
import { ResetPasswordModal, SuspendUserModal, UserDetailsModal } from './user-dialogs';

const PAGE_SIZES = [10, 25, 50];

type SortField = NonNullable<AdminUserFilters['sortBy']>;

const BULK_LABELS: Record<AdminBulkAction, string> = {
  activate: 'activated',
  suspend: 'suspended',
  delete: 'deleted',
  'make-admin': 'made admins',
  'make-user': 'made standard users',
  verify: 'marked as verified',
};

const filterSelect =
  'h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15';

function toCsv(rows: AdminUser[]) {
  const escape = (value: unknown) => {
    const text = value === undefined || value === null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const header = ['Name', 'Email', 'Role', 'Status', 'Email verified', 'Last sign-in', 'Joined'];
  const lines = rows.map((u) =>
    [u.name, u.email, u.role, isActive(u) ? 'active' : 'suspended', u.isEmailVerified ? 'yes' : 'no', u.lastLoginAt ?? '', u.createdAt]
      .map(escape)
      .join(',')
  );
  return [header.join(','), ...lines].join('\n');
}

interface SortHeaderProps {
  field: SortField;
  filters: AdminUserFilters;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

const SortHeader = ({ field, filters, onSort, children, className }: SortHeaderProps) => {
  const active = filters.sortBy === field;
  return (
    <Th className={className} aria-sort={active ? (filters.sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground">
        {children}
        {active && (filters.sortOrder === 'asc' ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />)}
      </button>
    </Th>
  );
};

export default function AdminUsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);

  // Query state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [filters, setFilters] = useState<AdminUserFilters>({ sortBy: 'createdAt', sortOrder: 'desc' });

  // Go back to the first page whenever the search changes
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const updateFilters = (next: Partial<AdminUserFilters>) => {
    setFilters((f) => ({ ...f, ...next }));
    setPage(1);
    setSelected(new Set());
  };

  // Dialog state
  const [formUser, setFormUser] = useState<AdminUser | null | undefined>(undefined); // undefined = closed, null = new
  const [formKey, setFormKey] = useState(0);
  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [passwordUser, setPasswordUser] = useState<AdminUser | null>(null);
  const [suspendUser, setSuspendUser] = useState<AdminUser | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<AdminBulkAction | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const openForm = (user: AdminUser | null) => {
    setDetailsId(null);
    setFormKey((k) => k + 1);
    setFormUser(user);
  };
  const openPasswordReset = (user: AdminUser) => {
    setDetailsId(null);
    setFormKey((k) => k + 1);
    setPasswordUser(user);
  };
  const openSuspend = (user: AdminUser) => {
    setFormKey((k) => k + 1);
    setSuspendUser(user);
  };

  // Data
  const fetchUsers = useCallback(async () => {
    const res = await api.admin.getAllUsers(page, pageSize, debouncedSearch.trim() || undefined, filters);
    return { users: (res?.users ?? []) as AdminUser[], total: (res?.total ?? 0) as number };
  }, [page, pageSize, debouncedSearch, filters]);
  const { data, loading, error, reload, mutate } = useApi(fetchUsers, 'Could not load users.');
  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchStats = useCallback(() => api.admin.getUserStats() as Promise<AdminUserStats>, []);
  const { data: stats, loading: statsLoading, reload: reloadStats } = useApi(fetchStats, 'Could not load user stats.');

  const refresh = () => {
    reload();
    reloadStats();
  };

  const replaceUser = (updated: AdminUser) => {
    mutate((prev) => prev && { ...prev, users: prev.users.map((u) => (u._id === updated._id ? { ...u, ...updated } : u)) });
    reloadStats();
  };

  const hasFilters = !!(filters.role || filters.status || filters.verified || debouncedSearch);

  // Selection (your own account can't be bulk-edited)
  const selectableIds = users.filter((u) => u._id !== currentUserId).map((u) => u._id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));
  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Actions
  const changeRole = async (user: AdminUser, role: AdminUser['role']) => {
    setUpdatingId(user._id);
    try {
      replaceUser(await api.admin.updateUserRole(user._id, role));
      toast.success('Role updated', `${user.name} is now ${role === 'admin' ? 'an admin' : 'a user'}.`);
    } catch (err) {
      toast.error('Could not update role', getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const activate = async (user: AdminUser) => {
    setUpdatingId(user._id);
    try {
      replaceUser(await api.admin.updateUserStatus(user._id, true));
      toast.success('User reactivated', `${user.name} can sign in again.`);
    } catch (err) {
      toast.error('Could not reactivate user', getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.admin.deleteUser(toDelete._id);
      toast.success('User deleted', `${toDelete.name} and their data have been removed.`);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(toDelete._id);
        return next;
      });
      setToDelete(null);
      if (users.length === 1 && page > 1) setPage(page - 1);
      else reload();
      reloadStats();
    } catch (err) {
      toast.error('Could not delete user', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const runBulk = async (action: AdminBulkAction) => {
    setBulkBusy(true);
    try {
      const res = await api.admin.bulkUserAction([...selected], action);
      toast.success('Bulk action complete', `${res.affected} ${res.affected === 1 ? 'user' : 'users'} ${BULK_LABELS[action]}.`);
      setSelected(new Set());
      setBulkConfirm(null);
      if (action === 'delete' && users.length <= selected.size && page > 1) setPage(page - 1);
      else reload();
      reloadStats();
    } catch (err) {
      toast.error('Bulk action failed', getErrorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = (await api.admin.exportUsers(debouncedSearch.trim() || undefined, filters)) as AdminUser[];
      const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export ready', `${rows.length} ${rows.length === 1 ? 'user' : 'users'} exported.`);
    } catch (err) {
      toast.error('Could not export users', getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const toggleSort = (field: SortField) => {
    updateFilters(
      filters.sortBy === field
        ? { sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' }
        : { sortBy: field, sortOrder: field === 'name' || field === 'email' ? 'asc' : 'desc' }
    );
  };

  return (
    <>
      <PageHeader
        title="Users"
        description={loading && !data ? 'Loading…' : `${total} ${hasFilters ? 'matching' : 'registered'} ${total === 1 ? 'user' : 'users'}`}
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} isLoading={exporting}>
              <Download />
              Export CSV
            </Button>
            <Button onClick={() => openForm(null)}>
              <UserPlus />
              Add user
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(stats?.total ?? 0)} icon={<Users />} loading={statsLoading && !stats} hint={stats && `${stats.newLast30Days} new in 30 days`} />
        <StatCard label="Active (30 days)" value={formatNumber(stats?.activeLast30Days ?? 0)} icon={<CheckCircle2 />} tone="emerald" loading={statsLoading && !stats} hint="Signed in recently" />
        <StatCard label="Admins" value={formatNumber(stats?.admins ?? 0)} icon={<ShieldCheck />} tone="violet" loading={statsLoading && !stats} />
        <StatCard label="Suspended" value={formatNumber(stats?.suspended ?? 0)} icon={<UserX />} tone="rose" loading={statsLoading && !stats} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center">
          <Input
            aria-label="Search users"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            wrapperClassName="lg:max-w-xs"
          />
          <div className="flex flex-wrap gap-2">
            <select aria-label="Filter by role" className={filterSelect} value={filters.role ?? ''} onChange={(e) => updateFilters({ role: (e.target.value || undefined) as AdminUserFilters['role'] })}>
              <option value="">All roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select aria-label="Filter by status" className={filterSelect} value={filters.status ?? ''} onChange={(e) => updateFilters({ status: (e.target.value || undefined) as AdminUserFilters['status'] })}>
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select aria-label="Filter by email verification" className={filterSelect} value={filters.verified ?? ''} onChange={(e) => updateFilters({ verified: (e.target.value || undefined) as AdminUserFilters['verified'] })}>
              <option value="">Any verification</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
            {hasFilters && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  updateFilters({ role: undefined, status: undefined, verified: undefined });
                }}
              >
                <X />
                Clear
              </Button>
            )}
          </div>
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-border bg-brand-50/60 px-4 py-2.5 dark:bg-brand-500/10 sm:px-6">
            <span className="mr-2 text-sm font-medium text-foreground">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => runBulk('activate')} disabled={bulkBusy}>
              <CheckCircle2 />
              Activate
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm('suspend')} disabled={bulkBusy}>
              <Ban />
              Suspend
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk('verify')} disabled={bulkBusy}>
              <CheckCircle2 />
              Mark verified
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkConfirm('make-admin')} disabled={bulkBusy}>
              <ShieldCheck />
              Make admin
            </Button>
            <Button size="sm" variant="outline" onClick={() => runBulk('make-user')} disabled={bulkBusy}>
              <Users />
              Make user
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkConfirm('delete')} disabled={bulkBusy}>
              <Trash2 />
              Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="ml-auto">
              Clear selection
            </Button>
          </div>
        )}

        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={refresh} />
          </div>
        ) : !loading && users.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={hasFilters ? 'No matching users' : 'No users yet'}
            description={hasFilters ? 'Try a different search or clear the filters.' : undefined}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-10">
                  <input
                    type="checkbox"
                    aria-label="Select all users on this page"
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={loading || selectableIds.length === 0}
                    className="size-4 accent-brand-600"
                  />
                </Th>
                <SortHeader filters={filters} onSort={toggleSort} field="name">User</SortHeader>
                <Th>Role</Th>
                <Th>Status</Th>
                <SortHeader filters={filters} onSort={toggleSort} field="lastLoginAt" className="hidden lg:table-cell">
                  Last sign-in
                </SortHeader>
                <SortHeader filters={filters} onSort={toggleSort} field="createdAt" className="hidden md:table-cell">
                  Joined
                </SortHeader>
                <Th className="text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {loading && !data
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>
                      <Td>
                        <Skeleton className="size-4" />
                      </Td>
                      <Td>
                        <div className="flex items-center gap-3">
                          <Skeleton className="size-8 rounded-full" />
                          <div className="space-y-1.5">
                            <Skeleton className="h-3.5 w-28" />
                            <Skeleton className="h-3 w-40" />
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <Skeleton className="h-8 w-24" />
                      </Td>
                      <Td>
                        <Skeleton className="h-5 w-16" />
                      </Td>
                      <Td className="hidden lg:table-cell">
                        <Skeleton className="h-3.5 w-20" />
                      </Td>
                      <Td className="hidden md:table-cell">
                        <Skeleton className="h-3.5 w-20" />
                      </Td>
                      <Td />
                    </Tr>
                  ))
                : users.map((user) => {
                    const isSelf = user._id === currentUserId;
                    const active = isActive(user);
                    const busy = updatingId === user._id;
                    return (
                      <Tr key={user._id} className={cn(loading && 'opacity-60', selected.has(user._id) && 'bg-brand-50/40 dark:bg-brand-500/5')}>
                        <Td>
                          <input
                            type="checkbox"
                            aria-label={`Select ${user.name}`}
                            checked={selected.has(user._id)}
                            onChange={() => toggleOne(user._id)}
                            disabled={isSelf}
                            title={isSelf ? "You can't bulk-edit your own account" : undefined}
                            className="size-4 accent-brand-600"
                          />
                        </Td>
                        <Td>
                          <button type="button" onClick={() => setDetailsId(user._id)} className="flex items-center gap-3 text-left" aria-label={`View details for ${user.name}`}>
                            <Avatar name={user.name} className={cn(!active && 'grayscale')} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-medium text-foreground hover:underline">
                                {user.name}
                                {isSelf && <Badge tone="brand">You</Badge>}
                              </p>
                              <p className="truncate text-xs text-subtle">{user.email}</p>
                            </div>
                          </button>
                        </Td>
                        <Td>
                          <select
                            aria-label={`Role for ${user.name}`}
                            value={user.role}
                            disabled={isSelf || busy}
                            onChange={(e) => changeRole(user, e.target.value as AdminUser['role'])}
                            className={cn(
                              'h-8 rounded-lg border border-border bg-surface pl-2.5 pr-7 text-xs font-medium capitalize text-foreground outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60',
                              user.role === 'admin' && 'text-violet-700 dark:text-violet-300'
                            )}
                            title={isSelf ? "You can't change your own role" : undefined}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </Td>
                        <Td>
                          <div className="flex flex-wrap gap-1.5">
                            {active ? (
                              <Badge tone="success" dot>
                                Active
                              </Badge>
                            ) : (
                              <Badge tone="danger" dot title={user.suspendedReason}>
                                Suspended
                              </Badge>
                            )}
                            {!user.isEmailVerified && <Badge tone="warning">Unverified</Badge>}
                          </div>
                        </Td>
                        <Td className="hidden whitespace-nowrap lg:table-cell">{user.lastLoginAt ? formatRelativeTime(user.lastLoginAt) : 'Never'}</Td>
                        <Td className="hidden whitespace-nowrap md:table-cell">{formatDate(user.createdAt)}</Td>
                        <Td className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <Button variant="ghost" size="icon-sm" onClick={() => openForm(user)} aria-label={`Edit ${user.name}`} title="Edit user">
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon-sm" onClick={() => openPasswordReset(user)} aria-label={`Reset password for ${user.name}`} title="Reset password">
                              <KeyRound />
                            </Button>
                            {active ? (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => openSuspend(user)}
                                disabled={isSelf || busy}
                                aria-label={`Suspend ${user.name}`}
                                title={isSelf ? "You can't suspend your own account" : 'Suspend user'}
                                className="hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-500/10 dark:hover:text-amber-400"
                              >
                                <Ban />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => activate(user)}
                                disabled={busy}
                                aria-label={`Reactivate ${user.name}`}
                                title="Reactivate user"
                                className="hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-400"
                              >
                                <CheckCircle2 />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setToDelete(user)}
                              disabled={isSelf}
                              aria-label={`Delete ${user.name}`}
                              title={isSelf ? "You can't delete your own account" : 'Delete user'}
                              className="hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    );
                  })}
            </tbody>
          </Table>
        )}

        {!error && total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3 text-muted">
              <span>
                Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
              </span>
              <select
                aria-label="Users per page"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                  setSelected(new Set());
                }}
                className="h-8 rounded-lg border border-border bg-surface px-2 text-xs text-foreground"
              >
                {PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size} per page
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p - 1)} disabled={page <= 1 || loading}>
                <ChevronLeft />
                Previous
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages || loading}>
                Next
                <ChevronRight />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <UserFormModal
        key={`form-${formKey}`}
        isOpen={formUser !== undefined}
        onClose={() => setFormUser(undefined)}
        user={formUser}
        isSelf={!!formUser && formUser._id === currentUserId}
        onSaved={(saved) => {
          if (formUser) replaceUser(saved);
          else refresh();
        }}
      />

      <UserDetailsModal userId={detailsId} onClose={() => setDetailsId(null)} onEdit={openForm} onResetPassword={openPasswordReset} />

      <ResetPasswordModal key={`password-${formKey}`} user={passwordUser} onClose={() => setPasswordUser(null)} />

      <SuspendUserModal key={`suspend-${formKey}`} user={suspendUser} onClose={() => setSuspendUser(null)} onSuspended={replaceUser} />

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        destructive
        title="Delete user?"
        description={`This permanently deletes ${toDelete?.name ?? 'this user'} (${toDelete?.email ?? ''}) along with their translations, saved items and notifications. This can't be undone. To keep their data, suspend the account instead.`}
        confirmLabel="Delete user"
      />

      <ConfirmDialog
        isOpen={!!bulkConfirm}
        onClose={() => setBulkConfirm(null)}
        onConfirm={() => bulkConfirm && runBulk(bulkConfirm)}
        isLoading={bulkBusy}
        destructive={bulkConfirm !== 'make-admin'}
        title={
          bulkConfirm === 'delete' ? `Delete ${selected.size} users?` : bulkConfirm === 'suspend' ? `Suspend ${selected.size} users?` : `Make ${selected.size} users admins?`
        }
        description={
          bulkConfirm === 'delete'
            ? "This permanently deletes the selected accounts and their data. This can't be undone."
            : bulkConfirm === 'suspend'
              ? 'The selected users will be signed out and blocked from signing in until reactivated.'
              : 'The selected users will get full access to the admin dashboard, including managing other users.'
        }
        confirmLabel={bulkConfirm === 'delete' ? 'Delete users' : bulkConfirm === 'suspend' ? 'Suspend users' : 'Make admins'}
      />
    </>
  );
}
