'use client';

import React, { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  TrendingDown,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import {
  useProjectMetrics,
  useSprintBurndown,
  useSprints,
  useIssues,
} from '@/hooks/use-issues';
import { metricsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

const statusColorMap: Record<string, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-blue-500',
  IN_REVIEW: 'bg-amber-500',
  DONE: 'bg-emerald-500',
  BACKLOG: 'bg-purple-400',
};

const priorityColorMap: Record<string, string> = {
  HIGHEST: 'bg-rose-600',
  URGENT: 'bg-rose-500',
  HIGH: 'bg-orange-500',
  MEDIUM: 'bg-amber-500',
  LOW: 'bg-blue-500',
  LOWEST: 'bg-slate-400',
};

export default function ReportsPage() {
  const params = useParams();
  const projectKey = (params?.projectKey as string) || 'TYK';

  // Fetch project metrics & sprints
  const { data: projectMetrics, isLoading: metricsLoading } = useProjectMetrics(projectKey);
  const { data: sprints = [], isLoading: sprintsLoading } = useSprints(projectKey);
  const { data: issues = [] } = useIssues(projectKey);

  // Active or selected sprint for burndown
  const activeSprint = useMemo(() => {
    return sprints.find((s) => s.status === 'ACTIVE') || sprints[0] || null;
  }, [sprints]);

  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  // Default to active sprint when loaded
  const currentSprintId = selectedSprintId || activeSprint?.id;
  const currentSprint = useMemo(() => {
    return sprints.find((s) => s.id === currentSprintId) || activeSprint;
  }, [sprints, currentSprintId, activeSprint]);

  // Sprint burndown metrics from backend
  const { data: sprintBurndown, isLoading: burndownLoading } = useSprintBurndown(
    projectKey,
    currentSprintId
  );

  // Export states
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'active_sprint' | 'backlog'>('all');
  const [exportStatus, setExportStatus] = useState<string>('ALL');

  // Computed summary metrics
  const totalIssuesCount = projectMetrics?.total_issues ?? issues.length;
  const totalSprintsCount = projectMetrics?.total_sprints ?? sprints.length;

  const totalPoints = useMemo(() => {
    return issues.reduce(
      (sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0),
      0
    );
  }, [issues]);

  const donePoints = useMemo(() => {
    return issues
      .filter((i) => i.status === 'DONE')
      .reduce((sum, i) => sum + (i.storyPoints ?? i.story_points ?? 0), 0);
  }, [issues]);

  const doneIssuesCount = useMemo(() => {
    return issues.filter((i) => i.status === 'DONE').length;
  }, [issues]);

  const completionRate =
    totalIssuesCount > 0 ? Math.round((doneIssuesCount / totalIssuesCount) * 100) : 0;

  // CSV Export handler
  const handleExportCSV = async () => {
    try {
      setIsExportingCSV(true);
      const filters: {
        sprint_id?: string;
        in_backlog?: boolean;
        status?: string;
      } = {};

      if (exportScope === 'active_sprint' && activeSprint?.id) {
        filters.sprint_id = activeSprint.id;
      } else if (exportScope === 'backlog') {
        filters.in_backlog = true;
      }

      if (exportStatus !== 'ALL') {
        filters.status = exportStatus;
      }

      const blob = await metricsApi.exportCSV(projectKey, filters);
      const filename = `issues_export_${projectKey.toLowerCase()}_${Date.now()}.csv`;
      downloadBlob(blob, filename);
      toast.success('Issues exported to CSV successfully!');
    } catch {
      toast.error('Failed to export CSV. Please check your permissions.');
    } finally {
      setIsExportingCSV(false);
    }
  };

  // JSON Summary Export handler
  const handleExportSummary = async () => {
    try {
      setIsExportingJSON(true);
      const data = await metricsApi.exportSummary(projectKey);
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const filename = `project_summary_${projectKey.toLowerCase()}_${Date.now()}.json`;
      downloadBlob(blob, filename);
      toast.success('Project summary JSON exported successfully!');
    } catch {
      toast.error('Failed to export summary JSON.');
    } finally {
      setIsExportingJSON(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <BarChart3 className="text-primary" size={24} />
              <span>Reports & Metrics</span>
            </h1>
            <Badge
              variant="outline"
              className="font-mono text-xs uppercase font-bold text-primary bg-primary/10 border-primary/20"
            >
              {projectKey}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Agile sprint burndown tracking, capacity distributions, and data export
          </p>
        </div>

        {/* Action Buttons: Export CSV & JSON */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportSummary}
            disabled={isExportingJSON}
            className="h-8 text-xs font-semibold gap-1.5 shadow-2xs"
          >
            {isExportingJSON ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileText size={13} />
            )}
            <span>Export JSON</span>
          </Button>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            disabled={isExportingCSV}
            className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
          >
            {isExportingCSV ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileSpreadsheet size={13} />
            )}
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Issues */}
        <Card className="border-border/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Issues</span>
            <Layers size={15} />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {metricsLoading ? '...' : totalIssuesCount}
          </div>
          <p className="text-[11px] text-muted-foreground">Across all workflow states</p>
        </Card>

        {/* Total Sprints */}
        <Card className="border-border/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Total Sprints</span>
            <Calendar size={15} />
          </div>
          <div className="text-2xl font-bold text-foreground">
            {sprintsLoading ? '...' : totalSprintsCount}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {activeSprint ? '1 active running' : 'No active sprint'}
          </p>
        </Card>

        {/* Story Points Completed */}
        <Card className="border-border/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Story Points Done</span>
            <Sparkles size={15} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {donePoints} <span className="text-xs text-muted-foreground font-normal">/ {totalPoints} pts</span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {doneIssuesCount} completed issue{doneIssuesCount !== 1 ? 's' : ''}
          </p>
        </Card>

        {/* Completion Rate */}
        <Card className="border-border/70 p-4 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold">Completion Rate</span>
            <CheckCircle2 size={15} className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">{completionRate}%</div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </Card>
      </div>

      {/* Sprint Burndown Section */}
      <Card className="border-border/70">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <TrendingDown size={18} className="text-primary" />
                <span>Sprint Burndown Chart</span>
              </CardTitle>
              {currentSprint?.status === 'ACTIVE' && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-2 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-semibold"
                >
                  ACTIVE
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs mt-0.5">
              Tracks actual remaining story points versus ideal linear burndown trajectory
            </CardDescription>
          </div>

          {/* Sprint Selector Dropdown */}
          {sprints.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/80 bg-background hover:bg-muted text-xs font-semibold transition-colors cursor-pointer outline-none">
                <Calendar size={13} className="text-muted-foreground" />
                <span>{currentSprint?.name || 'Select Sprint'}</span>
                <ChevronDown size={13} className="text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1">
                <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Project Sprints
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sprints.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    onClick={() => setSelectedSprintId(s.id)}
                    className="text-xs py-2 px-2.5 cursor-pointer justify-between"
                  >
                    <span className="font-medium truncate">{s.name}</span>
                    <Badge
                      variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}
                      className="text-[9px] px-1 py-0 uppercase font-mono"
                    >
                      {s.status}
                    </Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {burndownLoading ? (
            <div className="h-56 flex items-center justify-center text-xs text-muted-foreground">
              <Loader2 size={18} className="animate-spin mr-2" />
              Loading sprint metrics...
            </div>
          ) : sprintBurndown && sprintBurndown.burndown && sprintBurndown.burndown.length > 0 ? (
            <div className="space-y-4">
              {/* Burndown Summary Pills */}
              <div className="flex flex-wrap items-center gap-4 text-xs bg-muted/30 p-3 rounded-lg border border-border/40">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Total Points:</span>
                  <span className="font-bold text-foreground">{sprintBurndown.total_points} pts</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Completed:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {sprintBurndown.completed_points} pts
                  </span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Issues:</span>
                  <span className="font-bold text-foreground">
                    {sprintBurndown.completed_issues}/{sprintBurndown.total_issues} done
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div className="w-full overflow-x-auto">
                <div className="min-w-[500px] h-60 relative flex flex-col justify-between py-2">
                  <svg className="w-full h-full" viewBox="0 0 500 180" preserveAspectRatio="none">
                    {/* Background Grid Lines */}
                    {[0, 45, 90, 135, 180].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="500"
                        y2={y}
                        stroke="currentColor"
                        className="text-border/40"
                        strokeDasharray="3 3"
                      />
                    ))}

                    {/* Ideal Burndown Line (Dashed Slate) */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      className="text-muted-foreground/60"
                      strokeWidth="2"
                      strokeDasharray="4 4"
                      points={sprintBurndown.burndown
                        .map((pt, idx) => {
                          const x =
                            sprintBurndown.burndown.length > 1
                              ? (idx / (sprintBurndown.burndown.length - 1)) * 480 + 10
                              : 250;
                          const maxPts = Math.max(sprintBurndown.total_points, 1);
                          const y = 170 - (pt.ideal_points / maxPts) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Actual Remaining Line (Solid Emerald) */}
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      className="text-emerald-500"
                      strokeWidth="3"
                      points={sprintBurndown.burndown
                        .map((pt, idx) => {
                          const x =
                            sprintBurndown.burndown.length > 1
                              ? (idx / (sprintBurndown.burndown.length - 1)) * 480 + 10
                              : 250;
                          const maxPts = Math.max(sprintBurndown.total_points, 1);
                          const y = 170 - (pt.remaining_points / maxPts) * 150;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />

                    {/* Data Points on Actual Line */}
                    {sprintBurndown.burndown.map((pt, idx) => {
                      const x =
                        sprintBurndown.burndown.length > 1
                          ? (idx / (sprintBurndown.burndown.length - 1)) * 480 + 10
                          : 250;
                      const maxPts = Math.max(sprintBurndown.total_points, 1);
                      const y = 170 - (pt.remaining_points / maxPts) * 150;
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="4"
                          className="fill-emerald-500 stroke-background stroke-2"
                        />
                      );
                    })}
                  </svg>

                  {/* Dates X-Axis Labels */}
                  <div className="flex justify-between text-[10px] text-muted-foreground font-mono pt-2">
                    {sprintBurndown.burndown
                      .filter((_, idx, arr) => idx === 0 || idx === arr.length - 1 || idx % 3 === 0)
                      .map((pt, idx) => (
                        <span key={idx}>{pt.date}</span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1 border-t border-border/40">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 border-t-2 border-dashed border-muted-foreground/60" />
                  <span>Ideal Burndown</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="font-semibold text-foreground">Actual Remaining</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-muted-foreground space-y-2 border border-dashed border-border/60 rounded-lg p-6 bg-muted/10">
              <Clock size={28} className="mx-auto text-muted-foreground/60 mb-2" />
              <p className="font-semibold text-foreground">No burndown data for this sprint yet</p>
              <p className="max-w-md mx-auto">
                Burndown trajectories are calculated when a sprint has both start and end dates assigned. Set dates in the Backlog view to generate historical charts.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Two-Column Distributions: Status & Priority */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Status Distribution</CardTitle>
            <CardDescription className="text-xs">
              Count of issues and story points per workflow stage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {projectMetrics && projectMetrics.status_distribution.length > 0 ? (
              projectMetrics.status_distribution.map((dist) => {
                const pct =
                  totalIssuesCount > 0 ? Math.round((Number(dist.count) / totalIssuesCount) * 100) : 0;
                const dotColor = statusColorMap[dist.status] || 'bg-slate-400';

                return (
                  <div key={dist.status} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                        <span>{dist.status}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {dist.count} issues • {dist.points} pts ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${dotColor} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No status distributions recorded yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold">Priority Distribution</CardTitle>
            <CardDescription className="text-xs">
              Breakdown of issues categorized by urgency level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3.5">
            {projectMetrics && projectMetrics.priority_distribution.length > 0 ? (
              projectMetrics.priority_distribution.map((pDist) => {
                const pct =
                  totalIssuesCount > 0 ? Math.round((Number(pDist.count) / totalIssuesCount) * 100) : 0;
                const dotColor = priorityColorMap[pDist.priority] || 'bg-slate-400';

                return (
                  <div key={pDist.priority} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-medium text-foreground">
                        <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                        <span>{pDist.priority}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {pDist.count} issues ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${dotColor} rounded-full transition-all duration-300`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No priority distributions recorded yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Export Center Panel */}
      <Card className="border-border/70 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Download size={18} className="text-primary" />
            <span>Data Export Center</span>
          </CardTitle>
          <CardDescription className="text-xs">
            Export tickets and project metrics for external analysis, audits, and spreadsheet tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* CSV Filter: Scope */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Export Scope</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'all', label: 'All Issues' },
                  { id: 'active_sprint', label: 'Active Sprint' },
                  { id: 'backlog', label: 'Backlog Only' },
                ].map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    variant={exportScope === item.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setExportScope(item.id as typeof exportScope)}
                    className="h-8 text-xs font-medium"
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* CSV Filter: Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Filter Status</label>
              <select
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-border/80 bg-background text-xs text-foreground outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">In Review</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportSummary}
              disabled={isExportingJSON}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <FileText size={13} />
              <span>Download Summary JSON</span>
            </Button>

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleExportCSV}
              disabled={isExportingCSV}
              className="h-8 text-xs font-semibold gap-1.5 shadow-xs"
            >
              {isExportingCSV ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Download size={13} />
              )}
              <span>Download CSV File</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
