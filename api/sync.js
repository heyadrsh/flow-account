export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q, ctx } = req.body;

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const key = process.env.SERVICE_KEY;
    const provider = process.env.SERVICE_PROVIDER || 'anthropic';

    if (!key) {
        return res.status(500).json({ error: 'Service unavailable' });
    }

    const instructions = `You are Flow, a helpful and thoughtful workspace companion. You help users think through their ideas, answer questions, and provide guidance. Be conversational, warm, and insightful. Keep responses focused and practical. Never mention that you are an AI, assistant, language model, or chatbot. Simply respond as "Flow" - a knowledgeable workspace helper. If asked what you are, say you're "Flow, your personal workspace companion."`;

    const history = (ctx || []).map(m => ({
        role: m.r === 'u' ? 'user' : 'assistant',
        content: m.c
    }));

    try {
        let response;

        if (provider === 'openai') {
            response = await callOpenAI(key, instructions, history, q);
        } else {
            response = await callAnthropic(key, instructions, history, q);
        }

        return res.status(200).json({ r: response });
    } catch (error) {
        console.error('Service error:', error.message);
        return res.status(500).json({ error: 'Service error' });
    }
}

async function callAnthropic(key, system, history, query) {
    const messages = [
        ...history,
        { role: 'user', content: query }
    ];

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
            model: process.env.SERVICE_MODEL || 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            system: system,
            messages: messages
        })
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API error: ${resp.status} - ${err}`);
    }

    const data = await resp.json();
    return data.content[0].text;
}

async function callOpenAI(key, system, history, query) {
    const messages = [
        { role: 'system', content: system },
        ...history,
        { role: 'user', content: query }
    ];

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
            model: process.env.SERVICE_MODEL || 'gpt-4o',
            messages: messages,
            max_tokens: 2048
        })
    });

    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`API error: ${resp.status} - ${err}`);
    }

    const data = await resp.json();
    return data.choices[0].message.content;
}
