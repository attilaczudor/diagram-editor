import { GoogleGenerativeAI } from '@google/generative-ai';
import type { CloudProvider } from '@/types';

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

function buildUserMessage(
  prompt: string,
  previousMermaid: string,
  language: string,
  preferredType: 'erd' | 'uml'
): string {
  const langNote =
    language === 'hu'
      ? ' (The user writes in Hungarian but entity/class names must still be in English.)'
      : '';
  const typeKeyword = preferredType === 'erd' ? 'erDiagram' : 'classDiagram';
  if (previousMermaid.trim()) {
    return `Existing diagram code to modify:\n\`\`\`\n${previousMermaid}\n\`\`\`\n\nUser request${langNote}: ${prompt}`;
  }
  return `Create a ${typeKeyword}${langNote}: ${prompt}`;
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

function parseGeminiError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('429') || msg.includes('quota')) {
    const retryMatch = msg.match(/retry in ([\d.]+)s/i);
    const seconds = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) : null;
    const suffix = seconds ? ` Try again in ${seconds}s.` : ' Try again later.';
    return new Error(`Gemini quota exceeded.${suffix} Switch to a different model in Settings.`);
  }
  if (msg.includes('API_KEY') || msg.includes('401') || msg.includes('403')) {
    return new Error('Invalid Gemini API key. Check your key in Settings.');
  }
  return err instanceof Error ? err : new Error(msg);
}

async function generateWithGemini(
  userMessage: string,
  apiKey: string,
  geminiModel: string
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: geminiModel, systemInstruction: SYSTEM_INSTRUCTION });
  try {
    const result = await model.generateContent(userMessage);
    return stripCodeFences(result.response.text().trim());
  } catch (err) {
    throw parseGeminiError(err);
  }
}

async function generateWithOpenAICompat(
  baseUrl: string,
  apiKey: string,
  model: string,
  userMessage: string,
  providerName: string
): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
      }),
    });
  } catch {
    throw new Error(`${providerName}: network error. Check your connection.`);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: { message?: string } };
    const detail = body?.error?.message ?? `${res.status} ${res.statusText}`;
    if (res.status === 401 || res.status === 403) {
      throw new Error(`Invalid ${providerName} API key. Check your key in Settings.`);
    }
    if (res.status === 429) {
      throw new Error(`${providerName} quota exceeded. Try again later or upgrade your plan.`);
    }
    throw new Error(`${providerName} error: ${detail}`);
  }

  const data = await res.json() as { choices: Array<{ message: { content: string } }> };
  return stripCodeFences(data.choices[0].message.content.trim());
}

async function generateWithOllama(
  prompt: string,
  previousMermaid: string,
  ollamaModel: string,
  language: string,
  preferredType: 'erd' | 'uml',
  ollamaUrl: string
): Promise<string> {
  const base = ollamaUrl.replace(/\/$/, '');
  const fullPrompt = `${SYSTEM_INSTRUCTION}\n\n${buildUserMessage(prompt, previousMermaid, language, preferredType)}`;
  let response: Response;
  try {
    response = await fetch(`${base}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: ollamaModel || 'llama3', prompt: fullPrompt, stream: false }),
    });
  } catch {
    throw new Error('Cannot reach Ollama. Ensure it is running with OLLAMA_ORIGINS=* and the URL is correct in Settings.');
  }
  if (!response.ok) {
    throw new Error(
      `Ollama error: ${response.status} ${response.statusText}. Ensure Ollama is running with OLLAMA_ORIGINS=* and the URL is correct in Settings.`
    );
  }
  const data = (await response.json()) as { response: string };
  return stripCodeFences(data.response.trim());
}

export async function generateDiagram(params: {
  prompt: string;
  model: 'cloud' | 'local';
  cloudProvider?: CloudProvider;
  apiKey?: string;
  geminiModel?: string;
  qwenApiKey?: string;
  qwenModel?: string;
  kimiApiKey?: string;
  kimiModel?: string;
  ollamaModel?: string;
  ollamaUrl?: string;
  language: string;
  previousMermaid?: string;
  preferredDiagramType?: 'erd' | 'uml';
}): Promise<string> {
  const {
    prompt,
    model,
    cloudProvider = 'gemini',
    apiKey = '',
    geminiModel = 'gemini-2.0-flash',
    qwenApiKey = '',
    qwenModel = 'qwen-max',
    kimiApiKey = '',
    kimiModel = 'moonshot-v1-32k',
    ollamaModel = 'llama3',
    ollamaUrl = 'http://localhost:11434',
    language,
    previousMermaid = '',
    preferredDiagramType = 'erd',
  } = params;

  if (!prompt.trim()) throw new Error('Prompt is required.');

  const userMessage = buildUserMessage(prompt, previousMermaid, language, preferredDiagramType);

  let code: string;
  if (model === 'local') {
    code = await generateWithOllama(prompt, previousMermaid, ollamaModel, language, preferredDiagramType, ollamaUrl);
  } else if (cloudProvider === 'qwen') {
    code = await generateWithOpenAICompat(
      'https://dashscope.aliyuncs.com/compatible-mode/v1',
      qwenApiKey,
      qwenModel,
      userMessage,
      'Qwen'
    );
  } else if (cloudProvider === 'kimi') {
    code = await generateWithOpenAICompat(
      'https://api.moonshot.cn/v1',
      kimiApiKey,
      kimiModel,
      userMessage,
      'Kimi'
    );
  } else {
    code = await generateWithGemini(userMessage, apiKey, geminiModel);
  }

  if (!validateMermaid(code)) {
    throw new Error('The AI did not return valid Mermaid code. Please try again with a more specific prompt.');
  }

  return code;
}
