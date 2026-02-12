import json
import os
import falcon
from psycopg2.extras import RealDictCursor
import logging
logger = logging.getLogger('redarc')

class Unlist:
   def __init__(self, pool):
      self.pool = pool

   def on_post(self, req, resp):
      obj = req.get_media() or {}
      subreddit = obj.get('subreddit')
      unlist = obj.get('unlist')
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
       
      try:
         pg_con = self.pool.getconn()
         cursor = pg_con.cursor(cursor_factory=RealDictCursor)
         cursor.execute('UPDATE subreddits SET unlisted = %s WHERE name = %s', [unlist, subreddit])
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
