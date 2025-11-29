import { Message, MessageType, User } from '../types';

// Declare PeerJS global
declare const Peer: any;

export interface P2PMessagePayload {
  type: 'CHAT_MESSAGE';
  message: Message;
  senderInfo: User;
}

export type P2PStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'retrying';

class P2PService {
  private peer: any = null;
  private connections: Map<string, any> = new Map(); // peerId -> DataConnection
  private onMessageCallback: ((payload: P2PMessagePayload) => void) | null = null;
  private onIdAssignedCallback: ((id: string) => void) | null = null;
  private onStatusChangeCallback: ((status: P2PStatus, msg?: string) => void) | null = null;
  private myId: string = '';
  private isInitializing: boolean = false;

  constructor() {}

  public init(savedId?: string) {
    if (this.peer || this.isInitializing) return;
    this.isInitializing = true;
    this.notifyStatus('connecting');

    // Initialize Peer. If savedId exists, try to reuse it.
    // We only use the standard Google STUN server to avoid "transport=udp" syntax errors in some browsers.
    const peerConfig = {
      debug: 1, // Lower debug level to reduce noise
      config: {
        'iceServers': [
          { url: 'stun:stun.l.google.com:19302' }
        ]
      }
    };

    try {
        this.peer = new Peer(savedId || undefined, peerConfig);
    } catch (e) {
        console.error("Failed to create Peer instance", e);
        this.isInitializing = false;
        this.notifyStatus('error', 'Failed to initialize P2P');
        return;
    }

    this.peer.on('open', (id: string) => {
      console.log('My Peer ID is: ' + id);
      this.myId = id;
      this.isInitializing = false;
      this.notifyStatus('connected');
      if (this.onIdAssignedCallback) this.onIdAssignedCallback(id);
    });

    this.peer.on('connection', (conn: any) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      this.isInitializing = false;
      console.warn('PeerJS error:', err.type); 
      
      if (err.type === 'unavailable-id') {
         // ID is taken. Likely another tab is open with this ID.
         console.log("ID taken, retrying with new ID...");
         this.notifyStatus('retrying', 'ID taken, assigning new one...');
         
         if (this.peer) {
             this.peer.destroy();
             this.peer = null;
         }
         // Add a small delay to ensure cleanup
         setTimeout(() => {
             this.init(); 
         }, 1000);
      } else if (err.type === 'network') {
          this.notifyStatus('error', 'Network error. P2P unavailable.');
      } else {
          this.notifyStatus('error', `P2P Error: ${err.type}`);
      }
    });

    this.peer.on('disconnected', () => {
        this.notifyStatus('disconnected');
        // Auto-reconnect logic if needed
        if (this.peer && !this.peer.destroyed) {
            this.peer.reconnect();
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
  
  public setOnStatusChange(callback: (status: P2PStatus, msg?: string) => void) {
      this.onStatusChangeCallback = callback;
  }
  
  private notifyStatus(status: P2PStatus, msg?: string) {
      if (this.onStatusChangeCallback) {
          this.onStatusChangeCallback(status, msg);
      }
  }

  public connectToPeer(peerId: string) {
    if (!this.peer || this.connections.has(peerId)) return;
    
    // Avoid connecting to self
    if (peerId === this.myId) {
        alert("不能添加自己为好友");
        return;
    }
    
    try {
        const conn = this.peer.connect(peerId);
        if (conn) {
            this.setupConnection(conn);
        }
    } catch (e) {
        console.error("Connection failed", e);
    }
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
        this.connections.delete(conn.peer);
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
      if (!this.peer) return;
      
      try {
          const newConn = this.peer.connect(peerId);
          if (newConn) {
              newConn.on('open', () => {
                  this.connections.set(peerId, newConn);
                  newConn.send(payload);
              });
              this.setupConnection(newConn);
          }
      } catch(e) {
          console.error("Failed to reconnect and send", e);
      }
    }
  }
}

export const p2pService = new P2PService();