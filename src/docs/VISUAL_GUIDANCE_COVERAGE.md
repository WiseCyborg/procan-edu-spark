# Visual Guidance Test Matrix

This document maps all screens that have role-aware next-step guidance (NextActionBanner).

## Coverage by Role

### 1. Platform Admin
| Screen | Route | Primary CTA | Next Step Message | Status |
|--------|-------|-------------|-------------------|--------|
| Admin Mission Control | `/admin` | Go to Admin | Monitor system health and manage organizations | ✅ Covered |

### 2. Dispensary Manager / Training Coordinator  
| Screen | Route | Primary CTA | Next Step Message | Status |
|--------|-------|-------------|-------------------|--------|
| Manager Dashboard | `/dispensary-manager-dashboard` | View Dashboard | Monitor Team Progress | ✅ Covered |
| Training Coordinator | `/training-coordinator-dashboard` | Manage Team | Monitor employee training | ✅ Covered |
| No Org (Needs Key) | `/auth?role=dispensary_manager&tab=accesskey` | Enter Access Key | Complete Registration | ✅ Covered |
| No Seats | `/purchase-seats` | Purchase Seats | Get training licenses | ✅ Covered |
| Has Seats, No Team | `/team-management` | Manage Team | Invite Your Team | ✅ Covered |

### 3. Employee / Student
| Screen | Route | Primary CTA | Next Step Message | Status |
|--------|-------|-------------|-------------------|--------|
| Student Dashboard | `/student-dashboard` | Start/Continue Course | Based on progress | ✅ Covered |
| Generic Dashboard | `/dashboard` | Based on state | Dynamic guidance | ✅ Covered |
| No Org (Needs Code) | `/auth?role=student&tab=code` | Enter Join Code | Ask manager for code | ✅ Covered |
| Awaiting Seat | `/dashboard` | Contact Manager | Awaiting seat assignment | ✅ Covered |
| Has Seat, Not Started | `/course` | Start Course | Begin training | ✅ Covered |
| In Progress | `/course` | Continue Course | X% complete | ✅ Covered |
| Course Complete | `/course/final-exam` | Take Exam | Ready for certification | ✅ Covered |
| Passed Exam | `/certificates` | View Certificates | Certificate generating | ✅ Covered |
| Certified | `/certificates` | View Certificate | Certified! | ✅ Covered |

## NextActionBanner Component Usage

```tsx
// Full variant (default) - for prominent guidance
<NextActionBanner className="mb-6" />

// Compact variant - for inline/subtle guidance
<NextActionBanner variant="compact" className="mb-2" />

// With dismiss option
<NextActionBanner showDismiss={true} />

// Floating variant - for persistent guidance
<NextActionFloating />
```

## Journey State Logic (useNextAction hook)

The `useNextAction` hook determines next steps based on:

1. **User Role** (admin, dispensary_manager, training_coordinator, student)
2. **Organization State** (hasOrg, orgApproved, orgPaid)
3. **Seat State** (hasSeat, seatStatus, totalSeats, usedSeats)
4. **Training Progress** (completedModules, totalModules, progressPercent)
5. **Exam State** (hasPassedExam, examScore)
6. **Certificate State** (hasCertificate, certificateNumber)

## Priority Levels

| Priority | Style | Use Case |
|----------|-------|----------|
| `critical` | Red border, destructive colors | Blocking issues (no org, no seat) |
| `high` | Orange border | Important actions (invite team, take exam) |
| `medium` | Blue border | In-progress actions (continue training) |
| `low` | Green border | Completed states (certified, monitoring) |

## Test Checklist

For each role, verify:
- [ ] Primary CTA is obvious (only one main action)
- [ ] "What happens next" is shown visually
- [ ] Links/buttons work on iOS Safari
- [ ] Domain is correct (no mismatches)
- [ ] Role-correct content only (no admin buttons for students)
- [ ] Failure states show recovery instructions
- [ ] User can proceed without support

## Files with NextActionBanner

- `src/pages/DispensaryManagerDashboard.tsx`
- `src/pages/TrainingCoordinatorDashboard.tsx`
- `src/pages/AdminMissionControl.tsx`
- `src/pages/StudentDashboard.tsx`
- `src/components/dashboard/Dashboard.tsx`
