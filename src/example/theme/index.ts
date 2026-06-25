export const colour = {
  background: {
    surface: "#fff",
    page: "transparent",
  },
  border: {
    subtle: "#f0f0f0",
  },
  text: {
    primary: "rgba(0, 0, 0, 0.88)",
    secondary: "rgba(0, 0, 0, 0.45)",
  },
} as const;

export const spacing = {
  xxs: "2px",
  xs: "8px",
  s: "12px",
  m: "16px",
  l: "24px",
  xl: "32px",
} as const;

export const font = {
  family:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  size: {
    s: "13px",
    m: "16px",
    l: "20px",
    xl: "22px",
  },
  lineHeight: {
    tight: "1.2",
    snug: "1.4",
    normal: "normal",
  },
} as const;
