import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'pt' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pt: {
    // Navbar
    'nav.features': 'Recursos',
    'nav.howItWorks': 'Como Funciona',
    'nav.benefits': 'Benefícios',
    'nav.startNow': 'Começar Agora',
    
    // Hero
    'hero.badge': 'Powered by AI',
    'hero.title1': 'Transforme sua DRE em',
    'hero.title2': 'Projeções Financeiras',
    'hero.subtitle': 'Automatize a primeira etapa do valuation. Importe dados históricos, configure premissas e exporte Excel com fórmulas prontas em minutos.',
    'hero.import': 'Importe sua DRE',
    'hero.importDesc': 'Cole do Excel, faça upload de .xlsx ou .csv',
    'hero.startValuation': 'Começar Valuation',
    
    // Trust indicators
    'trust.free': '100% Gratuito',
    'trust.secure': 'Dados Seguros',
    'trust.instant': 'Exportação Instantânea',
    
    // Stats
    'stats.faster': 'Mais Rápido',
    'stats.automated': 'Automatizado',
    'stats.projections': 'Projeções',
    'stats.noErrors': 'Erros de Fórmula',
    
    // Features
    'features.title1': 'Tudo que você precisa para',
    'features.title2': 'Valuation',
    'features.subtitle': 'Uma solução completa para transformar dados financeiros históricos em projeções profissionais',
    'features.import.title': 'Importação Inteligente',
    'features.import.desc': 'Cole dados do Excel, faça upload de arquivos .xlsx ou .csv. Detectamos automaticamente anos e categorias.',
    'features.premises.title': 'Premissas Configuráveis',
    'features.premises.desc': 'Defina crescimento de receita, margens, custos e impostos. Wizard passo-a-passo guia todo o processo.',
    'features.excel.title': 'Excel com Fórmulas',
    'features.excel.desc': 'Exporte planilha completa com DRE histórica, premissas, projeções e resumo. Fórmulas funcionais.',
    
    // How it works
    'how.title': 'Como Funciona',
    'how.subtitle': 'Três passos simples para gerar suas projeções',
    'how.step1.title': 'Importe sua DRE',
    'how.step1.desc': 'Cole os dados diretamente do Excel ou faça upload do arquivo. O sistema detecta automaticamente os anos e categoriza as contas.',
    'how.step2.title': 'Configure as Premissas',
    'how.step2.desc': 'Defina o número de anos projetados, taxas de crescimento, margens operacionais e alíquota de impostos através do wizard intuitivo.',
    'how.step3.title': 'Exporte o Excel',
    'how.step3.desc': 'Baixe uma planilha completa com abas de histórico, premissas, projeções e resumo. Todas as fórmulas funcionando.',
    
    // Benefits
    'benefits.title1': 'Feito para profissionais de',
    'benefits.title2': 'M&A e Valuation',
    'benefits.subtitle': 'Economize horas de trabalho manual. Foque no que realmente importa: a análise estratégica.',
    'benefits.item1': 'Elimina erros de fórmulas no Excel',
    'benefits.item2': 'Estrutura DRE automaticamente',
    'benefits.item3': 'Fórmulas prontas e auditáveis',
    'benefits.item4': 'Exportação instantânea',
    'benefits.item5': 'Interface intuitiva e moderna',
    'benefits.startFree': 'Começar Gratuitamente',
    
    // CTA
    'cta.title': 'Pronto para automatizar seu Valuation?',
    'cta.subtitle': 'Comece agora mesmo. Sem cadastro, sem pagamento.',
    'cta.button': 'Começar Agora — Grátis',
    
    // Footer
    'footer.desc': 'Automatize projeções financeiras para M&A e Valuation.',
    'footer.product': 'Produto',
    'footer.company': 'Empresa',
    'footer.legal': 'Legal',
    'footer.about': 'Sobre',
    'footer.contact': 'Contato',
    'footer.privacy': 'Privacidade',
    'footer.terms': 'Termos',
    'footer.rights': 'Todos os direitos reservados.',
    
    // App page
    'app.title': 'Constance',
    'app.subtitle': 'Projeções financeiras automatizadas',
    'app.back': 'Voltar',
    'app.rows': 'linhas',
    'app.periods': 'períodos',
  },
  en: {
    // Navbar
    'nav.features': 'Features',
    'nav.howItWorks': 'How It Works',
    'nav.benefits': 'Benefits',
    'nav.startNow': 'Start Now',
    
    // Hero
    'hero.badge': 'Powered by AI',
    'hero.title1': 'Transform your P&L into',
    'hero.title2': 'Financial Projections',
    'hero.subtitle': 'Automate the first stage of valuation. Import historical data, configure assumptions and export Excel with ready formulas in minutes.',
    'hero.import': 'Import your P&L',
    'hero.importDesc': 'Paste from Excel, upload .xlsx or .csv',
    'hero.startValuation': 'Start Valuation',
    
    // Trust indicators
    'trust.free': '100% Free',
    'trust.secure': 'Secure Data',
    'trust.instant': 'Instant Export',
    
    // Stats
    'stats.faster': 'Faster',
    'stats.automated': 'Automated',
    'stats.projections': 'Projections',
    'stats.noErrors': 'Formula Errors',
    
    // Features
    'features.title1': 'Everything you need for',
    'features.title2': 'Valuation',
    'features.subtitle': 'A complete solution to transform historical financial data into professional projections',
    'features.import.title': 'Smart Import',
    'features.import.desc': 'Paste data from Excel, upload .xlsx or .csv files. We automatically detect years and categories.',
    'features.premises.title': 'Configurable Assumptions',
    'features.premises.desc': 'Set revenue growth, margins, costs and taxes. Step-by-step wizard guides the entire process.',
    'features.excel.title': 'Excel with Formulas',
    'features.excel.desc': 'Export complete spreadsheet with historical P&L, assumptions, projections and summary. Working formulas.',
    
    // How it works
    'how.title': 'How It Works',
    'how.subtitle': 'Three simple steps to generate your projections',
    'how.step1.title': 'Import your P&L',
    'how.step1.desc': 'Paste data directly from Excel or upload the file. The system automatically detects years and categorizes accounts.',
    'how.step2.title': 'Configure Assumptions',
    'how.step2.desc': 'Set the number of projected years, growth rates, operating margins and tax rates through the intuitive wizard.',
    'how.step3.title': 'Export to Excel',
    'how.step3.desc': 'Download a complete spreadsheet with history, assumptions, projections and summary tabs. All formulas working.',
    
    // Benefits
    'benefits.title1': 'Built for',
    'benefits.title2': 'M&A and Valuation professionals',
    'benefits.subtitle': 'Save hours of manual work. Focus on what really matters: strategic analysis.',
    'benefits.item1': 'Eliminates formula errors in Excel',
    'benefits.item2': 'Automatically structures P&L',
    'benefits.item3': 'Ready and auditable formulas',
    'benefits.item4': 'Instant export',
    'benefits.item5': 'Intuitive and modern interface',
    'benefits.startFree': 'Start for Free',
    
    // CTA
    'cta.title': 'Ready to automate your Valuation?',
    'cta.subtitle': 'Start right now. No registration, no payment.',
    'cta.button': 'Start Now — Free',
    
    // Footer
    'footer.desc': 'Automate financial projections for M&A and Valuation.',
    'footer.product': 'Product',
    'footer.company': 'Company',
    'footer.legal': 'Legal',
    'footer.about': 'About',
    'footer.contact': 'Contact',
    'footer.privacy': 'Privacy',
    'footer.terms': 'Terms',
    'footer.rights': 'All rights reserved.',
    
    // App page
    'app.title': 'Constance',
    'app.subtitle': 'Automated financial projections',
    'app.back': 'Back',
    'app.rows': 'rows',
    'app.periods': 'periods',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
