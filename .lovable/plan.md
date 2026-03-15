

## Plan: Update MS004 PDF Field Coordinates

### What's wrong
The current coordinate map in `prefillMS004.ts` has incorrect X/Y positions, so text is drawn in the wrong places on the flat PDF — fields appear blank or misaligned.

### Change: `src/lib/prefillMS004.ts` (lines 23-35)

Update the `FIELD_MAP` coordinates to the user's verified values:

```typescript
const FIELD_MAP = {
  title:     { page: 2, x: 130, y: 710 },
  firstName: { page: 2, x: 130, y: 690 },
  surname:   { page: 2, x: 350, y: 690 },
  dob:       { page: 2, x: 130, y: 665 },
  gender:    { page: 2, x: 350, y: 665 },
  address:   { page: 2, x: 130, y: 635, maxWidth: 200 },
  suburb:    { page: 2, x: 130, y: 615 },
  state:     { page: 2, x: 370, y: 615 },
  postcode:  { page: 2, x: 430, y: 615 },
  phone:     { page: 2, x: 130, y: 590 },
  email:     { page: 2, x: 130, y: 570, maxWidth: 250 },
};
```

Key differences from current code:
- All X positions shifted from 120→130
- First name and surname now on the same Y line (690) with surname at x=350
- All Y positions adjusted upward (e.g., title 672→710, dob 588→665)
- Gender moved to same line as DOB at x=350

No other files need changes — the font, size, color, fetch logic, and download logic are all correct.

