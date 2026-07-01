import { Col, Layout, Row, Space, Typography } from "antd";

import logoUrl from "../../assets/logo.png";
import { i18n } from "../../utils";
import { Selector } from "../selector";
import { dictionary } from "./index.i18n";
import * as styles from "./styles";

export function Header() {
  const intl = i18n.useI18n(dictionary);

  return (
    <Layout.Header className={styles.header}>
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} md={16}>
          <div className={styles.brand}>
            <img
              className={styles.logo}
              src={logoUrl}
              alt="Artisan Coffee Co."
              width={44}
              height={44}
            />
            <div className={styles.text}>
              <Typography.Title level={3} className={styles.title}>
                {intl.copy.appTitle}
              </Typography.Title>

              <Typography.Text type="secondary" className={styles.tagline}>
                {intl.copy.tagline}
              </Typography.Text>
            </div>
          </div>
        </Col>
        <Col xs={24} md={8} className={styles.actions}>
          <Space size="middle" align="center" wrap>
            <Typography.Text type="secondary">
              {intl.copy.languageLabel}
            </Typography.Text>

            <Selector />
          </Space>
        </Col>
      </Row>
    </Layout.Header>
  );
}
