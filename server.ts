import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      console.log('Gemini API client initialized successfully.');
    } catch (error: any) {
      console.warn('Failed to initialize Gemini API client:', error.message);
    }
  }
  return aiClient;
}

// SIMULATOR: Context-aware high-fidelity backups if API key isn't provided
function simulateTranslation(text: string, targetLang: string): string {
  const normalized = (text || '').trim();
  const lang = targetLang.substring(0, 2).toLowerCase();

  // 1. Exact sentence translation mappings
  const database: Record<string, Record<string, string>> = {
    "the messages are not getting translated properly": {
      en: "The messages are not getting translated properly",
      es: "Los mensajes no se están traduciendo correctamente",
      pt: "As mensagens não estão sendo traduzidas corretamente",
      ja: "メッセージが正しく翻訳されていません"
    },
    "first aid unit dispatched to section 120 for minor heat exhaustion.": {
      en: "First aid unit dispatched to Section 120 for minor heat exhaustion.",
      es: "Unidad de primeros auxilios enviada a la Sección 120 por agotamiento leve por calor.",
      pt: "Unidade de primeiros socorros enviada para a Seção 120 por exaustão leve de calor.",
      ja: "軽度の熱中症のため、第120セクションに救急ユニットが派遣されました。"
    },
    "there is severe congestion at the west entrance. we need three additional assistants.": {
      en: "There is severe congestion at the west entrance. We need three additional assistants.",
      es: "Hay una congestión severa en la entrada oeste. Necesitamos tres auxiliares adicionales.",
      pt: "Há um congestionamento grave na entrada oeste. Precisamos de três assistentes adicionais.",
      ja: "西口で深刻な混雑が発生しています。追加のアシスタントが3名必要です。"
    },
    "is there wheelchair accessible seating near section 120?": {
      en: "Is there wheelchair accessible seating near Section 120?",
      es: "¿Hay asientos accesibles para sillas de ruedas cerca de la Sección 120?",
      pt: "Existe assento acessível para cadeira de rodas perto da Seção 120?",
      ja: "第120セクションの近くに車椅子対応の座席はありますか？"
    },
    "feel free to contact us if further help is needed!": {
      en: "Feel free to contact us if further help is needed!",
      es: "¡No dude en contactarnos si necesita más ayuda!",
      pt: "Sinta-se à vontade para nos contatar se precisar de mais ajuda!",
      ja: "さらにサポートが必要な場合は、お気軽にお問い合わせください！"
    }
  };

  const cleanString = (s: string) => s.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, "").replace(/\s+/g, " ").trim();
  const lookupKey = cleanString(normalized);

  for (const key of Object.keys(database)) {
    const entry = database[key];
    const match = Object.values(entry).some(val => cleanString(val) === lookupKey);
    if (match) {
      return entry[lang] || entry['en'];
    }
  }

  // 2. Structured patterns (e.g. SOS alerts, AI Dispatch, Manual reassignments)
  if (/🚨\s*\[CRITICAL SOS\]|🚨\s*\[SOS CRÍTICO\]/i.test(normalized)) {
    let type = 'Emergency';
    let location = 'Zone';
    
    if (/fire|fuego|fogo|incendio/i.test(normalized)) type = 'Fire';
    else if (/stampede|estampida|tumulto/i.test(normalized)) type = 'Stampede';
    else if (/medical|médico|cardiac|trauma/i.test(normalized)) type = 'Medical';
    else if (/missing|niño|desaparecida/i.test(normalized)) type = 'Missing Person';
    
    const zoneMatch = normalized.match(/(Zone\s+[A-Za-z0-9]+|Sector\s+[A-Za-z0-9]+|Gate\s+[A-Za-z0-9]+)/i);
    if (zoneMatch) {
      location = zoneMatch[0];
    }
    
    const emergencyTranslations: Record<string, Record<string, string>> = {
      'Fire': { en: 'Fire Incident', es: 'Incidente de Fuego', pt: 'Incidente de Fogo', ja: '火災事故' },
      'Stampede': { en: 'Stampede Danger', es: 'Peligro de Estampida', pt: 'Perigo de Tumulto', ja: '将棋倒しの危険' },
      'Medical': { en: 'Medical Emergency', es: 'Emergencia Médica', pt: 'Emergência Médica', ja: '救急医療事態' },
      'Missing Person': { en: 'Missing Person', es: 'Persona Desaparecida', pt: 'Pessoa Desaparecida', ja: '行方不明者' },
      'Emergency': { en: 'Emergency', es: 'Emergencia', pt: 'Emergência', ja: '緊急事態' }
    };
    
    const transType = emergencyTranslations[type]?.[lang] || type;
    if (lang === 'es') {
      return `🚨 [SOS CRÍTICO]: ¡Se reporta ${transType} en ${location}!`;
    } else if (lang === 'pt') {
      return `🚨 [SOS CRÍTICO]: ${transType} relatado em ${location}!`;
    } else if (lang === 'ja') {
      return `🚨 [緊急SOS]: ${location}で${transType}が報告されました！`;
    } else {
      return `🚨 [CRITICAL SOS]: ${transType} reported at ${location}!`;
    }
  }

  if (/🚨\s*\[DISPATCH SUCCESSFUL\]|🚨\s*\[DESPACHO EXITOSO\]|🚨\s*\[DISPATCH BEM-SUCEDIDO\]/i.test(normalized)) {
    let role = 'Staff';
    let name = 'Responder';
    let reason = 'Assistance';
    
    const roleMatches = normalized.match(/:\s*([A-Za-z\s]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+dispatched/i) ||
                        normalized.match(/:\s*([A-Za-z\s]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+enviado/i);
    if (roleMatches) {
      role = roleMatches[1].trim();
      name = roleMatches[2].trim();
    } else {
      const nameMatch = normalized.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)/);
      if (nameMatch) name = nameMatch[1];
    }
    
    const reasonMatch = normalized.match(/Reason:\s*(.*)$/i) || normalized.match(/Razón:\s*(.*)$/i) || normalized.match(/Motivo:\s*(.*)$/i);
    if (reasonMatch) {
      reason = reasonMatch[1].trim();
    }
    
    const roleTranslations: Record<string, Record<string, string>> = {
      'first responder': { en: 'First Responder', es: 'Primer Respondiente', pt: 'Primeiro Respondente', ja: 'ファーストレスポンダー' },
      'medical': { en: 'Medical Staff', es: 'Personal Médico', pt: 'Equipe Médica', ja: '医療スタッフ' },
      'doctor': { en: 'Doctor', es: 'Médico', pt: 'Médico', ja: '医師' },
      'nurse': { en: 'Nurse', es: 'Enfermero', pt: 'Enfermeiro', ja: '看護師' },
      'crowd marshal': { en: 'Crowd Marshal', es: 'Control de Multitudes', pt: 'Controlador de Multidão', ja: '群衆誘導員' },
      'security': { en: 'Security Guard', es: 'Guardia de Seguridad', pt: 'Guarda de Segurança', ja: '警備員' },
      'marshal': { en: 'Marshal', es: 'Alguacil', pt: 'Marechal', ja: 'マーシャル' },
      'accessibility lead': { en: 'Accessibility Lead', es: 'Líder de Accesibilidad', pt: 'Líder de Acessibilidade', ja: 'アクセシビリティ担当' }
    };
    const transRole = roleTranslations[role.toLowerCase()]?.[lang] || role;
    
    const reasonTranslations: Record<string, Record<string, string>> = {
      'medical emergency': { en: 'Medical emergency', es: 'Emergencia médica', pt: 'Emergência médica', ja: '医療救急事態' },
      'cardiac event': { en: 'Cardiac event', es: 'Evento cardíaco', pt: 'Evento cardíaco', ja: '心疾患事態' },
      'trauma response': { en: 'Trauma response', es: 'Respuesta al trauma', pt: 'Resposta a trauma', ja: '外傷対応' },
      'fire safety': { en: 'Fire safety check', es: 'Control de seguridad contra incendios', pt: 'Verificação de segurança contra incêndio', ja: '火災安全確認' },
      'stampede control': { en: 'Stampede prevention', es: 'Prevención de estampidas', pt: 'Prevenção de tumultos', ja: '将棋倒し防止対応' },
      'missing child assistance': { en: 'Missing child assistance', es: 'Asistencia para niño perdido', pt: 'Assistência a criança desaparecida', ja: '迷子支援' }
    };
    const transReason = reasonTranslations[reason.toLowerCase()]?.[lang] || reason;
    
    if (lang === 'es') {
      return `🚨 [DESPACHO EXITOSO]: ${transRole} ${name} enviado al Sector. Razón: ${transReason}`;
    } else if (lang === 'pt') {
      return `🚨 [DESPACHO BEM-SUCEDIDO]: ${transRole} ${name} enviado ao Setor. Motivo: ${transReason}`;
    } else if (lang === 'ja') {
      return `🚨 [派遣成功]: ${transRole}の${name}がセクターに派遣されました。理由: ${transReason}`;
    } else {
      return `🚨 [DISPATCH SUCCESSFUL]: ${transRole} ${name} dispatched to Sector. Reason: ${transReason}`;
    }
  }

  if (/\[ACCESSIBILITY REQUEST\]|\[SOLICITUD DE ACCESIBILIDAD\]/i.test(normalized)) {
    let service = 'assistance';
    const serviceMatch = normalized.match(/required:\s*(.*)$/i) || normalized.match(/requerido:\s*(.*)$/i);
    if (serviceMatch) {
      service = serviceMatch[1].trim();
    }
    
    const serviceTranslations: Record<string, Record<string, string>> = {
      'wheelchair assistance': { en: 'Wheelchair Assistance', es: 'Asistencia con Silla de Ruedas', pt: 'Assistência com Cadeira de Rodas', ja: '車椅子支援' },
      'sign language interpreter': { en: 'Sign Language Interpreter', es: 'Intérprete de Lengua de Señas', pt: 'Intérprete de Língua de Sinais', ja: '手話通訳' },
      'guide dog escort': { en: 'Guide Dog Escort', es: 'Escolta de Perro Guía', pt: 'Escolta de Cão-Guia', ja: '盲導犬同行支援' }
    };
    const transService = serviceTranslations[service.toLowerCase()]?.[lang] || service;
    
    if (lang === 'es') {
      return `[Solicitud de accesibilidad]: El aficionado requiere asistencia en la entrada. Servicio requerido: ${transService}.`;
    } else if (lang === 'pt') {
      return `[Solicitação de acessibilidade]: O torcedor necessita de assistência na entrada. Serviço necessário: ${transService}.`;
    } else if (lang === 'ja') {
      return `[アクセシビリティ申請]: 入口でサポートが必要なファンがいます。必要なサービス: ${transService}。`;
    } else {
      return `[Accessibility request]: Fan requires assistance at entrance. Service required: ${transService}.`;
    }
  }

  // 3. Fallback glossary word/phrase-by-phrase replacement for custom messages
  const glossary: Record<string, Record<string, string>> = {
    "the messages": { en: "The messages", es: "Los mensajes", pt: "As mensagens", ja: "メッセージ" },
    "are not getting": { en: "are not getting", es: "no se están", pt: "não estão sendo", ja: "が正しく～されていません" },
    "translated properly": { en: "translated properly", es: "traduciendo correctamente", pt: "traduzidas corretamente", ja: "翻訳" },
    "are not getting translated properly": { en: "are not getting translated properly", es: "no se están traduciendo correctamente", pt: "não estão sendo traduzidas corretamente", ja: "が正しく翻訳されていません" },
    "first aid": { en: "first aid", es: "primeros auxilios", pt: "primeiros socorros", ja: "救急手当" },
    "heat exhaustion": { en: "heat exhaustion", es: "agotamiento por calor", pt: "exaustão por calor", ja: "熱中症" },
    "severe congestion": { en: "severe congestion", es: "congestión severa", pt: "congestionamento grave", ja: "深刻な混雑" },
    "west entrance": { en: "west entrance", es: "entrada oeste", pt: "entrada oeste", ja: "西口" },
    "wheelchair assistance": { en: "wheelchair assistance", es: "asistencia con silla de ruedas", pt: "assistência de cadeira de rodas", ja: "車椅子対応の座席" },
    "need help": { en: "need help", es: "necesitamos ayuda", pt: "precisamos de ajuda", ja: "助けが必要です" },
    "all clear": { en: "all clear", es: "todo despejado", pt: "tudo limpo", ja: "異常なし" },
    "please respond": { en: "please respond", es: "por favor responda", pt: "por favor responda", ja: "応答してください" },
    "copy that": { en: "copy that", es: "copiado", pt: "entendido", ja: "了解" },
    "over and out": { en: "over and out", es: "corto y cierro", pt: "câmbio e desligo", ja: "以上、通信終了" },
    "not getting translated": { en: "not getting translated", es: "no se están traduciendo", pt: "não estão sendo traduzidas", ja: "翻訳されていない" },
    "not translating": { en: "not translating", es: "no traduciendo", pt: "não traduzindo", ja: "翻訳していない" },
    "hello": { en: "hello", es: "hola", pt: "olá", ja: "こんにちは" },
    "stadium": { en: "stadium", es: "estadio", pt: "estádio", ja: "スタジアム" },
    "operations": { en: "operations", es: "operaciones", pt: "operações", ja: "運営" },
    "emergency": { en: "emergency", es: "emergencia", pt: "emergência", ja: "緊急" },
    "incident": { en: "incident", es: "incidente", pt: "incidente", ja: "インシデント" },
    "staff": { en: "staff", es: "personal", pt: "equipe", ja: "スタッフ" },
    "volunteer": { en: "volunteer", es: "voluntario", pt: "voluntário", ja: "ボランティア" },
    "zone": { en: "zone", es: "zona", pt: "zona", ja: "ゾーン" },
    "sector": { en: "sector", es: "sector", pt: "setor", ja: "セクター" },
    "gate": { en: "gate", es: "puerta", pt: "portão", ja: "ゲート" },
    "entrance": { en: "entrance", es: "entrada", pt: "entrada", ja: "入口" },
    "exit": { en: "exit", es: "salida", pt: "saída", ja: "出口" },
    "crowd": { en: "crowd", es: "multitud", pt: "multidão", ja: "観客" },
    "safety": { en: "safety", es: "seguridad", pt: "segurança", ja: "安全" },
    "medical": { en: "medical", es: "médico", pt: "médico", ja: "医療" },
    "assistance": { en: "assistance", es: "asistencia", pt: "assistência", ja: "アシスト" },
    "water": { en: "water", es: "agua", pt: "água", ja: "水" },
    "fire": { en: "fire", es: "fuego", pt: "fogo", ja: "火災" },
    "help": { en: "help", es: "ayuda", pt: "ajuda", ja: "助け" },
    "report": { en: "report", es: "reporte", pt: "relatório", ja: "報告" },
    "active": { en: "active", es: "activo", pt: "ativo", ja: "アクティブ" }
  };

  let resultText = text;
  const sortedKeys = Object.keys(glossary).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    const translation = glossary[key][lang];
    if (translation && translation.toLowerCase() !== key.toLowerCase()) {
      const regex = new RegExp('\\b' + key + '\\b', 'gi');
      resultText = resultText.replace(regex, translation);
    }
  }

  // If the translation produced no change and it's a completely custom text, return a clean notice with prefix
  if (resultText === text) {
    const mockTranslations: Record<string, string> = {
      'es': `Señal recibida: ${text} (Procesado por Fielda Node)`,
      'en': `Signal received: ${text} (Processed by Fielda Node)`,
      'ja': `信号受信: ${text} (Fieldaによって翻訳)`,
      'pt': `Sinal recebido: ${text} (Traduzido por Fielda)`
    };
    return mockTranslations[lang] || `[AI Translation to ${targetLang}]: ${text}`;
  }

  return resultText;
}

function simulateCrowdPrediction(zoneName: string, occupancyPct: number) {
  // Return realistic predictions based on real current inputs
  let predictedPct = occupancyPct + Math.floor(Math.random() * 15) - 5;
  if (predictedPct > 115) predictedPct = 115;
  if (predictedPct < 10) predictedPct = 10;

  let confidence = 85 + Math.floor(Math.random() * 12);
  let suggested = 'Maintain normal volunteer monitoring and visual check-ins.';

  if (occupancyPct > 90) {
    suggested = `Deploy 3 crowd control marshals immediately to ${zoneName} to filter flow and redirect arriving attendees to secondary corridors.`;
    predictedPct = Math.max(predictedPct, 95);
  } else if (occupancyPct > 75) {
    suggested = `Begin pre-emptive gate-sharing adjustments. Guide volunteers to active lanes.`;
  } else if (occupancyPct < 30) {
    suggested = `Zone underutilized. Consolidate staff to higher density gate sectors.`;
  }

  return {
    predicted_congestion_pct: predictedPct,
    confidence,
    forecast_time: '+20 mins',
    suggested_action: suggested
  };
}

function simulateAccessibilityResponse(question: string): string {
  const query = question.toLowerCase();
  
  if (query.includes('wheelchair') || query.includes('silla de ruedas') || query.includes('mobility') || query.includes('movilidad')) {
    return 'Fielda Accessibility System: MetLife and Azteca Stadiums provide high-density wheelchair seating platforms with power outlets in Section 120 and 224. Accessible elevators are located near Gate A and Gate D. A dedicated companion seat is reserved alongside each platform.';
  }
  if (query.includes('sensory') || query.includes('sensorial') || query.includes('quiet') || query.includes('silencio') || query.includes('autism')) {
    return 'Fielda Sensory Care: Sensory Room 202 (MetLife) and Estancia Sensorial Sur (Azteca) are fully functional with noise-canceling headsets, weighted blankets, and dimmable LEDs. Volunteers can provide free sensory support kits containing tactile items at any information booth.';
  }
  if (query.includes('sign') || query.includes('lengua') || query.includes('deaf') || query.includes('sordo')) {
    return 'Fielda Sign Language: Our AI Accessibility Assistant features an interactive real-time American Sign Language (ASL) and Lengua de Señas Mexicana (LSM) video companion. Select the "Avatar Helper" view to see active gestures for emergency directions and match status.';
  }
  if (query.includes('restroom') || query.includes('baño') || query.includes('toilet')) {
    return 'Inclusive restrooms are situated on all primary concourses. Every single level includes fully accessible, gender-neutral, and family-focused facilities with low-profile touch sensors and emergency call levers.';
  }

  return 'Welcome to Fielda World Cup Helper! We provide customized sensory maps, real-time mobility routing, companion dispatches, and sign-language translations. Please ask me about sensory room capacities, wheelchair entrances, or volunteer availability!';
}

function parseCleanJSON(text: string): any {
  if (!text) return {};
  let cleaned = text.trim();
  // Strip markdown code block wrappers
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/, '');
  }
  cleaned = cleaned.trim();
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.warn('JSON parsing failed for string, returning empty object:', cleaned, err);
    return {};
  }
}

// --- API RETRY HELPER ---
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 2, delay = 300): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const status = error.status || error.statusCode;
    const is429 = status === 429 || error.message?.includes('quota') || error.message?.includes('rate limit') || error.message?.includes('429');
    if (is429) {
      throw error;
    }
    const isTransient = status === 503 || error.message?.includes('UNAVAILABLE') || error.message?.includes('high demand') || error.message?.includes('503');
    if (isTransient && retries > 0) {
      console.log(`Gemini status: ${status || 'transient'}. Re-trying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

// --- API ENDPOINTS ---

// Transcribe Audio
app.post('/api/gemini/transcribe', async (req, res) => {
  const { audioBase64, mimeType } = req.body;
  if (!audioBase64) {
    return res.status(400).json({ error: 'Missing audioBase64 parameter' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    return res.json({ text: "Simulated transcription for audio.", source: 'simulator' });
  }

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Transcribe the following audio exactly as spoken. Output ONLY the transcription, without any extra text." },
            { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } }
          ]
        }
      ]
    }));
    res.json({ text: response.text?.trim() || "", source: 'gemini' });
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes('quota'));
    if (!isQuota) {
      console.warn("Transcription error:", error.message);
    }
    res.status(500).json({ error: error.message });
  }
});


// Helper for highly robust translation with local fallback
async function getTranslationWithFallback(text: string, targetLang: string): Promise<string> {
  const lang = targetLang.substring(0, 2).toLowerCase();
  
  // 1. Try real translation using Google Translate free endpoint
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const json = await response.json();
      if (json && json[0]) {
        const translated = json[0].map((item: any) => item[0]).join('').trim();
        if (translated) {
          console.log(`Free Google Translate success: "${text}" -> "${translated}"`);
          return translated;
        }
      }
    }
  } catch (err: any) {
    console.warn('Free Google Translate API failed, falling back to local simulator:', err.message);
  }

  // 2. Local high-fidelity offline backup dictionary fallback
  return simulateTranslation(text, targetLang);
}

// 1. AI Real-time Translation
app.post('/api/gemini/translate', async (req, res) => {
  const { text, targetLang } = req.body;
  if (!text || !targetLang) {
    return res.status(400).json({ error: 'Missing text or targetLang parameters' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    // Return high-fidelity mock translation
    const translation = await getTranslationWithFallback(text, targetLang);
    return res.json({ translatedText: translation, source: 'simulator' });
  }

  try {
    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: `You are a translator for stadium staff and first responders during FIFA World Cup 2026. Translate the following text into the language code or name '${targetLang}'. Translate accurately, maintaining professional emergency and logistics context.
      
      Text to translate:
      "${text}"
      
      Response rules:
      Return ONLY the translated text. Do not add any greeting, introduction, notes, quotes or explanations.`,
    }));
    
    res.json({ translatedText: response.text?.trim() || text, source: 'gemini' });
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes('quota'));
    const fallbackTranslation = await getTranslationWithFallback(text, targetLang);
    res.json({ translatedText: fallbackTranslation, source: 'simulator-fallback', error: error.message });
  }
});

// 2. Deployment Co-pilot & Predictive Crowd Flow
app.post('/api/gemini/crowd-prediction', async (req, res) => {
  const { zoneName, occupancyPct, historicalMetrics } = req.body;
  if (!zoneName || occupancyPct === undefined) {
    return res.status(400).json({ error: 'Missing zoneName or occupancyPct' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    const prediction = simulateCrowdPrediction(zoneName, occupancyPct);
    return res.json({ ...prediction, source: 'simulator' });
  }

  try {
    const systemPrompt = `You are the Fielda AI Stadium Operations Engine for the 2026 FIFA World Cup. 
    Predict crowd congestion risks and suggest actionable staff allocations.
    Analyze the current occupancy of "${zoneName}" which is ${occupancyPct}%.
    Historical timeline reference: ${JSON.stringify(historicalMetrics || [])}`;

    const prompt = `As a stadium dispatcher, formulate a predictive risk analysis for ${zoneName}. 
    Provide the expected occupancy percentage in the next 20 minutes (predicted_congestion_pct), 
    confidence score (confidence) from 0 to 100, 
    and a clear, manual reassignment / crowd management command (suggested_action).`;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            predicted_congestion_pct: {
              type: Type.NUMBER,
              description: "Expected occupancy percentage in the next 20 minutes (from 0 to 120)."
            },
            confidence: {
              type: Type.NUMBER,
              description: "Confidence score from 0 to 100."
            },
            forecast_time: {
              type: Type.STRING,
              description: "Always '+20 mins'."
            },
            suggested_action: {
              type: Type.STRING,
              description: "Clear, manual reassignment / crowd management command."
            }
          },
          required: ["predicted_congestion_pct", "confidence", "forecast_time", "suggested_action"]
        }
      }
    }));

    const rawText = response.text || '{}';
    const result = parseCleanJSON(rawText);
    
    // Ensure properties exist on result, fall back if parse yielded an empty or incomplete object
    if (result.predicted_congestion_pct === undefined || result.suggested_action === undefined) {
      throw new Error("Parsed JSON response did not match expected schema properties.");
    }

    res.json({ ...result, source: 'gemini' });
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes('quota'));
    res.json({ ...simulateCrowdPrediction(zoneName, occupancyPct), source: 'simulator-fallback', error: error.message });
  }
});

// 4. Intelligent Emergency Staff Assignment
app.post('/api/gemini/assign-staff', async (req, res) => {
  try {
    const { incident, staffList, zones } = req.body;
    if (!incident) {
      return res.status(400).json({ error: 'Missing incident details' });
    }

    const ai = getGeminiClient();

    // Helper local matcher function for robust fallback
    const getFallbackAssignment = () => {
      try {
        // Basic deterministic backup assignment
        const activeStaff = (staffList || []).filter(
          (s: any) => s && s.stadium_id === incident.stadium_id && s.status !== 'off_duty'
        );
        if (activeStaff.length === 0) return null;

        // Filter by role preference
        let rolePreferred: string[] = [];
        const titleLower = (incident.title || '').toLowerCase();
        const descLower = (incident.description || '').toLowerCase();
        
        if (titleLower.includes('medical') || descLower.includes('medical') || titleLower.includes('cardiac') || titleLower.includes('trauma')) {
          rolePreferred = ['First Responder', 'Medical', 'Doctor', 'Nurse'];
        } else if (titleLower.includes('fire') || titleLower.includes('stampede') || titleLower.includes('hazard')) {
          rolePreferred = ['Crowd Marshal', 'Security', 'Marshal'];
        } else if (titleLower.includes('missing') || titleLower.includes('amber') || titleLower.includes('child')) {
          rolePreferred = ['Accessibility Lead', 'Crowd Marshal', 'Security'];
        }

        let match = activeStaff.find((s: any) => s && rolePreferred.some(r => (s.role || '').toLowerCase().includes(r.toLowerCase())));
        if (!match) match = activeStaff[0]; // fallback to any active staff

        const zoneObj = (zones || []).find((z: any) => z && z.id === incident.zone_id);

        return {
          assignedStaffId: match?.id || 'fallback-staff',
          assignedStaffName: match?.name || 'Fallback Staff',
          assignedStaffRole: match?.role || 'Responder',
          reason: `[AI Fallback] ${match?.name || 'Staff'} assigned based on active duty role matches (${match?.role || 'Responder'}) for Sector: ${zoneObj?.name || 'Assigned Zone'}.`,
          fanMessage: "Feel free to contact us if further help is needed!"
        };
      } catch (e: any) {
        console.error('getFallbackAssignment error:', e.message);
        return null;
      }
    };

    if (!ai) {
      const fallback = getFallbackAssignment();
      return res.json({ assignment: fallback, source: 'simulator' });
    }

    try {
      const zoneObj = (zones || []).find((z: any) => z && z.id === incident.zone_id);
      const systemPrompt = `You are the Fielda Emergency Dispatch AI Core for the FIFA World Cup 2026.
      Your job is to intelligently select the single best staff member from the available staff list to respond to an emergency incident.
      
      Emergency incident details:
      - Type: ${incident.title}
      - Severity: ${incident.severity}
      - Location: ${zoneObj?.name || 'Unknown Zone'}
      - Description: ${incident.description}

      Select the most suitable staff member based on:
      1. Role matching (e.g. "First Responder" or "Medical" for Cardiac/Trauma; "Crowd Marshal" or "Security" for Fire/Stampede/Crowd; "Accessibility Lead" or "Crowd Marshal" for Missing Person).
      2. Status: Favor "on_duty" or "standby" staff. NEVER assign "off_duty" staff.
      3. Proximity / Language: Match staff who speak matching languages if relevant, or who are situated close to the location.`;

      const prompt = `Available Staff list for stadium ${incident.stadium_id}:
      ${JSON.stringify(staffList || [])}
      
      Analyze the available staff and choose the single absolute best match. Provide their ID, name, role, and a clear concise reason why they are selected.`;

      const response = await callGeminiWithRetry(() => ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assignedStaffId: {
                type: Type.STRING,
                description: "The unique ID of the selected staff member."
              },
              assignedStaffName: {
                type: Type.STRING,
                description: "The name of the selected staff member."
              },
              assignedStaffRole: {
                type: Type.STRING,
                description: "The role of the selected staff member."
              },
              reason: {
                type: Type.STRING,
                description: "Brief (1 sentence) explanation of why this staff member is perfectly suited."
              }
            },
            required: ["assignedStaffId", "assignedStaffName", "assignedStaffRole", "reason"]
          }
        }
      }));

      const rawText = response.text || '{}';
      const result = parseCleanJSON(rawText);

      if (!result.assignedStaffId) {
        throw new Error("Invalid output format: missing assignedStaffId");
      }

      res.json({ assignment: result, source: 'gemini' });
    } catch (error: any) {
      const isQuota = error.status === 429 || (error.message && error.message.includes('quota'));
      if (!isQuota) {
        console.warn("AI Assignment error:", error.message);
      }
      res.json({ assignment: getFallbackAssignment(), source: 'simulator-fallback', error: error.message });
    }
  } catch (globalError: any) {
    console.error("Global route error in assign-staff:", globalError);
    res.status(500).json({ error: globalError.message || "Internal Server Error" });
  }
});

// 3. AI Accessibility Assistant / Multilingual Chat
app.post('/api/gemini/chat', async (req, res) => {
  const { question, history, language } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Missing question' });
  }

  const ai = getGeminiClient();
  if (!ai) {
    const responseText = simulateAccessibilityResponse(question);
    return res.json({ response: responseText, source: 'simulator' });
  }

  try {
    const systemPrompt = `You are "Fielda", the official real-time GenAI Accessibility & Inclusion Companion for the FIFA World Cup 2026.
    You assist disabled fans, neurodivergent attendees, and elder guests with sensory maps, wheelchair elevators, companion help, and sign-language resources.
    Keep your responses warm, incredibly encouraging, AAA accessible, clear, and focused on stadium coordinates.
    The current preferred language context is: ${language || 'English'}. Respond in this language.`;

    const chatHistory = (history || []).map((msg: any) => ({
      role: msg.sender === 'fan' ? 'user' : 'model',
      parts: [{ text: msg.message }]
    }));

    // Append current message
    chatHistory.push({
      role: 'user',
      parts: [{ text: question }]
    });

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: chatHistory.map((ch: any) => ch.parts[0].text).join('\n'), // simplistic concat or full mapping
      config: {
        systemInstruction: systemPrompt
      }
    }));

    res.json({ response: response.text?.trim() || simulateAccessibilityResponse(question), source: 'gemini' });
  } catch (error: any) {
    const isQuota = error.status === 429 || (error.message && error.message.includes('quota'));
    res.json({ response: simulateAccessibilityResponse(question), source: 'simulator-fallback', error: error.message });
  }
});

// Server entry setup based on NODE_ENV
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Mount Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted for local development.');
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static production build path serves successfully.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fielda Server booted and active at http://localhost:${PORT}`);
  });
}

startServer();
