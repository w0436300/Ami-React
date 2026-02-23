# frontend-react

React 前端重建用资源目录。

## 内容

- **API_CONTRACT.md** — 与 FastAPI 后端的 API 契约文档  
  - 每个接口的 method + path  
  - Request body JSON schema（字段类型、必填/可选、示例）  
  - Response JSON schema（成功与失败）  
  - 认证方式（JWT/Session/None）与 token 存放建议  
  - 前端错误处理策略（重试/提示/跳转登录）

- **api-types.ts** — 建议的 TypeScript 类型定义草案（interfaces/types），与 API 契约一一对应，可直接在 React 项目中引用或按需裁剪。

## 数据来源

契约与类型基于当前代码库整理：

- **前端发请求**：`frontend/utils/request_api.py`、`frontend/utils/backend.py`（Streamlit + httpx）
- **后端路由与 schema**：`backend/main.py`、`backend/api_schemas.py`（FastAPI + Pydantic）

## 使用建议

1. 将 `api-types.ts` 复制到 React 项目的 `src/types/` 或 `src/api/`，按项目结构拆分或合并。
2. 封装 API 客户端（如 axios/fetch）时，为每个端点声明入参/出参类型为上述接口。
3. 认证：登录/注册成功后把 `token` 存到 `localStorage`（或 sessionStorage），需认证的请求在 Header 中加 `Authorization: Bearer <token>`；收到 401 时清除 token 并跳转登录。
4. 错误处理：按 API_CONTRACT.md 中“前端错误处理”执行（401 跳转登录、404 按语义处理、5xx 关键接口可重试一次并提示）。
