# Google Maps API Setup Instructions

To enable address autocomplete functionality, you need to set up a Google Maps API key.

## Step 1: Get a Google Cloud Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

## Step 2: Enable Required APIs
You need to enable these APIs:
1. **Maps JavaScript API** - For loading Google Maps
2. **Places API** - For address autocomplete

To enable them:
1. In the Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Maps JavaScript API" and click on it
3. Click "Enable"
4. Repeat for "Places API"

## Step 3: Create API Key
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "API Key"
3. Copy the generated API key

## Step 4: Secure Your API Key (Recommended)
1. Click on your API key in the credentials list
2. Under "Application restrictions", select "HTTP referrers"
3. Add your website URLs:
   - For development: `http://localhost:3000/*`
   - For production: `https://yourdomain.com/*`
4. Under "API restrictions", select "Restrict key"
5. Select only the APIs you enabled (Maps JavaScript API, Places API)
6. Click "Save"

## Step 5: Add API Key to Your Project
1. Open the `.env.local` file in your project root
2. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key:
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-actual-api-key-here
   ```

## Step 6: Restart Your Development Server
```bash
npm run dev
```

## Troubleshooting

### "This API key is not authorized to use this service"
- Make sure you've enabled both Maps JavaScript API and Places API
- Check that your API key restrictions match your domain

### "You have exceeded your request quota"
- Google provides $200 free credit monthly
- Check your usage in the Cloud Console
- Consider implementing caching or rate limiting

### Address autocomplete not working
- Verify the API key is correctly set in `.env.local`
- Check browser console for any error messages
- Ensure the Places API is enabled

## Pricing Note
Google Maps Platform offers $200 of free usage every month. For most small to medium applications, this is sufficient. Monitor your usage in the Google Cloud Console to avoid unexpected charges.