import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

export const maxDuration = 60;

const BATCH_SIZE = 25;

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

type ApiMessage = { role: 'user' | 'assistant'; content: string };

function splitCSVIntoBatches(csv: string): string[] {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length <= 1) return [csv];
  const header = lines[0];
  const rows = lines.slice(1);
  const batches: string[] = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push([header, ...rows.slice(i, i + BATCH_SIZE)].join('\n'));
  }
  return batches;
}

function extractBatchNames(batchCSV: string): string[] {
  return batchCSV.trim().split(/\r?\n/).slice(1).filter(Boolean).map(l => l.split(',')[0].trim());
}

function parseModelJSON(text: string) {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found. Preview: ${text.slice(0, 300)}`);
  return JSON.parse(jsonMatch[0]);
}

async function runBatch(apiMessages: ApiMessage[]) {
  const { text } = await generateText({
    model: groq('llama-3.1-8b-instant'),
    system: SYSTEM_PROMPT,
    messages: apiMessages,
  });
  return parseModelJSON(text);
}

export async function POST(req: NextRequest) {
  try {
    const { studentsCSV, classesCSV, messages, currentSchedule, weekLabel } = await req.json();

    const weekLine = weekLabel ? `\nSCHEDULE WEEK: ${weekLabel}` : '';
    const batches = splitCSVIntoBatches(studentsCSV);

    const allStudents: unknown[] = [];
    let lastMessage = '';

    for (const batchCSV of batches) {
      const dataContext = `STUDENT ROSTER:\n${batchCSV}\n\nCLASS CATALOG:\n${classesCSV}${weekLine}`;
      let apiMessages: ApiMessage[];

      if (!currentSchedule) {
        apiMessages = [{
          role: 'user',
          content: `${dataContext}\n\nPlease generate a complete weekly schedule for all students in this roster.`,
        }];
      } else {
        const batchNames = extractBatchNames(batchCSV);
        const batchSchedule = currentSchedule.students.filter(
          (s: { name: string }) => batchNames.includes(s.name)
        );
        apiMessages = [
          {
            role: 'user',
            content: `${dataContext}\n\nCurrent schedule:\n${JSON.stringify(batchSchedule, null, 2)}\n\nPlease apply the coordinator's refinement request below.`,
          },
          ...messages.map((m: { role: string; content: string }) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        ];
      }

      const parsed = await runBatch(apiMessages);
      allStudents.push(...(parsed.students ?? []));
      lastMessage = parsed.message ?? '';
    }

    return NextResponse.json({ students: allStudents, message: lastMessage });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('ClassMaker.ai API error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
