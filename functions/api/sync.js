export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const { q, ctx } = await request.json();

        if (!q || typeof q !== 'string') {
            return new Response(JSON.stringify({ error: 'Invalid request' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const baseUrl = env.SERVICE_URL;
        const key = env.SERVICE_KEY;
        const model = env.SERVICE_MODEL || 'claude-opus-4-5';

        if (!baseUrl || !key) {
            return new Response(JSON.stringify({ error: 'Service unavailable' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
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
            return new Response(JSON.stringify({ error: 'Service error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const data = await resp.json();
        const response = data.content?.[0]?.text || 'Unable to process request.';

        return new Response(JSON.stringify({ r: response }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Service error:', error.message);
        return new Response(JSON.stringify({ error: 'Service error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
