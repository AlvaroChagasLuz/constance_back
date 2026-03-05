import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import constanceLogo from '@/assets/constance-logo.png';
import constanceIcon from '@/assets/constance-icon.png';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

const SignUp = () => {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(language === 'pt' ? 'As senhas não coincidem' : 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error(language === 'pt' ? 'A senha deve ter pelo menos 6 caracteres' : 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/signin`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success(
          language === 'pt'
            ? 'Conta criada! Verifique seu e-mail para confirmar o cadastro.'
            : 'Account created! Check your email to confirm your registration.'
        );
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }
    } catch {
      toast.error(language === 'pt' ? 'Erro inesperado. Tente novamente.' : 'Unexpected error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const t = (key: string) => {
    const translations: Record<string, Record<string, string>> = {
      'signup.title': {
        pt: 'Crie sua conta',
        en: 'Create your account'
      },
      'signup.subtitle': {
        pt: 'Preencha os dados abaixo para começar',
        en: 'Fill in the details below to get started'
      },
      'signup.name': {
        pt: 'Nome completo',
        en: 'Full name'
      },
      'signup.namePlaceholder': {
        pt: 'Seu nome',
        en: 'Your name'
      },
      'signup.email': {
        pt: 'E-mail',
        en: 'Email'
      },
      'signup.password': {
        pt: 'Senha',
        en: 'Password'
      },
      'signup.confirmPassword': {
        pt: 'Confirmar senha',
        en: 'Confirm password'
      },
      'signup.create': {
        pt: 'Criar conta',
        en: 'Create account'
      },
      'signup.hasAccount': {
        pt: 'Já tem uma conta?',
        en: 'Already have an account?'
      },
      'signup.signIn': {
        pt: 'Entrar',
        en: 'Sign in'
      },
      'signup.or': {
        pt: 'ou',
        en: 'or'
      },
      'signup.google': {
        pt: 'Continuar com Google',
        en: 'Continue with Google'
      }
    };
    return translations[key]?.[language] || key;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark Header Section */}
      <div className="bg-foreground py-12 px-6 flex flex-col items-center">
        <Link to="/" className="flex flex-col items-center gap-3">
          <img
            src={constanceIcon}
            alt="Constance AI"
            className="w-16 h-16 rounded-2xl shadow-lg shadow-primary/25"
          />
          <img
            src={constanceLogo}
            alt="Constance AI"
            className="h-8 brightness-0 invert"
          />
        </Link>
      </div>

      {/* Sign Up Card Section */}
      <div className="flex-1 bg-secondary/30 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8 -mt-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              {t('signup.title')}
            </h1>
            <p className="text-muted-foreground">
              {t('signup.subtitle')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground font-medium">
                {t('signup.name')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t('signup.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                {t('signup.email')}
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                {t('signup.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                {t('signup.confirmPassword')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 bg-background border-border focus:border-primary focus:ring-primary"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-lg font-semibold shadow-lg shadow-primary/25"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                t('signup.create')
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-sm text-muted-foreground">{t('signup.or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-border hover:bg-secondary/50"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {t('signup.google')}
          </Button>

          {/* Sign In Link */}
          <p className="text-center mt-8 text-muted-foreground">
            {t('signup.hasAccount')}{' '}
            <Link to="/signin" className="text-primary font-semibold hover:text-primary/80 transition-colors">
              {t('signup.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
