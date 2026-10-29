export async function shareQuoteCard(quote: { text: string; tag: string }): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
    grad.addColorStop(0, '#E9F7FF');
    grad.addColorStop(0.5, '#F4FAFF');
    grad.addColorStop(1, '#EBFDF5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1080);

    ctx.fillStyle = 'rgba(46, 184, 245, 0.14)';
    ctx.beginPath();
    ctx.arc(900, 180, 280, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(94, 230, 176, 0.16)';
    ctx.beginPath();
    ctx.arc(180, 900, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
    ctx.beginPath();
    ctx.roundRect(90, 140, 900, 800, 56);
    ctx.fill();

    ctx.fillStyle = '#1599D4';
    ctx.font = 'bold 28px Inter, sans-serif';
    ctx.fillText(`DAILY BOOST · ${quote.tag.toUpperCase()}`, 160, 260);

    ctx.fillStyle = '#0F2A3A';
    ctx.font = 'bold 54px "Plus Jakarta Sans", sans-serif';

    const words = `"${quote.text}"`.split(' ');
    let line = '';
    let y = 410;
    const maxWidth = 760;
    const lineHeight = 76;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, 160, y);
        line = words[n] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 160, y);

    ctx.fillStyle = '#4F6B7A';
    ctx.font = '600 30px Inter, sans-serif';
    ctx.fillText('UNSTILL · Everyday movement that fits real life', 160, 840);
  }

  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/png'));

  if (blob && navigator.share && navigator.canShare) {
    const file = new File([blob], 'unstill-boost.png', { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      await navigator.share({
        title: 'UnStill Daily Boost',
        text: `"${quote.text}" — UnStill`,
        files: [file],
      });
      return 'Shared!';
    }
  }

  if (navigator.share) {
    await navigator.share({
      title: 'UnStill Daily Boost',
      text: `"${quote.text}" — UnStill`,
    });
    return 'Shared!';
  }

  if (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'unstill-quote.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return 'Quote card downloaded!';
  }

  await navigator.clipboard.writeText(`"${quote.text}" — UnStill`);
  return 'Quote copied to clipboard!';
}
