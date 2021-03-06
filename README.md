# tickets.fri3d.be
Ticket website for Fri3d Camp 2016

**This ships without a real config file, ask Jef for fr1ckets_priv.conf (there be SMTP creds).**

A Python-flask app which generates and interprets both the ticket-ordering form and the administrative pages for the orga team. The pages themselves use bootstrap. Datastore is MySQL (was sqlite, again if possible), mail is sent out in the background to a Celery worker pool over Redis.

To work on it, I propose to use docker. On Linux;

1. *make docker-build* (this takes a while, only needed if the image changes)
2. *make docker-run* (you'll become root within the docker instance)
3. *make docker-test* (inside the docker instance)
  * you're now running the app, browse to http://localhost:8080
4. work on the code, you can work as usual on your git clone, your clone is mounted as /usr/share/fr1ckets/ within the docker instance so any changes are instantly visible
5. */etc/init.d/uwsgi reload* (to pick up and run changed code)
6. ctrl+d ends the docker instance

To roll out, there's a script to generate a .deb;

1.  *make deb*
2. scp it to a server
3. *sudo dpkg -i debfile*
4. *apt-get install -f * (to get any deps you might not have)
5. copy the files in /usr/share/fr1ckets/conf to their respective locations
  * /etc/nginx/sites-enabled/fr1ckets  (update port/hostname to match your situation)
  * /etc/uwsgi/apps-enabled/fr1ckets.ini
  * /etc/supervisor/conf.d/celery.conf
5. restart said daemons
6. create a *fr1ckets* MySQL database/user, load */usr/share/fr1ckets/db/fr1ckets_db.sql*

A succinct walkthrough of the code in *$checkout/src/fr1ckets/*;

* */views.py* generates all the views, *def tickets* dumps the form, *def ticket_register* parses the submit
* */texts.py* contains snippets of user-viewable text used by the backend, at the moment all of the mails
* */model/model.py* does all the database work
* */static/* is in it's entirety copied as $url/static/
  * *js/fr1ckets.js* is all the js code for the ticket form
  * *js/fr1ckets_internal.js* is all the js code for the management code
  * *css/* and *fonts/* comes from the main site repo
* */templates/* holds the templates which are rendered to html with Jinja2
  * *tickets.html* is the motherload, but all the collapsible parts are stuffed by *fr1ckets.js* at run time
