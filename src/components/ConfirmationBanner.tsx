import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConfirmationBannerProps {
  onConfirm: () => void;
  onReject: () => void;
}

export const ConfirmationBanner: React.FC<ConfirmationBannerProps> = ({ onConfirm, onReject }) => {
  return (
    <div className="absolute top-2 right-2 z-30 flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-md animate-fade-in">
      <span className="text-xs font-medium text-foreground">Está tudo certo?</span>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1 text-[hsl(var(--positive))] hover:text-[hsl(var(--positive))] hover:bg-[hsl(var(--positive)/0.1)]"
        onClick={onConfirm}
      >
        <CheckCircle2 className="w-3.5 h-3.5" />
        Sim
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onReject}
      >
        <XCircle className="w-3.5 h-3.5" />
        Não
      </Button>
    </div>
  );
};
