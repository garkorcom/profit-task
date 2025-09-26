# Task Details Drawer - Manual QA Checklist

## Overview
This checklist covers manual testing scenarios for the Task Details Drawer feature that opens when clicking on a task in the `/tasks` page. The drawer allows users to edit task details, manage time tracking, add comments, and upload photos.

## Pre-requisites
- [ ] User is logged in
- [ ] At least one project exists
- [ ] At least one task exists in the system
- [ ] Browser DevTools console is open to monitor for errors

## 1. Opening & Closing the Drawer

### Desktop (≥960px width)
- [ ] Click on a task card → Drawer slides in from the right
- [ ] Drawer width is approximately 760px
- [ ] Click on backdrop → Drawer closes
- [ ] Press Escape key → Drawer closes
- [ ] Click X button in header → Drawer closes
- [ ] Click action buttons (Start/Stop, Edit, Delete) on task card → Drawer does NOT open

### Mobile (<960px width)
- [ ] Click on a task card → Full-screen dialog opens
- [ ] Dialog covers entire viewport
- [ ] Swipe down or click X → Dialog closes
- [ ] Press back button (Android) → Dialog closes
- [ ] Tabs are visible (Details, Comments, Photos)

## 2. Task Details Editing

### Title Editing
- [ ] Click on title field → Can edit inline
- [ ] Type new title → "Saving..." indicator appears
- [ ] After ~800ms → "Saved" indicator appears
- [ ] Refresh page → New title persists
- [ ] Clear title completely → Field shows error state
- [ ] Very long title (>200 chars) → Truncates appropriately

### Status Changes
- [ ] Click status chip → Dropdown appears
- [ ] Select new status → Updates immediately
- [ ] Status color changes appropriately:
  - [ ] To Do → Gray
  - [ ] In Progress → Blue
  - [ ] Done → Green
  - [ ] Archived → Orange
- [ ] Change reflects in task list immediately

### Priority Changes
- [ ] Click priority chip → Dropdown appears
- [ ] Select new priority → Updates immediately
- [ ] Priority color changes appropriately:
  - [ ] Low → Gray
  - [ ] Medium → Blue
  - [ ] High → Orange
  - [ ] Urgent → Red

### Description Editing
- [ ] Click description field → Can type multiline text
- [ ] Type description → "Saving..." appears after pause
- [ ] Markdown formatting preserved
- [ ] Copy/paste works correctly
- [ ] Auto-resize as content grows

### Project Selection
- [ ] Project dropdown shows all available projects
- [ ] Select different project → Updates immediately
- [ ] Project name displays correctly

### Planned Time
- [ ] Enter numeric value → Accepts only numbers
- [ ] Enter negative value → Shows validation error
- [ ] Enter value > 1440 → Shows validation error
- [ ] Valid value → Saves after debounce

### Tags
- [ ] Type new tag and press Enter → Tag added
- [ ] Click X on tag → Tag removed
- [ ] Autocomplete suggests existing tags
- [ ] Multiple tags display correctly

### Photo Required Toggle
- [ ] Toggle switch → Updates immediately
- [ ] State persists on refresh

## 3. Time Tracking

### Starting Time
- [ ] No active task → "Start" button visible
- [ ] Click Start → Button changes to "Stop"
- [ ] Timer starts in header/navbar
- [ ] Task card shows "Active" chip

### Stopping Time
- [ ] Active task → "Stop" button visible (red)
- [ ] Click Stop → Button changes to "Start"
- [ ] Timer stops in header/navbar
- [ ] Time log created in system

### Time Summary
- [ ] Logged minutes display correctly
- [ ] Planned minutes display correctly
- [ ] Progress bar shows correct percentage
- [ ] Over 100% → Bar shows full, different color

## 4. Comments Section

### Viewing Comments
- [ ] Comments load in chronological order
- [ ] User avatars show initials
- [ ] Timestamps display correctly
- [ ] Long comments wrap properly
- [ ] Scroll works for many comments

### Adding Comments
- [ ] Type in comment field → Send button enables
- [ ] Click Send → Comment appears immediately
- [ ] Press Ctrl/Cmd + Enter → Comment sends
- [ ] Empty comment → Send button disabled
- [ ] Very long comment → Handles gracefully

### Deleting Comments
- [ ] Own comments show delete option
- [ ] Other users' comments → No delete option
- [ ] Click delete → Confirmation dialog
- [ ] Confirm → Comment removed

## 5. Photos Section

### Viewing Photos
- [ ] Photos display in grid (3 columns desktop, 2 mobile)
- [ ] Thumbnails load quickly
- [ ] Click thumbnail → Opens full size in new tab
- [ ] Multiple photos scroll correctly

### Uploading Photos
- [ ] Click Upload button → File picker opens
- [ ] Select image → Upload progress shows
- [ ] Upload completes → Photo appears in grid
- [ ] Non-image file → Shows error
- [ ] Large file (>10MB) → Handles appropriately
- [ ] Drag & drop image → Uploads correctly

### Deleting Photos
- [ ] Hover photo → Delete button appears
- [ ] Click delete → Confirmation dialog
- [ ] Confirm → Photo removed from grid
- [ ] Storage cleaned up (check Firebase console)

## 6. Responsive Behavior

### Desktop → Mobile Transition
- [ ] Resize window below 960px → Drawer becomes Dialog
- [ ] Layout switches to tabs
- [ ] All functionality remains accessible

### Mobile → Desktop Transition
- [ ] Resize window above 960px → Dialog becomes Drawer
- [ ] Two-column layout appears
- [ ] Sidebar shows on right

## 7. Real-time Updates

### Task Updates
- [ ] Open same task in two tabs
- [ ] Edit in one tab → Updates appear in other
- [ ] No "last write wins" conflicts

### Comments Updates
- [ ] Add comment in one tab → Appears in other
- [ ] Delete comment → Removed everywhere

### Photos Updates
- [ ] Upload photo in one tab → Appears in other
- [ ] Delete photo → Removed everywhere

## 8. Error Handling

### Network Errors
- [ ] Disconnect network → Appropriate error messages
- [ ] Reconnect → Functionality resumes
- [ ] Offline changes → Queue or show error

### Validation Errors
- [ ] Invalid inputs show clear error messages
- [ ] Errors don't break the UI
- [ ] Can recover from errors

### Permission Errors
- [ ] Try to edit others' tasks (if restricted)
- [ ] Appropriate error messages
- [ ] UI remains functional

## 9. Performance

### Loading States
- [ ] Initial load shows spinner
- [ ] Subsequent opens are faster (cached)
- [ ] Large comments list → Pagination or virtualization
- [ ] Many photos → Lazy loading

### Memory Management
- [ ] Open/close drawer multiple times → No memory leaks
- [ ] Upload many photos → Memory usage stable
- [ ] Long session → Performance doesn't degrade

## 10. Accessibility

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Escape closes drawer
- [ ] Focus trap within drawer

### Screen Reader
- [ ] All buttons have aria-labels
- [ ] Form fields have labels
- [ ] Status changes announced
- [ ] Error messages announced

### Visual
- [ ] Sufficient color contrast
- [ ] Focus indicators visible
- [ ] Text readable at 200% zoom
- [ ] No color-only information

## 11. Edge Cases

### Data Edge Cases
- [ ] Task with no description
- [ ] Task with no project
- [ ] Very old task (>1 year)
- [ ] Task with 100+ comments
- [ ] Task with 50+ photos

### Interaction Edge Cases
- [ ] Rapid status changes
- [ ] Multiple drawers (shouldn't be possible)
- [ ] Delete task while drawer open
- [ ] Logout while drawer open
- [ ] Session timeout while editing

## 12. Browser Compatibility

### Chrome (Latest)
- [ ] All features work
- [ ] No console errors

### Firefox (Latest)
- [ ] All features work
- [ ] No console errors

### Safari (Latest)
- [ ] All features work
- [ ] No console errors

### Edge (Latest)
- [ ] All features work
- [ ] No console errors

### Mobile Safari (iOS)
- [ ] Touch interactions work
- [ ] Camera access for photos
- [ ] No viewport issues

### Chrome Mobile (Android)
- [ ] Touch interactions work
- [ ] Camera access for photos
- [ ] Back button behavior correct

## Test Result Summary

| Category | Pass | Fail | N/A | Notes |
|----------|------|------|-----|-------|
| Opening & Closing | | | | |
| Task Details | | | | |
| Time Tracking | | | | |
| Comments | | | | |
| Photos | | | | |
| Responsive | | | | |
| Real-time | | | | |
| Error Handling | | | | |
| Performance | | | | |
| Accessibility | | | | |
| Edge Cases | | | | |
| Browser Compatibility | | | | |

## Issues Found

### Critical (Blocks Feature)
1. 

### Major (Significant Impact)
1. 

### Minor (Cosmetic/UX)
1. 

### Suggestions for Improvement
1. 

---

**Tested By:** _________________  
**Date:** _________________  
**Environment:** _________________  
**Version:** _________________
