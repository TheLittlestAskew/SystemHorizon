# Horizon home information architecture

**Decision date:** 2026-08-28  
**Status:** Approved and banked  
**Scope:** Product decision only. No application behavior or data model changes are included in this record.

## Purpose

System Horizon is the calm, actionable front end for Taylor's work and life systems. Septentrion remains the deeper collection, history, sync, and source-of-truth layer.

The Horizon home page answers one question first:

> What needs my attention now, and what is the next true thing?

It is not a duplicate project registry, a full calendar, a second job tracker, or a general-purpose collection of widgets.

## Information priority

1. **Now:** one deliberately chosen next true thing, with enough context to start it.
2. **Needs attention:** no more than five deadline, compliance, system-health, or time-sensitive alerts.
3. **Today and next:** a short chronological timeline for commitments and protected build blocks.
4. **Active work:** three ranked project return points, not every project in the registry.
5. **Quick capture:** one persistent inbox for loose thoughts, with routing deferred until after capture.
6. **Field status:** compact state signals for Horizon, Work, Career, Life, and System.

An item belongs on the home page only if it requires action soon, changes the next action, flags fresh risk, or prevents a thought from being lost.

## Home layout

```text
Header: greeting, date, current capacity, universal capture

Large left focus:       Now / one next true thing
Right alert stack:      Needs attention

Lower left ordered list: Active work, maximum three return points
Lower right timeline:    Today and next

Bottom horizontal strip: Horizon | Work | Career | Life | System
```

The sections must not use interchangeable cards:

- **Now** is the large primary focal surface.
- **Needs attention** is a stacked action queue with explicit reasons and dates.
- **Active work** is a ranked list with project name, return point, and health signal.
- **Today and next** is chronological, not a mini month grid.
- **Field status** is a thin operational strip that links into the five areas.
- **Capture** is a header control because it is an interruption tool, not a destination.

## Existing system mapping

| Area | Home summary | Full destination |
| --- | --- | --- |
| Horizon | Now, attention queue, capture, cross-area state | Home page |
| Work | Active return points and blocked work only | Projects and Flow |
| Career | GDOL reporting gap, nearest deadline, best current lead | Career pipeline |
| Life | Today timeline and only urgent personal prompts | Calendar and future Life organizers |
| System | Failures and freshness concerns only | Mirrors and Archive |

The locked top-level order is **Horizon, Work, Career, Life, System**. The current destination views map as follows:

- Projects and Flow belong under Work.
- Calendar belongs under Life.
- Mirrors and Archive belong under System.
- Career remains its own top-level area.

## Data and behavior rules

- Use existing data before adding a second source of truth. Career continues to read Septentrion's `dashboard_jobs` view.
- The future capture feature must persist and route notes. The current browser-only confirmation is not sufficient.
- Surface Mirrors only when there is an unbanked handoff, uncommitted work, unpushed work, remote drift, or a failed check.
- Surface a Career alert only for a real deadline, GA DOL reporting risk, or high-fit opportunity that needs action.
- Do not put private health, refill, doctor-topic, or family-gift content in public repository text, archive feeds, or handoff records.

## Visual direction

Use the Pinterest boards as active visual references:

- [UI/UX board](https://www.pinterest.com/taylor_askew/uiux/) informs dark workstation density, deliberate hierarchy, readable lists, and restrained interface signals.
- [Septentrion board](https://www.pinterest.com/taylor_askew/septentrion/) informs subtle operational-system language and connected-state cues.

Use a dark charcoal base with color reserved for status: cyan for stable/current, amber for awareness, and coral for action needed. Typography, alignment, and spacing should differentiate sections before borders, surface tints, or elevation. Avoid a rainbow of equally loud cards, decorative metrics without a decision attached, and a faux command map.

## Build sequence

1. Define and persist the Now and capture models.
2. Add the Needs attention aggregator from existing Career and Mirrors data.
3. Add the Today and next timeline from `horizon_events`.
4. Replace the all-project radar with three ranked active return points.
5. Implement the five-area field-status strip and migrate the older seven-view navigation into the locked five-area model.

## Design basis

- [GOV.UK dashboard guidance](https://brand.design-system.service.gov.uk/data/dashboards/) supports using dashboards for high-priority, frequently revisited, automatically refreshed indicators and warns against overwhelming users with unstructured information.
- [GOV.UK task-list guidance](https://design-system.service.gov.uk/patterns/complete-multiple-tasks/) supports grouping related actions, showing status, and using the smallest useful set of states.
