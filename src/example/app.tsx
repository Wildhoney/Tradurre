import { useEffect } from "react";
import { Col, ConfigProvider, Layout, Row, theme } from "antd";

import { i18n } from "./i18n";
import { AppHeader } from "./components/app-header";
import { Card } from "./components/card";
import { dictionary } from "./components/card/index.i18n";
import { ids } from "./components/card/utils";
import * as styles from "./styles";

const { Content } = Layout;

export function App() {
  const { locale } = i18n.useLocale();
  const copy = i18n.useI18n(dictionary);
  const direction = copy.price.direction;

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [direction, locale]);

  return (
    <ConfigProvider
      theme={{ algorithm: theme.defaultAlgorithm }}
      direction={direction}
    >
      <Layout className={styles.shell}>
        <AppHeader />
        <Content className={styles.page}>
          <Row gutter={[24, 24]}>
            {ids.map((id) => (
              <Col key={id} xs={24} sm={12} lg={8}>
                <Card id={id} />
              </Col>
            ))}
          </Row>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}
