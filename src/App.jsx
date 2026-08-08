import { useEffect, useMemo, useState } from 'react';
import { ArrowUp, Bot, ChevronDown, CirclePlus, Cpu, Download, MessageSquare, RefreshCw, Sparkles, SquarePen } from 'lucide-react';

const starters = [
  { title: 'Explain a concept', prompt: 'Explain how local language models work in clear, beginner-friendly terms.' },
  { title: 'Plan a project', prompt: 'Help me plan a small app I can build this weekend.' },
  { title: 'Think with me', prompt: 'Help me explore an idea step by step and ask thoughtful questions.' },
];

const nexusApi = window.nexus ?? {
  models: async () => ({ connected: false, models: [] }),
  chat: async () => { throw new Error('A local model connection is unavailable in this preview.'); },
  setup: async () => { throw new Error('Automatic setup is available in the Nexus Forge desktop app.'); },
  onSetupProgress: () => () => {},
};

function modelLabel(model) {
  return model.name?.replace(/:latest$/, '') || 'Local model';
}

export default function App() {
  const [connection, setConnection] = useState({ connected: false, models: [] });
  const [selectedModel, setSelectedModel] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showModels, setShowModels] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

  const activeModel = useMemo(
    () => connection.models.find((model) => model.name === selectedModel),
    [connection.models, selectedModel],
  );

  async function refreshModels() {
    const result = await nexusApi.models();
    setConnection(result);
    setSelectedModel((current) => current || result.models[0]?.name || '');
  }

  useEffect(() => { refreshModels(); }, []);
  useEffect(() => nexusApi.onSetupProgress(setSetupMessage), []);

  async function setUpDefaultModel() {
    setIsSettingUp(true);
    setSetupMessage('Preparing your local workspace...');
    try {
      const result = await nexusApi.setup();
      setConnection(result);
      setSelectedModel(result.defaultModel || result.models[0]?.name || '');
    } catch (error) {
      setSetupMessage(error.message);
    } finally {
      setIsSettingUp(false);
    }
  }

  async function sendMessage(text = draft) {
    const prompt = text.trim();
    if (!prompt || isSending) return;
    const nextMessages = [...messages, { role: 'user', content: prompt }];
    setMessages(nextMessages);
    setDraft('');
    setIsSending(true);
    try {
      const reply = await nexusApi.chat({ model: selectedModel, messages: nextMessages });
      setMessages((current) => [...current, { role: 'assistant', content: reply.content }]);
    } catch (error) {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: connection.connected
          ? `I couldn’t reach the selected model. ${error.message}`
          : 'Nexus Forge is ready, but no local model server is running yet. Install Ollama, download a model, then press the refresh button here.',
        isNotice: true,
      }]);
    } finally { setIsSending(false); }
  }

  function newChat() { setMessages([]); setDraft(''); }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><Sparkles size={15} /></span><span>Nexus Forge</span></div>
        <button className="new-chat" onClick={newChat}><SquarePen size={16} />New conversation</button>
        <div className="sidebar-section"><p>CONVERSATIONS</p><button className="conversation active"><MessageSquare size={15} />Untitled session</button></div>
        <div className="sidebar-footer"><div className={`status-dot ${connection.connected ? 'online' : ''}`} /><div><strong>{connection.connected ? 'Local engine online' : 'Local engine offline'}</strong><span>{connection.connected ? `${connection.models.length} model${connection.models.length === 1 ? '' : 's'} available` : 'Waiting for Ollama'}</span></div></div>
      </aside>

      <section className="chat-area">
        <header className="topbar"><div><h1>{messages.length ? 'Conversation' : 'A private space to think.'}</h1><p>{connection.connected ? 'Your conversations stay between you and your machine.' : 'Connect a local model whenever you are ready.'}</p></div><button className="icon-button" title="Refresh local models" onClick={refreshModels}><RefreshCw size={17} /></button></header>

        <div className={`conversation-view ${messages.length ? 'has-messages' : ''}`}>
          {messages.length === 0 ? <>
            <div className="welcome"><div className="welcome-icon"><Bot size={28} /></div><h2>Start a local conversation</h2><p>{connection.connected && connection.models.length ? 'Choose a model below, then send it something worth thinking about.' : 'Set up Qwen3 once and Nexus Forge handles the rest locally.'}</p>{(!connection.connected || !connection.models.length) && <button className="setup-button" onClick={setUpDefaultModel} disabled={isSettingUp}><Download size={16} />{isSettingUp ? setupMessage || 'Setting up...' : 'Set up Qwen3 14B'}</button>}{setupMessage && <p className="setup-note">{setupMessage}</p>}</div>
            <div className="starter-grid">{starters.map((starter) => <button key={starter.title} onClick={() => sendMessage(starter.prompt)}><CirclePlus size={17} /><span><strong>{starter.title}</strong><small>{starter.prompt}</small></span></button>)}</div>
          </> : <div className="messages">{messages.map((message, index) => <article key={index} className={`message ${message.role} ${message.isNotice ? 'notice' : ''}`}><div className="message-avatar">{message.role === 'user' ? 'DN' : <Bot size={16} />}</div><div className="message-content">{message.content}</div></article>)}{isSending && <article className="message assistant"><div className="message-avatar"><Bot size={16} /></div><div className="typing"><i /><i /><i /></div></article>}</div>}
        </div>

        <div className="composer-wrap">
          <div className="model-picker"><button onClick={() => setShowModels(!showModels)}><Cpu size={15} /><span>{activeModel ? modelLabel(activeModel) : 'Local model · disconnected'}</span><ChevronDown size={15} /></button>{showModels && <div className="model-menu">{connection.models.length ? connection.models.map((model) => <button key={model.name} onClick={() => { setSelectedModel(model.name); setShowModels(false); }}>{modelLabel(model)}</button>) : <span>No Ollama models found</span>}</div>}</div>
          <div className="composer"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendMessage(); } }} placeholder="Message your local model..." rows="1" /><button className="send" onClick={() => sendMessage()} disabled={!draft.trim() || isSending}><ArrowUp size={18} /></button></div>
          <p className="hint">Enter to send · Shift + Enter for a new line</p>
        </div>
      </section>
    </main>
  );
}
