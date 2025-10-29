import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, report_type = 'full', format = 'json' } = await req.json();

    // Generate compliance report using RPC
    const { data: reportData, error } = await supabase
      .rpc('generate_compliance_report', {
        org_id: organization_id || null,
      });

    if (error) throw error;

    if (!reportData || reportData.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'No data available for report',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format as CSV for download
    if (format === 'csv') {
      const headers = [
        'Organization',
        'Total Employees',
        'Trained Employees',
        'Completion Rate (%)',
        'Active Certificates',
        'Expired Certificates',
        'Compliance Score',
        'Risk Level',
      ];

      const rows = reportData.map((row: any) => [
        row.organization_name,
        row.total_employees,
        row.trained_employees,
        row.completion_rate,
        row.active_certificates,
        row.expired_certificates,
        row.compliance_score,
        row.risk_level,
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row: any[]) => row.join(',')),
      ].join('\n');

      return new Response(csv, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="compliance-report-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Return JSON format
    return new Response(
      JSON.stringify({
        success: true,
        report_type,
        generated_at: new Date().toISOString(),
        data: reportData,
        summary: {
          total_organizations: reportData.length,
          average_compliance_score: (
            reportData.reduce((sum: number, row: any) => sum + row.compliance_score, 0) /
            reportData.length
          ).toFixed(2),
          high_risk_count: reportData.filter((row: any) => row.risk_level === 'high').length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Report generation error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
