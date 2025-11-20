import { Message, MessageType, User } from '../types';

// Declare PeerJS global
declare const Peer: any;

export interface P2PMessagePayload {
  type: 'CHAT_MESSAGE';
  message: Message;
  senderInfo: User;
}

class P2PService {
  private peer: any = null;
  private connections: Map<string, any> = new Map(); // peerId -> DataConnection
  private onMessageCallback: ((payload: P2PMessagePayload) => void) | null = null;
  private onIdAssignedCallback: ((id: string) => void) | null = null;
  private myId: string = '';

  constructor() {}

  public init(savedId?: string) {
    if (this.peer) return;

    // Initialize Peer. If savedId exists, try to reuse it (though PeerJS might reject if taken)
    // For simplicity in this demo, we let PeerJS assign one if savedId fails or is null,
    // but in a real app with a server, you'd authenticate to get your ID.
    // Here we try to use the savedId if provided, otherwise random.
    this.peer = new Peer(savedId || undefined, {
      debug: 2,
      config: {
        'iceServers': [
          { url: 'stun:stun.l.google.com:19302' },
          { url: 'stun:global.stun.twilio.com:3478?transport=udp' }
        ]
      }
    });

    this.peer.on('open', (id: string) => {
      console.log('My Peer ID is: ' + id);
      this.myId = id;
      if (this.onIdAssignedCallback) this.onIdAssignedCallback(id);
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      console.error('PeerJS error:', err);
      if (err.type === 'unavailable-id') {
         // Retry without ID
         this.peer.destroy();
         this.peer = null;
         this.init(); 
      }
    });
  }

  public getMyId() {
      return this.myId;
  }

  public setOnMessageReceived(callback: (payload: P2PMessagePayload) => void) {
    this.onMessageCallback = callback;
  }

  public setOnIdAssigned(callback: (id: string) => void) {
      this.onIdAssignedCallback = callback;
  }

  public connectToPeer(peerId: string) {
    if (!this.peer || this.connections.has(peerId)) return;
    
    const conn = this.peer.connect(peerId);
    this.setupConnection(conn);
  }

  private setupConnection(conn: any) {
    conn.on('open', () => {
      console.log(`Connected to: ${conn.peer}`);
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (data: any) => {
      console.log('Received data', data);
      if (this.onMessageCallback) {
        this.onMessageCallback(data as P2PMessagePayload);
      }
    });

    conn.on('close', () => {
      console.log(`Connection closed: ${conn.peer}`);
      this.connections.delete(conn.peer);
    });

    conn.on('error', (err: any) => {
        console.error('Connection error', err);
    });
  }

  public sendMessage(peerId: string, message: Message, currentUser: User) {
    const conn = this.connections.get(peerId);
    const payload: P2PMessagePayload = {
        type: 'CHAT_MESSAGE',
        message: message,
        senderInfo: currentUser
    };

    if (conn && conn.open) {
      conn.send(payload);
    } else {
      // Try to reconnect and send
      const newConn = this.peer.connect(peerId);
      newConn.on('open', () => {
          this.connections.set(peerId, newConn);
          newConn.send(payload);
      });
      this.setupConnection(newConn);
    }
  }
}

export const p2pService = new P2PService();
