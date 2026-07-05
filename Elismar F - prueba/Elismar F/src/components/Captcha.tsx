import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw } from 'lucide-react';

interface CaptchaProps {
  onValidate: (isValid: boolean) => void;
}

export const Captcha: React.FC<CaptchaProps> = ({ onValidate }) => {
  const [captchaText, setCaptchaText] = useState('');
  const [userInput, setUserInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let text = '';
    for (let i = 0; i < 6; i++) {
      text += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptchaText(text);
    setUserInput('');
    onValidate(false);
    return text;
  };

  const drawCaptcha = (text: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.3)`;
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    ctx.font = 'bold 32px Arial';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < text.length; i++) {
      const x = 20 + i * 35;
      const y = 35 + (Math.random() - 0.5) * 10;
      const angle = (Math.random() - 0.5) * 0.4;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = `rgb(${Math.random() * 100}, ${Math.random() * 100}, ${Math.random() * 100})`;
      ctx.fillText(text[i], 0, 0);

      ctx.restore();
    }

    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = `rgba(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}, 0.5)`;
      ctx.fillRect(
        Math.random() * canvas.width,
        Math.random() * canvas.height,
        2,
        2
      );
    }
  };

  useEffect(() => {
    const text = generateCaptcha();
    drawCaptcha(text);
  }, []);

  useEffect(() => {
    if (captchaText) {
      drawCaptcha(captchaText);
    }
  }, [captchaText]);

  const handleRefresh = () => {
    const text = generateCaptcha();
    drawCaptcha(text);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    setUserInput(value);
    onValidate(value === captchaText);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <canvas
          ref={canvasRef}
          width={230}
          height={70}
          className="border-2 border-gray-300 rounded-lg"
        />
        <button
          type="button"
          onClick={handleRefresh}
          className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
          title="Generar nuevo código"
        >
          <RefreshCw className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <input
        type="text"
        value={userInput}
        onChange={handleInputChange}
        placeholder="Ingresa el código"
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
        maxLength={6}
      />
    </div>
  );
};
