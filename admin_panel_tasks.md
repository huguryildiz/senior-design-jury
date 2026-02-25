# Admin Panel --- Implementation Tasks

## 1) Jurors Tab --- PIN Reset

-   Analyze why **Reset PIN** is not working (API call, auth, GAS
    action, params, or UI state).
-   Fix the issue end-to-end.
-   Place **Reset PIN** button directly under to **All
    submitted**, aligned to the left and close to juror name.

------------------------------------------------------------------------

## 2) Details Tab --- Visual Simplification

-   Replace excessive color usage with **zebra row pattern**
    (alternating light gray / white rows).
-   Keep colored highlights only for critical states (error/warning).
-   Ensure hover state remains subtle and clean.
-   Ensure mobility issues.

------------------------------------------------------------------------

## 3) Summary Tab Styling

-   Render **Group Description** and **Students** in muted gray
    (secondary text style).

------------------------------------------------------------------------

## 4) Mobile Responsiveness

-   Ensure admin panel renders properly on mobile.
-   Desktop: normal table layout.
-   Mobile: stacked card layout or horizontal scroll with sticky header.
-   Ensure filters/export controls do not break layout.

------------------------------------------------------------------------

## 5) Medal Icons (🥇🥈🥉)

-   Replace emoji with SVG medal badges.
-   Medal should fully fill circular container.
-   Centered, no excessive padding.

------------------------------------------------------------------------

## 6) Details Tab --- CSV Export

Filename format: `jury_export_YYYY-MM-DD_HH:mm.csv`

Columns (exact order):

1.  Juror Name\
2.  Department / Institution\
3.  Timestamp\
4.  Group Name\
5.  Group Desc\
6.  Students\
7.  Technical (30)\
8.  Written (30)\
9.  Oral (30)\
10. Teamwork (10)\
11. Total (100)\
12. Comments

------------------------------------------------------------------------

## 7) Admin Home Refresh Button

-   Remove text label "Refresh".
-   Use a refresh icon instead (SVG preferred).
-   Keep accessibility via aria-label or tooltip ("Refresh").
