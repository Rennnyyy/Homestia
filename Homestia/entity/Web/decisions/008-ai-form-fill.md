# AI-Enhanced Form Filling: Backend-Owned Scenario Flows

**Status**: accepted
**Type**: decision
**Supersedes**: none

## Statement
Property forms can be prefilled by AI through two paths — A) free-text chat and B) uploaded photos. Both run as **scenario flows**: code-defined pipelines of model steps registered in the Program slice (`AiScenarios.cs`), each step bound to a model role resolved from configuration (`AI:ModelRoles`). The flow is validated **on the backend** against the view SHACL shape before a single valid proposal leaves the server; the frontend renders that proposal in the existing review step. The AI never writes to the store — the save button does. ^statement

## Rationale
The first design put SHACL validation in the browser, which forced the backend LLM to emit unvalidated JSON and then repair it over browser round-trips. That was rejected: the backend already holds the view shapes (`ViewAspects.cs`) and the SHACL engine (`IViewAspectEngine`, `dotNetRDF`), so the loop belongs where the authority lives. Code-defined flows (option A over data-defined) keep instructions and step schemas compile-checked beside the domain; only model bindings are configuration, so local and cloud models mix per deployment without redeploying the flow. ^rationale

## Consequences
- **Scenario keys** — `property.create.text`, `property.create.photos`, `property.edit.text`, `property.edit.photos`. The frontend picks the photos variant when images are attached; otherwise text.
- **Steps** — photo flows prepend a `describe_images` step (`TextOutput=true`, role `vision`); every flow ends with a `fill_form` step (role `form-fill`, `ViewIri=urn:aletheia:homestia:shapes:property`, `MaxRetries=3`). Step instructions live inline in `AiScenarios.cs` and embed the fixed enumeration IRI vocabulary.
- **Model roles** — `vision` and `form-fill` are resolved from `AI:ModelRoles`; absent roles fall back to `AI:Default`. Dev binds `vision` to local Ollama (`qwen2.5-vl:7b`); production can rebind `vision` to any OpenAI-compatible endpoint without code changes.
- **Transport** — `POST /api/ai/flow` (SSE) emits `FlowEvent` frames; the terminal event is `flow_completed`, whose `finalOutput` **is** the form proposal. Exhausting a step's retry budget fails the flow (no best-effort output).
- **Frontend** — `AiFlowService` consumes the SSE stream; `AiAssistantPanelComponent` collects the prompt + photos (data-URL parts) and emits the proposal. `Properties.applyAiProposal` merges it into `pendingProperty`/`rooms` (create → review step) or `editingItem`/`rooms` (edit).
- **Validation layering** — backend flow loop validates the proposal against the view shape; the frontend `ShaclValidatorService` still validates user edits and the save path; backend operation aspects remain authoritative on commit. No mirroring — the frontend shape is a cache of the backend's.
- **Config** — `appsettings.json` gains a top-level `AI` section (`Provider`, `Default`, `ModelRoles`); the DeepSeek API key is supplied via environment (`AI__Default__ApiKey`) and the local Ollama host needs no key. ^consequences
