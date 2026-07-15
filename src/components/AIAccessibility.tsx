import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Card, Button, Badge } from './SharedPrimitives';
import { HelpCircle, Send, RefreshCw, Volume2, Sparkles, Accessibility, Mic, MicOff } from 'lucide-react';

const welcomeMessages: Record<string, string> = {
  en: "Hello! I am Fielda, your World Cup 2026 accessibility guide. How can I help you navigate the stadium, locate sensory rooms, or find elevator paths today?",
  es: "¡Hola! Soy Fielda, tu guía de accesibilidad para la Copa Mundial 2026. ¿Cómo puedo ayudarte hoy a navegar por el estadio, ubicar salas sensoriales o encontrar rutas de ascensores?",
  fr: "Bonjour ! Je suis Fielda, votre guide d'accessibilité pour la Coupe du Monde 2026. Comment puis-je vous aider aujourd'hui à naviguer dans le stade, localiser des salles sensorielles ou trouver des ascenseurs ?",
  de: "Hallo! Ich bin Fielda, Ihre Barrierefreiheits-Begleiterin für die Weltmeisterschaft 2026. Wie kann ich Ihnen heute helfen, sich im Stadion zurechtzufinden, Ruheräume zu finden oder barrierefreie Aufzugswege zu nutzen?",
  ja: "こんにちは！私はフィエルダ（Fielda）、ワールドカップ2026のアクセシビリティガイドです。スタジアム内へのアクセス、センサリールームの場所、エレベーターのルート案内など、本日はどのようなお手伝いをしましょうか？",
  pt: "Olá! Eu sou a Fielda, sua guia de acessibilidade para a Copa do Mundo de 2026. Como posso ajudar você hoje a navegar pelo estádio, localizar salas sensoriais ou encontrar rotas de elevadores?",
  ar: "مرحباً! أنا فيلدا، دليلك لتسهيل الوصول في كأس العالم 2026. كيف يمكنني مساعدتك اليوم في التنقل داخل الملعب، تحديد مواقع الغرف الحسية، أو العثور على مسارات المصاعد؟",
  zh: "你好！我是 Fielda，您的 2026 年世界杯无障碍导览员。今天我能如何帮您在体育场导航、寻找感官室或查找无障碍电梯通道？",
  it: "Ciao! Sono Fielda, la tua guida per l'accessibilità della Coppa del Mondo 2026. Come posso aiutarti oggi a orientarti nello stadio, individuare stanze sensoriali o trovare percorsi con ascensori?",
  ko: "안녕하세요! 저는 2026 월드컵 배리어 프리 가이드 필다(Fielda)입니다. 오늘 경기장 안내, 센서리 룸 위치 찾기, 엘리베이터 경로 검색 등 어떤 점을 도와드릴까요?",
  ru: "Привет! Я Фильда, ваш гид по доступной среде на Чемпионате мира 2026. Чем я могу помочь вам сегодня: сориентироваться на стадионе, найти сенсорные комнаты или лифты?",
  hi: "नमस्ते! मैं फ़ील्डा हूँ, आपकी विश्व कप 2026 एक्सेसिबिलिटी गाइड। आज मैं स्टेडियम में नेविगेट करने, संवेदी कक्षों का पता लगाने, या लिफ्ट के रास्ते खोजने में आपकी क्या मदद कर सकती हूँ?"
};

const placeholders: Record<string, string> = {
  en: "Ask about step-free elevators, sensory rooms, wheelchair assistance...",
  es: "Pregúntame sobre ascensores, salas sensoriales o asistencia para silla de ruedas...",
  fr: "Posez des questions sur les ascenseurs, les salles sensorielles, l'aide en fauteuil roulant...",
  de: "Fragen Sie nach Aufzügen, Ruheräumen, Rollstuhlunterstützung...",
  ja: "エレベーター、センサリールーム、車椅子アシスタントについて質問する...",
  pt: "Pergunte sobre elevadores sem degraus, salas sensoriais, assistência para cadeiras de rodas...",
  ar: "اسأل عن المصاعد الخالية من الدرج، الغرف الحسية، مساعدة الكراسي المتحركة...",
  zh: "咨询无障碍电梯、感官室、轮椅协助等问题...",
  it: "Chiedi informazioni su ascensori senza barriere, stanze sensoriali, assistenza per sedie a rotelle...",
  ko: "계단 없는 엘리베이터, 센서리 룸, 휠체어 지원 등에 대해 문의하세요...",
  ru: "Спросите про лифты без ступеней, сенсорные комнаты, помощь с колясками...",
  hi: "बिना सीढ़ियों वाले लिफ्ट, संवेदी कक्ष, व्हीलचेयर सहायता के बारे में पूछें..."
};

const uiTranslations: Record<string, Record<string, string>> = {
  en: {
    interpreter: "Live sign interpreter",
    gestures: "Avatar Gestures",
    wave: "Wave",
    help: "Help",
    chair: "Chair",
    ears: "Ears",
    lifts: "Lifts",
    model: "Fielda Accessibility Model",
    liveContext: "Live World Cup context active",
    thinking: "Fielda is thinking...",
    send: "Send",
    assistantLang: "Assistant Lang:"
  },
  es: {
    interpreter: "Intérprete de señas en vivo",
    gestures: "Gestos del avatar",
    wave: "Saludar",
    help: "Ayuda",
    chair: "Silla",
    ears: "Oídos",
    lifts: "Ascensor",
    model: "Modelo de Accesibilidad de Fielda",
    liveContext: "Contexto de Copa Mundial en vivo activo",
    thinking: "Fielda está pensando...",
    send: "Enviar",
    assistantLang: "Idioma Asistente:"
  },
  fr: {
    interpreter: "Interprète de langue des signes en direct",
    gestures: "Gestes de l'avatar",
    wave: "Signe",
    help: "Aide",
    chair: "Chaise",
    ears: "Oreilles",
    lifts: "Ascenseurs",
    model: "Modèle d'Accessibilité Fielda",
    liveContext: "Contexte de la Coupe du Monde actif",
    thinking: "Fielda réfléchit...",
    send: "Envoyer",
    assistantLang: "Langue Assistant :"
  },
  de: {
    interpreter: "Live-Gebärdensprachdolmetscher",
    gestures: "Avatar-Gesten",
    wave: "Winken",
    help: "Hilfe",
    chair: "Rollstuhl",
    ears: "Ohren",
    lifts: "Aufzüge",
    model: "Fielda Barrierefreiheitsmodell",
    liveContext: "Live-WM-Kontext aktiv",
    thinking: "Fielda denkt nach...",
    send: "Senden",
    assistantLang: "Assistenten-Sprache:"
  },
  ja: {
    interpreter: "リアルタイム手話通訳",
    gestures: "アバターのジェスチャー",
    wave: "手を振る",
    help: "ヘルプ",
    chair: "車椅子",
    ears: "耳を保護",
    lifts: "エレベーター",
    model: "Fielda アクセシビリティモデル",
    liveContext: "ワールドカップのリアルタイムコンテキスト有効",
    thinking: "Fieldaが考えています...",
    send: "送信",
    assistantLang: "アシスタント言語:"
  },
  pt: {
    interpreter: "Intérprete de libras em tempo real",
    gestures: "Gestos do avatar",
    wave: "Acenar",
    help: "Ajuda",
    chair: "Cadeira",
    ears: "Ouvidos",
    lifts: "Elevadores",
    model: "Modelo de Acessibilidade Fielda",
    liveContext: "Contexto da Copa do Mundo ativo em tempo real",
    thinking: "Fielda está pensando...",
    send: "Enviar",
    assistantLang: "Idioma do Assistente:"
  },
  ar: {
    interpreter: "مترجم لغة الإشارة المباشر",
    gestures: "إيماءات الصورة الرمزية",
    wave: "لوّح",
    help: "مساعدة",
    chair: "كرسي",
    ears: "آذان",
    lifts: "مصاعد",
    model: "نموذج فيلدا لتسهيل الوصول",
    liveContext: "سياق كأس العالم المباشر نشط",
    thinking: "فيلدا تفكر...",
    send: "إرسال",
    assistantLang: "لغة المساعد:"
  },
  zh: {
    interpreter: "实时手话翻译",
    gestures: "虚拟人手势",
    wave: "挥手",
    help: "帮助",
    chair: "轮椅",
    ears: "护耳",
    lifts: "电梯",
    model: "Fielda 无障碍模型",
    liveContext: "世界杯实时环境已激活",
    thinking: "Fielda 正在思考...",
    send: "发送",
    assistantLang: "助手语言:"
  },
  it: {
    interpreter: "Interprete di lingua dei segni in tempo reale",
    gestures: "Gesti dell'avatar",
    wave: "Saluta",
    help: "Aiuto",
    chair: "Sedia",
    ears: "Orecchie",
    lifts: "Ascensori",
    model: "Modello di Accessibilità Fielda",
    liveContext: "Contesto della Coppa del Mondo attivo",
    thinking: "Fielda sta pensando...",
    send: "Invia",
    assistantLang: "Lingua Assistente:"
  },
  ko: {
    interpreter: "실시간 수어 통역사",
    gestures: "아바타 제스처",
    wave: "손흔들기",
    help: "도움말",
    chair: "휠체어",
    ears: "소음 방지",
    lifts: "엘리베이터",
    model: "필다 배리어 프리 모델",
    liveContext: "실시간 월드컵 컨텍스트 활성화됨",
    thinking: "필다가 생각 중입니다...",
    send: "전송",
    assistantLang: "비서 언어:"
  },
  ru: {
    interpreter: "Сурдопереводчик в реальном времени",
    gestures: "Жесты аватара",
    wave: "Махать",
    help: "Помощь",
    chair: "Коляска",
    ears: "Наушники",
    lifts: "Лифты",
    model: "Модель доступности Fielda",
    liveContext: "Активен контекст чемпионата мира",
    thinking: "Фильда думает...",
    send: "Отправить",
    assistantLang: "Язык ассистента:"
  },
  hi: {
    interpreter: "लाइव सांकेतिक भाषा अनुवादक",
    gestures: "अवतार के इशारे",
    wave: "हाथ हिलाएं",
    help: "मदद",
    chair: "कुर्सी",
    ears: "कान बचाएं",
    lifts: "लिफ्ट",
    model: "फ़ील्डा एक्सेसिबिलिटी मॉडल",
    liveContext: "लाइव विश्व कप संदर्भ सक्रिय है",
    thinking: "फ़ील्डा सोच रही है...",
    send: "भेजें",
    assistantLang: "सहायक भाषा:"
  }
};

export const AIAccessibility: React.FC = () => {
  const [messages, setMessages] = useState<any[]>([
    { sender: 'ai', message: 'Hello! I am Fielda, your World Cup 2026 accessibility guide. How can I help you navigate the stadium, locate sensory rooms, or find elevator paths today?', created_at: new Date().toISOString() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en');
  const [stadiumContext, setStadiumContext] = useState<any>({});

  const languageNames: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
    pt: 'Portuguese',
    ar: 'Arabic',
    zh: 'Chinese',
    it: 'Italian',
    ko: 'Korean',
    ru: 'Russian',
    hi: 'Hindi'
  };

  const getLanguageSpeechCode = (lang: string) => {
    switch (lang) {
      case 'es': return 'es-MX';
      case 'fr': return 'fr-FR';
      case 'de': return 'de-DE';
      case 'ja': return 'ja-JP';
      case 'pt': return 'pt-BR';
      case 'ar': return 'ar-SA';
      case 'zh': return 'zh-CN';
      case 'it': return 'it-IT';
      case 'ko': return 'ko-KR';
      case 'ru': return 'ru-RU';
      case 'hi': return 'hi-IN';
      default: return 'en-US';
    }
  };

  const t = (key: string) => {
    return uiTranslations[language]?.[key] || uiTranslations['en'][key];
  };

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 0) return prev;
      const first = prev[0];
      if (first && first.sender === 'ai') {
        const welcomeMessage = welcomeMessages[language] || welcomeMessages['en'];
        return [
          { ...first, message: welcomeMessage },
          ...prev.slice(1)
        ];
      }
      return prev;
    });
  }, [language]);

  // Sign Language Avatar hand render states
  const [avatarGesture, setAvatarGesture] = useState('welcome'); // 'welcome' | 'help' | 'wheelchair' | 'sensory' | 'elevators'
  const [isListening, setIsListening] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load live stadium context (to feed into the system query context)
  const loadStadiumContext = async () => {
    const { data: incidents } = await supabase.from('incidents').select();
    const { data: sensory } = await supabase.from('sensory_readings').select();
    const { data: zones } = await supabase.from('zones').select();

    const activeIncidents = (incidents || []).filter((i: any) => i.status !== 'resolved');
    const sensoryFriendlyRooms = (zones || []).filter((z: any) => z.type === 'sensory');

    setStadiumContext({
      incidents: activeIncidents.map(i => i.title),
      sensoryRooms: sensoryFriendlyRooms.map(r => `${r.name}: ${r.current_occupancy}/${r.capacity} occupied`),
    });
  };

  useEffect(() => {
    loadStadiumContext();
    const sub1 = supabase.subscribe('incidents', loadStadiumContext);
    const sub2 = supabase.subscribe('zones', loadStadiumContext);
    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
    };
  }, []);

  // Animate the Sign-Language Avatar Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;

    const drawAvatar = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw head and neck
      ctx.fillStyle = '#1e293b'; // dark head outline
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;

      // Draw torso
      ctx.beginPath();
      ctx.arc(100, 180, 50, Math.PI, 0, false);
      ctx.fillStyle = '#334155';
      ctx.fill();
      ctx.stroke();

      // Head
      ctx.beginPath();
      ctx.arc(100, 75, 32, 0, Math.PI * 2);
      ctx.fillStyle = '#f8fafc';
      ctx.fill();
      ctx.stroke();

      // Hair (styled cap/hair)
      ctx.beginPath();
      ctx.arc(100, 68, 32, Math.PI, 0, false);
      ctx.fillStyle = '#0f172a';
      ctx.fill();

      // Smiling face
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(100, 80, 12, 0, Math.PI, false); // smile
      ctx.stroke();

      // Eyes
      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(90, 72, 3, 0, Math.PI * 2);
      ctx.arc(110, 72, 3, 0, Math.PI * 2);
      ctx.fill();

      // 2. Draw Hand Gestures based on active state
      ctx.strokeStyle = '#38bdf8'; // Cyan neon outlines for hand gestures
      ctx.lineWidth = 3;
      ctx.fillStyle = '#e2e8f0';

      const pulse = Math.sin(frame * 0.1) * 3;

      if (avatarGesture === 'welcome') {
        // Double waving hands
        ctx.beginPath();
        ctx.arc(60, 130 + pulse, 10, 0, Math.PI * 2); // Left hand
        ctx.arc(140, 130 - pulse, 10, 0, Math.PI * 2); // Right hand
        ctx.fill();
        ctx.stroke();

        // Arm lines
        ctx.beginPath();
        ctx.moveTo(70, 150); ctx.lineTo(60, 130 + pulse);
        ctx.moveTo(130, 150); ctx.lineTo(140, 130 - pulse);
        ctx.stroke();
      } 
      else if (avatarGesture === 'help') {
        // ASL Help sign: flat left hand under right fist
        ctx.beginPath();
        ctx.rect(70, 140 + pulse, 60, 10); // flat hand
        ctx.arc(100, 125 + pulse, 10, 0, Math.PI * 2); // fist
        ctx.fill();
        ctx.stroke();
      } 
      else if (avatarGesture === 'wheelchair') {
        // Mobility gesture: hands forming rolling wheel shapes
        ctx.beginPath();
        ctx.arc(65, 140, 12 + pulse, 0, Math.PI * 2);
        ctx.arc(135, 140, 12 + pulse, 0, Math.PI * 2);
        ctx.stroke();
      } 
      else if (avatarGesture === 'sensory') {
        // Cups ears gesture (sensory protection)
        ctx.beginPath();
        ctx.arc(58, 75 + pulse, 8, 0, Math.PI * 2); // cup left
        ctx.arc(142, 75 - pulse, 8, 0, Math.PI * 2); // cup right
        ctx.fill();
        ctx.stroke();
      } 
      else if (avatarGesture === 'elevators') {
        // Hands directing upwards arrow
        ctx.beginPath();
        ctx.moveTo(100, 140 + pulse); ctx.lineTo(100, 115 + pulse); // vertical shaft
        ctx.lineTo(90, 125 + pulse);
        ctx.moveTo(100, 115 + pulse); ctx.lineTo(110, 125 + pulse);
        ctx.stroke();
      }

      animId = requestAnimationFrame(drawAvatar);
    };

    drawAvatar();

    return () => cancelAnimationFrame(animId);
  }, [avatarGesture]);

  const sendMessage = async (userText: string) => {
    if (!userText.trim()) return;

    setInputText('');
    setIsLoading(true);

    const newFanMessage = {
      sender: 'fan',
      message: userText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newFanMessage]);

    // Choose sign gesture in sync with text keywords
    const lowerText = userText.toLowerCase();
    if (lowerText.includes('wheelchair') || lowerText.includes('mobility') || lowerText.includes('silla')) {
      setAvatarGesture('wheelchair');
    } else if (lowerText.includes('sensory') || lowerText.includes('quiet') || lowerText.includes('noise')) {
      setAvatarGesture('sensory');
    } else if (lowerText.includes('elevator') || lowerText.includes('lift') || lowerText.includes('step-free')) {
      setAvatarGesture('elevators');
    } else {
      setAvatarGesture('help');
    }

    try {
      // Feed active incidents + quiet room occupancy as explicit query context so Gemini has true data
      const contextAddition = `
      [Active Stadium Telemetry Context]:
      - Active incident blockages to avoid: ${stadiumContext.incidents?.join(', ') || 'None'}.
      - Quiet room real-time occupancy: ${stadiumContext.sensoryRooms?.join(', ') || 'Unknown'}.
      `;

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `${userText}\n\n${contextAddition}`,
          history: messages,
          language: languageNames[language] || 'English'
        })
      });

      const result = await response.json();
      
      const newAIMessage = {
        sender: 'ai',
        message: result.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, newAIMessage]);
      
      // Save conversations to database simulator so it accumulates history
      await supabase.from('assistant_conversations').insert({
        fan_id: 'fan-test-1',
        message: userText,
        sender: 'fan',
        language: language
      });

      await supabase.from('assistant_conversations').insert({
        fan_id: 'fan-test-1',
        message: result.response,
        sender: 'ai',
        language: language
      });

      handleSpeak(result.response);

    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputText);
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      const speechLang = getLanguageSpeechCode(language);
      utterance.lang = speechLang;
      
      const voices = window.speechSynthesis.getVoices();
      let voice = voices.find(v => v.lang.replace('_', '-') === speechLang);
      if (!voice) {
        voice = voices.find(v => v.lang.startsWith(language));
      }
      if (!voice && languageNames[language]) {
        const langName = languageNames[language].toLowerCase();
        voice = voices.find(v => v.name.toLowerCase().includes(langName));
      }

      if (voice) {
        utterance.voice = voice;
      }

      // Read volume from accessibility settings
      const savedVolume = localStorage.getItem('accessibility-tts-volume');
      if (savedVolume !== null) {
        utterance.volume = parseFloat(savedVolume);
      }

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleListening = async () => {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result?.toString().split(',')[1];
            if (base64data) {
              setIsLoading(true);
              try {
                const response = await fetch('/api/gemini/transcribe', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ audioBase64: base64data, mimeType: 'audio/webm' })
                });
                const data = await response.json();
                if (data.text) {
                  sendMessage(data.text);
                } else {
                  console.error("Transcription failed", data);
                }
              } catch (err) {
                console.error("Error transcribing audio:", err);
              } finally {
                setIsLoading(false);
              }
            }
          };
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsListening(true);
      } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Microphone access is required to use voice messages.");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto text-white">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase flex items-center gap-2">
            <Accessibility className="text-[#9D50FF]" size={24} />
            AI Accessibility Assistant
          </h2>
          <p className="text-xs text-white/50 font-mono uppercase mt-1">Inclusive World Cup Companion and Sign-Language visual helper</p>
        </div>

        {/* Expanded Lang switch dropdown */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-sm px-2 py-1.5">
          <span className="text-[10px] text-white/50 font-mono uppercase tracking-wider">{t('assistantLang')}</span>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-transparent text-xs text-white border-none focus:outline-none cursor-pointer font-bold uppercase font-mono"
          >
            {Object.keys(languageNames).map((langKey) => (
              <option key={langKey} value={langKey} className="bg-[#111114] text-white">
                {langKey.toUpperCase()} - {languageNames[langKey]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sign Language Avatar Box (1/4 width) */}
        <div className="space-y-4">
          <Card module="unitypath" className="flex flex-col items-center justify-center p-5 text-center">
            <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider mb-2">{t('interpreter')}</span>
            
            <div className="w-full aspect-square max-w-[200px] bg-[#0A0A0B] rounded-full border-4 border-white/5 overflow-hidden relative flex items-center justify-center shadow-inner">
              <canvas 
                ref={canvasRef} 
                width={200} 
                height={200}
                className="w-full h-full"
              />
            </div>

            <div className="mt-4 space-y-1.5 w-full">
              <span className="text-[10px] font-mono uppercase text-white/40 block">{t('gestures')}</span>
              <div className="flex flex-wrap gap-1 justify-center">
                <button 
                  onClick={() => setAvatarGesture('welcome')} 
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono uppercase border cursor-pointer transition-all ${avatarGesture === 'welcome' ? 'bg-[#9D50FF]/20 border-[#9D50FF]/40 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  {t('wave')}
                </button>
                <button 
                  onClick={() => setAvatarGesture('help')} 
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono uppercase border cursor-pointer transition-all ${avatarGesture === 'help' ? 'bg-[#9D50FF]/20 border-[#9D50FF]/40 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  {t('help')}
                </button>
                <button 
                  onClick={() => setAvatarGesture('wheelchair')} 
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono uppercase border cursor-pointer transition-all ${avatarGesture === 'wheelchair' ? 'bg-[#9D50FF]/20 border-[#9D50FF]/40 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  {t('chair')}
                </button>
                <button 
                  onClick={() => setAvatarGesture('sensory')} 
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono uppercase border cursor-pointer transition-all ${avatarGesture === 'sensory' ? 'bg-[#9D50FF]/20 border-[#9D50FF]/40 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  {t('ears')}
                </button>
                <button 
                  onClick={() => setAvatarGesture('elevators')} 
                  className={`px-2 py-1 rounded-sm text-[9px] font-mono uppercase border cursor-pointer transition-all ${avatarGesture === 'elevators' ? 'bg-[#9D50FF]/20 border-[#9D50FF]/40 text-purple-300 font-bold' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  {t('lifts')}
                </button>
              </div>
            </div>
          </Card>
        </div>

        {/* Multilingual Assistant Chat (3/4 width) */}
        <div className="lg:col-span-3 h-[500px] flex flex-col bg-[#16161A] border border-white/5 rounded-sm">
          
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/5 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#9D50FF] animate-pulse" />
              <span className="text-xs font-display font-black uppercase text-white flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#9D50FF]" />
                {t('model')}
              </span>
            </div>
            <span className="text-[10px] font-mono text-white/40 uppercase">{t('liveContext')}</span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => {
              const isFan = msg.sender === 'fan';
              return (
                <div 
                  key={i}
                  className={`flex ${isFan ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-lg rounded-sm p-3 text-sm shadow-xl space-y-1.5 relative ${
                    isFan 
                      ? 'bg-[#9D50FF]/25 border border-[#9D50FF]/30 text-white rounded-br-none' 
                      : 'bg-white/5 text-white/90 rounded-bl-none border border-white/10'
                  }`}>
                    <p className="leading-relaxed">{msg.message}</p>
                    
                    {!isFan && (
                      <div className="flex justify-end pt-1">
                        <button 
                          onClick={() => handleSpeak(msg.message)}
                          className="text-white/40 hover:text-white p-1 rounded-sm transition-colors cursor-pointer"
                          title="Read out loud"
                        >
                          <Volume2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 rounded-sm rounded-bl-none p-3 text-xs text-white/60 font-mono uppercase flex items-center gap-2 border border-white/10 shadow-sm">
                  <RefreshCw className="animate-spin" size={12} />
                  {t('thinking')}
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 flex gap-2 flex-shrink-0 items-center">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-sm flex items-center justify-center transition-colors border ${isListening ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' : 'bg-white/5 text-white/60 border-white/10 hover:text-white hover:bg-white/10'}`}
              title="Voice Input"
            >
              {isListening ? <Mic size={16} /> : <MicOff size={16} />}
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Listening..." : placeholders[language] || placeholders['en']}
              className="flex-1 p-2.5 rounded-sm text-sm bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-[#9D50FF]"
            />
            <Button type="submit" module="unitypath" className="!py-2.5">
              <Send size={14} />
              {t('send')}
            </Button>
          </form>

        </div>

      </div>

    </div>
  );
};
