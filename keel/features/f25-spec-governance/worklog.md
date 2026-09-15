# worklog — F25

## 2026-09-15 CHG-020 实施

- 原始请求与范围见 CHG-020 / APR-011；生成的需求 v11、总览 v7、F25 计划保持 working。只实现用户所选三项，不延伸到编排器、其他项目或远端交付。
- RES-912 按 7784917 固定上游核对相关机制；保留 implementation/related 区分、显式复核理由与意图分层。采用跨语言文件级内容快照和同源离线总览，不移植函数锚点或 Git DAG 引擎；取舍和限制见计划/说明。
- 新增 spec-map / drift / atlas，接入 status 和 CLI；模板及根契约区分用户来源、工作解释和技术实现。完整八项门禁不增加新项。
- 定向功能检查第一轮 9/10：分发测试参数传错，命令拒绝在现有仓库初始化，未修改配置；修正测试调用后 10/10、类型检查通过。覆盖公共 CLI、双向/共享变化、显式复核、暂存区保持、绑定计划/草稿、相关引用、删除/改名/移除、损坏记录、来源注入与符号链接、分层、实际客户端交互、安装分发。
- 浏览器通道拒绝 file:// 本地访问，未用代理服务/换浏览器等方式绕过。实际客户端交互在轻量 DOM 合约中执行，验证逻辑而非浏览器布局；真实浏览器布局/窄屏目视检查未完成，交付时明示。
- 首轮完整 verify：335 过 / 2 失败；失败分别为 handoff 缺少完整 keel/ 导航路径和新版本发布说明缺兼容/消费者步骤段。保留原测试，补齐真实说明并复验。
- 补齐后完整 verify：337 过 / 0 失败 / 0 skipped，类型检查通过；内容树 536fea9a20a0adf159db43697facaac18801e6ea，报告 keel/evidence/verify.json 与 junit.xml。trace 对 REQ-029～031 的机器条目均有映射；映射不代表真实布局已测。完整 check：功能证据对账通过，仅 G-merge 因当前代码未提交失败；既有 REQ-017/AC-4 manual/proxy 及 APR-002/003 提醒保留。
- 按 k-review 派出全新上下文 chg020_review，只给 diff/计划/需求/证据/worklog，进行一次普通独立审阅，不启动无关历史正式回路。结果待回收；本次不会将未完成的真实浏览器布局检查写成通过。
- 普通独立审阅 chg020_review 结论：整体职责清楚、主要功能实现、测试有实际行为断言；确认未关联 REQ 在 UI 无法查看/搜索，独立以实际客户端加入 REQ-999 复现。主代理同时自查发现路径校验未覆盖后续既有读取器；审阅者确认需求影响和修复方向。未确认其他代码缺陷。
- 两项修复：未关联需求有独立可检索入口/详情，不伪造功能关系；在旧读取器之前检查 APR、需求、测试、功能与固定证据来源，拒绝符号链接。另保留重绘后的节点焦点并明示导出内容树、HEAD 与未提交状态。新增/扩展公共命令及实际客户端回归，真实浏览器键盘/布局/窄屏仍未核验。
- 修复后正式 verify：338 过 / 0 失败 / 0 skipped，类型检查通过；当前内容树 15e8accfb48306969fd3fe59792bd878b5ceaa83，evidenceGaps=[]。F25 定向共 11 项通过，包含两项修复与焦点保留的实际客户端行为；不是浏览器排版测试。另派全新 chg020_fix_review 窄复核两项修复及联动，复用本树正式证据。
- 窄复核 chg020_fix_review 确认未关联需求与来源预检修复成立、两项定向检查通过；发现附带焦点恢复的后续 hashchange 会再次重绘并丢焦点（REQ-030/AC-2）。主代理先补浏览器式 # 规范化与回调派发，修前真实回归失败：hashchange must not replace the just-focused feature button。最小修复为当前已选目标的 hashchange 不重绘，同时验证外部片段导航仍有效；不声称因此完成真实浏览器验证。
- 焦点回调修复后：同一回归通过；正式 verify 再次 338 过 / 0 失败 / 0 skipped，类型检查通过；最新内容树 1873f7c22b207295004479753a10b3aee954c488，verify/JUnit 对账有效。派出全新 chg020_focus_review 仅核对这一回调序列，复用正式证据。
- 最终独立窄复核 chg020_focus_review：该修复成立，无新增阻塞问题；实跑指定回调序列 1 过 / 0 失败，确认点击后的延迟 hashchange 不再重绘，外部片段导航仍工作。正式证据沿用本树 338 过及类型检查。
- 本轮代码与自动验证已交付准备就绪；REQ-029 与 REQ-031 的相关功能/协议证据通过，REQ-030 数据、安全与客户端交互逻辑已验证。REQ-030/AC-2 的真实浏览器键盘、焦点、布局和窄屏可读性仍缺实际环境证据，不能称整项验收完成。保留 F25 unreviewed，暂不写 summary 或运行自身最终 drift review，不为消警编造完整验收。
- 本地实现提交 162ae08；提交后同一内容树证据仍有效、dirty=false、evidenceGaps=[]，无须重跑相同树。完整 gate check 退出 0：0 失败 / 4 提醒，分别为原有 manual/proxy 提醒（追溯/完成/合并三个视角）与旧 APR-002/003 漂移，不代表远端或人工验收。
- 最终离线总览生成于 keel/evidence/atlas.html（本地未跟踪产物），来源为 31 条需求、25 个功能，包含已核对的内容树/HEAD 标签。单独 drift --check 退出 1，原因明确是 F25 unreviewed；另外 24 个旧功能为 unmapped、来源结构问题为 0。这不是程序失败或被绕过的门禁，而是尚缺真实浏览器核验、未建立最终内容复核基线的保留状态。

## 2026-09-15 用户界面实测反馈与收尾

- 用户对明确询问的搜索 F25、Tab/Enter 切换、窄屏显示回答正常，并邀请 agent 检查已打开页面。原话及核验范围保存在 browser-check-2026-09-15.md，不扩大为整份需求批准或发布授权。
- 工具库存确认 Chrome 有对应标题/本地 URL/#F25 标签；读取仍被 URL 策略拒绝，未绕过，未声称获得 DOM、截图或亲自完成浏览器操作。界面条件按用户实测补齐，原自动客户端证据继续覆盖其他已测逻辑。
- 当前代码与正式证据树仍为 1873f7c22b207295004479753a10b3aee954c488，338 过 / 0 失败 / 类型检查通过，重新对账 gaps=[]。本轮仅记录变化，复用相同树证据。
- 按上述分来源证据补齐 summary；下一步使用公开 drift review 记录 F25 内容基线，随后检查 trace、完整 check 和重新导出。历史失败与未验证状态保留在先前日志中，不视为当前仍缺用户反馈。
- 公开 drift review 已成功记录首个 F25 基线，绑定 browser-check-2026-09-15.md 的证据哈希与当前指纹。drift --check 退出 0：F25 aligned、0 待复核、24 unmapped、0 来源问题。trace 的已认领机器条目无缺项；更新 OVERVIEW/handoff 表达实际完成状态，不改冻结需求或批准工件。
- 最终完整 check 退出 0，0 失败 / 4 项原有提醒；当前内容树与 verify/JUnit 仍对账有效。没有新增测试或改代码，只更新事实记录，未重复运行全套；这些记录本地提交，未授权或执行远端动作。

## 2026-09-15 本地合并与 GitHub 交付

- 用户新增的合并/推送授权见 APR-012。Git 远端 HEAD 与 GitHub API 均确认默认分支为 codex/astra-instructions；其当前 f45dcc9 是源分支祖先，不能把未关联远端的旧 master 当作默认分支。
- 仓库当前公开、未归档、身份有 push 权限，目标 protected=false，规则查询为空；已向用户说明。只推代码/项目记录，不提交本地派生 atlas.html，不调整这些设置。
- 合并前重新确认 338 项正式证据和类型检查仍绑定代码树 1873f7c22b207295004479753a10b3aee954c488；gaps=[]，完整 check 退出 0、保留 4 项历史提醒。相关树不变时复用，不机械重跑。
- APR-012 通过 gate approve 绑定本轮合并范围，并自动保存真实的同树证据快照；授权记录提交 72a3b74。切换到实际默认分支 codex/astra-instructions，用 --no-ff --no-commit 合并后正常 git commit，生成两父提交 e59a272e5b61b043cb3a1adc64c2c58bc6ddd995，无冲突、未跳过钩子。
- 合并后内容树仍为 1873f7c22b207295004479753a10b3aee954c488，dirty=false，gaps=[]。正常预推送钩子确认同树新鲜证据并复用，完整 check 无失败。切换分支带来的 OVERVIEW/summary 文件时间先后提醒随后通过更新实际交付状态处理，不改功能代码或触碰时间戳伪装。
- git push --atomic 同时成功更新既有两个远端分支：codex/astra-instructions → e59a272，codex/safe-framework-update → 72a3b74。再用 ls-remote 核对，两者与本地 SHA 一致；无强推、无分支删除、无保护/可见性修改。
- 合并提交的 GitHub Actions 已启动，查询时 in_progress，运行地址 https://github.com/Kopitau/keel/actions/runs/34925747462。该条为查询时状态，不宣称最终 CI 通过；后续交付记录提交仍属于相同代码树，可能再次触发 Actions。
- 上述 CI 随后失败：六个 OS/Node 单元均为 337 过 / 1 失败，唯一失败是 tests/w3-verify.test.ts 中“this repo full check fails without evidence”。合并授权 APR-012 真实保存了同树证据快照，旧测试却硬编码对开发仓库执行 check 必须失败；干净本地提交上定向实跑同样失败（实际退出 0，断言期望 1）。
- 按 k-bugfix 修正测试前置条件：使用 miniGitRepo 创建有完成声明、无 verify.json 且无 APR 的隔离仓库，通过 gate --root ... check 仍断言 G-done 和 X-evidence 明确失败。没有删除/弱化缺证据断言、没有修改门禁或 CI 策略；有效 APR 快照的正向覆盖保留在原有证据快照测试中。本次是交付过程中暴露的测试隔离缺陷，不增加产品功能。
- 修后定向证据测试与 APR 快照联动 9/9 通过；重新运行正式 verify：338 过 / 0 失败 / 0 skipped，类型检查通过，新证据树 4629328986122f2737cf08653868e6353df34b1a。仅 tests/w3-verify.test.ts 改变，F25 运行代码、声明映射和用户实测界面未变化；原功能复核基线不被无关测试变更重建。
- 修复提交 67df44027d9d0ebbd55af15c675f410fbb9daf9c 已通过正常推送钩子到达默认分支；钩子复用新树 338 项通过证据，完整 check 无失败。合并上传动作已完成，CI 的动态结果以对应提交的 Actions 为准，失败历史保留。

## 2026-09-15 主线统一为 master

- 本次用户原话：“主线统一叫 master”。范围为把本地主线和 GitHub 默认分支统一为 master，并同步必要 CI 配置；不是整份需求批准、发布发行版或删除历史分支的授权。
- 操作前 GitHub 默认分支为 codex/astra-instructions、没有远端 master，本地 master 是其祖先。最新交付提交 49eb13e 对应 Actions 34926374071 的 Windows/macOS/Linux × Node 22/24 六格及 gate-ok 均通过。本地 master 已从 03b9120 快进至 49eb13e，未改写历史；两个旧 codex 分支保留。
- 联动检查发现 ci-trunk.sh 写死 origin/main，当前仓库一直跳过主线门禁。为使改名后的 CI 真正检查 master，仅增加 KEEL_TRUNK_REF 参数并在本仓 workflow 指定 origin/master；无参数的消费项目仍保持 origin/main 默认行为。明确指定的分支不存在时失败，不能静默跳过。
- 回归通过公开 shell 入口验证选定 master 执行而非跳过、成功后恢复候选代码及干净暂存区、原 main 用法兼容、缺失配置分支失败和主线拒绝的退出码传播。修改脚本前 1 过 / 3 失败，修改后 4 项通过。全套首轮 342 项测试通过但新测试两处 writeFileSync 缺少本仓类型声明要求的 encoding；补齐 utf8 后正式验证通过，再固定临时仓库换行配置并重新验证最终树。
- 该联动是本次改名的最小 CI 配套；未改变冻结需求/计划、运行时依赖、远端保护或可见性。后续操作为正常提交/推送 master 并切换 GitHub 默认分支，结果以实时 refs、默认分支查询和对应 Actions 为准。
- 最终正式 verify 退出 0：342 过 / 0 失败 / 0 skipped，类型检查通过，内容树 b545313d84ff7f36410136bded7ad97a5afacc23。完整 check 的功能证据有效；提交前仅 G-merge 因未提交代码失败，既有历史提醒保留。提交相同内容后复用证据再检查。
- 配套提交 c3a12967d8a6630f36af05a14781fc9ea8db2b6e 使用正常钩子提交，提交后完整 check 退出 0，正常 git push -u origin master 成功创建远端主线并设置跟踪。随后 GitHub 默认分支改为 master，本地 origin/HEAD 同步为 master；GitHub API 与 ls-remote 均确认，两个旧 codex 分支 SHA 未变。没有强推、删分支或改保护/可见性。
- 迁移配套的 Actions 34944318797 已启动，查询时 in_progress；这是当时的观察，不冒称最终 CI 通过。当前交接/总览改为 master，记录性提交保持同一代码树，后续动态结果以对应 master 提交的 Actions 为准。
