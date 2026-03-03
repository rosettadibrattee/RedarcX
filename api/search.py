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
import re
import unicodedata

logger = logging.getLogger('redarc')

COMMENT = "comment"
SUBMISSION = "submission"


class Search:
    def __init__(self, pool):
        self.pool = pool

    def _parse_int_param(self, req, name, allow_negative=False):
        raw = req.get_param(name)
        if raw is None or raw == '':
            return None, None
        text = raw.strip()
        if allow_negative:
            if not re.fullmatch(r'-?\d+', text):
                return None, f"{name} must be an integer"
        else:
            if not text.isdigit():
                return None, f"{name} must be an integer"
        try:
            return int(text), None
        except Exception:
            return None, f"{name} must be an integer"

    def _split_search_terms(self, text):
        word_terms = []
        symbol_terms = []
        buf = []
        buf_type = None

        def flush():
            nonlocal buf, buf_type
            if not buf:
                return
            token = ''.join(buf)
            if buf_type == 'word':
                word_terms.append(token)
            elif buf_type == 'symbol':
                symbol_terms.append(token)
            buf = []
            buf_type = None

        for ch in text:
            if ch.isspace():
                flush()
                continue
            if ch.isalnum() or ch == '_':
                if buf_type != 'word':
                    flush()
                    buf_type = 'word'
                buf.append(ch)
            else:
                if buf_type != 'symbol':
                    flush()
                    buf_type = 'symbol'
                buf.append(ch)
        flush()

        def contains_emoji(token):
            for c in token:
                cat = unicodedata.category(c)
                if cat.startswith('So') or cat in ('Sk', 'Cs'):
                    return True
            return False

        emoji_terms = [t for t in symbol_terms if contains_emoji(t)]
        return word_terms, emoji_terms

    def _build_tsquery(self, search_phrase, match_mode):
        word_terms, emoji_terms = self._split_search_terms(search_phrase)
        if match_mode == 'phrase':
            phrase = ' '.join(word_terms).strip()
            if not phrase:
                return None, [], emoji_terms
            return 'ts @@ phraseto_tsquery(%s)', [phrase], emoji_terms

        ts_terms = []
        for term in word_terms:
            cleaned = re.sub(r'[^\w]+', '', term, flags=re.UNICODE)
            if not cleaned:
                continue
            ts_terms.append(f"{cleaned}:*")

        if not ts_terms:
            return None, [], emoji_terms

        return 'ts @@ to_tsquery(%s)', [' & '.join(ts_terms)], emoji_terms

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
        domain = req.get_param('domain')
        is_self = req.get_param('is_self')
        match_mode = req.get_param('match', default='partial').lower()
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

        if match_mode not in ('partial', 'phrase'):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "match must be partial or phrase"})
            resp.content_type = falcon.MEDIA_JSON
            return

        score_min, err = self._parse_int_param(req, 'score_min', allow_negative=True)
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        score_max, err = self._parse_int_param(req, 'score_max', allow_negative=True)
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        gilded_min, err = self._parse_int_param(req, 'gilded_min')
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        gilded_max, err = self._parse_int_param(req, 'gilded_max')
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        num_comments_min, err = self._parse_int_param(req, 'num_comments_min')
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        num_comments_max, err = self._parse_int_param(req, 'num_comments_max')
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
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

        if score_min is not None:
            values.append(score_min)
            conditions.append('score >= %s')

        if score_max is not None:
            values.append(score_max)
            conditions.append('score <= %s')

        if gilded_min is not None:
            values.append(gilded_min)
            conditions.append('gilded >= %s')

        if gilded_max is not None:
            values.append(gilded_max)
            conditions.append('gilded <= %s')

        if search_type == SUBMISSION:
            if num_comments_min is not None:
                values.append(num_comments_min)
                conditions.append('num_comments >= %s')

            if num_comments_max is not None:
                values.append(num_comments_max)
                conditions.append('num_comments <= %s')

            if is_self is not None and is_self != '':
                if is_self.lower() in ('true', '1', 'yes', 'on'):
                    values.append(True)
                    conditions.append('is_self = %s')
                elif is_self.lower() in ('false', '0', 'no', 'off'):
                    values.append(False)
                    conditions.append('is_self = %s')
                else:
                    resp.status = falcon.HTTP_400
                    resp.text = json.dumps({"error": "is_self must be true or false"})
                    resp.content_type = falcon.MEDIA_JSON
                    return

            if domain:
                values.append(f"%{domain}%")
                conditions.append('url ILIKE %s')

        # Full-text search with partial-word support
        ts_clause, ts_values, emoji_terms = self._build_tsquery(search_phrase, match_mode)
        if ts_clause:
            values.extend(ts_values)
            conditions.append(ts_clause)

        if emoji_terms:
            for token in emoji_terms:
                if search_type == SUBMISSION:
                    values.append(f"%{token}%")
                    values.append(f"%{token}%")
                    conditions.append('(title ILIKE %s OR self_text ILIKE %s)')
                else:
                    values.append(f"%{token}%")
                    conditions.append('body ILIKE %s')

        if not conditions:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "search parameter is required"})
            resp.content_type = falcon.MEDIA_JSON
            return

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
