import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Activity, 
  Settings, 
  UserPlus,
  Users,
  DollarSign,
  Award,
  TrendingUp,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveMetricBadge } from "./LiveMetricBadge";
import { StatusIndicator } from "./StatusIndicator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatCurrency } from "@/utils/animationHelpers";

interface RealTimeAdminNavigationProps {
  metrics: any;
  loading: boolean;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const RealTimeAdminNavigation = ({ 
  metrics, 
  loading,
  activeTab = 'overview',
  onTabChange 
}: RealTimeAdminNavigationProps) => {
  const getSystemStatus = (): 'healthy' | 'warning' | 'error' => {
    if (!metrics?.systemHealth) return 'healthy';
    const { database, storage } = metrics.systemHealth;
    if (database === 'error' || storage === 'error') return 'error';
    if (database === 'warning' || storage === 'warning') return 'warning';
    return 'healthy';
  };

  const systemStatus = getSystemStatus();
  const hasAlerts = metrics?.alerts && metrics.alerts.length > 0;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Analytics Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === 'analytics' ? 'default' : 'outline'}
              size="sm"
              className="relative gap-2"
              onClick={() => onTabChange?.('analytics')}
            >
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
              
              {!loading && metrics?.payments && (
                <LiveMetricBadge 
                  value={formatCurrency(metrics.payments.totalRevenue)}
                  animated
                  variant="secondary"
                  className="hidden md:inline-flex"
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">Analytics Overview</p>
              {!loading && metrics && (
                <>
                  <p className="text-xs flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Revenue: {formatCurrency(metrics.payments?.totalRevenue || 0)}
                  </p>
                  <p className="text-xs flex items-center gap-2">
                    <Award className="h-3 w-3" />
                    Certificates Today: {metrics.certificates?.issuedToday || 0}
                  </p>
                  <p className="text-xs flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Completions Today: {metrics.courseProgress?.completionsToday || 0}
                  </p>
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Real-Time Ops Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === 'realtime' ? 'default' : 'outline'}
              size="sm"
              className="relative gap-2"
              onClick={() => onTabChange?.('realtime')}
            >
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">Real-Time Ops</span>
              
              <StatusIndicator 
                status={systemStatus}
                pulse={systemStatus !== 'healthy'}
                size="sm"
              />
              
              {!loading && metrics?.activeUsers > 0 && (
                <LiveMetricBadge 
                  value={metrics.activeUsers}
                  icon={<Users className="h-3 w-3" />}
                  animated
                  variant="secondary"
                  className="hidden md:inline-flex"
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold flex items-center gap-2">
                <span className={cn(
                  "inline-block h-2 w-2 rounded-full",
                  systemStatus === 'healthy' && "bg-green-500 animate-pulse",
                  systemStatus === 'warning' && "bg-yellow-500 animate-pulse",
                  systemStatus === 'error' && "bg-red-500 animate-pulse"
                )} />
                System {systemStatus === 'healthy' ? 'Healthy' : systemStatus === 'warning' ? 'Degraded' : 'Critical'}
              </p>
              {!loading && metrics && (
                <>
                  <p className="text-xs">Active Users: {metrics.activeUsers || 0}</p>
                  <p className="text-xs">Active Sessions: {metrics.activeSessions || 0}</p>
                  {hasAlerts && (
                    <p className="text-xs text-yellow-500 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {metrics.alerts.length} Active Alerts
                    </p>
                  )}
                </>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Settings Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === 'settings' ? 'default' : 'outline'}
              size="sm"
              className="relative gap-2"
              onClick={() => onTabChange?.('settings')}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
              
              {!loading && metrics?.security?.activeThreats > 0 && (
                <LiveMetricBadge 
                  value={metrics.security.activeThreats}
                  variant="destructive"
                  animated
                  className="absolute -top-1 -right-1"
                />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold">System Settings</p>
              {!loading && metrics?.security && (
                <p className="text-xs">
                  {metrics.security.activeThreats > 0 
                    ? `⚠️ ${metrics.security.activeThreats} Security Threats` 
                    : '✓ No security threats'}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {/* Demo Setup Tab */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={activeTab === 'demo-setup' ? 'default' : 'outline'}
              size="sm"
              className="relative gap-2"
              onClick={() => onTabChange?.('demo-setup')}
            >
              <UserPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Demo Setup</span>
              
              {/* Attention-grabbing pulse */}
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Create and manage test accounts</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};
