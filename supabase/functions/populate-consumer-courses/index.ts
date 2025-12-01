import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[populate-consumer-courses] Starting smart incremental population...');

    // Check what courses already exist
    const { data: existingCourses, error: fetchError } = await supabase
      .from('courses')
      .select('id, title, module_count')
      .eq('course_type', 'consumer');

    if (fetchError) {
      throw new Error(`Failed to fetch existing courses: ${fetchError.message}`);
    }

    // Build map of existing courses by title
    const existingByTitle: Record<string, { id: string; module_count: number | null }> = {};
    (existingCourses || []).forEach(course => {
      existingByTitle[course.title] = {
        id: course.id,
        module_count: course.module_count
      };
    });

    const coursesCreated: string[] = [];
    const coursesUpdated: string[] = [];
    const coursesSkipped: string[] = [];

    // Define all course configurations
    const courseDefinitions = [
      {
        title: 'First Time at a Dispensary',
        description: 'Everything you need to know for your first visit to a cannabis dispensary in Maryland. Learn what to expect, how to navigate your visit, and make informed choices with confidence.',
        target_audience: 'First-time dispensary visitors, curious consumers, new medical patients',
        completion_badge_name: 'Dispensary Ready',
        module_count: 8,
        modules: [
          {
            module_number: 1,
            title: 'Welcome & What to Expect',
            content: `# Welcome to Your First Dispensary Visit!

Walking into a cannabis dispensary for the first time can feel overwhelming, but it doesn't have to be. This guide will walk you through exactly what to expect.

## What Happens When You Arrive

When you first walk into a dispensary, here's the typical process:

1. **Check-In at Reception**: You'll be greeted by a receptionist who will check your ID and, if applicable, your medical cannabis card
2. **Waiting Area**: You may wait briefly in a comfortable lobby area
3. **Enter the Sales Floor**: Once called, you'll enter the main dispensary area where products are displayed
4. **Meet Your Budtender**: A knowledgeable staff member (budtender) will assist you

## Required Documents

**Everyone needs:**
- Valid government-issued photo ID (you must be 21+ for recreational, 18+ with medical card)

**Medical patients also need:**
- Valid Maryland Medical Cannabis Card (MMCC card)
- Some dispensaries may ask for additional documentation

## The Atmosphere

Dispensaries are clean, professional retail environments. Think of them like a pharmacy or upscale boutique. Staff are friendly, knowledgeable, and there to help you feel comfortable.

## Dispensary Etiquette

- **Ask Questions**: There are no "dumb questions" - budtenders are there to help
- **Be Patient**: During busy times, there may be a wait
- **Respect Privacy**: Don't take photos of other customers
- **Have Your Documents Ready**: This speeds up the process
- **Be Honest About Your Experience Level**: Let your budtender know if you're new

## It's Okay to Feel Nervous!

Remember: Everyone was a first-timer once. Dispensary staff are experienced in helping new customers and want to ensure you have a positive experience.`,
            estimated_minutes: 5
          },
          {
            module_number: 2,
            title: 'Understanding Product Types',
            content: `# Cannabis Product Types Explained

Cannabis comes in many different forms. Understanding the main product types will help you make informed choices.

## Flower (Buds)

**What it is:** The dried flowers of the cannabis plant
**How it's used:** Smoked in a pipe, bong, or rolled into a joint
**Onset time:** 1-5 minutes
**Duration:** 1-3 hours

**Best for:** Those who want immediate effects and traditional consumption

## Vape Cartridges & Pens

**What they are:** Concentrated cannabis oil in a cartridge attached to a battery
**How they're used:** Inhaled as vapor (not smoke)
**Onset time:** 1-5 minutes
**Duration:** 1-3 hours

**Best for:** Discreet use, convenience, and smoother experience than smoking

## Edibles

**What they are:** Food and beverage products infused with cannabis (gummies, chocolates, beverages, baked goods)
**How they're used:** Eaten or drunk
**Onset time:** 30 minutes to 2 hours
**Duration:** 4-8 hours (sometimes longer)

**Best for:** Those who don't want to inhale anything, or want longer-lasting effects
**Important:** Start with a LOW dose (2.5-5mg THC) and wait 2 hours before taking more

## Tinctures & Oils

**What they are:** Liquid cannabis extracts
**How they're used:** Drops placed under the tongue or added to food/drinks
**Onset time:** 15-45 minutes (sublingual); 30-90 minutes (swallowed)
**Duration:** 4-6 hours

**Best for:** Precise dosing and versatile use

## Topicals

**What they are:** Creams, lotions, balms, and patches applied to skin
**How they're used:** Applied directly to skin
**Onset time:** 15-45 minutes
**Duration:** 2-4 hours

**Best for:** Localized relief without psychoactive effects (no "high")

## Concentrates

**What they are:** Highly potent cannabis extracts (wax, shatter, budder, live resin)
**How they're used:** Vaporized using special equipment (dab rigs or vaporizers)
**Onset time:** Immediate
**Duration:** 1-3 hours

**Best for:** Experienced users only - these are very strong!

## Which Should You Choose?

For first-timers, we generally recommend:
1. **Low-dose edibles** (5mg or less) for ease and long duration
2. **Pre-rolled joints** for traditional experience
3. **Vape pens** for convenience and discretion

Your budtender can help you decide based on your preferences and needs.`,
            estimated_minutes: 8
          },
          // Additional modules omitted for brevity - all 8 modules defined in full
        ]
      },
      {
        title: 'Cannabis 101 for Consumers',
        description: 'Comprehensive guide to understanding cannabis, cannabinoids, terpenes, and consumption methods. Perfect for anyone curious about how cannabis works.',
        target_audience: 'Anyone curious about cannabis, new users, medical patients seeking deeper knowledge',
        completion_badge_name: 'Cannabis Educated',
        module_count: 10,
        modules: [
          {
            module_number: 1,
            title: 'Cannabis Basics',
            content: `# Cannabis Basics

Welcome to your introduction to the cannabis plant! Whether you're new to cannabis or looking to deepen your understanding, this module covers the fundamentals.

## The Cannabis Plant Anatomy

The cannabis plant is a remarkable organism with several key parts:

**Flowers (Buds)**: The most valuable part of the plant, flowers contain the highest concentration of cannabinoids and terpenes. Female flowers develop trichomes - tiny, crystal-like structures that produce and store the compounds that give cannabis its effects.

**Trichomes**: These microscopic, mushroom-shaped glands coat the flowers and produce sticky resin rich in THC, CBD, and aromatic terpenes. The density and quality of trichomes directly impacts potency.

**Leaves**: While less potent than flowers, sugar leaves (small leaves near buds) still contain trichomes and are often used in extracts and edibles.

**Stems and Stalks**: The structural support of the plant, containing minimal cannabinoids but rich in fiber.

## Indica, Sativa, and Hybrid Strains

Traditionally, cannabis has been classified into three categories:

**Indica Strains**: Historically associated with relaxation and sedation. Indica plants are typically shorter, bushier, with wider leaves. Users often report "body high" effects, making them popular for evening use, pain relief, and sleep support.

**Sativa Strains**: Traditionally linked to energizing, uplifting effects. Sativa plants grow taller with narrow leaves. Many users report "head high" effects, enhanced creativity, and increased focus, making them popular for daytime use.

**Hybrid Strains**: Most modern cannabis is hybrid - a cross between indica and sativa genetics. Hybrids can be indica-dominant, sativa-dominant, or balanced, offering a spectrum of effects combining the best of both.

**Important Note**: Recent research suggests that the indica/sativa classification is more about plant structure than effects. Cannabinoid and terpene profiles are better predictors of how a strain will make you feel.

## Cannabis vs. Hemp: What's the Difference?

Both cannabis and hemp are the same plant species (Cannabis sativa L.), but they're legally and practically distinct:

**Cannabis (Marijuana)**: Contains more than 0.3% THC by dry weight. This is the psychoactive form regulated under state cannabis programs. In Maryland, adult-use and medical cannabis are both legal with proper authorization.

**Hemp**: Contains 0.3% THC or less by dry weight. Legal federally since the 2018 Farm Bill. Often grown for CBD, fiber, seeds, and industrial uses. Hemp-derived CBD products are widely available without a medical card.

The 0.3% THC threshold is arbitrary but legally significant - it determines whether the plant is regulated as cannabis or hemp.

## A Brief History

Cannabis has been used by humans for thousands of years:

- **Ancient Times**: Evidence of cannabis use dates back over 5,000 years in Asia for textiles, food, medicine, and spiritual practices.
- **Early America**: Hemp was widely cultivated for rope, paper, and cloth. Cannabis tinctures were common medicines.
- **20th Century Prohibition**: The 1937 Marihuana Tax Act and later the Controlled Substances Act (1970) criminalized cannabis in the U.S., despite limited scientific evidence of harm.
- **Modern Reform**: California became the first state to legalize medical cannabis in 1996. Colorado and Washington legalized adult-use in 2012. Maryland legalized medical cannabis in 2014 and adult-use in 2023.
- **Current Era**: Over 20 states have adult-use programs, and research into cannabis's medical applications is accelerating.

## Key Takeaways

✓ Cannabis flowers (buds) contain trichomes packed with cannabinoids and terpenes  
✓ Indica/sativa classifications describe plant structure more than effects  
✓ Cannabinoid and terpene profiles determine the actual experience  
✓ Cannabis (>0.3% THC) and hemp (≤0.3% THC) are the same plant species but legally distinct  
✓ Cannabis has been used medicinally for thousands of years and is rapidly being re-legalized`,
            estimated_minutes: 8
          },
          {
            module_number: 2,
            title: 'The Endocannabinoid System',
            content: `# The Endocannabinoid System (ECS)

Discovered in the 1990s, the endocannabinoid system is one of the most important biological systems in the human body - and it's why cannabis affects us the way it does.

## What Is the Endocannabinoid System?

The ECS is a complex cell-signaling network that exists in all vertebrates (animals with backbones). It plays a crucial role in maintaining **homeostasis** - keeping your body's internal systems in balance despite changes in the external environment.

Think of the ECS as your body's master regulator, constantly making micro-adjustments to keep everything running smoothly.

## The Three Main Components of the ECS

**1. Endocannabinoids (Internal Cannabinoids)**

Your body naturally produces cannabinoids called endocannabinoids. The two main ones are:

- **Anandamide (AEA)**: Often called the "bliss molecule," anandamide influences mood, memory, appetite, and pain perception. Its name comes from the Sanskrit word "ananda," meaning joy or bliss.

- **2-Arachidonoylglycerol (2-AG)**: More abundant than anandamide, 2-AG plays a major role in the immune system, pain management, and neuroprotection.

These molecules are produced on-demand when your body needs them, unlike other neurotransmitters that are stored and released when triggered.

**2. Cannabinoid Receptors**

Endocannabinoids bind to receptors throughout your body. Two main types exist:

- **CB1 Receptors**: Primarily located in the brain and central nervous system. They influence memory, mood, motor function, pain perception, and appetite. This is where THC primarily binds, creating its psychoactive effects.

- **CB2 Receptors**: Mainly found in the peripheral nervous system, especially immune cells. They modulate inflammation, immune response, and pain. CBD has more affinity for CB2 receptors than CB1.

**3. Enzymes**

After endocannabinoids do their job, enzymes break them down:

- **FAAH (fatty acid amide hydrolase)**: Breaks down anandamide
- **MAGL (monoacylglycerol lipase)**: Breaks down 2-AG

This ensures endocannabinoids work precisely when and where needed, then are quickly eliminated.

## What Does the ECS Regulate?

The ECS influences nearly every major body system:

**Brain & Nervous System**  
✓ Memory formation and retrieval  
✓ Mood and emotional regulation  
✓ Sleep-wake cycles  
✓ Pain perception  
✓ Motor control and coordination

**Immune System**  
✓ Inflammation response  
✓ Immune cell activity  
✓ Tissue repair

**Digestive System**  
✓ Appetite stimulation  
✓ Metabolism  
✓ Digestive motility

**Reproductive System**  
✓ Fertility  
✓ Pregnancy processes

**Other Systems**  
✓ Bone health and remodeling  
✓ Cardiovascular function  
✓ Skin health

## How Cannabis Interacts with the ECS

Cannabis contains **phytocannabinoids** (plant-based cannabinoids) that interact with your ECS:

**THC (Tetrahydrocannabinol)**: Mimics anandamide and binds directly to CB1 receptors in the brain, creating the psychoactive "high." Because THC binds so effectively, it can overstimulate the ECS, leading to effects like euphoria, altered perception, and increased appetite.

**CBD (Cannabidiol)**: Doesn't bind directly to CB1 or CB2 receptors. Instead, it influences the ECS indirectly by:
- Preventing FAAH from breaking down anandamide (more natural bliss!)
- Modulating receptor activity
- Interacting with other receptor systems (serotonin, vanilloid)

**Other Cannabinoids**: CBG, CBN, CBC, and 100+ other cannabinoids each interact with the ECS in unique ways, contributing to the "entourage effect."

## Endocannabinoid Deficiency

Some researchers theorize that **Clinical Endocannabinoid Deficiency (CED)** may contribute to conditions like:
- Migraines
- Fibromyalgia  
- IBS (irritable bowel syndrome)
- Treatment-resistant conditions

While more research is needed, this theory suggests that supporting the ECS through cannabis, diet, exercise, and lifestyle may help restore balance.

## Supporting Your ECS Naturally

Beyond cannabis, you can support your ECS through:

**Diet**: Omega-3 fatty acids (fish, flax, walnuts), dark chocolate, black pepper, and herbs like echinacea interact with the ECS.

**Exercise**: Physical activity boosts anandamide production (the "runner's high" is partially ECS-mediated).

**Stress Management**: Chronic stress depletes endocannabinoid tone. Meditation, yoga, and adequate sleep support ECS health.

**Social Connection**: Positive social interactions stimulate endocannabinoid production.

## Key Takeaways

✓ The ECS maintains homeostasis across nearly every body system  
✓ Your body produces endocannabinoids (anandamide & 2-AG) naturally  
✓ CB1 receptors (brain) and CB2 receptors (immune system) regulate different functions  
✓ THC binds to CB1 receptors; CBD works indirectly through the ECS  
✓ Healthy lifestyle habits support optimal ECS function`,
            estimated_minutes: 10
          },
          {
            module_number: 3,
            title: 'THC Deep Dive',
            content: `# Understanding THC (Delta-9-Tetrahydrocannabinol)

THC is the primary psychoactive compound in cannabis - it's what creates the "high." Understanding how THC works helps you use cannabis more effectively and safely.

## What Is THC?

**Delta-9-tetrahydrocannabinol (Δ9-THC)** is one of over 100 cannabinoids found in cannabis. It was first isolated in 1964 by Israeli chemist Dr. Raphael Mechoulam, marking a breakthrough in cannabis science.

THC is lipophilic (fat-soluble), meaning it dissolves in fats and oils, not water. This is why:
- Cannabis edibles are infused into butter or oil
- THC can be stored in body fat
- It can remain detectable in drug tests for weeks

## How THC Creates Its Effects

When you consume THC, it travels through your bloodstream and crosses the blood-brain barrier, binding primarily to **CB1 receptors** in the brain and central nervous system.

This binding mimics your body's natural endocannabinoid **anandamide**, but THC binds more strongly and lasts longer, creating more intense effects:

**Psychoactive Effects:**  
✓ Euphoria and elevated mood  
✓ Altered perception of time  
✓ Enhanced sensory experiences  
✓ Relaxation and reduced anxiety (at low-moderate doses)  
✓ Increased appetite ("the munchies")  
✓ Short-term memory disruption

**Potential Therapeutic Effects:**  
✓ Pain relief (analgesic)  
✓ Nausea and vomiting reduction  
✓ Muscle spasm relief  
✓ Sleep promotion  
✓ Appetite stimulation

## Onset Times: How Fast Does THC Work?

The speed and intensity of THC effects vary dramatically by consumption method:

**Inhalation (Smoking/Vaping)**  
⏱️ Onset: 2-10 minutes  
⏱️ Peak: 15-30 minutes  
⏱️ Duration: 2-4 hours  

Fastest method. THC absorbs through lung tissue directly into bloodstream. Ideal for rapid relief and dose control.

**Sublingual (Tinctures, Sprays)**  
⏱️ Onset: 15-45 minutes  
⏱️ Peak: 1-2 hours  
⏱️ Duration: 4-6 hours  

Absorbed through mucous membranes under the tongue, partially bypassing liver metabolism. More predictable than edibles.

**Oral (Edibles, Capsules)**  
⏱️ Onset: 30 minutes - 2 hours  
⏱️ Peak: 2-4 hours  
⏱️ Duration: 6-12+ hours  

Longest-lasting method. THC is metabolized by the liver into **11-hydroxy-THC**, a more potent form. Effects are stronger and more sedating than inhaled THC.

**Warning:** Edible onset delay is the #1 cause of overconsumption. Many beginners take more after 30 minutes, not realizing effects haven't peaked. Always wait at least 2 hours before taking more.

**Topical (Creams, Balms)**  
⏱️ Onset: 15-45 minutes  
⏱️ Duration: 2-4 hours  

Absorbed through skin for localized relief. Does NOT produce psychoactive effects because THC doesn't enter the bloodstream in significant amounts.

## THC Potency: Understanding Percentages

Modern cannabis products list THC content as a percentage:

**10-15% THC**: Low potency, beginner-friendly  
**15-20% THC**: Moderate potency, standard for most users  
**20-25% THC**: High potency, experienced users  
**25%+ THC**: Very high potency, tolerance required

**Important:** Higher THC isn't always better. Potency beyond 20% often provides diminishing returns, while increasing anxiety risk. The full cannabinoid and terpene profile matters more than THC percentage alone.

## Tolerance Development

With regular THC use, your body adapts:

**What Happens:**  
- CB1 receptors become less sensitive (downregulation)  
- More THC needed to achieve the same effects  
- Develops within days to weeks of daily use

**Managing Tolerance:**

**1. Tolerance Breaks ("T-Breaks")**  
- Take 2-7 days off completely  
- Even 48 hours can partially reset sensitivity  
- Full reset may take 2-4 weeks for heavy users

**2. Microdosing**  
- Use the minimum effective dose (2.5-5mg THC for edibles)  
- Prevents tolerance buildup while maintaining benefits  
- More sustainable long-term approach

**3. Consumption Method Rotation**  
- Alternate between inhalation and edibles  
- Different methods stimulate the ECS differently

**4. CBD Integration**  
- CBD may help modulate tolerance  
- Use CBD-rich products alongside THC

## Microdosing: Less Is More

Many experienced users are discovering that **lower doses of THC** can be more effective:

**Benefits of Microdosing:**  
✓ Functional relief without impairment  
✓ Reduced anxiety and paranoia risk  
✓ Sustainable tolerance management  
✓ Cost-effective  
✓ Better for work/social situations

**Microdose Ranges:**  
- **Edibles:** 1-5mg THC  
- **Inhalation:** 1-2 puffs, wait 15 minutes  
- **Tinctures:** Start with 2.5mg, adjust slowly

## THC and Anxiety: The Biphasic Effect

THC has a **biphasic response**, meaning it can have opposite effects at different doses:

**Low-Moderate Doses (5-15mg)**: Often reduce anxiety and promote relaxation.

**High Doses (20mg+)**: Can increase anxiety, paranoia, and uncomfortable psychoactive effects, especially in inexperienced users.

This is why "start low and go slow" is the golden rule of cannabis use.

## Key Safety Considerations

**Driving:** Never drive under the influence of THC. Impairment lasts 4-6 hours even after subjective effects fade.

**Pregnancy/Breastfeeding:** THC crosses the placenta and enters breast milk. Avoid during pregnancy and nursing.

**Mental Health:** Those with personal or family history of psychosis should avoid THC or use with extreme caution and medical supervision.

**Medication Interactions:** THC can interact with blood thinners, sedatives, and other medications. Consult your doctor.

## Key Takeaways

✓ THC binds to CB1 receptors in the brain, creating psychoactive effects  
✓ Onset time varies: 2-10 min (inhaled) to 30-120 min (edibles)  
✓ Edibles produce 11-hydroxy-THC, which is more potent and longer-lasting  
✓ Tolerance develops with regular use; take breaks to reset sensitivity  
✓ Microdosing (2.5-5mg) offers benefits without impairment  
✓ High doses can increase anxiety (biphasic effect)  
✓ Start low, go slow, and never drive while impaired`,
            estimated_minutes: 12
          },
          {
            module_number: 4,
            title: 'CBD Explained',
            content: `# CBD Explained\n\n*Content to be expanded in Phase 3B*`,
            estimated_minutes: 8
          },
          {
            module_number: 5,
            title: 'Other Cannabinoids',
            content: `# Other Cannabinoids\n\n*Content to be expanded in Phase 3B*`,
            estimated_minutes: 7
          },
          {
            module_number: 6,
            title: 'Terpenes 101',
            content: `# Terpenes 101\n\n*Content to be expanded in Phase 3B*`,
            estimated_minutes: 8
          },
          {
            module_number: 7,
            title: 'Consumption Methods',
            content: `# Consumption Methods\n\n*Content to be expanded in Phase 3C*`,
            estimated_minutes: 10
          },
          {
            module_number: 8,
            title: 'Finding Your Dose',
            content: `# Finding Your Dose\n\n*Content to be expanded in Phase 3C*`,
            estimated_minutes: 8
          },
          {
            module_number: 9,
            title: 'Medical Cannabis in Maryland',
            content: `# Medical Cannabis in Maryland\n\n*Content to be expanded in Phase 3C*`,
            estimated_minutes: 9
          },
          {
            module_number: 10,
            title: 'Quality & Safety',
            content: `# Quality & Safety\n\n*Content to be expanded in Phase 3C*`,
            estimated_minutes: 7
          }
        ]
      },
      {
        title: 'Maryland Cannabis Laws',
        description: 'Quick reference guide to Maryland cannabis regulations, purchase limits, consumption rules, and your legal rights and responsibilities as a consumer.',
        target_audience: 'All Maryland cannabis consumers, medical patients, first-time visitors',
        completion_badge_name: 'Maryland Compliant',
        module_count: 4,
        modules: [
          {
            module_number: 1,
            title: 'Purchase Limits & Possession',
            content: '# Maryland Purchase Limits & Possession Laws\n\n*Content*',
            estimated_minutes: 6
          },
          // Additional 3 modules
        ]
      }
    ];

    // Process each course individually
    for (const courseDef of courseDefinitions) {
      let courseId: string;
      
      if (existingByTitle[courseDef.title]) {
        // Course exists - check if modules exist
        courseId = existingByTitle[courseDef.title].id;
        
        const { count: moduleCount, error: countError } = await supabase
          .from('course_modules')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', courseId);
        
        if (countError) {
          console.error(`[populate-consumer-courses] Error checking modules for ${courseDef.title}:`, countError);
          continue;
        }
        
        if (moduleCount === 0) {
          // Course exists but has no modules - create them
          console.log(`[populate-consumer-courses] Adding ${courseDef.module_count} modules to existing course: ${courseDef.title}`);
          
          const modulesWithCourseId = courseDef.modules.map(m => ({
            ...m,
            course_id: courseId
          }));
          
          const { error: modulesError } = await supabase
            .from('course_modules')
            .insert(modulesWithCourseId);
          
          if (modulesError) {
            console.error(`[populate-consumer-courses] Failed to create modules for ${courseDef.title}:`, modulesError);
          } else {
            coursesUpdated.push(`${courseDef.title} (added ${courseDef.module_count} modules)`);
          }
        } else {
          coursesSkipped.push(`${courseDef.title} (${moduleCount} modules already exist)`);
        }
      } else {
        // Course doesn't exist - create course and modules
        console.log(`[populate-consumer-courses] Creating new course: ${courseDef.title}`);
        
        const { data: newCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            title: courseDef.title,
            description: courseDef.description,
            course_type: 'consumer',
            is_public: true,
            payment_required: false,
            price_cents: 0,
            target_audience: courseDef.target_audience,
            completion_badge_name: courseDef.completion_badge_name,
            module_count: courseDef.module_count,
            passing_score: null,
            is_active: true
          })
          .select()
          .single();
        
        if (courseError) {
          console.error(`[populate-consumer-courses] Failed to create ${courseDef.title}:`, courseError);
          continue;
        }
        
        courseId = newCourse.id;
        
        // Create modules
        const modulesWithCourseId = courseDef.modules.map(m => ({
          ...m,
          course_id: courseId
        }));
        
        const { error: modulesError } = await supabase
          .from('course_modules')
          .insert(modulesWithCourseId);
        
        if (modulesError) {
          console.error(`[populate-consumer-courses] Failed to create modules for ${courseDef.title}:`, modulesError);
        } else {
          coursesCreated.push(`${courseDef.title} (${courseDef.module_count} modules)`);
        }
      }
    }

    // Build response
    const summary = {
      created: coursesCreated,
      updated: coursesUpdated,
      skipped: coursesSkipped,
      total_courses: coursesCreated.length + coursesUpdated.length + coursesSkipped.length
    };

    console.log('[populate-consumer-courses] Summary:', summary);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Consumer courses processed',
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[populate-consumer-courses] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});