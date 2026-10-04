/**
 * Firebase Realtime / Firestore Chat Synchronization Service
 * Provides complementary database persistence & sync when Firebase configuration is present,
 * working alongside the active low-latency match connection.
 */

import { ChatMessage } from '../types/game';

type MessageCallback = (message: ChatMessage) => void;

class FirebaseChatService {
  private isConfigured: boolean = false;
  private listeners: Set<MessageCallback> = new Set();
  private db: any = null;

  constructor() {
    this.initFirebaseIfAvailable();
  }

  private async initFirebaseIfAvailable() {
    try {
      // Dynamic import to prevent crash if firebase-applet-config.json is absent
      // @ts-ignore
      const configModule = await import('../firebase-applet-config.json').catch(() => null);
      if (configModule && configModule.default) {
        const { initializeApp } = await import('firebase/app');
        const { getFirestore } = await import('firebase/firestore');

        const app = initializeApp(configModule.default);
        this.db = getFirestore(app, configModule.default.firestoreDatabaseId);
        this.isConfigured = true;
      }
    } catch {
      // Firebase config not present, using active game connection
      this.isConfigured = false;
    }
  }

  public subscribeRoomChat(roomCode: string, callback: MessageCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public async broadcastMessage(roomCode: string, msg: ChatMessage): Promise<void> {
    // Notify local listeners
    this.listeners.forEach((cb) => {
      try {
        cb(msg);
      } catch (err) {
        console.error('Error in chat listener:', err);
      }
    });

    if (this.isConfigured && this.db) {
      try {
        const { collection, addDoc, serverTimestamp } = await import('firebase/firestore');
        const chatCol = collection(this.db, 'rooms', roomCode, 'messages');
        await addDoc(chatCol, {
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderColor: msg.senderColor,
          text: msg.text,
          isEmote: !!msg.isEmote,
          emote: msg.emote || null,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firestore chat sync skipped:', err);
      }
    }
  }
}

export const firebaseChat = new FirebaseChatService();
