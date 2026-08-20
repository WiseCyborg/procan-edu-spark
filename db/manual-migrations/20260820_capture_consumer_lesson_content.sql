-- Source-of-truth capture of the CURRENT LIVE consumer lesson content for three
-- course_modules rows (queried from production on 2026-08-20).
--
-- NOT APPLIED. This file is intentionally stored outside supabase/migrations/
-- so it is never auto-run. Idempotent: each UPDATE is a no-op when the stored
-- content already matches. No other rows, columns, or tables are touched.

UPDATE public.course_modules
SET content = $mod1$
# Welcome to Your First Dispensary Visit

A first dispensary visit can feel unfamiliar. Here is the usual process and what to bring.

## What Happens When You Arrive

1. **Check in:** Staff confirm your eligibility before you enter the sales area.
2. **Wait if needed:** Some dispensaries use a waiting area during busy periods.
3. **Meet a staff member:** A dispensary agent can explain product formats, labels, store policies, and checkout.
4. **Ask questions:** Tell staff you are new so they can explain the process clearly.

## What to Bring

**For adult-use purchases:**
- You must be 21 or older.
- Bring a valid government-issued photo ID.

**For medical purchases:**
- Bring a valid government-issued photo ID.
- Your Maryland patient registration and provider certification must be active in the state system.
- A physical medical cannabis card is not described here as a universal entry requirement. Check the dispensary's current check-in policy before visiting.

Adults 21 and older do not need patient status to make an adult-use purchase.

## Good Dispensary Etiquette

- Ask questions when something is unclear.
- Respect other customers' privacy.
- Do not photograph people without permission.
- Follow the dispensary's check-in and payment policies.
- Never drive while impaired.

For current official guidance, visit the Maryland Cannabis Administration at cannabis.maryland.gov.
$mod1$
WHERE id = '26e2bc53-d146-4524-812f-3a9642884e03'
  AND content IS DISTINCT FROM $mod1$
# Welcome to Your First Dispensary Visit

A first dispensary visit can feel unfamiliar. Here is the usual process and what to bring.

## What Happens When You Arrive

1. **Check in:** Staff confirm your eligibility before you enter the sales area.
2. **Wait if needed:** Some dispensaries use a waiting area during busy periods.
3. **Meet a staff member:** A dispensary agent can explain product formats, labels, store policies, and checkout.
4. **Ask questions:** Tell staff you are new so they can explain the process clearly.

## What to Bring

**For adult-use purchases:**
- You must be 21 or older.
- Bring a valid government-issued photo ID.

**For medical purchases:**
- Bring a valid government-issued photo ID.
- Your Maryland patient registration and provider certification must be active in the state system.
- A physical medical cannabis card is not described here as a universal entry requirement. Check the dispensary's current check-in policy before visiting.

Adults 21 and older do not need patient status to make an adult-use purchase.

## Good Dispensary Etiquette

- Ask questions when something is unclear.
- Respect other customers' privacy.
- Do not photograph people without permission.
- Follow the dispensary's check-in and payment policies.
- Never drive while impaired.

For current official guidance, visit the Maryland Cannabis Administration at cannabis.maryland.gov.
$mod1$;

UPDATE public.course_modules
SET content = $mod2$
# Maryland Adult-Use Amounts and Patient Allotments

Maryland has separate rules for adult-use customers and registered medical patients. Do not treat a medical patient allotment as a general limit for every customer.

## Adult-Use Personal-Use Amount

Adults 21 and older may purchase and possess up to Maryland's personal-use amount:

- Up to **1.5 ounces of cannabis flower**
- Up to **12 grams of cannabis concentrate**
- Cannabis products containing up to **750 milligrams of THC**

Adult-use sales began July 1, 2023. Maryland is not waiting to transition to adult-use sales.

## Medical Patients

Medical purchases require active Maryland patient registration and an active provider certification in the state system.

- A patient's available allotment is tied to the provider certification and state record.
- The available amount can differ from the adult-use personal-use amount.
- Do not rely on a general “120 grams per 30 days” statement as a rule for every patient.
- Ask the dispensary to explain the amount shown in the state system, or contact your certifying provider if the record appears wrong.

## Staying Within the Rules

- Buy only from a licensed Maryland dispensary.
- Do not consume cannabis in public.
- Never drive while impaired.
- Do not carry cannabis across state lines.
- Keep cannabis secured and away from children and pets.
- Follow workplace, housing, and federal-property restrictions that apply to your situation.

For current official guidance, see the Maryland Cannabis Administration Adult-Use FAQ and patient information pages at cannabis.maryland.gov.
$mod2$
WHERE id = '5a574c16-5430-40c0-9020-1853ac762407'
  AND content IS DISTINCT FROM $mod2$
# Maryland Adult-Use Amounts and Patient Allotments

Maryland has separate rules for adult-use customers and registered medical patients. Do not treat a medical patient allotment as a general limit for every customer.

## Adult-Use Personal-Use Amount

Adults 21 and older may purchase and possess up to Maryland's personal-use amount:

- Up to **1.5 ounces of cannabis flower**
- Up to **12 grams of cannabis concentrate**
- Cannabis products containing up to **750 milligrams of THC**

Adult-use sales began July 1, 2023. Maryland is not waiting to transition to adult-use sales.

## Medical Patients

Medical purchases require active Maryland patient registration and an active provider certification in the state system.

- A patient's available allotment is tied to the provider certification and state record.
- The available amount can differ from the adult-use personal-use amount.
- Do not rely on a general “120 grams per 30 days” statement as a rule for every patient.
- Ask the dispensary to explain the amount shown in the state system, or contact your certifying provider if the record appears wrong.

## Staying Within the Rules

- Buy only from a licensed Maryland dispensary.
- Do not consume cannabis in public.
- Never drive while impaired.
- Do not carry cannabis across state lines.
- Keep cannabis secured and away from children and pets.
- Follow workplace, housing, and federal-property restrictions that apply to your situation.

For current official guidance, see the Maryland Cannabis Administration Adult-Use FAQ and patient information pages at cannabis.maryland.gov.
$mod2$;

UPDATE public.course_modules
SET content = $mod3$
# Medical Cannabis in Maryland

Maryland offers both adult-use access and a registered medical patient program.

## Adult-Use Access

Adults 21 and older may buy adult-use cannabis from a licensed Maryland dispensary with a valid government-issued photo ID. Patient registration is not required for adult-use purchases.

## Medical Patient Access

Medical purchases require:

- Active Maryland patient registration
- An active provider certification recorded in the state system
- A valid government-issued photo ID

Maryland patient registration currently lasts six years. Provider certification and purchase allotments are separate and follow their own schedules.

## The Regulator

The Maryland Cannabis Administration (MCA) oversees the state's cannabis program. The former Maryland Maryland Cannabis Administration is no longer the regulator.

## Medical Questions

A dispensary agent can explain product labels, formats, and store procedures. They are not a substitute for a healthcare professional. Ask your healthcare provider or certifying provider about medical conditions, interactions, dosing, or whether cannabis is appropriate for you.

## Caregivers and Patient Records

Caregiver eligibility, registration, and patient account requirements can change. Use the current MCA patient information pages for official instructions rather than relying on an old card or printed guide.

## What This Module Is

This is free consumer education. Completing it may earn a ProCann EDU completion badge. It is not medical advice, Responsible Vendor Training, or an official Maryland credential.

For current information, visit cannabis.maryland.gov.
$mod3$
WHERE id = 'b7234523-0e0d-4920-894c-bcdb70149771'
  AND content IS DISTINCT FROM $mod3$
# Medical Cannabis in Maryland

Maryland offers both adult-use access and a registered medical patient program.

## Adult-Use Access

Adults 21 and older may buy adult-use cannabis from a licensed Maryland dispensary with a valid government-issued photo ID. Patient registration is not required for adult-use purchases.

## Medical Patient Access

Medical purchases require:

- Active Maryland patient registration
- An active provider certification recorded in the state system
- A valid government-issued photo ID

Maryland patient registration currently lasts six years. Provider certification and purchase allotments are separate and follow their own schedules.

## The Regulator

The Maryland Cannabis Administration (MCA) oversees the state's cannabis program. The former Maryland Maryland Cannabis Administration is no longer the regulator.

## Medical Questions

A dispensary agent can explain product labels, formats, and store procedures. They are not a substitute for a healthcare professional. Ask your healthcare provider or certifying provider about medical conditions, interactions, dosing, or whether cannabis is appropriate for you.

## Caregivers and Patient Records

Caregiver eligibility, registration, and patient account requirements can change. Use the current MCA patient information pages for official instructions rather than relying on an old card or printed guide.

## What This Module Is

This is free consumer education. Completing it may earn a ProCann EDU completion badge. It is not medical advice, Responsible Vendor Training, or an official Maryland credential.

For current information, visit cannabis.maryland.gov.
$mod3$;
