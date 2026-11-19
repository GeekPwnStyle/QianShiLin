import React, { useState } from 'react';
import { ArrowRight, Eye, EyeOff, Lock, User } from 'lucide-react';
import { useAuth } from '@/src/modules/auth/application/AuthContext';
import { useNavigation } from '@/src/modules/navigation/application/NavigationContext';
import { Button } from '@/src/shared/ui/Button';
import { BrandLogoMark } from '@/src/shared/ui/BrandLogoMark';

export const LoginView: React.FC = () => {
  const { loginWithCredentials } = useAuth();
  const { navigateToRoute } = useNavigation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionNotice] = useState(() => { try { return sessionStorage.getItem('qsl_session_expired'); } catch { return null; } });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await loginWithCredentials(username, password);
      if (!res.ok) {
        setErrorMsg(res.error ?? '登录失败，请检查用户名与密码。');
        return;
      }
      navigateToRoute('/workbench');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-[#171916] flex flex-col justify-between p-6 md:p-12">
      {/* Top Brand Bar */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between border-b border-[#D9DDD4] pb-6">
        <div className="flex items-center gap-3">
          <BrandLogoMark size={38} />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-[22px] font-bold tracking-tight">千视林</span>
              <span className="text-[14px] text-[#73796F] font-medium">Qianshilink</span>
            </div>
            <p className="text-[14px] text-[#5F645D]">眼镜零售连锁全链路业务管理系统</p>
          </div>
        </div>
        <span className="text-[14px] text-[#5F645D]">连锁门店协同管理</span>
      </div>

      {/* Centered Editorial Login Section */}
      <div className="max-w-5xl w-full mx-auto my-auto py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--qsl-accent-soft)] border border-[var(--qsl-accent-soft-border)] text-[13px] font-bold text-[#171916]">
            <span>Qianshilink RBAC</span>
          </div>
          <h1 className="text-[36px] sm:text-[40px] font-bold leading-tight tracking-tight text-[#171916]">
            登录千视林零售管理平台
          </h1>
          <p className="text-[16px] text-[#5F645D] leading-relaxed max-w-md">
            输入对应岗位账号登录系统后，顶部模块、左侧菜单、数据范围及敏感字段权限将按该账号所属角色实时生效。
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#D9DDD4] max-w-md">
            <div>
              <div className="text-[24px] font-bold text-[#171916] tabular-nums">18</div>
              <div className="text-[13px] text-[#5F645D]">业务模块</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#171916] tabular-nums">17</div>
              <div className="text-[13px] text-[#5F645D]">真实门店</div>
            </div>
            <div>
              <div className="text-[24px] font-bold text-[#171916] tabular-nums">3层</div>
              <div className="text-[13px] text-[#5F645D]">权限与数据隔离</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 flex justify-center lg:justify-end">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-[440px] qsl-glass-panel rounded-[24px] p-7 sm:p-8 space-y-5"
          >
            <div>
              <h2 className="text-[22px] font-bold text-[#171916]">账号登录</h2>
              <p className="text-[14px] text-[#73796F] mt-1">
                请输入您的账号与密码
              </p>
            </div>

            {sessionNotice && <p role="status" className="rounded-xl border border-[#D9DDD4] bg-[#F8F9F5] p-3 text-sm text-[#5F645D]">{sessionNotice}</p>}
            {errorMsg && (
              <div
                role="alert"
                className="px-4 py-3 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[14px] text-[#DC2626]"
              >
                {errorMsg}
              </div>
            )}

            {/* Username field with external ? help tooltip outside the input box */}
            <div>
              <label
                htmlFor="login-username"
                className="block text-[14px] font-medium text-[#171916] mb-1.5"
              >
                用户名
              </label>
              <div className="flex items-center gap-2.5">
                <div className="relative flex-1">
                  <User className="w-4 h-4 text-[#73796F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="请输入登录账号"
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#F8F9F5] border border-[#D9DDD4] focus:bg-white focus:border-[#171916] text-[15px] text-[#171916] outline-none transition-colors"
                  />
                </div>

                {/* External circular ? explanation outside username input */}
              </div>
            </div>

            {/* Password field */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-[14px] font-medium text-[#171916] mb-1.5"
              >
                密码
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#73796F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="请输入与用户名相同的密码"
                  className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#F8F9F5] border border-[#D9DDD4] focus:bg-white focus:border-[#171916] text-[15px] text-[#171916] outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? '隐藏密码' : '显示密码'}
                  className="w-8 h-8 rounded-full inline-flex items-center justify-center text-[#73796F] hover:text-[#171916] absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  className="flex-1 justify-center"
                  icon={<ArrowRight className="w-4 h-4" />}
                >
                  登录进入系统
                </Button>

              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto pt-6 border-t border-[#D9DDD4] text-[14px] text-[#73796F] flex flex-wrap justify-between gap-2">
        <span>千视林零售管理系统 Qianshilink</span>
        <span>门店协同 · 业务管理 · 数据安全</span>
      </footer>
    </div>
  );
};
