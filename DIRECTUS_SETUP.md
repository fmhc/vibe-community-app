# 🚀 Directus Integration Setup Guide

This guide will help you set up the Vibe Coding Hamburg community app with Directus for user management and data storage.

## 📋 Prerequisites

- Directus instance running at `directus-vibe-coding.looks-rare.at`
- Environment variables configured in `.env`
- Node.js and npm installed

## 🔧 Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
DIRECTUS_URL=https://directus-vibe-coding.looks-rare.at
DIRECTUS_KEY=your_directus_api_key
DIRECTUS_SECRET=your_directus_secret
```

## 🗄️ Database Schema Setup

### 1. Community Members Collection

Create a collection called `community_members` with the following fields:

#### Required Fields:
- `id` (UUID, Primary Key, Auto-generated)
- `email` (String, Required, Unique)
- `name` (String, Required)
- `experience_level` (Integer, Required, 0-100)
- `project_interest` (String, Required)
- `status` (String, Required, Options: 'pending', 'active', 'inactive')

#### Optional Fields:
- `project_details` (Text, Optional)
- `skills` (JSON, Optional)
- `ai_tools_experience` (JSON, Optional)
- `github_username` (String, Optional)
- `linkedin_url` (String, Optional)
- `discord_username` (String, Optional)
- `mattermost_invited` (Boolean, Default: false)
- `discord_invited` (Boolean, Default: false)

#### System Fields:
- `date_created` (DateTime, Auto-generated)
- `date_updated` (DateTime, Auto-updated)

### 2. Field Configuration Details

```json
{
  "collection": "community_members",
  "fields": [
    {
      "field": "id",
      "type": "uuid",
      "meta": {
        "hidden": true,
        "readonly": true,
        "interface": "input",
        "special": ["uuid"]
      }
    },
    {
      "field": "email",
      "type": "string",
      "meta": {
        "interface": "input",
        "required": true,
        "validation": {
          "_and": [
            {
              "email": {
                "_regex": "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"
              }
            }
          ]
        }
      },
      "schema": {
        "is_unique": true
      }
    },
    {
      "field": "name",
      "type": "string",
      "meta": {
        "interface": "input",
        "required": true
      }
    },
    {
      "field": "experience_level",
      "type": "integer",
      "meta": {
        "interface": "slider",
        "required": true,
        "options": {
          "min": 0,
          "max": 100,
          "step": 1
        }
      }
    },
    {
      "field": "project_interest",
      "type": "string",
      "meta": {
        "interface": "select-dropdown",
        "required": true,
        "options": {
          "choices": [
            {"text": "Web App", "value": "web"},
            {"text": "AI Tool", "value": "ai"},
            {"text": "Mobile App", "value": "mobile"}
          ]
        }
      }
    },
    {
      "field": "status",
      "type": "string",
      "meta": {
        "interface": "select-dropdown",
        "required": true,
        "options": {
          "choices": [
            {"text": "Pending", "value": "pending"},
            {"text": "Active", "value": "active"},
            {"text": "Inactive", "value": "inactive"}
          ]
        }
      },
      "schema": {
        "default_value": "pending"
      }
    }
  ]
}
```

## 🔐 Permissions Setup

### 1. Create API User Role

1. Go to **Settings > Roles & Permissions**
2. Create a new role called `API User`
3. Set the following permissions for `community_members` collection:

#### Community Members Permissions:
- **Create**: ✅ All
- **Read**: ✅ All  
- **Update**: ✅ All
- **Delete**: ✅ All

### 2. Create API User

1. Go to **User Directory**
2. Create a new user with:
   - Email: `api@vibe-coding.hamburg`
   - Role: `API User`
   - Status: `Active`
3. Generate an API token for this user

## 🚀 Application Features

### Current Features:
- ✅ Multi-step community signup form
- ✅ Email validation and duplicate checking
- ✅ Experience level tracking (0-100 scale)
- ✅ Project interest categorization
- ✅ Social profile linking (GitHub, LinkedIn, Discord)
- ✅ Admin dashboard with statistics
- ✅ Member management interface

### Planned Features:
- 🔄 Automatic Mattermost invite generation
- 🔄 Discord invite automation
- 🔄 Email notifications
- 🔄 Member status management
- 🔄 Bulk operations
- 🔄 Export functionality

## 📊 Admin Dashboard

Access the admin dashboard at `/admin` to:
- View community statistics
- Manage member status
- Track experience levels
- Monitor project interests
- Export member data

## 🔧 Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your Directus credentials
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Main site: `http://localhost:3000`
   - Admin dashboard: `http://localhost:3000/admin`

## 🧪 Testing

Run the test suite:
```bash
npm run test
```

## 📝 API Endpoints

### Community Member Operations:
- `POST /` - Create new community member
- `GET /admin` - View admin dashboard with stats

### Data Structure:
```typescript
interface CommunityMember {
  id?: string;
  email: string;
  name?: string;
  experience_level: number;
  project_interest: string;
  project_details?: string;
  skills?: string[];
  ai_tools_experience?: string[];
  github_username?: string;
  linkedin_url?: string;
  discord_username?: string;
  mattermost_invited?: boolean;
  discord_invited?: boolean;
  status: 'pending' | 'active' | 'inactive';
  date_created?: string;
  date_updated?: string;
}
```

## 🔮 Future Integrations

### Mattermost Integration:
- Automatic team invitations
- Channel assignment based on interests
- Welcome message automation

### Discord Integration:
- Server invite generation
- Role assignment based on experience
- Community announcements

### Email Automation:
- Welcome emails
- Event notifications
- Community updates

## 🐛 Troubleshooting

### Common Issues:

1. **Directus Connection Failed:**
   - Check `DIRECTUS_URL` is correct
   - Verify API credentials
   - Ensure Directus instance is accessible

2. **Permission Denied:**
   - Verify API user has correct permissions
   - Check role assignments
   - Confirm collection access rights

3. **Email Validation Errors:**
   - Check email format validation
   - Verify unique constraint on email field
   - Ensure proper error handling

### Debug Mode:
Enable debug logging by setting:
```env
NODE_ENV=development
```

## 📞 Support

For issues or questions:
- Check the [Directus Documentation](https://docs.directus.io/)
- Review application logs
- Contact the development team

---

**Built with ❤️ for the Hamburg coding community** 