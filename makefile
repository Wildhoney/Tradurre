unit:
	npx vitest run

unit-coverage:
	npx vitest run --coverage

circular:
	npx madge --circular src/index.ts

typecheck:
	npx tsc --noEmit

build:
	pnpm run build

fmt:
	npx prettier --write .

lint:
	npx eslint --fix src/

test:
	make unit

checks:
	make fmt
	make lint
	make typecheck
	make circular
	make build
	make unit-coverage

deploy:
	pnpm install --frozen-lockfile
	make checks
	npx commit-and-tag-version
	pnpm publish --access public
	git push
	git push --tags
