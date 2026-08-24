import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Message = { id: string; role: 'user' | 'assistant'; text: string };

const welcome: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Namaste. Main Prince Jarvis hoon. Aaj aapki kya seva kar sakta hoon?',
};

const quickPrompts = ['Aaj ka plan bana do', 'Mujhe motivate karo', 'Explain in Hinglish'];

function localReply(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes('plan')) return 'Bilkul. Pehle ek priority choose kijiye, phir main aapke liye simple 3-step plan banaunga. Aapka sabse important kaam kya hai?';
  if (lower.includes('motivat')) return 'Aap kar sakte hain. Bas agla chhota step choose kijiye — perfect hone ka wait mat kijiye. Main yahin hoon.';
  if (lower.includes('hinglish')) return 'Of course. Main natural Hinglish mein explain kar sakta hoon — simple, clear aur bina unnecessary jargon ke.';
  return 'Samajh gaya. Main aapki madad karne ke liye tayyar hoon. Thoda aur context dijiye, aur hum isse step by step solve karenge.';
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    AsyncStorage.getItem('jarvis-chat').then((value) => {
      if (value) setMessages(JSON.parse(value) as Message[]);
    });
  }, []);

  useEffect(() => {
    AsyncStorage.setItem('jarvis-chat', JSON.stringify(messages));
  }, [messages]);

  const send = (value = input) => {
    const text = value.trim();
    if (!text || isThinking) return;
    const userMessage: Message = { id: `${Date.now()}-u`, role: 'user', text };
    setInput('');
    setMessages((current) => [...current, userMessage]);
    setIsThinking(true);
    setTimeout(() => {
      setMessages((current) => [...current, { id: `${Date.now()}-a`, role: 'assistant', text: localReply(text) }]);
      setIsThinking(false);
    }, 700);
  };

  const toggleRecording = async () => {
    setVoiceError('');
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        const uri = recording.getURI();
        setRecording(null);
        setIsListening(false);
        if (!uri) throw new Error('Recording URI unavailable');
        setIsThinking(true);
        const audioResponse = await fetch(uri);
        const audioBlob = await audioResponse.blob();
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(String(reader.result).split(',')[1] ?? '');
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });
        const transcriptionResponse = await fetch(`${process.env.EXPO_PUBLIC_DOMAIN ? `https://${process.env.EXPO_PUBLIC_DOMAIN}` : ''}/api/assistant/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audio: base64 }),
        });
        if (!transcriptionResponse.ok) throw new Error('Transcription failed');
        const transcription = await transcriptionResponse.json() as { text?: string };
        if (transcription.text) send(transcription.text);
      } catch {
        setVoiceError('Could not stop the recording. Please try again.');
        setIsThinking(false);
      }
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setVoiceError('Microphone permission is needed for voice input.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const nextRecording = new Audio.Recording();
      await nextRecording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await nextRecording.startAsync();
      setRecording(nextRecording);
      setIsListening(true);
    } catch {
      setVoiceError('Voice input is not available right now.');
      setRecording(null);
      setIsListening(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
    >
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.brandMark}><Feather name="command" size={20} color={colors.primaryForeground} /></View>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>PRINCE JARVIS</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Good evening, Prince</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: colors.accent }]}><View style={[styles.dot, { backgroundColor: colors.primary }]} /></View>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messages}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.crown}><Feather name="award" size={24} color={colors.primary} /></View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Your digital right hand.</Text>
            <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>Ask anything. Speak naturally in Hindi, Hinglish, or English.</Text>
            <View style={styles.promptRow}>{quickPrompts.map((prompt) => <Pressable key={prompt} onPress={() => send(prompt)} style={[styles.prompt, { backgroundColor: colors.secondary }]}><Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text></Pressable>)}</View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === 'user' && styles.userRow]}>
            {item.role === 'assistant' && <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Feather name="command" size={14} color={colors.primaryForeground} /></View>}
            <View style={[styles.bubble, { backgroundColor: item.role === 'user' ? colors.primary : colors.card, borderColor: item.role === 'user' ? colors.primary : colors.border }]}>
              <Text style={[styles.messageText, { color: item.role === 'user' ? colors.primaryForeground : colors.foreground }]}>{item.text}</Text>
            </View>
          </View>
        )}
        ListFooterComponent={isThinking ? <View style={styles.thinking}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Jarvis is thinking...</Text></View> : null}
      />

      <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, 12), backgroundColor: colors.background }]}>
        {isListening && <View style={[styles.listening, { backgroundColor: colors.accent }]}><View style={[styles.pulse, { backgroundColor: colors.primary }]} /><Text style={[styles.listeningText, { color: colors.foreground }]}>Recording... tap the mic when you’re done</Text></View>}
        {!!voiceError && <Text style={[styles.voiceError, { color: colors.destructive }]}>{voiceError}</Text>}
        <View style={[styles.composer, { backgroundColor: colors.card, borderColor: isListening ? colors.primary : colors.border }]}>
          <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send()} placeholder="Ask Prince Jarvis anything..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} multiline maxLength={500} />
          <Pressable accessibilityLabel={isListening ? 'Stop voice recording' : 'Start voice recording'} testID="voice-button" onPress={toggleRecording} style={[styles.iconButton, { backgroundColor: isListening ? colors.primary : colors.secondary }]}><Feather name={isListening ? 'square' : 'mic'} size={18} color={isListening ? colors.primaryForeground : colors.foreground} /></Pressable>
          <Pressable accessibilityLabel="Send message" testID="send-button" onPress={() => send()} style={[styles.sendButton, { backgroundColor: colors.primary }]}><Feather name="arrow-up" size={20} color={colors.primaryForeground} /></Pressable>
        </View>
        <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Jarvis can make mistakes. Check important information.</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, gap: 12 },
  brandMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D6A84C' },
  headerCopy: { flex: 1 },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7 },
  title: { fontSize: 20, fontWeight: '600', marginTop: 2 },
  statusDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  messages: { paddingHorizontal: 16, paddingBottom: 12, gap: 14 },
  hero: { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 6 },
  crown: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#24324A', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5 },
  heroBody: { fontSize: 14, lineHeight: 21, marginTop: 6, maxWidth: 290 },
  promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  prompt: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 },
  promptText: { fontSize: 12, fontWeight: '600' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '92%' },
  userRow: { alignSelf: 'flex-end' },
  avatar: { width: 26, height: 26, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  bubble: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
  messageText: { fontSize: 15, lineHeight: 22 },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 34 },
  thinkingText: { fontSize: 12 },
  composerWrap: { paddingHorizontal: 16, paddingTop: 8 },
  composer: { borderWidth: 1, borderRadius: 20, flexDirection: 'row', alignItems: 'flex-end', padding: 7, gap: 6 },
  input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 10, paddingTop: 10, fontSize: 15 },
  iconButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  sendButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { textAlign: 'center', fontSize: 10, paddingTop: 8 },
  listening: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, marginBottom: 8 },
  pulse: { width: 8, height: 8, borderRadius: 4 },
  listeningText: { fontSize: 12, fontWeight: '600' },
  voiceError: { fontSize: 12, textAlign: 'center', paddingVertical: 5 },
});