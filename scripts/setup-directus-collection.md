# 🔧 Setting Up Directus Community Members Collection

## Problem
The `community_members` collection doesn't exist in your Directus database, causing user registration to fail with "Failed to create user account".

## Solution
Create the `community_members` collection with the proper schema.

## Step 1: Access Directus Admin Panel
Go to: https://directus-vibe-coding.looks-rare.at/admin

## Step 2: Create Collection

1. **Click "Settings" (gear icon) in the sidebar**
2. **Click "Data Model"**
3. **Click "Create Collection"**
4. **Set Collection Name**: `community_members`
5. **Set Display Template**: `{{name}} ({{email}})`
6. **Click "Save"**

## Step 3: Add Fields

Add these fields to the collection:

### Basic Fields
| Field Name | Type | Settings |
|------------|------|----------|
| `email` | String | Required, Unique, Email validation |
| `name` | String | Optional |
| `experience_level` | Integer | Required, Min: 0, Max: 100 |
| `status` | String | Required, Default: "pending" |

### Project Fields
| Field Name | Type | Settings |
|------------|------|----------|
| `project_interest` | String | Optional |
| `project_details` | Text | Optional |

### Social Fields
| Field Name | Type | Settings |
|------------|------|----------|
| `github_username` | String | Optional |
| `linkedin_url` | String | Optional |
| `discord_username` | String | Optional |

### Email Management
| Field Name | Type | Settings |
|------------|------|----------|
| `email_verified` | Boolean | Default: false |
| `email_verification_token` | String | Optional, Hidden |
| `email_verification_sent_at` | DateTime | Optional |
| `email_verified_at` | DateTime | Optional |
| `unsubscribe_token` | String | Optional, Hidden |

### Invitations
| Field Name | Type | Settings |
|------------|------|----------|
| `mattermost_invited` | Boolean | Default: false |
| `discord_invited` | Boolean | Default: false |

### Metadata
| Field Name | Type | Settings |
|------------|------|----------|
| `directus_user_id` | String | Optional (links to Directus users) |

### Email Preferences (JSON Field)
| Field Name | Type | Settings |
|------------|------|----------|
| `email_preferences` | JSON | Optional |

**JSON Structure for email_preferences:**
```json
{
  "welcome_emails": true,
  "event_invitations": true,
  "newsletter": true,
  "project_notifications": true
}
```

## Step 4: Set Permissions

1. **Go to Settings > Roles & Permissions**
2. **Find your API user role**
3. **For `community_members` collection, set permissions:**
   - **Create**: ✅ Allowed
   - **Read**: ✅ Allowed
   - **Update**: ✅ Allowed
   - **Delete**: ✅ Allowed

## Step 5: Test the Collection

After creating the collection, test it with:
```bash
npm run test:production:quick
```

## Alternative: Quick Setup via API

If you prefer, you can create the collection via API:

```bash
# Create collection
curl -X POST "https://directus-vibe-coding.looks-rare.at/collections" \
  -H "Authorization: Bearer i0Y82VSV5DRdBQxNz5JCoq3rJErhoqyc" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "community_members",
    "meta": {
      "collection": "community_members",
      "note": "Community member registrations and profiles"
    }
  }'

# Add basic fields (email, name, etc.)
curl -X POST "https://directus-vibe-coding.looks-rare.at/fields/community_members" \
  -H "Authorization: Bearer i0Y82VSV5DRdBQxNz5JCoq3rJErhoqyc" \
  -H "Content-Type: application/json" \
  -d '{
    "field": "email",
    "type": "string",
    "meta": {
      "required": true,
      "options": {
        "unique": true
      }
    }
  }'
```

## Expected Result

After setup:
- ✅ Registration form should work
- ✅ Users can sign up successfully
- ✅ Data is stored in Directus
- ✅ Email verification process works

## Troubleshooting

If you still get errors after setup:
1. **Check permissions** - Make sure your API user can read/write to the collection
2. **Check field names** - Field names must match exactly
3. **Check data types** - Make sure field types are correct
4. **Test connection**: `npm run test:directus` 