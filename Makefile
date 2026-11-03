.PHONY: backend-test backend-lint backend-migrate frontend-build up

up:
	docker compose up --build

backend-test:
	cd backend && pytest

backend-lint:
	cd backend && ruff check app tests && mypy app

backend-migrate:
	cd backend && alembic upgrade head

frontend-build:
	cd frontend && npm run build

