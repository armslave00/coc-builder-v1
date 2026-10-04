# 反馈入口与接收渠道

状态：2026 年 10 月 5 日，用户确认完整首版方案并提供提交地址 `https://formspree.io/f/xgaowdoa`；现已实现并通过本地验收，尚未部署。首版接收渠道为 Formspree 免费版与私下邮件，不自动创建 GitHub issue。

## 第一轮结论

用户确认必须免登录。原始反馈是否公开、通过何种渠道通知维护者均无硬性要求，授权按方便程度选择，不再要求用户重复决定这两点。

据此选定私下接收与邮件通知，降低首版配置和维护成本。

## 第二轮结论

用户于 2026 年 10 月 5 日回复“都按照推荐”，确认 Q4–Q6：

- 邮箱选填，不填也能提交；用户留下邮箱后，维护者可以回复邮件追问。
- 默认勾选附带工具版本、当前功能页、浏览器和屏幕尺寸；用户可以查看并取消。不自动附带角色姓名、肖像、背景或整份档案。
- 首版使用 Formspree 免费版收邮件，暂不自动创建 GitHub issue。若之后需要自动建单，重新评估付费集成或自建服务。

## 已明确的目标

- 提供足够显眼的反馈入口，让用户遇到问题时能立即进入吐槽。
- 提交后能通知维护者；自动 GitHub issue 是最初偏好，Q6 已选择首版免费邮件路线。
- “工具使用反馈”指针对人物卡工具的反馈，与调查员背景及游戏内笔记分开；术语见 [CONTEXT.md](../../CONTEXT.md)。

## 实施前核实的现状

- 项目为 React、TypeScript、Vite 静态应用，GitHub Pages 工作流只部署 `dist`，目前没有反馈接收 API。仓库为 `armslave00/coc-builder-v1`。依据：[README](../../README.md)、[部署工作流](../../.github/workflows/deploy.yml)。
- 顶栏已有帮助、预览、导出。手机上帮助按钮隐藏，侧栏变为抽屉；桌面顶栏并非常驻，页脚位于长表单底部。侧栏、帮助或页脚里的入口无法独自满足“立即发现”。依据：[App.tsx](../../src/App.tsx)、[styles.css](../../src/styles.css)。
- 应用由空 `#root` 挂载，没有 React 错误边界或独立反馈兜底。应用白屏时，放在主 React 树中的入口也会消失。依据：[main.tsx](../../src/main.tsx)、[index.html](../../index.html)。
- 现有弹窗使用原生 `dialog.showModal()`，普通浮动按钮不能靠提高 `z-index` 越过浏览器顶层模态。依据：[Modal](../../src/App.tsx)、[MDN 顶层说明](https://developer.mozilla.org/en-US/docs/Glossary/Top_layer)。
- 档案含玩家名、上传肖像、背景与笔记、原创内容；直接自动附带完整角色或全部备份会扩大发送范围。依据：[人物与档案类型](../../src/types.ts)、[导出处理](../../src/App.tsx)。

## 接收方案比较

| 方案 | 用户如何提交 | 维护与取舍 |
| --- | --- | --- |
| GitHub 预填 issue 链接 | 离开工具，登录 GitHub 后确认提交 | 改动最少，不增加反馈服务器；普通用户可能没有账号，跳转本身不代表提交成功 |
| 站内免登录表单 → 小型服务 → GitHub issue | 留在当前页面，服务代为建单 | 满足免登录与自动 issue；需维护服务、凭据、输入校验、限流、防重复和反滥用 |
| 站内免登录表单 → 托管表单服务 → 邮件 / GitHub 插件 | 留在当前页面，由服务私下收件和通知 | 上线较省事；依赖服务额度、可达性与管理后台；Formspree 自带自动 issue 集成，需付费套餐与授权配置 |

GitHub 支持预填标题、正文和模板；长 URL 有长度限制，部分参数要求相应权限，不适合把完整角色或日志放入链接。依据：[创建 issue](https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/creating-an-issue)。

自动建单可调用 `POST /repos/{owner}/{repo}/issues`，使用具有 `Issues: write` 权限的适当 token；GitHub API 还有限流。凭据必须保存在服务端，不能作为 `VITE_*` 变量打包给浏览器。Cloudflare Worker 是可选服务载体，支持 secrets；若采用 Turnstile，必须在服务端验证。依据：[GitHub API](https://docs.github.com/en/rest/issues/issues#create-an-issue)、[Vite 环境变量](https://vite.dev/guide/env-and-mode)、[Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)、[Turnstile 验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)。

自动建单与维护者收到提醒需要分别验收。若用维护者自己的 PAT 建单，应检查 own updates 邮件设置；若用 GitHub App bot，应检查仓库 issue 订阅及邮件设置。不能仅凭 API 成功就声称维护者已经收到通知。依据：[GitHub 通知配置](https://docs.github.com/en/subscriptions-and-notifications/get-started/configuring-notifications)。

已选定 Formspree 免费版，支持 React/AJAX 站内提交和目标邮箱通知；内置 GitHub 插件属于可选付费升级。已接入用户提供的公开提交地址；目标用户网络可达性与邮件实际送达仍需服务侧验收。依据：[React 接入](https://help.formspree.io/articles/working-with-react/the-formspree-react-library)、[邮件规则](https://help.formspree.io/articles/advanced-features/form-rules/)、[插件](https://help.formspree.io/articles/plugins/plugins/)。

2026 年 10 月 4 日核实的成本：Formspree 免费版每月 50 次、提交记录保存 30 天；Personal 月付 15 美元，或年付 120 美元，每月 200 次，支持 GitHub 插件与文件上传。免费版不支持文件上传。托管服务自动建单不要求项目额外部署转发服务。依据：[套餐](https://formspree.io/plans/)、[GitHub 插件配置](https://help.formspree.io/articles/plugins/use-github-to-add-issues-to-a-repository)。

Formspree 超额后仍接收反馈，但暂停邮件通知与插件处理，并通知维护者额度已满。前端只能确认服务接收，不能因此声称邮件已送达或 issue 已创建；上线需验收额度提醒与重新处理流程。依据：[超额处理](https://help.formspree.io/articles/form-and-project-settings/over-limit-submissions)。

自建 Cloudflare Worker 是免登录自动 issue 的另一条路线：当前免费额度为每天 100,000 请求、每次 10 ms CPU；需要 Cloudflare 账号、部署、GitHub 服务端凭据及反滥用配置。可以使用 `workers.dev` 地址，网站继续部署在 GitHub Pages。依据：[Worker 价格](https://developers.cloudflare.com/workers/platform/pricing/)、[部署](https://developers.cloudflare.com/workers/get-started/dashboard/)。

## 已确认的首版完整方案

1. **入口**：桌面和手机都常驻“反馈 / 吐槽”文字按钮，不需展开菜单。使用有明显对比的颜色与至少 44 px 点击区域，避开输入控件、软键盘、安全区与现有提示；打印时隐藏。
2. **表单**：标题为“哪里不好用？直接说。”，问题描述是唯一必填项，一句话也能提交；邮箱选填，不要求标题、账号或问题分类。技术信息默认勾选，提供预览和取消。
3. **截图与附件**：免费版不支持上传，首版专注文字反馈；有联系方式时，维护者可在邮件回复中请用户补充截图。不以截图或完整档案作为提交条件。
4. **发送与反馈**：站内提交至 Formspree，维护者接收邮件，原始内容私下保存。发送期间防止重复点击；远端接受后显示“反馈已提交，谢谢你告诉我们”，不承诺邮件已经送达。
5. **失败与草稿**：关闭再打开保留本页输入；请求失败、超时或离线不清空，提供手动重试与复制文字。本页内存是最低保障，不依赖存储满时已经不可用的 localStorage，也不承诺跨设备或刷新后保留。
6. **问题场景**：保存/导入等已知错误提供就近反馈通路；通用模态与独立职业选择弹窗内提供反馈链接，必要时新标签打开独立反馈页。打开反馈不提交、清空或修改正在编辑的人物卡。
7. **白屏兜底**：反馈通路独立于主 React 树；静态反馈页、脚本加载失败提示与崩溃提示提供一致入口。整个网站无法加载或断网时无法远端提交，提供可复制的反馈文字。
8. **滥用与额度**：使用服务基础过滤，并限制前端字段长度；不添加用户登录。来源限制、收件邮箱、验证方式、超额提醒与重新处理流程需要维护者在 Formspree 管理后台配置并验收，前端不能代为确认。

验收覆盖编辑器、规则库、原创工坊、空档案、保存失败、模态弹窗、脚本加载失败与 React 崩溃；检查键盘操作、手机软键盘、安全区、打印隐藏、技术信息取消、失败保留输入与真实提交。服务侧验收实际收信、垃圾邮件过滤、额度提醒及目标用户网络上的可达性。

## 实现与验收记录

- 主应用始终显示金色“反馈 / 吐槽”浮动按钮；表单独立于人物卡错误边界，页面崩溃时仍能打开。已知保存/导入错误和模态弹窗提供就近链接，新标签页不打断正在编辑的内容。
- 主脚本加载失败时，静态入口与失败提示仍显示；`feedback.html` 是单独构建的入口，增强脚本也失败时保留原生 HTML 表单，不依赖主应用或本地存储。
- 站内 AJAX 只发送描述、可选邮箱和用户勾选的四项技术信息。20 秒后仍未确认时保留输入；仅明确收到服务接受响应才清空输入和显示成功。请求不会自动重试，发送期间阻止重复提交。
- 替代提交由用户主动打开 Formspree 的普通提交页面，以便服务显示必要的验证；当前草稿仍保留。剪贴板不可用时展示已选中的文字，供手动复制。
- 用户确认两处 TDD 公共边界：提交成功/失败/超时，以及技术信息预览/取消/白名单。相关测试覆盖匿名提交、服务拒绝与未确认响应、网络错误、限流、超时中止、严格字段选择和复制时的取消选项。
- 桌面与手机截图：[桌面入口](screenshots/feedback-desktop.png)、[手机表单](screenshots/feedback-mobile.png)。浏览器验收覆盖桌面、390 px 手机和 320 × 420 小视口的滚动、键盘关闭及焦点回退、关闭重开草稿、重复提交防护、取消技术信息、失败与复制兜底、规则库与原创工坊定位、原有模态草稿不被打断、打印隐藏、存储满、空档案、主脚本加载失败、独立页脚本失败和 React 渲染崩溃。独立页延迟加载时的原生草稿交接也已验证。

- 完整 `npm run check` 通过：101 项测试（包含 8 项反馈公共边界测试和实际 Chromium PDF 回归），类型检查与 Vite 生产构建通过。产物包含 `index.html` 和 `feedback.html`，保留相对资源 base `./`。
- 2026 年 10 月 5 日站内 AJAX 发送一条标注“上线前连通性测试，可忽略”的真实匿名反馈，取消技术信息，不含人物档案和联系方式；服务返回 HTTP 200、`{"next":"/thanks?language=zh","ok":true}`，界面显示提交成功。普通 POST 兜底检查另发送一条“需要服务验证时保留当前草稿。”的测试内容，也取消技术信息、不含人物档案和联系方式，服务显示提交成功，原页草稿仍保留。验收共两次真实提交，确认服务接受，未读取或验证维护者收件箱。
- Standards 轴没有可操作发现；Spec 轴发现 1 项独立页增强加载后丢失原生草稿的问题，已修复并通过延迟脚本加载复核，最终两轴剩余发现均为 0。

地址是公开表单端点，不是密钥。网站没有持有 Formspree 管理凭据，不能配置或证明收件邮箱、服务过滤、来源限制和配额提醒。服务接收成功也不等于维护者已收到邮件；上线后需在实际域名和目标网络上确认邮件通知。免费额度超限时服务仍可接收，但会暂停邮件和插件处理。

## 设计结论

Q1 已确定免登录；Q2 和 Q3 已委托按方便程度选择；Q4–Q6 已按推荐确认选填邮箱、可取消的技术信息与免费邮件路线。免费版不支持附件，首版收敛为文字反馈。用户随后确认完整方案及接收地址，授权实施，不再重复询问已确认偏好。

当前采用可替换的托管表单端点，没有引入服务端凭据、数据库或长期锁定的领域机制，因此不单独记录 ADR。
