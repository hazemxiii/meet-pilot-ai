This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Meet Pilot AI

Meet Pilot AI is a meeting workspace built with Next.js. It helps users capture meeting transcripts, review meetings, ask questions about meeting content, and manage related notes, tasks, and memory.

### Features

- Meeting recording and transcript processing
- AI-powered meeting analysis and questions
- Searchable notes and long-term memory
- Task creation, editing, and bulk updates
- Supabase authentication and data storage
- Chrome extension integration for meeting capture

### Setup

Requirements: Node.js 20 or newer, npm, and a Supabase project.

1. Install dependencies with `npm install`.
2. Create `.env.local` with your Supabase credentials:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```

3. Apply [`Schema.sql`](Schema.sql) to your Supabase project.
4. Start the app with `npm run dev` and open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command         | Description                  |
| --------------- | ---------------------------- |
| `npm run dev`   | Start the development server |
| `npm run build` | Create a production build    |
| `npm run start` | Run the production build     |
| `npm run lint`  | Check the code with ESLint   |

### Main Routes

- `/meetings` - Browse meetings and transcripts
- `/notes` - Manage meeting notes
- `/tasks` - Manage follow-up tasks
- `/memory` - Review saved meeting context
- `/ask` - Ask questions about meeting data
- `/profile` - Manage the user profile

### Project Structure

- `app/` - Next.js pages and API route handlers
- `components/` - Shared UI and application components
- `contexts/` - Authentication and layout state
- `extension/` - Chrome extension source
- `utils/supabase/` - Supabase clients
- `lib/transcription/` - Transcript processing utilities
