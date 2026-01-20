import { View, StyleSheet } from 'react-native';
import { ChatUI } from '../components/ChatUI';
import { generateAPIUrl } from '../utils';

export default function ChatScreen() {
  return (
    <View style={styles.container}>
      <ChatUI
        api={generateAPIUrl('/api/chat')}
        welcomeMessage="Hello there!"
        welcomeSubtitle="How can I help you today?"
        modelName="Claude Haiku"
        placeholder="Send a message..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
});
