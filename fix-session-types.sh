#!/bin/bash

# Find all TypeScript files in app/api and fix session.user references
find app/api -name "*.ts" -type f | while read file; do
  # Create a backup
  cp "$file" "$file.bak"
  
  # Replace session.user.businessId with (session.user as any).businessId
  sed -i 's/session\.user\.businessId/(session.user as any).businessId/g' "$file"
  
  # Replace session.user.role with (session.user as any).role
  sed -i 's/session\.user\.role/(session.user as any).role/g' "$file"
  
  # Replace session.user.id with (session.user as any).id
  sed -i 's/session\.user\.id/(session.user as any).id/g' "$file"
  
  # Fix cases where it's already partially fixed (avoid double casting)
  sed -i 's/(session\.user as any) as any/(session.user as any)/g' "$file"
  
  # Remove backup if changes were successful
  if [ $? -eq 0 ]; then
    rm "$file.bak"
  else
    # Restore from backup if sed failed
    mv "$file.bak" "$file"
  fi
done

echo "Session type fixes applied to all API routes"