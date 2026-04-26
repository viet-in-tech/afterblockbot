# ClassMaker.ai

AI-powered afterschool block scheduler — [classmaker.ai](https://classmaker.ai)

ClassMaker.ai helps school coordinators automatically build personalized weekly block schedules for every student. Add students and classes manually or via CSV, generate a schedule with one click, and refine it through a plain-English chat interface.

## Features

- **Manual student entry** — name, grade, pickup time, activity preferences, and academic goals
- **Manual class entry** — name, day, block range, grade range, capacity, and type with built-in validation
- **CSV upload** — bulk import students and classes from spreadsheets
- **AI schedule generation** — constraint-aware scheduling that respects capacity, grade levels, fixed slots, and pickup times
- **Chat refinement** — tell the AI to adjust any part of the schedule in plain English
- **Weekly grid view** — color-coded block schedule per student

## Stack

- [Next.js](https://nextjs.org) + TypeScript + Tailwind CSS
- [Vercel](https://vercel.com) for deployment
- [Groq](https://groq.com) (Llama 3.3) for AI scheduling

## Getting Started

```bash
npm install
```

Create a `.env.local` file:

```
GROQ_API_KEY=your_groq_api_key_here
```

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Sample Data

Sample students and classes CSVs are in the `data/` folder for testing.

## Built At

Zero to Agent — Irvine, CA · April 25, 2026
