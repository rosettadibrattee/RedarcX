import json
import os
import falcon
from psycopg2.extras import RealDictCursor
import logging
logger = logging.getLogger('redarc')

class Watch:
   def __init__(self, pool):
      self.pool = pool

   def on_post(self, req, resp):
      obj = req.get_media() or {}
      subreddit = obj.get('subreddit')
      action = obj.get('action')
      pw = obj.get('password')
      admin_pw = (os.getenv('ADMIN_PASSWORD') or '').strip().strip('"').strip("'")

      if admin_pw and pw != admin_pw:
         resp.status = falcon.HTTP_401
         resp.text = json.dumps({"error": "Invalid password"})
         resp.content_type = falcon.MEDIA_JSON
         return

      if not subreddit:
         resp.status = falcon.HTTP_400
         resp.text = json.dumps({"error": "subreddit is required"})
         resp.content_type = falcon.MEDIA_JSON
         return
      
      if action != "add" and action != "remove":
         resp.status = falcon.HTTP_400
         resp.text = json.dumps({"error": "action must be add or remove"})
         resp.content_type = falcon.MEDIA_JSON
         return
      
      try:
         pg_con = self.pool.getconn()
         cursor = pg_con.cursor(cursor_factory=RealDictCursor)
         if action == "add":
            cursor.execute('INSERT INTO watch(name) VALUES(%s) ON CONFLICT (name) DO NOTHING', [subreddit])
         else:
            cursor.execute('DELETE FROM watch where name = %s', [subreddit])
         pg_con.commit()
      except Exception as error:
         logger.error(error)
         resp.status = falcon.HTTP_500
         return
      finally:
         self.pool.putconn(pg_con)

      resp.text = json.dumps({"status": "ok"})
      resp.content_type = falcon.MEDIA_JSON
      resp.status = falcon.HTTP_200
