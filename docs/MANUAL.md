# adkbot Manual

## Command Structure

- `adkbot gateway start [--host --port --model --detach]`
- `adkbot gateway stop`
- `adkbot gateway restart [--host --port --model]`
- `adkbot tui [--ws]`
- `adkbot onboard`
- `adkbot manual`

## Gateway Runtime

- Websocket endpoint: `/ws`
- Health endpoint: `/health`
- Default websocket URL: `ws://127.0.0.1:8080/ws`
- PID file: `~/.adkbot/gateway.pid`
- Onboard config: `~/.adkbot/config.json`

## Onboard Flow

- Run `adkbot onboard`.
- Select provider: `google`, `openai`, or `anthropic`.
- Enter model and API key.
- Config is persisted to `~/.adkbot/config.json`.

Current runtime support:

- `google`: fully supported.
- `openai`: config capture only (runtime not implemented yet).
- `anthropic`: config capture only (runtime not implemented yet).

## Websocket Message Types

Client to gateway:

```json
{"type":"chat","content":"Hello adkbot"}
```

```json
{"type":"tools.list"}
```

```json
{"type":"tool","name":"time_now","args":{"timezone":"UTC"}}
```

Gateway responses:

```json
{"type":"chat","data":{"reply":"..."}}
```

```json
{"type":"tool","data":{"name":"time_now","output":{"timezone":"UTC","now":"..."}}}
```

```json
{"type":"error","error":"description"}
```

## Built-in Tooling

- `time_now`: returns RFC3339 time in a timezone
- `http_get`: fetches URL body (up to 4KB)
- `shell_exec`: runs an allowlisted shell command (`date`, `uptime`, `whoami`, `uname -a`, `pwd`)
- `echo`: echoes input
- `cloudinary_upload_remote`: uploads a remote image/video URL using Cloudinary SDK
- `cloudinary_transform_url`: builds transformed Cloudinary delivery URL for image/video
- `gemini_generate_image`: generates image output from prompt via Gemini API
- `gemini_generate_video_job`: starts a Google video generation job with configured endpoint/token

Media environment notes:

- Cloudinary via onboarding or `CLOUDINARY_URL`.
- Gemini image uses Google API key from onboarding or `GOOGLE_API_KEY`.
- Gemini/Google video job requires `GOOGLE_VIDEO_GEN_ENDPOINT` and `GOOGLE_OAUTH_ACCESS_TOKEN`.

## ADK-style Agent Behavior

- Gateway routes chat input to `adkbot` agent.
- Agent queries Gemini.
- If model returns tool-call JSON, the tool runs and the result is fed back for final response.

This gives a practical ADK-like pattern in Go with websocket orchestration.
