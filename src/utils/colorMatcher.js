export const getDominantColor = (imageSrc) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 60;
      canvas.height = 60;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 60, 60);
      
      const data = ctx.getImageData(0, 0, 60, 60).data;
      let r = 0, g = 0, b = 0, count = 0;
      
      // Sample center pixels to avoid background
      for (let y = 15; y < 45; y++) {
        for (let x = 15; x < 45; x++) {
          const i = (y * 60 + x) * 4;
          // Drop completely white or light grey backgrounds
          if (data[i] > 230 && data[i+1] > 230 && data[i+2] > 230) continue;
          // Drop completely black shadows/backgrounds
          if (data[i] < 20 && data[i+1] < 20 && data[i+2] < 20) continue;

          r += data[i];
          g += data[i+1];
          b += data[i+2];
          count++;
        }
      }
      
      if (count === 0) resolve({ r: 128, g: 128, b: 128 });
      resolve({ r: Math.floor(r / count), g: Math.floor(g / count), b: Math.floor(b / count) });
    };
    img.onerror = () => resolve({ r: 128, g: 128, b: 128 });
    img.src = imageSrc;
  });
};

export const classifyColor = ({ r, g, b }) => {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // Very Dark / Near Black
  if (brightness < 40) return 'dark';
  
  // Very Light / White
  if (brightness > 220) return 'light';

  const r_g = Math.abs(r - g);
  const r_b = Math.abs(r - b);
  const g_b = Math.abs(g - b);
  const isNeutral = r_g < 20 && r_b < 20 && g_b < 20;

  if (isNeutral) {
    if (brightness < 100) return 'dark'; // Charcoal/Grey
    if (brightness > 180) return 'light'; // Off-white/Light Grey
    return 'neutral';
  }
  
  // Blue channel domination (Denim, Navy)
  if (b > r + 15 && b > g + 10) {
    if (brightness < 80) return 'navy';
    return 'blue'; 
  }
  
  // Warm colors (Red, Orange, Yellow, Pink)
  if (r > g + 20 && r > b + 20) return 'warm';
  
  // Earth tones (Olive, Brown, Green)
  if (g > b + 10 && r > b + 5) return 'earth';
  
  return 'neutral';
};

export const calculateMatchScore = (shirt, pant, persona = 'Balanced') => {
  // Score 0-10 on visual aesthetics
  let baseScore = 3; // Default floor

  // -- BASE LOGIC TABLE --
  if (shirt === pant) {
    if (shirt === 'dark' || shirt === 'navy') baseScore = 7;
    else if (shirt === 'neutral') baseScore = 6;
    else if (shirt === 'light') baseScore = 5;
    else baseScore = 3;
  } else if (pant === 'dark' || pant === 'navy') {
    if (shirt === 'light') baseScore = 10;
    else if (shirt === 'neutral') baseScore = 10;
    else if (shirt === 'earth') baseScore = 9;
    else if (shirt === 'blue') baseScore = 8;
    else if (shirt === 'navy') baseScore = 8;
    else if (shirt === 'warm') baseScore = 7;
    else if (shirt === 'dark') baseScore = 7;
  } else if (pant === 'light') {
    if (shirt === 'dark' || shirt === 'navy') baseScore = 10;
    else if (shirt === 'blue') baseScore = 9;
    else if (shirt === 'earth') baseScore = 8;
    else if (shirt === 'neutral') baseScore = 9;
    else if (shirt === 'warm') baseScore = 8;
    else if (shirt === 'light') baseScore = 5;
  } else if (pant === 'blue') {
    if (shirt === 'light') baseScore = 10;
    else if (shirt === 'neutral') baseScore = 10;
    else if (shirt === 'dark' || shirt === 'navy') baseScore = 9;
    else if (shirt === 'warm') baseScore = 7;
    else if (shirt === 'earth') baseScore = 6;
    else if (shirt === 'blue') baseScore = 4;
  } else if (pant === 'earth') {
    if (shirt === 'light') baseScore = 10;
    else if (shirt === 'dark' || shirt === 'navy') baseScore = 10;
    else if (shirt === 'neutral') baseScore = 9;
    else if (shirt === 'blue') baseScore = 7;
    else if (shirt === 'earth') baseScore = 5;
    else if (shirt === 'warm') baseScore = 4;
  } else if (pant === 'neutral') {
    if (shirt === 'dark' || shirt === 'navy') baseScore = 10;
    else if (shirt === 'light') baseScore = 10;
    else if (shirt === 'blue') baseScore = 10;
    else if (shirt === 'warm') baseScore = 8;
    else if (shirt === 'earth') baseScore = 8;
    else if (shirt === 'neutral') baseScore = 5;
  } else if (pant === 'warm') {
    if (shirt === 'light') baseScore = 10;
    else if (shirt === 'dark' || shirt === 'navy') baseScore = 10;
    else if (shirt === 'neutral') baseScore = 9;
    else if (shirt === 'blue') baseScore = 7;
    else if (shirt === 'earth') baseScore = 5;
    else if (shirt === 'warm') baseScore = 4;
  }

  // -- PERSONA-SPECIFIC ADJUSTMENTS --
  if (persona === 'Minimalist') {
    // Boost monochromatic & neutrals. Penalize bright colors.
    if (shirt === pant) baseScore += 2;
    if (shirt === 'warm' || pant === 'warm') baseScore -= 4;
    if (shirt === 'earth' || pant === 'earth') baseScore -= 1;
  } else if (persona === 'Bold') {
    // Boost vibrancy & high contrast. Penalize same-same.
    if (shirt === 'warm' || pant === 'warm') baseScore += 3;
    if (shirt === pant && shirt !== 'dark') baseScore -= 3;
  } else if (persona === 'Professional') {
    // Boost Dark/Neutral pairings. Penalize warm/casual.
    if (shirt === 'warm' || pant === 'warm') baseScore -= 6;
    if (pant === 'dark' && (shirt === 'light' || shirt === 'neutral')) baseScore += 1;
  }

  return Math.min(10, Math.max(0, baseScore));
};
