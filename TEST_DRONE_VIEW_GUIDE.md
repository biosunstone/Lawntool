# Complete Testing Guide: test-drone-view with Polygon Features

## 🚀 Quick Start Testing Path

### Step 1: Open the Page
```
http://localhost:3000/test-drone-view
```

### Step 2: Understanding the Interface
When you open the page, you'll see:
- **Header**: Contains view mode toggle and action buttons
- **Map Area**: Main display area (changes based on mode)
- **Right Panel**: Controls and information

## 📍 Part 1: Creating and Storing Polygons

### Method 1: Using Polygon Templates

1. **Switch to Polygon Tools Mode**
   - Click the toggle button in header: `[Drone View | Polygon Tools]`
   - Select **"Polygon Tools"** (turns green when active)

2. **Open Polygon Templates**
   - Look at the LEFT side of the map
   - Find the **"Polygon Templates"** button at bottom of Mode Selector
   - Click it to open templates panel

3. **Select a Template**
   - Choose category: All Templates / Basic Shapes / Property / Landscape
   - Click any template (e.g., "Rectangle", "House Perimeter")
   - Template automatically appears on the map
   - Toast notification confirms: "Added [Template Name] template"

4. **Edit the Polygon**
   - Look at the RIGHT panel
   - Find the "Advanced Polygon Editor" section
   - You can:
     - **Rename**: Click edit icon, type new name
     - **Change Color**: Click color dot, pick new color
     - **Toggle Visibility**: Click eye icon
     - **Lock/Unlock**: Click lock icon
     - **Delete**: Click trash icon
     - **Duplicate**: Creates a copy with offset
     - **Reorder**: Use up/down arrows

### Method 2: Drawing Custom Polygons

1. **In Polygon Tools Mode**
   - Select measurement mode from left panel:
     - Lot Perimeter
     - Structure Perimeter
     - Custom Path
     - Area Band

2. **Draw on Map**
   - Click points to create polygon
   - Double-click to complete
   - Polygon appears in the editor list

### Method 3: Search Address First

1. **Click "Search Address"** button (green button in header)
2. **Enter an address** or use quick examples:
   - "CN Tower, Toronto"
   - "123 Main St, Toronto"
   - "Casa Loma, Toronto"
3. **Click Search**
4. **Auto-generates property boundaries**
5. **Switch to Polygon Tools** to refine/edit

## 💾 Part 2: How Data is Stored

### Automatic Storage Process

When you create/edit polygons in Polygon Tools mode, they are:

1. **Temporarily Stored in Component State**
   - Lives in the MosquitoMeasurementTool component
   - Updates in real-time as you edit

2. **Automatically Saved to MongoDB**
   - Each polygon set is saved as a document
   - Stored in `MosquitoMeasurement` collection
   - Contains:
     ```javascript
     {
       businessId: "sample-business-1",
       address: "123 Main St, Toronto",
       geometries: [
         {
           id: "unique-id",
           name: "Lot Perimeter",
           type: "lot_perimeter",
           coordinates: [{lat, lng}, ...],
           linearFeet: 250,
           color: "#22c55e",
           visible: true,
           locked: false
         }
       ],
       exclusionZones: [],
       status: "active",
       createdAt: "2024-01-15T...",
       updatedAt: "2024-01-15T..."
     }
     ```

3. **Visible in Recent Polygons**
   - Right panel shows "Recent Polygons" section
   - Displays last 5 saved polygons
   - Click eye icon to load any saved polygon

## 👨‍💼 Part 3: Admin Panel Management

### Accessing Admin Panel

**Method 1: Direct Navigation**
```
http://localhost:3000/admin/polygon-manager
```

**Method 2: From test-drone-view**
- Click **"Admin Panel"** button (purple) in header
- Or click "View all in admin panel →" link in Recent Polygons

### Admin Panel Features

1. **Dashboard Stats**
   - Total Polygons count
   - Total Geometries count
   - Total Linear Feet
   - Number of Businesses
   - Recent Activity (last 7 days)

2. **Filter and Search**
   - Click **"Filters"** button
   - Search by address/business name
   - Filter by status (Active/Archived/Deleted)
   - Filter by geometry type
   - Clear all filters

3. **Data Table Operations**
   - **View Details**: Click eye icon
   - **Edit Polygon**: Click edit icon
   - **Duplicate**: Click copy icon
   - **Bulk Select**: Check multiple items
   - **Bulk Archive**: Archive selected
   - **Bulk Delete**: Delete selected

4. **Export Data**
   - Click **"Export"** button
   - Downloads JSON file with all polygon data
   - Includes metadata and timestamps

## 🔄 Part 4: Complete Edit Workflow

### Scenario: Admin Edits Existing Polygon

1. **Create Initial Polygon** (in test-drone-view)
   ```
   - Switch to Polygon Tools mode
   - Add a Rectangle template
   - Change color to red
   - Rename to "Front Lawn Area"
   - It auto-saves
   ```

2. **Find in Admin Panel**
   ```
   - Go to Admin Panel
   - Look for your property address in the table
   - See "Front Lawn Area" with red color indicator
   ```

3. **Edit from Admin Panel**
   ```
   - Click Edit icon (pencil) for that row
   - Opens edit interface
   - Can modify:
     - Geometry coordinates
     - Colors and styles
     - Names and metadata
     - Status (active/archived)
   ```

4. **Verify Changes**
   ```
   - Go back to test-drone-view
   - Click eye icon in Recent Polygons
   - Or search the address again
   - See updated polygon with changes
   ```

## 📊 Part 5: Database Schema

### Collections Used

1. **MosquitoMeasurement** (for polygon tools data)
   - Primary storage for polygon geometries
   - Linked to business and property

2. **Measurement** (for standard measurements)
   - Stores basic property measurements
   - Can coexist with polygon data

3. **Business** (for multi-tenancy)
   - Each polygon linked to a business
   - Enables business-specific filtering

## 🧪 Part 6: Step-by-Step Test Scenario

### Complete Test Flow

1. **Start Fresh**
   ```bash
   # Open the page
   http://localhost:3000/test-drone-view
   ```

2. **Search for a Property**
   ```
   - Click "Search Address"
   - Enter: "CN Tower, Toronto"
   - Click Search
   - Wait for auto-detection
   ```

3. **Switch to Polygon Tools**
   ```
   - Toggle to "Polygon Tools" mode
   - See the auto-generated boundary
   ```

4. **Add Templates**
   ```
   - Click "Polygon Templates"
   - Add "House Perimeter"
   - Add "Garden Area"
   - Add "Rectangle"
   ```

5. **Edit Polygons**
   ```
   - In right panel editor:
   - Rename Rectangle to "Driveway"
   - Change Driveway color to gray
   - Delete Garden Area
   - Lock House Perimeter
   ```

6. **Check Storage**
   ```
   - Look at "Recent Polygons" in right panel
   - Should see "CN Tower, Toronto"
   - Note the color indicators
   ```

7. **Go to Admin Panel**
   ```
   - Click "Admin Panel" button
   - Find your CN Tower entry
   - See 2 geometries (House Perimeter, Driveway)
   ```

8. **Export Data**
   ```
   - Click "Export" in admin panel
   - Open downloaded JSON
   - Find your polygon data with all properties
   ```

9. **Reload and Verify**
   ```
   - Refresh the page
   - Go to Recent Polygons
   - Click eye icon on CN Tower
   - Polygons reload exactly as saved
   ```

## 🔍 Part 7: Verification Methods

### Check MongoDB Directly (Optional)
```javascript
// In MongoDB shell or Compass
db.mosquitomeasurements.find({
  address: /CN Tower/i
}).pretty()
```

### Check API Response
```bash
# Get all polygons (need admin auth)
curl http://localhost:3000/api/admin/polygons

# Response includes your saved polygons
```

### Browser Console Check
```javascript
// Open browser console on test-drone-view
// After adding polygons, check:
console.log('Check network tab for API calls to /api/admin/polygons')
```

## ⚡ Part 8: Quick Actions Reference

| Action | Where | How | Result |
|--------|-------|-----|--------|
| Add Template | Polygon Tools Mode | Click "Polygon Templates" → Select shape | Polygon appears on map |
| Edit Name | Right Panel | Click edit icon next to polygon | Name updates |
| Change Color | Right Panel | Click color dot | Color picker opens |
| Save to DB | Automatic | Just create/edit | Auto-saves |
| View Saved | Right Panel | "Recent Polygons" section | List of saved items |
| Admin View | Admin Panel | Navigate to /admin/polygon-manager | Full data table |
| Export All | Admin Panel | Click "Export" button | JSON download |
| Bulk Delete | Admin Panel | Select items → "Delete Selected" | Removes from DB |
| Load Saved | Recent Polygons | Click eye icon | Loads on map |

## 🎯 Part 9: Testing Checklist

### Basic Operations
- [ ] Switch between Drone and Polygon modes
- [ ] Search an address
- [ ] Add polygon template
- [ ] Edit polygon name
- [ ] Change polygon color
- [ ] Delete a polygon
- [ ] See polygon in Recent list

### Admin Operations
- [ ] Access admin panel
- [ ] See polygon in data table
- [ ] Use filters to find polygon
- [ ] Export data as JSON
- [ ] Bulk select polygons
- [ ] Archive selected polygons

### Persistence
- [ ] Create polygon and refresh page
- [ ] Load saved polygon from Recent list
- [ ] Verify data in admin panel
- [ ] Export and check JSON structure

## 🚨 Troubleshooting

### Issue: Polygons not saving
- Check browser console for errors
- Verify MongoDB is running
- Check network tab for API calls

### Issue: Admin panel empty
- Ensure you're in Polygon Tools mode when creating
- Check if you're logged in as admin
- Try refreshing the admin panel

### Issue: Templates not showing
- Make sure you're in Polygon Tools mode
- Click "Polygon Templates" button
- Check browser console for errors

## 📝 Notes

1. **Data Persistence**: All polygons are automatically saved to MongoDB
2. **Multi-tenancy**: Each polygon is linked to a businessId
3. **Real-time Updates**: Changes reflect immediately
4. **Export Format**: JSON with full metadata
5. **Access Control**: Admin panel requires admin role

This completes the comprehensive testing guide for polygon features in test-drone-view!