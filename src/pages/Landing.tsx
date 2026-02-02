import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import constanceLogo from '@/assets/constance-logo.png';
import constanceIcon from '@/assets/constance-icon.png';
import { 
  TrendingUp, 
  Upload, 
  FileSpreadsheet, 
  BarChart3, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Shield,
  Zap,
  LineChart,
  Target
} from 'lucide-react';

const Landing = () => {
  const { t } = useLanguage();

  const features = [
    {
      icon: Upload,
      titleKey: 'features.import.title',
      descKey: 'features.import.desc',
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: BarChart3,
      titleKey: 'features.premises.title',
      descKey: 'features.premises.desc',
      color: 'from-purple-500 to-purple-600'
    },
    {
      icon: FileSpreadsheet,
      titleKey: 'features.excel.title',
      descKey: 'features.excel.desc',
      color: 'from-green-500 to-green-600'
    }
  ];

  const howItWorks = [
    { step: '01', titleKey: 'how.step1.title', descKey: 'how.step1.desc' },
    { step: '02', titleKey: 'how.step2.title', descKey: 'how.step2.desc' },
    { step: '03', titleKey: 'how.step3.title', descKey: 'how.step3.desc' }
  ];

  const benefits = [
    'benefits.item1',
    'benefits.item2',
    'benefits.item3',
    'benefits.item4',
    'benefits.item5'
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={constanceIcon} alt="Constance AI" className="w-10 h-10 rounded-xl shadow-lg shadow-primary/25" />
              <img src={constanceLogo} alt="Constance AI" className="h-[1.65rem]" />
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[70px] text-center">
                {t('nav.features')}
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[110px] text-center">
                {t('nav.howItWorks')}
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors min-w-[75px] text-center">
                {t('nav.benefits')}
              </a>
            </div>
            <div className="flex items-center gap-4">
              <LanguageToggle />
              <Link to="/signin" target="_blank" rel="noopener noreferrer" className="font-bold text-foreground hover:text-primary transition-colors">
                Sign In
              </Link>
              <Link to="/app">
                <Button className="min-w-[160px] justify-center whitespace-nowrap bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                  {t('nav.startNow')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">{t('hero.badge')}</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              {t('hero.title1')}
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              {t('hero.title2')}
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {t('hero.subtitle')}
          </p>

          {/* CTA Card */}
          <div className="max-w-xl mx-auto animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link to="/app">
              <div className="group relative p-8 rounded-2xl border-2 border-dashed border-primary/30 bg-card/50 backdrop-blur-sm hover:border-primary/60 hover:bg-card/80 transition-all duration-300 cursor-pointer">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl shadow-primary/30 group-hover:scale-110 transition-transform">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {t('hero.import')}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {t('hero.importDesc')}
                  </p>
                  <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">
                    {t('hero.startValuation')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm">{t('trust.free')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="text-sm">{t('trust.secure')}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">{t('trust.instant')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10x', labelKey: 'stats.faster', icon: Zap },
              { value: '100%', labelKey: 'stats.automated', icon: Sparkles },
              { value: '∞', labelKey: 'stats.projections', icon: LineChart },
              { value: '0', labelKey: 'stats.noErrors', icon: Target },
            ].map((stat, i) => (
              <div key={i} className="text-center animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('features.title1')}{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {t('features.title2')}
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className={`w-14 h-14 mb-6 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{t(feature.titleKey)}</h3>
                <p className="text-muted-foreground">{t(feature.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20 px-6 bg-secondary/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t('how.title')}
            </h2>
            <p className="text-muted-foreground">
              {t('how.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {howItWorks.map((item, i) => (
              <div 
                key={i} 
                className="flex gap-6 mb-8 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
                  {item.step}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{t(item.titleKey)}</h3>
                  <p className="text-muted-foreground">{t(item.descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                {t('benefits.title1')}{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {t('benefits.title2')}
                </span>
              </h2>
              <p className="text-muted-foreground mb-8">
                {t('benefits.subtitle')}
              </p>
              
              <div className="space-y-4">
                {benefits.map((benefitKey, i) => (
                  <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-foreground">{t(benefitKey)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link to="/app">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                    {t('benefits.startFree')}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex items-center justify-center">
                <div className="w-full h-full rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
                  {/* Mock Excel Preview */}
                  <div className="h-10 bg-secondary/50 border-b border-border flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <span className="text-xs text-muted-foreground ml-4">Projeções_Financeiras.xlsx</span>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-4 gap-1 text-xs">
                      <div className="p-2 bg-secondary/50 font-medium text-foreground">Conta</div>
                      <div className="p-2 bg-secondary/50 font-medium text-center text-foreground">2024</div>
                      <div className="p-2 bg-secondary/50 font-medium text-center text-foreground">2025</div>
                      <div className="p-2 bg-secondary/50 font-medium text-center text-foreground">2026</div>
                      
                      <div className="p-2 text-foreground">Receita</div>
                      <div className="p-2 text-center text-green-600">R$ 10M</div>
                      <div className="p-2 text-center text-green-600">R$ 12M</div>
                      <div className="p-2 text-center text-green-600">R$ 14.4M</div>
                      
                      <div className="p-2 text-foreground">EBITDA</div>
                      <div className="p-2 text-center text-foreground">R$ 2M</div>
                      <div className="p-2 text-center text-foreground">R$ 2.4M</div>
                      <div className="p-2 text-center text-foreground">R$ 2.9M</div>
                      
                      <div className="p-2 text-foreground">Margem</div>
                      <div className="p-2 text-center text-primary">20%</div>
                      <div className="p-2 text-center text-primary">20%</div>
                      <div className="p-2 text-center text-primary">20%</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: '3s' }}>
                <FileSpreadsheet className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center p-12 rounded-3xl bg-gradient-to-br from-primary to-accent relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJjLTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDRjMiAwIDItMiAyLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-20" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {t('cta.title')}
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                {t('cta.subtitle')}
              </p>
              <Link to="/app">
                <Button size="xl" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-xl">
                  {t('cta.button')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src={constanceIcon} alt="Constance AI" className="w-10 h-10 rounded-xl" />
                <img src={constanceLogo} alt="Constance AI" className="h-[1.65rem]" />
              </div>
              <p className="text-muted-foreground max-w-sm">
                {t('footer.desc')}
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('footer.product')}</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">{t('nav.features')}</a></li>
                <li><a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">{t('nav.howItWorks')}</a></li>
                <li><a href="#benefits" className="text-muted-foreground hover:text-foreground transition-colors">{t('nav.benefits')}</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-4">{t('footer.company')}</h4>
              <ul className="space-y-2">
                <li><Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.about')}</Link></li>
                <li><Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.contact')}</Link></li>
                <li><Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">{t('footer.privacy')}</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © 2024 Constance. {t('footer.rights')}
            </p>
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{t('footer.privacy')}</Link>
              <a href="#" className="text-muted-foreground hover:text-foreground transition-colors text-sm">{t('footer.terms')}</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
