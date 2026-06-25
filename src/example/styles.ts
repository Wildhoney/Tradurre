import { css } from "@emotion/css";

import { colour, spacing } from "./theme";

export const shell = css`
  min-height: 100vh;
  background: ${colour.background.page};
`;

export const page = css`
  padding: ${spacing.xl} 48px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;
