import React, { useState, useMemo, useCallback, useEffect, memo } from 'react';

type Hotel = {
  id: number;
  name: string;
  city: string;
  price: number;
  rating: number;
  amenities: string[];
  availability: {
    checkIn: string;
    checkOut: string;
  };
};

const HOTELS: Hotel[] = [
  { id: 1, name: "Agoda Palace", city: "Bangkok", price: 120, rating: 4.5, amenities: ["WiFi", "Pool", "Gym"], availability: { checkIn: "2025-01-15", checkOut: "2025-01-20" } },
  { id: 2, name: "Seaside View", city: "Phuket", price: 80, rating: 4.2, amenities: ["WiFi", "Beach"], availability: { checkIn: "2025-01-10", checkOut: "2025-01-25" } },
  { id: 3, name: "Mountain Stay", city: "Chiang Mai", price: 100, rating: 4.8, amenities: ["WiFi", "Gym", "Spa"], availability: { checkIn: "2025-01-05", checkOut: "2025-01-30" } },
  { id: 4, name: "Urban Loft", city: "Bangkok", price: 150, rating: 4.6, amenities: ["WiFi", "Pool"], availability: { checkIn: "2025-01-12", checkOut: "2025-01-18" } },
  { id: 5, name: "Tropical Resort", city: "Phuket", price: 200, rating: 4.9, amenities: ["WiFi", "Pool", "Beach", "Spa"], availability: { checkIn: "2025-01-08", checkOut: "2025-01-22" } },
];

type FilterState = {
  search: string;
  priceRange: [number, number];
  amenities: string[];
  minRating: number;
  dateRange: { checkIn: string; checkOut: string };
};

type SortConfig = {
  field: keyof Hotel;
  order: 'asc' | 'desc';
  secondary?: { field: keyof Hotel; order: 'asc' | 'desc' };
};

// Custom hook: Debounce input
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook: Hotel filters with localStorage and URL sync
function useHotelFilters() {
  const getInitialFilters = (): FilterState => {
    const params = new URLSearchParams(window.location.search);
    const stored = localStorage.getItem('hotelFilters');
    
    if (params.toString()) {
      return {
        search: params.get('search') || '',
        priceRange: [Number(params.get('minPrice')) || 0, Number(params.get('maxPrice')) || 300],
        amenities: params.get('amenities')?.split(',').filter(Boolean) || [],
        minRating: Number(params.get('minRating')) || 0,
        dateRange: { checkIn: params.get('checkIn') || '', checkOut: params.get('checkOut') || '' }
      };
    }
    
    return stored ? JSON.parse(stored) : {
      search: '',
      priceRange: [0, 300] as [number, number],
      amenities: [] as string[],
      minRating: 0,
      dateRange: { checkIn: '', checkOut: '' }
    };
  };

  const [filters, setFilters] = useState<FilterState>(getInitialFilters);

  useEffect(() => {
    localStorage.setItem('hotelFilters', JSON.stringify(filters));
    
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.priceRange[0] > 0) params.set('minPrice', String(filters.priceRange[0]));
    if (filters.priceRange[1] < 300) params.set('maxPrice', String(filters.priceRange[1]));
    if (filters.amenities.length) params.set('amenities', filters.amenities.join(','));
    if (filters.minRating > 0) params.set('minRating', String(filters.minRating));
    if (filters.dateRange.checkIn) params.set('checkIn', filters.dateRange.checkIn);
    if (filters.dateRange.checkOut) params.set('checkOut', filters.dateRange.checkOut);
    
    window.history.replaceState({}, '', `?${params.toString()}`);
  }, [filters]);

  return { filters, setFilters };
}

// Memoized Hotel Row component
const HotelRow = memo(({ hotel }: { hotel: Hotel }) => (
  <tr className="hotel-row">
    <td>{hotel.name}</td>
    <td>{hotel.city}</td>
    <td>${hotel.price}</td>
    <td>⭐ {hotel.rating}</td>
    <td>{hotel.amenities.join(', ')}</td>
    <td>{hotel.availability.checkIn} to {hotel.availability.checkOut}</td>
  </tr>
));

export default function HotelBookingDashboard() {
  const { filters, setFilters } = useHotelFilters();
  const [sort, setSort] = useState<SortConfig>({ field: 'price', order: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState(filters.search);
  
  const debouncedSearch = useDebounce(searchInput, 300);
  const isLoading = searchInput !== debouncedSearch;

  // Sync debounced search with filters
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch, setFilters]);

  // Get all unique amenities
  const allAmenities = useMemo(() => 
    Array.from(new Set(HOTELS.flatMap(h => h.amenities))).sort(),
    []
  );

  // Helper: Parse partial date and return range
  const parsePartialDate = useCallback((dateStr: string): { start: Date; end: Date } | null => {
    if (!dateStr) return null;
    
    const parts = dateStr.split('-');
    const year = parts[0] ? parseInt(parts[0]) : null;
    const month = parts[1] ? parseInt(parts[1]) : null;
    const day = parts[2] ? parseInt(parts[2]) : null;
    
    if (!year || year < 1900) return null;
    
    if (day && month) {
      // Full date: YYYY-MM-DD
      const date = new Date(year, month - 1, day);
      return { start: date, end: date };
    } else if (month) {
      // Year + Month: YYYY-MM
      const lastDay = new Date(year, month, 0).getDate();
      return {
        start: new Date(year, month - 1, 1),
        end: new Date(year, month - 1, lastDay, 23, 59, 59)
      };
    } else {
      // Year only: YYYY
      return {
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59)
      };
    }
  }, []);

  // Helper: Check if date ranges overlap
  const rangesOverlap = useCallback((
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): boolean => {
    return range1.start <= range2.end && range1.end >= range2.start;
  }, []);

  // Filter and sort hotels (memoized)
  const filteredHotels = useMemo(() => {
    let results = HOTELS.filter(hotel => {
      // Search filter
      const searchLower = filters.search.toLowerCase();
      if (searchLower && !hotel.name.toLowerCase().includes(searchLower) && 
          !hotel.city.toLowerCase().includes(searchLower)) return false;

      // Price range
      if (hotel.price < filters.priceRange[0] || hotel.price > filters.priceRange[1]) return false;

      // Amenities (must have all selected)
      if (filters.amenities.length && !filters.amenities.every(a => hotel.amenities.includes(a))) return false;

      // Min rating
      if (hotel.rating < filters.minRating) return false;

      // Date range availability (with partial date support)
      const hotelRange = {
        start: new Date(hotel.availability.checkIn),
        end: new Date(hotel.availability.checkOut)
      };
      
      if (filters.dateRange.checkIn) {
        const checkInRange = parsePartialDate(filters.dateRange.checkIn);
        if (!checkInRange) return false;
        
        if (filters.dateRange.checkOut) {
          const checkOutRange = parsePartialDate(filters.dateRange.checkOut);
          if (!checkOutRange) return false;
          
          // Validate: check-in must be before check-out
          if (checkInRange.start >= checkOutRange.end) return false;
          
          // Check if requested range overlaps with hotel availability
          const requestedRange = { start: checkInRange.start, end: checkOutRange.end };
          if (!rangesOverlap(requestedRange, hotelRange)) return false;
        } else {
          // Only check-in: ensure it overlaps with hotel availability
          if (!rangesOverlap(checkInRange, hotelRange)) return false;
        }
      } else if (filters.dateRange.checkOut) {
        // Only check-out: ensure it overlaps with hotel availability
        const checkOutRange = parsePartialDate(filters.dateRange.checkOut);
        if (!checkOutRange) return false;
        if (!rangesOverlap(checkOutRange, hotelRange)) return false;
      }

      return true;
    });

    // Sorting with secondary sort
    results.sort((a, b) => {
      const primaryCompare = sort.order === 'asc' 
        ? (a[sort.field] > b[sort.field] ? 1 : -1)
        : (a[sort.field] < b[sort.field] ? 1 : -1);
      
      if (primaryCompare !== 0 || !sort.secondary) return primaryCompare;
      
      return sort.secondary.order === 'asc'
        ? (a[sort.secondary.field] > b[sort.secondary.field] ? 1 : -1)
        : (a[sort.secondary.field] < b[sort.secondary.field] ? 1 : -1);
    });

    return results;
  }, [filters, sort]);

  // Pagination
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredHotels.length / itemsPerPage);
  const paginatedHotels = useMemo(() => 
    filteredHotels.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage),
    [filteredHotels, currentPage]
  );

  // Active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.search) count++;
    if (filters.priceRange[0] > 0 || filters.priceRange[1] < 300) count++;
    if (filters.amenities.length) count++;
    if (filters.minRating > 0) count++;
    if (filters.dateRange.checkIn || filters.dateRange.checkOut) count++;
    return count;
  }, [filters]);

  // Event handlers (memoized)
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    setCurrentPage(1);
  }, []);

  const handlePriceChange = useCallback((index: number, value: string) => {
    const numValue = Number(value);
    setFilters(prev => {
      const newRange: [number, number] = [...prev.priceRange];
      newRange[index] = numValue;
      return { ...prev, priceRange: newRange };
    });
    setCurrentPage(1);
  }, [setFilters]);

  const handleAmenityToggle = useCallback((amenity: string) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
    setCurrentPage(1);
  }, [setFilters]);

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    setFilters({
      search: '',
      priceRange: [0, 300],
      amenities: [],
      minRating: 0,
      dateRange: { checkIn: '', checkOut: '' }
    });
    setCurrentPage(1);
  }, [setFilters]);

  const handleSort = useCallback((field: keyof Hotel) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc',
      secondary: prev.field !== field ? { field: prev.field, order: prev.order } : undefined
    }));
  }, []);

  const exportToCSV = useCallback(() => {
    const headers = ['Name', 'City', 'Price', 'Rating', 'Amenities', 'Check-In', 'Check-Out'];
    const rows = filteredHotels.map(h => [
      h.name, h.city, h.price, h.rating, h.amenities.join('; '), 
      h.availability.checkIn, h.availability.checkOut
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hotels.csv';
    a.click();
  }, [filteredHotels]);

  return (
    <div className="dashboard" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif', padding: '40px 20px', maxWidth: '1400px', margin: '0 auto', background: '#fafafa', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '600', letterSpacing: '-0.5px', color: '#1d1d1f', marginBottom: '8px' }}>Hotel Booking Dashboard</h1>
      <p style={{ fontSize: '17px', color: '#86868b', marginBottom: '32px', fontWeight: '400' }}>Find your perfect stay</p>

      {/* Filters Section */}
      <section className="filters" style={{ background: 'white', padding: '24px', borderRadius: '16px', marginBottom: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }} aria-label="Hotel filters">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '20px' }}>
          <input
            type="text"
            placeholder="Search by name or city..."
            value={searchInput}
            onChange={handleSearchChange}
            aria-label="Search hotels"
            style={{ flex: 1, padding: '12px 16px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '10px', fontSize: '15px', background: '#f9f9f9', transition: 'all 0.2s' }}
          />
          {activeFilterCount > 0 && (
            <span className="badge" style={{ background: '#007aff', color: 'white', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '500' }}>
              {activeFilterCount} active
            </span>
          )}
          <button onClick={handleClearFilters} aria-label="Clear all filters" className="btn-secondary">
            Clear All
          </button>
          <button onClick={exportToCSV} aria-label="Export to CSV" className="btn-primary">
            Export CSV
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px' }}>
          {/* Price Range */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', display: 'block', marginBottom: '8px' }}>Price: ${filters.priceRange[0]} - ${filters.priceRange[1]}</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" value={filters.priceRange[0]} onChange={e => handlePriceChange(0, e.target.value)} 
                     min="0" max="300" aria-label="Minimum price" style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px' }} />
              <input type="number" value={filters.priceRange[1]} onChange={e => handlePriceChange(1, e.target.value)} 
                     min="0" max="300" aria-label="Maximum price" style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px' }} />
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <label htmlFor="rating" style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', display: 'block', marginBottom: '8px' }}>Min Rating: ⭐ {filters.minRating || 'Any'}</label>
            <input id="rating" type="range" min="0" max="5" step="0.1" value={filters.minRating}
                   onChange={e => { setFilters(prev => ({ ...prev, minRating: Number(e.target.value) })); setCurrentPage(1); }}
                   aria-label="Minimum rating" style={{ width: '100%', accentColor: '#007aff' }} />
          </div>

          {/* Date Range */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', display: 'block', marginBottom: '8px' }}>Check-In / Check-Out</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="date" value={filters.dateRange.checkIn} 
                     onChange={e => { setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, checkIn: e.target.value } })); setCurrentPage(1); }}
                     aria-label="Check-in date" style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px' }} />
              <input type="date" value={filters.dateRange.checkOut} 
                     onChange={e => { setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, checkOut: e.target.value } })); setCurrentPage(1); }}
                     aria-label="Check-out date" style={{ width: '100%', padding: '8px 12px', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', fontSize: '14px' }} />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#1d1d1f', display: 'block', marginBottom: '8px' }}>Amenities</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allAmenities.map(amenity => (
                <button
                  key={amenity}
                  onClick={() => handleAmenityToggle(amenity)}
                  aria-pressed={filters.amenities.includes(amenity)}
                  className={filters.amenities.includes(amenity) ? 'amenity-btn active' : 'amenity-btn'}
                >
                  {amenity}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Loading State */}
      {isLoading && <div style={{ textAlign: 'center', padding: '24px', color: '#86868b', fontSize: '15px' }}>Searching...</div>}

      {/* Results */}
      {!isLoading && (
        <>
          {filteredHotels.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: '#86868b', background: 'white', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }} role="status">
              <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#1d1d1f', marginBottom: '8px' }}>No hotels found</h2>
              <p style={{ fontSize: '15px' }}>Try adjusting your filters</p>
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px', color: '#86868b', fontSize: '14px', fontWeight: '500' }}>
                Showing {filteredHotels.length} hotel{filteredHotels.length !== 1 ? 's' : ''}
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.06)' }} role="table">
                <thead>
                  <tr style={{ background: '#fafafa', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {(['name', 'city', 'price', 'rating'] as const).map(field => (
                      <th key={field} style={{ padding: '16px', textAlign: 'left', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '0.2px', textTransform: 'uppercase' }}
                          onClick={() => handleSort(field)}
                          tabIndex={0}
                          onKeyDown={e => e.key === 'Enter' && handleSort(field)}
                          aria-sort={sort.field === field ? (sort.order === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        {field.charAt(0).toUpperCase() + field.slice(1)} 
                        {sort.field === field && (sort.order === 'asc' ? ' ↑' : ' ↓')}
                        {sort.secondary?.field === field && ' (2nd)'}
                      </th>
                    ))}
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '0.2px', textTransform: 'uppercase' }}>Amenities</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '0.2px', textTransform: 'uppercase' }}>Availability</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHotels.map(hotel => (
                    <HotelRow key={hotel.id} hotel={hotel} />
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '24px', alignItems: 'center' }} role="navigation" aria-label="Pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                          className="btn-secondary" aria-label="Previous page">
                    ← Prev
                  </button>
                  <span style={{ padding: '8px 16px', fontSize: '14px', color: '#86868b', fontWeight: '500' }}>Page {currentPage} of {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                          className="btn-secondary" aria-label="Next page">
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}

      <style>{`
        .hotel-row { border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s cubic-bezier(0.4, 0, 0.2, 1); }
        .hotel-row:hover { background: #fafafa; }
        .hotel-row td { padding: 16px; font-size: 15px; color: #1d1d1f; }
        
        .btn-primary {
          padding: 10px 20px;
          background: #007aff;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-primary:hover:not(:disabled) { background: #0051d5; transform: translateY(-1px); }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        
        .btn-secondary {
          padding: 10px 20px;
          background: #f5f5f7;
          color: #1d1d1f;
          border: none;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-secondary:hover:not(:disabled) { background: #e8e8ed; }
        .btn-secondary:active:not(:disabled) { transform: scale(0.98); }
        
        .amenity-btn {
          padding: 6px 14px;
          background: #f5f5f7;
          color: #1d1d1f;
          border: 1px solid rgba(0,0,0,0.08);
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .amenity-btn:hover { background: #e8e8ed; }
        .amenity-btn.active {
          background: #007aff;
          color: white;
          border-color: #007aff;
        }
        
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        
        input[type="text"]:focus, input[type="number"]:focus, input[type="date"]:focus {
          outline: none;
          border-color: #007aff;
          background: white;
        }
      `}</style>
    </div>
  );
}

/**
 * UNIT TEST CASES (as comments):
 * 
 * Test 1: useDebounce hook
 * - Should delay value updates by specified ms
 * - Should cancel previous timeout on rapid changes
 * 
 * Test 2: Filter functionality
 * - Search 'Bangkok' should return 2 hotels
 * - Price range [100, 150] should return 3 hotels
 * - Amenities ['Pool', 'Spa'] should return only Tropical Resort
 * 
 * Test 3: Sorting
 * - Sort by price asc: Seaside(80), Mountain(100), Agoda(120)...
 * - Sort by rating desc with secondary price asc: Tropical(4.9), Mountain(4.8)...
 */

