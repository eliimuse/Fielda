const fs = require('fs');
let code = fs.readFileSync('src/components/AIAccessibility.tsx', 'utf8');

// Replace recognitionRef with mediaRecorderRef and audioChunksRef
code = code.replace(
  'const recognitionRef = useRef<any>(null);',
  `const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);`
);

// Replace toggleListening
const oldToggle = `  const toggleListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      const recognition = new SpeechRecognition();
      recognition.lang = getLanguageSpeechCode(language);
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        sendMessage(transcript);
      };
      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
      recognition.start();
    }
  };`;

const newToggle = `  const toggleListening = async () => {
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
  };`;

code = code.replace(oldToggle, newToggle);
fs.writeFileSync('src/components/AIAccessibility.tsx', code);
