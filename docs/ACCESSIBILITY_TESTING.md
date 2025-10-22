# Accessibility Testing Guide

## Automated Testing

### Tools
1. **Lighthouse** (Chrome DevTools)
   - Run: Chrome DevTools → Lighthouse → Accessibility
   - Target: ≥95 score on all pages
   
2. **axe DevTools** (Browser Extension)
   - Install: [Chrome](https://chrome.google.com/webstore) or [Firefox](https://addons.mozilla.org)
   - Run on every page before deployment

3. **WAVE** (Browser Extension)
   - Install: https://wave.webaim.org/extension/
   - Check for errors, alerts, contrast issues

### Automated Test Checklist
- [ ] No accessibility errors in Lighthouse
- [ ] No critical issues in axe DevTools
- [ ] All images have alt text or aria-label
- [ ] All form inputs have labels
- [ ] All buttons have accessible names
- [ ] Heading hierarchy is correct (h1 → h2 → h3)
- [ ] Color contrast meets WCAG AA (4.5:1 for text)

## Manual Testing

### Keyboard Navigation
Test every page with keyboard only (no mouse):
- [ ] Tab through all interactive elements
- [ ] Shift+Tab to go backwards
- [ ] Enter/Space to activate buttons/links
- [ ] Escape to close modals
- [ ] Arrow keys to navigate menus
- [ ] Focus visible at all times (blue ring)
- [ ] No keyboard traps (can always escape)

### Screen Reader Testing

**Windows (NVDA - Free):**
1. Download: https://www.nvaccess.org/download/
2. Start NVDA: Ctrl+Alt+N
3. Navigate: Arrow keys, Tab, Enter
4. Read all: Insert+Down Arrow
5. Stop: Ctrl

**Mac (VoiceOver - Built-in):**
1. Start: Cmd+F5
2. Navigate: VO keys (Ctrl+Option) + Arrow keys
3. Interact: VO+Shift+Down Arrow
4. Read all: VO+A

**Test Checklist:**
- [ ] Page title announced on load
- [ ] Headings announced correctly
- [ ] Landmark regions announced (main, nav, footer)
- [ ] Form labels read with inputs
- [ ] Error messages announced
- [ ] Button purposes clear
- [ ] Link destinations clear
- [ ] Dynamic content announced (toasts, alerts)

### Mobile Testing

**Touch Target Size:**
- [ ] All buttons/links ≥44×44px (use touch size variant)
- [ ] Adequate spacing between interactive elements
- [ ] No tiny text or icons

**Responsive Behavior:**
- [ ] Mobile sheet navigation opens correctly
- [ ] Tables convert to card layout on mobile
- [ ] Forms stack vertically
- [ ] No horizontal scrolling
- [ ] Text zooms to 200% without breaking layout

### Zoom Testing
- [ ] Browser zoom to 200%: Ctrl/Cmd + (5 times)
- [ ] Text reflows correctly
- [ ] No overlapping content
- [ ] All functionality still accessible

## Common Issues & Fixes

### Issue: Low Color Contrast
**Fix:** Use color contrast checker
- Tool: https://webaim.org/resources/contrastchecker/
- Minimum ratio: 4.5:1 for normal text, 3:1 for large text

### Issue: Missing Alt Text
**Fix:** Add to all images
```tsx
<img src="..." alt="Description of image" />
<div role="img" aria-label="Description">...</div>
```

### Issue: Form Errors Not Announced
**Fix:** Add aria-describedby and role="alert"
```tsx
<Input aria-describedby="error-id" aria-invalid={hasError} />
{hasError && <p id="error-id" role="alert">Error message</p>}
```

### Issue: Modal Not Trapping Focus
**Fix:** Use Radix UI Dialog component (already handles this)

### Issue: Dynamic Content Not Announced
**Fix:** Use aria-live regions
```tsx
<div aria-live="polite" aria-atomic="true">
  {dynamicMessage}
</div>
```

## Testing Schedule

### Before Every Deployment:
- Run Lighthouse accessibility audit
- Test keyboard navigation on modified pages
- Verify no axe DevTools errors

### Weekly:
- Full screen reader test of critical paths
- Mobile device testing (iOS + Android)
- Zoom testing at 200%

### Monthly:
- Comprehensive manual test of all pages
- User testing with accessibility users
- Review and update this guide
