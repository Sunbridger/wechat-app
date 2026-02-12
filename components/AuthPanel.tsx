import React from 'react';

interface AuthPanelProps {
  mode: 'login' | 'register';
  onModeChange: (mode: 'login' | 'register') => void;
  onLogin: (payload: { name: string; password: string }) => void;
  onRegister: (payload: { name: string; password: string; avatar?: string }) => void;
  error?: string | null;
  status?: string | null;
}

const AuthPanel: React.FC<AuthPanelProps> = ({ mode, onModeChange, onLogin, onRegister, error, status }) => {
  const [form, setForm] = React.useState({
    name: '',
    password: '',
    confirmPassword: '',
    avatar: ''
  });

  const [formError, setFormError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
    setFormError(null);
  }, [mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.name.trim() || !form.password) {
      setFormError('用户名和密码不能为空');
      return;
    }

    if (mode === 'register') {
      if (form.password !== form.confirmPassword) {
        setFormError('两次输入的密码不一致');
        return;
      }
      onRegister({
        name: form.name.trim(),
        password: form.password,
        avatar: form.avatar.trim() || undefined
      });
    } else {
      onLogin({
        name: form.name.trim(),
        password: form.password
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#ececec] px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-6">
          <img
            src="https://imgs-1251740211.cos.ap-shanghai.myqcloud.com/school/1/logo.png"
            alt="App logo"
            className="w-16 h-16 mx-auto mb-4 rounded-full"
          />
          <h1 className="text-2xl font-semibold text-gray-800">WeChat Demo</h1>
          <p className="text-sm text-gray-500 mt-2">{mode === 'login' ? '欢迎回来，请登录账户' : '注册一个新的账户'}</p>
        </div>

        <div className="flex mb-6 border border-gray-200 rounded-full overflow-hidden">
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-[#07c160] text-white' : 'bg-white text-gray-500'}`}
            onClick={() => onModeChange('login')}
          >
            登录
          </button>
          <button
            className={`flex-1 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-[#07c160] text-white' : 'bg-white text-gray-500'}`}
            onClick={() => onModeChange('register')}
          >
            注册
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">用户名</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="请输入用户名"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#07c160] focus:ring-2 focus:ring-[#07c160]/20"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">密码</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="请输入密码"
              className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#07c160] focus:ring-2 focus:ring-[#07c160]/20"
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-sm text-gray-600 mb-1">确认密码</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="请再次输入密码"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#07c160] focus:ring-2 focus:ring-[#07c160]/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">头像链接（可选）</label>
                <input
                  type="url"
                  name="avatar"
                  value={form.avatar}
                  onChange={handleChange}
                  placeholder="https://example.com/avatar.png"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:border-[#07c160] focus:ring-2 focus:ring-[#07c160]/20"
                />
              </div>
            </>
          )}

          {(formError || error) && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {formError || error}
            </div>
          )}

          {status && (
            <div className="text-sm text-green-600 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              {status}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#07c160] hover:bg-[#06a456] text-white font-medium py-2.5 rounded-lg transition-colors"
          >
            {mode === 'login' ? '登录' : '注册'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPanel;

