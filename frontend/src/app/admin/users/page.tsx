'use client';

import React, { useCallback, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2, Users } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Avatar } from '@/components/layout/app-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { useAuthStore } from '@/store/auth-store';
import { toast } from '@/store/toast-store';
import { useApi, useDebouncedValue } from '@/lib/hooks';
import { api } from '@/lib/api';
import { cn, formatDate, getErrorMessage } from '@/lib/utils';

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Go back to the first page whenever the search changes
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    setPage(1);
  }

  const fetchUsers = useCallback(async () => {
    const res = await api.admin.getAllUsers(page, PAGE_SIZE, debouncedSearch.trim() || undefined);
    return { users: (res?.users ?? []) as AdminUser[], total: (res?.total ?? 0) as number };
  }, [page, debouncedSearch]);
  const { data, loading, error, reload: load, mutate } = useApi(fetchUsers, 'Could not load users.');
  const users = data?.users ?? [];
  const total = data?.total ?? 0;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeRole = async (user: AdminUser, role: AdminUser['role']) => {
    setUpdatingId(user._id);
    try {
      await api.admin.updateUserRole(user._id, role);
      mutate((prev) => prev && { ...prev, users: prev.users.map((u) => (u._id === user._id ? { ...u, role } : u)) });
      toast.success('Role updated', `${user.name} is now ${role === 'admin' ? 'an admin' : 'a user'}.`);
    } catch (err) {
      toast.error('Could not update role', getErrorMessage(err));
    } finally {
      setUpdatingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await api.admin.deleteUser(toDelete._id);
      toast.success('User deleted', `${toDelete.name} has been removed.`);
      setToDelete(null);
      if (users.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) {
      toast.error('Could not delete user', getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PageHeader title="Users" description={loading ? 'Loading…' : `${total} registered ${total === 1 ? 'user' : 'users'}`} />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <Input
            aria-label="Search users"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            wrapperClassName="sm:max-w-xs"
          />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : !loading && users.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={debouncedSearch ? 'No matching users' : 'No users yet'}
            description={debouncedSearch ? `Nothing matches “${debouncedSearch}”.` : undefined}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th className="hidden md:table-cell">Joined</Th>
                <Th className="text-right">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <Tr key={i}>
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
                      <Td className="hidden md:table-cell">
                        <Skeleton className="h-3.5 w-20" />
                      </Td>
                      <Td />
                    </Tr>
                  ))
                : users.map((user) => {
                    const isSelf = user._id === currentUserId;
                    return (
                      <Tr key={user._id}>
                        <Td>
                          <div className="flex items-center gap-3">
                            <Avatar name={user.name} />
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 truncate font-medium text-foreground">
                                {user.name}
                                {isSelf && <Badge tone="brand">You</Badge>}
                              </p>
                              <p className="truncate text-xs text-subtle">{user.email}</p>
                            </div>
                          </div>
                        </Td>
                        <Td>
                          <select
                            aria-label={`Role for ${user.name}`}
                            value={user.role}
                            disabled={isSelf || updatingId === user._id}
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
                        <Td className="hidden whitespace-nowrap md:table-cell">{formatDate(user.createdAt)}</Td>
                        <Td className="text-right">
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
                        </Td>
                      </Tr>
                    );
                  })}
            </tbody>
          </Table>
        )}

        {!error && total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm sm:px-6">
            <p className="text-muted">
              Page <span className="font-medium text-foreground">{page}</span> of <span className="font-medium text-foreground">{totalPages}</span>
            </p>
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

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        isLoading={deleting}
        destructive
        title="Delete user?"
        description={`This permanently deletes ${toDelete?.name ?? 'this user'} (${toDelete?.email ?? ''}) and can't be undone.`}
        confirmLabel="Delete user"
      />
    </>
  );
}
