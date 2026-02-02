import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const About = () => {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-foreground">
          {language === 'pt' ? 'Sobre' : 'About'}
        </h1>
        <p className="text-muted-foreground text-lg">
          {language === 'pt' 
            ? 'Conteúdo em breve...' 
            : 'Content coming soon...'}
        </p>
        <Link to="/">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'pt' ? 'Voltar' : 'Back'}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default About;
