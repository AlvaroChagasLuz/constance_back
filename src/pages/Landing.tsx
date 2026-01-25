import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  Upload, 
  FileSpreadsheet, 
  BarChart3, 
  ArrowRight, 
  Sparkles,
  CheckCircle2,
  Building2,
  Users,
  LineChart,
  Shield,
  Zap,
  Target
} from 'lucide-react';

const Landing = () => {
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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Constance
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
              <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Como Funciona
              </a>
              <a href="#benefits" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Benefícios
              </a>
            </div>
            <Link to="/app">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/25">
                Começar Agora
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="container mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-sm font-medium text-accent">Powered by AI</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text text-transparent">
              Transforme sua DRE em
            </span>
            <br />
            <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
              Projeções Financeiras
            </span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Automatize a primeira etapa do valuation. Importe dados históricos, 
            configure premissas e exporte Excel com fórmulas prontas em minutos.
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
                    Importe sua DRE
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Cole do Excel, faça upload de .xlsx ou .csv
                  </p>
                  <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg">
                    Começar Valuation
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
              <span className="text-sm">100% Gratuito</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-5 h-5 text-blue-500" />
              <span className="text-sm">Dados Seguros</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm">Exportação Instantânea</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6 bg-secondary/30">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10x', label: 'Mais Rápido', icon: Zap },
              { value: '100%', label: 'Automatizado', icon: Sparkles },
              { value: '∞', label: 'Projeções', icon: LineChart },
              { value: '0', label: 'Erros de Fórmula', icon: Target },
            ].map((stat, i) => (
              <div key={i} className="text-center animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
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
              Tudo que você precisa para{' '}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Valuation
              </span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Uma solução completa para transformar dados financeiros históricos em projeções profissionais
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Upload,
                title: 'Importação Inteligente',
                description: 'Cole dados do Excel, faça upload de arquivos .xlsx ou .csv. Detectamos automaticamente anos e categorias.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                icon: BarChart3,
                title: 'Premissas Configuráveis',
                description: 'Defina crescimento de receita, margens, custos e impostos. Wizard passo-a-passo guia todo o processo.',
                color: 'from-purple-500 to-purple-600'
              },
              {
                icon: FileSpreadsheet,
                title: 'Excel com Fórmulas',
                description: 'Exporte planilha completa com DRE histórica, premissas, projeções e resumo. Fórmulas funcionais.',
                color: 'from-green-500 to-green-600'
              }
            ].map((feature, i) => (
              <div 
                key={i} 
                className="group p-8 rounded-2xl bg-card border border-border hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className={`w-14 h-14 mb-6 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
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
              Como Funciona
            </h2>
            <p className="text-muted-foreground">
              Três passos simples para gerar suas projeções
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            {[
              {
                step: '01',
                title: 'Importe sua DRE',
                description: 'Cole os dados diretamente do Excel ou faça upload do arquivo. O sistema detecta automaticamente os anos e categoriza as contas.'
              },
              {
                step: '02',
                title: 'Configure as Premissas',
                description: 'Defina o número de anos projetados, taxas de crescimento, margens operacionais e alíquota de impostos através do wizard intuitivo.'
              },
              {
                step: '03',
                title: 'Exporte o Excel',
                description: 'Baixe uma planilha completa com abas de histórico, premissas, projeções e resumo. Todas as fórmulas funcionando.'
              }
            ].map((item, i) => (
              <div 
                key={i} 
                className="flex gap-6 mb-8 animate-fade-in"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
                  {item.step}
                </div>
                <div className="pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
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
                Feito para profissionais de{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  M&A e Valuation
                </span>
              </h2>
              <p className="text-muted-foreground mb-8">
                Economize horas de trabalho manual. Foque no que realmente importa: a análise estratégica.
              </p>
              
              <div className="space-y-4">
                {[
                  'Elimina erros de fórmulas no Excel',
                  'Estrutura DRE automaticamente',
                  'Fórmulas prontas e auditáveis',
                  'Exportação instantânea',
                  'Interface intuitiva e moderna'
                ].map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${0.1 * i}s` }}>
                    <div className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              <div className="mt-10">
                <Link to="/app">
                  <Button size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
                    Começar Gratuitamente
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
                Pronto para automatizar seu Valuation?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Comece agora mesmo. Sem cadastro, sem pagamento. 
                Importe sua DRE e gere projeções em minutos.
              </p>
              <Link to="/app">
                <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 shadow-xl">
                  Começar Agora — É Grátis
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-foreground">Constance (M&A AI)</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 Constance. Projeções financeiras automatizadas.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
