import { User } from '../types';

interface StoredUser extends User {
  password: string;
  peerId: string;
}

interface AuthSuccess {
  success: true;
  user: User;
}

interface AuthFailure {
  success: false;
  message: string;
}

export type AuthResponse = AuthSuccess | AuthFailure;

const USERS_KEY = 'wechat_local_users';
const SESSION_USER_KEY = 'wechat_current_user';

const isBrowser = typeof window !== 'undefined';

const readUsers = (): StoredUser[] => {
  if (!isBrowser) {
    return [];
  }
  const raw = window.localStorage.getItem(USERS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as StoredUser[];
    if (Array.isArray(parsed)) {
      return parsed.map(user => ({
        ...user,
        peerId: user.peerId || buildPeerId(user.name ?? '', user.id)
      }));
    }
  } catch (error) {
    console.error('Failed to parse stored users', error);
  }
  return [];
};

const persistUsers = (users: StoredUser[]) => {
  if (!isBrowser) return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

const persistSessionUser = (user: User | null) => {
  if (!isBrowser) return;
  if (user) {
    window.localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(SESSION_USER_KEY);
  }
};

const buildAvatar = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/200`;

// 将用户名转换为有效的PeerJS ID（只允许字母、数字、连字符、下划线）
export const buildPeerId = (name: string, fallback: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return fallback;

  // 使用base64编码用户名，然后移除特殊字符，只保留字母数字
  try {
    const encoded = btoa(encodeURIComponent(trimmed))
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .substring(0, 20); // PeerJS ID长度限制

    // 确保以字母开头（PeerJS要求）
    const validId = /^[a-zA-Z]/.test(encoded)
      ? encoded
      : `u${encoded}`.substring(0, 20);

    return validId || fallback;
  } catch (e) {
    console.warn('Failed to encode peer ID, using fallback', e);
    return fallback;
  }
};

export const normalizePeerKeyword = (keyword: string) => keyword.trim();

export const getActiveUser = (): User | null => {
  if (!isBrowser) return null;
  const raw = window.localStorage.getItem(SESSION_USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw) as User;
    if (!user.peerId) {
      const hydrated = {
        ...user,
        peerId: buildPeerId(user.name ?? '', user.id)
      };
      persistSessionUser(hydrated);
      return hydrated;
    }
    return user;
  } catch (error) {
    console.error('Failed to parse current user session', error);
    return null;
  }
};

interface RegisterPayload {
  name: string;
  password: string;
  avatar?: string;
}

export const registerUser = ({ name, password, avatar }: RegisterPayload): AuthResponse => {
  if (!isBrowser) {
    return { success: false, message: '仅支持在浏览器环境中使用' };
  }
  const trimmedName = name.trim();
  if (!trimmedName || !password) {
    return { success: false, message: '请输入用户名和密码' };
  }
  const users = readUsers();
  const exists = users.some(user => user.name.toLowerCase() === trimmedName.toLowerCase());
  if (exists) {
    return { success: false, message: '该用户名已存在' };
  }
  const fallbackId = `user_${Date.now()}`;
  const peerId = buildPeerId(trimmedName, fallbackId);
  const newUser: StoredUser = {
    id: fallbackId,
    name: trimmedName,
    password,
    avatar: avatar?.trim() || buildAvatar(trimmedName),
    peerId
  };
  persistUsers([...users, newUser]);
  return {
    success: true,
    user: {
      id: newUser.id,
      name: newUser.name,
      avatar: newUser.avatar,
      peerId: newUser.peerId
    }
  };
};

export const loginUser = (name: string, password: string): AuthResponse => {
  if (!isBrowser) {
    return { success: false, message: '仅支持在浏览器环境中使用' };
  }
  const trimmedName = name.trim();
  const users = readUsers();
  const target = users.find(
    user => user.name.toLowerCase() === trimmedName.toLowerCase()
  );
  if (!target || target.password !== password) {
    return { success: false, message: '用户名或密码错误' };
  }
  const safeUser: User = {
    id: target.id,
    name: target.name,
    avatar: target.avatar,
    peerId: target.peerId
  };
  persistSessionUser(safeUser);
  return { success: true, user: safeUser };
};

export const logoutUser = () => {
  persistSessionUser(null);
};

export const updateCurrentUserAvatar = (avatar: string) => {
  if (!isBrowser) return null;
  const users = readUsers();
  const sessionUser = getActiveUser();
  if (!sessionUser) return null;
  const index = users.findIndex(user => user.id === sessionUser.id);
  if (index === -1) return null;
  const updatedUser: StoredUser = {
    ...users[index],
    avatar: avatar || buildAvatar(users[index].name)
  };
  users[index] = updatedUser;
  persistUsers(users);
  const publicUser: User = {
    id: updatedUser.id,
    name: updatedUser.name,
    avatar: updatedUser.avatar,
    peerId: updatedUser.peerId
  };
  persistSessionUser(publicUser);
  return publicUser;
};

export const clearAuthData = () => {
  if (!isBrowser) return;
  window.localStorage.removeItem(USERS_KEY);
  window.localStorage.removeItem(SESSION_USER_KEY);
};

export const getStoredUsersMeta = () => {
  const users = readUsers();
  return users.map(user => ({ id: user.id, name: user.name }));
};

