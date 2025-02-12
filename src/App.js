import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bold, Italic, Underline, Settings } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import './styles/DocumentEditor.css';

// Initialize AI providers
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const openai = process.env.REACT_APP_OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
}) : null;

const deepseekAI = process.env.REACT_APP_DEEPSEEK_API_KEY ? new OpenAI({
  baseURL: 'https://api.deepseek.com',
  apiKey: process.env.REACT_APP_DEEPSEEK_API_KEY,
  dangerouslyAllowBrowser: true
}) : null;

const DocumentEditor = () => {
  const [docContent, setDocContent] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gemini');
  const [showSettings, setShowSettings] = useState(false);
  const [editorState, setEditorState] = useState({
    fontFamily: 'Arial',
    fontSize: '11pt',
    isBold: false,
    isItalic: false,
    isUnderline: false
  });

  const editorRef = useRef(null);
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleDocChange = (e) => {
    setDocContent(e.target.value);
  };

  const applyStyle = (style) => {
    const editor = editorRef.current;
    if (!editor) return;

    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selectedText = docContent.substring(start, end);

    if (start === end) return; // No text selected

    // Toggle style state
    switch (style) {
      case 'bold':
        setEditorState(prev => ({ ...prev, isBold: !prev.isBold }));
        editor.style.fontWeight = editorState.isBold ? 'normal' : 'bold';
        break;
      case 'italic':
        setEditorState(prev => ({ ...prev, isItalic: !prev.isItalic }));
        editor.style.fontStyle = editorState.isItalic ? 'normal' : 'italic';
        break;
      case 'underline':
        setEditorState(prev => ({ ...prev, isUnderline: !prev.isUnderline }));
        editor.style.textDecoration = editorState.isUnderline ? 'none' : 'underline';
        break;
      default:
        break;
    }

    // Keep the selection after applying style
    editor.setSelectionRange(start, end);
    editor.focus();
  };

  const handleFontChange = (e) => {
    setEditorState(prev => ({ ...prev, fontFamily: e.target.value }));
    if (editorRef.current) {
      editorRef.current.style.fontFamily = e.target.value;
    }
  };

  const handleFontSizeChange = (e) => {
    setEditorState(prev => ({ ...prev, fontSize: e.target.value }));
    if (editorRef.current) {
      editorRef.current.style.fontSize = e.target.value;
    }
  };

  const generateGeminiResponse = async (prompt) => {
    const response = await geminiModel.generateContent(prompt);
    return response.response.text();
  };

  const generateOpenAIResponse = async (prompt) => {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-0125-preview",
      messages: [
        {"role": "system", "content": "You are a helpful assistant analyzing documents and providing feedback."},
        {"role": "user", "content": prompt}
      ]
    });
    return completion.choices[0].message.content;
  };

  const generateDeepseekResponse = async (prompt) => {
    const completion = await deepseekAI.chat.completions.create({
      messages: [
        {"role": "system", "content": "You are a helpful assistant analyzing documents and providing feedback."},
        {"role": "user", "content": prompt}
      ],
      model: "deepseek-chat",
    });
    return completion.choices[0].message.content;
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    const userMessage = { role: 'user', content: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    setIsLoading(true);
    try {
      const prompt = `Document Content: ${docContent}\n\nUser Query: ${chatMessage}`;
      let responseText;

      switch (selectedModel) {
        case 'openai':
          if (!openai) throw new Error('OpenAI API key not configured');
          responseText = await generateOpenAIResponse(prompt);
          break;
        case 'deepseek':
          if (!deepseekAI) throw new Error('Deepseek API key not configured');
          responseText = await generateDeepseekResponse(prompt);
          break;
        default:
          responseText = await generateGeminiResponse(prompt);
      }
      
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: responseText 
      }]);
    } catch (error) {
      console.error('Error:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: `Error: ${error.message || 'Something went wrong. Please try again.'}` 
      }]);
    }
    setIsLoading(false);
    setChatMessage('');
  };

  return (
    <div className="app-container">
      <div className="main-content">
        <div className="editor-section">
          {/* Toolbar */}
          <div className="docs-toolbar">
            <div className="toolbar-group">
              <select 
                className="toolbar-select font-select"
                value={editorState.fontFamily}
                onChange={handleFontChange}
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
              </select>
              <select 
                className="toolbar-select size-select"
                value={editorState.fontSize}
                onChange={handleFontSizeChange}
              >
                <option value="11pt">11</option>
                <option value="12pt">12</option>
                <option value="14pt">14</option>
                <option value="16pt">16</option>
                <option value="18pt">18</option>
              </select>
            </div>

            <div className="toolbar-group">
              <button 
                className={`toolbar-button ${editorState.isBold ? 'active' : ''}`}
                onClick={() => applyStyle('bold')}
                title="Bold"
              >
                <Bold size={18} />
              </button>
              <button 
                className={`toolbar-button ${editorState.isItalic ? 'active' : ''}`}
                onClick={() => applyStyle('italic')}
                title="Italic"
              >
                <Italic size={18} />
              </button>
              <button 
                className={`toolbar-button ${editorState.isUnderline ? 'active' : ''}`}
                onClick={() => applyStyle('underline')}
                title="Underline"
              >
                <Underline size={18} />
              </button>
            </div>
          </div>

          {/* Document Area */}
          <div className="docs-page">
            <div className="docs-paper">
              <textarea
                ref={editorRef}
                className="docs-content"
                value={docContent}
                onChange={handleDocChange}
                placeholder="Start typing your document here..."
                style={{
                  fontFamily: editorState.fontFamily,
                  fontSize: editorState.fontSize
                }}
              />
            </div>
          </div>
        </div>

        {/* AI Assistant Panel */}
        <div className="ai-assistant-panel">
          <div className="assistant-header">
            <div className="assistant-title">
              <h2>AI Assistant</h2>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="settings-button"
              title="AI Settings"
            >
              <Settings size={20} />
            </button>
          </div>

          {showSettings && (
            <div className="ai-settings-panel">
              <h3>Select AI Model</h3>
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="model-select"
              >
                <option value="gemini">Google Gemini</option>
                {openai && <option value="openai">OpenAI GPT-4</option>}
                {deepseekAI && <option value="deepseek">Deepseek</option>}
              </select>
            </div>
          )}

          <div ref={chatContainerRef} className="chat-messages">
            {chatHistory.length === 0 ? (
              <div className="empty-state">
                <p>Ask me anything about your document.</p>
              </div>
            ) : (
              chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`message ${
                    msg.role === 'user' ? 'message-user' : 'message-assistant'
                  }`}
                >
                  {msg.content}
                </div>
              ))
            )}
            {isLoading && (
              <div className="loading-indicator">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>AI is thinking...</span>
              </div>
            )}
          </div>

          <form onSubmit={handleChatSubmit} className="chat-input-container">
            <div className="input-wrapper">
              <input
                type="text"
                className="chat-input"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about your document..."
              />
              <button
                type="submit"
                disabled={isLoading}
                className="send-button"
                title="Send Message"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DocumentEditor;