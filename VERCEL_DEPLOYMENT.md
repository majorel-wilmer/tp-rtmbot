# VCO - RTM Bot Vercel Deployment

Upload every file and folder in this package to the root of the GitHub repository used by Vercel.

Required root structure:

```text
api/
data/
outputs/
index.html
rollout.html
alerts.html
data-management.html
login.html
script.js
styles.css
server.py
vercel_auth.py
requirements.txt
.python-version
vercel.json
```

Vercel project settings:

- Framework Preset: Other
- Root Directory: the folder containing `vercel.json` and `api/`
- Build Command: leave blank
- Output Directory: leave blank; `vercel.json` uses the project root

Environment variables:

- `VCO_RTM_PASSWORD`: the Data Management password
- `VCO_RTM_AUTH_SECRET`: a long random value

After pushing a new commit, open `/api/health`. It must return:

```json
{"status":"ok","service":"vco-rtm-bot"}
```
