import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Zap, Shield, Skull } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen noise-bg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="scanline-overlay" />

      {/* Floating punk elements */}
      <div className="absolute top-20 left-10 text-neon-pink text-6xl animate-float opacity-20 select-none">✕</div>
      <div className="absolute top-40 right-20 text-neon-green text-4xl animate-float opacity-20 select-none" style={{ animationDelay: '1s' }}>⚡</div>
      <div className="absolute bottom-32 left-20 text-neon-yellow text-5xl animate-float opacity-20 select-none" style={{ animationDelay: '2s' }}>☠</div>
      <div className="absolute bottom-20 right-10 text-neon-pink text-3xl animate-float opacity-15 select-none" style={{ animationDelay: '0.5s' }}>✦</div>

      <div className="relative z-10 text-center px-4 max-w-4xl">
        {/* Title */}
        <h1
          className="glitch-text text-7xl md:text-9xl font-bold tracking-tighter mb-2 text-neon-pink"
          data-text="BREAK IT"
        >
          BREAK IT
        </h1>

        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="h-px w-16 bg-neon-green" />
          <span className="text-neon-green text-xs tracking-[0.3em] uppercase">AI Agent Red Teaming</span>
          <div className="h-px w-16 bg-neon-green" />
        </div>

        {/* Tagline */}
        <p className="text-xl md:text-2xl text-foreground mb-2 font-mono">
          Your agent isn't as safe as you think.
        </p>
        <p className="text-muted-foreground text-sm md:text-base mb-12 max-w-lg mx-auto">
          Upload your AI agent. We'll find the cracks. You'll learn to exploit them.
          Then you'll fix them.
        </p>

        {/* CTA */}
        <Button
          onClick={() => navigate('/upload')}
          className="relative bg-neon-pink text-background hover:bg-neon-pink/80 text-lg px-10 py-6 font-bold tracking-wider uppercase animate-pulse-neon border-0 rounded-none"
          size="lg"
        >
          <Skull className="w-5 h-5 mr-2" />
          Upload Your Agent
        </Button>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-4 mt-16">
          {[
            { icon: Shield, text: 'Find Vulnerabilities', color: 'neon-pink' },
            { icon: Zap, text: 'Exploit Guardrails', color: 'neon-green' },
            { icon: Skull, text: 'Learn to Fix Them', color: 'neon-yellow' },
          ].map(({ icon: Icon, text, color }) => (
            <div
              key={text}
              className={`flex items-center gap-2 px-4 py-2 border border-${color}/30 bg-muted/30 text-${color} text-xs uppercase tracking-wider`}
            >
              <Icon className="w-3 h-3" />
              {text}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom tape strip */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-neon-yellow/10 flex items-center overflow-hidden">
        <div className="animate-[scroll_20s_linear_infinite] whitespace-nowrap text-neon-yellow/40 text-xs tracking-widest uppercase">
          {Array(10).fill('⚠ NO AGENT IS SAFE ⚠ BREAK THE RULES ⚠ RED TEAM EVERYTHING ⚠ ').join('')}
        </div>
      </div>
    </div>
  );
};

export default Landing;
