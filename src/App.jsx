import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

const socket = io('https://support-desk-backend-o23k.onrender.com');

const Chat = ({ ticketId, currentUserId }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom whenever a new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 1. Fetch existing chat history from database on load/ticket change
  useEffect(() => {
    const fetchChatHistory = async () => {
      try {
        const response = await fetch(`https://support-desk-backend-o23k.onrender.com/api/messages/${ticketId}`);
        const data = await response.json();
        if (response.ok) {
          setMessages(data);
        }
      } catch (error) {
        console.error("Error fetching chat history:", error);
      }
    };

    fetchChatHistory();
  }, [ticketId]);

  // 2. Socket listeners for real-time events
  useEffect(() => {
    socket.emit('join_ticket', ticketId);

    socket.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on('display_typing', (data) => {
      if (String(data.sender) !== String(currentUserId)) {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    });

    return () => {
      socket.off('receive_message');
      socket.off('display_typing');
    };
  }, [ticketId, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle typing event emission
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    socket.emit('typing', { ticket: ticketId, sender: currentUserId });
  };

  // Send message & clear input field
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageData = {
      ticket: ticketId,
      sender: currentUserId,
      message: newMessage,
    };

    socket.emit('send_message', messageData);
    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <div className="messages-box" style={{ height: '400px', overflowY: 'auto', padding: '10px', background: '#252525', borderRadius: '8px', marginBottom: '10px' }}>
        {messages.map((msg, index) => {
          const senderId = typeof msg.sender === 'object' && msg.sender != null
            ? (msg.sender._id ? String(msg.sender._id) : String(msg.sender))
            : String(msg.sender || '');
          
          const isMe = senderId === String(currentUserId);

          return (
            <div
              key={index}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMe ? 'flex-end' : 'flex-start',
                margin: '10px 0',
              }}
            >
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: isMe ? '#007bff' : '#333',
                  color: '#fff',
                  maxWidth: '70%',
                  wordBreak: 'break-word',
                }}
              >
                <small style={{ display: 'block', fontSize: '10px', opacity: 0.8, marginBottom: '2px' }}>
                  {typeof msg.sender === 'object' && msg.sender?.name ? msg.sender.name : (isMe ? 'You' : 'Support')}
                </small>
                {msg.message || msg.text}
              </div>
              <small style={{ fontSize: '9px', opacity: 0.7, marginTop: '2px' }}>
                {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
              </small>
            </div>
          );
        })}
        {isTyping && <div style={{ fontSize: '12px', color: '#888', fontStyle: 'italic' }}>Someone is typing...</div>}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '12px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: '#fff' }}
        />
        <button type="submit" style={{ padding: '12px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          Send
        </button>
      </form>
    </div>
  );
};

export default function App() {
  const [userId, setUserId] = useState(localStorage.getItem('currentUserId') || '');
  const [ticketId, setTicketId] = useState(localStorage.getItem('ticketId') || '650123456789abcdef123456');
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('currentUserId'));

  // Handle Login / Setting IDs
  const handleLogin = (e) => {
    e.preventDefault();
    if (!userId.trim()) {
      alert('Please enter a User ID');
      return;
    }
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('ticketId', ticketId);
    setIsLoggedIn(true);
  };

  // Handle Logout / Changing IDs
  const handleLogout = () => {
    localStorage.removeItem('currentUserId');
    localStorage.removeItem('ticketId');
    setIsLoggedIn(false);
    setUserId('');
  };

  // If not logged in, show ID input form
  if (!isLoggedIn) {
    return (
      <div style={{ background: '#1a1a1a', minHeight: '100vh', color: '#fff', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <form onSubmit={handleLogin} style={{ background: '#222', padding: '30px', borderRadius: '10px', width: '350px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}>
          <h2 style={{ marginBottom: '20px', textAlign: 'center' }}>Enter Chat Details</h2>
          
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>User ID (24 chars):</label>
            <input 
              type="text" 
              value={userId} 
              onChange={(e) => setUserId(e.target.value)} 
              placeholder="e.g. 650123456789abcdef654321" 
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#1a1a1a', color: '#fff' }}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Ticket ID (24 chars):</label>
            <input 
              type="text" 
              value={ticketId} 
              onChange={(e) => setTicketId(e.target.value)} 
              placeholder="e.g. 650123456789abcdef123456" 
              style={{ width: '100%', padding: '10px', borderRadius: '5px', border: '1px solid #444', background: '#1a1a1a', color: '#fff' }}
              required
            />
          </div>

          <button type="submit" style={{ width: '100%', padding: '12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>
            Start Chat
          </button>
        </form>
      </div>
    );
  }

  // Main Chat Screen with Header and Logout button
  return (
    <div style={{ background: '#1a1a1a', minHeight: '100vh', color: '#fff' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '12px 24px', 
        borderBottom: '1px solid #333',
        background: '#222'
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Support Desk Live Chat</h3>
          <small style={{ color: '#888' }}>User ID: {userId}</small>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ 
            padding: '6px 14px', 
            backgroundColor: '#dc3545', 
            color: '#fff', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Logout / Change ID
        </button>
      </div>

      <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
        <Chat ticketId={ticketId} currentUserId={userId} />
      </div>
    </div>
  );
}