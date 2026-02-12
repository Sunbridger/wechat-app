import { Message, User, FriendRequest } from '../types';

declare const Peer: any;

export type P2PPayloadType = 'CHAT_MESSAGE' | 'USER_INFO_REQUEST' | 'USER_INFO_RESPONSE' | 'FRIEND_REQUEST' | 'FRIEND_REQUEST_RESPONSE';

export interface P2PMessagePayload {
  type: P2PPayloadType;
  message?: Message;
  senderInfo: User;
  peerId?: string;
  requestId?: string;
  profile?: {
    id: string;
    name: string;
    avatar: string;
    peerId?: string;
  };
  friendRequest?: FriendRequest;
  accepted?: boolean;
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

  public init(savedId?: string) {
    if (typeof window === 'undefined') {
      console.warn('P2P: Not in browser environment');
      return;
    }

    // 检查PeerJS是否已加载
    if (typeof Peer === 'undefined') {
      console.error('P2P: PeerJS library not loaded');
      this.notifyStatus('error', 'PeerJS库未加载，请刷新页面');
      return;
    }

    if (this.peer || this.isInitializing) {
      console.log('P2P: Already initialized or initializing');
      return;
    }

    this.isInitializing = true;
    this.notifyStatus('connecting');
    console.log('P2P: Initializing with ID:', savedId || 'auto-generated');

    // Initialize Peer. If savedId exists, try to reuse it.
    // We only use the standard Google STUN server to avoid "transport=udp" syntax errors in some browsers.
    const peerConfig = {
      debug: 2, // 提高日志级别以便调试
      config: {
        'iceServers': [
          { url: 'stun:stun.l.google.com:19302' }
        ]
      }
    };

    try {
        this.peer = new Peer(savedId || undefined, peerConfig);
        console.log('P2P: Peer instance created');
    } catch (e) {
        console.error("P2P: Failed to create Peer instance", e);
        this.isInitializing = false;
        this.notifyStatus('error', '初始化P2P失败: ' + (e instanceof Error ? e.message : String(e)));
        return;
    }

    // 设置超时，如果10秒内没有连接成功，认为失败
    const initTimeout = setTimeout(() => {
      if (this.isInitializing) {
        console.error('P2P: Initialization timeout');
        this.isInitializing = false;
        this.notifyStatus('error', '连接超时，请检查网络或刷新页面');
        if (this.peer) {
          try {
            this.peer.destroy();
          } catch (e) {
            console.warn('P2P: Error destroying peer on timeout', e);
          }
          this.peer = null;
        }
      }
    }, 10000);

    this.peer.on('open', (id: string) => {
      clearTimeout(initTimeout);
      console.log('P2P: Connected! My Peer ID is:', id);
      this.myId = id;
      this.isInitializing = false;
      this.notifyStatus('connected');
      if (this.onIdAssignedCallback) this.onIdAssignedCallback(id);
    });

    this.peer.on('connection', (conn: any) => {
      console.log('P2P: Incoming connection from:', conn.peer);
      this.setupConnection(conn);
    });

    this.peer.on('error', (err: any) => {
      clearTimeout(initTimeout);
      this.isInitializing = false;
      console.error('P2P: PeerJS error:', err.type, err);

      if (err.type === 'unavailable-id') {
         // ID is taken. Likely another tab is open with this ID.
         console.log("P2P: ID taken, retrying with new ID...");
         this.notifyStatus('retrying', 'ID已被占用，正在分配新ID...');

         if (this.peer) {
             try {
               this.peer.destroy();
             } catch (e) {
               console.warn('P2P: Error destroying peer', e);
             }
             this.peer = null;
         }
         // Add a small delay to ensure cleanup
         setTimeout(() => {
             this.init(); // 不传ID，让PeerJS自动生成
         }, 1000);
      } else if (err.type === 'network') {
          this.notifyStatus('error', '网络错误，P2P不可用');
      } else if (err.type === 'server-error') {
          this.notifyStatus('error', '服务器错误，请稍后重试');
      } else {
          this.notifyStatus('error', `P2P错误: ${err.type}`);
      }
    });

    this.peer.on('disconnected', () => {
        console.warn('P2P: Disconnected from server');
        this.notifyStatus('disconnected');
        // Auto-reconnect logic if needed
        if (this.peer && !this.peer.destroyed) {
            console.log('P2P: Attempting to reconnect...');
            this.peer.reconnect();
        }
    });

    this.peer.on('close', () => {
      console.log('P2P: Peer closed');
      clearTimeout(initTimeout);
      this.isInitializing = false;
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

  private sendPayload(peerId: string, payload: P2PMessagePayload) {
    console.log('P2P sendPayload: targetPeerId=', peerId, 'myId=', this.myId, 'type=', payload.type);
    if (!peerId || peerId === this.myId) {
      console.log('P2P sendPayload: 跳过发送 (peerId为空或等于自己)');
      return;
    }
    const existing = this.connections.get(peerId);
    const deliver = (connection: any) => {
      try {
        console.log('P2P: 发送 payload 类型:', payload.type, '到', peerId);
        connection.send(payload);
      } catch (error) {
        console.error('Failed to send payload', error);
      }
    };

    if (existing && existing.open) {
      console.log('P2P: 使用现有连接发送');
      deliver(existing);
      return;
    }

    if (!this.peer) {
      console.log('P2P: peer 未初始化，无法发送');
      return;
    }

    console.log('P2P: 创建新连接到', peerId);
    try {
      const newConn = this.peer.connect(peerId);
      if (newConn) {
        newConn.on('open', () => {
          console.log('P2P: 新连接已打开，发送 payload');
          this.connections.set(peerId, newConn);
          deliver(newConn);
        });
        this.setupConnection(newConn);
      }
    } catch (e) {
      console.error("Failed to reconnect and send", e);
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
        const payload = data as P2PMessagePayload;
        this.onMessageCallback({ ...payload, peerId: payload.peerId || conn.peer });
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
    const payload: P2PMessagePayload = {
        type: 'CHAT_MESSAGE',
        message: message,
        senderInfo: currentUser
    };

    this.sendPayload(peerId, payload);
  }

  public sendFriendRequest(peerId: string, request: FriendRequest) {
    console.log('P2P: 发送好友请求到', peerId, '请求:', request);
    const payload: P2PMessagePayload = {
      type: 'FRIEND_REQUEST',
      friendRequest: request,
      senderInfo: request.fromUser
    };
    this.sendPayload(peerId, payload);
  }

  public sendFriendRequestResponse(peerId: string, request: FriendRequest, accepted: boolean, currentUser: User) {
    const payload: P2PMessagePayload = {
      type: 'FRIEND_REQUEST_RESPONSE',
      friendRequest: request,
      accepted,
      senderInfo: currentUser
    };
    this.sendPayload(peerId, payload);
  }

  public sendPayloadToPeer(peerId: string, payload: P2PMessagePayload) {
    this.sendPayload(peerId, payload);
  }

  public destroy() {
    this.connections.forEach(conn => {
      try {
        conn.close();
      } catch (error) {
        console.warn('Error closing connection', error);
      }
    });
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (error) {
        console.warn('Error destroying peer', error);
      }
    }
    this.peer = null;
    this.myId = '';
    this.isInitializing = false;
    this.notifyStatus('disconnected');
  }
}

export const p2pService = new P2PService();