FROM node:20-alpine3.19

RUN apk update
RUN apk add --no-cache bash nginx python3 py3-pip postgresql-client

RUN mkdir -p /redarc
WORKDIR /redarc
COPY . .

RUN pip install --break-system-packages gunicorn falcon rq python-dotenv psycopg2-binary redis zstandard

WORKDIR /redarc/frontend
RUN npm install

WORKDIR /redarc
RUN chmod +x scripts/start.sh
CMD ["/bin/bash", "scripts/start.sh"]
