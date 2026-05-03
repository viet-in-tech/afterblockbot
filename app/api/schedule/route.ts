import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

const SYSTEM_PROMPT = `You are ClassMaker.ai, an AI scheduling assistant for afterschool programs.

## Schedule Structure
- 5 days: Monday, Tuesday, Wednesday, Thursday, Friday
- 4 time blocks per day:
  - BLK0: 2:30–3:30 PM
  - BLK1: 3:30–4:30 PM
  - BLK2: 4:30–5:30 PM
  - BLK3: 5:30–6:30 PM

## Rules
1. Only place students in grade-appropriate classes (check grade_min and grade_max)
2. Never exceed class capacity
3. A student cannot be in two classes at the same block on the same day
4. Some classes span multiple blocks — fill all spanned blocks with the class name
5. Fixed slots (always apply):
   - Interest Clubs: Wednesday BLK2 (grades 1–4)
   - Fun Friday: Friday BLK3 (all grades)
6. Never schedule a student past their pickup_block
7. Grades 1–4 = Foundation. Grades 5–8 = Middle School.
8. Match student preferences when possible
9. Ensure Homework is scheduled at least once per day when no class fills the slot

## Output Format
Respond ONLY with valid JSON — no markdown, no code blocks, no extra text:
{
  "students": [
    {
      "name": "Student Name",
      "grade": 2,
      "schedule": {
        "Monday":    { "BLK0": null, "BLK1": "Class Name", "BLK2": "Class Name", "BLK3": null },
        "Tuesday":   { "BLK0": null, "BLK1": "Homework",   "BLK2": null,         "BLK3": null },
        "Wednesday": { "BLK0": null, "BLK1": null,         "BLK2": "Interest Clubs", "BLK3": null },
        "Thursday":  { "BLK0": null, "BLK1": null,         "BLK2": null,          "BLK3": null },
        "Friday":    { "BLK0": null, "BLK1": null,         "BLK2": null,          "BLK3": "Fun Friday" }
      }
    }
  ],
  "message": "Brief explanation to the coordinator of what was scheduled or changed."
}`;

export async function POST(req: NextRequest) {
  try {
    const { studentsCSV, classesCSV, messages, currentSchedule } = await req.json();

    const dataContext = `STUDENT ROSTER:\n${studentsCSV}\n\nCLASS CATALOG:\n${classesCSV}`;

    type ApiMessage = { role: 'user' | 'assistant'; content: string };
    let apiMessages: ApiMessage[];

    if (!currentSchedule) {
      apiMessages = [{
        role: 'user',
        content: `${dataContext}\n\nPlease generate a complete weekly schedule for all students.`,
      }];
    } else {
      apiMessages = [
        {
          role: 'user',
          content: `${dataContext}\n\nCurrent schedule:\n${JSON.stringify(currentSchedule.students, null, 2)}\n\nPlease apply the coordinator's refinement request below.`,
        },
        ...messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      ];
    }

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    });

    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Model returned non-JSON', raw: text }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('ClassMaker.ai API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
