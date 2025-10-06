# GitHub App Creator

A SvelteKit application that helps you create GitHub apps using app manifests.

## Features

- **Interactive Form**: Easy-to-use form for configuring GitHub app settings
- **Permissions Management**: Select and configure app permissions with a user-friendly interface
- **Events Selection**: Choose which GitHub events your app should listen to
- **Manifest Generation**: Automatically generates a properly formatted GitHub app manifest
- **GitHub Integration**: Streamlined process to create apps on GitHub

## What's Included

### 📁 Project Structure
- `src/routes/+page.svelte` - Main application page with the GitHub app creation form
- `src/routes/api/` - Server-side API endpoints for handling app creation and authentication
- Full TypeScript support
- Responsive, GitHub-inspired styling

### 🎨 Form Features
- **Basic Information**: App name, description, URLs
- **Permissions Grid**: Configure repository and organization permissions
- **Events Selection**: Subscribe to GitHub webhook events
- **Public/Private**: Toggle app visibility
- **Live Preview**: Real-time manifest generation

### 🚀 GitHub App Manifest Support
- Generates valid GitHub app manifests
- Supports all major permissions and events
- Copy-to-clipboard functionality
- Direct integration with GitHub's app creation flow

## Getting Started

### Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Start Development Server**
   ```bash
   npm run dev
   ```

3. **Open in Browser**
   Navigate to `http://localhost:5173`

### Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t github-app-creator .
   ```

2. **Run Container**
   ```bash
   docker run -p 3000:3000 github-app-creator
   ```

3. **Access Application**
   Navigate to `http://localhost:3000`

## How to Use

1. **Fill out the form** with your GitHub app details:
   - App name (required)
   - Description
   - Homepage URL
   - Callback URL (for OAuth)
   - Webhook URL (for receiving events)

2. **Configure Permissions** by selecting read/write access for different scopes:
   - Issues, Pull Requests, Contents, Metadata, etc.

3. **Select Events** your app should receive:
   - Push, Pull Request, Issues, etc.

4. **Generate Manifest** to see the JSON configuration

5. **Create GitHub App** - This will open GitHub's app creation page with your manifest

## Development

### Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run check` - Run TypeScript and Svelte checks
- `npm run check:watch` - Run checks in watch mode

### Building for Production

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with:

```bash
npm run preview
```

## Tech Stack

- **SvelteKit** - Full-stack web framework
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Skeleton UI** - Svelte component library
- **GitHub API** - For app creation and management

## Resources

- [GitHub Apps Documentation](https://docs.github.com/en/developers/apps)
- [App Manifest Documentation](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app-from-a-manifest)
- [SvelteKit Documentation](https://kit.svelte.dev/)
