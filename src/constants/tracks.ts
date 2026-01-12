/**
 * Training Track Constants
 * 
 * These are the 4 isolated training tracks with separate course_ids,
 * resume states, and access rules.
 */

export const TRACK_IDS = {
  /** RVT Core Employee Training - Maryland MCA Responsible Vendor Training */
  RVT_CORE: 'e6841a2f-4e92-47c3-9ed4-243ccc22338b',
  
  /** Manager Compliance Training - Requires RVT Core completion */
  MANAGER: '11111111-1111-4111-a111-111111111111',
  
  /** Ganjier Certification - Advanced cannabis expertise */
  GANJIER: '22222222-2222-4222-a222-222222222222',
  
  /** Cannabis Sommelier Certification - Sensory evaluation and pairing */
  SOMMELIER: '33333333-3333-4333-a333-333333333333',
} as const;

export type TrackId = typeof TRACK_IDS[keyof typeof TRACK_IDS];

export interface TrackInfo {
  id: TrackId;
  name: string;
  shortName: string;
  description: string;
  badgeName: string;
  prerequisiteId: TrackId | null;
  prerequisiteRequired: boolean;
  targetAudience: string;
}

export const TRACKS: Record<keyof typeof TRACK_IDS, TrackInfo> = {
  RVT_CORE: {
    id: TRACK_IDS.RVT_CORE,
    name: 'Responsible Vendor Training',
    shortName: 'RVT Core',
    description: 'Maryland MCA-compliant training for dispensary employees',
    badgeName: 'RVT Certified',
    prerequisiteId: null,
    prerequisiteRequired: false,
    targetAudience: 'employees',
  },
  MANAGER: {
    id: TRACK_IDS.MANAGER,
    name: 'Manager Compliance Training',
    shortName: 'Manager',
    description: 'Supervisory and operational compliance for managers',
    badgeName: 'Manager Certified',
    prerequisiteId: TRACK_IDS.RVT_CORE,
    prerequisiteRequired: true,
    targetAudience: 'managers',
  },
  GANJIER: {
    id: TRACK_IDS.GANJIER,
    name: 'Ganjier Certification',
    shortName: 'Ganjier',
    description: 'Advanced cannabis expertise and product knowledge',
    badgeName: 'Ganjier Certified',
    prerequisiteId: TRACK_IDS.RVT_CORE,
    prerequisiteRequired: false,
    targetAudience: 'specialists',
  },
  SOMMELIER: {
    id: TRACK_IDS.SOMMELIER,
    name: 'Cannabis Sommelier Certification',
    shortName: 'Sommelier',
    description: 'Sensory evaluation, terpene science, and pairing',
    badgeName: 'Sommelier Certified',
    prerequisiteId: TRACK_IDS.RVT_CORE,
    prerequisiteRequired: false,
    targetAudience: 'specialists',
  },
};

/**
 * Get track info by course ID
 */
export function getTrackById(courseId: string): TrackInfo | null {
  const entry = Object.entries(TRACKS).find(([_, track]) => track.id === courseId);
  return entry ? entry[1] : null;
}

/**
 * Get track key by course ID
 */
export function getTrackKeyById(courseId: string): keyof typeof TRACK_IDS | null {
  const entry = Object.entries(TRACK_IDS).find(([_, id]) => id === courseId);
  return entry ? entry[0] as keyof typeof TRACK_IDS : null;
}

/**
 * Check if a track requires a prerequisite
 */
export function trackRequiresPrerequisite(courseId: string): boolean {
  const track = getTrackById(courseId);
  return track?.prerequisiteRequired ?? false;
}
