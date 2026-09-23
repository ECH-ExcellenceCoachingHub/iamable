'use client';

import React, { useMemo, useState } from 'react';
import { Bug, FileWarning, Languages, Lightbulb, MessageCircle, Search } from 'lucide-react';
import { PageHeader } from '@/components/layout/app-shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Badge, type BadgeTone } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/feedback';
import { Table, Td, Th, Tr } from '@/components/ui/table';
import { toast } from '@/store/toast-store';
import { api } from '@/lib/api';
import { cn, formatDate, getErrorMessage } from '@/lib/utils';
import { useApi } from '@/lib/hooks';

type Status = 'pending' | 'in-progress' | 'resolved' | 'closed';
type ReportType = 'bug' | 'feature' | 'translation-error' | 'other';

interface Report {
  _id: string;
  reportType: ReportType;
  message: string;
  status: Status;
  adminResponse?: string;
  createdAt: string;
}

const statusMeta: Record<Status, { label: string; tone: BadgeTone }> = {
  pending: { label: 'Pending', tone: 'warning' },
  'in-progress': { label: 'In progress', tone: 'brand' },
  resolved: { label: 'Resolved', tone: 'success' },
  closed: { label: 'Closed', tone: 'neutral' },
};

const typeMeta: Record<ReportType, { label: string; icon: React.ReactNode }> = {
  bug: { label: 'Bug', icon: <Bug /> },
  feature: { label: 'Feature request', icon: <Lightbulb /> },
  'translation-error': { label: 'Translation error', icon: <Languages /> },
  other: { label: 'Other', icon: <MessageCircle /> },
};

type Filter = 'all' | Status;

async function fetchReports(): Promise<Report[]> {
  const data = await api.admin.getReports();
  return Array.isArray(data) ? data : [];
}

export default function AdminReportsPage() {
  const { data, loading, error, reload: load, mutate } = useApi(fetchReports, 'Could not load reports.');
  const reports = useMemo(() => data ?? [], [data]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Report | null>(null);
  const [draftStatus, setDraftStatus] = useState<Status>('pending');
  const [draftResponse, setDraftResponse] = useState('');
  const [saving, setSaving] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: reports.length, pending: 0, 'in-progress': 0, resolved: 0, closed: 0 };
    reports.forEach((r) => {
      if (r.status in c) c[r.status]++;
    });
    return c;
  }, [reports]);

  const visible = reports.filter((r) => {
    if (filter !== 'all' && r.status !== filter) return false;
    const q = search.trim().toLowerCase();
    return !q || r.message.toLowerCase().includes(q) || (typeMeta[r.reportType]?.label ?? r.reportType).toLowerCase().includes(q);
  });

  const openReport = (report: Report) => {
    setSelected(report);
    setDraftStatus(report.status);
    setDraftResponse(report.adminResponse ?? '');
  };

  const saveReport = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const updated = await api.admin.updateReportStatus(selected._id, draftStatus, draftResponse.trim() || undefined);
      mutate((prev) =>
        (prev ?? []).map((r) => (r._id === selected._id ? { ...r, ...(updated ?? {}), status: draftStatus, adminResponse: draftResponse.trim() } : r))
      );
      toast.success('Report updated');
      setSelected(null);
    } catch (err) {
      toast.error('Could not update report', getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const filters: Filter[] = ['all', 'pending', 'in-progress', 'resolved', 'closed'];

  return (
    <>
      <PageHeader title="Reports" description="Review and respond to issues reported by users." />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 scrollbar-thin" role="tablist" aria-label="Filter by status">
            {filters.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === f ? 'bg-surface-muted text-foreground ring-1 ring-border' : 'text-muted hover:text-foreground'
                )}
              >
                {f === 'all' ? 'All' : statusMeta[f].label}
                <span className="rounded-full bg-surface-muted px-1.5 text-xs tabular-nums text-subtle ring-1 ring-border">{counts[f]}</span>
              </button>
            ))}
          </div>
          <Input
            aria-label="Search reports"
            placeholder="Search reports…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search />}
            wrapperClassName="lg:max-w-xs"
          />
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState message={error} onRetry={load} />
          </div>
        ) : !loading && visible.length === 0 ? (
          <EmptyState
            icon={<FileWarning />}
            title={reports.length === 0 ? 'No reports yet' : 'No matching reports'}
            description={reports.length === 0 ? 'Reports submitted by users will appear here.' : 'Try a different filter or search.'}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Report</Th>
                <Th>Status</Th>
                <Th className="hidden md:table-cell">Submitted</Th>
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
                        <div className="space-y-1.5">
                          <Skeleton className="h-3.5 w-24" />
                          <Skeleton className="h-3 w-64" />
                        </div>
                      </Td>
                      <Td>
                        <Skeleton className="h-5 w-20 rounded-full" />
                      </Td>
                      <Td className="hidden md:table-cell">
                        <Skeleton className="h-3.5 w-20" />
                      </Td>
                      <Td />
                    </Tr>
                  ))
                : visible.map((report) => {
                    const type = typeMeta[report.reportType] ?? typeMeta.other;
                    const status = statusMeta[report.status] ?? statusMeta.pending;
                    return (
                      <Tr key={report._id}>
                        <Td className="max-w-md">
                          <p className="flex items-center gap-1.5 text-xs font-medium text-subtle [&_svg]:size-3.5">
                            {type.icon}
                            {type.label}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-foreground">{report.message}</p>
                        </Td>
                        <Td>
                          <Badge tone={status.tone} dot>
                            {status.label}
                          </Badge>
                        </Td>
                        <Td className="hidden whitespace-nowrap md:table-cell">{formatDate(report.createdAt)}</Td>
                        <Td className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openReport(report)}>
                            Review
                          </Button>
                        </Td>
                      </Tr>
                    );
                  })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title="Review report"
        description={selected ? `${typeMeta[selected.reportType]?.label ?? 'Report'} · ${formatDate(selected.createdAt)}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveReport} isLoading={saving}>
              Save changes
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="rounded-xl bg-surface-muted p-4 text-sm leading-relaxed text-foreground">{selected.message}</div>
            <Select label="Status" value={draftStatus} onChange={(e) => setDraftStatus(e.target.value as Status)}>
              {(Object.keys(statusMeta) as Status[]).map((s) => (
                <option key={s} value={s}>
                  {statusMeta[s].label}
                </option>
              ))}
            </Select>
            <Textarea
              label="Response to user"
              placeholder="Optional — explain what was done or what happens next."
              value={draftResponse}
              onChange={(e) => setDraftResponse(e.target.value)}
              rows={4}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
