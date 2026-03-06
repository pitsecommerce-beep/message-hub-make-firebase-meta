import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Users, ShoppingCart, Package, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { classNames } from '@/utils/helpers';
import type { UserRole } from '@/types';

type Step = 'welcome' | 'role' | 'form' | 'success';

const roleOptions: { value: UserRole; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { value: 'manager', label: 'Gerente', desc: 'Crea y administra tu equipo', icon: <Users size={24} />, color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { value: 'sales_agent', label: 'Agente de Ventas', desc: 'Atiende conversaciones y ventas', icon: <ShoppingCart size={24} />, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  { value: 'warehouse', label: 'Paquetería', desc: 'Gestiona almacén y envíos', icon: <Package size={24} />, color: 'bg-amber-50 text-amber-600 border-amber-200' },
];

export default function LoginPage() {
  const [step, setStep] = useState<Step>('welcome');
  const [selectedRole, setSelectedRole] = useState<UserRole>('sales_agent');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgCode, setOrgCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al autenticar con Google');
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Credenciales incorrectas');
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(email, password, name, selectedRole, selectedRole !== 'manager' ? orgCode : undefined);
      setStep('success');
      setTimeout(() => navigate('/dashboard'), 800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al crear cuenta');
      setLoading(false);
    }
  };

  const goToSignUp = () => {
    setStep('role');
    setError('');
  };

  const goToLogin = () => {
    setStep('welcome');
    setError('');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-surface-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className={classNames(
          'text-center mb-8 transition-all duration-500',
          step === 'success' ? 'scale-110' : ''
        )}>
          <div className="w-14 h-14 rounded-2xl bg-primary-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
            <MessageSquare size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900">MessageHub</h1>
          <p className="text-surface-500 text-sm mt-1">
            Centraliza tus mensajes de Meta en un solo lugar
          </p>
        </div>

        {/* Success */}
        {step === 'success' && (
          <div className="card p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-emerald-600" />
            </div>
            <h2 className="text-lg font-semibold text-surface-800 mb-2">Bienvenido</h2>
            <p className="text-sm text-surface-500">Redirigiendo al dashboard...</p>
          </div>
        )}

        {/* Login */}
        {step === 'welcome' && (
          <div className="card p-8">
            <h2 className="text-lg font-semibold text-surface-800 mb-6">Iniciar sesión</h2>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Contraseña</label>
                <input type="password" className="input-field" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Ingresando...' : 'Iniciar sesión'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-surface-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-3 bg-white text-surface-400">o continúa con</span></div>
            </div>

            <button type="button" onClick={handleGoogleSignIn} disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-surface-200 rounded-lg hover:bg-surface-50 transition-colors text-sm font-medium text-surface-700 disabled:opacity-50">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332Z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.166 6.656 3.58 9 3.58Z" fill="#EA4335"/>
              </svg>
              Google
            </button>

            <div className="mt-6 text-center">
              <button onClick={goToSignUp} className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                ¿No tienes cuenta? Regístrate
              </button>
            </div>
          </div>
        )}

        {/* Role Selection */}
        {step === 'role' && (
          <div className="card p-8">
            <button onClick={goToLogin} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4 transition-colors">
              <ArrowLeft size={16} /> Volver
            </button>
            <h2 className="text-lg font-semibold text-surface-800 mb-2">¿Cuál es tu rol?</h2>
            <p className="text-sm text-surface-500 mb-6">Selecciona cómo vas a usar MessageHub</p>

            <div className="space-y-3">
              {roleOptions.map((r) => (
                <button
                  key={r.value}
                  onClick={() => { setSelectedRole(r.value); setStep('form'); }}
                  className={classNames(
                    'w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-md',
                    r.color
                  )}
                >
                  <div className="flex-shrink-0">{r.icon}</div>
                  <div>
                    <p className="font-semibold text-sm">{r.label}</p>
                    <p className="text-xs opacity-80">{r.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Registration Form */}
        {step === 'form' && (
          <div className="card p-8">
            <button onClick={() => setStep('role')} className="flex items-center gap-1 text-sm text-surface-500 hover:text-surface-700 mb-4 transition-colors">
              <ArrowLeft size={16} /> Cambiar rol
            </button>

            <div className="flex items-center gap-3 mb-6 p-3 rounded-lg bg-surface-50">
              <div className={classNames('w-10 h-10 rounded-lg flex items-center justify-center', roleOptions.find(r => r.value === selectedRole)?.color || '')}>
                {roleOptions.find(r => r.value === selectedRole)?.icon}
              </div>
              <p className="text-sm font-semibold text-surface-800">
                Registrarse como {roleOptions.find(r => r.value === selectedRole)?.label}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
            )}

            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Nombre completo</label>
                <input type="text" className="input-field" placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
                <input type="email" className="input-field" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Contraseña</label>
                <input type="password" className="input-field" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>

              {selectedRole !== 'manager' && (
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Código de organización</label>
                  <input
                    type="text"
                    className="input-field uppercase tracking-wider text-center font-mono text-lg"
                    placeholder="ABC123"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                    required
                    maxLength={6}
                  />
                  <p className="text-xs text-surface-400 mt-1">Pide el código a tu gerente para unirte a su equipo</p>
                </div>
              )}

              {selectedRole === 'manager' && (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-blue-700">
                    Se creará una organización nueva. Podrás invitar empleados compartiendo tu código de organización.
                  </p>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button onClick={goToLogin} className="text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors">
                ¿Ya tienes cuenta? Inicia sesión
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
