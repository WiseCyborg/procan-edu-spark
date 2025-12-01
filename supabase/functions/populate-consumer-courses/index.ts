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

    console.log('[populate-consumer-courses] Starting to populate consumer courses...');

    // Check if courses already exist
    const { data: existingCourses } = await supabase
      .from('courses')
      .select('id, title')
      .eq('course_type', 'consumer');

    if (existingCourses && existingCourses.length > 0) {
      console.log('[populate-consumer-courses] Consumer courses already exist:', existingCourses.map(c => c.title));
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Consumer courses already exist',
          courses: existingCourses
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Course 1: "First Time at a Dispensary"
    const { data: course1, error: course1Error } = await supabase
      .from('courses')
      .insert({
        title: 'First Time at a Dispensary',
        description: 'Everything you need to know for your first visit to a cannabis dispensary in Maryland. Learn what to expect, how to navigate your visit, and make informed choices with confidence.',
        course_type: 'consumer',
        is_public: true,
        payment_required: false,
        price_cents: 0,
        target_audience: 'First-time dispensary visitors, curious consumers, new medical patients',
        completion_badge_name: 'Dispensary Ready',
        module_count: 8,
        passing_score: null,
        is_active: true
      })
      .select()
      .single();

    if (course1Error) {
      throw new Error(`Failed to create Course 1: ${course1Error.message}`);
    }

    console.log('[populate-consumer-courses] Created course:', course1.title);

    // Create modules for Course 1
    const course1Modules = [
      {
        course_id: course1.id,
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
        estimated_minutes: 5,
        is_public: true
      },
      {
        course_id: course1.id,
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
        estimated_minutes: 8,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 3,
        title: 'How to Talk to Your Budtender',
        content: `# Communicating with Your Budtender

Budtenders are knowledgeable cannabis professionals who can help guide you to the right products. Here's how to get the most from your consultation.

## What Budtenders CAN Help With

✅ Explaining product types and consumption methods
✅ Describing effects and experiences (energizing, relaxing, etc.)
✅ Recommending products based on your preferences
✅ Explaining THC/CBD percentages and dosing
✅ Discussing terpenes and flavor profiles
✅ Answering questions about storage and usage
✅ Explaining Maryland cannabis laws

## What Budtenders CANNOT Do

❌ Diagnose medical conditions
❌ Prescribe cannabis for specific ailments
❌ Guarantee specific medical outcomes
❌ Provide detailed medical advice (that's your doctor's role)

## Important Questions to Ask

When talking to your budtender, consider asking:

1. **"This is my first time. What would you recommend?"**
   - Lets them know your experience level

2. **"I'm looking for something [relaxing/energizing/balanced]. What do you suggest?"**
   - Describes the effect you want

3. **"What's the difference between these two products?"**
   - Helps you understand your options

4. **"What's an appropriate starting dose for a beginner?"**
   - Ensures you don't take too much

5. **"How should I store this?"**
   - Keeps your purchase fresh and effective

## How to Describe What You're Looking For

Be honest and specific about:

- **Your experience level**: "I've never tried cannabis before" or "I've tried it a few times"
- **Desired effects**: "I want something to help me relax" or "I'm looking for something uplifting"
- **Consumption preference**: "I don't want to smoke" or "I prefer edibles"
- **Concerns**: "I don't want to feel too intense" or "I have a low tolerance"

## Sample Conversation

**You:** "Hi, this is my first time at a dispensary. I'm looking for something to help me relax in the evening, but I don't want to smoke."

**Budtender:** "Great! I'd recommend starting with a low-dose edible, maybe 5mg THC, or a tincture you can take sublingually. Would you prefer something you can eat, like a gummy, or drops under your tongue?"

**You:** "I think I'd prefer a gummy. What should I know about dosing?"

**Budtender:** "Perfect! Start with one 5mg gummy, wait at least 2 hours to feel the full effect, and don't take more that first time. You can always increase your dose next time if needed."

## Red Flags to Watch For

While most budtenders are professional, be cautious if someone:
- Pressures you to buy expensive products
- Dismisses your concerns
- Makes exaggerated medical claims
- Pushes you to buy more than you want

## Remember

A good budtender wants you to have a positive, safe experience. Don't be afraid to ask questions, and never feel pressured to buy something you're uncomfortable with.`,
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 4,
        title: 'Understanding Labels & Dosing',
        content: `# Reading Product Labels and Understanding Dosing

Cannabis product labels contain important information. Here's how to read them and understand what the numbers mean.

## Key Information on Labels

Every cannabis product label should include:

### 1. THC and CBD Content

**THC (Tetrahydrocannabinol)**
- The primary psychoactive cannabinoid
- Causes the "high" feeling
- Listed as a percentage (flower) or milligrams (edibles)

**CBD (Cannabidiol)**
- Non-intoxicating cannabinoid
- May provide therapeutic benefits
- Can moderate THC effects

**Example Label:**
- Flower: "THC: 22% | CBD: 0.5%"
- Edible: "10mg THC per piece | 2mg CBD per piece"

### 2. Total Cannabinoid Content

Shows the total amount of active cannabinoids in the entire package.

### 3. Serving Size (for edibles)

- Always lists THC/CBD per serving
- Package may contain multiple servings
- Example: "10 pieces per package, 5mg THC each = 50mg total"

### 4. Batch and Test Information

- Lab test results showing purity
- Batch number for tracking
- Contaminant testing (pesticides, mold, etc.)

## Understanding Percentages (Flower)

For flower/bud products:

- **Low potency**: 10-15% THC
- **Medium potency**: 15-20% THC
- **High potency**: 20-25% THC
- **Very high potency**: 25%+ THC

**For beginners:** Start with lower percentages (15% or less)

## Understanding Milligrams (Edibles)

For edibles and tinctures, dosing is measured in milligrams (mg):

### Recommended Starting Doses:

**First-time users:** 2.5-5mg THC
- Effects are mild and manageable
- Easy to increase if needed

**Occasional users:** 5-10mg THC
- Noticeable but comfortable effects

**Regular users:** 10-20mg THC
- More pronounced effects

**Experienced users:** 20mg+ THC
- Strong effects

## The Golden Rule: "Start Low and Go Slow"

This is the most important dosing principle:

1. **Start with the lowest dose** (2.5-5mg for edibles)
2. **Wait for full effects** (2 hours for edibles, 5-10 minutes for inhalation)
3. **Don't take more too soon** - patience is key!
4. **Increase gradually** in future sessions if desired

## Why Is Dosing Important?

**Too little:** May not feel the desired effects (easy to fix next time)
**Too much:** Can be uncomfortable - anxiety, paranoia, dizziness (not dangerous but unpleasant)

## Calculating Your Dose

### Example 1: Edible Gummy
Label says: "100mg THC total, 10 pieces"
- Each piece = 10mg THC
- For a 5mg dose, cut one gummy in half

### Example 2: Tincture
Label says: "30mL bottle, 300mg THC total"
- 1mL dropper = 10mg THC
- For 5mg dose, use half a dropper (0.5mL)

### Example 3: Flower
Label says: "3.5g flower at 20% THC"
- Total THC = 700mg (3500mg × 0.20)
- A typical joint uses 0.5-1g of flower

## Red Flags on Labels

Be cautious if:
- No lab testing information
- Missing THC/CBD content
- No batch or date information
- Unclear serving sizes
- Damaged or altered label

## Storage Instructions on Labels

Labels often include:
- "Keep in a cool, dry place"
- "Keep out of reach of children and pets"
- Expiration or "best by" dates

## Questions to Ask Your Budtender

- "Can you help me understand this label?"
- "What dose would you recommend for a beginner?"
- "How many servings are in this package?"
- "What's the difference in potency between these two products?"

## Remember

When in doubt, always start with a lower dose. You can always take more next time, but you can't take less once you've consumed it!`,
        estimated_minutes: 7,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 5,
        title: 'Maryland Purchase Limits',
        content: `# Maryland Cannabis Purchase Limits and Laws

Understanding purchase limits and regulations helps ensure you stay compliant with Maryland law.

## Medical Cannabis Purchase Limits

Maryland medical cannabis patients can purchase up to a **30-day supply** as determined by their certifying physician.

**Typical limits:**
- This is usually interpreted as 120 grams (about 4.2 ounces) per 30 days
- Limits are tracked electronically through the MMCC system
- Your remaining allotment is checked at each purchase

**Important notes:**
- Concentrates and edibles are converted to flower equivalents
- Different dispensaries may use different conversion formulas
- Always ask your budtender about your remaining allotment

## Recreational Cannabis (If Applicable)

As of this writing, Maryland is transitioning to adult-use recreational cannabis. Check current regulations as limits may vary.

**Expected recreational limits (verify current law):**
- Up to 1-2 ounces of flower per purchase
- Limits on concentrate and edible equivalents
- Must be 21 years or older

## What You CAN Do With Your Purchase

✅ Possess it in the amount purchased legally
✅ Consume it in private residences
✅ Store it securely at home
✅ Share with other adults 21+ (in limited amounts, not for sale)

## What You CANNOT Do

❌ **Sell or distribute** cannabis without a license
❌ **Consume in public places** - this includes:
   - Parks and sidewalks
   - Inside vehicles (even parked)
   - Restaurants and bars
   - Federal property
❌ **Cross state lines** - even to other legal states
❌ **Drive under the influence** - Maryland has DUI laws for cannabis
❌ **Bring it to workplaces, schools, or federal buildings**
❌ **Give or sell to anyone under 21 (or 18 for medical)**

## Traveling with Cannabis in Maryland

**Legal:**
- In your vehicle in a sealed container
- In your trunk or locked glove compartment
- Away from driver's immediate reach

**Illegal:**
- Open containers in passenger area
- Consuming while driving
- Driving while impaired

## Crossing State Lines

**NEVER travel with cannabis across state lines**, even to another legal state. This is a federal offense.

- Maryland to Pennsylvania, Virginia, Delaware, West Virginia, DC - all illegal
- Flying with cannabis - illegal (airports are federal jurisdiction)
- Amtrak or interstate buses - illegal

## Employment and Cannabis

**Know your rights:**
- Employers may still prohibit cannabis use
- Many workplaces have drug-free policies
- Medical cannabis patients have some protections, but not complete immunity
- Safety-sensitive positions (CDL drivers, etc.) may be prohibited from any use

## Keeping Cannabis Away from Minors

**Maryland law requires:**
- Store in child-resistant containers
- Keep out of sight and reach of children
- Never give to anyone under 18 (medical) or 21 (recreational)
- Penalties for providing cannabis to minors are severe

## School and Campus Policies

- Cannabis is prohibited on K-12 school property (even medical)
- Many colleges prohibit possession even if legal off-campus
- Federal student housing follows federal law (cannabis is illegal federally)

## Apartment and Rental Property

- Landlords can prohibit cannabis use in lease agreements
- Smoking may be prohibited even if other use is allowed
- Medical patients have some protections but not absolute rights

## What Happens If You Exceed Limits?

Possessing over the legal limit can result in:
- Confiscation of product
- Fines and penalties
- Criminal charges (for large amounts)
- Loss of medical cannabis card

## Federal Property and Cannabis

Cannabis remains federally illegal. On federal property, including:
- National parks
- Federal buildings
- Military bases
- Post offices
- VA hospitals

**Cannabis is strictly prohibited** regardless of state laws.

## Questions to Ask Your Budtender

- "How much of my 30-day allotment will this use?"
- "What's the equivalent in flower for this edible?"
- "Can I check my remaining allotment?"

## Resources

- **Maryland Medical Cannabis Commission (MMCC)**: Official state resource
- **NORML Maryland**: Advocacy organization with legal information
- **Your dispensary's staff**: Can answer Maryland-specific questions

## Remember

- Keep your receipt with your purchase
- Respect purchase limits
- Consume only in private residences
- Never drive under the influence
- When in doubt, ask!`,
        estimated_minutes: 5,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 6,
        title: 'Payment & Checkout',
        content: `# Payment, Checkout, and Leaving the Dispensary

Understanding the payment process and what happens at checkout will make your dispensary visit smooth and stress-free.

## Payment Methods

### Cash

Most dispensaries operate as **cash-only** or **cash-preferred** businesses.

**Why?** Cannabis is still federally illegal, so most banks won't process cannabis transactions.

**Tips:**
- Bring enough cash for your purchase plus any taxes
- Many dispensaries have ATMs on-site (usually with fees)
- Plan ahead - know roughly how much you want to spend

### Cashless ATM / Debit

Some dispensaries offer "cashless ATM" systems:

**How it works:**
1. You "withdraw" the purchase amount using your debit card
2. The transaction appears as an ATM withdrawal on your bank statement
3. The dispensary receives the cash electronically

**Important:**
- This is technically an ATM withdrawal, not a direct purchase
- Some banks don't allow these transactions
- Small fees may apply

### Credit Cards

Very few dispensaries accept credit cards due to federal restrictions. Don't count on this option.

## Taxes and Fees

Maryland cannabis purchases include taxes:

**Medical cannabis:** Lower tax rate (varies)
**Recreational cannabis:** Higher tax rate (varies)

**Typical breakdown:**
- Product cost: $50
- Sales tax: $3-$7
- Medical excise tax: $0-$2
- **Total: $53-$59**

Ask your budtender for the total before finalizing.

## The Checkout Process

### Step-by-Step Checkout:

1. **Review Your Order**
   - Budtender confirms products and quantities
   - You see the itemized prices
   - Taxes are calculated

2. **Final Total Given**
   - Total cost including all taxes
   - Last chance to add/remove items

3. **Payment**
   - Cash or cashless ATM transaction
   - Receive change if paying cash

4. **Product Packaging**
   - Products placed in sealed, opaque bag
   - Required by law - must be in sealed container
   - Child-resistant packaging for most products

5. **Receive Your Receipt**
   - **Keep this!** It proves legal purchase
   - Should travel with product in vehicle
   - May list purchase limits used (for medical)

6. **Exit**
   - Thank your budtender
   - Exit through designated door

## What's On Your Receipt?

Your receipt should include:
- Dispensary name and license number
- Date and time of purchase
- Products purchased with quantities
- THC/CBD content of each item
- Price breakdown and taxes
- Your ID number (last 4 digits usually)
- Total amount paid

## Product Packaging Requirements

Maryland requires:
- **Opaque, sealed packaging** that you can't see through
- **Child-resistant containers** for most products
- **Labels with warnings** and cannabinoid content
- **Tamper-evident seals**

**Do not open products in the dispensary or parking lot.**

## Checking Your Products

Before you leave:
- Verify you received all items on your receipt
- Check that packaging is sealed and intact
- Ensure child-resistant caps are functional

**But don't open products to inspect contents until you're home.**

## Leaving the Dispensary

### In Your Vehicle:
- Place your purchase in trunk or locked glove box
- Keep receipt with the product
- **Do not open or consume** in vehicle
- **Do not drive if you've consumed** cannabis that day

### Walking or Public Transit:
- Keep purchase in sealed bag
- Keep receipt handy
- Don't open or consume in public

## Common Checkout Mistakes to Avoid

❌ Not bringing enough cash
❌ Opening products before leaving property
❌ Consuming in parking lot or vehicle
❌ Discarding receipt
❌ Leaving products visible in car

## If There's a Problem

**During checkout:**
- Speak up immediately if something seems wrong
- Review your receipt carefully before leaving
- Ask questions if you don't understand charges

**After leaving:**
- Most dispensaries have return policies for unopened, defective products
- Keep packaging and receipt
- Call the dispensary if you notice a problem

## Tipping Your Budtender

Tipping is appreciated but not required:
- **10-15%** is common for excellent service
- **$5-$10** for standard service
- More if they spent extra time helping you

## Rewards and Loyalty Programs

Many dispensaries offer:
- First-time customer discounts (20-25% common)
- Points/rewards for purchases
- Birthday discounts
- Text/email deals

**Ask about:**
- "Do you have a first-time customer discount?"
- "Is there a rewards program I can join?"
- "What's the best way to learn about deals?"

## How Long Does Checkout Take?

**Typical times:**
- **First visit:** 20-30 minutes (includes consultation)
- **Return visits:** 5-15 minutes
- **Busy times:** Add 10-20 minutes

**Busy times are usually:**
- Right after work (5-7 PM)
- Weekends
- Early in the month (when people get paid)

## Final Checklist Before Leaving

✅ All items received and match receipt
✅ Payment complete, change received
✅ Products in sealed, opaque bag
✅ Receipt secured with purchase
✅ Rewards/loyalty program enrolled
✅ Ready to transport properly

## Remember

- Bring cash
- Keep your receipt
- Don't open products until home
- Store properly in vehicle
- Never drive impaired

You're almost ready for your first visit! Next, we'll cover safe and responsible use.`,
        estimated_minutes: 4,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 7,
        title: 'Safe & Responsible Use',
        content: `# Safe and Responsible Cannabis Use

Your safety and wellbeing are the top priorities. This module covers essential safety practices for cannabis use.

## The #1 Rule: Start Low and Go Slow

This cannot be emphasized enough:

**For Edibles:**
- Start with 2.5-5mg THC
- Wait **at least 2 hours** before considering more
- Effects can take 30 minutes to 2 hours to begin
- Effects last 4-8 hours

**For Inhalation (smoking/vaping):**
- Start with 1-2 puffs
- Wait 10-15 minutes between puffs
- Effects begin in 1-5 minutes
- Effects last 1-3 hours

## Never Drive Under the Influence

**Cannabis impairs:**
- Reaction time
- Judgment
- Coordination
- Attention

**Maryland DUI laws apply to cannabis:**
- You can get a DUI even if you're a medical patient
- Blood THC levels can be tested
- Penalties are severe (fines, license suspension, jail time)

**Safe alternatives:**
- Use at home and stay there
- Designated driver
- Rideshare (Uber, Lyft)
- Public transportation
- Wait several hours before driving

## Storage and Security

### Keep Cannabis Secure:

**Required:**
- Child-resistant containers (usually provided)
- Out of reach of children and pets
- In a locked cabinet or container (recommended)

**Best practices:**
- Cool, dark, dry location
- Original packaging when possible
- Clearly labeled
- Separate from regular food items

### Why This Matters:

- Children can mistake edibles for regular candy
- Pets can be seriously harmed by cannabis ingestion
- Unsecured cannabis can be stolen
- Proper storage maintains product quality

## Recognizing Overconsumption

### Signs You've Taken Too Much:

- Anxiety or paranoia
- Rapid heartbeat
- Dizziness or disorientation
- Nausea
- Extreme drowsiness
- Hallucinations (rare but possible)

### What to Do If You've Taken Too Much:

1. **Stay calm** - you cannot overdose fatally on cannabis
2. **Find a safe, comfortable place** to sit or lie down
3. **Hydrate** with water (not alcohol)
4. **Breathe slowly** and deeply
5. **Distract yourself** with calm music or TV
6. **Call a trusted friend** for support
7. **Take CBD** if available (can counteract THC)
8. **Sleep it off** if possible

**When to seek medical help:**
- Persistent chest pain
- Severe panic that doesn't subside
- Concerning symptoms that last hours
- If you've also consumed alcohol or other substances

## Mixing Cannabis with Other Substances

### Avoid Mixing With:

**Alcohol:**
- Intensifies effects of both substances
- Increases likelihood of nausea, dizziness
- Greater impairment

**Prescription Medications:**
- Can interact with sedatives, antidepressants, blood thinners
- Ask your doctor or pharmacist about interactions
- Medical patients should disclose cannabis use to healthcare providers

**Other Drugs:**
- Never mix with illicit drugs
- Can have unpredictable and dangerous effects

## Who Should Avoid Cannabis

**Not recommended for:**
- Pregnant or breastfeeding individuals
- People under 18 (or 21 for recreational)
- Those with personal or family history of psychosis or schizophrenia
- People with severe heart conditions (consult doctor)
- Anyone operating vehicles or heavy machinery

**Use caution if:**
- You have anxiety disorders
- You're taking medications (check interactions)
- You have respiratory issues (avoid smoking)

## Set and Setting

Your experience is influenced by:

**Set (Mindset):**
- Your mood and expectations
- Stress levels
- Mental state

**Setting (Environment):**
- Where you are
- Who you're with
- Comfort and safety of location

**For your first time:**
- Choose a comfortable, safe place (home is ideal)
- Be with trusted friends or alone
- Have no obligations afterward
- Be in a positive mindset

## Dosing Reminders for Different Products

### Edibles:
- Most unpredictable for beginners
- Effects take 30 min - 2 hours
- Start with 2.5-5mg THC
- Never eat more before 2 hours have passed

### Smoking/Vaping:
- Effects are quick (1-5 minutes)
- Easier to control dose
- Start with 1-2 puffs
- Wait 10-15 minutes between sessions

### Tinctures:
- Sublingual (under tongue) = faster (15-45 min)
- Swallowed = slower (30-90 min)
- Easy to measure exact dose
- Start with 2.5-5mg THC

## Developing Tolerance

Regular cannabis use leads to tolerance:
- Need more to achieve same effects
- Can develop faster than expected
- Taking breaks ("T-breaks") resets tolerance

**Tips:**
- Use only when needed, not habitually
- Take tolerance breaks periodically
- Rotate different products and strains
- Keep doses low when possible

## Cannabis and Mental Health

**Positive effects can include:**
- Relaxation
- Stress relief
- Improved mood

**Potential negative effects:**
- Anxiety or paranoia (especially high doses)
- Temporary memory impairment
- Motivation changes with heavy use

**If you experience negative mental health effects:**
- Reduce dose or stop use
- Talk to a healthcare provider
- Consider CBD-rich products (less psychoactive)

## Signs of Problematic Use

Cannabis is generally safe, but be aware of:
- Using to cope with all stress
- Neglecting responsibilities
- Relationship problems due to use
- Difficulty controlling use
- Withdrawal symptoms when stopping

**Resources for support:**
- SAMHSA National Helpline: 1-800-662-4357
- Maryland Addiction Hotline: 1-800-422-0009

## Harm Reduction Principles

1. **Know your dose** - Measure carefully
2. **Know your source** - Buy from licensed dispensaries only
3. **Know your limits** - Respect your tolerance
4. **Stay hydrated** - Drink water
5. **Don't mix substances** - Cannabis alone is safest
6. **Have a plan** - Know how you're getting home
7. **Trust your gut** - If something feels wrong, stop

## Workplace Considerations

- Many employers prohibit cannabis use
- Even medical patients can face workplace restrictions
- Never use before or during work
- Don't bring cannabis to workplace
- Understand your employer's policies

## Social Responsibility

**Be respectful:**
- Don't use in public places
- Don't smoke near non-smokers
- Don't pressure others to use
- Don't drive impaired
- Don't provide to minors

## Emergency Resources

**If you or someone else needs help:**
- Poison Control: 1-800-222-1222
- Emergency: 911
- Crisis Text Line: Text HOME to 741741
- SAMHSA Helpline: 1-800-662-4357

## Key Takeaways

✅ Start with low doses and wait for full effects
✅ Never drive under the influence
✅ Store securely away from children and pets
✅ Stay hydrated and in a safe environment
✅ Know the signs of overconsumption
✅ Avoid mixing with alcohol or other drugs
✅ Respect your limits and tolerance
✅ When in doubt, wait it out

**Cannabis can be used safely and responsibly when you follow these guidelines.**`,
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course1.id,
        module_number: 8,
        title: 'Common Mistakes to Avoid',
        content: `# Common First-Timer Mistakes (And How to Avoid Them)

Learn from others' experiences! Here are the most common mistakes new cannabis users make and how you can avoid them.

## Mistake #1: Taking Too Much Too Soon

**The Problem:**
"I didn't feel anything after 30 minutes, so I ate another edible."

**Why It's a Problem:**
Edibles can take up to 2 hours to kick in. Taking more too soon leads to an overwhelming experience.

**How to Avoid:**
- Set a timer for 2 hours after consuming edibles
- Commit to waiting the full time before taking more
- Remember: you can always take more next time, but you can't take less

## Mistake #2: Mixing Cannabis with Alcohol

**The Problem:**
"I had a few drinks and then smoked. I felt terrible."

**Why It's a Problem:**
Alcohol + cannabis = "crossfading" which intensifies effects of both and often causes:
- Severe dizziness ("the spins")
- Nausea and vomiting
- Increased impairment
- Unpredictable reactions

**How to Avoid:**
- Choose one or the other, not both
- If you do mix (not recommended), use very small amounts of each
- Stay hydrated with water
- Have a trusted friend present

## Mistake #3: Choosing Too High a Potency

**The Problem:**
"The budtender recommended a 30% THC strain for my first time."

**Why It's a Problem:**
High-potency products can be overwhelming for beginners and increase anxiety risk.

**How to Avoid:**
- Specifically ask for beginner-friendly, lower-potency options
- Look for products with balanced THC/CBD
- Start with 10-15% THC flower or 2.5-5mg edibles
- Ignore the "higher percentage = better" mindset

## Mistake #4: Not Reading Product Labels

**The Problem:**
"I didn't realize the package had 10 gummies at 10mg each. I ate three."

**Why It's a Problem:**
Accidentally consuming 30mg instead of 5mg leads to an unpleasant experience for a beginner.

**How to Avoid:**
- Always read the label before consuming
- Identify THC content per serving vs. per package
- Cut gummies or measure tinctures carefully
- When in doubt, ask your budtender to explain

## Mistake #5: Using Cannabis in the Wrong Setting

**The Problem:**
"I tried it for the first time at a crowded party with people I didn't know well."

**Why It's a Problem:**
Uncomfortable environments can lead to anxiety and paranoia, especially for first-timers.

**How to Avoid:**
- First time should be at home or a comfortable, familiar place
- Be with trusted friends or alone
- Have no pressing obligations afterward
- Avoid stressful or unpredictable situations

## Mistake #6: Not Having a Safe Way Home

**The Problem:**
"I drove to the dispensary and then consumed in the parking lot."

**Why It's a Problem:**
- Driving impaired is illegal and dangerous
- Public consumption is illegal in Maryland
- Consuming in a vehicle (even parked) can result in DUI

**How to Avoid:**
- Plan transportation before purchasing
- Consume at home, not at the dispensary
- Use rideshare if needed
- Have a designated driver

## Mistake #7: Improper Storage

**The Problem:**
"I left edibles on the kitchen counter and my roommate's kid thought they were regular gummies."

**Why It's a Problem:**
- Children can accidentally consume cannabis
- Pets can be seriously harmed
- Products degrade when not stored properly
- Legal consequences for unsecured cannabis

**How to Avoid:**
- Keep cannabis in child-resistant, locked storage
- Store in cool, dark, dry place
- Keep separate from regular food
- Use original packaging with labels
- Tell household members where cannabis is stored

## Mistake #8: Mixing Different Product Types

**The Problem:**
"I vaped and then took an edible at the same time."

**Why It's a Problem:**
Different products have different onset times and durations. Combining them makes it hard to gauge total dose.

**How to Avoid:**
- Stick to one product type per session
- Wait for full effects before trying something else
- Keep a journal of what works for you
- Don't stack different cannabis products

## Mistake #9: Not Staying Hydrated

**The Problem:**
"I got really dry mouth and felt dehydrated and dizzy."

**Why It's a Problem:**
Cannabis causes "cottonmouth" and can be dehydrating, making you feel worse.

**How to Avoid:**
- Drink water before, during, and after using cannabis
- Avoid caffeine and alcohol which further dehydrate
- Have water readily available
- Consider having snacks on hand (you may get "munchies")

## Mistake #10: Skipping the Research

**The Problem:**
"I just walked in and bought whatever looked cool without knowing what it was."

**Why It's a Problem:**
Different products have very different effects, potencies, and onset times.

**How to Avoid:**
- Read guides like this one before your visit
- Ask questions at the dispensary
- Research product types and effects
- Start with well-reviewed beginner products
- Don't be afraid to say "I'm new to this"

## Mistake #11: Ignoring Tolerance Differences

**The Problem:**
"My friend takes 20mg edibles, so I thought I could too."

**Why It's a Problem:**
Cannabis tolerance varies widely between individuals based on:
- Body weight and metabolism
- Previous cannabis use
- Genetics
- Other medications

**How to Avoid:**
- Never compare your dose to someone else's
- Start with recommended beginner doses regardless of others
- Build up your own tolerance slowly
- Listen to your body, not peer pressure

## Mistake #12: Consuming on an Empty Stomach (Edibles)

**The Problem:**
"I ate an edible first thing in the morning on an empty stomach and it hit WAY too hard."

**Why It's a Problem:**
Empty stomach can lead to faster, more intense absorption and sometimes nausea.

**How to Avoid:**
- Eat a light meal before taking edibles
- Avoid very fatty foods (can increase absorption)
- Have snacks available for after
- Take edibles in late afternoon/evening, not first thing in the morning

## Mistake #13: Not Checking Legal Restrictions

**The Problem:**
"I brought cannabis to my apartment complex and got in trouble with my landlord."

**Why It's a Problem:**
Legal purchase doesn't mean you can use anywhere. Restrictions include:
- Rental property rules
- College campuses
- Workplaces
- Public spaces

**How to Avoid:**
- Read your lease agreement
- Check workplace policies
- Understand Maryland public consumption laws
- When in doubt, consume only in your private residence

## Mistake #14: Buying More Than You Need

**The Problem:**
"I got excited and bought six different products on my first visit. I have no idea where to start."

**Why It's a Problem:**
- Overwhelming to choose what to try
- Products may expire before you use them
- Expensive upfront cost
- Harder to track what works for you

**How to Avoid:**
- Start with one product for your first purchase
- Try it several times before buying more
- Take notes on your experience
- Gradually expand your collection

## Mistake #15: Not Telling Anyone What You're Doing

**The Problem:**
"I tried cannabis alone for the first time and got anxious with no one to talk to."

**Why It's a Problem:**
Having support available can make you feel more comfortable and safe.

**How to Avoid:**
- Tell a trusted friend what you're doing
- Make sure someone you trust is available by phone
- Consider trying it with an experienced, trustworthy friend present
- Never feel like you have to hide responsible use

## Red Flags: When to Stop and Reassess

Stop using cannabis if you experience:
- Frequent anxiety or panic when using
- Interference with daily responsibilities
- Relationship problems due to use
- Using to cope with all difficult emotions
- Difficulty limiting use
- Negative impacts on mental health

## Success Tips from Experienced Users

✅ "Start with edibles in the evening at home"
✅ "Keep a journal of what works and what doesn't"
✅ "Don't be embarrassed to ask 'dumb' questions"
✅ "Have activities planned - movies, music, snacks"
✅ "Remember that a 'bad experience' is temporary"
✅ "Be patient with yourself and the process"
✅ "It's okay if cannabis isn't for you"

## Final Wisdom

The mistakes above are **normal** and **common**. Even experienced users made similar errors when starting out. The key is:

1. **Learn from others' experiences**
2. **Start slow and be patient**
3. **Listen to your body**
4. **Don't be afraid to ask questions**
5. **Remember that everyone's first time is different**

**You're now equipped to avoid the most common pitfalls and have a positive first dispensary experience!**

---

## Congratulations! 🎉

You've completed the "First Time at a Dispensary" course. You now know:

✅ What to expect at a dispensary
✅ Different product types and how to use them
✅ How to communicate with budtenders
✅ How to read labels and dose properly
✅ Maryland's cannabis laws and purchase limits
✅ Payment and checkout procedures
✅ Safe and responsible use practices
✅ Common mistakes to avoid

**You're ready for your first visit!**

Enter your email on the next screen to receive your "Dispensary Ready" certificate.`,
        estimated_minutes: 5,
        is_public: true
      }
    ];

    const { error: modulesError } = await supabase
      .from('course_modules')
      .insert(course1Modules);

    if (modulesError) {
      throw new Error(`Failed to create Course 1 modules: ${modulesError.message}`);
    }

    console.log('[populate-consumer-courses] Created 8 modules for Course 1');

    // Create Course 2: "Cannabis 101 for Consumers"
    const { data: course2, error: course2Error } = await supabase
      .from('courses')
      .insert({
        title: 'Cannabis 101 for Consumers',
        description: 'Comprehensive guide to understanding cannabis, cannabinoids, terpenes, and consumption methods. Perfect for anyone curious about how cannabis works.',
        course_type: 'consumer',
        is_public: true,
        payment_required: false,
        price_cents: 0,
        target_audience: 'Anyone curious about cannabis, new users, medical patients seeking deeper knowledge',
        completion_badge_name: 'Cannabis Educated',
        module_count: 10,
        passing_score: null,
        is_active: true
      })
      .select()
      .single();

    if (course2Error) {
      throw new Error(`Failed to create Course 2: ${course2Error.message}`);
    }

    console.log('[populate-consumer-courses] Created course:', course2.title);

    // Create abbreviated modules for Course 2 (full content can be added later)
    const course2Modules = [
      {
        course_id: course2.id,
        module_number: 1,
        title: 'Cannabis Basics',
        content: '# Cannabis Basics\n\nLearn the fundamentals of the cannabis plant, its history, and the difference between cannabis and hemp.\n\n*Content to be expanded*',
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 2,
        title: 'The Endocannabinoid System',
        content: '# The Endocannabinoid System\n\nDiscover how your body naturally interacts with cannabis compounds.\n\n*Content to be expanded*',
        estimated_minutes: 7,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 3,
        title: 'THC Deep Dive',
        content: '# THC Deep Dive\n\nUnderstand THC - the primary psychoactive compound in cannabis.\n\n*Content to be expanded*',
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 4,
        title: 'CBD Deep Dive',
        content: '# CBD Deep Dive\n\nExplore CBD and its non-intoxicating therapeutic potential.\n\n*Content to be expanded*',
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 5,
        title: 'Other Cannabinoids',
        content: '# Other Cannabinoids\n\nLearn about CBG, CBN, THCV, and the entourage effect.\n\n*Content to be expanded*',
        estimated_minutes: 7,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 6,
        title: 'Terpenes 101',
        content: '# Terpenes 101\n\nDiscover aromatic compounds that influence cannabis effects.\n\n*Content to be expanded*',
        estimated_minutes: 8,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 7,
        title: 'Consumption Methods',
        content: '# Consumption Methods\n\nCompare different ways to consume cannabis and their effects.\n\n*Content to be expanded*',
        estimated_minutes: 8,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 8,
        title: 'Finding Your Dose',
        content: '# Finding Your Dose\n\nLearn how to find your optimal cannabis dosage.\n\n*Content to be expanded*',
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 9,
        title: 'Medical Cannabis in Maryland',
        content: '# Medical Cannabis in Maryland\n\nUnderstand the medical cannabis program in Maryland.\n\n*Content to be expanded*',
        estimated_minutes: 7,
        is_public: true
      },
      {
        course_id: course2.id,
        module_number: 10,
        title: 'Quality & Safety',
        content: '# Quality & Safety\n\nLearn about lab testing, quality assurance, and safe storage.\n\n*Content to be expanded*',
        estimated_minutes: 6,
        is_public: true
      }
    ];

    const { error: course2ModulesError } = await supabase
      .from('course_modules')
      .insert(course2Modules);

    if (course2ModulesError) {
      throw new Error(`Failed to create Course 2 modules: ${course2ModulesError.message}`);
    }

    console.log('[populate-consumer-courses] Created 10 modules for Course 2');

    // Create Course 3: "Maryland Cannabis Laws"
    const { data: course3, error: course3Error } = await supabase
      .from('courses')
      .insert({
        title: 'Maryland Cannabis Laws',
        description: 'Quick reference guide to Maryland cannabis regulations, purchase limits, consumption rules, and your legal rights and responsibilities as a consumer.',
        course_type: 'consumer',
        is_public: true,
        payment_required: false,
        price_cents: 0,
        target_audience: 'All Maryland cannabis consumers, medical patients, first-time visitors',
        completion_badge_name: 'Maryland Compliant',
        module_count: 4,
        passing_score: null,
        is_active: true
      })
      .select()
      .single();

    if (course3Error) {
      throw new Error(`Failed to create Course 3: ${course3Error.message}`);
    }

    console.log('[populate-consumer-courses] Created course:', course3.title);

    // Create modules for Course 3
    const course3Modules = [
      {
        course_id: course3.id,
        module_number: 1,
        title: 'Purchase Limits & Possession',
        content: `# Maryland Purchase Limits & Possession Laws

Maryland cannabis laws define clear limits on how much you can purchase and possess.

## Medical Cannabis Limits

**30-Day Supply**: Medical patients can purchase up to a 30-day supply as determined by their certifying physician.

**Typical Limits:**
- 120 grams (approximately 4.2 ounces) of flower per 30 days
- Equivalent amounts of concentrates and edibles (conversion formulas vary)
- Limits tracked electronically through MMCC system

**Important Notes:**
- Your dispensary tracks your remaining allotment automatically
- Different product types are converted to flower equivalents
- Ask your budtender about your remaining balance

## Recreational Cannabis Limits

**Adult-Use Purchase Limits:**
- Up to 1.5 ounces of flower per purchase
- Equivalent limits for concentrates and edibles
- Must be 21 years or older

## Possession Limits

**What You Can Legally Possess:**
- Amount purchased legally from licensed dispensary
- Keep products in original sealed packaging
- Store with receipt as proof of legal purchase

**Multiple Purchases:**
- Wait appropriate time between purchases
- Don't exceed daily/monthly limits
- Dispensary systems prevent over-purchasing

## What You Cannot Do

❌ Sell or distribute cannabis without a license
❌ Give to anyone under 21 (or 18 for medical)
❌ Possess more than legal limits
❌ Purchase from unlicensed sources
❌ Cross state lines with cannabis

## Penalties for Exceeding Limits

**Consequences:**
- Confiscation of excess product
- Fines and penalties
- Possible criminal charges (large amounts)
- Loss of medical cannabis card

## Federal Property

Cannabis remains illegal on ALL federal property:
- National parks
- Federal buildings
- Military bases
- Post offices
- Airports

## Your Rights

**Legal Possession Means:**
- Police cannot seize legal amounts
- No arrest for compliant possession
- Protection under Maryland state law
- Access to legal dispute resolution

**Medical Patients Have Additional Protection:**
- Employment protections (limited)
- Housing protections (limited)
- Custody considerations
- Medical record privacy

## Best Practices

✅ Keep receipts with products
✅ Store in original packaging
✅ Know your limits before shopping
✅ Track your purchases (medical patients)
✅ Stay informed of law changes

## Resources

- Maryland Medical Cannabis Commission (MMCC)
- Your dispensary's compliance team
- NORML Maryland chapter
- Local law enforcement non-emergency line`,
        estimated_minutes: 6,
        is_public: true
      },
      {
        course_id: course3.id,
        module_number: 2,
        title: 'Where You Can Use Cannabis',
        content: `# Where You Can Use Cannabis in Maryland

Maryland law strictly regulates where cannabis can be consumed. Understanding these rules helps you stay compliant and respectful.

## Legal Consumption Locations

### Private Residences
**✅ Legal:**
- Your own home or apartment (unless lease prohibits)
- Friend's or family member's private residence (with permission)
- Private property with owner consent

**Requirements:**
- Must be indoors or in private outdoor areas
- Cannot be visible from public areas
- Respectful of neighbors and property rules

### Your Vehicle (Not While Driving)
**❌ Illegal to Consume:**
- Even when parked
- Even in your own driveway
- Anywhere in or around the vehicle

**⚠️ Important:**
- Consuming in a vehicle can result in DUI charges
- Open containers in vehicle passenger area are illegal

## Illegal Consumption Locations

### Public Places - Strictly Prohibited
❌ Parks and playgrounds
❌ Sidewalks and streets
❌ Parking lots (including dispensary parking lots)
❌ Restaurants and bars
❌ Hotels and motels (unless property allows)
❌ Concert venues and festivals
❌ Beaches and boardwalks
❌ Public transportation

### Government and Public Buildings
❌ Schools and universities
❌ Libraries
❌ Government offices
❌ Courthouses
❌ Public hospitals
❌ Polling places

### Workplaces
❌ Most workplaces prohibit use on premises
❌ During work hours (even medical patients)
❌ In company vehicles
❌ On employer property

**Note:** Some employers may allow off-duty medical use, but this varies by workplace policy.

## Special Considerations

### Rental Properties
- **Landlords can prohibit** cannabis use in lease agreements
- **Smoking may be banned** even if other consumption allowed
- **Medical patients** have limited protections but not absolute rights
- **Check your lease** before consuming

### College Campuses
- Most prohibit possession and use on campus
- Federal student housing follows federal law (illegal)
- Violation can result in disciplinary action or loss of housing

### Apartment Buildings
- **Smoke-free buildings** prohibit smoking cannabis
- **Common areas** (hallways, elevators, lobbies) are public space
- **Balconies** may or may not be allowed (check rules)
- **Edibles and tinctures** may be allowed where smoking isn't

## Maryland's Public Consumption Law

**Penalties for Public Use:**
- Civil citation and fine
- Confiscation of product
- Court appearance may be required
- Repeat offenses = increasing penalties

**First Offense:**
- Typically $50-$150 fine
- Cannabis confiscated
- No jail time (usually)

**Subsequent Offenses:**
- Higher fines
- Possible misdemeanor charges
- Court costs and fees

## Respectful Consumption

### Be a Good Neighbor
- Keep odors contained
- Don't smoke near air intakes or shared ventilation
- Use edibles or tinctures in shared housing
- Respect neighbors' concerns and preferences

### Discretion Matters
- Even legal use can create conflicts
- Consider impact on others
- Use methods with minimal odor when possible
- Store products securely and out of sight

## Travel Considerations

### Within Maryland
✅ Transport in sealed containers in trunk
✅ Keep receipt with product
❌ Never consume while traveling
❌ Never open containers in vehicle

### Leaving Maryland
❌ **NEVER cross state lines** with cannabis
❌ Illegal even to other legal states
❌ Federal law applies at borders
❌ Severe penalties including federal charges

### Airports
❌ TSA is federal agency - cannabis illegal
❌ Don't bring to airport even for Maryland flights
❌ Medical patients have no exception
❌ Can result in arrest and prosecution

## Medical Cannabis Protections

**Limited Protections for Medical Patients:**
- Cannot be arrested for legal possession
- Some employment protections
- Some housing protections
- Custody considerations in family court

**No Protection From:**
- Federal law enforcement
- Workplace drug testing (in most cases)
- Operating vehicles while impaired
- Public consumption laws

## Business Policies

### Dispensaries
- No consumption on property
- No consumption in parking lot
- Take products home to consume

### Hotels and Lodging
- Most prohibit smoking in rooms
- Some allow edibles/tinctures
- Check property policy before booking
- Designated smoking areas usually don't allow cannabis

## Best Practices for Compliant Use

✅ Only consume in private residences
✅ Get permission from property owner
✅ Check lease and property rules
✅ Use odor-reducing methods
✅ Be respectful of others
✅ Never consume in vehicles
✅ Keep products secure and private

## When in Doubt

**If you're unsure if consumption is legal:**
- Assume it's not allowed
- Ask the property owner
- Wait until you're in a clearly private space
- Use more discreet consumption methods

**Remember: Legal purchase doesn't mean legal use everywhere. When in doubt, wait until you're in your private residence.**`,
        estimated_minutes: 7,
        is_public: true
      },
      {
        course_id: course3.id,
        module_number: 3,
        title: 'Transportation & Travel Laws',
        content: `# Transportation & Travel Laws for Cannabis in Maryland

Safely and legally transporting cannabis requires understanding Maryland's specific rules and federal restrictions.

## Transporting Cannabis in Maryland

### Proper Transport in Your Vehicle

**✅ Legal Requirements:**
- Keep products in **original sealed containers**
- Store in **trunk or locked glove compartment**
- Keep **away from driver's immediate reach**
- Keep **receipt with products** as proof of legal purchase

**❌ Illegal Actions:**
- Open containers in passenger area
- Products within driver's reach
- Consuming in vehicle (even when parked)
- Products in cup holders or center console
- Loose products (not in original packaging)

### Why These Rules Matter

**Legal Protection:**
- Sealed containers prove you're not consuming while driving
- Receipts prove legal purchase
- Proper storage shows compliance with law

**Safety:**
- Prevents accidental consumption by passengers
- Keeps products secure
- Reduces odor complaints

## Never Drive Under the Influence

### Maryland DUI Laws Apply to Cannabis

**You can be charged with DUI if:**
- Driving while impaired by cannabis
- Blood test shows THC presence
- Officer observes impairment
- Fail field sobriety tests

**Penalties:**
- License suspension
- Fines ($500-$2000+)
- Possible jail time
- Criminal record
- Increased insurance rates
- Ignition interlock device

**Medical Patients Have No Exception:**
- Medical card doesn't protect against DUI
- Same penalties apply
- Can lose medical cannabis privileges

### Signs of Cannabis Impairment

Police look for:
- Slow reaction times
- Difficulty maintaining lane
- Delayed responses
- Smell of cannabis
- Red eyes
- Disoriented behavior
- Failed sobriety tests

### How Long to Wait Before Driving

**General Guidelines:**
- **Smoking/Vaping**: Wait at least 3-4 hours
- **Edibles**: Wait at least 6-8 hours (or don't drive that day)
- **Tinctures**: Wait 4-6 hours
- **High doses**: Wait longer or don't drive that day

**Everyone metabolizes differently - when in doubt, don't drive.**

## Traveling with Cannabis

### Within Maryland - Legal Options

**✅ Allowed:**
- Driving between dispensaries and home
- Transporting to friend's private residence
- Moving between your properties

**Requirements:**
- Products in trunk in sealed containers
- No consumption during transport
- Keep receipts with products
- Respect all local ordinances

### Crossing State Lines - STRICTLY ILLEGAL

**❌ NEVER Legal:**
- Taking cannabis to any other state
- Even to states where cannabis is legal
- Even for medical patients
- Even tiny amounts

**Federal Law:**
- Crossing state lines = federal crime
- Drug trafficking charges possible
- Mandatory minimum sentences may apply
- Can face federal prosecution

**Border States:**
- Pennsylvania: Illegal
- Delaware: Illegal
- Virginia: Illegal
- West Virginia: Illegal
- Washington, DC: Illegal to bring in (despite local legality)

### Airports and Air Travel

**TSA is a Federal Agency:**
❌ Cannabis illegal at all airports
❌ Illegal in checked bags
❌ Illegal in carry-on bags
❌ Medical patients have no exception
❌ "Legal state to legal state" doesn't matter

**Consequences:**
- Product confiscation
- Missed flight
- Possible arrest
- Federal charges
- Fines and prosecution
- Travel bans

**TSA Policy:**
- Required to report cannabis to law enforcement
- Local police called to handle
- Outcome depends on local policy
- Federal charges possible

### Amtrak and Interstate Buses

**Federal Property = Federal Law:**
❌ Cannabis prohibited on Amtrak (federal railway)
❌ Interstate buses (Greyhound, etc.) prohibit cannabis
❌ Federal charges possible if caught
❌ No medical patient exceptions

## Public Transportation in Maryland

**Local Buses and Metro:**
- Cannabis possession may be allowed (if sealed, legal amount)
- **Consumption strictly prohibited**
- Can result in citation or arrest
- Products must be concealed and sealed

**Rideshare (Uber, Lyft):**
- Check company policies
- Most prohibit consumption in vehicles
- Keep products sealed and concealed
- Driver can refuse service
- Be respectful of driver

## Shipping Cannabis

**❌ Completely Illegal:**
- USPS: Federal offense
- FedEx/UPS: Against company policy and illegal
- Within Maryland: Still illegal
- Between states: Federal trafficking charge

**Even for Medical Patients:**
- No mailing prescriptions
- No shipping to family members
- No mail-order from dispensaries

## Special Scenarios

### Moving to Another State
❌ Cannot bring cannabis when moving
❌ Must consume or dispose before leaving Maryland
❌ Start fresh in new state (if legal there)
❌ Don't risk federal charges for moving day

### Temporary Work Assignments
❌ Cannot bring cannabis to work in other states
❌ Cannot use Maryland medical card elsewhere (with rare exceptions)
❌ Follow laws of state where you're working

### Vacation Travel
**Within Maryland:**
✅ Can bring legal amounts to vacation rental
✅ Store properly and respect property rules
✅ Transport in trunk in sealed containers

**Out of State:**
❌ Leave cannabis at home
❌ Don't risk vacation becoming jail time
❌ Purchase in destination if legal there

## Law Enforcement Interactions

### If Pulled Over with Cannabis

**Do:**
- Be polite and respectful
- Inform officer of products in trunk
- Show receipt proving legal purchase
- Explain products are sealed and secured

**Don't:**
- Lie about having cannabis
- Admit to consuming before driving
- Consent to searches without understanding rights
- Be confrontational or argumentative

### If Products Are Illegal
- Out of original packaging
- Open container in passenger area
- Amount exceeds limits
- Receipt doesn't match products

**Expect:**
- Product confiscation
- Possible citation
- Possible arrest (if excessive amount)
- Court date

## Best Practices Summary

✅ **Transport only:**
- In original sealed containers
- In trunk or locked compartment
- With receipt attached
- Directly home from dispensary

✅ **Never:**
- Consume in vehicles
- Drive while impaired
- Cross state lines
- Bring to airports
- Ship via mail

✅ **Wait before driving:**
- 3-4 hours (minimum) after smoking/vaping
- 6-8 hours after edibles
- Overnight for high doses
- Use rideshare if unsure

## Emergency Contacts

**If arrested or charged:**
- Contact attorney immediately
- Don't answer questions without lawyer
- Document everything
- Keep receipts and medical documentation

**Resources:**
- Maryland NORML legal hotline
- Medical Cannabis Commission
- Criminal defense attorney
- Local public defender's office

**Remember: Cannabis is still federally illegal. Any travel involving federal property, interstate commerce, or crossing state lines is a federal crime with serious consequences.**`,
        estimated_minutes: 8,
        is_public: true
      },
      {
        course_id: course3.id,
        module_number: 4,
        title: 'Your Rights & Responsibilities',
        content: `# Your Rights & Responsibilities as a Maryland Cannabis Consumer

Understanding your legal rights and responsibilities ensures you can access cannabis safely while staying compliant with Maryland law.

## Your Legal Rights as a Consumer

### Right to Purchase and Possess
✅ Purchase from licensed Maryland dispensaries
✅ Possess legal amounts as defined by Maryland law
✅ Transport properly in sealed containers
✅ Consume in private residences with permission
✅ Protection from arrest for legal possession and use

### Medical Patient Rights (Additional)
✅ Employment protections (limited - varies by employer)
✅ Housing protections (limited - landlords can still restrict)
✅ Access to medical cannabis program
✅ Privacy of medical records
✅ Consultation with healthcare providers
✅ Can designate caregiver to purchase on your behalf

### Right to Quality Products
✅ Lab-tested products meeting Maryland standards
✅ Accurate labeling of THC/CBD content
✅ Child-resistant packaging
✅ Clean, safe products free from contaminants
✅ Return defective unopened products (varies by dispensary)

### Right to Information
✅ Consult knowledgeable budtenders
✅ Ask questions about products and effects
✅ Access product testing results
✅ Understand dosing recommendations
✅ Know your purchase limits and remaining allotment

### Right to Privacy
✅ Dispensary cannot share your purchase history
✅ Medical information is confidential (HIPAA protected)
✅ MMCC registration data is private
✅ Police need probable cause for cannabis-related stops

## Your Legal Responsibilities

### Compliance with Purchase Limits
**You MUST:**
- Stay within 30-day medical limits (or recreational limits)
- Allow dispensary to track your allotment
- Wait appropriate time between purchases
- Not use multiple dispensaries to exceed limits

**You MUST NOT:**
- Purchase from unlicensed sources
- Buy for others (unless registered caregiver)
- Exceed daily or monthly purchase limits

### Consumption Location Rules
**You MUST:**
- Consume only in private residences (with permission)
- Respect property owner/landlord rules
- Keep consumption private and discreet
- Use odor-reducing methods when considerate

**You MUST NOT:**
- Consume in public places
- Consume in vehicles
- Consume on federal property
- Consume in view of minors

### Storage and Security
**You MUST:**
- Keep cannabis in child-resistant containers
- Store out of reach of children and pets
- Keep products in original packaging with labels
- Secure cannabis to prevent theft or unauthorized access

**You MUST NOT:**
- Leave cannabis accessible to minors
- Store with regular food items (edibles)
- Display openly in public view
- Give cannabis to anyone under 21 (18 for medical)

### Transportation Compliance
**You MUST:**
- Transport in sealed containers in trunk
- Keep receipt with products
- Ensure products are not in driver's reach
- Never drive while impaired

**You MUST NOT:**
- Open containers in vehicles
- Consume during transport
- Cross state lines with cannabis
- Bring cannabis to airports

### Respect for Others
**You MUST:**
- Be considerate of neighbors and roommates
- Respect smoke-free housing policies
- Keep odors contained
- Be discreet about your use
- Not pressure others to use cannabis

**You MUST NOT:**
- Provide cannabis to minors
- Use in a way that disturbs others
- Endanger others while impaired
- Force cannabis use on anyone

## Minors and Cannabis

### Strict Prohibition
❌ **Never** provide cannabis to anyone under 21 (recreational) or 18 (medical)
❌ Includes your own children (with rare medical exceptions)
❌ Severe penalties including jail time
❌ Loss of custody possible

### Parental Responsibilities
**If you're a parent who uses cannabis:**
- Store securely in locked container
- Keep completely out of children's reach
- Never use around children
- Don't leave in accessible areas
- Dispose of packaging safely
- Educate older teens about risks

**Medical Cannabis for Minors:**
- Requires specific medical recommendation
- Parent must be registered caregiver
- Special rules apply
- Highly regulated process

## Workplace Considerations

### Employer Rights
**Employers CAN:**
- Prohibit cannabis use (even for medical patients)
- Drug test employees
- Terminate for positive tests
- Restrict use during work hours
- Prohibit bringing cannabis to workplace

### Employee Protections (Limited)
**Medical patients have some protections:**
- Cannot be discriminated against for being registered (varies)
- Off-duty medical use may be protected (not all employers)
- Workplace accommodation may be available (case-by-case)

**However, employers can still:**
- Require drug-free workplace
- Test safety-sensitive positions
- Enforce no-impairment policies

### Best Practices for Employees
- Know your employer's policy
- Don't use before or during work
- Keep medical status private if possible
- Don't bring cannabis to workplace
- Follow federal contractor rules if applicable

## Federal Law Conflicts

### Cannabis is Still Federally Illegal
**This means:**
- Federal employees cannot use (even medical)
- Federal contractors may be prohibited
- Federal property is off-limits
- Federal benefits can be affected
- Immigration consequences possible

### Federal vs. State Law
**State law protects you in Maryland:**
- Local police cannot arrest for compliant possession
- Maryland courts recognize medical program
- State agencies respect medical cannabis

**Federal law still applies:**
- On federal property
- For federal employees
- In federal court
- Immigration proceedings
- Interstate travel

## If You Have a Problem

### Dispensary Issues
**Product defects:**
- Contact dispensary immediately
- Bring unopened product with receipt
- Many have return/exchange policies

**Service complaints:**
- Speak to manager
- File complaint with MMCC
- Document interactions

### Law Enforcement Issues
**If arrested or cited:**
- Remain calm and polite
- Don't answer questions without lawyer
- Document everything
- Contact attorney immediately
- Keep all receipts and documentation

**Resources:**
- Maryland NORML: Legal information and referrals
- MMCC: Medical program questions
- Criminal defense attorney: For charges

### Medical Cannabis Concerns
**Access issues:**
- Contact MMCC patient services
- Speak to your certifying physician
- Reach out to dispensary patient services

**Medical concerns:**
- Consult your healthcare provider
- Don't rely solely on budtenders for medical advice
- Report adverse effects to your doctor

## Common Myths About Your Rights

### ❌ MYTH: "I'm a medical patient, so I can use anywhere"
**✅ TRUTH:** Public consumption is illegal for everyone, including medical patients.

### ❌ MYTH: "Police can't search my car if I have a medical card"
**✅ TRUTH:** Police can search with probable cause or your consent. Medical card doesn't prevent searches.

### ❌ MYTH: "I can take my medicine anywhere, like other prescriptions"
**✅ TRUTH:** Cannabis is not a traditional prescription. Different rules apply.

### ❌ MYTH: "Employers can't fire me for legal medical use"
**✅ TRUTH:** Many employers can still prohibit cannabis use and terminate for positive tests.

### ❌ MYTH: "I can travel to other states with my medical card"
**✅ TRUTH:** Crossing state lines with cannabis is a federal crime.

## Being a Responsible Consumer

### Best Practices
✅ Stay informed about law changes
✅ Purchase only from licensed dispensaries
✅ Respect all consumption location rules
✅ Store safely away from children
✅ Never drive impaired
✅ Be considerate of others
✅ Follow your doctor's guidance (medical patients)
✅ Keep receipts and documentation

### Community Responsibility
- Be a positive example of responsible use
- Don't give cannabis a bad reputation
- Respect neighbors and community standards
- Support licensed businesses
- Advocate for reasonable policies
- Educate others accurately

## Know Your Rights Resources

**Official Resources:**
- Maryland Medical Cannabis Commission (MMCC): mmcc.maryland.gov
- Maryland NORML: marylandnorml.org
- Maryland State Law Library: lawlib.maryland.gov

**Legal Assistance:**
- Maryland Criminal Defense Attorney
- NORML Legal Committee
- Public Defender's Office
- Legal Aid Bureau

**Patient Support:**
- MMCC Patient Hotline
- Dispensary patient education
- Support groups and forums

## Staying Compliant Checklist

✅ Purchase only from licensed Maryland dispensaries
✅ Stay within legal possession limits
✅ Consume only in private residences
✅ Store securely away from children
✅ Transport in trunk in sealed containers
✅ Never drive impaired
✅ Keep receipts with products
✅ Respect employer policies
✅ Don't cross state lines
✅ Never provide to minors
✅ Be considerate of others
✅ Stay informed of law changes

---

## Congratulations! 🎉

You've completed the "Maryland Cannabis Laws" course. You now understand:

✅ Your legal rights as a cannabis consumer
✅ Purchase limits and possession rules
✅ Where you can legally consume cannabis
✅ Transportation and travel restrictions
✅ Your responsibilities to community and family
✅ How to handle law enforcement interactions
✅ Resources for questions and legal assistance

**You're ready to be a responsible, compliant cannabis consumer in Maryland!**

Enter your email on the next screen to receive your "Maryland Compliant" certificate.`,
        estimated_minutes: 10,
        is_public: true
      }
    ];

    const { error: course3ModulesError } = await supabase
      .from('course_modules')
      .insert(course3Modules);

    if (course3ModulesError) {
      throw new Error(`Failed to create Course 3 modules: ${course3ModulesError.message}`);
    }

    console.log('[populate-consumer-courses] Created 4 modules for Course 3');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Consumer courses created successfully',
        courses: [
          { id: course1.id, title: course1.title, modules: 8 },
          { id: course2.id, title: course2.title, modules: 10 },
          { id: course3.id, title: course3.title, modules: 4 }
        ]
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