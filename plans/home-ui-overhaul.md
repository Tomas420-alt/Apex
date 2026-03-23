# Home Screen & Navigation UI/UX Overhaul Plan

## Overview
Major restructure of the app's navigation and screen layout, inspired by smart home app design (image 1) and "Pilot Protocol" military-aesthetic profile screen (image 2). The goal is to make the home screen motorcycle-centric with the user's bike photo as the hero, consolidate maintenance info below it, and reorganize the tab bar.

---

## Tab Bar Changes

### Current Tabs (3)
| Tab | Icon | Label |
|-----|------|-------|
| index.tsx | bicycle | Garage |
| maintenance.tsx | wrench | Maintenance |
| settings.tsx | gear | Settings |

### New Tabs (4)
| Tab | SF Symbol Icon | Label | Screen |
|-----|---------------|-------|--------|
| index.tsx | house.fill / house | Home | Motorcycle hero + maintenance dashboard |
| calendar.tsx | calendar / calendar | Calendar | Full-screen maintenance calendar (moved from home) |
| plan.tsx | doc.text.fill / doc.text | Plan | Dedicated maintenance plan screen (moved from bike/[id]) |
| pilot.tsx | person.fill / person | Pilot | Profile/settings (redesigned from settings) |

### File: `app/(tabs)/_layout.tsx`
- Replace 3 NativeTabs.Trigger entries with 4
- Update SF Symbol icon names
- Update labels: Home, Calendar, Plan, Pilot
- Remove maintenance.tsx trigger entirely

---

## Screen 1: Home (index.tsx) — Complete Rebuild

### Design Reference
Inspired by Image 1 (smart home "Bedroom" screen):
- Large hero image at top (motorcycle photo instead of room photo)
- "Garage" title centered at top
- Stats/summary cards below the image
- Task list below cards

### Header
- Remove: Wrench icon, "My Garage" left-aligned title, "1 bike" subtitle
- Add: "Garage" centered at top, clean and simple (no icon, no subtitle)

### Motorcycle Hero Section
- **Full-width motorcycle image** as the visual centerpiece
- Source: `bike.imageUrl` from Convex (the user's uploaded/AI-edited photo)
- If no image: show a stylized placeholder (dark gradient card with bike icon)
- Image styling:
  - Width: full screen width minus padding (16px each side)
  - Height: ~55% of screen width (landscape crop)
  - Border radius: 20px
  - Subtle bottom gradient overlay (black → transparent) for text readability
- Bike name overlay at bottom-left of image: "{year} {make} {model}"
- Mileage badge overlay at bottom-right: "{mileage} km"
- If multiple bikes: horizontal scroll/swipe between bike photos (later enhancement — start with primary/first bike)

### Remove
- BikeCard list (the motorcycle cards/buttons at top)
- EmptyGarage component layout (replace with different empty state)
- FAB "+" button (move add-bike to Pilot screen under "Hangar" section)
- MaintenanceCalendar (moves to Calendar tab)

### Maintenance Dashboard (below hero image)
Move everything from `maintenance.tsx` here:

1. **Summary Cards Row** — SummaryCards component (overdue, due, completed, savings)
2. **Bike Filter Chips** — Only show if 2+ bikes
3. **Upcoming Tasks** — Section header + TaskCard list (overdue first, then due)
4. **Completed Section** — CompletedSection component (collapsible)
5. **Mark Complete Modal** — Same confirmation modal

### Data Queries (merge from both screens)
```typescript
// From current index.tsx
const bikes = useQuery(api.bikes.list);
const currentUser = useQuery(api.users.getCurrent);

// From current maintenance.tsx
const tasks = useQuery(api.maintenanceTasks.listDue);
const recentlyCompleted = useQuery(api.maintenanceTasks.listRecentlyCompleted);
const completedCount = useQuery(api.maintenanceTasks.countCompleted);
const savings = useQuery(api.maintenanceTasks.totalSavings);
```

### Keep (hidden)
- Test Onboarding button (`{false && (...)}`)
- Subscription toggle button (`{false && (...)}`)
- Delete bike modal (still needed, but accessed differently — maybe from Pilot)

### Empty State (no bikes)
- Same centered layout but with motorcycle-themed messaging
- "Add Your First Bike" CTA

---

## Screen 2: Calendar (calendar.tsx) — New Tab Screen

### Content
- Move `MaintenanceCalendar` component from current index.tsx
- Full-screen dedicated calendar experience
- Same month navigation, day selection, task list below

### Header
- "Calendar" title centered or left-aligned
- Month/year display

### Data
```typescript
const bikes = useQuery(api.bikes.list);
const calendarTasks = useQuery(api.maintenanceTasks.listForCalendar, { startDate, endDate });
```

### Reuse
- `components/MaintenanceCalendar.tsx` — works as-is, just moved to its own tab

---

## Screen 3: Plan (plan.tsx) — New Tab Screen

### Purpose
Dedicated screen for the bike's maintenance plan — currently buried inside `app/bike/[id].tsx`. This becomes the central place to view and manage the AI-generated plan.

### Content
- If user has 1 bike: show that bike's plan directly
- If user has 2+ bikes: show bike selector at top, then selected bike's plan
- If no plan exists: show the "Generate Plan" / "Start Inspection" flow (currently in bike/[id].tsx EmptyPlan + InspectionChecklist)

### Sections (from bike/[id].tsx)
1. **Plan Summary Card** — Total estimated cost, next service date
2. **Task Cards** — Full task list with priority/status badges, parts chips, complete/view parts actions
3. **Regenerate Plan Button** — GenerateButton with "Regenerate Plan"
4. **View All Parts Button** — Links to parts screen

### Subscription Gate
- Same paywall logic: if not subscribed, "Generate Plan" / "Start Inspection" redirect to `/membership`

### Data
```typescript
const plan = useQuery(api.maintenancePlans.getByBike, { bikeId });
const tasks = useQuery(api.maintenanceTasks.listByBike, { bikeId });
```

---

## Screen 4: Pilot (pilot.tsx) — Redesigned Settings

### Design Reference
Image 2 ("Pilot Protocol" screen):
- Dark background with subtle card borders
- Profile section at top with avatar, name, rider level badge, member since date
- "Hangar / Active Units" section showing registered bikes with motorcycle silhouette
- "Control Parameters" section with toggles and settings
- "Support Terminal" and "Logout Session" at bottom

### Header
- "Pilot Protocol" title with person icon (left)
- Settings gear icon (right) — optional, could link to a sub-settings screen

### Profile Section (Card)
- User avatar (circle, 80px) — placeholder with `User` icon for now
- User name (large, bold)
- Rider level badge: e.g., "Advanced Rider" (from `experienceLevel` on first bike)
- Member since date: format from user creation date
- Subscription badge: "PRO" or "FREE" with appropriate styling

### Hangar / Active Units Section
- Section header: motorcycle icon + "Hangar / Active Units" + "+ Register Unit" button (links to /add-bike)
- Bike cards (one per bike):
  - Bike name: "{make} {model}"
  - "Primary Unit // {year} Model" subtitle
  - Mileage display
  - Status: "Deployed" (green) if has active plan, "Standby" if no plan
  - Motorcycle silhouette graphic on right side of card
  - Delete bike action (trash icon or swipe)

### Control Parameters Section
- **Critical Notifications** — Toggle (maps to push notifications)
- **Unit Calibration** — "Metric (KM/L)" badge/selector (future: km vs miles toggle)
- **Encryption & Safety** — ChevronRight, links to Privacy & Security (placeholder)

### Bottom Actions
- **Support Terminal** — Links to support/help (placeholder for now)
- **Logout Session** — Red-tinted sign out button (from current settings.tsx)

### Data Migration from settings.tsx
- User profile display: `api.users.getCurrent`
- Notification toggles: `api.users.updatePreferences`
- Phone number input: move to a sub-screen or keep inline
- Sign out: `useAuthActions().signOut()`
- Bike list: `api.bikes.list`

---

## File Changes Summary

### New Files
| File | Purpose |
|------|---------|
| `app/(tabs)/calendar.tsx` | Calendar tab screen |
| `app/(tabs)/plan.tsx` | Maintenance plan tab screen |
| `app/(tabs)/pilot.tsx` | Profile/settings tab screen |

### Modified Files
| File | Changes |
|------|---------|
| `app/(tabs)/_layout.tsx` | 4 tabs: Home, Calendar, Plan, Pilot |
| `app/(tabs)/index.tsx` | Complete rebuild — hero image + maintenance dashboard |

### Removed/Deprecated Files
| File | Action |
|------|--------|
| `app/(tabs)/maintenance.tsx` | Remove from tabs (content moves to index.tsx) |
| `app/(tabs)/settings.tsx` | Remove from tabs (content moves to pilot.tsx) |

### Components to Create
| Component | Location | Purpose |
|-----------|----------|---------|
| `MotorcycleHero` | `components/home/MotorcycleHero.tsx` | Hero image with overlays |

### Existing Components Reused
| Component | Used In |
|-----------|---------|
| `MaintenanceCalendar` | calendar.tsx (moved from index.tsx) |
| `SummaryCards` | index.tsx (moved from maintenance.tsx) |
| `BikeFilterChips` | index.tsx (moved from maintenance.tsx) |
| `TaskCard` | index.tsx + plan.tsx |
| `CompletedSection` | index.tsx (moved from maintenance.tsx) |
| `InspectionChecklist` | plan.tsx (moved from bike/[id].tsx) |
| `GenerateButton` | plan.tsx |

---

## Implementation Order

### Phase 1: Tab Structure
1. Create empty `calendar.tsx`, `plan.tsx`, `pilot.tsx` in `app/(tabs)/`
2. Update `_layout.tsx` with 4 new tabs + icons
3. Verify navigation works

### Phase 2: Calendar Tab
4. Move MaintenanceCalendar to `calendar.tsx` with its queries
5. Remove calendar from `index.tsx`

### Phase 3: Home Screen Rebuild
6. Create `MotorcycleHero` component
7. Rebuild `index.tsx`:
   - Centered "Garage" header
   - MotorcycleHero with bike photo
   - SummaryCards + BikeFilterChips + TaskCards + CompletedSection
8. Remove BikeCard list, FAB, old header

### Phase 4: Plan Tab
9. Build `plan.tsx` with bike selector + plan display
10. Move InspectionChecklist, EmptyPlan, task cards from bike/[id].tsx
11. Wire up subscription gating

### Phase 5: Pilot Tab
12. Build `pilot.tsx` with Pilot Protocol design:
    - Profile card with name, level, member date
    - Hangar section with bike cards + add bike
    - Control Parameters (notifications, calibration, privacy)
    - Support Terminal + Logout Session
13. Migrate all settings.tsx functionality

### Phase 6: Cleanup
14. Remove `maintenance.tsx` and `settings.tsx` from tabs
15. Update any navigation references (router.push to maintenance/settings)
16. Keep `app/bike/[id].tsx` for deep-link task viewing but simplify (remove plan generation UI since it's now in Plan tab)

---

## Design Tokens

### Motorcycle Hero
```
Image border radius: 20px
Image aspect ratio: ~16:10 (landscape)
Gradient overlay: linear-gradient(transparent 60%, rgba(0,0,0,0.8) 100%)
Name overlay: 18px bold white, bottom-left with 16px padding
Mileage badge: pill shape, rgba(0,0,0,0.6) bg, 12px text
```

### Pilot Profile Card
```
Card bg: colors.surface1 (#1A1A2E)
Card border: colors.border (rgba(255,255,255,0.06))
Card border-radius: 16px
Avatar: 80px circle, colors.surface2 bg
Name: 22px bold white
Level badge: colors.surface2 bg, 12px text, 8px border-radius
Member since: 12px colors.textSecondary, uppercase
```

### Hangar Bike Card
```
Card bg: colors.surface1
Border: 1.5px solid colors.green (for active/deployed)
Bike name: 16px bold white
Subtitle: 13px colors.green
Stats row: 12px colors.textSecondary
Motorcycle silhouette: 80px, colors.textTertiary, right side
```
