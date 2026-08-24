import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

type Message = { id: string; role: 'user' | 'assistant'; text: string; pinned?: boolean };
type Tab = 'Chat' | 'Create' | 'Tools' | 'History' | 'Profile';

const welcome: Message = {
  id: 'welcome',
  role: 'assistant',
  text: 'Namaste. Main Prince Jarvis hoon. Aaj aapki kya seva kar sakta hoon?',
};
const quickPrompts = ['Aaj ka plan bana do', 'Mujhe motivate karo', 'Explain in Hinglish'];
const tabs: { label: Tab; icon: keyof typeof Feather.glyphMap }[] = [
  { label: 'Chat', icon: 'message-circle' },
  { label: 'Create', icon: 'star' },
  { label: 'Tools', icon: 'grid' },
  { label: 'History', icon: 'clock' },
  { label: 'Profile', icon: 'user' },
];

function localReply(prompt: string) {
  const lower = prompt.toLowerCase();
  if (lower.includes('plan')) return 'Bilkul. Aaj ke liye 3 priorities set karte hain: focus, execution aur ek small win. Aapka sabse important kaam kya hai?';
  if (lower.includes('motivat')) return 'Aap kar sakte hain. Bas agla chhota step choose kijiye — perfect hone ka wait mat kijiye. Main yahin hoon.';
  if (lower.includes('hinglish')) return 'Of course. Main natural Hinglish mein explain kar sakta hoon — simple, clear aur bina unnecessary jargon ke.';
  return 'Samajh gaya. Main aapki madad karne ke liye tayyar hoon. Thoda aur context dijiye, aur hum isse step by step solve karenge.';
}

function Header({ colors, tab, onProfile }: { colors: ReturnType<typeof useColors>; tab: Tab; onProfile: () => void }) {
  return (
    <View style={styles.header}>
      <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
        <Feather name="command" size={20} color={colors.primaryForeground} />
      </View>
      <View style={styles.headerCopy}>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>PRINCE JARVIS</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>{tab === 'Chat' ? 'Good evening, Prince' : tab}</Text>
      </View>
      <Pressable onPress={onProfile} style={[styles.statusDot, { backgroundColor: colors.secondary }]}>
        <View style={[styles.dot, { backgroundColor: colors.accentForeground }]} />
      </Pressable>
    </View>
  );
}

function SectionTitle({ title, action, colors }: { title: string; action?: string; colors: ReturnType<typeof useColors> }) {
  return <View style={styles.sectionTitle}><Text style={[styles.sectionHeading, { color: colors.foreground }]}>{title}</Text>{action && <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>}</View>;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('Chat');
  const [messages, setMessages] = useState<Message[]>([welcome]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [voiceError, setVoiceError] = useState('');
  const [search, setSearch] = useState('');
  const [createStep, setCreateStep] = useState(0);
  const [personality, setPersonality] = useState('Royal & helpful');
  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    AsyncStorage.getItem('jarvis-chat').then((value) => {
      if (value) setMessages(JSON.parse(value) as Message[]);
    });
  }, []);
  useEffect(() => { AsyncStorage.setItem('jarvis-chat', JSON.stringify(messages)); }, [messages]);

  const pinnedMessages = useMemo(() => messages.filter((message) => message.pinned), [messages]);
  const filteredMessages = useMemo(() => messages.filter((message) => message.text.toLowerCase().includes(search.toLowerCase())), [messages, search]);

  const send = (value = input) => {
    const text = value.trim();
    if (!text || isThinking) return;
    setInput('');
    setMessages((current) => [...current, { id: `${Date.now()}-u`, role: 'user', text }]);
    setIsThinking(true);
    setTimeout(() => {
      setMessages((current) => [...current, { id: `${Date.now()}-a`, role: 'assistant', text: localReply(text) }]);
      setIsThinking(false);
    }, 650);
  };

  const togglePin = (id: string) => setMessages((current) => current.map((message) => message.id === id ? { ...message, pinned: !message.pinned } : message));

  const toggleRecording = async () => {
    setVoiceError('');
    if (recording) {
      try {
        await recording.stopAndUnloadAsync();
        if (!recording.getURI()) throw new Error('Recording URI unavailable');
        setRecording(null); setIsListening(false);
        send('Voice note captured — please help me with this.');
      } catch { setVoiceError('Could not stop the recording. Please try again.'); setIsListening(false); setRecording(null); }
      return;
    }
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) { setVoiceError('Microphone permission is needed for voice input.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const next = new Audio.Recording();
      await next.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await next.startAsync();
      setRecording(next); setIsListening(true);
    } catch { setVoiceError('Microphone is not available right now.'); setIsListening(false); }
  };

  const renderChat = () => (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.messages, { paddingBottom: 10 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.crown, { backgroundColor: colors.secondary }]}><Feather name="zap" size={18} color={colors.primary} /></View>
            <Text style={[styles.heroTitle, { color: colors.foreground }]}>Your personal AI companion.</Text>
            <Text style={[styles.heroBody, { color: colors.mutedForeground }]}>Talk naturally in Hindi, Hinglish or English. I’ll help you think, create and get things done.</Text>
            <View style={styles.promptRow}>{quickPrompts.map((prompt) => <Pressable key={prompt} onPress={() => send(prompt)} style={[styles.prompt, { backgroundColor: colors.secondary }]}><Text style={[styles.promptText, { color: colors.foreground }]}>{prompt}</Text></Pressable>)}</View>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.messageRow, item.role === 'user' && styles.userRow]}>
            {item.role === 'assistant' && <View style={[styles.avatar, { backgroundColor: colors.primary }]}><Feather name="command" size={13} color={colors.primaryForeground} /></View>}
            <View style={[styles.bubble, { backgroundColor: item.role === 'user' ? colors.primary : colors.card, borderColor: item.role === 'user' ? colors.primary : colors.border }]}>
              <Text style={[styles.messageText, { color: item.role === 'user' ? colors.primaryForeground : colors.foreground }]}>{item.text}</Text>
              {item.role === 'assistant' && <Pressable onPress={() => togglePin(item.id)} style={styles.pinButton}><Feather name={item.pinned ? 'bookmark' : 'bookmark'} size={13} color={item.pinned ? colors.primary : colors.mutedForeground} /><Text style={[styles.pinText, { color: colors.mutedForeground }]}>{item.pinned ? 'Saved' : 'Save'}</Text></Pressable>}
            </View>
          </View>
        )}
        ListFooterComponent={isThinking ? <View style={styles.thinking}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.thinkingText, { color: colors.mutedForeground }]}>Jarvis is thinking...</Text></View> : null}
      />
      {isListening && <View style={[styles.listening, { backgroundColor: colors.accent }]}><View style={[styles.pulse, { backgroundColor: colors.destructive }]} /><Text style={[styles.listeningText, { color: colors.foreground }]}>Listening… tap the mic to stop</Text></View>}
      {!!voiceError && <Text style={[styles.voiceError, { color: colors.destructive }]}>{voiceError}</Text>}
      <View style={[styles.composer, { backgroundColor: colors.card, borderColor: isListening ? colors.primary : colors.border }]}>
        <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send()} placeholder="Message Prince Jarvis..." placeholderTextColor={colors.mutedForeground} style={[styles.input, { color: colors.foreground }]} multiline maxLength={500} />
        <Pressable accessibilityLabel="Toggle voice input" onPress={toggleRecording} style={[styles.iconButton, { backgroundColor: isListening ? colors.primary : colors.secondary }]}><Feather name={isListening ? 'square' : 'mic'} size={18} color={isListening ? colors.primaryForeground : colors.foreground} /></Pressable>
        <Pressable accessibilityLabel="Send message" onPress={() => send()} style={[styles.sendButton, { backgroundColor: colors.primary }]}><Feather name="arrow-up" size={20} color={colors.primaryForeground} /></Pressable>
      </View>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>Local prototype • AI services can be connected later</Text>
    </KeyboardAvoidingView>
  );

  const renderCreate = () => {
    const steps = ['Idea', 'Script', 'Scenes', 'Image prompts', 'Voice script', 'Thumbnail', 'Caption'];
    return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      <View style={[styles.createHero, { backgroundColor: colors.primary }]}>
        <View style={styles.createHeroTop}><View style={[styles.createIcon, { backgroundColor: colors.primaryForeground }]}><Feather name="play" size={18} color={colors.primary} /></View><Text style={[styles.eyebrow, { color: colors.primaryForeground }]}>CREATOR WORKFLOW</Text></View>
        <Text style={[styles.createTitle, { color: colors.primaryForeground }]}>From idea to publish-ready.</Text>
        <Text style={[styles.createBody, { color: colors.primaryForeground }]}>One powerful flow for your next documentary, reel or video.</Text>
      </View>
      <SectionTitle title="Your creative pipeline" action={`${createStep + 1} / ${steps.length}`} colors={colors} />
      <View style={styles.stepList}>{steps.map((step, index) => <Pressable key={step} onPress={() => setCreateStep(index)} style={[styles.stepCard, { backgroundColor: index <= createStep ? colors.accent : colors.card, borderColor: index === createStep ? colors.primary : colors.border }]}><View style={[styles.stepNumber, { backgroundColor: index <= createStep ? colors.primary : colors.secondary }]}><Text style={[styles.stepNumberText, { color: index <= createStep ? colors.primaryForeground : colors.mutedForeground }]}>{index + 1}</Text></View><View style={styles.stepCopy}><Text style={[styles.stepLabel, { color: colors.foreground }]}>{step}</Text><Text style={[styles.stepHint, { color: colors.mutedForeground }]}>{index === createStep ? 'Ready to build this part' : index < createStep ? 'Completed in this prototype' : 'Unlock next step'}</Text></View><Feather name={index < createStep ? 'check' : 'chevron-right'} size={18} color={index <= createStep ? colors.primary : colors.mutedForeground} /></Pressable>)}</View>
      <Pressable onPress={() => setCreateStep(Math.min(createStep + 1, steps.length - 1))} style={[styles.primaryCta, { backgroundColor: colors.primary }]}><Feather name="star" size={17} color={colors.primaryForeground} /><Text style={[styles.primaryCtaText, { color: colors.primaryForeground }]}>{createStep === 0 ? 'Start with an idea' : `Continue to ${steps[Math.min(createStep + 1, steps.length - 1)]}`}</Text></Pressable>
      <Text style={[styles.prototypeNote, { color: colors.mutedForeground }]}>Creative generation is shown as a local UI prototype for now.</Text>
    </ScrollView>;
  };

  const renderTools = () => {
    const tools = [
      ['edit-3', 'Caption & hook', 'Turn a rough thought into scroll-stopping copy.'],
      ['file-text', 'Notes', 'Capture ideas, research and quick thoughts.'],
      ['check-square', 'To-do list', 'Keep today’s important actions in one place.'],
      ['clock', 'Reminders', 'Never lose track of the next step.'],
      ['book-open', 'Study Mode', 'Explain, quiz and create revision notes.'],
      ['code', 'Coding Mode', 'Think through bugs and build better.'],
    ] as const;
    return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}><Text style={[styles.pageIntro, { color: colors.mutedForeground }]}>Small tools for the moments between big conversations.</Text><View style={styles.toolGrid}>{tools.map(([icon, title, description]) => <Pressable key={title} onPress={() => setTab('Chat')} style={[styles.toolCard, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.toolIcon, { backgroundColor: colors.secondary }]}><Feather name={icon} size={19} color={colors.primary} /></View><Text style={[styles.toolTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.toolDescription, { color: colors.mutedForeground }]}>{description}</Text><Feather name="arrow-up-right" size={15} color={colors.mutedForeground} style={styles.toolArrow} /></Pressable>)}</View></ScrollView>;
  };

  const renderHistory = () => <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}><View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="search" size={17} color={colors.mutedForeground} /><TextInput value={search} onChangeText={setSearch} placeholder="Search your chats..." placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} /></View><SectionTitle title="Saved moments" action={`${pinnedMessages.length} saved`} colors={colors} />{pinnedMessages.length === 0 ? <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bookmark" size={24} color={colors.primary} /><Text style={[styles.emptyTitle, { color: colors.foreground }]}>Your saved chats appear here</Text><Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Tap Save on any Jarvis reply to keep it close.</Text></View> : pinnedMessages.map((message) => <View key={message.id} style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}><Feather name="bookmark" size={16} color={colors.primary} /><Text style={[styles.historyText, { color: colors.foreground }]}>{message.text}</Text></View>)}<SectionTitle title="All conversation" action={`${filteredMessages.length} messages`} colors={colors} />{filteredMessages.slice().reverse().map((message) => <View key={message.id} style={styles.historyLine}><View style={[styles.historyDot, { backgroundColor: message.role === 'assistant' ? colors.primary : colors.secondary }]} /><Text numberOfLines={2} style={[styles.historyLineText, { color: colors.mutedForeground }]}>{message.text}</Text></View>)}</ScrollView>;

  const renderProfile = () => <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}><View style={[styles.profileHero, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.profileAvatar, { backgroundColor: colors.primary }]}><Feather name="command" size={31} color={colors.primaryForeground} /></View><Text style={[styles.profileName, { color: colors.foreground }]}>Prince Jarvis</Text><Text style={[styles.profileSub, { color: colors.mutedForeground }]}>Your private local assistant</Text></View><SectionTitle title="AI personality" colors={colors} />{['Royal & helpful', 'Friendly & casual', 'Focused & concise'].map((choice) => <Pressable key={choice} onPress={() => setPersonality(choice)} style={[styles.preferenceRow, { backgroundColor: colors.card, borderColor: personality === choice ? colors.primary : colors.border }]}><View style={[styles.preferenceIcon, { backgroundColor: colors.secondary }]}><Feather name={choice === 'Royal & helpful' ? 'award' : choice === 'Friendly & casual' ? 'smile' : 'target'} size={17} color={colors.primary} /></View><Text style={[styles.preferenceText, { color: colors.foreground }]}>{choice}</Text><Feather name={personality === choice ? 'check-circle' : 'circle'} size={19} color={personality === choice ? colors.primary : colors.mutedForeground} /></Pressable>)}<SectionTitle title="Preferences" colors={colors} />{[['volume-2', 'Voice language', 'Hindi + English'], ['bookmark', 'Saved chats', `${pinnedMessages.length} important replies`], ['shield', 'Privacy', 'Stored on this device']] .map(([icon, title, value]) => <View key={title} style={[styles.preferenceRow, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.preferenceIcon, { backgroundColor: colors.secondary }]}><Feather name={icon as keyof typeof Feather.glyphMap} size={17} color={colors.primary} /></View><View style={styles.preferenceCopy}><Text style={[styles.preferenceText, { color: colors.foreground }]}>{title}</Text><Text style={[styles.preferenceValue, { color: colors.mutedForeground }]}>{value}</Text></View>{title === 'Voice language' && <Pressable onPress={() => setIsSpeaking(!isSpeaking)}><Feather name={isSpeaking ? 'pause-circle' : 'play-circle'} size={21} color={colors.primary} /></Pressable>}</View>)}</ScrollView>;

  const content = tab === 'Chat' ? renderChat() : tab === 'Create' ? renderCreate() : tab === 'Tools' ? renderTools() : tab === 'History' ? renderHistory() : renderProfile();
  return <View style={[styles.screen, { backgroundColor: colors.background, paddingTop: insets.top }]}><Header colors={colors} tab={tab} onProfile={() => setTab('Profile')} /><View style={styles.flex}>{content}</View><View style={[styles.bottomNav, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) }]}>{tabs.map((item) => <Pressable key={item.label} onPress={() => setTab(item.label)} style={styles.navItem}><View style={[styles.navIcon, { backgroundColor: tab === item.label ? colors.accent : 'transparent' }]}><Feather name={item.icon} size={19} color={tab === item.label ? colors.primary : colors.mutedForeground} /></View><Text style={[styles.navLabel, { color: tab === item.label ? colors.primary : colors.mutedForeground }]}>{item.label}</Text></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, flex: { flex: 1 }, header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, gap: 12 }, brandMark: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.7 }, title: { fontSize: 20, fontWeight: '600', marginTop: 2 }, statusDot: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, dot: { width: 8, height: 8, borderRadius: 4 },
  messages: { paddingHorizontal: 16, gap: 14 }, hero: { borderRadius: 22, borderWidth: 1, padding: 20, marginBottom: 6 }, crown: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }, heroTitle: { fontSize: 23, fontWeight: '700', letterSpacing: -0.5 }, heroBody: { fontSize: 14, lineHeight: 21, marginTop: 6, maxWidth: 300 }, promptRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 }, prompt: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 9 }, promptText: { fontSize: 12, fontWeight: '600' }, messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, maxWidth: '92%' }, userRow: { alignSelf: 'flex-end' }, avatar: { width: 26, height: 26, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, bubble: { borderRadius: 18, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, maxWidth: '100%' }, messageText: { fontSize: 15, lineHeight: 22 }, pinButton: { flexDirection: 'row', gap: 5, alignItems: 'center', marginTop: 9 }, pinText: { fontSize: 11 }, thinking: { flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 34 }, thinkingText: { fontSize: 12 }, composer: { marginHorizontal: 16, borderWidth: 1, borderRadius: 20, flexDirection: 'row', alignItems: 'flex-end', padding: 7, gap: 6 }, input: { flex: 1, minHeight: 40, maxHeight: 100, paddingHorizontal: 10, paddingTop: 10, fontSize: 15 }, iconButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, sendButton: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, disclaimer: { textAlign: 'center', fontSize: 10, paddingVertical: 8 }, listening: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 14, marginHorizontal: 16, marginBottom: 8 }, pulse: { width: 8, height: 8, borderRadius: 4 }, listeningText: { fontSize: 12, fontWeight: '600' }, voiceError: { fontSize: 12, textAlign: 'center', paddingVertical: 5 },
  bottomNav: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingHorizontal: 5 }, navItem: { flex: 1, alignItems: 'center', gap: 3 }, navIcon: { width: 38, height: 27, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, navLabel: { fontSize: 10, fontWeight: '600' }, scrollContent: { padding: 16, paddingBottom: 30 }, sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 12 }, sectionHeading: { fontSize: 17, fontWeight: '700' }, sectionAction: { fontSize: 12, fontWeight: '600' }, pageIntro: { fontSize: 15, lineHeight: 22, marginBottom: 22, maxWidth: 320 }, createHero: { borderRadius: 24, padding: 20, marginBottom: 18 }, createHeroTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 }, createIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, createTitle: { fontSize: 26, fontWeight: '700', letterSpacing: -0.8, maxWidth: 270 }, createBody: { fontSize: 14, lineHeight: 20, marginTop: 8, opacity: 0.82, maxWidth: 290 }, stepList: { gap: 9 }, stepCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 17, borderWidth: 1, padding: 12, gap: 11 }, stepNumber: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { fontWeight: '700', fontSize: 13 }, stepCopy: { flex: 1 }, stepLabel: { fontWeight: '600', fontSize: 14 }, stepHint: { fontSize: 11, marginTop: 3 }, primaryCta: { height: 51, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18 }, primaryCtaText: { fontSize: 14, fontWeight: '700' }, prototypeNote: { textAlign: 'center', fontSize: 11, marginTop: 12 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, toolCard: { width: '48%', minHeight: 166, borderRadius: 18, borderWidth: 1, padding: 14 }, toolIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 15 }, toolTitle: { fontSize: 14, fontWeight: '700' }, toolDescription: { fontSize: 11, lineHeight: 16, marginTop: 5 }, toolArrow: { position: 'absolute', right: 14, top: 16 },
  searchBox: { borderWidth: 1, borderRadius: 16, height: 48, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 9, marginBottom: 10 }, searchInput: { flex: 1, fontSize: 14 }, emptyCard: { borderWidth: 1, borderRadius: 18, padding: 24, alignItems: 'center', marginBottom: 10 }, emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 }, emptyBody: { textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 5, maxWidth: 240 }, historyCard: { borderWidth: 1, borderRadius: 17, padding: 15, flexDirection: 'row', gap: 11, marginBottom: 10 }, historyText: { flex: 1, fontSize: 14, lineHeight: 20 }, historyLine: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 10 }, historyDot: { width: 7, height: 7, borderRadius: 4 }, historyLineText: { flex: 1, fontSize: 13, lineHeight: 18 },
  profileHero: { borderWidth: 1, borderRadius: 22, alignItems: 'center', padding: 24, marginBottom: 12 }, profileAvatar: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 13 }, profileName: { fontSize: 21, fontWeight: '700' }, profileSub: { fontSize: 12, marginTop: 5 }, preferenceRow: { minHeight: 59, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', padding: 10, gap: 11, marginBottom: 9 }, preferenceIcon: { width: 37, height: 37, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, preferenceCopy: { flex: 1 }, preferenceText: { fontSize: 14, fontWeight: '600' }, preferenceValue: { fontSize: 11, marginTop: 3 },
});