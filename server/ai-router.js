class AIRouter {
  constructor(env) {
    this.env = env;
    this.models = [
      { id: 'gemini', name: 'Gemini Pro', provider: 'Google', free: true, strength: 'reasoning' },
      { id: 'groq', name: 'Mixtral 8x7B', provider: 'Groq', free: true, strength: 'speed' },
      { id: 'mistral', name: 'Mistral Large', provider: 'Mistral', free: true, strength: 'multilingual' },
      { id: 'hf', name: 'HuggingFace Models', provider: 'HuggingFace', free: true, strength: 'specialized' }
    ];
  }

  getModels() { return this.models; }

  async callGemini(prompt) {
    const key = this.env.GEMINI_API_KEY;
    if (!key || key === 'your_gemini_key') return { text: '[Gemini] API key chưa cấu hình', model: 'gemini' };
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text || '', model: 'gemini' };
    } catch (err) {
      return { text: `[Gemini Error] ${err.message}`, model: 'gemini', error: err.message };
    }
  }

  async callGroq(prompt) {
    const key = this.env.GROQ_API_KEY;
    if (!key || key === 'your_groq_key') return { text: '[Groq] API key chưa cấu hình', model: 'groq' };
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mixtral-8x7b-32768', messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', model: 'groq' };
    } catch (err) {
      return { text: `[Groq Error] ${err.message}`, model: 'groq', error: err.message };
    }
  }

  async callMistral(prompt) {
    const key = this.env.MISTRAL_API_KEY;
    if (!key || key === 'your_mistral_key') return { text: '[Mistral] API key chưa cấu hình', model: 'mistral' };
    try {
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'mistral-large-latest', messages: [{ role: 'user', content: prompt }] })
      });
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', model: 'mistral' };
    } catch (err) {
      return { text: `[Mistral Error] ${err.message}`, model: 'mistral', error: err.message };
    }
  }

  async callHuggingFace(prompt, task) {
    const token = this.env.HF_API_TOKEN;
    if (!token || token === 'your_hf_token') return { text: '[HuggingFace] Token chưa cấu hình', model: 'hf' };
    const modelMap = {
      'summarize': 'facebook/bart-large-cnn',
      'translate': 'Helsinki-NLP/opus-mt-vi-en',
      'general': 'mistralai/Mistral-7B-Instruct-v0.2'
    };
    try {
      const model = modelMap[task] || modelMap.general;
      const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: prompt, parameters: { max_new_tokens: 500 } })
      });
      const data = await res.json();
      return { text: Array.isArray(data) ? data.map(d => d.generated_text || '').join(' ') : data.generated_text || JSON.stringify(data), model: 'hf' };
    } catch (err) {
      return { text: `[HF Error] ${err.message}`, model: 'hf', error: err.message };
    }
  }

  async process(text, task = 'general') {
    const start = Date.now();
    const results = await Promise.allSettled([
      this.callGemini(text),
      this.callGroq(text),
      this.callMistral(text),
      this.callHuggingFace(text, task)
    ]);
    const responses = results.map(r => r.status === 'fulfilled' ? r.value : { text: '', error: r.reason?.message, model: 'unknown' });
    const successful = responses.filter(r => r.text && !r.error);
    const combined = successful.map(r => r.text).join('\n\n---\n\n');
    return {
      responses,
      combined: combined || responses.map(r => r.text || r.error).join('\n'),
      modelsUsed: responses.map(r => r.model),
      latency: Date.now() - start,
      summary: {
        total: responses.length,
        success: successful.length,
        failed: responses.length - successful.length
      }
    };
  }
}

module.exports = AIRouter;
