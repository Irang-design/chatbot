const form = document.querySelector('#chat-form');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const log = document.querySelector('#messages');
const welcome = document.querySelector('#welcome');
const conversation = document.querySelector('#conversation');
const errorBox = document.querySelector('#error');
const reset = document.querySelector('#new-chat');
let history = [];
let busy = false;

function updateInput() {
  send.disabled = busy || !input.value.trim();
  input.style.height = 'auto';
  input.style.height = `${Math.min(input.scrollHeight, 160)}px`;
}
function addMessage(role, content, pending = false) {
  const row = document.createElement('div');
  row.className = `message ${role}`;
  const avatar = document.createElement('span');
  avatar.className = 'avatar';
  avatar.textContent = role === 'user' ? '나' : '✳';
  avatar.setAttribute('aria-hidden', 'true');
  const body = document.createElement('div');
  body.className = 'message-body';
  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = role === 'user' ? '나' : '소담';
  const text = document.createElement('div');
  text.className = `message-content${pending ? ' pending' : ''}`;
  text.textContent = content;
  body.append(label, text);
  row.append(avatar, body);
  log.append(row);
  conversation.scrollTop = conversation.scrollHeight;
  return row;
}
input.addEventListener('input', updateInput);
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault();
    if (!send.disabled) form.requestSubmit();
  }
});
document.querySelectorAll('[data-prompt]').forEach((button) => {
  button.addEventListener('click', () => {
    if (busy) return;
    input.value = button.dataset.prompt;
    updateInput();
    form.requestSubmit();
  });
});
reset.addEventListener('click', () => {
  if (busy) return;
  history = [];
  log.replaceChildren();
  welcome.hidden = false;
  errorBox.hidden = true;
  input.value = '';
  updateInput();
  input.focus();
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const content = input.value.trim();
  if (!content || busy) return;
  // Keep the newest 20 completed exchanges and the current question.
  const messages = [...history.slice(-40), { role: 'user', content }];
  if (messages.reduce((sum, m) => sum + m.content.length, 0) > 80000) {
    errorBox.textContent = '대화가 길어졌습니다. 새 대화를 시작해 주세요.';
    errorBox.hidden = false;
    return;
  }
  busy = true;
  input.disabled = true;
  reset.disabled = true;
  errorBox.hidden = true;
  welcome.hidden = true;
  input.value = '';
  updateInput();
  const userRow = addMessage('user', content);
  const pendingRow = addMessage('assistant', '답변을 생각하고 있어요…', true);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }), signal: AbortSignal.timeout(55000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '요청에 실패했습니다.');
    if (typeof data.reply !== 'string' || !data.reply.trim()) throw new Error('응답을 받지 못했습니다.');
    pendingRow.remove();
    addMessage('assistant', data.reply);
    history = [...messages, { role: 'assistant', content: data.reply }];
  } catch (error) {
    pendingRow.remove();
    userRow.remove();
    input.value = content;
    welcome.hidden = history.length > 0;
    errorBox.textContent = error.name === 'TimeoutError'
      ? '응답 시간이 초과되었습니다. 다시 보내 주세요.'
      : error instanceof TypeError ? '서버에 연결할 수 없습니다. 연결 상태를 확인해 주세요.' : error.message;
    errorBox.hidden = false;
  } finally {
    busy = false;
    input.disabled = false;
    reset.disabled = false;
    updateInput();
    input.focus();
  }
});
