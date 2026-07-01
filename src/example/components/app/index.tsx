import { useEffect } from "react";
import { Col, ConfigProvider, Layout, Row, theme } from "antd";

import { i18n } from "../../utils";
import { Card } from "../card";
import { dictionary } from "../card/index.i18n";
import { ids } from "../card/utils";
import { Header } from "../header";
import * as styles from "./styles";

export function App() {
  const intl = i18n.useI18n(dictionary);
  const direction = intl.locale.getTextInfo().direction;

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = intl.locale.baseName;
  }, [direction, intl.locale]);

  return (
    <ConfigProvider
      theme={{ algorithm: theme.defaultAlgorithm }}
      direction={direction}
    >
      <Layout className={styles.container}>
        <Header />
        <Layout.Content className={styles.page}>
          <Row gutter={[24, 24]}>
            {ids.map((id) => (
              <Col key={id} xs={24} sm={12} lg={8}>
                <Card id={id} />
              </Col>
            ))}
          </Row>
        </Layout.Content>
      </Layout>
    </ConfigProvider>
  );
}
