import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Send, Search, User, Phone, Video,
  Paperclip, Smile, MoreVertical, Archive, Star,
  Clock, CheckCircle, AlertCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
  type: 'text' | 'image' | 'file';
  read: boolean;
}

interface Conversation {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  status: 'online' | 'offline' | 'away';
  messages: Message[];
}

function MessagesPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);

  useEffect(() => {
    // Load conversations from real patient data
    const loadConversations = () => {
      const allBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
      const registeredUsers = JSON.parse(localStorage.getItem('mindcare_registered_users') || '[]');
      
      // Get patients who have appointments with this therapist
      const therapistBookings = allBookings.filter((booking: any) => 
        booking.therapistName === user?.name || booking.therapistId === user?.id
      );
      
      // Create conversations from unique patients
      const patientMap = new Map();
      
      therapistBookings.forEach((booking: any) => {
        const patientId = booking.patientId;
        const patientUser = registeredUsers.find((u: any) => u.id === patientId);
        
        if (!patientMap.has(patientId)) {
          // Get the most recent booking for last message context
          const patientBookings = therapistBookings.filter((b: any) => b.patientId === patientId);
          const latestBooking = patientBookings.sort((a: any, b: any) => 
            new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
          )[0];
          
          // Generate realistic last message based on appointment status
          let lastMessage = 'Looking forward to our session.';
          let unreadCount = 0;
          
          if (latestBooking.status === 'completed') {
            lastMessage = 'Thank you for the session today. I feel much better.';
          } else if (latestBooking.status === 'pending_confirmation') {
            lastMessage = 'I just booked an appointment. Can you confirm the time?';
            unreadCount = 1;
          } else if (latestBooking.status === 'confirmed') {
            lastMessage = 'See you at our scheduled appointment.';
          }
          
          // Determine online status based on recent activity
          const timeSinceBooking = new Date().getTime() - new Date(latestBooking.createdAt || latestBooking.date).getTime();
          const hoursAgo = timeSinceBooking / (1000 * 60 * 60);
          let status: 'online' | 'offline' | 'away' = 'offline';
          
          if (hoursAgo < 2) status = 'online';
          else if (hoursAgo < 24) status = 'away';
          
          // Create sample messages based on appointment history
          const messages: Message[] = [
            {
              id: `m_${patientId}_1`,
              senderId: patientId,
              senderName: booking.patientName,
              content: `Hi ${user?.name}, I wanted to follow up on our session.`,
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
              type: 'text',
              read: true
            },
            {
              id: `m_${patientId}_2`,
              senderId: user?.id || 'therapist',
              senderName: user?.name || 'Therapist',
              content: `Hello ${booking.patientName}! I'm glad you reached out. How are you feeling today?`,
              timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
              type: 'text',
              read: true
            },
            {
              id: `m_${patientId}_3`,
              senderId: patientId,
              senderName: booking.patientName,
              content: lastMessage,
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
              type: 'text',
              read: unreadCount === 0
            }
          ];
          
          const conversation: Conversation = {
            id: patientId,
            patientId,
            patientName: booking.patientName,
            patientEmail: booking.patientEmail || patientUser?.email || 'patient@example.com',
            lastMessage,
            lastMessageTime: new Date(Date.now() - 2 * 60 * 60 * 1000),
            unreadCount,
            status,
            messages
          };
          
          patientMap.set(patientId, conversation);
        }
      });
      
      setConversations(Array.from(patientMap.values()));
    };

    loadConversations();
    
    // Set up interval to refresh conversations
    const interval = setInterval(loadConversations, 10000);
    
    // Listen for storage changes
    const handleStorageChange = () => {
      loadConversations();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('mindcare-data-updated', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('mindcare-data-updated', handleStorageChange);
    };
  }, [user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const selectedConv = conversations.find(c => c.id === selectedConversation);

  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedConversation) return;
    
    // In a real app, this would send the message via API
    setMessageText('');
  };

  const filteredConversations = conversations.filter(conv =>
    conv.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={`h-screen flex ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50'
    }`}>
      {/* Conversations List */}
      <div className={`w-80 border-r ${
        theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      } flex flex-col`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className={`text-xl font-bold mb-3 ${
            theme === 'dark' ? 'text-white' : 'text-gray-800'
          }`}>
            Messages
          </h1>
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                theme === 'dark'
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto">
          {filteredConversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              whileHover={{ backgroundColor: theme === 'dark' ? '#374151' : '#F9FAFB' }}
              onClick={() => setSelectedConversation(conversation.id)}
              className={`p-4 border-b cursor-pointer transition-colors ${
                selectedConversation === conversation.id
                  ? theme === 'dark' ? 'bg-gray-700' : 'bg-purple-50'
                  : ''
              } ${theme === 'dark' ? 'border-gray-700' : 'border-gray-100'}`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-purple-600" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 ${
                    theme === 'dark' ? 'border-gray-800' : 'border-white'
                  } ${getStatusColor(conversation.status)}`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className={`font-semibold truncate ${
                      theme === 'dark' ? 'text-white' : 'text-gray-800'
                    }`}>
                      {conversation.patientName}
                    </h3>
                    <span className={`text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      {formatTime(conversation.lastMessageTime)}
                    </span>
                  </div>
                  <p className={`text-sm truncate ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {conversation.lastMessage}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <span></span>
                      <span className="bg-purple-500 text-white text-xs rounded-full px-2 py-1">
                        {conversation.unreadCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Chat Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 ${
                    theme === 'dark' ? 'border-gray-800' : 'border-white'
                  } ${getStatusColor(selectedConv.status)}`}></div>
                </div>
                <div>
                  <h2 className={`font-semibold ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {selectedConv.patientName}
                  </h2>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {selectedConv.status}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Phone className="w-5 h-5" />
                </button>
                <button className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Video className="w-5 h-5" />
                </button>
                <button className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-4 space-y-4 ${
              theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
            }`}>
              {selectedConv.messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${
                    message.senderId === user?.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl ${
                    message.senderId === user?.id
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                      : theme === 'dark'
                      ? 'bg-gray-700 text-gray-200'
                      : 'bg-white text-gray-800'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <div className={`flex items-center justify-between mt-1 ${
                      message.senderId === user?.id ? 'text-purple-100' : 'text-gray-500'
                    }`}>
                      <span className="text-xs">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {message.senderId === user?.id && (
                        <CheckCircle className="w-3 h-3" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Message Input */}
            <div className={`p-4 border-t ${
              theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center space-x-3">
                <button className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Paperclip className="w-5 h-5" />
                </button>
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className={`w-full px-4 py-3 rounded-xl border ${
                      theme === 'dark'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                  />
                  <button className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    <Smile className="w-5 h-5" />
                  </button>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:from-purple-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  <Send className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </>
        ) : (
          <div className={`flex-1 flex items-center justify-center ${
            theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="text-center">
              <MessageSquare className={`w-16 h-16 mx-auto mb-4 ${
                theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <h3 className={`text-lg font-semibold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Select a conversation
              </h3>
              <p className={`${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Choose a patient from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MessagesPage;