# Polygon Features Testing Guide

## Prerequisites
1. Ensure the development server is running:
   ```bash
   npm run dev
   ```
2. Have admin credentials ready for testing admin features
3. Have a test business account for customer features

## 1. Testing Polygon Templates (Front-end)

### Step 1: Access the Mosquito Measurement Tool
1. Navigate to a page that uses the mosquito measurement tool
2. Look for the map interface with measurement controls

### Step 2: Locate Template Controls
1. In the left panel (Mode Selector), look for the **"Polygon Templates"** button
2. It should be at the bottom of the mode selector panel, below the Hybrid Mode toggle
3. Click the "Polygon Templates" button

### Step 3: Test Template Selection
1. When clicked, a template panel should appear to the right of the mode selector
2. You should see three categories:
   - **All Templates** (10 templates)
   - **Basic Shapes** (5 templates)
   - **Property** (2 templates)
   - **Landscape** (3 templates)

### Step 4: Test Each Template Type
1. Click on each category tab to filter templates
2. Select a template (e.g., "Rectangle")
3. Observe:
   - Template is added to the map at the current center position
   - Green checkmark appears on selected template
   - Toast notification confirms addition
   - Template panel auto-closes after 1.5 seconds
   - New geometry appears in the polygon list

### Step 5: Verify Template Features
For each template added, verify:
- Correct shape is displayed on the map
- Linear feet calculation is shown
- Color coding matches the template preview
- Can be edited using the Advanced Polygon Editor
- Can be deleted, renamed, locked, and reordered

### Step 6: Test Multiple Templates
1. Add multiple templates of different types
2. Verify they don't overlap (each uses center coordinates)
3. Check total linear feet updates correctly
4. Test visibility toggles for each template

## 2. Testing Admin Panel Features

### Step 1: Access Admin Panel
1. Login with admin credentials
2. Navigate to: `/admin/polygon-manager`
3. You should see the "Polygon Manager" dashboard

### Step 2: Verify Dashboard Stats
Check the five stat cards display:
- **Total Polygons**: Count of all polygon sets
- **Total Geometries**: Individual geometry count
- **Businesses**: Number of businesses with polygons
- **Total Linear Feet**: Sum of all measurements
- **Recent Activity**: Polygons created in last 7 days

### Step 3: Test Filtering
1. Click the **"Filters"** button
2. Test each filter:
   - **Search**: Type business names or addresses
   - **Status**: Filter by Active/Archived/Deleted
   - **Geometry Type**: Filter by measurement type
   - **Clear Filters**: Reset all filters

### Step 4: Test Data Table Features
1. **Select All**: Check the header checkbox
2. **Individual Selection**: Check individual row checkboxes
3. **Bulk Actions** (when items selected):
   - Archive Selected
   - Delete Selected
   - Clear Selection

### Step 5: Test Row Actions
For each polygon row, test the action buttons:
- **Eye icon**: View polygon details
- **Edit icon**: Edit polygon
- **Copy icon**: Duplicate polygon

### Step 6: Test Export Feature
1. Click the **"Export"** button in the header
2. Verify JSON file downloads with:
   - Export metadata (date, user)
   - All polygon data
   - Proper formatting

### Step 7: Test Refresh
1. Click **"Refresh"** button
2. Verify data reloads
3. Check stats update if changes were made

## 3. Testing Backend APIs

### Test GET Polygons API
```bash
# Get all polygons (requires admin auth)
curl -X GET http://localhost:3000/api/admin/polygons \
  -H "Cookie: [your-session-cookie]"

# With filters
curl -X GET "http://localhost:3000/api/admin/polygons?businessId=123&status=active&page=1&limit=50" \
  -H "Cookie: [your-session-cookie]"
```

### Test POST Create Polygon
```bash
curl -X POST http://localhost:3000/api/admin/polygons \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "businessId": "123",
    "propertyAddress": "123 Test St",
    "geometries": [{
      "name": "Test Polygon",
      "type": "custom_path",
      "coordinates": [
        {"lat": 40.7128, "lng": -74.0060},
        {"lat": 40.7130, "lng": -74.0060},
        {"lat": 40.7130, "lng": -74.0058},
        {"lat": 40.7128, "lng": -74.0058}
      ],
      "linearFeet": 100,
      "color": "#22c55e"
    }],
    "type": "standard"
  }'
```

### Test Bulk Delete
```bash
curl -X POST http://localhost:3000/api/admin/polygons/bulk-delete \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"ids": ["id1", "id2", "id3"]}'
```

### Test Bulk Archive
```bash
curl -X POST http://localhost:3000/api/admin/polygons/bulk-archive \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"ids": ["id1", "id2", "id3"]}'
```

### Test Export
```bash
curl -X GET http://localhost:3000/api/admin/polygons/export \
  -H "Cookie: [your-session-cookie]" \
  -o polygon-export.json
```

## 4. Testing Advanced Polygon Editor

### Step 1: Create or Select a Polygon
1. Add a template or draw a custom polygon
2. The Advanced Polygon Editor should appear in the right panel

### Step 2: Test Visual Features
1. **Color Indicators**: Each polygon has a colored dot
2. **Hover Effects**: Polygons highlight on hover
3. **Selection**: Click to select, shows blue border
4. **Lock Status**: Locked polygons show lock icon
5. **Visibility**: Hidden polygons show eye-off icon

### Step 3: Test Actions
For each polygon, test:
1. **Rename**: Click edit icon, enter new name
2. **Toggle Visibility**: Click eye icon
3. **Toggle Lock**: Click lock icon
4. **Delete**: Click trash icon (confirm dialog)
5. **Duplicate**: Creates copy with offset
6. **Reorder**: Use up/down arrows

### Step 4: Test Color Picker
1. Click the color dot on any polygon
2. Color picker should appear
3. Select new color
4. Verify polygon updates on map

## 5. Common Issues & Troubleshooting

### Issue: Templates not appearing
- Check console for errors
- Verify MosquitoMeasurementTool is properly imported
- Ensure center coordinates are valid

### Issue: Admin panel access denied
- Verify user role is 'admin'
- Check session is valid
- Ensure authOptions includes admin role

### Issue: Polygons not saving
- Check MongoDB connection
- Verify businessId is valid
- Check required fields are present

### Issue: Export not working
- Check browser allows downloads
- Verify data exists in database
- Check console for API errors

## 6. Testing Checklist

### Polygon Templates
- [ ] Templates panel opens/closes
- [ ] All categories display correctly
- [ ] Each template type creates correct shape
- [ ] Templates add to map at center position
- [ ] Linear feet calculated correctly
- [ ] Colors match preview
- [ ] Toast notifications appear
- [ ] Templates integrate with existing features

### Admin Panel
- [ ] Dashboard loads with correct stats
- [ ] Filtering works for all options
- [ ] Search filters results correctly
- [ ] Bulk selection works
- [ ] Bulk actions execute properly
- [ ] Individual actions work (view/edit/copy)
- [ ] Export generates valid JSON
- [ ] Refresh updates data

### Advanced Editor
- [ ] All polygons display in list
- [ ] Visual indicators work (color/lock/visibility)
- [ ] Rename saves correctly
- [ ] Delete removes from map and list
- [ ] Duplicate creates offset copy
- [ ] Reorder changes display order
- [ ] Color picker updates polygon
- [ ] Lock prevents editing

### API Endpoints
- [ ] GET returns paginated results
- [ ] POST creates new polygons
- [ ] Bulk delete removes multiple
- [ ] Bulk archive updates status
- [ ] Export returns JSON file

## 7. Performance Testing

### Load Testing
1. Add 20+ polygons using templates
2. Verify map performance remains smooth
3. Check editor list scrolls properly
4. Test bulk operations with many items

### Memory Testing
1. Monitor browser memory usage
2. Add/remove polygons repeatedly
3. Check for memory leaks
4. Verify cleanup on component unmount

## Next Steps

After testing these features, you may want to:
1. Create automated tests using Jest/Cypress
2. Add error boundary components
3. Implement undo/redo functionality
4. Add polygon import feature
5. Create customer-specific admin panel
6. Add polygon sharing between users
7. Implement polygon versioning
8. Add area-based pricing calculations