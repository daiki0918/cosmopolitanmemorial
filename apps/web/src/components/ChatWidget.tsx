import { FormEvent, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { IconPhone, IconPin } from "./Icons";

type ChatAction = { label: string; to: string; icon?: "phone" | "pin" };
type Message = { id: number; sender: "assistant" | "visitor"; text: string; actions?: ChatAction[] };

const quickQuestions = ["Find a branch", "Contact details", "Services and prices"];

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

function ActionIcon({ icon }: { icon?: ChatAction["icon"] }) {
  if (icon === "phone") return <IconPhone className="h-4 w-4" />;
  if (icon === "pin") return <IconPin className="h-4 w-4" />;
  return null;
}

export default function ChatWidget() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, sender: "assistant", text: "Hello, I’m the Cosmopolitan website assistant. I can help you find a branch or contact our team. How can I help?" },
  ]);
  const nextId = useRef(1);
  const endOfMessages = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) endOfMessages.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (pathname.startsWith("/admin") || pathname === "/login") return null;

  function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    const visitorMessage: Message = { id: nextId.current++, sender: "visitor", text: trimmed };
    const reply = getReply(trimmed);
    const assistantMessage: Message = { id: nextId.current++, sender: "assistant", ...reply };
    setMessages((current) => [...current, visitorMessage, assistantMessage]);
    setInput("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    sendMessage(input);
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {open && (
        <section
          id="chat-panel"
          aria-label="Cosmopolitan website assistant"
          className="mb-3 flex h-[min(34rem,calc(100dvh-7rem))] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-2xl sm:w-[23rem]"
        >
          <header className="flex items-start justify-between gap-3 bg-navy px-4 py-4 text-white">
            <div>
              <h2 className="font-heading text-lg font-bold">How can we help?</h2>
              <p className="mt-1 text-xs text-white/75">Cosmopolitan website assistant</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="rounded-full px-3 py-1 text-xl leading-none text-white/90 hover:bg-white/10">×</button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-ivory/70 p-4" aria-live="polite" aria-relevant="additions">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.sender === "visitor" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[90%] rounded-2xl px-3.5 py-3 text-sm leading-5 ${message.sender === "visitor" ? "rounded-br-md bg-brand text-white" : "rounded-bl-md border border-brand/10 bg-white text-slate-700 shadow-sm"}`}>
                  <p className="whitespace-pre-line">{message.text}</p>
                  {!!message.actions?.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.actions.map((action) => (
                        action.to.startsWith("tel:") ? (
                          <a key={action.label} href={action.to} className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-brand/5">
                            <ActionIcon icon={action.icon} />{action.label}
                          </a>
                        ) : (
                          <Link key={action.label} to={action.to} onClick={() => setOpen(false)} className="inline-flex items-center gap-1.5 rounded-full border border-brand/20 px-3 py-1.5 text-xs font-semibold text-navy hover:bg-brand/5">
                            <ActionIcon icon={action.icon} />{action.label}
                          </Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {quickQuestions.map((question) => (
                  <button key={question} type="button" onClick={() => sendMessage(question)} className="rounded-full border border-brand/20 bg-white px-3 py-2 text-xs font-medium text-navy hover:bg-brand/5">{question}</button>
                ))}
              </div>
            )}
            <div ref={endOfMessages} />
          </div>

          <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-brand/10 bg-white p-3">
            <label htmlFor="chat-message" className="sr-only">Type your question</label>
            <input
              ref={inputRef}
              id="chat-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Type your question..."
              maxLength={500}
              className="min-w-0 flex-1 rounded-full border border-brand/20 px-4 py-2.5 text-sm"
            />
            <button type="submit" disabled={!input.trim()} className="rounded-full bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50">Send</button>
          </form>
          <p className="border-t border-brand/5 px-4 py-2 text-center text-[.68rem] leading-4 text-slate-500">Automated guidance only. Please contact our team to confirm details and availability.</p>
        </section>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? "chat-panel" : undefined}
        aria-label={open ? "Close chat assistant" : "Open chat assistant"}
        onClick={() => {
          setOpen((current) => {
            if (!current) window.setTimeout(() => inputRef.current?.focus(), 0);
            return !current;
          });
        }}
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-lg ring-4 ring-white/80 hover:bg-navy focus-visible:outline-white"
      >
        {open ? <span aria-hidden className="text-2xl leading-none">×</span> : <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-6a7.5 7.5 0 1 1 17-3.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></svg>}
      </button>
    </div>
  );
}
