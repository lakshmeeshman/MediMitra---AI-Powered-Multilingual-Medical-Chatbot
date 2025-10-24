export async function fetchOpenAIResponse(apiKey, userMessage) {
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `You are a helpful AI assistant. Respond to the user's message in a clear, concise, and natural way. Do not use asterisks, underscores, or any markdown formatting. Do not use phrases like "I'm" or "I'll" at the beginning. Just provide a direct, helpful response. Keep it conversational and under 100 words.

User message: ${userMessage}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Gemini error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error('Gemini Error:', error);
    return "I couldn't process that request. Please try again.";
  }
}