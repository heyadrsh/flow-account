export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { q, ctx } = req.body;

    if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Invalid request' });
    }

    const baseUrl = process.env.SERVICE_URL;
    const key = process.env.SERVICE_KEY;
    const model = process.env.SERVICE_MODEL || 'claude-opus-4-5';

    if (!baseUrl || !key) {
        return res.status(500).json({ error: 'Service unavailable' });
    }

    const instructions = `You are Flow, a helpful and thoughtful workspace companion. You help users think through their ideas, answer questions, and provide guidance. Be conversational, warm, and insightful. Keep responses focused and practical. Never mention that you are an AI, assistant, language model, or chatbot. Simply respond as "Flow" - a knowledgeable workspace helper. If asked what you are, say you're "Flow, your personal workspace companion."`;

    const history = (ctx || []).map(m => ({
        role: m.r === 'u' ? 'user' : 'assistant',
        content: m.c
    }));

    const messages = [
        ...history,
        { role: 'user', content: q }
    ];

    try {
        const endpoint = `${baseUrl}/v1/messages`;

        const resp = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: model,
                max_tokens: 4096,
                system: instructions,
                messages: messages
            })
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.error('API error:', resp.status, err);
            return res.status(500).json({ error: 'Service error' });
        }

        const data = await resp.json();
        const response = data.content?.[0]?.text || 'Unable to process request.';

        return res.status(200).json({ r: response });
    } catch (error) {
        console.error('Service error:', error.message);
        return res.status(500).json({ error: 'Service error' });
    }
}
