import { Col, Layout, Row, Select, Space, Typography } from "antd";
import { CircleFlag } from "react-circle-flags";

import logoUrl from "../../assets/logo.png";
import { Locale, i18n } from "../../i18n";
import { dictionary } from "./index.i18n";
import * as styles from "./styles";
import { FLAG_FOR, NATIVE_LABEL } from "./utils";

const { Header } = Layout;
const { Title, Text } = Typography;

const languageOptions = (Object.keys(NATIVE_LABEL) as Locale[]).map((code) => ({
  value: code,
  label: (
    <div className={styles.flagOption}>
      <CircleFlag countryCode={FLAG_FOR[code]} width={18} height={18} />
      <span>{NATIVE_LABEL[code]}</span>
    </div>
  ),
}));

export function AppHeader() {
  const { locale, setLocale } = i18n.useLocale();
  const copy = i18n.useI18n(dictionary);

  return (
    <Header className={styles.header}>
      <Row gutter={[24, 16]} align="middle">
        <Col xs={24} md={16}>
          <div className={styles.titleBlock}>
            <img
              className={styles.logo}
              src={logoUrl}
              alt="Artisan Coffee Co."
              width={44}
              height={44}
            />
            <div className={styles.titleColumn}>
              <Title level={3} className={styles.appTitle}>
                {copy.appTitle}
              </Title>
              <Text type="secondary" className={styles.tagline}>
                {copy.tagline}
              </Text>
            </div>
          </div>
        </Col>
        <Col xs={24} md={8} className={styles.languageCol}>
          <Space size="middle" align="center" wrap>
            <Text type="secondary">{copy.languageLabel}</Text>
            <Select
              value={locale}
              onChange={setLocale}
              options={languageOptions}
              style={{ width: 220 }}
              listHeight={languageOptions.length * 36}
              popupMatchSelectWidth={false}
              data-testid="language-select"
            />
          </Space>
        </Col>
      </Row>
    </Header>
  );
}
