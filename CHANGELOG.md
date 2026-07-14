# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.5.0](https://github.com/Wildhoney/Tradurre/compare/v0.3.0...v0.5.0) (2026-07-14)


### ⚠ BREAKING CHANGES

* format namespace w/ full Intl surface + split constant/template APIs
* drop `direction` field from useI18n bundle; use `locale.getTextInfo().direction`
* require every locale on every entry; drop Mode/onFallback; return { copy, locale, direction } from useI18n

* drop `direction` field from useI18n bundle; use `locale.getTextInfo().direction` ([8399f14](https://github.com/Wildhoney/Tradurre/commit/8399f149c3ced31b9a690b267d05e2549efa4bf9))
* require every locale on every entry; drop Mode/onFallback; return { copy, locale, direction } from useI18n ([fbeddff](https://github.com/Wildhoney/Tradurre/commit/fbeddffc69cf1c5b0f06d322a6bf3c259b6858bd))


### Features

* format namespace w/ full Intl surface + split constant/template APIs ([a974a89](https://github.com/Wildhoney/Tradurre/commit/a974a8933e67adf035680d4f691d637de24ed3fc))
* **provider:** add setLocales and Accept-Language serialisation ([1775887](https://github.com/Wildhoney/Tradurre/commit/17758872f0a927eb512dbb4310c9f87a0ea975ff))
* **template:** default message output to string, widen to ReactNode on demand ([9ca0238](https://github.com/Wildhoney/Tradurre/commit/9ca023848975360101388d187dc49b1cf81739d8))

## [0.4.0](https://github.com/Wildhoney/Tradurre/compare/v0.3.0...v0.4.0) (2026-07-01)


### ⚠ BREAKING CHANGES

* format namespace w/ full Intl surface + split constant/template APIs
* drop `direction` field from useI18n bundle; use `locale.getTextInfo().direction`
* require every locale on every entry; drop Mode/onFallback; return { copy, locale, direction } from useI18n

* drop `direction` field from useI18n bundle; use `locale.getTextInfo().direction` ([8399f14](https://github.com/Wildhoney/Tradurre/commit/8399f149c3ced31b9a690b267d05e2549efa4bf9))
* require every locale on every entry; drop Mode/onFallback; return { copy, locale, direction } from useI18n ([fbeddff](https://github.com/Wildhoney/Tradurre/commit/fbeddffc69cf1c5b0f06d322a6bf3c259b6858bd))


### Features

* format namespace w/ full Intl surface + split constant/template APIs ([a974a89](https://github.com/Wildhoney/Tradurre/commit/a974a8933e67adf035680d4f691d637de24ed3fc))

## [0.3.0](https://github.com/Wildhoney/Tradurre/compare/v0.2.0...v0.3.0) (2026-06-29)


### ⚠ BREAKING CHANGES

* **polyfills:** per-formatter user-supplied loaders, drop built-in dynamic-import to fix Metro/RN bundling

### Features

* **polyfills:** per-formatter user-supplied loaders, drop built-in dynamic-import to fix Metro/RN bundling ([4ce590b](https://github.com/Wildhoney/Tradurre/commit/4ce590b1d24ab00e53307c5251bf62c570087bc4))

## 0.2.0 (2026-06-25)

### ⚠ BREAKING CHANGES

- drop plain string variants — every dictionary entry must be i18n.template({...}) so all resolved values carry .direction/.locale metadata

- drop plain string variants — every dictionary entry must be i18n.template({...}) so all resolved values carry .direction/.locale metadata ([dfc7b70](https://github.com/Wildhoney/Tradurre/commit/dfc7b708e371671e50d247541f77db5106756049))

### Features

- add coffee-menu example app with Ant Design + 5-language switcher ([92b565f](https://github.com/Wildhoney/Tradurre/commit/92b565fecb105605829b2032c0e6d1e119c5c30a))
- add i18n.withI18n(locale, element) test helper ([f02344b](https://github.com/Wildhoney/Tradurre/commit/f02344b0a0b5692c6ed2b300b61fd42484e035d4))
- **example:** add Arabic + Russian + Ukrainian + Georgian + Chinese, with RTL driven off resolved-template metadata ([1b72aaf](https://github.com/Wildhoney/Tradurre/commit/1b72aaf76a5bcea6f8ca83dbda0ebf9a698e95e7))
- expose .direction and .locale on resolved template callables ([0b5c6ae](https://github.com/Wildhoney/Tradurre/commit/0b5c6aed8aa0056805fc8b6a5876e926d8f5e652))
- implement message-first i18n core ([fa1cc31](https://github.com/Wildhoney/Tradurre/commit/fa1cc310aa08380fa71ae6d9bb45105ffa89793f))
- **template:** make `args` optional when `Args` accepts `{}` so token-less templates can be called as copy.foo() ([0b5f898](https://github.com/Wildhoney/Tradurre/commit/0b5f898fa6061417ee573bf57e303e63e77e9bc5))

### Bug Fixes

- **example:** make the language dropdown actually switch locale + stop the header from truncating its title ([bb1dee7](https://github.com/Wildhoney/Tradurre/commit/bb1dee7bd2117e74d23199c17247a204f4002ae0))
