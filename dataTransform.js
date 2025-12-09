// dataTransform.js
/**
 * Transform array with grouping, aggregation, and sorting.
 * Supports nested paths, composite keys, multiple aggregations.
 */
function transformData(arr, options) {
  if (!Array.isArray(arr)) throw new Error('First argument must be an array');
  if (!options?.groupBy) throw new Error('options.groupBy is required');

  const { groupBy, aggregations = {}, sortBy, filterFn } = options;

  // Helper: get nested value from object path
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  // Helper: create group key from single or composite keys
  const createGroupKey = (item) => {
    const keys = Array.isArray(groupBy) ? groupBy : [groupBy];
    return keys.map(key => getNestedValue(item, key)).join('|');
  };

  // Apply optional filter
  const items = filterFn ? arr.filter(filterFn) : arr;

  // Group items - O(n) complexity
  const groups = items.reduce((acc, item) => {
    const key = createGroupKey(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  // Calculate aggregations for each group
  const result = Object.entries(groups).map(([key, groupItems]) => {
    const keys = Array.isArray(groupBy) ? groupBy : [groupBy];
    const groupIdentity = keys.reduce((acc, k, i) => {
      acc[k.split('.').pop()] = key.split('|')[i];
      return acc;
    }, {});

    const aggregates = Object.entries(aggregations).reduce((acc, [field, aggFn]) => {
      const values = groupItems
        .map(item => getNestedValue(item, field))
        .filter(val => typeof val === 'number');

      if (values.length === 0) {
        acc[field] = null;
        return acc;
      }

      switch (aggFn) {
        case 'sum': acc[field] = values.reduce((sum, v) => sum + v, 0); break;
        case 'avg': acc[field] = values.reduce((sum, v) => sum + v, 0) / values.length; break;
        case 'min': acc[field] = Math.min(...values); break;
        case 'max': acc[field] = Math.max(...values); break;
        case 'count': acc[field] = values.length; break;
        default: throw new Error(`Unknown aggregation: ${aggFn}`);
      }

      return acc;
    }, {});

    return {
      ...groupIdentity,
      aggregates,
      items: groupItems,
      count: groupItems.length
    };
  });

  // Sort if specified
  if (sortBy?.field) {
    const { field, order = 'asc' } = sortBy;
    result.sort((a, b) => {
      const valA = a.aggregates[field] ?? 0;
      const valB = b.aggregates[field] ?? 0;
      return order === 'asc' ? valA - valB : valB - valA;
    });
  }

  return result;
}

// Test data
const bookings = [
  { id: 1, category: 'Hotel', location: { city: 'Bangkok', country: 'TH' }, price: 120, nights: 2 },
  { id: 2, category: 'Flight', location: { city: 'Tokyo', country: 'JP' }, price: 450, passengers: 1 },
  { id: 3, category: 'Hotel', location: { city: 'Bangkok', country: 'TH' }, price: 80, nights: 3 },
  { id: 4, category: 'Hotel', location: { city: 'Dubai', country: 'AE' }, price: 200, nights: 1 },
  { id: 5, category: 'Flight', location: { city: 'Bangkok', country: 'TH' }, price: 300, passengers: 2 },
];

console.log('\n=== Test 1: Basic grouping with sum/avg ===');
console.log(JSON.stringify(transformData(bookings, {
  groupBy: 'category',
  aggregations: { price: 'sum', nights: 'avg' },
  sortBy: { field: 'price', order: 'desc' }
}), null, 2));

console.log('\n=== Test 2: Nested path grouping ===');
console.log(JSON.stringify(transformData(bookings, {
  groupBy: 'location.city',
  aggregations: { price: 'avg', nights: 'max' },
  sortBy: { field: 'price', order: 'asc' }
}), null, 2));

console.log('\n=== Test 3: Composite keys ===');
console.log(JSON.stringify(transformData(bookings, {
  groupBy: ['category', 'location.city'],
  aggregations: { price: 'min' },
}), null, 2));

console.log('\n=== Test 4: With filter ===');
console.log(JSON.stringify(transformData(bookings, {
  groupBy: 'category',
  aggregations: { price: 'sum' },
  filterFn: (item) => item.price > 100
}), null, 2));

module.exports = transformData;

