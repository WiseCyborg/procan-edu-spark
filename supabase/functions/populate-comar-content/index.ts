import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// COMAR 14.17.05 RVT Requirements
const comarSections = [
  {
    section_number: "14.17.05.01",
    title: "Scope - Medical Cannabis Dispensary Agent Training",
    content: "This subtitle establishes requirements for responsible vendor training programs that provide education to medical cannabis dispensary agents.",
    plain_language_summary: "This section defines who needs RVT training: all dispensary agents working in Maryland medical cannabis facilities.",
    compliance_tips: "Ensure all dispensary agents complete training before handling cannabis products. Maintain records of all training completions.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.02",
    title: "Definitions - Medical Cannabis Terms",
    content: "Key terms including 'medical cannabis', 'dispensary agent', 'responsible vendor training', and 'certification' are defined for clarity.",
    plain_language_summary: "Defines official terminology used throughout RVT requirements including what counts as a 'dispensary agent' and 'certification'.",
    compliance_tips: "Use official MCA terminology in all documentation. Understand that 'agent' includes all staff handling or accessing cannabis.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "medium"
  },
  {
    section_number: "14.17.05.03",
    title: "Training Program Requirements",
    content: "RVT programs must cover: Maryland cannabis laws, patient rights, security protocols, inventory management, diversion prevention, and standard operating procedures.",
    plain_language_summary: "Required curriculum topics that every approved RVT training must include to meet MCA standards.",
    compliance_tips: "Verify your training covers ALL required topics. Document how each module addresses specific COMAR requirements.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.04",
    title: "Certification Requirements",
    content: "Dispensary agents must pass a comprehensive examination with minimum 80% score to receive certification valid for 2 years.",
    plain_language_summary: "Pass requirements: 80% minimum on final exam, 2-year certificate validity, renewal required every 2 years.",
    compliance_tips: "Track certificate expiration dates. Implement renewal reminders 60 days before expiration. Verify exam integrity controls.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "critical"
  },
  {
    section_number: "14.17.05.05",
    title: "Drug-Free Workplace Policy (COMAR 21.11.08.03)",
    content: "All dispensaries must maintain and enforce drug-free workplace policies compliant with Maryland state law.",
    plain_language_summary: "Dispensaries must have written drug-free workplace policies and train employees on substance abuse prevention.",
    compliance_tips: "Include drug-free workplace module in training. Provide policy template to dispensaries. Document training attendance.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.06",
    title: "Diversion Prevention Protocols",
    content: "Training must cover identification and prevention of cannabis diversion to unauthorized persons or illegal markets.",
    plain_language_summary: "How to recognize and prevent cannabis from being diverted from legal medical use to illegal purposes.",
    compliance_tips: "Include real-world diversion scenarios. Train on red flags, reporting procedures, and legal consequences.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "critical"
  },
  {
    section_number: "14.17.05.07",
    title: "Patient Privacy and HIPAA Compliance",
    content: "Dispensary agents must understand patient privacy rights under HIPAA and Maryland medical cannabis confidentiality laws.",
    plain_language_summary: "Protecting patient medical information and cannabis purchase records from unauthorized disclosure.",
    compliance_tips: "Cover HIPAA basics, Maryland-specific privacy laws, and penalties for violations. Include breach reporting procedures.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.08",
    title: "Product Knowledge and Safety",
    content: "Agents must be trained on cannabis product types, potency, dosing guidelines, potential side effects, and contraindications.",
    plain_language_summary: "Understanding different cannabis products, THC/CBD content, safe consumption methods, and when to refer patients to providers.",
    compliance_tips: "Never provide medical advice. Train agents to refer medical questions to healthcare providers. Focus on product education only.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.09",
    title: "Inventory Tracking and Seed-to-Sale Compliance",
    content: "Training must include Maryland's seed-to-sale tracking system, inventory reconciliation, and reporting requirements.",
    plain_language_summary: "How to use state tracking systems to log every cannabis product from cultivation through sale to patients.",
    compliance_tips: "Provide hands-on training with state tracking software. Cover daily reconciliation procedures and discrepancy reporting.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "critical"
  },
  {
    section_number: "14.17.05.10",
    title: "Security and Access Control",
    content: "Physical security measures, access control systems, surveillance requirements, and incident response protocols.",
    plain_language_summary: "Securing cannabis inventory, controlling facility access, maintaining surveillance, and responding to security breaches.",
    compliance_tips: "Include video surveillance requirements, visitor log procedures, alarm system protocols, and law enforcement coordination.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "high"
  },
  {
    section_number: "14.17.05.11",
    title: "Standard Operating Procedures (SOPs)",
    content: "Dispensaries must maintain written SOPs for all operations and train agents on compliance with established procedures.",
    plain_language_summary: "Creating and following written procedures for every dispensary operation to ensure consistency and compliance.",
    compliance_tips: "Provide SOP templates. Train on documentation importance. Review actual dispensary SOPs during training if available.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "medium"
  },
  {
    section_number: "14.17.05.12",
    title: "Age Verification and Legal Sales",
    content: "Strict age verification (21+) and valid medical cannabis ID card verification required for all sales.",
    plain_language_summary: "Checking government-issued ID and active medical cannabis cards before every sale. Zero tolerance for sales to minors or unauthorized persons.",
    compliance_tips: "Practice ID verification scenarios. Understand fake ID indicators. Know when to refuse a sale and how to report violations.",
    last_mca_review_date: new Date().toISOString(),
    change_impact_level: "critical"
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Populating regulatory_content table with COMAR 14.17.05 sections...');

    const results = [];

    for (const section of comarSections) {
      // Check if section already exists
      const { data: existing } = await supabase
        .from('regulatory_content')
        .select('id')
        .eq('section_number', section.section_number)
        .single();

      if (existing) {
        // Update existing section
        const { error: updateError } = await supabase
          .from('regulatory_content')
          .update(section)
          .eq('section_number', section.section_number);

        results.push({
          section: section.section_number,
          action: 'updated',
          status: updateError ? 'error' : 'success',
          error: updateError?.message
        });
      } else {
        // Insert new section
        const { error: insertError } = await supabase
          .from('regulatory_content')
          .insert(section);

        results.push({
          section: section.section_number,
          action: 'inserted',
          status: insertError ? 'error' : 'success',
          error: insertError?.message
        });
      }
    }

    console.log('Regulatory content population completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'COMAR 14.17.05 sections populated successfully',
        results,
        total_sections: comarSections.length,
        successful: results.filter(r => r.status === 'success').length,
        failed: results.filter(r => r.status === 'error').length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error populating regulatory content:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
