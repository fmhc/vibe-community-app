# 🚀 Quick Directus Manual Setup

## Essential Fields to Add

Go to: https://directus-vibe-coding.looks-rare.at/admin
Navigate to: Settings → Data Model → `community_members`

### Add These Fields (Click "Create Field" for each):

1. **email** (String)
   - ✅ Required
   - ✅ Unique
   - Interface: Input

2. **name** (String)
   - Interface: Input

3. **experience_level** (Integer)
   - ✅ Required
   - Interface: Slider
   - Min: 0, Max: 100

4. **project_interest** (String)
   - Interface: Input

5. **project_details** (Text)
   - Interface: Textarea

6. **github_username** (String)
   - Interface: Input

7. **linkedin_url** (String)
   - Interface: Input

8. **discord_username** (String)
   - Interface: Input

9. **status** (String)
   - ✅ Required
   - Default: "pending"
   - Interface: Input

## Set Permissions

After adding fields:

1. Go to Settings → Roles & Permissions
2. Find your API user role (the one with your token)
3. For `community_members` collection:
   - ✅ Create: All
   - ✅ Read: All  
   - ✅ Update: All
   - ✅ Delete: All

## Test Setup

After manual setup, test with:
```bash
npm run test:production:quick
```

Should show successful registration! 