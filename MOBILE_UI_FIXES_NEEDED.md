# Mobile UI Fixes Needed - Lesson Builder & Lesson Editor

## Critical Issues

### 1. **Floating Action Button (FAB) Overlapping Content** 🔴
- **Location**: Lesson Editor - Details Tab
- **Issue**: The red FAB (floating action button with clipboard icon) is positioned in the bottom-right corner and **significantly overlaps the "Thumbnail URL" and "Tags" input fields**, making them difficult/impossible to interact with
- **Impact**: High - Users cannot properly fill in these fields
- **Fix Required**: 
  - Add bottom padding/margin to the main content area to account for FAB height
  - OR move FAB to a position that doesn't overlap scrollable content
  - OR make FAB fixed to viewport with content padding
  - Ensure scrollable area has sufficient bottom margin (e.g., 80px) to accommodate FAB

### 2. **Sidebar Not Accessible in Mobile View** 🔴
- **Location**: Lesson Editor - Structure Tab
- **Issue**: The instruction text says "Add stages and substages from the sidebar", but **the sidebar is not visible or accessible in mobile view**
- **Impact**: High - Core functionality (adding/editing stages) is inaccessible
- **Fix Required**:
  - Make the sidebar collapsible/toggleable with a button (hamburger or dedicated "Show Structure" button)
  - Consider a bottom sheet or modal for structure navigation on mobile
  - Add a clear button to access the hidden structure sidebar
  - Current "Lesson Structure" button at bottom might be meant for this but appears non-functional

### 3. **Substage Configuration Panel Not Accessible** 🔴
- **Location**: Lesson Editor - Structure Tab
- **Issue**: Clicking on substages in the structure tree doesn't show the configuration panel in mobile view (either hidden, overlapped, or layout broken)
- **Impact**: High - Cannot configure substages on mobile
- **Fix Required**:
  - Ensure config panel displays in a mobile-friendly way (full width or modal)
  - Check z-index and positioning for mobile breakpoints
  - May need to convert to a slide-in panel or full-screen modal for mobile

## Medium Priority Issues

### 4. **Bottom Navigation Bar Spacing** 🟡
- **Location**: Lesson Editor - All Tabs
- **Issue**: Bottom nav icons are very close together (6 icons in 375px width = ~62px each including padding)
- **Impact**: Medium - Might lead to mis-taps
- **Fix Required**:
  - Consider reducing to 4-5 most important tabs
  - Use a "More" overflow menu for less frequently used tabs
  - Or make icons smaller with better spacing

### 5. **Header Actions Crowding** 🟡
- **Location**: Lesson Editor - Top Sub-Header
- **Issue**: Back button, "Edit Lesson" text, Save button, and Submit button are cramped in narrow header
- **Impact**: Medium - Buttons are small and close together
- **Fix Required**:
  - Consider using icon-only buttons (💾, ✓) without background boxes
  - Reduce padding/margins
  - Make buttons slightly smaller on mobile

### 6. **Text Truncation in Cards** 🟡
- **Location**: Lesson Builder Hub
- **Issue**: Some secondary text is quite small ("Uncategorized lessons", "Click to view lessons") and might be hard to read
- **Impact**: Low-Medium - Readability concern
- **Fix Required**:
  - Increase font size slightly for better mobile readability
  - Ensure touch targets are at least 44x44px

### 7. **Input Field URL Truncation** 🟡
- **Location**: Lesson Editor - Details Tab - Thumbnail URL field
- **Issue**: Long URLs are truncated with no way to see full URL
- **Impact**: Low-Medium - Users can't verify full URL
- **Fix Required**:
  - Make field horizontally scrollable
  - OR add a "view/edit" button that opens full URL in a modal
  - OR wrap text on multiple lines

## Low Priority Issues

### 8. **Lesson Structure Tree Hierarchy** 🟢
- **Location**: Lesson Editor - Left Sidebar (when visible)
- **Issue**: The tree structure with stages/substages might not be clear in narrow mobile view
- **Impact**: Low - Visual clarity
- **Fix Required**:
  - Review indentation and visual hierarchy for mobile
  - Consider larger touch targets for drag handles
  - Ensure delete buttons are not too close to content

### 9. **Modal Responsiveness** 🟢
- **Location**: Throughout (e.g., Interaction Config Modal, Content View Modals)
- **Issue**: Need to verify all modals are fully responsive and usable on 375px width
- **Impact**: Low-Medium (depends on modal)
- **Fix Required**:
  - Test all modals in mobile view
  - Ensure proper full-screen or centered responsive behavior
  - Check button sizing and spacing

## Recommended Testing Checklist

- [ ] Test at 375px width (iPhone SE)
- [ ] Test at 390px width (iPhone 12/13/14)
- [ ] Test at 393px width (Pixel 7)
- [ ] Test in landscape mode
- [ ] Test with actual touch interaction (not just browser dev tools)
- [ ] Verify all forms can be filled out completely
- [ ] Verify all buttons are tappable without mis-taps
- [ ] Verify scrolling works smoothly
- [ ] Verify modals open and close properly
- [ ] Verify sidebar/drawer navigation works

## Ionic-Specific Considerations

Since the app uses Ionic:
- Consider using `<ion-menu>` for the structure sidebar
- Use `<ion-fab>` with proper `edge` and `vertical`/`horizontal` positioning
- Use `<ion-action-sheet>` or `<ion-modal>` for mobile-specific interactions
- Leverage Ionic's built-in responsive utilities and breakpoints
- Use `ion-padding`, `ion-margin` utilities for consistent spacing

## CSS Media Query Breakpoints to Add

```css
/* Mobile Portrait */
@media (max-width: 576px) {
  /* FAB positioning */
  /* Hide/collapse sidebar */
  /* Adjust header spacing */
  /* Full-width modals */
}

/* Mobile Landscape */
@media (max-width: 896px) and (orientation: landscape) {
  /* Adjust layout for wider but shorter viewport */
}
```

---

**Priority Order for Implementation:**
1. Fix FAB overlap (Critical)
2. Make sidebar accessible on mobile (Critical)
3. Fix substage config panel (Critical)
4. Bottom nav spacing (Medium)
5. Header actions (Medium)
6. Other minor fixes (Low)

