"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Circle,
  Clock,
  CheckCircle2,
  Ban,
  ExternalLink,
  Bug,
  BugOff,
  Info,
  X,
  SquareDashedMousePointer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { updateComponentSelection, updateComponentStatus } from "@/lib/actions";
import type {
  Component,
  UserComponentStatus,
  ComponentStatus,
} from "@/lib/types";
import type { ComponentStats } from "@/app/testing/campaign/[campaignId]/page";
import { cn } from "@/lib/utils";

const statusConfig: Record<
  ComponentStatus,
  {
    label: string;
    icon: React.ElementType;
    className: string;
    selectClassName: string;
    cardClassName: string;
  }
> = {
  not_started: {
    label: "Not Started",
    icon: Circle,
    className: "selected-card__status selected-card__status--not-started",
    selectClassName: "border-muted",
    cardClassName: "selected-card--not-started",
  },
  in_progress: {
    label: "In Progress",
    icon: Clock,
    className: "selected-card__status selected-card__status--in-progress",
    selectClassName: "border-blue-300 bg-blue-500/10 text-blue-700",
    cardClassName: "selected-card--in-progress",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    className: "selected-card__status selected-card__status--completed",
    selectClassName: "border-green-300 bg-green-500/10 text-green-700",
    cardClassName: "selected-card--completed",
  },
  blocked: {
    label: "Blocked",
    icon: Ban,
    className: "selected-card__status selected-card__status--blocked",
    selectClassName: "border-red-300 bg-red-500/10 text-red-700",
    cardClassName: "selected-card--blocked",
  },
};

interface ComponentListProps {
  components: Component[];
  statuses: UserComponentStatus[];
  userId: string;
  stats: ComponentStats;
  isAdmin?: boolean;
  categories?: { id: string; name: string; color: string }[];
  categoryMap?: Record<string, string[]>;
}

export function ComponentList({
  components,
  statuses,
  userId,
  stats: initialStats,
  isAdmin = false,
  categories = [],
  categoryMap = {},
}: ComponentListProps) {
  const router = useRouter();
  const [localStatuses, setLocalStatuses] = useState<
    Record<string, UserComponentStatus>
  >(() => {
    const map: Record<string, UserComponentStatus> = {};
    statuses.forEach((s) => {
      map[s.component_id] = s;
    });
    return map;
  });

  const [stats, setStats] = useState(initialStats);
  const [isStatusInfoOpen, setIsStatusInfoOpen] = useState(false);
  const [showAllComponents, setShowAllComponents] = useState(() => {
    const hasSelected = components.some(
      (c) => localStatuses[c.id]?.is_selected,
    );
    return !hasSelected;
  });

  const getStatus = (componentId: string): UserComponentStatus | null => {
    return localStatuses[componentId] || null;
  };

  const handleSelectToggle = async (componentId: string, checked: boolean) => {
    const existing = getStatus(componentId);
    const oldStatus = existing?.status || "not_started";

    const data = await updateComponentSelection({
      userId,
      componentId,
      isSelected: checked,
      existingStatusId: existing?.id,
    });

    if (data) {
      setLocalStatuses((prev) => ({ ...prev, [componentId]: data }));

      setStats((prev) => {
        const nextStatusCounts = { ...prev.statusCounts };
        const counts = {
          ...(nextStatusCounts[componentId] ?? {
            not_started: 0,
            in_progress: 0,
            completed: 0,
            blocked: 0,
          }),
        };

        if (checked) {
          counts[data.status] = (counts[data.status] || 0) + 1;
        } else if (existing?.is_selected) {
          counts[oldStatus] = Math.max(0, (counts[oldStatus] || 0) - 1);
        }

        nextStatusCounts[componentId] = counts;
        return { ...prev, statusCounts: nextStatusCounts };
      });
      router.refresh();
    }
  };

  const handleStatusChange = async (
    componentId: string,
    status: ComponentStatus,
  ) => {
    const existing = getStatus(componentId);
    const oldStatus = existing?.status || "not_started";

    const data = await updateComponentStatus({
      userId,
      componentId,
      status,
      existingStatusId: existing?.id,
    });

    if (data) {
      setLocalStatuses((prev) => ({ ...prev, [componentId]: data }));

      if (data.is_selected) {
        setStats((prev) => {
          const nextStatusCounts = { ...prev.statusCounts };
          const counts = {
            ...(nextStatusCounts[componentId] ?? {
              not_started: 0,
              in_progress: 0,
              completed: 0,
              blocked: 0,
            }),
          };

          counts[oldStatus] = Math.max(0, (counts[oldStatus] || 0) - 1);
          counts[status] = (counts[status] || 0) + 1;

          nextStatusCounts[componentId] = counts;
          return { ...prev, statusCounts: nextStatusCounts };
        });
      }
      router.refresh();
    }
  };

  // Derive selected components from localStatuses
  const selectedComponents = components.filter(
    (c) => localStatuses[c.id]?.is_selected,
  );

  if (components.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No components available for testing yet.
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* My Selected Components Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">My Selected Components</h3>
          <Badge variant="secondary" className="text-xs">
            {selectedComponents.length}
          </Badge>
        </div>
        {selectedComponents.length === 0 ? (
          <Empty className="border py-8 bg-muted/30">
            <EmptyHeader>
              <EmptyMedia
                variant="icon"
                className="bg-muted text-muted-foreground"
              >
                <SquareDashedMousePointer className="h-5 w-5" />
              </EmptyMedia>
              <EmptyTitle className="text-base">
                No components selected
              </EmptyTitle>
              <EmptyDescription>
                Choose components from the table below to start testing
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {selectedComponents.map((component) => {
              const userStatus = getStatus(component.id);
              const status = (userStatus?.status ??
                "not_started") as ComponentStatus;
              const config = statusConfig[status];
              const StatusIcon = config.icon;
              const myBugCount = stats.myBugCounts?.[component.id] || 0;

              return (
                <Card
                  key={component.id}
                  className={cn("selected-card", config.cardClassName)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View ${component.name} details`}
                  onClick={() => router.push(`/testing/${component.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/testing/${component.id}`);
                    }
                  }}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="selected-card__remove"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleSelectToggle(component.id, false);
                    }}
                    aria-label={`Remove ${component.name} from selection`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <CardHeader className="selected-card__header">
                    <div className="selected-card__header-row">
                      <Badge variant="outline" className={config.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="selected-card__body">
                    <CardTitle className="selected-card__title">
                      {component.name}
                    </CardTitle>
                    <p className="selected-card__description">
                      {component.description}
                    </p>
                    <div className="selected-card__categories">
                      {(categoryMap[component.id] || []).map((catId) => {
                        const cat = categories.find((c) => c.id === catId);
                        if (!cat) return null;
                        return (
                          <span
                            key={cat.id}
                            className="selected-card__category-chip"
                            style={{
                              backgroundColor: `${cat.color}1A`,
                              borderColor: cat.color,
                              color: cat.color,
                            }}
                          >
                            {cat.name}
                          </span>
                        );
                      })}
                    </div>
                  </CardContent>
                  <CardFooter className="selected-card__footer">
                    <div className="selected-card__footer-content">
                      {myBugCount > 0 && (
                        <Badge
                          variant="outline"
                          className="selected-card__bug-badge"
                        >
                          <Bug className="h-3 w-3 mr-1" />
                          {myBugCount} bug{myBugCount !== 1 ? "s" : ""} reported
                          by me
                        </Badge>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Component Table */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">
              All Components in This Campaign
            </h3>
            <Badge variant="secondary" className="text-xs">
              {components.length}
            </Badge>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAllComponents((prev) => !prev)}
          >
            {showAllComponents ? "Hide all components" : "Show all components"}
          </Button>
        </div>
        {showAllComponents ? (
          <>
            <p className="text-sm text-muted-foreground">
              Please select only the components you intend to test, so that we can
              get an accurate idea of how much testing each component will receive.
            </p>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Select</TableHead>
                    <TableHead>Component</TableHead>
                    <TableHead className="w-40">Categories</TableHead>
                    <TableHead className="w-36">
                      <div className="flex items-center gap-1">
                        <span>My Status</span>
                        <Dialog
                          open={isStatusInfoOpen}
                          onOpenChange={setIsStatusInfoOpen}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                                  aria-label="View status definitions"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>View status definitions</TooltipContent>
                          </Tooltip>
                          <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
                            <DialogHeader>
                              <DialogTitle>Status definitions</DialogTitle>
                              <DialogDescription>
                                What each testing status means.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-muted">
                                  Not Started
                                </Badge>
                                <span className="text-muted-foreground">
                                  Haven&apos;t begun testing
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-blue-500/10 text-blue-700 border-blue-200"
                                >
                                  In Progress
                                </Badge>
                                <span className="text-muted-foreground">
                                  Currently testing
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-green-500/10 text-green-700 border-green-200"
                                >
                                  Completed
                                </Badge>
                                <span className="text-muted-foreground">
                                  Finished testing
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="bg-red-500/10 text-red-700 border-red-200"
                                >
                                  Blocked
                                </Badge>
                                <span className="text-muted-foreground">
                                  Cannot proceed
                                </span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableHead>
                    {isAdmin ? (
                      <TableHead colSpan={4} className="text-center border-l">
                        <span className="text-xs font-medium">Tester Status</span>
                      </TableHead>
                    ) : (
                      <TableHead className="text-center border-l">
                        <span className="text-xs font-medium">Testers</span>
                      </TableHead>
                    )}
                    <TableHead colSpan={3} className="text-center border-l">
                      <span className="text-xs font-medium">Bugs</span>
                    </TableHead>
                    <TableHead className="w-16 text-right border-l">
                      Action
                    </TableHead>
                  </TableRow>
                  <TableRow className="hover:bg-transparent">
                    <TableHead />
                    <TableHead />
                    <TableHead />
                    <TableHead />
                    {isAdmin ? (
                      <>
                        <TableHead className="text-center border-l w-16 py-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground cursor-default">
                                <Circle className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Not started</TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center w-16 py-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1 text-xs text-blue-600 cursor-default">
                                <Clock className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>In progress</TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center w-16 py-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1 text-xs text-green-600 cursor-default">
                                <CheckCircle2 className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Completed</TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-center w-16 py-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center justify-center gap-1 text-xs text-red-600 cursor-default">
                                <Ban className="h-3 w-3" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>Blocked</TooltipContent>
                          </Tooltip>
                        </TableHead>
                      </>
                    ) : (
                      <TableHead className="text-center border-l w-20 py-1 text-xs text-muted-foreground">
                        Total
                      </TableHead>
                    )}
                    <TableHead className="text-center border-l w-16 py-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1 text-xs text-orange-600 cursor-default">
                            <Bug className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Open bugs</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center w-16 py-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center justify-center gap-1 text-xs text-green-600 cursor-default">
                            <BugOff className="h-3 w-3" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Closed bugs</TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-10 text-center" />
                    <TableHead className="border-l" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component) => {
                    const userStatus = getStatus(component.id);
                    const isSelected = userStatus?.is_selected ?? false;
                    const status = (userStatus?.status ??
                      "not_started") as ComponentStatus;
                    const config = statusConfig[status];

                    const compStatusCounts = stats.statusCounts[component.id] || {
                      not_started: 0,
                      in_progress: 0,
                      completed: 0,
                      blocked: 0,
                    };
                    const compBugCounts = stats.bugCounts[component.id] || {
                      open: 0,
                      closed: 0,
                    };
                    const totalTesters =
                      compStatusCounts.not_started +
                      compStatusCounts.in_progress +
                      compStatusCounts.completed +
                      compStatusCounts.blocked;

                    return (
                      <TableRow
                        key={component.id}
                        className={cn(
                          isSelected && "bg-primary/5",
                          !isSelected && "opacity-80",
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectToggle(component.id, checked === true)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{component.name}</div>
                            <div className="text-sm text-muted-foreground line-clamp-2 whitespace-normal break-words max-w-prose">
                              {component.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(categoryMap[component.id] || []).map((catId) => {
                              const cat = categories.find((c) => c.id === catId);
                              if (!cat) return null;
                              return (
                                <span
                                  key={cat.id}
                                  className="px-2 py-0.5 rounded text-xs font-medium border"
                                  style={{
                                    backgroundColor: `${cat.color}1A`,
                                    borderColor: cat.color,
                                    color: cat.color,
                                  }}
                                >
                                  {cat.name}
                                </span>
                              );
                            })}
                            {(categoryMap[component.id] || []).length === 0 && (
                              <span className="text-xs text-muted-foreground">
                                None
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={status}
                            onValueChange={(value) =>
                              handleStatusChange(
                                component.id,
                                value as ComponentStatus,
                              )
                            }
                            disabled={!isSelected}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-8 text-xs w-[140px]",
                                config.selectClassName,
                              )}
                              disabled={!isSelected}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(
                                ([key, { label, icon: Icon }]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-1.5">
                                      <Icon className="h-3 w-3" />
                                      {label}
                                    </div>
                                  </SelectItem>
                                ),
                              )}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {isAdmin ? (
                          <>
                            <TableCell className="text-center border-l tabular-nums text-sm text-muted-foreground">
                              {compStatusCounts.not_started || "-"}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm text-blue-600">
                              {compStatusCounts.in_progress || "-"}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm text-green-600">
                              {compStatusCounts.completed || "-"}
                            </TableCell>
                            <TableCell className="text-center tabular-nums text-sm text-red-600">
                              {compStatusCounts.blocked || "-"}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell className="text-center border-l tabular-nums text-sm">
                            {totalTesters > 0 ? (
                              <span className="text-muted-foreground">
                                {totalTesters}
                              </span>
                            ) : (
                              <span className="text-xs font-semibold text-red-600">
                                Needs testers!
                              </span>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-center border-l tabular-nums text-sm">
                          {compBugCounts.open > 0 ? (
                            <span className="text-orange-600 font-medium">
                              {compBugCounts.open}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center tabular-nums text-sm text-green-600">
                          {compBugCounts.closed || "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/testing/${component.id}#report`}
                                className={cn(
                                  !isSelected && "pointer-events-none opacity-50",
                                )}
                              >
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  +
                                </Button>
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>report bug</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right border-l">
                          <Link
                            href={`/testing/${component.id}#guides`}
                            className={cn(
                              "inline-flex items-center gap-1 text-sm text-primary hover:underline",
                              !isSelected && "pointer-events-none opacity-50",
                            )}
                          >
                            Resources
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            All components are hidden. Use “Show all components” to view the table.
          </p>
        )}
      </div>
    </div>
  );
}
