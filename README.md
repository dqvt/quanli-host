# Vận Tải Đại Quân - Quản Lí Chuyến Xe

A fleet management application for Vận Tải Đại Quân.

## Features

- Staff management
- Vehicle management
- Customer management
- Trip management
- Debt tracking
- Salary calculation

## Technology Stack

- Vue.js 3
- Pinia for state management
- PrimeVue for UI components
- Tailwind CSS for styling
- Supabase for database and authentication

## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/quanli-host.git
   cd quanli-host
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Set up the Supabase database by following the instructions in the `supabase/README.md` file.

5. Start the development server
   ```
   npm run dev
   ```

## Migration from Firebase to Supabase

This project has been migrated from Firebase to Supabase. To migrate your data:

1. Set up environment variables for both Firebase and Supabase:
   ```
   # Firebase
   FIREBASE_API_KEY=your_firebase_api_key
   FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   FIREBASE_PROJECT_ID=your_firebase_project_id
   FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
   FIREBASE_APP_ID=your_firebase_app_id
   FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id

   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

2. Run the migration script:
   ```
   node scripts/migrate-to-supabase.js
   ```

3. Verify the data in your Supabase dashboard.

## Deployment

This project is configured for deployment to GitHub Pages. To deploy:

1. Update the `base` property in `vite.config.mjs` to match your repository name.

2. Set up the required secrets in your GitHub repository:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

3. Push to the main branch to trigger the deployment workflow.

## License

This project is proprietary and not licensed for public use.
