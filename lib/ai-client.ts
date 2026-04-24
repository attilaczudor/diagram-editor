import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are an expert diagram architect. Your ONLY output is valid Mermaid.js code.

STRICT RULES:
1. Start your response with EXACTLY "erDiagram" or "classDiagram" — nothing before it.
2. Output ONLY the Mermaid code block. No explanations, no prose, no markdown code fences (no \`\`\`).
3. For ERD diagrams use "erDiagram" with crow's foot notation and PK/FK markers.
4. For UML class diagrams use "classDiagram" with proper visibility markers (+, -, #).
5. Entity/class names must be PascalCase or ALLCAPS, no spaces or hyphens.
6. Always include meaningful attributes with typed fields.
7. If the user provides existing Mermaid code to refine, output the COMPLETE updated diagram.
8. Never truncate the output — include every entity/class.`;

function buildUserMessage(prompt: string, previousMermaid: string, language: string): string {
  const langNote =
    language === 'hu'
      ? ' (The user writes in Hungarian but entity/class names must still be in English.)'
      : '';
  if (previousMermaid.trim()) {
    return `Existing diagram code to modify:\n\`\`\`\n${previousMermaid}\n\`\`\`\n\nUser request${langNote}: ${prompt}`;
  }
  return `Create a diagram${langNote}: ${prompt}`;
}

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:mermaid)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
}

function validateMermaid(code: string): boolean {
  const first = code.trim().split('\n')[0].toLowerCase().replace(/\s+/g, '');
  return first === 'erdiagram' || first === 'classdiagram';
}

async function generateWithGemini(
  prompt: string,
  previousMermaid: string,
  apiKey: string,
  language: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    systemInstruction: SYSTEM_INSTRUCTION,
  });
  const result = await model.generateContent(buildUserMessage(prompt, previousMermaid, language));
  return stripCodeFences(result.response.text().trim());
}

async function generateWithOllama(
  prompt: string,
  previousMermaid: string,
  ollamaModel: string,
  language: string
): Promise<string> {
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${buildUserMessage(prompt, previousMermaid, language)}`;
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: ollamaModel || 'llama3', prompt: fullPrompt, stream: false }),
  });
  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}. Make sure Ollama is running with OLLAMA_ORIGINS=* set.`);
  }
  const data = (await response.json()) as { response: string };
  return stripCodeFences(data.response.trim());
}

export async function generateDiagram(params: {
  prompt: string;
  model: 'cloud' | 'local';
  apiKey?: string;
  ollamaModel?: string;
  language: string;
  previousMermaid?: string;
}): Promise<string> {
  const { prompt, model, apiKey, ollamaModel, language, previousMermaid = '' } = params;

  if (!prompt.trim()) throw new Error('Prompt is required.');

  const code =
    model === 'cloud'
      ? await generateWithGemini(prompt, previousMermaid, apiKey ?? '', language)
      : await generateWithOllama(prompt, previousMermaid, ollamaModel ?? 'llama3', language);

  if (!validateMermaid(code)) {
    throw new Error(
      'The AI did not return valid Mermaid code. Please try again with a more specific prompt.'
    );
  }

  return code;
}
