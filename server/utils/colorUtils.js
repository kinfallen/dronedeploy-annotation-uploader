const DRONEDEPLOY_COLORS = [
  { name: 'Red', color: '#f34235', fillColor: '#f67168' },
  { name: 'Lime Green', color: '#ccdb38', fillColor: '#d9e46a' },
  { name: 'Cyan', color: '#00bbd3', fillColor: '#40ccde' },
  { name: 'Magenta', color: '#f50057', fillColor: '#f84081' },
  { name: 'Orange', color: '#fe9700', fillColor: '#feb140' },
  { name: 'Gold', color: '#fec006', fillColor: '#fed044' },
  { name: 'Green', color: '#4bae4f', fillColor: '#78c27b' },
  { name: 'Teal', color: '#009587', fillColor: '#40b0a5' },
  { name: 'Dark Purple', color: '#9b26af', fillColor: '#b45cc3' },
  { name: 'Amethyst', color: '#6639b6', fillColor: '#8c6bc8' }
];

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function colorDistance(color1, color2) {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  if (!c1 || !c2) return Infinity;

  const rDiff = c1.r - c2.r;
  const gDiff = c1.g - c2.g;
  const bDiff = c1.b - c2.b;
  const rgbDistance = Math.sqrt(2 * rDiff * rDiff + 4 * gDiff * gDiff + 3 * bDiff * bDiff);

  const hsl1 = rgbToHsl(c1.r, c1.g, c1.b);
  const hsl2 = rgbToHsl(c2.r, c2.g, c2.b);

  let hueDiff = Math.abs(hsl1.h - hsl2.h);
  hueDiff = Math.min(hueDiff, 360 - hueDiff);

  const hslDistance = Math.sqrt(
    Math.pow(hueDiff * 2, 2) +
    Math.pow(hsl1.s - hsl2.s, 2) +
    Math.pow((hsl1.l - hsl2.l) * 0.5, 2)
  );

  return rgbDistance * 0.7 + hslDistance * 0.3;
}

function findNearestDroneDeployColor(inputColor) {
  let nearestColor = DRONEDEPLOY_COLORS[0];
  let minDistance = colorDistance(inputColor, nearestColor.color);

  for (const ddColor of DRONEDEPLOY_COLORS) {
    const distance = colorDistance(inputColor, ddColor.color);
    if (distance < minDistance) {
      minDistance = distance;
      nearestColor = ddColor;
    }
  }

  return nearestColor;
}

function standardizeAnnotationColors(annotation, forceStandardColors) {
  if (!forceStandardColors) return annotation;

  if (!annotation.color) {
    annotation.color = '#6639b6';
  }

  const nearestColor = findNearestDroneDeployColor(annotation.color);
  annotation.color = nearestColor.color;

  if (!annotation.fillColor) {
    annotation.fillColor = nearestColor.fillColor;
  } else {
    const nearestFillColor = findNearestDroneDeployColor(annotation.fillColor);
    annotation.fillColor = nearestFillColor.fillColor;
  }

  return annotation;
}

module.exports = {
  DRONEDEPLOY_COLORS,
  hexToRgb,
  rgbToHsl,
  colorDistance,
  findNearestDroneDeployColor,
  standardizeAnnotationColors
};
