# API Contract 文档

本文档基于当前 **Streamlit 前端**（`frontend/utils/request_api.py`、`frontend/utils/backend.py`）与 **FastAPI 后端**（`backend/main.py`、`backend/api_schemas.py`）整理，供 React 前端重建时对接使用。

**Base URL**: 由前端配置决定，例如 `http://localhost:8000/`（末尾建议带 `/`）。

---

## 1. 认证 (Auth)

### 1.1 POST `/auth/register`

- **Method**: `POST`
- **Path**: `/auth/register`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 至少 3 个字符 |
| `password` | string | ✅ | 至少 6 个字符 |

示例：`{"username": "alice", "password": "secret123"}`

**Response — 成功 (200)**  
```json
{ "token": "<jwt>", "username": "alice" }
```

**Response — 失败**  
- `400`: `{"detail": "Username must be at least 3 characters"}` 或 `"Password must be at least 6 characters"`
- `409`: `{"detail": "Username already exists"}`

**认证**: None  
**前端错误处理**: 展示 `detail`；409 时提示用户名已存在并引导登录。

---

### 1.2 POST `/auth/login`

- **Method**: `POST`
- **Path**: `/auth/login`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | ✅ | 用户名 |
| `password` | string | ✅ | 密码 |

示例：`{"username": "alice", "password": "secret123"}`

**Response — 成功 (200)**  
```json
{ "token": "<jwt>", "username": "alice" }
```

**Response — 失败**  
- `401`: `{"detail": "Invalid username or password"}`

**认证**: None  
**Token 存放建议**: 登录/注册成功后把 `token` 存到 **memory + 持久化**（如 `localStorage` 的 `auth_token`），请求需认证的接口时放在 `Authorization: Bearer <token>`。  
**前端错误处理**: 401 时提示账号或密码错误；网络错误时提示检查后端连接。

---

### 1.3 GET `/auth/me`

- **Method**: `GET`
- **Path**: `/auth/me`

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "username": "alice" }
```

**Response — 失败**  
- `401`: `{"detail": "Invalid or expired token"}`

**认证**: **JWT** — Header: `Authorization: Bearer <token>`  
**Token 存放建议**: 同 1.2；401 时清除本地 token 并**跳转登录**。  
**前端错误处理**: 401 → 清除 token、跳转登录；其他错误可重试一次再提示。

---

### 1.4 DELETE `/auth/user`

- **Method**: `DELETE`
- **Path**: `/auth/user`

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "ok": true }
```

**Response — 失败**  
- `401`: `{"detail": "Invalid or expired token"}`
- `404`: `{"detail": "User not found"}`

**认证**: **JWT** — `Authorization: Bearer <token>`  
**前端错误处理**: 成功后清除 token 并跳转登录/首页；401 同 1.3；404 提示用户不存在。

---

## 2. 配置与静态数据

### 2.1 GET `/config`

- **Method**: `GET`
- **Path**: `/config`

**Request body**: 无

**Response — 成功 (200)**  
返回应用配置对象，包含但不限于：

- `skill_levels`: string[]
- `default_session_count`: number
- `default_llm_type`: string
- `default_method_name`: string
- `motivational_trigger_interval_secs`: number
- `max_refinement_iterations`: number
- `mastery_threshold_default`: number
- `mastery_threshold_by_proficiency`: Record<string, number>
- `quiz_mix_by_proficiency`: Record<string, QuizMix>
- `fslsm_thresholds`: Record<string, FslsmDimensionConfig>

**Response — 失败**: 无（当前实现不返回错误码）

**认证**: None  
**前端错误处理**: 可缓存到内存/Context；失败时使用本地默认配置并可选提示“部分配置加载失败”。

---

### 2.2 GET `/personas`

- **Method**: `GET`
- **Path**: `/personas`

**Request body**: 无

**Response — 成功 (200)**  
```json
{
  "personas": {
    "Hands-on Explorer": { "description": "...", "fslsm_dimensions": { ... } },
    ...
  }
}
```

**认证**: None  
**前端错误处理**: 失败时使用前端内置的 PERSONAS 兜底（与当前 Streamlit 一致）。

---

### 2.3 GET `/list-llm-models`

- **Method**: `GET`
- **Path**: `/list-llm-models`

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "models": [ { "model_name": "...", "model_provider": "..." } ] }
```

**Response — 失败**: `500` 时 `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败时返回空数组并可选提示。

---

## 3. 用户状态 (User State)

### 3.1 GET `/user-state/{user_id}`

- **Method**: `GET`
- **Path**: `/user-state/{user_id}`  
- **Path params**: `user_id`: string

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "state": { "goals": [...], "session_learning_times": {...}, "learned_skills_history": {...}, "document_caches": {...}, ... } }
```

**Response — 失败**  
- `404`: `{"detail": "No state found for this user_id"}`

**认证**: None（当前前端未在请求头带 token，按业务需要可改为 JWT 校验 user_id）  
**前端错误处理**: 404 视为新用户，初始化为空 state；网络错误可重试 1 次。

---

### 3.2 PUT `/user-state/{user_id}`

- **Method**: `PUT`
- **Path**: `/user-state/{user_id}`  
- **Path params**: `user_id`: string

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `state` | object | ✅ | 完整用户状态（goals、session_learning_times 等） |

示例：`{"state": { "goals": [], "session_learning_times": {} } }`

**Response — 成功 (200)**  
```json
{ "ok": true }
```

**认证**: None  
**前端错误处理**: 失败时提示“保存失败”，可重试；避免频繁覆盖导致冲突时可做防抖/节流。

---

### 3.3 DELETE `/user-state/{user_id}`

- **Method**: `DELETE`
- **Path**: `/user-state/{user_id}`  
- **Path params**: `user_id`: string

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "ok": true }
```

**认证**: None  
**前端错误处理**: 失败提示并可选重试；通常与“清除数据”等操作绑定。

---

## 4. 事件 (Events)

### 4.1 POST `/events/log`

- **Method**: `POST`
- **Path**: `/events/log`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | ✅ | 用户 ID |
| `event_type` | string | ✅ | 事件类型 |
| `payload` | object | 可选 | 默认 `{}` |
| `ts` | string (ISO) | 可选 | 服务端可自动补全 |

示例：`{"user_id": "u1", "event_type": "session_start", "payload": {"goal_id": 1}}`

**Response — 成功 (200)**  
```json
{ "ok": true, "event_count": 42 }
```

**认证**: None  
**前端错误处理**: 可静默失败或有限重试，避免阻塞主流程；重要行为可本地队列后重试。

---

## 5. 画像与同步 (Profile)

### 5.1 GET `/profile/{user_id}`

- **Method**: `GET`
- **Path**: `/profile/{user_id}?goal_id=<int>`  
- **Path params**: `user_id`: string  
- **Query**: `goal_id` (optional): number — 有则返回该 goal 的 profile，无则返回该用户所有 profiles。

**Request body**: 无

**Response — 成功 (200)**  
- 带 `goal_id`: `{"user_id": "...", "goal_id": 1, "learner_profile": { ... } }`
- 不带 `goal_id`: `{"user_id": "...", "profiles": [ { "goal_id": 1, "learner_profile": {...} }, ... ] }`

**Response — 失败**  
- `404`: `{"detail": "No profile found for this user_id"}` 或 `"No profile found for this user_id and goal_id"`

**认证**: None  
**前端错误处理**: 404 视为无画像，引导创建；网络错误可重试。

---

### 5.2 PUT `/profile/{user_id}/{goal_id}`

- **Method**: `PUT`
- **Path**: `/profile/{user_id}/{goal_id}`  
- **Path params**: `user_id`: string, `goal_id`: number

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | object | ✅ | 学习者画像对象 |

**Response — 成功 (200)**  
```json
{ "ok": true }
```

**Response — 失败**  
- `400`: `{"detail": "learner_profile is required"}`

**认证**: None  
**前端错误处理**: 400 提示参数错误；网络错误提示保存失败并重试。

---

### 5.3 POST `/sync-profile/{user_id}/{goal_id}`

- **Method**: `POST`
- **Path**: `/sync-profile/{user_id}/{goal_id}`  
- **Path params**: `user_id`: string, `goal_id`: number

**Request body**: 无

**Response — 成功 (200)**  
```json
{ "learner_profile": { ... } }
```

**Response — 失败**  
- `404`: `{"detail": "No profile found for this goal"}`

**认证**: None  
**前端错误处理**: 404 保留当前内存中的 profile；成功后用返回的 `learner_profile` 更新当前 goal。

---

### 5.4 POST `/profile/auto-update`

- **Method**: `POST`
- **Path**: `/profile/auto-update`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | ✅ | 用户 ID |
| `goal_id` | number | 可选 | 默认 0 |
| `model_provider` | string | 可选 | LLM 提供商 |
| `model_name` | string | 可选 | 模型名 |
| `learning_goal` | string | 条件 | 无 profile 时必填 |
| `learner_information` | any | 条件 | 无 profile 时必填 |
| `skill_gaps` | any | 条件 | 无 profile 时必填 |
| `session_information` | object | 可选 | 会话元数据 |

**Response — 成功 (200)**  
- 初始化: `{"ok": true, "mode": "initialized", "user_id": "...", "goal_id": 0, "event_count_used": 0, "learner_profile": {...}}`
- 更新: `{"ok": true, "mode": "updated", ...}`

**Response — 失败**  
- `400`: `{"detail": "No profile found for this user_id. Provide learning_goal, learner_information, and skill_gaps to initialize."}`
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 400 引导用户补全信息；500 提示并可选重试。

---

## 6. 行为指标与测验

### 6.1 GET `/behavioral-metrics/{user_id}`

- **Method**: `GET`
- **Path**: `/behavioral-metrics/{user_id}?goal_id=<int>`  
- **Path params**: `user_id`: string  
- **Query**: `goal_id` (optional): number

**Request body**: 无

**Response — 成功 (200)**  
```json
{
  "user_id": "...",
  "goal_id": 1,
  "sessions_completed": 3,
  "total_sessions_in_path": 8,
  "sessions_learned": 2,
  "avg_session_duration_sec": 120.5,
  "total_learning_time_sec": 360.0,
  "motivational_triggers_count": 2,
  "mastery_history": [0.6, 0.8],
  "latest_mastery_rate": 0.8
}
```

**Response — 失败**  
- `404`: `{"detail": "No state found for this user_id"}`

**认证**: None  
**前端错误处理**: 404 显示为空或默认值；网络错误可选重试。

---

### 6.2 GET `/quiz-mix/{user_id}`

- **Method**: `GET`
- **Path**: `/quiz-mix/{user_id}?goal_id=<int>&session_index=<int>`  
- **Path params**: `user_id`: string  
- **Query**: `goal_id`: number, `session_index`: number

**Request body**: 无

**Response — 成功 (200)**  
```json
{
  "single_choice_count": 3,
  "multiple_choice_count": 1,
  "true_false_count": 1,
  "short_answer_count": 1,
  "open_ended_count": 0
}
```

**Response — 失败**  
- `400`: `{"detail": "Invalid session_index"}`  
- `404`: `{"detail": "No state found for this user_id"}` 或 `"Goal not found"`

**认证**: None  
**前端错误处理**: 失败时使用本地默认 quiz mix（如 3/1/1/1/0）。

---

### 6.3 GET `/session-mastery-status/{user_id}`

- **Method**: `GET`
- **Path**: `/session-mastery-status/{user_id}?goal_id=<int>`  
- **Path params**: `user_id`: string  
- **Query**: `goal_id`: number

**Request body**: 无

**Response — 成功 (200)**  
数组，每项：`{"session_id": "...", "is_mastered": false, "mastery_score": 65.0, "mastery_threshold": 70, "if_learned": false}`

**Response — 失败**  
- `404`: `{"detail": "No state found for this user_id"}` 或 `"Goal not found"`

**认证**: None  
**前端错误处理**: 404 显示为空列表；网络错误可重试。

---

### 6.4 POST `/evaluate-mastery`

- **Method**: `POST`
- **Path**: `/evaluate-mastery`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | ✅ | 用户 ID |
| `goal_id` | number | ✅ | 目标 ID |
| `session_index` | number | ✅ | 会话索引 |
| `quiz_answers` | object | ✅ | 键含 `single_choice_questions`, `multiple_choice_questions`, `true_false_questions`, `short_answer_questions`, `open_ended_questions`，值为答案数组 |

**Response — 成功 (200)**  
```json
{
  "score_percentage": 75.0,
  "is_mastered": true,
  "threshold": 70,
  "correct_count": 6,
  "total_count": 8,
  "session_id": "Session 1",
  "plan_adaptation_suggested": false,
  "short_answer_feedback": [{ "is_correct": true, "feedback": "..." }],
  "open_ended_feedback": [{ "solo_level": "relational", "score": 0.8, "feedback": "..." }]
}
```

**Response — 失败**  
- `400`: `{"detail": "Invalid session_index"}`  
- `404`: `{"detail": "No state found for this user_id"}` / `"Goal not found"` / `"No quiz data found for this session"}`

**认证**: None  
**前端错误处理**: 提交前校验 session 与 quiz 已加载；404 提示“请先完成内容加载”；可对 5xx 做一次重试。

---

## 7. 学习目标与技能缺口 (Onboarding / Skill Gap)

### 7.1 POST `/refine-learning-goal`

- **Method**: `POST`
- **Path**: `/refine-learning-goal`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learning_goal` | string | ✅ | 原始学习目标 |
| `learner_information` | string | 可选 | 学习者信息（可 JSON 字符串） |
| `model_provider` | string | 可选 | 同 BaseRequest |
| `model_name` | string | 可选 | 同 BaseRequest |
| `method_name` | string | 可选 | 默认 "genmentor" |

**Response — 成功 (200)**  
后端可能直接返回**字符串**（精炼后的目标）或**对象**，取决于 LLM。前端建议兼容：若为对象则取 `refined_goal` 或首层文本字段。

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 超时较长（LLM），可显示 loading；失败提示并允许重试。

---

### 7.2 POST `/identify-skill-gap-with-info`

- **Method**: `POST`
- **Path**: `/identify-skill-gap-with-info`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learning_goal` | string | ✅ | 学习目标 |
| `learner_information` | string | ✅ | 学习者信息（可 JSON 字符串） |
| `skill_requirements` | string | 可选 | 技能要求（可 JSON） |
| `user_id` | string | 可选 | 前端可传用于存储 |
| `goal_id` | number | 可选 | 同上 |
| `model_provider` / `model_name` / `method_name` | 同 BaseRequest | 可选 | |

**Response — 成功 (200)**  
合并了 skill_gaps 与 skill_requirements 的对象，例如含 `skill_gaps`, `goal_assessment`, `retrieved_sources` 等（具体键以后端实现为准）。

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 长耗时，loading + 超时提示；失败可重试。

---

### 7.3 POST `/audit-skill-gap-bias`

- **Method**: `POST`
- **Path**: `/audit-skill-gap-bias`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `skill_gaps` | string | ✅ | JSON 字符串化的 skill_gaps 对象 |
| `learner_information` | string | ✅ | 学习者信息 |
| `model_provider` / `model_name` / `method_name` | 同 BaseRequest | 可选 | |

**Response — 成功 (200)**  
审计结果对象（结构以后端为准）。

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败提示并可选重试。

---

### 7.4 POST `/create-learner-profile-with-info`

- **Method**: `POST`
- **Path**: `/create-learner-profile-with-info`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learning_goal` | string | ✅ | 学习目标 |
| `learner_information` | string | ✅ | 学习者信息（可 JSON 字符串） |
| `skill_gaps` | string | ✅ | JSON 字符串化的 skill_gaps（或 `"[]"`） |
| `user_id` | string | 可选 | 若提供则写入 store |
| `goal_id` | number | 可选 | 同上 |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "learner_profile": { ... } }
```

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败提示并重试；成功后可跳转学习路径或下一步。

---

### 7.5 POST `/validate-profile-fairness`

- **Method**: `POST`
- **Path**: `/validate-profile-fairness`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | JSON 字符串化的画像 |
| `learner_information` | string | ✅ | 学习者信息 |
| `persona_name` | string | 可选 | 默认 "" |
| `model_provider` / `model_name` | 可选 |  | |

**Response — 成功 (200)**  
公平性校验结果对象。

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败提示；成功根据结果决定是否允许进入下一步。

---

## 8. 画像更新 (Profile Updates)

### 8.1 POST `/update-learner-profile`

- **Method**: `POST`
- **Path**: `/update-learner-profile`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 当前画像（可 JSON 字符串） |
| `learner_interactions` | string | ✅ | 交互记录（可 JSON 字符串） |
| `learner_information` | string | 可选 | 默认 "" |
| `session_information` | string | 可选 | 默认 "" |
| `user_id` / `goal_id` | string / number | 可选 | 若提供则写 store |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "learner_profile": { ... } }
```

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败提示并重试；成功用返回的 `learner_profile` 更新本地状态。

---

### 8.2 POST `/update-cognitive-status`

- **Method**: `POST`
- **Path**: `/update-cognitive-status`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 当前画像 |
| `session_information` | string | ✅ | 会话信息（可 JSON 字符串） |
| `user_id` / `goal_id` | 可选 |  | |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "learner_profile": { ... } }
```

**认证**: None  
**前端错误处理**: 失败可静默或轻提示，避免打断学习流程。

---

### 8.3 POST `/update-learning-preferences`

- **Method**: `POST`
- **Path**: `/update-learning-preferences`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 当前画像 |
| `learner_interactions` | string | ✅ | 交互记录 |
| `learner_information` | string | 可选 | 默认 "" |
| `user_id` / `goal_id` | 可选 |  | |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "learner_profile": { ... } }
```

**认证**: None  
**前端错误处理**: 同 8.1。

---

## 9. 学习路径 (Learning Path)

### 9.1 POST `/schedule-learning-path`

- **Method**: `POST`
- **Path**: `/schedule-learning-path`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像（可 JSON 字符串） |
| `session_count` | number | ✅ | 会话数量 |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
对象含 `learning_path`（数组）、可选 `retrieved_sources` 等。

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 长耗时（可 500s timeout），loading + 超时提示；失败可重试。

---

### 9.2 POST `/reschedule-learning-path`

- **Method**: `POST`
- **Path**: `/reschedule-learning-path`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 当前路径（可 JSON 字符串） |
| `session_count` | number | 可选 | 默认 -1 |
| `other_feedback` | string | 可选 | 用户反馈 |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
含 `rescheduled_learning_path` 等（结构以后端为准）。

**认证**: None  
**前端错误处理**: 同 9.1。

---

### 9.3 POST `/schedule-learning-path-agentic`

- **Method**: `POST`
- **Path**: `/schedule-learning-path-agentic`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像（可 JSON 字符串） |
| `session_count` | number | 可选 | 默认 0 |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
含 `learning_path`、`agent_metadata` 等。

**认证**: None  
**前端错误处理**: 超时建议 120s；失败可重试。

---

### 9.4 POST `/adapt-learning-path`

- **Method**: `POST`
- **Path**: `/adapt-learning-path`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | ✅ | 用户 ID |
| `goal_id` | number | ✅ | 目标 ID |
| `new_learner_profile` | string | ✅ | 更新后的画像（可 JSON 字符串） |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
含 `learning_path`、`agent_metadata`（含 decision、fslsm_deltas、evaluation_feedback 等）。

**Response — 失败**  
- `404`: 无 state 或 goal  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 404 提示先加载目标/状态；500 提示并重试。

---

## 10. 知识内容与测验生成

### 10.1 POST `/explore-knowledge-points`

- **Method**: `POST`
- **Path**: `/explore-knowledge-points`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 学习路径（可 JSON 字符串） |
| `learning_session` | string | ✅ | 当前会话（可 JSON 字符串） |

**Response — 成功 (200)**  
含 `knowledge_points` 等（结构以后端为准）。

**认证**: None  
**前端错误处理**: 失败提示并重试。

---

### 10.2 POST `/draft-knowledge-point`

- **Method**: `POST`
- **Path**: `/draft-knowledge-point`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 路径 |
| `learning_session` | string | ✅ | 会话 |
| `knowledge_points` | string | ✅ | 知识点列表（可 JSON 字符串） |
| `knowledge_point` | string | ✅ | 当前知识点 |
| `use_search` | boolean | ✅ | 是否使用检索 |
| `model_provider` / `model_name` / `method_name` | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "knowledge_draft": "..." }
```

**认证**: None  
**前端错误处理**: 失败提示并重试。

---

### 10.3 POST `/draft-knowledge-points`

- **Method**: `POST`
- **Path**: `/draft-knowledge-points`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 路径 |
| `learning_session` | string | ✅ | 会话 |
| `knowledge_points` | string | ✅ | 知识点列表 |
| `allow_parallel` | boolean | ✅ | 是否并行 |
| `use_search` | boolean | ✅ | 是否使用检索 |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "knowledge_drafts": [ ... ] }
```

**认证**: None  
**前端错误处理**: 同 10.2。

---

### 10.4 POST `/integrate-learning-document`

- **Method**: `POST`
- **Path**: `/integrate-learning-document`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 路径 |
| `learning_session` | string | ✅ | 会话 |
| `knowledge_points` | string | ✅ | 知识点列表 |
| `knowledge_drafts` | string | ✅ | 草稿内容（可 JSON 字符串） |
| `output_markdown` | boolean | 可选 | 默认 false |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{
  "learning_document": "<string or document_structure>",
  "content_format": "standard" | "visual_enhanced" | "podcast",
  "audio_url": "<url or null>",
  "document_is_markdown": false
}
```

**认证**: None  
**前端错误处理**: 失败提示并重试；成功根据 `content_format` / `audio_url` 渲染内容与音频。

---

### 10.5 POST `/generate-document-quizzes`

- **Method**: `POST`
- **Path**: `/generate-document-quizzes`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_document` | string | ✅ | 学习文档内容 |
| `single_choice_count` | number | 可选 | 默认 3 |
| `multiple_choice_count` | number | 可选 | 默认 0 |
| `true_false_count` | number | 可选 | 默认 0 |
| `short_answer_count` | number | 可选 | 默认 0 |
| `open_ended_count` | number | 可选 | 默认 0 |

**Response — 成功 (200)**  
```json
{ "document_quiz": { "single_choice_questions": [...], "multiple_choice_questions": [...], "true_false_questions": [...], "short_answer_questions": [...], "open_ended_questions": [...] } }
```

**认证**: None  
**前端错误处理**: 失败提示并重试。

---

### 10.6 POST `/tailor-knowledge-content`

- **Method**: `POST`
- **Path**: `/tailor-knowledge-content`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像 |
| `learning_path` | string | ✅ | 路径 |
| `learning_session` | string | ✅ | 会话 |
| `use_search` | boolean | 可选 | 默认 true |
| `allow_parallel` | boolean | 可选 | 默认 true |
| `with_quiz` | boolean | 可选 | 默认 true |

**Response — 成功 (200)**  
```json
{ "tailored_content": { ... } }
```

**认证**: None  
**前端错误处理**: 失败提示并重试。

---

### 10.7 POST `/simulate-content-feedback`

- **Method**: `POST`
- **Path**: `/simulate-content-feedback`

**Request body (JSON)**  
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `learner_profile` | string | ✅ | 画像（可 JSON 字符串） |
| `learning_content` | string | ✅ | 学习内容（可 JSON 字符串） |
| BaseRequest 字段 | 可选 |  | |

**Response — 成功 (200)**  
```json
{ "feedback": { ... } }
```

**认证**: None  
**前端错误处理**: 失败可静默或轻提示（多用于内部评估）。

---

## 11. 其他

### 11.1 GET `/events/{user_id}`

- **Method**: `GET`
- **Path**: `/events/{user_id}`  
- **Path params**: `user_id`: string

**Response — 成功 (200)**  
```json
{ "user_id": "...", "events": [ ... ] }
```

**认证**: None  
**前端错误处理**: 失败返回空数组或忽略。

---

### 11.2 POST `/extract-pdf-text`

- **Method**: `POST`
- **Path**: `/extract-pdf-text`  
- **Content-Type**: `multipart/form-data`

**Request body**: `file`: File (PDF)

**Response — 成功 (200)**  
```json
{ "text": "extracted raw text..." }
```

**Response — 失败**  
- `500`: `{"detail": "..."}`

**认证**: None  
**前端错误处理**: 失败提示“PDF 解析失败”并允许重新上传。

---

## 认证与 Token 汇总

| 接口类型 | 认证方式 | Token 存放建议 |
|----------|----------|----------------|
| `/auth/register`, `/auth/login` | None | 成功后将 `token` 存 `localStorage.auth_token`（或 sessionStorage），并写入内存（Context/Store） |
| `/auth/me`, `/auth/user` (DELETE) | JWT | 请求头 `Authorization: Bearer <token>`；从同一存储读取 token |
| 其余接口 | None（当前） | 若后续按 user 鉴权，可统一在 axios/fetch 拦截器中附加 JWT |

**前端错误处理策略汇总**  
- **401**（仅 auth 相关）：清除 token，**跳转登录**。  
- **404**：根据接口语义处理（如 state/profile 不存在则初始化或展示空状态）。  
- **4xx 业务错误**：展示 `detail`，不重试或仅对幂等操作重试。  
- **5xx / 网络错误**：可对关键接口**重试 1 次**（如 state 保存、路径生成、测验提交）；仍失败则**提示**“服务暂时不可用，请稍后重试”。  
- **长耗时接口**（如 schedule-learning-path、identify-skill-gap、LLM 类）：**Loading + 合理 timeout**（如 120–500s），超时后提示并允许重试。
