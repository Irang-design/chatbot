import express from 'express';
import OpenAI from 'openai';
import { fileURLToPath } from 'node:url';

export function createApp({ complete } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.post('/api/chat', async (req, res) => {
    const messages = req.body?.messages;
    if (!Array.isArray(messages) || !messages.length || messages.length > 41 ||
        messages.some((m, i) => !m || m.role !== (i % 2 === 0 ? 'user' : 'assistant') ||
          typeof m.content !== 'string' || !m.content.trim() || m.content.length > 8000) ||
        messages.at(-1)?.role !== 'user' ||
        messages.reduce((sum, m) => sum + m.content.length, 0) > 80000) {
      return res.status(400).json({ error: '대화 형식 또는 길이를 확인해 주세요. 메시지는 8,000자까지 입력할 수 있습니다.' });
    }
    if (!complete && !process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: '서버에 OPENAI_API_KEY 환경 변수를 설정해 주세요.' });
    }
    try {
      const input = {
        model: 'gpt-4o-mini',
        store: false,
        messages: [
          { role: 'system', content: '당신은 친절하고 정확한 AI 도우미입니다. 이전 대화를 고려하여 답하세요. 기본적으로 한국어로 답하되 사용자가 요청한 언어를 따르세요. 모르는 사실은 추측하지 말고 불확실성을 설명하세요.' },
          ...messages.map(({ role, content }) => ({ role, content }))
        ],
        max_completion_tokens: 2000
      };
      const result = complete ? await complete(input) : await new OpenAI({
        apiKey: process.env.OPENAI_API_KEY, timeout: 45000, maxRetries: 0
      }).chat.completions.create(input);
      const reply = result.choices?.[0]?.message?.content;
      if (!reply) return res.status(502).json({ error: '응답을 받지 못했습니다. 다시 시도해 주세요.' });
      return res.json({ reply });
    } catch (error) {
      let status = 502;
      let message = 'OpenAI API 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      if (error instanceof OpenAI.APIConnectionTimeoutError) {
        status = 504;
        message = 'OpenAI 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.';
      } else if (error instanceof OpenAI.APIConnectionError) {
        message = '서버에서 OpenAI에 연결할 수 없습니다. 서버의 인터넷 연결, 방화벽 또는 실행 환경의 네트워크 권한을 확인해 주세요.';
      } else if (error.status === 401) {
        message = 'OpenAI API 키 인증에 실패했습니다. 서버의 OPENAI_API_KEY를 확인하고 서버를 다시 시작해 주세요.';
      } else if (error.status === 403) {
        message = 'OpenAI API 접근 권한이 없습니다. API 키의 프로젝트 및 모델 사용 권한을 확인해 주세요.';
      } else if (error.status === 429) {
        status = 429;
        message = error.code === 'insufficient_quota'
          ? 'OpenAI API 크레딧 또는 사용 한도가 부족합니다. API 계정의 결제 및 사용 한도를 확인해 주세요.'
          : 'API 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.';
      }
      return res.status(status).json({ error: message });
    }
  });
  app.all('/api/chat', (_req, res) => res.status(405).json({ error: 'POST 요청만 지원합니다.' }));
  app.use('/api', (_req, res) => res.status(404).json({ error: '존재하지 않는 API입니다.' }));
  app.use(express.static(fileURLToPath(new URL('../public/', import.meta.url))));
  app.use((error, _req, res, _next) => {
    res.status(error.status === 413 ? 413 : 400).json({ error: '요청 데이터가 너무 크거나 올바른 JSON 형식이 아닙니다.' });
  });
  return app;
}

export default createApp();
