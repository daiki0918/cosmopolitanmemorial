// Shared by the API and web app. Keep this browser-safe and put every tunable limit here.
// Chat currently uses cached local replies and static articles; no model or AI API calls are made.
// A future AI integration must honor the configured response-token and context-window limits.
export const GUARDRAILS = {
  api: {
    jsonBodyMaxBytes: 100 * 1024,
    requestsPerIpHour: 300,
    inquiriesPerIpDay: 5,
    paidApiCallsPerDay: 1000,
    requestWindowMs: 60 * 60_000,
    inquiryWindowMs: 24 * 60 * 60_000,
    paidApiWindowMs: 24 * 60 * 60_000,
  },
  auth: {
    maxFailedLogins: 5,
    failedLoginLockMs: 15 * 60_000,
    loginIpLimit: 20,
    loginEmailLimit: 10,
    loginWindowMs: 15 * 60_000,
  },
  inquiry: {
    nameMaxCharacters: 120,
    emailMaxCharacters: 254,
    phoneMaxCharacters: 30,
    subjectMaxCharacters: 150,
    messageMaxCharacters: 3000,
    maxLinks: 3,
    repeatedCharacterThreshold: 20,
  },
  chat: {
    messagesPerSession: 10,
    messagesPerMinute: 5,
    messageWindowMs: 60_000,
    cooldownMs: 3_000,
    maxInputCharacters: 500,
    maxResponseTokens: 250,
    contextMessages: 4,
    replyCacheEntries: 100,
  },
} as const;
