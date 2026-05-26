import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { intelligenceApi } from '../api/endpoints';
import { Colors, Typography, Spacing, Radius, Shadow } from '../theme';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'What do my latest blood test results mean?',
  'Am I at risk for diabetes based on my reports?',
  'Which medicines did I take last month?',
  'Show me my hemoglobin trend',
  'What should I discuss with my doctor next visit?',
];

const DISCLAIMER = '⚕️ AI responses are informational only. Always consult a qualified doctor for medical decisions.';

export function ChatScreen() {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0', role: 'assistant', timestamp: new Date(),
      content: `Hello! I'm your HealthWeave AI assistant. I have access to all your health records and can help you understand your medical history, explain test results, or identify patterns.\n\nWhat would you like to know about your health?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const listRef = useRef<FlatList>(null);

  const send = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = {
      id: Date.now().toString(), role: 'user',
      content: text.trim(), timestamp: new Date(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const { data } = await intelligenceApi.chat(text.trim(), sessionId);
      if (data.session_id) setSessionId(data.session_id);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.response || data.message || 'I could not process that. Please try again.',
        timestamp: new Date(),
      };
      setMessages((m) => [...m, aiMsg]);
    } catch {
      setMessages((m) => [...m, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [loading, sessionId]);

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Text style={{ fontSize: 16 }}>🧬</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.aiText]}>
            {item.content}
          </Text>
          <Text style={[styles.timestamp, isUser ? { color: 'rgba(255,255,255,0.6)' } : {}]}>
            {item.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAvatar}><Text style={{ fontSize: 20 }}>🧬</Text></View>
          <View>
            <Text style={styles.headerTitle}>HealthWeave AI</Text>
            <Text style={styles.headerSub}>Powered by Claude · Knows your history</Text>
          </View>
        </View>
        <View style={styles.onlineDot} />
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimerBar}>
        <Ionicons name="information-circle-outline" size={13} color={Colors.primary} />
        <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListFooterComponent={
          loading ? (
            <View style={styles.typingRow}>
              <View style={styles.aiAvatar}><Text style={{ fontSize: 16 }}>🧬</Text></View>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.typingText}>Analysing your records…</Text>
              </View>
            </View>
          ) : null
        }
      />

      {/* Suggestions (when empty input) */}
      {messages.length <= 1 && !loading && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestLabel}>Try asking:</Text>
          <View style={styles.suggestChips}>
            {SUGGESTIONS.slice(0, 3).map((s, i) => (
              <TouchableOpacity key={i} style={styles.chip} onPress={() => send(s)} activeOpacity={0.75}>
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Input */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.textInput}
          placeholder="Ask about your health…"
          placeholderTextColor={Colors.textTertiary}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || loading}
          activeOpacity={0.8}
        >
          <Ionicons name="send" size={18} color={input.trim() && !loading ? '#fff' : Colors.textTertiary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.base, paddingBottom: Spacing.base,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: Typography.base, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: Typography.xs, color: Colors.textTertiary },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },

  disclaimerBar: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing.base, paddingVertical: 8,
  },
  disclaimerText: { fontSize: 11, color: Colors.primary, flex: 1, lineHeight: 16 },

  messageList: { padding: Spacing.base, gap: 12, paddingBottom: 16 },

  msgRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '90%' },
  msgRowUser: { alignSelf: 'flex-end', flexDirection: 'row-reverse' },

  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  bubble: { maxWidth: '85%', borderRadius: 18, padding: 12 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  aiBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, ...Shadow.sm },
  bubbleText: { fontSize: Typography.sm, lineHeight: 20 },
  userText: { color: '#fff' },
  aiText: { color: Colors.text },
  timestamp: { fontSize: 10, color: Colors.textTertiary, marginTop: 4, alignSelf: 'flex-end' },

  typingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surface, borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 12, ...Shadow.sm,
  },
  typingText: { fontSize: Typography.xs, color: Colors.textSecondary },

  suggestions: { paddingHorizontal: Spacing.base, paddingBottom: Spacing.sm },
  suggestLabel: { fontSize: Typography.xs, color: Colors.textTertiary, marginBottom: 8, fontWeight: '600' },
  suggestChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: Colors.primaryLight, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 7,
    borderWidth: 1, borderColor: 'rgba(0,102,255,0.2)',
  },
  chipText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: '600' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 10,
    paddingHorizontal: Spacing.base, paddingTop: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1, borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1, backgroundColor: Colors.bg, borderRadius: Radius.lg,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing.base, paddingVertical: 10,
    fontSize: Typography.base, color: Colors.text,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.borderLight },
});
