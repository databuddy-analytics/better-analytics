'use client';

import { useEffect, useRef, useState, useCallback, useId } from 'react';
import { Button } from '@better-analytics/ui/components/button';
import { Input } from '@better-analytics/ui/components/input';
import { Card, CardContent, CardHeader } from '@better-analytics/ui/components/card';
import { Switch } from '@better-analytics/ui/components/switch';
import { Label } from '@better-analytics/ui/components/label';
import { Separator } from '@better-analytics/ui/components/separator';
import {
    DownloadSimple,
    MagnifyingGlass,
    Play,
    Pause,
    ArrowCounterClockwise,
    WifiHigh,
    WifiSlash,
    ArrowClockwise,
} from '@phosphor-icons/react';
import { cn } from '@better-analytics/ui';
import { TerminalLine } from './terminal-line';
import { LineCountFilter } from './line-count-filter';
import { SinceLogsFilter, type TimeFilter } from './since-logs-filter';
import { StatusLogsFilter } from './status-logs-filter';
import { type LogLine, getLogType } from './utils';
import { getRecentLogs } from '../../../actions';
import { useRealtime, type LogEvent } from '@/hooks/use-realtime';
import { Skeleton } from '@better-analytics/ui/components/skeleton';

const priorities = [
    { label: "Info", value: "info" },
    { label: "Warning", value: "warning" },
    { label: "Error", value: "error" },
    { label: "Debug", value: "debug" },
];

export function LogsConsole() {
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [filteredLogs, setFilteredLogs] = useState<LogLine[]>([]);
    const [isStreaming, setIsStreaming] = useState(true);
    const [autoScroll, setAutoScroll] = useState(true);
    const [lines, setLines] = useState<number>(100);
    const [search, setSearch] = useState<string>("");
    const [showTimestamp, setShowTimestamp] = useState(true);
    const [since, setSince] = useState<TimeFilter>("all");
    const [typeFilter, setTypeFilter] = useState<string[]>([]);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const autoScrollId = useId();

    // Real-time subscription
    const handleNewLog = useCallback((logEvent: LogEvent) => {
        const newLog: LogLine = {
            timestamp: new Date(logEvent.created_at),
            message: logEvent.message,
            rawTimestamp: logEvent.created_at,
            source: logEvent.source || 'Unknown',
            level: logEvent.level || 'info',
            context: logEvent.context,
            environment: logEvent.environment,
            user_id: logEvent.user_id,
            session_id: logEvent.session_id,
            tags: []
        };

        setLogs(prevLogs => [...prevLogs, newLog]);
    }, []);

    const { isConnected } = useRealtime({
        onLog: handleNewLog,
        enabled: isStreaming
    });

    const scrollToBottom = () => {
        if (autoScroll && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleScroll = () => {
        if (!scrollRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
        const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
        setAutoScroll(isAtBottom);
    };

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const result = await getRecentLogs();
            if (result.success && result.data) {
                const transformedLogs: LogLine[] = result.data.map(log => ({
                    timestamp: new Date(log.created_at),
                    message: log.message,
                    rawTimestamp: log.created_at,
                    source: log.source || 'Unknown',
                    level: log.level || 'info',
                    context: log.context,
                    environment: log.environment,
                    user_id: log.user_id,
                    session_id: log.session_id,
                    tags: log.tags
                }));
                setLogs(transformedLogs);
            }
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = () => {
        const logContent = filteredLogs
            .map(({ timestamp, message }) =>
                `${timestamp?.toISOString() || "No timestamp"} ${message}`
            )
            .join("\n");

        const blob = new Blob([logContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const isoDate = new Date().toISOString();
        a.href = url;
        a.download = `logs-${isoDate.slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleLogToggle = (logId: string) => {
        setExpandedLogId(expandedLogId === logId ? null : logId);
    };

    const handleFilter = (logs: LogLine[]) => {
        return logs.filter((log) => {
            const logType = getLogType(log.message).type;

            if (search && !log.message.toLowerCase().includes(search.toLowerCase())) {
                return false;
            }

            if (typeFilter.length > 0 && !typeFilter.includes(logType)) {
                return false;
            }

            if (since !== "all" && log.timestamp) {
                const now = new Date();
                const logTime = log.timestamp;
                const diffHours = (now.getTime() - logTime.getTime()) / (1000 * 60 * 60);

                switch (since) {
                    case "1h": return diffHours <= 1;
                    case "6h": return diffHours <= 6;
                    case "24h": return diffHours <= 24;
                    case "168h": return diffHours <= 168;
                    case "720h": return diffHours <= 720;
                    default: return true;
                }
            }

            return true;
        });
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        const filtered = handleFilter(logs);
        setFilteredLogs(filtered.slice(-lines));
    }, [logs, search, lines, since, typeFilter]);

    useEffect(() => {
        scrollToBottom();
    }, [filteredLogs, autoScroll]);

    return (
        <Card className="h-full flex flex-col pb-2 mb-2 gap-0">
            <CardHeader className="pb-4">
                <div className="space-y-3">
                    {/* Enhanced Filter Bar */}
                    <div className="backdrop-blur-xl bg-muted/30 border border-border/20 shadow-lg p-4 rounded-lg">
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* Left Section: Filters */}
                            <div className="flex flex-wrap items-center gap-3 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Filters</span>
                                    <Separator orientation="vertical" className="h-4" />
                                </div>

                                <StatusLogsFilter
                                    value={typeFilter}
                                    setValue={setTypeFilter}
                                    title="Level"
                                    options={priorities}
                                />
                                <SinceLogsFilter
                                    value={since}
                                    onValueChange={setSince}
                                    showTimestamp={showTimestamp}
                                    onTimestampChange={setShowTimestamp}
                                />
                                <LineCountFilter value={lines} onValueChange={setLines} />
                            </div>

                            {/* Right Section: Actions */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</span>
                                    <Separator orientation="vertical" className="h-4" />
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsStreaming(!isStreaming)}
                                    className={cn(
                                        "gap-2 transition-all duration-200",
                                        isStreaming
                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                            : "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                                    )}
                                    title={isStreaming ? "Pause real-time updates" : "Resume real-time updates"}
                                >
                                    {isStreaming ? <Pause size={14} /> : <Play size={14} />}
                                    {isStreaming ? 'Real-time' : 'Paused'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={fetchLogs}
                                    className="gap-2 hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-400 transition-all duration-200"
                                    title="Refresh logs manually"
                                >
                                    <ArrowClockwise size={14} />
                                    Refresh
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLogs([])}
                                    className="gap-2 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all duration-200"
                                >
                                    <ArrowCounterClockwise size={14} />
                                    Clear
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleDownload}
                                    disabled={filteredLogs.length === 0}
                                    className="gap-2 hover:bg-blue-500/10 hover:border-blue-500/20 hover:text-blue-400 transition-all duration-200 disabled:opacity-50"
                                >
                                    <DownloadSimple size={14} />
                                    Export
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Search and Status Bar */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <MagnifyingGlass className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search logs..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="pl-9 bg-background/50 border-border/50 focus:bg-background focus:border-border transition-all duration-200"
                                />
                            </div>

                            {search && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-md">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                    <span className="text-sm text-blue-400 font-medium">
                                        {filteredLogs.length} result{filteredLogs.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 border border-border/20 rounded-md">
                                <Switch
                                    id={autoScrollId}
                                    checked={autoScroll}
                                    onCheckedChange={setAutoScroll}
                                />
                                <Label htmlFor={autoScrollId} className="text-sm font-medium">Auto-scroll</Label>
                            </div>

                            {/* Real-time connection indicator */}
                            <div className={cn(
                                "flex items-center gap-2 px-3 py-1 border rounded-md transition-all duration-200",
                                isConnected
                                    ? "bg-emerald-500/10 border-emerald-500/20"
                                    : "bg-red-500/10 border-red-500/20"
                            )}>
                                {isConnected ? (
                                    <WifiHigh className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <WifiSlash className="h-3 w-3 text-red-400" />
                                )}
                                <span className={cn(
                                    "text-sm font-medium",
                                    isConnected ? "text-emerald-400" : "text-red-400"
                                )}>
                                    {isConnected ? 'Real-time' : 'Disconnected'}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 px-3 py-1 bg-muted/30 border border-border/20 rounded-md">
                                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
                                <span className="text-sm text-muted-foreground font-mono">
                                    {filteredLogs.length} / {logs.length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="flex-1 p-0 min-h-0">
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto" ref={scrollRef} onScroll={handleScroll}>
                        {isLoading ? (
                            <LoadingSkeleton />
                        ) : filteredLogs.length > 0 ? (
                            <div className="divide-y divide-border/20">
                                {filteredLogs.map((log, index) => (
                                    <TerminalLine
                                        key={`${log.rawTimestamp}-${index}`}
                                        log={log}
                                        noTimestamp={!showTimestamp}
                                        searchTerm={search}
                                        isExpanded={expandedLogId === `${log.rawTimestamp}-${index}`}
                                        onToggleExpand={() => handleLogToggle(`${log.rawTimestamp}-${index}`)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                                <MagnifyingGlass className="w-16 h-16 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-semibold text-foreground">No logs found</h3>
                                <p className="text-sm text-muted-foreground max-w-xs">
                                    It looks like everything is running smoothly. If you were expecting to see logs, please check your filters.
                                </p>
                            </div>
                        )}
                    </div>
                    {/* Footer */}
                    <div className="p-2 border-t border-border/20 text-xs text-muted-foreground flex justify-between items-center">
                        <span>Showing {filteredLogs.length} of {logs.length} logs</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function LoadingSkeleton() {
    return (
        <div className="p-4 space-y-4">
            {[...Array(15)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2">
                    <Skeleton className="h-6 w-24 rounded-md" />
                    <Skeleton className="h-6 w-20 rounded-md" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-full" />
                    </div>
                </div>
            ))}
        </div>
    );
} 