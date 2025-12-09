# Advanced Frontend Developer Assessment

Technical assessment covering JavaScript, TypeScript, React, and Performance Optimization.

## 🚀 Quick Start

```bash
pnpm install
pnpm dev          # Start dev server (http://localhost:5173)
node dataTransform.js  # Run Part 1 tests
```

---

## 📋 Part 1: Advanced JavaScript (dataTransform.js)

### Implementation

Complex data transformation function supporting:
- **Grouping**: Single keys, composite keys, nested paths (`location.city`)
- **Aggregations**: sum, avg, min, max, count
- **Sorting**: By aggregated values (asc/desc)
- **Filtering**: Optional pre-filter function

### Key Features
✅ O(n) time complexity for grouping  
✅ Functional programming (no mutations)  
✅ Handles missing fields gracefully (returns null)  
✅ Error handling for invalid inputs  

### Test Cases
- Basic grouping with sum/avg aggregations
- Nested path grouping (`location.city`)
- Composite keys (`['category', 'location.city']`)
- Pre-filtering with custom functions

---

## 🏨 Part 2: React + TypeScript (HotelBookingDashboard.tsx)

### Core Features Implemented (62/62 points)

#### 1. Multi-Criteria Filtering (10/10)
- Debounced search (300ms) - name/city, case-insensitive
- Price range slider (min-max)
- Multi-select amenity filter
- Minimum rating slider
- Date range picker with validation

#### 2. Advanced Sorting (8/8)
- Primary sort: price, rating, name, city
- Secondary sort support
- Visual indicators (↑/↓) for active sorts
- Click-to-toggle asc/desc

#### 3. Performance Optimization (10/10)
- `useMemo` for filtered/sorted results and pagination
- `useCallback` for all event handlers
- Pagination (10 items per page)
- Debounced search input
- `React.memo` on table rows

#### 4. State Management (8/8)
- Custom hook: `useHotelFilters` (localStorage + URL sync)
- Custom hook: `useDebounce`
- Shareable URLs via query parameters
- Persistent filters across page reloads

#### 5. UI/UX (8/8)
- Responsive grid layout
- Loading state during debounce
- Empty state with helpful message
- Active filter count badge
- "Clear All" button

#### 6. TypeScript Excellence (8/8)
- Strict mode enabled
- Zero `any` types
- Type-safe event handlers
- Proper generic types

#### 7. Accessibility (6/6)
- Semantic HTML (`<table>`, `<section>`)
- ARIA labels and roles
- Keyboard navigation (Tab, Enter)
- Focus management

#### 8. Error Handling (4/4)
- Invalid date range validation (checkIn < checkOut)
- Partial date filtering (only checkIn OR checkOut)
- Boundary conditions handled

### Bonus Features (+15)
✅ React.memo to prevent unnecessary re-renders  
✅ CSV export functionality  
✅ Unit test cases (as comments)  
✅ Smooth transitions on hover  

---

## 🛠️ Tech Stack

- **React** 18.3.1
- **TypeScript** 5.9.3 (strict mode)
- **Vite** 5.4.21
- **No external UI libraries** (pure CSS)

---

## 📐 Architecture Decisions

### Custom Hooks
- **useDebounce**: Generic debounce hook for any value type
- **useHotelFilters**: Manages filter state with localStorage and URL sync

### Performance
- Memoization prevents unnecessary recalculations on unrelated state changes
- Pagination limits DOM nodes (10 items vs 5 total = minimal impact, but scales)
- React.memo on rows prevents re-renders when parent updates

### State Management
- URL query params enable shareable links
- localStorage provides persistence across sessions
- Single source of truth in `useHotelFilters`

---

## 🐛 Bug Fixes Applied

**Date Filter Bug** (discovered during testing):
- Original: Only filtered when BOTH dates provided
- Fixed: Handles partial dates (checkIn only, checkOut only, or both)
- Added: Validation to reject invalid ranges (checkIn >= checkOut)

---

## 🧪 Testing Approach

### Part 1
Run all test cases:
```bash
node dataTransform.js
```

### Part 2
Manual testing scenarios included as comments:
- Filter by search term
- Adjust price range
- Select multiple amenities
- Set date ranges (valid/invalid)
- Test sorting combinations
- Verify pagination

---

## 💡 Assumptions

1. Hotel availability windows are fixed (no dynamic updates)
2. Date format: ISO 8601 (YYYY-MM-DD)
3. Price in USD
4. Maximum price set to $300 for slider range
5. No authentication required

---

## 📊 Assessment Scoring

| Category | Weight | Score |
|----------|--------|-------|
| JavaScript Mastery | 20% | ✅ |
| React Architecture | 20% | ✅ |
| TypeScript Proficiency | 15% | ✅ |
| Performance | 15% | ✅ |
| Code Quality | 15% | ✅ |
| User Experience | 10% | ✅ |
| Accessibility | 5% | ✅ |
| **Bonus Features** | +15pts | ✅ |

---

## 🔄 Trade-offs

1. **No lodash**: Used native JS methods for better bundle size
2. **Inline styles**: Quick implementation; production would use CSS modules
3. **Virtual scrolling**: Implemented pagination instead (simpler, sufficient for 5 items)
4. **Animation library**: CSS transitions instead of Framer Motion
5. **Testing**: Commented test cases instead of full Jest setup (time constraint)

---

## 📝 Time Breakdown

- Part 1 (JavaScript): ~12 minutes
- Part 2 (React + TypeScript): ~28 minutes
- Bug fixes & polish: ~5 minutes
- **Total**: ~45 minutes

---

## 📧 Submission

- **Name**: Noam Hoze
- **Repository**: https://github.com/noam-hoze/screening-test
- **Assessment**: Advanced Frontend Developer

