# 소담 AI 챗봇

HTML, CSS, JavaScript + Node.js/Express로 만든 한국어 챗봇입니다. OpenAI Chat Completions API의 `gpt-4o-mini`를 사용합니다.

## 로컬 실행

Node.js 22 이상을 설치하고 다음 명령을 실행하세요. Windows PowerShell에서 실행 정책 오류가 나면 `npm` 대신 `npm.cmd`를 사용하세요.

```sh
npm install
```

`.env.example`을 `.env`로 복사하고 `OPENAI_API_KEY`에 키를 입력하세요. 기존 `.env`가 있다면 복사하지 말고 해당 변수만 확인하세요.

```sh
npm run dev
```

http://localhost:3000 에 접속하세요. 일반 실행은 `npm start`, 검증은 `npm test`입니다.

## Vercel 배포

1. `.env`와 `node_modules`를 제외한 프로젝트를 GitHub 저장소에 올립니다.
2. Vercel에서 저장소를 Import합니다. Express 자동 감지를 사용하고, Build Command 및 Output Directory는 별도로 설정하지 않습니다.
3. 프로젝트 Settings → Environment Variables에 `OPENAI_API_KEY`를 추가합니다. 필요한 Production/Preview 환경을 선택합니다.
4. Deploy합니다. 환경 변수를 나중에 수정했다면 Redeploy하세요.

Vercel은 루트 `server.js`의 기본 export를 Express 앱으로 실행합니다. `vercel.json`은 함수 최대 실행 시간을 60초로 설정합니다. 프런트엔드 파일은 `public/`에서 제공됩니다.

## 구조와 대화 기록

- `lib/app.js`: 입력 검증, 서버 전용 OpenAI 호출, 로컬 정적 파일 제공
- `server.js`: 로컬 서버 실행 및 Vercel 진입점
- `public/`: 채팅 화면, 반응형 스타일, 브라우저 대화 상태
- `test/chat.test.js`: 실제 API 호출 없이 서버 동작 검증

데이터베이스를 사용하지 않습니다. 브라우저 탭의 메모리에 대화 기록을 보관하며 최근 20번의 질문/답변과 현재 질문을 API로 전달합니다. 새로고침, 탭 닫기, 새 대화 시 기록이 사라집니다. 다른 사용자의 대화는 서버에 보관하지 않습니다. 각 메시지는 최대 8,000자, 요청 전체는 최대 80,000자입니다. AI 출력은 최대 2,000토큰입니다. API의 `store: false`를 사용하며 OpenAI 서비스의 데이터 처리 정책은 별도로 적용됩니다.

메시지는 HTML로 해석하지 않고 텍스트로 렌더링합니다. API 키는 브라우저에 전달하지 않습니다. 이 예제에는 사용자 인증과 서비스 전체 요청 제한이 없으므로 공개 서비스 운영 시 인증 또는 Vercel의 접근 제어/요청 제한을 추가하세요.

공식 문서: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [GPT-4o mini](https://developers.openai.com/api/docs/models/gpt-4o-mini), [Express on Vercel](https://vercel.com/docs/frameworks/backend/express).
