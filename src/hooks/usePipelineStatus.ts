import { useMemo } from 'react';
import { 
  usePipelineHealthSnapshot, 
  usePipelineHealthEvents, 
  useRecentAutoFixes, 
  useAdminAttentionItems 
} from '@/hooks/usePipelineHealthAgent';
import type { 
  PipelineType, 
  HealthStatus, 
  PipelineDimensionStatus,
  AgentType,
  AGENT_CONFIGS 
} from '@/types/pipelineAgents';
import { getHealthStatusFromPercentage } from '@/types/pipelineAgents';

/**
 * Hook to get the overall pipeline health status across all dimensions
 */
export function usePipelineStatus() {
  const { data: snapshot, isLoading, error } = usePipelineHealthSnapshot();
  const { data: events } = usePipelineHealthEvents(100);

  const dimensions = useMemo<PipelineDimensionStatus[]>(() => {
    if (!snapshot || !events) return [];

    const eventsByPipeline = events.reduce((acc, event) => {
      const pipeline = event.pipeline as PipelineType;
      if (!acc[pipeline]) acc[pipeline] = [];
      acc[pipeline].push(event);
      return acc;
    }, {} as Record<PipelineType, typeof events>);

    const pipelines: PipelineType[] = [
      'application',
      'organization', 
      'seat',
      'training',
      'certification',
      'communications'
    ];

    const agentMap: Record<PipelineType, AgentType> = {
      application: 'application_state',
      organization: 'organization_integrity',
      seat: 'seat_reconciliation',
      training: 'access_progress',
      certification: 'certificate_integrity',
      communications: 'communications'
    };

    return pipelines.map(pipeline => {
      const pipelineEvents = eventsByPipeline[pipeline] || [];
      const criticalCount = pipelineEvents.filter(e => e.severity === 'critical' && !e.auto_fixed).length;
      const warningCount = pipelineEvents.filter(e => e.severity === 'warning' && !e.auto_fixed).length;
      
      let status: HealthStatus = 'healthy';
      if (criticalCount > 0) status = 'broken';
      else if (warningCount > 0) status = 'degraded';

      return {
        dimension: pipeline,
        status,
        issues_count: criticalCount + warningCount,
        last_check: snapshot.last_run_at,
        agent_responsible: agentMap[pipeline]
      };
    });
  }, [snapshot, events]);

  const overallStatus = useMemo<HealthStatus>(() => {
    if (!snapshot) return 'healthy';
    const percentage = (snapshot.pipelines_healthy / snapshot.pipelines_total) * 100;
    return getHealthStatusFromPercentage(percentage);
  }, [snapshot]);

  const healthPercentage = useMemo(() => {
    if (!snapshot) return 100;
    return Math.round((snapshot.pipelines_healthy / snapshot.pipelines_total) * 100);
  }, [snapshot]);

  return {
    snapshot,
    dimensions,
    overallStatus,
    healthPercentage,
    isLoading,
    error
  };
}

/**
 * Hook to get issues requiring admin attention
 */
export function useAdminIssues() {
  const { data: adminItems, isLoading } = useAdminAttentionItems();
  const { data: events } = usePipelineHealthEvents(50);

  const criticalIssues = useMemo(() => {
    return events?.filter(e => e.severity === 'critical' && !e.auto_fixed) || [];
  }, [events]);

  const pendingActions = useMemo(() => {
    return adminItems?.filter(item => item.requires_admin && !item.auto_fixed) || [];
  }, [adminItems]);

  return {
    criticalIssues,
    pendingActions,
    totalIssues: criticalIssues.length + pendingActions.length,
    isLoading
  };
}

/**
 * Hook to get auto-fix statistics
 */
export function useAutoFixStats() {
  const { data: autoFixes, isLoading } = useRecentAutoFixes();
  const { data: snapshot } = usePipelineHealthSnapshot();

  const stats = useMemo(() => {
    if (!autoFixes) return { today: 0, byPipeline: {} as Record<string, number> };

    const byPipeline = autoFixes.reduce((acc, fix) => {
      const pipeline = fix.pipeline;
      acc[pipeline] = (acc[pipeline] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      today: snapshot?.auto_fixed_today || autoFixes.length,
      byPipeline
    };
  }, [autoFixes, snapshot]);

  return {
    autoFixes,
    stats,
    isLoading
  };
}

/**
 * Hook to check if a specific pipeline dimension needs attention
 */
export function usePipelineDimensionHealth(dimension: PipelineType) {
  const { dimensions, isLoading } = usePipelineStatus();

  const dimensionStatus = useMemo(() => {
    return dimensions.find(d => d.dimension === dimension);
  }, [dimensions, dimension]);

  return {
    status: dimensionStatus?.status || 'healthy',
    issuesCount: dimensionStatus?.issues_count || 0,
    agentResponsible: dimensionStatus?.agent_responsible,
    lastCheck: dimensionStatus?.last_check,
    isLoading
  };
}
