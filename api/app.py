"""
app.py — RedArc API server.
"""

import os
import sys

import falcon
import psycopg2
from dotenv import load_dotenv
from redis import Redis
from rq import Queue

import redarc_logger
from admin_delete import AdminDelete
from comments import Comments
from media import Media
from progress import Progress
from search import Search
from status import Status
from submissions import Submissions
from submit import Submit
from subreddits import Subreddits
from unlist import Unlist
from upload import Upload, UploadStatus, Stats
from watch import Watch


logger = redarc_logger.init_logger("redarc")
logger.info("Starting redarc...")

load_dotenv()


def env_bool(name, default=False):
    raw = os.getenv(name)
    if raw is None:
        return default
    return str(raw).strip().lower() in ("1", "true", "yes", "on")


def _safe_port(value, fallback="5432"):
    text = str(value or fallback).strip()
    return text if text.isdigit() else fallback


def _first_env(*names):
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return None


def build_pool(min_conn, max_conn, *, dsn_names=None, user_env=None, password_env=None, host_env=None, port_env=None, db_env=None):
    dsn_names = dsn_names or []
    dsn = _first_env(*dsn_names)
    if dsn:
        return psycopg2.pool.SimpleConnectionPool(min_conn, max_conn, dsn=dsn)

    return psycopg2.pool.SimpleConnectionPool(
        min_conn,
        max_conn,
        user=os.getenv(user_env),
        password=os.getenv(password_env),
        host=os.getenv(host_env),
        port=_safe_port(os.getenv(port_env)),
        database=os.getenv(db_env),
    )


# ---- CORS Middleware ----
class CORSMiddleware:
    def process_response(self, req, resp, resource, req_succeeded):
        origin = req.get_header("Origin")
        if origin:
            resp.set_header("Access-Control-Allow-Origin", origin)
        else:
            resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        resp.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        resp.set_header("Access-Control-Max-Age", "86400")

    def process_request(self, req, resp):
        if req.method == "OPTIONS":
            resp.status = falcon.HTTP_200
            raise falcon.HTTPStatus(falcon.HTTP_200)


DEMO_MODE = env_bool("DEMO", False)
SEARCH_ENABLED = env_bool("SEARCH_ENABLED", True)
INGEST_ENABLED = env_bool("INGEST_ENABLED", True)

# ---- Database Connections ----
pg_pool = None
pgfts_pool = None

if DEMO_MODE:
    logger.warning("DEMO mode enabled. Database and Redis backends are replaced with in-memory mock data.")
else:
    try:
        pg_pool = build_pool(
            1,
            20,
            dsn_names=["PG_DSN", "DATABASE_URL"],
            user_env="PG_USER",
            password_env="PG_PASSWORD",
            host_env="PG_HOST",
            port_env="PG_PORT",
            db_env="PG_DATABASE",
        )
    except Exception as error:
        logger.error(f"Failed to initialize primary Postgres pool: {error}")
        sys.exit(4)

    if SEARCH_ENABLED:
        try:
            pgfts_pool = build_pool(
                1,
                20,
                dsn_names=["PGFTS_DSN", "PGFTS_URL", "DATABASE_URL_FTS"],
                user_env="PGFTS_USER",
                password_env="PGFTS_PASSWORD",
                host_env="PGFTS_HOST",
                port_env="PGFTS_PORT",
                db_env="PGFTS_DATABASE",
            )
        except Exception as error:
            pgfts_pool = None
            SEARCH_ENABLED = False
            logger.error(f"Failed to initialize FTS Postgres pool: {error}")
            logger.warning("SEARCH_ENABLED=true but FTS DB is unavailable. /search route disabled.")


# ---- App Setup ----
app = application = falcon.App(
    middleware=[CORSMiddleware()],
    cors_enable=True,
)

# Multipart form handling — try to register if available (Falcon 3.1+)
try:
    import falcon.media.multipart

    app.req_options.media_handlers[falcon.MEDIA_MULTIPART] = falcon.media.multipart.MultipartFormHandler()
except (ImportError, AttributeError):
    logger.warning("falcon.media.multipart not available — file upload will use raw stream parsing")


# ---- Resource Instances ----
if DEMO_MODE:
    from demo_mode import (
        DemoAdminDelete,
        DemoComments,
        DemoProgress,
        DemoSearch,
        DemoStats,
        DemoStatus,
        DemoSubmit,
        DemoSubmissions,
        DemoSubreddits,
        DemoUnlist,
        DemoUpload,
        DemoUploadStatus,
        DemoWatch,
    )

    comments = DemoComments()
    subreddits = DemoSubreddits()
    progress = DemoProgress()
    submissions = DemoSubmissions()
    status = DemoStatus()
    media = Media(os.getenv("IMAGE_PATH", "/tmp"))
    unlist = DemoUnlist()
    watch = DemoWatch()
    admin_delete = DemoAdminDelete()
    stats = DemoStats()
    upload = DemoUpload()
    upload_status = DemoUploadStatus()
    search = DemoSearch()
    submit = DemoSubmit()
else:
    comments = Comments(pg_pool)
    subreddits = Subreddits(pg_pool)
    progress = Progress(pg_pool)
    submissions = Submissions(pg_pool)
    status = Status(pg_pool)
    media = Media(os.getenv("IMAGE_PATH"))
    unlist = Unlist(pg_pool)
    watch = Watch(pg_pool)
    admin_delete = AdminDelete(pg_pool, pgfts_pool)
    stats = Stats(pg_pool)
    upload = Upload(pg_pool, pgfts_pool)
    upload_status = UploadStatus()


# ---- Routes ----
app.add_route("/search/comments", comments)
app.add_route("/search/submissions", submissions)
app.add_route("/search/subreddits", subreddits)
app.add_route("/progress", progress)
app.add_route("/status", status)
app.add_route("/media", media)
app.add_route("/unlist", unlist)
app.add_route("/watch", watch)
app.add_route("/admin/delete", admin_delete)
app.add_route("/stats", stats)
app.add_route("/upload", upload)
app.add_route("/upload/status", upload_status)

if DEMO_MODE or (SEARCH_ENABLED and pgfts_pool):
    app.add_route("/search", search)

if DEMO_MODE:
    app.add_route("/submit", submit)
elif INGEST_ENABLED:
    try:
        redis_conn = Redis(
            host=os.getenv("REDIS_HOST"),
            port=int(_safe_port(os.getenv("REDIS_PORT"), fallback="6379")),
        )
        url_queue = Queue("url_submit", connection=redis_conn)
        submit = Submit(url_queue)
        app.add_route("/submit", submit)
    except Exception as error:
        logger.error(error)
        logger.warning("INGEST_ENABLED=true but Redis is unavailable. /submit route disabled.")

logger.info("RedArc API ready.")
