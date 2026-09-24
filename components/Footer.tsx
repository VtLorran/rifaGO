import React from "react";
import { Camera, MessageCircle, ShieldCheck } from "lucide-react";

export function Footer() {
  const whatsappUrl =
    "https://wa.me/5589988341870?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20RifaGO!";
  const instagramUrl =
    "https://www.instagram.com/infobifpicos?stkn=ejF5ZndzcGViMjVt&utm_source=qr";

  return (
    <footer className="w-full bg-[#801818] text-white border-t border-white/10 py-8 px-4 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
        {/* Marca RifaGO */}
        <div>
          <h3 className="text-lg font-extrabold tracking-tight">RifaGO</h3>
          <p className="text-xs text-white/70 mt-1">
            Plataforma prática e segura de rifas e eventos.
          </p>
        </div>

        {/* Links de Ação (Instagram + WhatsApp) */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-xs font-semibold">
          {/* Link do Instagram */}
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2.5 rounded-xl transition-all"
          >
            <Camera className="w-4 h-4 text-pink-400" />
            <span>Siga no Instagram</span>
          </a>

          {/* Link do WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md"
          >
            <MessageCircle className="w-4 h-4 text-emerald-300" />
            <span>Algum problema? Entre em contato</span>
          </a>
        </div>
      </div>

      {/* Linha de Direitos Autorais */}
      <div className="max-w-5xl mx-auto mt-6 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-white/50">
        <p>&copy; 2026 RifaGO. Todos os direitos reservados.</p>
        <div className="flex items-center gap-1 text-emerald-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Pagamentos 100% Seguros via Pix</span>
        </div>
      </div>
    </footer>
  );
}
