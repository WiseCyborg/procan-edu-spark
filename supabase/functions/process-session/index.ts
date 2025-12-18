import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SessionContext {
  sessionId: string;
  sessionType: string;
  organizationId?: string;
  organizationName?: string;
  participants: Array<{
    name: string;
    role: string;
  }>;
  relatedPipelineStage?: string;
}

interface TranscriptSegment {
  speaker: string;
  content: string;
  timestampStart: number;
  timestampEnd?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { sessionId, action, transcriptSegments, audioBase64 } = await req.json();

    if (!sessionId) {
      throw new Error('Session ID is required');
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('covered_sessions')
      .select(`
        *,
        organizations(name)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError) throw sessionError;

    // Get participants
    const { data: participants } = await supabase
      .from('session_participants')
      .select('participant_name, participant_role')
      .eq('session_id', sessionId);

    const context: SessionContext = {
      sessionId,
      sessionType: session.session_type,
      organizationId: session.organization_id,
      organizationName: session.organizations?.name,
      participants: participants?.map(p => ({ name: p.participant_name, role: p.participant_role || 'guest' })) || [],
      relatedPipelineStage: session.related_pipeline_stage,
    };

    if (action === 'transcribe' && audioBase64) {
      // Use OpenAI Whisper for transcription
      const transcriptionResult = await transcribeAudio(audioBase64);
      
      // Store transcript segments
      if (transcriptionResult.segments) {
        for (const segment of transcriptionResult.segments) {
          await supabase.from('session_transcripts').insert({
            session_id: sessionId,
            speaker_name: segment.speaker || 'Unknown',
            content: segment.text,
            timestamp_start: segment.start,
            timestamp_end: segment.end,
            confidence: segment.confidence,
          });
        }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        transcript: transcriptionResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'summarize') {
      // Get all transcripts for the session
      const { data: transcripts } = await supabase
        .from('session_transcripts')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp_start', { ascending: true });

      const fullTranscript = transcripts?.map(t => 
        `[${t.speaker_name}]: ${t.content}`
      ).join('\n') || '';

      // Generate summary using AI
      const summaryResult = await generateSessionSummary(fullTranscript, context);

      // Store summary
      await supabase.from('session_summaries').insert({
        session_id: sessionId,
        executive_summary: summaryResult.executiveSummary,
        key_outcomes: summaryResult.keyOutcomes,
        risks_identified: summaryResult.risksIdentified,
        topics_discussed: summaryResult.topicsDiscussed,
        duration_minutes: session.ended_at && session.started_at 
          ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
          : null,
        participant_count: participants?.length || 0,
        model_used: 'google/gemini-2.5-flash',
      });

      // Store action items
      if (summaryResult.actionItems?.length > 0) {
        for (const action of summaryResult.actionItems) {
          await supabase.from('session_actions').insert({
            session_id: sessionId,
            task_description: action.task,
            owner_name: action.owner,
            due_date: action.dueDate,
            priority: action.priority || 'medium',
            linked_org_id: session.organization_id,
            linked_pipeline_stage: action.linkedPipeline,
          });
        }
      }

      // Store decisions
      if (summaryResult.decisions?.length > 0) {
        for (const decision of summaryResult.decisions) {
          await supabase.from('session_decisions').insert({
            session_id: sessionId,
            decision_text: decision.text,
            decided_by: decision.decidedBy,
            impacted_pipeline: decision.impactedPipeline,
            impacted_org_id: session.organization_id,
            context: decision.context,
          });
        }
      }

      // Update session status
      await supabase.from('covered_sessions')
        .update({ status: 'completed' })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true, 
        summary: summaryResult 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'get_context') {
      // Generate pre-meeting context
      const preContext = await generatePreMeetingContext(context, supabase);
      
      await supabase.from('covered_sessions')
        .update({ pre_meeting_context: preContext })
        .eq('id', sessionId);

      return new Response(JSON.stringify({ 
        success: true, 
        context: preContext 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Session processing error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function transcribeAudio(audioBase64: string): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  // For now, return a placeholder - actual implementation would use Whisper API
  // In production, this would send to OpenAI Whisper or similar
  console.log('Transcription requested, audio length:', audioBase64.length);
  
  return {
    text: 'Transcription placeholder - integrate Whisper API for production',
    segments: [],
  };
}

async function generateSessionSummary(transcript: string, context: SessionContext): Promise<any> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  
  if (!LOVABLE_API_KEY) {
    throw new Error('LOVABLE_API_KEY not configured');
  }

  const sessionTypePrompts: Record<string, string> = {
    training: 'Focus on completion gaps, questions asked, and certification readiness.',
    uat: 'Focus on bugs reported, blockers identified, and reproduction steps.',
    admin_ops: 'Focus on approvals made, seat allocations, and pipeline health decisions.',
    onboarding: 'Focus on registration gaps, invite status, and setup completion.',
    support: 'Focus on access issues identified and account fixes needed.',
    general: 'Provide a general operational summary.',
  };

  const systemPrompt = `You are an AI agent that analyzes meeting transcripts for ProCann Edu, a cannabis training platform.

Session Type: ${context.sessionType}
${context.organizationName ? `Organization: ${context.organizationName}` : ''}
${context.relatedPipelineStage ? `Pipeline Stage: ${context.relatedPipelineStage}` : ''}
Participants: ${context.participants.map(p => `${p.name} (${p.role})`).join(', ')}

${sessionTypePrompts[context.sessionType] || sessionTypePrompts.general}

Analyze the transcript and extract:
1. Executive Summary (2-3 sentences)
2. Key Outcomes (array of outcomes)
3. Risks Identified (array of risks)
4. Topics Discussed (array of topics)
5. Action Items (array with: task, owner, dueDate, priority, linkedPipeline)
6. Decisions (array with: text, decidedBy, impactedPipeline, context)

Return as JSON.`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Analyze this meeting transcript:\n\n${transcript}` },
      ],
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('AI summary error:', error);
    throw new Error('Failed to generate summary');
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      executiveSummary: content,
      keyOutcomes: [],
      risksIdentified: [],
      topicsDiscussed: [],
      actionItems: [],
      decisions: [],
    };
  }
}

async function generatePreMeetingContext(context: SessionContext, supabase: any): Promise<any> {
  const preContext: any = {
    sessionType: context.sessionType,
    organizationName: context.organizationName,
    participantCount: context.participants.length,
    focusAreas: [],
    relevantData: {},
  };

  if (context.organizationId) {
    // Get org stats
    const { data: org } = await supabase
      .from('organizations')
      .select('name, course_credits')
      .eq('id', context.organizationId)
      .single();

    const { count: seatCount } = await supabase
      .from('rvt_seats')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', context.organizationId);

    const { count: certCount } = await supabase
      .from('certificates')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.organizationId); // This would need adjustment for org-level

    preContext.relevantData = {
      organizationName: org?.name,
      allocatedSeats: seatCount || 0,
      certificates: certCount || 0,
    };
  }

  // Add focus areas based on session type
  switch (context.sessionType) {
    case 'training':
      preContext.focusAreas = ['Completion progress', 'Module questions', 'Exam readiness'];
      break;
    case 'uat':
      preContext.focusAreas = ['Bug reports', 'Feature feedback', 'Workflow issues'];
      break;
    case 'admin_ops':
      preContext.focusAreas = ['Pending approvals', 'Seat allocation', 'Pipeline health'];
      break;
    case 'onboarding':
      preContext.focusAreas = ['Registration status', 'Invite completion', 'Setup steps'];
      break;
    case 'support':
      preContext.focusAreas = ['Access issues', 'Account problems', 'Technical support'];
      break;
    default:
      preContext.focusAreas = ['General discussion', 'Updates', 'Planning'];
  }

  return preContext;
}
