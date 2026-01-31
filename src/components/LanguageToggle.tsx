import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';

export const LanguageToggle = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-medium transition-colors ${language === 'pt' ? 'text-foreground' : 'text-muted-foreground'}`}>
        PT
      </span>
      <Switch
        checked={language === 'en'}
        onCheckedChange={(checked) => setLanguage(checked ? 'en' : 'pt')}
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-primary"
      />
      <span className={`text-xs font-medium transition-colors ${language === 'en' ? 'text-foreground' : 'text-muted-foreground'}`}>
        EN
      </span>
    </div>
  );
};
