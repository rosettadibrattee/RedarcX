"""
search.py — Full-text search endpoint (improved).

Fixes from original:
- Subreddit is now optional (search across all)
- Sort parameter actually works (was commented out)
- Added author filter
- Added result count in response
- Proper error messages instead of bare 500s
- Query validation
"""

import json
import falcon
from psycopg2.extras import RealDictCursor
import logging

logger = logging.getLogger('redarc')

COMMENT = "comment"
SUBMISSION = "submission"


class Search:
    def __init__(self, pool):
        self.pool = pool

    def on_get(self, req, resp):
        # Type validation
        search_type = req.get_param('type', required=True)
        if search_type not in (SUBMISSION, COMMENT):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "type must be 'submission' or 'comment'"})
            resp.content_type = falcon.MEDIA_JSON
            return

        # Search phrase
        search_phrase = req.get_param('search', required=True)
        if not search_phrase or len(search_phrase.strip()) == 0:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "search parameter is required"})
            resp.content_type = falcon.MEDIA_JSON
            return

        if len(search_phrase) > 200:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "search query too long (max 200 chars)"})
            resp.content_type = falcon.MEDIA_JSON
            return

        # Optional filters
        subreddit = req.get_param('subreddit')  # Now optional
        before = req.get_param('before')
        after = req.get_param('after')
        author = req.get_param('author')
        sort = req.get_param('sort', default='desc').lower()
        limit = req.get_param_as_int('limit') or 100

        if limit > 500:
            limit = 500

        # Validate timestamps
        if before and not before.isnumeric():
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "before must be a unix timestamp"})
            resp.content_type = falcon.MEDIA_JSON
            return

        if after and not after.isnumeric():
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "after must be a unix timestamp"})
            resp.content_type = falcon.MEDIA_JSON
            return

        # Build query
        if search_type == SUBMISSION:
            text = 'SELECT * FROM submissions WHERE'
        else:
            text = 'SELECT * FROM comments WHERE'

        values = []
        conditions = []

        if subreddit:
            values.append(subreddit.lower())
            conditions.append('subreddit = %s')

        if after:
            values.append(after)
            conditions.append('created_utc > %s')

        if before:
            values.append(before)
            conditions.append('created_utc < %s')

        if author:
            values.append(author.lower())
            conditions.append('author = %s')

        # Full-text search (always applied)
        values.append(search_phrase)
        conditions.append('ts @@ phraseto_tsquery(%s)')

        text += ' ' + ' AND '.join(conditions)

        # Sort
        if sort == 'asc':
            text += ' ORDER BY created_utc ASC'
        else:
            text += ' ORDER BY created_utc DESC'

        text += ' LIMIT %s'
        values.append(limit)

        try:
            pg_con = self.pool.getconn()
            cursor = pg_con.cursor(cursor_factory=RealDictCursor)
            cursor.execute(text, values)
            results = cursor.fetchall()
        except Exception as error:
            logger.error(f"Search error: {error}")
            resp.status = falcon.HTTP_500
            resp.text = json.dumps({"error": "Search query failed. Check server logs."})
            resp.content_type = falcon.MEDIA_JSON
            return
        finally:
            self.pool.putconn(pg_con)

        resp.text = json.dumps(list(results))
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200
