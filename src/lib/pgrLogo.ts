/**
 * Gerador de Logo EngTech e Ilustrações de Capa em Canvas de Alta Resolução
 */

export function getEngTechLogoDataUrl(compact = false): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  if (compact) {
    // Dimensões compactas para o cabeçalho das páginas (44mm x 18mm aprox)
    canvas.width = 440;
    canvas.height = 160;

    // Ícone EngTech (cubo/esfera estilizada em verde e cores)
    const iconSize = 70;
    const ix = 15;
    const iy = 45;

    // Fundo do ícone
    ctx.fillStyle = "#1e7e34";
    ctx.beginPath();
    ctx.roundRect(ix, iy, iconSize, iconSize, 16);
    ctx.fill();

    // Detalhes internos coloridos do ícone (amarelo, azul, vermelho, branco)
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(ix + 24, iy + 24, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(ix + 46, iy + 24, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(ix + 24, iy + 46, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ix + 46, iy + 46, 10, 0, Math.PI * 2);
    ctx.fill();

    // Texto EngTech
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillStyle = "#1e7e34";
    ctx.fillText("Eng", ix + iconSize + 15, iy + 36);

    ctx.fillStyle = "#1e293b";
    ctx.fillText("Tech", ix + iconSize + 100, iy + 36);

    // Subtítulo
    ctx.font = "normal 17px Arial, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText("Serviços e Consultorias em", ix + iconSize + 15, iy + 58);
    ctx.fillStyle = "#1e7e34";
    ctx.fillText("Saúde e Segurança do Trabalho", ix + iconSize + 15, iy + 77);
  } else {
    // Logo grande para a capa
    canvas.width = 750;
    canvas.height = 240;

    const iconSize = 110;
    const ix = 20;
    const iy = 65;

    ctx.fillStyle = "#1e7e34";
    ctx.beginPath();
    ctx.roundRect(ix, iy, iconSize, iconSize, 24);
    ctx.fill();

    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(ix + 36, iy + 36, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#38bdf8";
    ctx.beginPath();
    ctx.arc(ix + 74, iy + 36, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(ix + 36, iy + 74, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(ix + 74, iy + 74, 15, 0, Math.PI * 2);
    ctx.fill();

    // Texto
    ctx.font = "bold 64px Arial, sans-serif";
    ctx.fillStyle = "#1e7e34";
    ctx.fillText("Eng", ix + iconSize + 25, iy + 52);

    ctx.fillStyle = "#1e293b";
    ctx.fillText("Tech", ix + iconSize + 148, iy + 52);

    ctx.font = "normal 24px Arial, sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText("Serviços e Consultorias em", ix + iconSize + 25, iy + 84);
    ctx.fillStyle = "#1e7e34";
    ctx.fillText("Saúde e Segurança do Trabalho", ix + iconSize + 25, iy + 112);
  }

  return canvas.toDataURL("image/png");
}

/** Gera ilustração de capa em canvas de alta resolução */
export function getCoverIllustrationFallbackDataUrl(): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 650;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Fundo limpo
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Ondas dinâmicas verde e amarela
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 480);
  ctx.bezierCurveTo(250, 420, 500, 620, 900, 450);
  ctx.lineTo(900, 650);
  ctx.lineTo(0, 650);
  ctx.closePath();
  ctx.fillStyle = "#eab308";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 510);
  ctx.bezierCurveTo(300, 460, 550, 640, 900, 490);
  ctx.lineTo(900, 650);
  ctx.lineTo(0, 650);
  ctx.closePath();
  ctx.fillStyle = "#22c55e";
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 540);
  ctx.bezierCurveTo(350, 500, 600, 660, 900, 530);
  ctx.lineTo(900, 650);
  ctx.lineTo(0, 650);
  ctx.closePath();
  ctx.fillStyle = "#1e7e34";
  ctx.fill();
  ctx.restore();

  // Prancheta SST
  ctx.save();
  ctx.translate(280, 200);
  ctx.fillStyle = "#d1d5db";
  ctx.beginPath();
  ctx.roundRect(0, 0, 180, 240, 12);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(15, 25, 150, 200);

  // Linhas da prancheta
  ctx.fillStyle = "#1e7e34";
  ctx.fillRect(25, 50, 20, 6);
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(55, 50, 95, 6);

  ctx.fillStyle = "#1e7e34";
  ctx.fillRect(25, 75, 20, 6);
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(55, 75, 95, 6);

  ctx.fillStyle = "#1e7e34";
  ctx.fillRect(25, 100, 20, 6);
  ctx.fillStyle = "#9ca3af";
  ctx.fillRect(55, 100, 95, 6);

  // Grampo superior
  ctx.fillStyle = "#4b5563";
  ctx.beginPath();
  ctx.roundRect(60, -10, 60, 25, 6);
  ctx.fill();
  ctx.restore();

  // Capacete amarelo de segurança
  ctx.save();
  ctx.translate(450, 210);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(100, 100, 80, Math.PI, 0, false);
  ctx.fill();

  // Aba do capacete
  ctx.beginPath();
  ctx.ellipse(100, 100, 95, 20, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nervura central
  ctx.fillStyle = "#eab308";
  ctx.fillRect(92, 20, 16, 80);

  // Faixa reflexiva
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(40, 85, 120, 10);
  ctx.restore();

  // Maleta de primeiros socorros
  ctx.save();
  ctx.translate(220, 340);
  ctx.fillStyle = "#15803d";
  ctx.beginPath();
  ctx.roundRect(0, 0, 130, 95, 10);
  ctx.fill();

  // Alça da maleta
  ctx.strokeStyle = "#166534";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(65, 0, 22, Math.PI, 0, false);
  ctx.stroke();

  // Cruz branca de primeiros socorros
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(55, 25, 20, 45);
  ctx.fillRect(42, 38, 46, 20);
  ctx.restore();

  return canvas.toDataURL("image/png");
}
