import { NextRequest, NextResponse } from 'next/server';
import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';

const SETUP_PROMPT = `You are a setup assistant for ClassMaker.ai, an afterschool scheduling tool.

Your job: help coordinators define the activity preferences and class types that fit their specific program.

When a user describes their program, respond ONLY with valid JSON — no markdown, no code blocks:
{
  "message": "A brief, warm response (1-2 sentences) acknowledging their program and what you've set up",
  "preferences": ["Specific activity 1", "Specific activity 2", ...],
  "classTypes": ["Broad category 1", "Broad category 2", ...]
}

Guidelines:
- preferences = specific activities students can choose (e.g. "Piano", "Soccer", "Coding", "Ballet")
- classTypes = broad organizational categories (e.g. "Music", "Athletic", "Academic", "Arts")
- 8–14 preference options, 4–8 class types
- If the user asks a question or you need more info, still return JSON but set preferences and classTypes to empty arrays and put your question in "message"
- Keep it practical for an afterschool program`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      system: SETUP_PROMPT,
      messages,
    });

    try {
      const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: 'Could not parse suggestions', raw: text }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
