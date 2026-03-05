import copy
import json
import os
import random
import re
import threading
import time
import uuid

import falcon


def _normalize_subreddit(value):
    if value is None:
        return ""
    text = str(value).strip().lower()
    if text.startswith("r/"):
        text = text[2:]
    return text


def _parse_int(value):
    if value is None or value == "":
        return None
    text = str(value).strip()
    if not re.fullmatch(r"-?\d+", text):
        raise ValueError("must be an integer")
    return int(text)


def _split_terms(text):
    word_terms = []
    emoji_terms = []
    token = []
    mode = None

    def flush():
        nonlocal token, mode
        if not token:
            return
        joined = "".join(token)
        if mode == "word":
            word_terms.append(joined.lower())
        else:
            emoji_terms.append(joined)
        token = []
        mode = None

    for ch in text:
        if ch.isspace():
            flush()
            continue
        if ch.isalnum() or ch == "_":
            if mode != "word":
                flush()
                mode = "word"
            token.append(ch)
        else:
            if mode != "symbol":
                flush()
                mode = "symbol"
            token.append(ch)
    flush()

    def looks_like_emoji(piece):
        return any(not c.isalnum() and not c.isspace() for c in piece)

    emoji_terms = [x for x in emoji_terms if looks_like_emoji(x)]
    return word_terms, emoji_terms


def _text_for_search(record, search_type):
    if search_type == "submission":
        return f"{record.get('title', '')} {record.get('self_text', '')} {record.get('url', '')}"
    return record.get("body", "")


def _matches_query(record, search_type, query, match_mode):
    text = _text_for_search(record, search_type)
    lowered = text.lower()
    word_terms, emoji_terms = _split_terms(query)

    if match_mode == "phrase":
        phrase = " ".join(word_terms).strip()
        phrase_ok = True if not phrase else phrase in lowered
        emoji_ok = all(token in text for token in emoji_terms)
        return phrase_ok and emoji_ok and bool(word_terms or emoji_terms)

    tokens = re.findall(r"\w+", lowered, flags=re.UNICODE)

    for term in word_terms:
        term_ok = any(tok.startswith(term) or term in tok for tok in tokens)
        if not term_ok:
            return False

    for token in emoji_terms:
        if token not in text:
            return False

    return bool(word_terms or emoji_terms)


def _relevance_score(record, search_type, query):
    text = _text_for_search(record, search_type)
    lowered = text.lower()
    tokens = re.findall(r"\w+", lowered, flags=re.UNICODE)
    word_terms, emoji_terms = _split_terms(query)
    score = 0

    for term in word_terms:
        for tok in tokens:
            if tok.startswith(term):
                score += 3
            elif term in tok:
                score += 1

    for token in emoji_terms:
        if token in text:
            score += 4

    return score


def _comment_unflatten(comments, root_link_id):
    by_id = {}
    for c in comments:
        item = copy.deepcopy(c)
        item["replies"] = []
        by_id[item["id"]] = item

    tree = []
    for item in by_id.values():
        parent_id = item.get("parent_id")
        if parent_id == root_link_id:
            tree.append(item)
            continue

        parent = by_id.get(parent_id)
        if parent is None:
            tree.append({
                "id": f"missing-{item['id']}",
                "author": "[unknown]",
                "body": "[comment not found]",
                "score": 0,
                "gilded": 0,
                "created_utc": item.get("created_utc", 0),
                "parent_id": root_link_id,
                "link_id": root_link_id,
                "subreddit": item.get("subreddit", "unknown"),
                "replies": [item],
            })
            continue

        parent["replies"].append(item)

    tree.sort(key=lambda x: x.get("created_utc", 0), reverse=True)
    return tree


class DemoStore:
    def __init__(self):
        now = int(time.time())
        self.lock = threading.Lock()
        self.watch = set(["python", "programming"])
        self.unlisted = set()
        self.progress = [
            {
                "job_id": "demo-seed",
                "url": "demo://seed",
                "start_utc": now - 7200,
                "finish_utc": now - 7190,
                "error": None,
            }
        ]
        self.uploads = {}

        self.submissions = [
            {
                "id": "d3mo001",
                "subreddit": "python",
                "title": "Asyncio debugging tips \U0001f680",
                "author": "alice",
                "permalink": "/r/python/comments/d3mo001/asyncio_debugging_tips/",
                "thumbnail": "self",
                "num_comments": 0,
                "url": "https://reddit.com/r/python/comments/d3mo001/asyncio_debugging_tips/",
                "score": 421,
                "gilded": 2,
                "created_utc": now - 3700,
                "self_text": "A practical checklist for deadlocks, task leaks, and event-loop profiling. Includes emoji tests \U0001f605",
                "is_self": True,
            },
            {
                "id": "d3mo002",
                "subreddit": "programming",
                "title": "Rust parser benchmark: partial-token matching at scale",
                "author": "bob",
                "permalink": "/r/programming/comments/d3mo002/rust_parser_benchmark/",
                "thumbnail": "default",
                "num_comments": 0,
                "url": "https://github.com/example/redarc-demo",
                "score": 312,
                "gilded": 1,
                "created_utc": now - 7200,
                "self_text": "",
                "is_self": False,
            },
            {
                "id": "d3mo003",
                "subreddit": "dataisbeautiful",
                "title": "Heatmap of archive growth month-by-month",
                "author": "chartcat",
                "permalink": "/r/dataisbeautiful/comments/d3mo003/archive_growth_heatmap/",
                "thumbnail": "default",
                "num_comments": 0,
                "url": "https://example.org/visuals/archive-growth",
                "score": 188,
                "gilded": 0,
                "created_utc": now - 10800,
                "self_text": "",
                "is_self": False,
            },
            {
                "id": "d3mo004",
                "subreddit": "learnmachinelearning",
                "title": "Fine-tuning notes: token windows and retrieval",
                "author": "mlmentor",
                "permalink": "/r/learnmachinelearning/comments/d3mo004/fine_tuning_notes/",
                "thumbnail": "self",
                "num_comments": 0,
                "url": "https://reddit.com/r/learnmachinelearning/comments/d3mo004/fine_tuning_notes/",
                "score": 95,
                "gilded": 0,
                "created_utc": now - 14400,
                "self_text": "Prompt chunking, reranking, and eval harness notes.",
                "is_self": True,
            },
            {
                "id": "d3mo005",
                "subreddit": "python",
                "title": "Unicode and emoji normalization in search \U0001f680\U0001f525",
                "author": "unicode_wizard",
                "permalink": "/r/python/comments/d3mo005/unicode_emoji_normalization/",
                "thumbnail": "self",
                "num_comments": 0,
                "url": "https://reddit.com/r/python/comments/d3mo005/unicode_emoji_normalization/",
                "score": 267,
                "gilded": 3,
                "created_utc": now - 9600,
                "self_text": "Searching emojis and partial words should feel natural in demo mode.",
                "is_self": True,
            },
            {
                "id": "d3mo006",
                "subreddit": "programming",
                "title": "Building a local-first moderation toolbox",
                "author": "opsgeek",
                "permalink": "/r/programming/comments/d3mo006/local_first_moderation_toolbox/",
                "thumbnail": "default",
                "num_comments": 0,
                "url": "https://news.ycombinator.com/item?id=42000000",
                "score": 143,
                "gilded": 0,
                "created_utc": now - 18000,
                "self_text": "",
                "is_self": False,
            },
        ]

        self.comments = [
            {
                "id": "c3mo001",
                "subreddit": "python",
                "body": "Great checklist, the deadlock section saved me \U0001f680",
                "author": "bytequeen",
                "score": 42,
                "gilded": 0,
                "created_utc": now - 3500,
                "parent_id": "d3mo001",
                "link_id": "d3mo001",
            },
            {
                "id": "c3mo002",
                "subreddit": "python",
                "body": "Same here. Partial token search also works with async now.",
                "author": "traceback_tom",
                "score": 18,
                "gilded": 0,
                "created_utc": now - 3300,
                "parent_id": "c3mo001",
                "link_id": "d3mo001",
            },
            {
                "id": "c3mo003",
                "subreddit": "programming",
                "body": "Rust bench numbers look solid. Any CI reproducibility notes?",
                "author": "clangfan",
                "score": 31,
                "gilded": 1,
                "created_utc": now - 7000,
                "parent_id": "d3mo002",
                "link_id": "d3mo002",
            },
            {
                "id": "c3mo004",
                "subreddit": "learnmachinelearning",
                "body": "Could you share your eval rubric for retrieval quality?",
                "author": "llm_student",
                "score": 21,
                "gilded": 0,
                "created_utc": now - 14000,
                "parent_id": "d3mo004",
                "link_id": "d3mo004",
            },
            {
                "id": "c3mo005",
                "subreddit": "python",
                "body": "Emoji query tests are finally readable \U0001f525\U0001f680",
                "author": "emoji_bot",
                "score": 57,
                "gilded": 2,
                "created_utc": now - 9200,
                "parent_id": "d3mo005",
                "link_id": "d3mo005",
            },
            {
                "id": "c3mo006",
                "subreddit": "programming",
                "body": "Local-first tooling makes incident response much faster.",
                "author": "site_reliability",
                "score": 9,
                "gilded": 0,
                "created_utc": now - 17000,
                "parent_id": "d3mo006",
                "link_id": "d3mo006",
            },
        ]

        self._expand_seed_data(now)
        self._refresh_submission_counts()

    def _expand_seed_data(self, now):
        subreddits = [
            "python",
            "programming",
            "dataisbeautiful",
            "learnmachinelearning",
            "technology",
            "compsci",
            "devops",
            "datascience",
        ]
        title_prefixes = [
            "Practical notes",
            "Deep dive",
            "Benchmark report",
            "Field guide",
            "Design walkthrough",
            "Production postmortem",
            "Optimization tips",
            "Architecture diary",
        ]
        title_topics = [
            "emoji-aware search",
            "partial-word indexing",
            "moderation filters",
            "thread unflattening",
            "upload job telemetry",
            "query relevance tuning",
            "dataset backfill strategy",
            "render deployment fixes",
            "FTS fallback behavior",
            "admin danger-zone review",
        ]
        authors = [
            "alice",
            "bob",
            "chartcat",
            "mlmentor",
            "unicode_wizard",
            "opsgeek",
            "bytequeen",
            "traceback_tom",
            "clangfan",
            "llm_student",
            "emoji_bot",
            "site_reliability",
            "data_dora",
            "infra_ian",
            "qa_quinn",
            "parser_pat",
        ]
        comment_starts = [
            "Nice write-up.",
            "This matches our production findings.",
            "Could you share benchmark inputs?",
            "I reproduced this on my side.",
            "Great catch on the edge case.",
            "This is useful for demo environments.",
            "We saw similar behavior last sprint.",
            "Thanks for documenting this clearly.",
        ]

        synthetic_submissions = []
        synthetic_comments = []
        submission_count = 72

        for idx in range(submission_count):
            sid = f"d3x{idx + 1:04d}"
            subreddit = subreddits[idx % len(subreddits)]
            author = authors[idx % len(authors)]
            created_utc = now - 21600 - (idx * 900)
            is_self = idx % 3 != 0

            prefix = title_prefixes[idx % len(title_prefixes)]
            topic = title_topics[idx % len(title_topics)]
            emoji = " 🚀" if idx % 9 == 0 else (" 🔥" if idx % 11 == 0 else "")
            title = f"{prefix}: {topic}{emoji}"

            if is_self:
                url = f"https://reddit.com/r/{subreddit}/comments/{sid}/demo_post_{idx + 1}/"
                self_text = (
                    f"Long-form notes about {topic}. "
                    f"Covers partial matching, keywords, and emoji handling for realistic demo search."
                )
                thumbnail = "self"
            else:
                url = f"https://example.org/{subreddit}/demo/{idx + 1}"
                self_text = ""
                thumbnail = "default"

            synthetic_submissions.append({
                "id": sid,
                "subreddit": subreddit,
                "title": title,
                "author": author,
                "permalink": f"/r/{subreddit}/comments/{sid}/demo_post_{idx + 1}/",
                "thumbnail": thumbnail,
                "num_comments": 0,
                "url": url,
                "score": 25 + ((idx * 17) % 520),
                "gilded": 1 if idx % 14 == 0 else 0,
                "created_utc": created_utc,
                "self_text": self_text,
                "is_self": is_self,
            })

            root_comments = 3 + (idx % 3)
            first_comment_id = None
            for cidx in range(root_comments):
                cid = f"c3x{idx + 1:04d}{cidx + 1:02d}"
                parent_id = sid if cidx < 2 else f"c3x{idx + 1:04d}{cidx:02d}"
                if first_comment_id is None:
                    first_comment_id = cid
                body = (
                    f"{comment_starts[(idx + cidx) % len(comment_starts)]} "
                    f"Test case {idx + 1}.{cidx + 1} for {topic} with partial tokens and emojis 🚀."
                )
                synthetic_comments.append({
                    "id": cid,
                    "subreddit": subreddit,
                    "body": body,
                    "author": authors[(idx + cidx + 3) % len(authors)],
                    "score": 3 + ((idx * 5 + cidx * 7) % 90),
                    "gilded": 1 if (idx + cidx) % 37 == 0 else 0,
                    "created_utc": created_utc + ((cidx + 1) * 110),
                    "parent_id": parent_id,
                    "link_id": sid,
                })

            if first_comment_id and idx % 4 == 0:
                reply_id = f"c3xr{idx + 1:04d}"
                synthetic_comments.append({
                    "id": reply_id,
                    "subreddit": subreddit,
                    "body": f"Threaded follow-up for demo post {idx + 1}. This helps show nested replies.",
                    "author": authors[(idx + 7) % len(authors)],
                    "score": 2 + (idx % 15),
                    "gilded": 0,
                    "created_utc": created_utc + 700,
                    "parent_id": first_comment_id,
                    "link_id": sid,
                })

        self.submissions.extend(synthetic_submissions)
        self.comments.extend(synthetic_comments)

    def _refresh_submission_counts(self):
        counts = {}
        for c in self.comments:
            link_id = c.get("link_id")
            counts[link_id] = counts.get(link_id, 0) + 1
        for s in self.submissions:
            s["num_comments"] = counts.get(s["id"], 0)

    def get_submissions(self):
        with self.lock:
            self._refresh_submission_counts()
            return copy.deepcopy(self.submissions)

    def get_comments(self):
        with self.lock:
            return copy.deepcopy(self.comments)

    def get_subreddits(self):
        with self.lock:
            self._refresh_submission_counts()
            sub_counts = {}
            com_counts = {}

            for s in self.submissions:
                name = s.get("subreddit")
                sub_counts[name] = sub_counts.get(name, 0) + 1

            for c in self.comments:
                name = c.get("subreddit")
                com_counts[name] = com_counts.get(name, 0) + 1

            names = sorted(set(list(sub_counts.keys()) + list(com_counts.keys())))
            out = []
            for name in names:
                if name in self.unlisted:
                    continue
                out.append({
                    "name": name,
                    "unlisted": False,
                    "num_submissions": sub_counts.get(name, 0),
                    "num_comments": com_counts.get(name, 0),
                })

            return out

    def get_stats(self):
        subs = self.get_subreddits()
        num_subreddits = len(subs)
        total_submissions = sum(s.get("num_submissions", 0) for s in subs)
        total_comments = sum(s.get("num_comments", 0) for s in subs)
        return {
            "subreddits": num_subreddits,
            "submissions": total_submissions,
            "comments": total_comments,
            "total_records": total_submissions + total_comments,
        }

    def record_progress(self, job_id, url, start_utc=None, finish_utc=None, error=None):
        with self.lock:
            self.progress.insert(0, {
                "job_id": job_id,
                "url": url,
                "start_utc": start_utc if start_utc is not None else int(time.time()),
                "finish_utc": finish_utc,
                "error": error,
            })

    def update_progress(self, job_id, **updates):
        with self.lock:
            for item in self.progress:
                if item.get("job_id") == job_id:
                    item.update(updates)
                    break

    def list_progress(self):
        with self.lock:
            return copy.deepcopy(self.progress[:200])

    def create_upload(self, job):
        with self.lock:
            self.uploads[job["id"]] = copy.deepcopy(job)

    def update_upload(self, job_id, **updates):
        with self.lock:
            job = self.uploads.get(job_id)
            if not job:
                return
            job.update(updates)

    def get_upload(self, job_id):
        with self.lock:
            job = self.uploads.get(job_id)
            if not job:
                return None
            return copy.deepcopy(job)

    def list_uploads(self):
        with self.lock:
            jobs = list(self.uploads.values())
        jobs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
        return copy.deepcopy(jobs[:50])

    def delete_by_filters(self, target, subreddit, author=None, keywords=None, after=None, before=None):
        with self.lock:
            if target == "submissions":
                source = self.submissions
                keyword_fields = ("title", "self_text", "url")
            else:
                source = self.comments
                keyword_fields = ("body",)

            matched_ids = []
            for row in source:
                if row.get("subreddit") != subreddit:
                    continue
                if author and row.get("author", "").lower() != author:
                    continue
                created = row.get("created_utc", 0)
                if after is not None and created <= after:
                    continue
                if before is not None and created >= before:
                    continue

                if keywords:
                    combined = " ".join(str(row.get(f, "")) for f in keyword_fields).lower()
                    if keywords.lower() not in combined:
                        continue

                matched_ids.append(row.get("id"))

            if not matched_ids:
                return 0

            match_set = set(matched_ids)
            kept = [r for r in source if r.get("id") not in match_set]

            if target == "submissions":
                self.submissions = kept
                self._refresh_submission_counts()
            else:
                self.comments = kept
                self._refresh_submission_counts()

            return len(matched_ids)


STORE = DemoStore()


def _require_admin_password(req, resp):
    obj = req.get_media() or {}
    admin_pw = (os.getenv("ADMIN_PASSWORD") or "").strip().strip('"').strip("'")
    if admin_pw and obj.get("password") != admin_pw:
        resp.status = falcon.HTTP_401
        resp.text = json.dumps({"error": "Invalid password"})
        resp.content_type = falcon.MEDIA_JSON
        return None
    return obj


class DemoSubreddits:
    def on_get(self, req, resp):
        resp.text = json.dumps(STORE.get_subreddits(), ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoSubmissions:
    def on_get(self, req, resp):
        rows = STORE.get_submissions()

        record_id = req.get_param("id")
        subreddit = _normalize_subreddit(req.get_param("subreddit"))
        after = req.get_param_as_int("after")
        before = req.get_param_as_int("before")

        if not any([record_id, subreddit, after, before]):
            resp.text = json.dumps({"error": "At least one filter parameter is required"})
            resp.content_type = falcon.MEDIA_JSON
            resp.status = falcon.HTTP_400
            return

        out = []
        for row in rows:
            if record_id and row.get("id") != record_id:
                continue
            if subreddit and row.get("subreddit") != subreddit:
                continue
            if after is not None and row.get("created_utc", 0) <= after:
                continue
            if before is not None and row.get("created_utc", 0) >= before:
                continue
            out.append(row)

        reverse = req.get_param("sort") != "ASC"
        out.sort(key=lambda x: x.get("created_utc", 0), reverse=reverse)
        out = out[:100]

        resp.text = json.dumps(out, ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoComments:
    def on_get(self, req, resp):
        rows = STORE.get_comments()

        record_id = req.get_param("id")
        subreddit = _normalize_subreddit(req.get_param("subreddit"))
        after = req.get_param_as_int("after")
        before = req.get_param_as_int("before")
        parent_id = req.get_param("parent_id")
        link_id = req.get_param("link_id")

        if not any([record_id, subreddit, after, before, parent_id, link_id]):
            resp.text = json.dumps({"error": "At least one filter parameter is required"})
            resp.content_type = falcon.MEDIA_JSON
            resp.status = falcon.HTTP_400
            return

        out = []
        for row in rows:
            if record_id and row.get("id") != record_id:
                continue
            if subreddit and row.get("subreddit") != subreddit:
                continue
            if after is not None and row.get("created_utc", 0) <= after:
                continue
            if before is not None and row.get("created_utc", 0) >= before:
                continue
            if parent_id and row.get("parent_id") != parent_id:
                continue
            if link_id and row.get("link_id") != link_id:
                continue
            out.append(row)

        reverse = req.get_param("sort") != "ASC"
        out.sort(key=lambda x: x.get("created_utc", 0), reverse=reverse)

        if not parent_id and not link_id:
            out = out[:500]

        if req.get_param_as_bool("unflatten") is True and link_id:
            out = _comment_unflatten(out, link_id)

        resp.text = json.dumps(out, ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoSearch:
    def _parse_int_param(self, req, name, allow_negative=False):
        raw = req.get_param(name)
        if raw is None or raw == "":
            return None, None
        text = raw.strip()
        if allow_negative:
            if not re.fullmatch(r"-?\d+", text):
                return None, f"{name} must be an integer"
        else:
            if not text.isdigit():
                return None, f"{name} must be an integer"
        return int(text), None

    def on_get(self, req, resp):
        search_type = req.get_param("type", required=True)
        if search_type not in ("submission", "comment"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "type must be 'submission' or 'comment'"})
            resp.content_type = falcon.MEDIA_JSON
            return

        search_phrase = req.get_param("search", required=True)
        if not search_phrase or len(search_phrase.strip()) == 0:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "search parameter is required"})
            resp.content_type = falcon.MEDIA_JSON
            return

        subreddit = _normalize_subreddit(req.get_param("subreddit"))
        before = req.get_param("before")
        after = req.get_param("after")
        author = (req.get_param("author") or "").strip().lower()
        keywords = (req.get_param("keywords") or "").strip()
        domain = (req.get_param("domain") or "").strip().lower()
        is_self = req.get_param("is_self")
        match_mode = (req.get_param("match") or "partial").lower()
        sort_by = req.get_param("sort_by")
        legacy_sort = (req.get_param("sort") or "desc").lower()
        limit = req.get_param_as_int("limit") or 20

        if limit < 1:
            limit = 1
        if limit > 500:
            limit = 500

        offset, err = self._parse_int_param(req, "offset")
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return
        if offset is None:
            offset = 0
        if offset < 0:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "offset must be >= 0"})
            resp.content_type = falcon.MEDIA_JSON
            return

        if not sort_by:
            sort_by = "old" if legacy_sort == "asc" else "new"
        sort_by = sort_by.lower()

        valid_sort = {
            "new", "old",
            "score_desc", "score_asc",
            "gilded_desc", "gilded_asc",
            "num_comments_desc", "num_comments_asc",
            "relevance",
        }
        if sort_by not in valid_sort:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "invalid sort_by value"})
            resp.content_type = falcon.MEDIA_JSON
            return

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

        if match_mode not in ("partial", "phrase"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "match must be partial or phrase"})
            resp.content_type = falcon.MEDIA_JSON
            return

        score_min, err = self._parse_int_param(req, "score_min", allow_negative=True)
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        score_max, err = self._parse_int_param(req, "score_max", allow_negative=True)
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        gilded_min, err = self._parse_int_param(req, "gilded_min")
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        gilded_max, err = self._parse_int_param(req, "gilded_max")
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        num_comments_min, err = self._parse_int_param(req, "num_comments_min")
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        num_comments_max, err = self._parse_int_param(req, "num_comments_max")
        if err:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": err})
            resp.content_type = falcon.MEDIA_JSON
            return

        rows = STORE.get_submissions() if search_type == "submission" else STORE.get_comments()

        filtered = []
        for row in rows:
            if subreddit and row.get("subreddit") != subreddit:
                continue
            created = row.get("created_utc", 0)
            if after and created <= int(after):
                continue
            if before and created >= int(before):
                continue
            if author and row.get("author", "").lower() != author:
                continue
            if score_min is not None and row.get("score", 0) < score_min:
                continue
            if score_max is not None and row.get("score", 0) > score_max:
                continue
            if gilded_min is not None and row.get("gilded", 0) < gilded_min:
                continue
            if gilded_max is not None and row.get("gilded", 0) > gilded_max:
                continue

            if search_type == "submission":
                if num_comments_min is not None and row.get("num_comments", 0) < num_comments_min:
                    continue
                if num_comments_max is not None and row.get("num_comments", 0) > num_comments_max:
                    continue
                if is_self is not None and is_self != "":
                    lowered_self = str(is_self).strip().lower()
                    if lowered_self in ("true", "1", "yes", "on"):
                        target = True
                    elif lowered_self in ("false", "0", "no", "off"):
                        target = False
                    else:
                        resp.status = falcon.HTTP_400
                        resp.text = json.dumps({"error": "is_self must be true or false"})
                        resp.content_type = falcon.MEDIA_JSON
                        return
                    if bool(row.get("is_self")) != target:
                        continue
                if domain and domain not in str(row.get("url", "")).lower():
                    continue

            if not _matches_query(row, search_type, search_phrase, match_mode):
                continue

            if keywords and not _matches_query(row, search_type, keywords, match_mode):
                continue

            filtered.append(row)

        if sort_by == "new":
            filtered.sort(key=lambda x: x.get("created_utc", 0), reverse=True)
        elif sort_by == "old":
            filtered.sort(key=lambda x: x.get("created_utc", 0))
        elif sort_by == "score_desc":
            filtered.sort(key=lambda x: (x.get("score", 0), x.get("created_utc", 0)), reverse=True)
        elif sort_by == "score_asc":
            filtered.sort(key=lambda x: (x.get("score", 0), -x.get("created_utc", 0)))
        elif sort_by == "gilded_desc":
            filtered.sort(key=lambda x: (x.get("gilded", 0), x.get("created_utc", 0)), reverse=True)
        elif sort_by == "gilded_asc":
            filtered.sort(key=lambda x: (x.get("gilded", 0), -x.get("created_utc", 0)))
        elif sort_by == "num_comments_desc":
            if search_type != "submission":
                resp.status = falcon.HTTP_400
                resp.text = json.dumps({"error": "num_comments sorting is only valid for submissions"})
                resp.content_type = falcon.MEDIA_JSON
                return
            filtered.sort(key=lambda x: (x.get("num_comments", 0), x.get("created_utc", 0)), reverse=True)
        elif sort_by == "num_comments_asc":
            if search_type != "submission":
                resp.status = falcon.HTTP_400
                resp.text = json.dumps({"error": "num_comments sorting is only valid for submissions"})
                resp.content_type = falcon.MEDIA_JSON
                return
            filtered.sort(key=lambda x: (x.get("num_comments", 0), -x.get("created_utc", 0)))
        else:
            filtered.sort(
                key=lambda x: (
                    _relevance_score(x, search_type, search_phrase),
                    x.get("created_utc", 0),
                ),
                reverse=True,
            )

        paged = filtered[offset: offset + limit]

        resp.text = json.dumps(paged, ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoStatus:
    def on_get(self, req, resp):
        job_id = req.get_param("job_id")
        progress = STORE.list_progress()
        found = None
        for p in progress:
            if p.get("job_id") == job_id:
                found = p
                break
        resp.text = json.dumps([found], ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoProgress:
    def on_post(self, req, resp):
        obj = req.get_media() or {}
        admin_pw = (os.getenv("ADMIN_PASSWORD") or "").strip().strip('"').strip("'")
        if admin_pw and obj.get("password") != admin_pw:
            resp.text = json.dumps({"error": "Invalid password"})
            resp.content_type = falcon.MEDIA_JSON
            resp.status = falcon.HTTP_401
            return

        resp.text = json.dumps(STORE.list_progress(), ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoStats:
    def on_get(self, req, resp):
        resp.text = json.dumps(STORE.get_stats(), ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoWatch:
    def on_post(self, req, resp):
        obj = _require_admin_password(req, resp)
        if obj is None:
            return

        subreddit = _normalize_subreddit(obj.get("subreddit"))
        action = obj.get("action")
        if not subreddit:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "subreddit is required"})
            resp.content_type = falcon.MEDIA_JSON
            return
        if action not in ("add", "remove"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "action must be add or remove"})
            resp.content_type = falcon.MEDIA_JSON
            return

        with STORE.lock:
            if action == "add":
                STORE.watch.add(subreddit)
            else:
                STORE.watch.discard(subreddit)

        resp.text = json.dumps({"status": "ok"})
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoUnlist:
    def on_post(self, req, resp):
        obj = _require_admin_password(req, resp)
        if obj is None:
            return

        subreddit = _normalize_subreddit(obj.get("subreddit"))
        if not subreddit:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "subreddit is required"})
            resp.content_type = falcon.MEDIA_JSON
            return

        unlist = obj.get("unlist")
        unlist_bool = unlist if isinstance(unlist, bool) else str(unlist).strip().lower() in ("1", "true", "yes", "on")

        with STORE.lock:
            if unlist_bool:
                STORE.unlisted.add(subreddit)
            else:
                STORE.unlisted.discard(subreddit)

        resp.text = json.dumps({"status": "ok"})
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoAdminDelete:
    def _parse_bool(self, value, default=False):
        if value is None:
            return default
        if isinstance(value, bool):
            return value
        text = str(value).strip().lower()
        if text in ("1", "true", "yes", "on"):
            return True
        if text in ("0", "false", "no", "off"):
            return False
        return default

    def on_post(self, req, resp):
        obj = req.get_media() or {}
        dry_run = self._parse_bool(obj.get("dry_run"), default=True)

        target = str(obj.get("target", "submissions")).strip().lower()
        if target not in ("submissions", "comments"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "target must be submissions or comments"})
            resp.content_type = falcon.MEDIA_JSON
            return

        subreddit = _normalize_subreddit(obj.get("subreddit"))
        if not subreddit:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "subreddit is required"})
            resp.content_type = falcon.MEDIA_JSON
            return
        if "," in subreddit or not re.fullmatch(r"[a-z0-9_]+", subreddit):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "Only one valid subreddit is allowed per delete"})
            resp.content_type = falcon.MEDIA_JSON
            return

        author = (obj.get("author") or "").strip().lower() or None
        keywords = (obj.get("keywords") or "").strip() or None
        try:
            after = _parse_int(obj.get("after"))
            before = _parse_int(obj.get("before"))
        except ValueError:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "after and before must be integers"})
            resp.content_type = falcon.MEDIA_JSON
            return

        filters = {
            "target": target,
            "subreddit": subreddit,
            "author": author,
            "keywords": keywords,
            "after": after,
            "before": before,
        }

        preview_rows = self._preview_count(filters)
        if dry_run:
            resp.text = json.dumps({
                "status": "preview",
                "target": target,
                "filters": filters,
                "counts": {"main": preview_rows, "fts": 0},
                "fts_enabled": False,
            }, ensure_ascii=False)
            resp.content_type = falcon.MEDIA_JSON
            resp.status = falcon.HTTP_200
            return

        admin_pw = (os.getenv("ADMIN_PASSWORD") or "").strip().strip('"').strip("'")
        if admin_pw and obj.get("password") != admin_pw:
            resp.status = falcon.HTTP_401
            resp.text = json.dumps({"error": "Invalid password"})
            resp.content_type = falcon.MEDIA_JSON
            return

        if (obj.get("confirm_text") or "").strip() != "DELETE":
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "confirm_text must be DELETE"})
            resp.content_type = falcon.MEDIA_JSON
            return

        deleted = STORE.delete_by_filters(
            target=target,
            subreddit=subreddit,
            author=author,
            keywords=keywords,
            after=after,
            before=before,
        )

        resp.text = json.dumps({
            "status": "deleted",
            "target": target,
            "filters": filters,
            "deleted": {"main": deleted, "fts": 0},
            "fts_enabled": False,
        }, ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200

    def _preview_count(self, filters):
        target = filters["target"]
        rows = STORE.get_submissions() if target == "submissions" else STORE.get_comments()
        count = 0
        for row in rows:
            if row.get("subreddit") != filters["subreddit"]:
                continue
            if filters["author"] and row.get("author", "").lower() != filters["author"]:
                continue
            created = row.get("created_utc", 0)
            if filters["after"] is not None and created <= filters["after"]:
                continue
            if filters["before"] is not None and created >= filters["before"]:
                continue
            if filters["keywords"]:
                if target == "submissions":
                    corpus = f"{row.get('title', '')} {row.get('self_text', '')} {row.get('url', '')}".lower()
                else:
                    corpus = row.get("body", "").lower()
                if filters["keywords"].lower() not in corpus:
                    continue
            count += 1
        return count


class DemoUpload:
    def _extract_fields(self, req):
        fields = {}
        filename = "demo-upload.ndjson"

        media = None
        try:
            media = req.get_media()
        except Exception:
            media = None

        if media is None:
            return fields, filename

        if hasattr(media, "items"):
            for key, value in media.items():
                item = value[0] if isinstance(value, list) and value else value
                key_name = str(key)

                if key_name == "file":
                    detected = getattr(item, "filename", None) or getattr(item, "name", None)
                    if isinstance(detected, bytes):
                        detected = detected.decode("utf-8", errors="replace")
                    if isinstance(detected, str) and detected.strip() and detected.strip().lower() != "file":
                        filename = os.path.basename(detected.strip())
                    continue

                text = None
                if isinstance(item, str):
                    text = item
                elif isinstance(item, bytes):
                    text = item.decode("utf-8", errors="replace")
                else:
                    for attr in ("text", "value"):
                        val = getattr(item, attr, None)
                        if callable(val):
                            try:
                                val = val()
                            except Exception:
                                val = None
                        if isinstance(val, bytes):
                            val = val.decode("utf-8", errors="replace")
                        if isinstance(val, str):
                            text = val
                            break

                if text is not None:
                    fields[key_name] = text

        return fields, filename

    def on_post(self, req, resp):
        fields, filename = self._extract_fields(req)

        pw = fields.get("password") or req.get_param("password") or ""
        ingest_pw = (os.getenv("INGEST_PASSWORD") or "").strip().strip('"').strip("'")
        if ingest_pw and pw != ingest_pw:
            resp.status = falcon.HTTP_401
            resp.text = json.dumps({"error": "Invalid password"})
            resp.content_type = falcon.MEDIA_JSON
            return

        data_type = (fields.get("type") or req.get_param("type") or "auto").strip().lower()
        if data_type not in ("auto", "submissions", "comments"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "type must be auto, submissions, or comments"})
            resp.content_type = falcon.MEDIA_JSON
            return

        target = (fields.get("target") or req.get_param("target") or "both").strip().lower()
        if target not in ("main", "fts", "both"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "target must be main, fts, or both"})
            resp.content_type = falcon.MEDIA_JSON
            return

        on_conflict = (fields.get("on_conflict") or req.get_param("on_conflict") or "skip").strip().lower()
        if on_conflict not in ("skip", "update"):
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"error": "on_conflict must be skip or update"})
            resp.content_type = falcon.MEDIA_JSON
            return

        job_id = uuid.uuid4().hex[:8]
        now = time.time()
        job = {
            "id": job_id,
            "filename": filename,
            "file_size": 0,
            "data_type": data_type,
            "target": target,
            "on_conflict": on_conflict,
            "status": "queued",
            "created_at": now,
            "lines_processed": 0,
            "inserted": 0,
            "skipped": 0,
            "errors": 0,
        }
        STORE.create_upload(job)
        STORE.record_progress(job_id=job_id, url=f"upload://{filename}", start_utc=int(now), finish_utc=None, error=None)

        def finish_job():
            STORE.update_upload(job_id, status="processing", lines_processed=100)
            time.sleep(0.4)
            inserted = random.randint(80, 220)
            STORE.update_upload(
                job_id,
                status="complete",
                lines_processed=inserted,
                inserted=inserted,
                skipped=random.randint(0, 5),
                errors=0,
                finished_at=time.time(),
                subreddits=["python", "programming"],
            )
            STORE.update_progress(job_id, finish_utc=int(time.time()), error=None)

        threading.Thread(target=finish_job, daemon=True).start()

        resp.status = falcon.HTTP_202
        resp.text = json.dumps({
            "status": "accepted",
            "job_id": job_id,
            "filename": filename,
            "file_size": 0,
        }, ensure_ascii=False)
        resp.content_type = falcon.MEDIA_JSON


class DemoUploadStatus:
    def on_get(self, req, resp):
        job_id = req.get_param("job_id")
        if job_id:
            job = STORE.get_upload(job_id)
            if not job:
                resp.status = falcon.HTTP_404
                resp.text = json.dumps({"error": "Job not found"})
                resp.content_type = falcon.MEDIA_JSON
                return
            resp.text = json.dumps(job, ensure_ascii=False)
        else:
            resp.text = json.dumps(STORE.list_uploads(), ensure_ascii=False)

        resp.content_type = falcon.MEDIA_JSON
        resp.status = falcon.HTTP_200


class DemoSubmit:
    def on_post(self, req, resp):
        obj = req.get_media() or {}
        url = obj.get("url")
        pw = obj.get("password")

        ingest_pw = (os.getenv("INGEST_PASSWORD") or "").strip().strip('"').strip("'")
        if ingest_pw and pw != ingest_pw:
            resp.status = falcon.HTTP_401
            resp.text = json.dumps({"status": "invalid password"})
            resp.content_type = falcon.MEDIA_JSON
            return

        if not isinstance(url, str) or not url.strip():
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"status": "invalid url", "url": url or ""})
            resp.content_type = falcon.MEDIA_JSON
            return

        trimmed = url.strip()
        match = re.search(r"/comments/([a-z0-9]+)/", trimmed)
        if not match:
            match = re.search(r"redd\.it/([a-z0-9]+)/?$", trimmed)

        if not match:
            resp.status = falcon.HTTP_400
            resp.text = json.dumps({"status": "invalid url", "url": trimmed})
            resp.content_type = falcon.MEDIA_JSON
            return

        thread_id = match.group(1)
        job_id = f"submit-{thread_id}"
        now = int(time.time())
        STORE.record_progress(job_id=job_id, url=trimmed, start_utc=now, finish_utc=now + 1, error=None)

        resp.status = falcon.HTTP_200
        resp.text = json.dumps({"status": "success", "id": thread_id, "position": 0})
        resp.content_type = falcon.MEDIA_JSON
