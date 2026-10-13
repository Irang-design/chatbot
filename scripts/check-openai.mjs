import 'dotenv/config';
import OpenAI from 'openai';

console.log('API key configured:', Boolean(process.env.OPENAI_API_KEY?.trim()));
try {
  const result = await new OpenAI({ timeout: 15000, maxRetries: 0 }).chat.completions.create({
    model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'Reply OK.' }],
    max_completion_tokens: 5, store: false
  });
  console.log('OpenAI request succeeded:', Boolean(result.choices?.[0]?.message?.content));
} catch (error) {
  const allowed = ['invalid_api_key', 'insufficient_quota', 'rate_limit_exceeded', 'model_not_found',
    'EACCES', 'EPERM', 'ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'];
  console.log('OpenAI diagnostic:', JSON.stringify({
    status: error.status || null,
    kind: error instanceof OpenAI.APIConnectionTimeoutError ? 'timeout'
      : error instanceof OpenAI.APIConnectionError ? 'connection' : 'api',
    code: allowed.includes(error.code) ? error.code : null,
    networkCode: allowed.includes(error.cause?.code) ? error.cause.code : null
  }));
  process.exitCode = 1;
}
