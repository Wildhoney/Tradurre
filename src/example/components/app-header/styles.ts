import { css } from "@emotion/css";

import { colour, font, spacing } from "../../theme";

export const header = css`
  background: ${colour.background.surface};
  border-bottom: 1px solid ${colour.border.subtle};
  padding: ${spacing.m} ${spacing.xl};
  height: auto;
  line-height: ${font.lineHeight.normal};
`;

export const titleBlock = css`
  display: flex;
  align-items: center;
  gap: ${spacing.s};
  min-width: 0;
`;

export const logo = css`
  flex-shrink: 0;
`;

export const titleColumn = css`
  display: flex;
  flex-direction: column;
  gap: ${spacing.xxs};
  min-width: 0;
`;

export const appTitle = css`
  && {
    margin: 0;
    line-height: ${font.lineHeight.tight};
  }
`;

export const tagline = css`
  font-size: ${font.size.s};
  line-height: ${font.lineHeight.snug};
`;

export const languageCol = css`
  display: flex;
  justify-content: flex-end;
`;

export const flagOption = css`
  display: flex;
  align-items: center;
  gap: ${spacing.xs};
`;
