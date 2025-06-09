# Vibe Coding Hamburg - Community App

A modern, full-stack community platform built with Remix, TypeScript, and Directus for the Vibe Coding Hamburg developer community.

## 🌟 Features

### 🔐 User Authentication & Management
- **Complete user registration and login system**
- **Email verification flow with secure token handling**
- **Password reset functionality with email integration**
- **User dashboard with profile management**
- **GDPR-compliant data handling and privacy controls**

### 🚀 GitHub Integration & Project Discovery
- **Real-time GitHub repository integration**
- **Automatic project discovery from community members**
- **Smart filtering: excludes forks and archived projects**
- **Repository statistics and language detection**
- **Beautiful project showcase with vaporwave design**

### 🏗️ Project Management System
- **Project proposal submission system**
- **Database-powered project storage with Directus**
- **Admin email notifications for new proposals**
- **Skill-based project matching and collaboration**
- **Comprehensive form validation and error handling**

### 📧 Email System
- **Professional email templates for all communications**
- **Welcome emails, verification emails, project notifications**
- **Admin campaign management system**
- **GDPR-compliant unsubscribe and preference management**

### 🎨 Modern UI/UX
- **Vaporwave-themed design with gradient effects**
- **Fully responsive mobile-first design**
- **Internationalization support (English/German)**
- **Accessibility features and keyboard navigation**
- **Progressive Web App capabilities**

## 🛠️ Tech Stack

- **Frontend**: Remix + React + TypeScript
- **Styling**: Tailwind CSS with custom vaporwave theme
- **Backend**: Directus headless CMS
- **Database**: PostgreSQL (via Directus)
- **Email**: SMTP with professional HTML templates
- **Deployment**: Coolify with automated CI/CD
- **Testing**: Vitest + Testing Library
- **Performance**: Built-in caching and optimization

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Directus instance (local or hosted)
- SMTP email configuration

### Installation

```bash
# Clone the repository
git clone https://github.com/fmhc/vibe-community-app.git
cd vibe-community-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### Environment Variables

```bash
# Directus Configuration
DIRECTUS_URL=https://your-directus-instance.com
DIRECTUS_TOKEN=your-directus-token

# Email Configuration
SMTP_HOST=your-smtp-host
SMTP_PORT=587
SMTP_USER=your-email@domain.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@vibe-coding.hamburg

# Application Configuration
SESSION_SECRET=your-secure-session-secret
BASE_URL=https://community.vibe-coding.hamburg
ADMIN_EMAIL=admin@vibe-coding.hamburg

# GitHub Integration (Optional)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
```

### Development

```bash
# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Type checking
npm run typecheck
```

## 📊 Database Schema

The app uses Directus with the following main collections:

### `community_members`
- User profiles with GitHub integration
- Skills, experience levels, project interests
- Email preferences and verification status

### `project_proposals` 
- Community project submissions
- Collaboration requirements and details
- Status tracking and admin approval

### `directus_users`
- Authentication and session management
- Integrated with community member profiles

## 🧪 Testing

Comprehensive test suite with:
- **Unit tests** for all services and utilities
- **Integration tests** for API routes and workflows
- **Validation tests** for form handling and data processing
- **Email service tests** with mock SMTP

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- github.server.test.ts
```

## 🚀 Deployment

The app is configured for deployment on Coolify with automated CI/CD:

1. **Automatic builds** on git push to main branch
2. **Environment variable management** through Coolify
3. **SSL certificates** automatically managed
4. **Health checks** and monitoring
5. **Database migrations** handled by Directus

## 🎯 Roadmap

### ✅ Completed Features
- User authentication and management
- GitHub integration and project discovery
- Project proposal system
- Email campaigns and notifications
- GDPR compliance and privacy tools
- Community events management

### 🚧 In Progress
- Integration test fixes
- Advanced project collaboration features
- Analytics and reporting dashboard

### 📋 Planned Features
- AI-powered project matching
- Discord/Slack integrations
- Mobile app development
- Advanced community features

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙋‍♂️ Support

For questions and support:
- **Community**: [Vibe Coding Hamburg Discord](https://discord.gg/vibe-coding)
- **Issues**: [GitHub Issues](https://github.com/fmhc/vibe-community-app/issues)
- **Email**: [community@vibe-coding.hamburg](mailto:community@vibe-coding.hamburg)

---

**Built with ❤️ by the Vibe Coding Hamburg community**
