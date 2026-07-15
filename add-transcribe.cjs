const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const transcribeEndpoint = `

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
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: "Transcribe the following audio exactly as spoken. Output ONLY the transcription, without any extra text." },
            { inlineData: { data: audioBase64, mimeType: mimeType || 'audio/webm' } }
          ]
        }
      ]
    });
    res.json({ text: response.text?.trim() || "", source: 'gemini' });
  } catch (error: any) {
    console.error("Transcription error:", error);
    res.status(500).json({ error: error.message });
  }
});
`;

code = code.replace('// --- API ENDPOINTS ---', '// --- API ENDPOINTS ---' + transcribeEndpoint);
fs.writeFileSync('server.ts', code);
