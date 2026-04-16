import { useState, useEffect, useRef, useContext } from 'react';
import api from '../api/axios';
import { AuthContext } from '../context/AuthContext';
import { SocketContext } from '../context/SocketContext';
import { Send } from 'lucide-react';

function EventChat({ eventId }) {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(SocketContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await api.get(`/events/${eventId}/chat`);
        setMessages(res.data.messages);
      } catch (err) {
        console.error('Failed to load chat:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [eventId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Socket.IO: join room & listen for messages
  useEffect(() => {
    if (socket) {
      socket.emit('join-event', eventId);
      socket.on('chat-message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      return () => {
        socket.emit('leave-event', eventId);
        socket.off('chat-message');
      };
    }
  }, [socket, eventId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await api.post(`/events/${eventId}/chat`, { content: newMessage.trim() });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="chat-container glass">
        <div className="chat-messages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Loading chat...
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container glass">
      <div className="chat-messages">
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '3rem', fontSize: '0.9rem' }}>
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.user_id === user.id;
          const isAdmin = msg.sender_role === 'organizer' || msg.sender_role === 'admin';
          return (
            <div
              key={msg.id}
              className={`chat-bubble ${isMine ? 'sent' : 'received'} ${isAdmin && !isMine ? 'admin-msg' : ''}`}
            >
              {!isMine && (
                <div className="sender-name">
                  {msg.sender_name} {isAdmin && '⭐'}
                </div>
              )}
              <div>{msg.content}</div>
              <div className="message-time">{formatTime(msg.created_at)}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}

export default EventChat;
