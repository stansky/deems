// Keep dark brand surfaces distinct from the page without changing logo colors.
export function companySurface(accent = "#303e51") {
  const channels = accent.slice(1).match(/.{2}/g)?.map(value => parseInt(value, 16) / 255) ?? [];
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  if (luminance < 0.04) {
    return { background: "#34373d", color: "#ffffff", borderColor: "#77808a" };
  }
  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;
  return { background: accent, color: whiteContrast > blackContrast ? "#ffffff" : "#000000" };
}
