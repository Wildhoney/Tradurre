import { Card as AntCard, Space, Typography } from "antd";

import { i18n } from "../../utils";
import { dictionary } from "./index.i18n";
import * as styles from "./styles";
import type { Id } from "./types";
import { menu } from "./utils";

type Props = { id: Id };

export function Card({ id }: Props) {
  const intl = i18n.useI18n(dictionary);

  return (
    <AntCard
      title={
        <Space>
          <span className={styles.emoji}>{menu[id].emoji}</span>
          <span>{intl.copy[`${id}Name`]}</span>
        </Space>
      }
      data-testid={`coffee-${id}`}
    >
      <Typography.Paragraph
        type="secondary"
        className={styles.description}
        data-testid={`coffee-${id}-description`}
      >
        {intl.copy[`${id}Description`]}
      </Typography.Paragraph>

      <Typography.Text
        strong
        className={styles.price}
        data-testid={`coffee-${id}-price`}
      >
        {intl.copy.price({ amount: menu[id].price })}
      </Typography.Text>
    </AntCard>
  );
}
