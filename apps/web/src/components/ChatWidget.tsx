import { FormEvent, useEffect, useRef, useState, type AnimationEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import { GUARDRAILS } from "../../../api/src/config/guardrails";
import { IconPhone, IconPin } from "./Icons";

type ChatAction = { label: string; to: string; icon?: "phone" | "pin" };
type Message = { id: number; sender: "assistant" | "visitor"; text: string; time: string; actions?: ChatAction[] };
type Rating = "happy" | "neutral" | "unhappy";
type SupportChat = { id: string; messages: Message[]; updatedAt: string; ended: boolean };
type HelpArticle = { id: string; title: string; summary: string; answer: string; steps: string[]; featured?: boolean; videoId?: string };
type HelpCategory = { title: string; description: string; articles: HelpArticle[] };

const chatTime = () => new Intl.DateTimeFormat([], { hour: "2-digit", minute: "2-digit" }).format(new Date());
const historyKey = "cosi-chat-history";
const messageRateKey = "cosi-chat-send-times-v1";
const chatCooldownMessage = `Please wait ${GUARDRAILS.chat.cooldownMs / 1000} seconds before sending another message.`;
const chatMinuteLimitMessage = `You’ve sent ${GUARDRAILS.chat.messagesPerMinute} messages in the last minute. Please wait before sending another.`;
const chatSessionLimitMessage = "This chat has reached its message limit. Start a new chat, browse the Knowledge Base, or call 0917 803 8524.";
export const HELP_ARTICLES: Record<string, HelpCategory> = {
  arrangements: {
    title: "Arrangements",
    description: "Guidance for getting support and preparing to speak with our team.",
    articles: [
      {
        id: "arranging-services",
        title: "How do I get help arranging funeral services?",
        summary: "Our team can listen to your needs and explain the options currently available to your family.",
        answer: "We’re sorry your family is facing a difficult time. Contact our team or a nearby branch so we can understand what you need and explain the arrangements and services available. Options can vary by location and situation, so our staff will help you discuss the details directly.",
        steps: ["Call our team at 0917 803 8524 or 0949 993 9220, or find a branch.", "Tell us how we can reach you and which location is convenient.", "Discuss the available arrangements, options, and any questions before making a decision."],
        featured: true,
      },
      {
        id: "prepare-to-contact",
        title: "What information should I prepare before contacting you?",
        summary: "A preferred contact method, your location, and a short description of the help you need are a good start.",
        answer: "To help us direct your request, share your name, a way for us to reach you, your city or preferred branch, and a brief description of what you need. You do not need to include sensitive personal, medical, or financial information in an initial message.",
        steps: ["Choose a phone number or email address where we can reach you.", "Note your city or the branch you would like to contact.", "Describe your question briefly and leave sensitive details out of the first message."],
      },
    ],
  },
  services: {
    title: "Services and pricing",
    description: "Learn how to ask about services, products, availability, and costs.",
    articles: [
      {
        id: "services-products",
        title: "What services and memorial products are available?",
        summary: "Available services and products can vary by branch and by your family’s needs.",
        answer: "Cosmopolitan Funeral Homes can discuss service arrangements and memorial product options with your family. Availability and selections may differ by branch. Contact our team or your preferred branch for current information and to discuss what is suitable for your needs.",
        steps: ["Contact the branch that is convenient for your family.", "Tell the team which services or product options you would like to ask about.", "Confirm availability and details directly with the branch."],
        featured: true,
      },
      {
        id: "service-pricing",
        title: "How much do services or packages cost?",
        summary: "Costs depend on the services and options selected; ask the team for current pricing and inclusions.",
        answer: "The cost depends on the arrangements and options selected, and pricing or availability may vary. Contact a branch or our team to request current prices and a clear explanation of what is included before making arrangements. Online examples are not a substitute for confirming a current quote.",
        steps: ["Tell the team which service or options you are considering.", "Ask for current pricing and a breakdown of what is included.", "Confirm any details that matter to your family before proceeding."],
      },
    ],
  },
  branches: {
    title: "Branches",
    description: "Find a location and connect with the branch that can assist you.",
    articles: [
      {
        id: "find-branch",
        title: "How can I find a branch near me?",
        summary: "Use the published branch locations and contact details, or ask us to help find the right location.",
        answer: "Browse the branch locations published on our website to find contact details. If you are unsure which branch is right for you, contact our team and share your city or province so we can help direct your request.",
        steps: ["Open the branch directory on the website to review locations.", "Choose a convenient branch and use its published contact details.", "If you need help choosing, call us at 0917 803 8524 or 0949 993 9220."],
        featured: true,
      },
    ],
  },
  inquiries: {
    title: "Inquiries and privacy",
    description: "Get help with an inquiry or a question about your personal information.",
    articles: [
      {
        id: "track-inquiry",
        title: "How can I check the status of an inquiry?",
        summary: "Use the reference number from your confirmation to check an inquiry’s latest status.",
        answer: "If you submitted an inquiry through the website, use the reference number shown in your submission confirmation to check its latest status. Keep the reference private because it can be used to view your inquiry. If you cannot find it or need help, contact our team.",
        steps: ["Locate the reference number in your submission confirmation.", "Use the inquiry tracking feature on the website and enter the reference.", "Keep the reference private; contact our team if you need assistance."],
      },
      {
        id: "privacy-request",
        title: "How can I ask about my personal information?",
        summary: "Contact us with a privacy-related request without including sensitive details in your first message.",
        answer: "Send our team a message describing your privacy-related question. Do not include sensitive information in your first message. We can advise on a suitable way to verify your identity and handle your request.",
        steps: ["Contact our team and select or mention a privacy-related subject.", "Describe the request without including sensitive information.", "Follow the team’s guidance for any necessary identity verification."],
      },
    ],
  },
};
type KnowledgeArticle = HelpArticle & { categoryId: string; categoryTitle: string };
const allHelpArticles: KnowledgeArticle[] = Object.entries(HELP_ARTICLES).flatMap(([categoryId, category]) =>
  category.articles.map((article) => ({ ...article, categoryId, categoryTitle: category.title })),
);

function newChatId() { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const message = value as Message;
  return typeof message.id === "number" && ["assistant", "visitor"].includes(message.sender) &&
    typeof message.text === "string" && typeof message.time === "string" &&
    (message.actions === undefined || (Array.isArray(message.actions) && message.actions.every((action) =>
      action && typeof action.label === "string" && typeof action.to === "string")));
}
function isSupportChat(value: unknown): value is SupportChat {
  if (!value || typeof value !== "object") return false;
  const chat = value as SupportChat;
  return typeof chat.id === "string" && typeof chat.updatedAt === "string" && typeof chat.ended === "boolean" &&
    Array.isArray(chat.messages) && chat.messages.every(isMessage);
}
function readChatHistory(): SupportChat[] {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(historyKey) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(isSupportChat);
  } catch { return []; }
}
function readChatSendTimes() {
  try {
    const stored: unknown = JSON.parse(window.sessionStorage.getItem(messageRateKey) ?? "[]");
    if (!Array.isArray(stored)) return [];
    const cutoff = Date.now() - GUARDRAILS.chat.messageWindowMs;
    return stored.filter((time): time is number => typeof time === "number" && Number.isFinite(time) && time > cutoff)
      .slice(-GUARDRAILS.chat.messagesPerMinute);
  } catch { return []; }
}
function relativeTime(value: string) {
  const date = new Date(value).getTime();
  if (!Number.isFinite(date)) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : new Date(value).toLocaleDateString();
}

function getReply(message: string): Pick<Message, "text" | "actions"> {
  const text = message.toLowerCase();

  if (/branch|location|address|near me|where/.test(text)) {
    return {
      text: "You can browse our branch locations and available contact details on the Branches page. If you share a city or province, our team can help you find the right location.",
      actions: [{ label: "Browse branches", to: "/branches", icon: "pin" }, { label: "Ask our team", to: "/contact" }],
    };
  }
  if (/call|phone|hotline|contact|number|talk|human|person|urgent|immediate/.test(text)) {
    return {
      text: "You can call our General Director’s mobile lines at 0917 803 8524 (Globe) or 0949 993 9220 (Smart), or send a message through our Contact page.",
      actions: [{ label: "Call 0917 803 8524", to: "tel:09178038524", icon: "phone" }, { label: "Contact us", to: "/contact" }],
    };
  }
  if (/price|cost|package|product|casket|flower|floral|keepsake/.test(text)) {
    return {
      text: "Pricing and availability depend on the options and branch. Our online examples are temporary previews, not confirmed offers. Please contact a branch to confirm current prices and what is available.",
      actions: [{ label: "View services", to: "/services" }, { label: "View products", to: "/products" }, { label: "Ask for current prices", to: "/contact" }],
    };
  }
  if (/service|arrange|funeral|chapel|memorial|help/.test(text)) {
    return {
      text: "We’re sorry your family is facing a difficult time. Our team can discuss arrangements and explain the options currently available. For immediate assistance, call 0917 803 8524 or contact your nearest branch.",
      actions: [{ label: "Call our team", to: "tel:09178038524", icon: "phone" }, { label: "Find a branch", to: "/branches", icon: "pin" }, { label: "Services", to: "/services" }],
    };
  }
  if (/track|status|reference|inquiry/.test(text)) {
    return {
      text: "To check an inquiry you’ve already sent, use the reference number from your confirmation. Keep that number private.",
      actions: [{ label: "Track an inquiry", to: "/track-inquiry" }],
    };
  }
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)\b/.test(text.trim())) {
    return {
      text: "Hello. I can help you find a branch, contact our team, or learn where to ask about services and products. What would be helpful?",
      actions: [{ label: "Find a branch", to: "/branches", icon: "pin" }, { label: "Contact our team", to: "/contact" }],
    };
  }
  return {
    text: "I’m a website assistant and can help with branches, contact details, service and product inquiries, or tracking an inquiry. For anything else, our team can help directly.",
    actions: [{ label: "Contact our team", to: "/contact" }, { label: "Browse FAQs", to: "/faq" }],
  };
}

const replyCache = new Map<string, Pick<Message, "text" | "actions">>();
function getCachedReply(message: string) {
  const key = message.trim().toLowerCase().replace(/\s+/g, " ");
  const cached = replyCache.get(key);
  if (cached) return cached;
  const reply = getReply(message);
  if (replyCache.size >= GUARDRAILS.chat.replyCacheEntries) replyCache.delete(replyCache.keys().next().value!);
  replyCache.set(key, reply);
  return reply;
}

function ActionIcon({ icon }: { icon?: ChatAction["icon"] }) {
  if (icon === "phone") return <IconPhone className="h-4 w-4" />;
  if (icon === "pin") return <IconPin className="h-4 w-4" />;
  return null;
}

export default function ChatWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [view, setView] = useState<"chat" | "history" | "help">("chat");
  const [history, setHistory] = useState<SupportChat[]>(readChatHistory);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [helpSearch, setHelpSearch] = useState("");
  const [helpPage, setHelpPage] = useState<"home" | "category" | "article">("home");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedHelpArticle, setSelectedHelpArticle] = useState<KnowledgeArticle | null>(null);
  const [consent, setConsent] = useState<"pending" | "accepted" | "declined">("pending");
  const [chatEnded, setChatEnded] = useState(false);
  const [idleWarning, setIdleWarning] = useState(false);
  const [activity, setActivity] = useState(0);
  const [sentMessageTimes, setSentMessageTimes] = useState<number[]>(readChatSendTimes);
  const [cooldownActive, setCooldownActive] = useState(() => {
    const lastSentAt = sentMessageTimes[sentMessageTimes.length - 1];
    return lastSentAt !== undefined && Date.now() - lastSentAt < GUARDRAILS.chat.cooldownMs;
  });
  const [minuteLimitActive, setMinuteLimitActive] = useState(sentMessageTimes.length >= GUARDRAILS.chat.messagesPerMinute);
  const [chatLimitMessage, setChatLimitMessage] = useState(() => minuteLimitActive ? chatMinuteLimitMessage : cooldownActive ? chatCooldownMessage : "");
  const [rating, setRating] = useState<Rating | null>(null);
  const [feedback, setFeedback] = useState("");
  const [ratingSent, setRatingSent] = useState(false);
  const [input, setInput] = useState("");
  const [replying, setReplying] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const nextId = useRef(0);
  const replyTimer = useRef<number | null>(null);
  const endOfMessages = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendLock = useRef(false);
  const sessionMessageCount = messages.filter((message, index) => message.sender === "visitor" && !(index === 0 && message.text === "Yes")).length;

  useEffect(() => {
    if (consent !== "accepted" || !activeChatId || messages.length === 0) return;
    const conversation: SupportChat = { id: activeChatId, messages, updatedAt: new Date().toISOString(), ended: chatEnded };
    setHistory((current) => [conversation, ...current.filter((item) => item.id !== activeChatId)].slice(0, 20));
  }, [consent, activeChatId, messages, chatEnded]);

  useEffect(() => {
    try { window.localStorage.setItem(historyKey, JSON.stringify(history)); }
    catch { /* Keep the current conversation usable when browser storage is unavailable. */ }
  }, [history]);

  useEffect(() => {
    if (open) endOfMessages.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open, replying]);

  useEffect(() => () => {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem(messageRateKey, JSON.stringify(sentMessageTimes)); }
    catch { /* Enforce the chat limits in memory if browser session storage is unavailable. */ }
  }, [sentMessageTimes]);

  useEffect(() => {
    if (!cooldownActive) return;
    const lastSentAt = sentMessageTimes[sentMessageTimes.length - 1];
    if (lastSentAt === undefined) { setCooldownActive(false); return; }
    const timer = window.setTimeout(
      () => {
        setCooldownActive(false);
        setChatLimitMessage((message) => message === chatCooldownMessage ? "" : message);
      },
      Math.max(1, lastSentAt + GUARDRAILS.chat.cooldownMs - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [cooldownActive, sentMessageTimes]);

  useEffect(() => {
    if (!minuteLimitActive || sentMessageTimes.length === 0) return;
    const timer = window.setTimeout(() => {
      const recent = sentMessageTimes.filter((sentAt) => Date.now() - sentAt < GUARDRAILS.chat.messageWindowMs);
      setSentMessageTimes(recent);
      setMinuteLimitActive(false);
    }, Math.max(1, sentMessageTimes[0] + GUARDRAILS.chat.messageWindowMs - Date.now()));
    return () => window.clearTimeout(timer);
  }, [minuteLimitActive, sentMessageTimes]);

  useEffect(() => {
    if (!open || consent !== "accepted" || chatEnded || idleWarning) return;
    const timer = window.setTimeout(() => {
      setIdleWarning(true);
      setMessages((current) => [...current, {
        id: nextId.current++, sender: "assistant", time: chatTime(),
        text: "I'm here whenever you're ready. You can continue this conversation at your own pace.",
      }]);
    }, 120000);
    return () => window.clearTimeout(timer);
  }, [open, consent, chatEnded, idleWarning, activity]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setClosing(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (pathname.startsWith("/admin")) return null;

  function closeChat() {
    if (open && !closing) setClosing(true);
  }

  function finishPanelAnimation(event: AnimationEvent<HTMLElement>) {
    if (event.animationName === "chat-panel-out") {
      setOpen(false);
      setClosing(false);
    }
  }

  function sendMessage(message: string) {
    const trimmed = message.trim();
    if (sendLock.current || !trimmed || chatEnded || replying) return;
    if (trimmed.length > GUARDRAILS.chat.maxInputCharacters) {
      setChatLimitMessage(`Messages can be up to ${GUARDRAILS.chat.maxInputCharacters} characters.`);
      return;
    }
    if (sessionMessageCount >= GUARDRAILS.chat.messagesPerSession) {
      setChatLimitMessage(chatSessionLimitMessage);
      return;
    }
    const now = Date.now();
    const recentMessages = sentMessageTimes.filter((sentAt) => now - sentAt < GUARDRAILS.chat.messageWindowMs);
    if (recentMessages.length >= GUARDRAILS.chat.messagesPerMinute) {
      setSentMessageTimes(recentMessages);
      setMinuteLimitActive(true);
      setChatLimitMessage(chatMinuteLimitMessage);
      return;
    }
    if (cooldownActive || minuteLimitActive) return;
    sendLock.current = true;
    const updatedSentTimes = [...recentMessages, now];
    setSentMessageTimes(updatedSentTimes);
    setCooldownActive(true);
    setChatLimitMessage(chatCooldownMessage);
    if (updatedSentTimes.length >= GUARDRAILS.chat.messagesPerMinute) {
      setMinuteLimitActive(true);
      setChatLimitMessage(chatMinuteLimitMessage);
    }
    setIdleWarning(false);
    setActivity((current) => current + 1);
    const visitorMessage: Message = { id: nextId.current++, sender: "visitor", text: trimmed, time: chatTime() };
    const reply = getCachedReply(trimmed);
    setMessages((current) => [...current, visitorMessage]);
    if (sessionMessageCount + 1 >= GUARDRAILS.chat.messagesPerSession) {
      setChatLimitMessage(chatSessionLimitMessage);
    }
    setInput("");
    setReplying(true);
    replyTimer.current = window.setTimeout(() => {
      setMessages((current) => [...current, { id: nextId.current++, sender: "assistant", time: chatTime(), ...reply }]);
      setReplying(false);
      sendLock.current = false;
      replyTimer.current = null;
    }, 850);
  }

  function acceptNotice() {
    const time = chatTime();
    setActiveChatId(newChatId());
    setConsent("accepted");
    setActivity((current) => current + 1);
    setMessages([
      { id: nextId.current++, sender: "visitor", text: "Yes", time },
      { id: nextId.current++, sender: "assistant", time, text: "Hi, I'm Cosi. Thanks for reaching out to Cosmopolitan Funeral Homes. I can help you find a branch, learn about our services, or get in touch with our team. How may I help you today?" },
    ]);
  }

  function endChat() {
    if (replying) return;
    setChatEnded(true);
    setMessages((current) => [...current, {
      id: nextId.current++, sender: "assistant", time: chatTime(),
      text: "Thanks for chatting with Cosi. We hope we were able to point you in the right direction.",
    }]);
  }

  function startNewChat() {
    if (replyTimer.current !== null) window.clearTimeout(replyTimer.current);
    replyTimer.current = null;
    sendLock.current = false;
    setReplying(false);
    setActiveChatId(newChatId());
    setChatEnded(false);
    setIdleWarning(false);
    setRating(null);
    setFeedback("");
    setRatingSent(false);
    setView("chat");
    setHelpSearch("");
    setHelpPage("home");
    setSelectedCategory(null);
    setSelectedHelpArticle(null);
    setChatLimitMessage(minuteLimitActive ? chatMinuteLimitMessage : cooldownActive ? chatCooldownMessage : "");
    setActivity((current) => current + 1);
    setMessages([{
      id: nextId.current++, sender: "assistant", time: chatTime(),
      text: "Welcome back. I'm Cosi, the Cosmopolitan Funeral Homes website assistant. What can I help you with?",
    }]);
  }

  function openSavedChat(conversation: SupportChat) {
    setActiveChatId(conversation.id);
    setMessages(conversation.messages);
    setChatEnded(conversation.ended);
    setIdleWarning(false);
    setConsent("accepted");
    setView("chat");
    setRating(null);
    setFeedback("");
    setRatingSent(false);
    const sentCount = conversation.messages.filter((message, index) => message.sender === "visitor" && !(index === 0 && message.text === "Yes")).length;
    setChatLimitMessage(sentCount >= GUARDRAILS.chat.messagesPerSession ? chatSessionLimitMessage : minuteLimitActive ? chatMinuteLimitMessage : cooldownActive ? chatCooldownMessage : "");
    setActivity((current) => current + 1);
  }

  function continueChat() {
    setChatEnded(false);
    setIdleWarning(false);
    setRating(null);
    setFeedback("");
    setRatingSent(false);
    setActivity((current) => current + 1);
  }

  function submitRating(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating) setRatingSent(true);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  function openHelpArticle(article: KnowledgeArticle) {
    setSelectedCategory(article.categoryId);
    setSelectedHelpArticle(article);
    setHelpPage("article");
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <section
          id="chat-panel"
          aria-label="Cosi website assistant"
          onAnimationEnd={finishPanelAnimation}
          className={`chat-panel mb-3 flex h-[min(36rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-2xl sm:w-[23rem] ${closing ? "is-closing" : ""}`}
        >
          <header className="chat-header flex items-center justify-between gap-2 px-4 py-3.5 text-white">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="chat-avatar" aria-hidden="true">{view === "history" ? "M" : view === "help" ? "?" : "C"}</div>
              <div className="min-w-0">
                <h2 className="font-heading text-lg font-bold leading-tight">{view === "history" ? "Messages" : view === "help" ? "Knowledge Base" : <>Cosi <span className="chat-ai-badge">AI</span></>}</h2>
                <p className="mt-1 truncate text-xs text-white/80">{view === "history" ? "Support history" : view === "help" ? "Guides, services and FAQs" : "Cosmopolitan | Ready to assist"}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {view !== "chat" && <button type="button" onClick={startNewChat} className="chat-new-button"><span aria-hidden="true">+</span> New Chat</button>}
              {view === "chat" && consent === "accepted" && <button type="button" onClick={() => setView("history")} className="chat-history-button" aria-label="View support history">Messages <span>{history.length}</span></button>}
              <button type="button" onClick={closeChat} aria-label="Close chat" className="chat-close-button rounded-full px-2 py-1 text-2xl leading-none text-white/90 transition hover:bg-white/10">×</button>
            </div>
          </header>

          {view === "history" ? (
            <div className="flex-1 overflow-y-auto bg-white" aria-label="Saved conversations">
              {history.length ? history.map((conversation) => {
                const title = [...conversation.messages].reverse().find((message) => message.sender === "visitor" && message.text !== "Yes")?.text || "Conversation with Cosi";
                return <button key={conversation.id} type="button" onClick={() => openSavedChat(conversation)} className="chat-history-row">
                  <span className="chat-history-avatar" aria-hidden="true">C</span>
                  <span className="chat-history-copy"><strong>Cosmopolitan Support</strong><span>{conversation.ended ? "Your chat has ended." : "Continue this conversation"}</span><small>{title}</small></span>
                  <time>{relativeTime(conversation.updatedAt)}</time>
                </button>;
              }) : <div className="chat-history-empty"><span className="chat-history-avatar" aria-hidden="true">C</span><h3>No messages yet</h3><p>Your Cosmopolitan support conversations will appear here.</p><button type="button" onClick={startNewChat}>Start a chat</button></div>}
            </div>
          ) : view === "help" ? (
            <div className="chat-kb flex-1 overflow-y-auto bg-white p-4">
              {helpPage === "home" ? <>
                <label className="chat-help-search"><span className="sr-only">Search help articles</span><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input type="search" value={helpSearch} onChange={(event) => setHelpSearch(event.target.value)} placeholder="Search the Knowledge Base..." /></label>
                {helpSearch.trim() ? <>
                  <h3 className="chat-help-heading">Search results</h3>
                  <div className="chat-kb-list">
                    {allHelpArticles.filter((article) => `${article.title} ${article.summary} ${article.answer} ${article.categoryTitle}`.toLowerCase().includes(helpSearch.trim().toLowerCase())).map((article) => (
                      <button key={article.id} type="button" className="chat-kb-article-link" onClick={() => openHelpArticle(article)}>
                        <span><strong>{article.title}</strong><small>{article.categoryTitle} · {article.summary}</small></span><b aria-hidden="true">→</b>
                      </button>
                    ))}
                    {!allHelpArticles.some((article) => `${article.title} ${article.summary} ${article.answer} ${article.categoryTitle}`.toLowerCase().includes(helpSearch.trim().toLowerCase())) && <p className="chat-help-empty">No matching articles. Try another search or contact our team.</p>}
                  </div>
                </> : <>
                  <section aria-labelledby="chat-kb-featured-title">
                    <h3 id="chat-kb-featured-title" className="chat-help-heading">Featured questions</h3>
                    <div className="chat-kb-list">
                      {allHelpArticles.filter((article) => article.featured).map((article) => (
                        <button key={article.id} type="button" className="chat-kb-article-link" onClick={() => openHelpArticle(article)}>
                          <span><strong>{article.title}</strong><small>{article.summary}</small></span><b aria-hidden="true">→</b>
                        </button>
                      ))}
                    </div>
                  </section>
                  <section aria-labelledby="chat-kb-categories-title">
                    <h3 id="chat-kb-categories-title" className="chat-help-heading chat-help-category-title">Browse categories</h3>
                    <div className="chat-kb-categories">
                      {Object.entries(HELP_ARTICLES).map(([categoryId, category]) => (
                        <button key={categoryId} type="button" className="chat-kb-category" onClick={() => { setSelectedCategory(categoryId); setHelpPage("category"); }}>
                          <span><strong>{category.title}</strong><small>{category.articles.length} {category.articles.length === 1 ? "article" : "articles"}</small></span><b aria-hidden="true">→</b>
                        </button>
                      ))}
                    </div>
                  </section>
                </>}
              </> : helpPage === "category" && selectedCategory && HELP_ARTICLES[selectedCategory] ? <>
                <button type="button" className="chat-kb-back" onClick={() => setHelpPage("home")}><span aria-hidden="true">←</span> Back to Help Home</button>
                <h3 className="chat-kb-title">{HELP_ARTICLES[selectedCategory].title}</h3>
                <p className="chat-kb-description">{HELP_ARTICLES[selectedCategory].description}</p>
                <div className="chat-kb-list">
                  {HELP_ARTICLES[selectedCategory].articles.map((article) => (
                    <button key={article.id} type="button" className="chat-kb-article-link" onClick={() => openHelpArticle({ ...article, categoryId: selectedCategory, categoryTitle: HELP_ARTICLES[selectedCategory].title })}>
                      <span><strong>{article.title}</strong><small>{article.summary}</small></span><b aria-hidden="true">→</b>
                    </button>
                  ))}
                </div>
              </> : selectedHelpArticle ? <>
                <button type="button" className="chat-kb-back" onClick={() => setHelpPage("category")}><span aria-hidden="true">←</span> Back to {selectedHelpArticle.categoryTitle}</button>
                <h3 className="chat-kb-title">{selectedHelpArticle.title}</h3>
                <section className="chat-kb-summary" aria-label="Summary"><strong>Summary</strong><p>{selectedHelpArticle.summary}</p></section>
                <section className="chat-kb-answer" aria-label="Answer"><h4>Answer</h4><p>{selectedHelpArticle.answer}</p></section>
                <section className="chat-kb-answer" aria-label="Step-by-step instructions"><h4>What to do</h4><ol>{selectedHelpArticle.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol></section>
                {selectedHelpArticle.videoId && <div className="chat-kb-video"><iframe src={`https://www.youtube-nocookie.com/embed/${selectedHelpArticle.videoId}`} title={`Video: ${selectedHelpArticle.title}`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>}
                <button type="button" className="chat-kb-back chat-kb-home-link" onClick={() => setHelpPage("home")}>Back to Help Home</button>
              </> : <p className="chat-help-empty">Choose a category to browse helpful articles.</p>}
            </div>
          ) : <>
          <div className="chat-message-list flex-1 space-y-3 overflow-y-auto bg-ivory/70 p-4" aria-live="polite" aria-relevant="additions">
            {consent === "pending" && (
              <div className="chat-notice">
                <h3>Important notice</h3>
                <p>To provide helpful answers, Cosi uses the messages you send. Your conversation history is saved in this browser so you can return to it. Please avoid sharing sensitive personal, financial, or medical information.</p>
                <p>By continuing, you agree to our privacy practices. You can review them at any time.</p>
                <div className="chat-notice-links">
                  <Link to="/faq" onClick={closeChat}>Browse FAQs</Link>
                  <Link to="/privacy" onClick={closeChat}>Data Privacy Policy</Link>
                </div>
                <p className="chat-notice-question">Would you like to continue?</p>
                <div className="chat-consent-actions">
                  <button type="button" onClick={acceptNotice}>Yes, continue</button>
                  <button type="button" onClick={() => setConsent("declined")}>No, thanks</button>
                </div>
              </div>
            )}
            {consent === "declined" && (
              <div className="chat-notice" role="status">
                <h3>No problem</h3>
                <p>You can still browse the website or contact our team directly whenever you need help.</p>
                <div className="chat-notice-links"><Link to="/contact" onClick={closeChat}>Contact our team</Link></div>
                <button type="button" className="chat-retry" onClick={() => setConsent("pending")}>Review notice again</button>
              </div>
            )}
            {consent === "accepted" && messages.map((message) => (
              <div key={message.id} className={`chat-message-enter flex items-end gap-2 ${message.sender === "visitor" ? "justify-end is-visitor" : "justify-start is-assistant"}`}>
                {message.sender === "assistant" && <span className="chat-message-avatar" aria-hidden="true">C</span>}
                <div className={`max-w-[88%] ${message.sender === "assistant" ? "" : "text-right"}`}>
                  {message.sender === "assistant" && <p className="mb-1 ml-1 text-[.68rem] font-semibold text-slate-500">Cosi</p>}
                  <div className={`rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.sender === "visitor" ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-brand/10 bg-white text-slate-700 shadow-sm"}`}>
                    <p className="whitespace-pre-line">{message.text}</p>
                  {!!message.actions?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        action.to.startsWith("tel:") ? (
                          <a key={action.label} href={action.to} className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-brand/5">
                            <ActionIcon icon={action.icon} />{action.label}
                          </a>
                        ) : (
                          <Link key={action.label} to={action.to} onClick={closeChat} className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-brand/5">
                            <ActionIcon icon={action.icon} />{action.label}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                  </div>
                  <p className={`mt-1 text-[.62rem] text-slate-400 ${message.sender === "visitor" ? "mr-1" : "ml-1"}`}>{message.time}</p>
                </div>
              </div>
            ))}
            {consent === "accepted" && replying && (
              <div className="chat-typing" role="status" aria-label="Cosi is typing">
                <span className="chat-message-avatar" aria-hidden="true">C</span>
                <div><p>Cosi is typing</p><span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span></div>
              </div>
            )}
            {consent === "accepted" && chatEnded && (
              <section className="chat-rating" aria-labelledby="chat-rating-title">
                {ratingSent ? (
                  <div className="chat-rating-thanks" role="status">
                    <span aria-hidden="true">&#10003;</span>
                    <h3>Thank you for your feedback</h3>
                    <p>Your response helps us improve this website assistant.</p>
                  </div>
                ) : (
                  <form onSubmit={submitRating}>
                    <h3 id="chat-rating-title">How was your chat with Cosi?</h3>
                    <div className="chat-rating-options" role="group" aria-label="Rate your chat">
                      {(["happy", "neutral", "unhappy"] as const).map((option) => (
                        <button key={option} type="button" aria-pressed={rating === option} onClick={() => setRating(option)} className={`chat-rating-choice is-${option}`}>
                          <span aria-hidden="true">{option === "happy" ? "☺" : option === "neutral" ? "😐" : "☹"}</span>
                          {option[0].toUpperCase() + option.slice(1)}
                        </button>
                      ))}
                    </div>
                    <label className="chat-feedback-label" htmlFor="chat-feedback">Optional feedback</label>
                    <textarea id="chat-feedback" value={feedback} onChange={(event) => setFeedback(event.target.value.slice(0, 350))} maxLength={350} placeholder="What could we improve?" rows={3} />
                    <div className="chat-feedback-footer"><span>{feedback.length}/350</span><button type="submit" disabled={!rating}>Send rating</button></div>
                  </form>
                )}
              </section>
            )}
            {consent === "accepted" && chatEnded && (
              <div className="chat-ended-actions">
                <strong>Your chat has ended.</strong>
                <span>Continue this conversation or start over with a new one.</span>
                <div><button type="button" onClick={continueChat}>Continue conversation</button><button type="button" onClick={startNewChat}>Start new chat</button><Link to="/contact" onClick={closeChat}>Contact our team</Link></div>
              </div>
            )}
            <div ref={endOfMessages} />
          </div>

          <form onSubmit={onSubmit} className={`chat-composer flex items-center gap-2 border-t border-brand/10 bg-white p-3 ${consent !== "accepted" || chatEnded ? "chat-input-locked" : ""}`}>
            <label htmlFor="chat-message" className="sr-only">Type your question</label>
            <input
              ref={inputRef}
              id="chat-message"
              value={input}
              onChange={(event) => { setInput(event.target.value); setActivity((current) => current + 1); }}
              placeholder="Ask Cosi..."
              disabled={consent !== "accepted" || chatEnded || sessionMessageCount >= GUARDRAILS.chat.messagesPerSession}
              maxLength={GUARDRAILS.chat.maxInputCharacters}
              className="min-w-0 flex-1 rounded-full border border-brand/20 px-4 py-2.5 text-sm"
            />
            <button type="submit" disabled={consent !== "accepted" || chatEnded || replying || cooldownActive || minuteLimitActive || sessionMessageCount >= GUARDRAILS.chat.messagesPerSession || !input.trim()} aria-label="Send message" className="chat-send rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg></button>
          </form>
          {chatLimitMessage && view === "chat" && <p role="status" className="border-t border-brand/10 bg-white px-4 py-2 text-xs leading-5 text-slate-600">{chatLimitMessage}</p>}
          {consent === "accepted" && !chatEnded && <div className="chat-footer"><p>Cosi can make mistakes. Verify important information.</p><button type="button" onClick={endChat} disabled={replying}>End chat</button></div>}
          </>}
          <nav className="chat-bottom-nav" aria-label="Chat sections">
            <button type="button" aria-current={view === "chat" ? "page" : undefined} onClick={() => setView("chat")}>Chat</button>
            <button type="button" aria-current={view === "history" ? "page" : undefined} onClick={() => setView("history")}>Messages{history.length > 0 && <span>{history.length}</span>}</button>
            <button type="button" aria-current={view === "help" ? "page" : undefined} onClick={() => setView("help")}>Help</button>
          </nav>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? "chat-panel" : undefined}
        aria-label={open ? "Close Cosi chat assistant" : "Chat with Cosi"}
          onClick={() => {
            if (open) closeChat();
            else {
              setClosing(false);
              setOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
        className="chat-launcher ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white/80 hover:bg-navy focus-visible:outline-white"
      >
        {open ? <span aria-hidden className="chat-toggle-icon text-2xl leading-none">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6 chat-toggle-icon" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>}
      </button>
    </div>
  );
}
