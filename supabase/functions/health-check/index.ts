import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy';
    auth: 'healthy' | 'unhealthy';
    storage: 'healthy' | 'unhealthy';
  };
  metrics: {
    responseTime: number;
    databaseConnections?: number;
    memoryUsage?: number;
  };
  version: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = performance.now();
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Initialize service status
    const services = {
      database: 'unhealthy' as const,
      auth: 'unhealthy' as const,
      storage: 'unhealthy' as const,
    };

    // Test database connection
    try {
      const { error: dbError } = await supabase
        .from('courses')
        .select('id')
        .limit(1);
      
      services.database = dbError ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Test auth service
    try {
      const { error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
      services.auth = authError ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Auth health check failed:', error);
    }

    // Test storage service
    try {
      const { error: storageError } = await supabase.storage.listBuckets();
      services.storage = storageError ? 'unhealthy' : 'healthy';
    } catch (error) {
      console.error('Storage health check failed:', error);
    }

    // Calculate overall status
    const healthyServices = Object.values(services).filter(status => status === 'healthy').length;
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    
    if (healthyServices === 3) {
      overallStatus = 'healthy';
    } else if (healthyServices >= 1) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const responseTime = performance.now() - startTime;

    // Get additional metrics
    const metrics = {
      responseTime: Math.round(responseTime),
      memoryUsage: (Deno.memoryUsage?.() || 0) / (1024 * 1024), // MB
    };

    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services,
      metrics,
      version: Deno.env.get('DEPLOY_VERSION') || '1.0.0',
    };

    // Log health check result
    console.log('Health check completed:', {
      status: overallStatus,
      services,
      responseTime: `${responseTime}ms`,
    });

    // Set appropriate HTTP status code
    let statusCode = 200;
    if (overallStatus === 'degraded') {
      statusCode = 206; // Partial Content
    } else if (overallStatus === 'unhealthy') {
      statusCode = 503; // Service Unavailable
    }

    return new Response(
      JSON.stringify(healthResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        status: statusCode,
      }
    );

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unhealthy',
        auth: 'unhealthy',
        storage: 'unhealthy',
      },
      metrics: {
        responseTime: Math.round(performance.now() - startTime),
      },
      version: 'unknown',
    };

    return new Response(
      JSON.stringify(errorResponse),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 503,
      }
    );
  }
});