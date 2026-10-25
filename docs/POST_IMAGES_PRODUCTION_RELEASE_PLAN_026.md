# TASK 026 — 图片生产发布清单（未执行）
2026-10-25 KST。候选基线6f392fc，包含正式e54588d及TASK019–025成果。
本轮不授权生产迁移、Storage、Edge、Vault/Cron、应用部署或开关变更。

## 精确迁移顺序
下表为已审查Git原文UTF-8 LF的SHA256；五条旧迁移完全不改写。

| 顺序 | 文件 | SHA256 |
|---|---|---|
| 1 | 20261024162328_post_image_lifecycle.sql | B84541E23FAF0CF3D6A82A5FED567659F290F860B04655EDF6799060936D485E |
| 2 | 20261024164540_post_image_cleanup_guards.sql | A387E8367ACF4D1542CA1BF704A941823CC23F4ED880AE1D7207369F6824A176 |
| 3 | 20261024182118_post_image_outcomes_maintenance_022.sql | 5EC587AE2A70A36D6C647885D7782E5C7C135A21203F213D5C2E83FE7AB8C6A0 |
| 4 | 20261025061601_post_media_scheduled_maintenance_024.sql | C6F1EAE377CC1146D6AF0014C98AB1F37929084990D3A0800A44F63AE1BCB510 |
| 5 | 20261025062825_post_media_maintenance_status_024.sql | 364199EB2BA80C4BE3A641F6C9C17B5F0FA70665ECF4721DC7A1421A424E82D6 |
| 6 | 20261025095904_post_media_production_adaptation_026.sql | 0A2846B2F55B2A11B180FD8474484FC3ED57359E87444D4D95EAFE609B6CED62 |

1建立私有生命周期、bucket、权限/RPC和帖子删除清理；2修复旧SQL别名及保护身份/有界清理；
3增加提交核对与遗留/租约/晚到对象发现；4增加维护记录、工作RPC和默认关闭的配置；
5补全积压指标；6替换精确环境约束、新增v2认证和物理/不存在/确认计数，撤销旧v1入口工作权限。
迁移4的测试URL仅是默认关闭的占位；必须保持关闭并经过6和正式安装脚本配置后才能派发。
不编辑已应用历史文件，不全量db push，不顺带执行Reply Integrity或Ledger修复。

本轮生产只读核验：媒体schema/函数/触发器/bucket/相关Ledger行均不存在；
生产posts字段齐全、RLS开启；pgcrypto/Vault已有，pg_cron/pg_net尚需迁移4安装。
独立生产维护秘密名不存在，cron.job尚不存在。执行前重新核实，冲突停止不覆盖。
测试迁移6由管理工具分配Ledger version 20261025100543、name post_media_production_adaptation_026；
源文件时间不等于远程执行版本，保留映射。旧版本映射见原021/024记录。
Windows新checkout为CRLF；旧交接原文及Git blob均为LF，内容一致，不能强行让裸字节哈希相等。
运行 node supabase/maintenance/verify-release-source-026.mjs 可验证原文、哈希及完整依赖锁定清单。

## Storage与完整Edge部署
- kcny-post-staging：私有；JPEG/PNG/WebP；最大5,242,880字节；普通客户端不能列举或读取原件。
- kcny-post-images：私有；通过解码/重编码的WebP；相同上限；读取先检查调用者可见帖子，再签60秒链接。
- 单图；4,194,304像素、单边8192、输出2048内；原签名直传及元数据清除逻辑不重做。
- post-media部署闭包：index.ts、deno.json、lib/post-media-policy.ts、lib/media-commit.ts、lib/media-codec.ts。
- maintenance部署闭包：index.ts、deno.json、lib/media-maintenance.ts、lib/post-media-policy.ts。
- 两入口保留声明式verify_jwt=false：用户写仍真实getUser/所有权检查，读仍按真实调用者可见性；
  维护只接受独立HMAC/单次派发/精确环境/运行锁，不是匿名或普通JWT权限。
- 固定supabase-js 2.110.9、magick-wasm 0.0.45；固定WASM来源及摘要。Next 15.5.28和两份锁文件不升级。
- 测试Edge post-media v19 bundle 397e9d3464d12a1ccddc3acad0d76ba62a79c8c98b31d553902600ae222ebf43；
  maintenance v2 bundle c983eb6c79b464349efcfacd2e43e5b79406c55670fc242c38f17659020fb9b3。
  这是测试版本，不是生产部署。
- .vercelignore排除/supabase/是有意的；候选Git有完整Edge源码闭包，必须单独部署Supabase Edge。
  不能把Next构建成功等同于Edge已发布。

## 配置、认证、安装和调度
Production：应用NEXT_PUBLIC_SUPABASE_URL / Edge内置SUPABASE_URL必须精确为
https://czcyarmramlpmilfhpqo.supabase.co；
KCNY_MEDIA_ENVIRONMENT=production，KCNY_MEDIA_DEPLOYMENT_ENV=production，
Vercel注入VERCEL_ENV必须一致。
Test仅允许https://kirvcbkbkvotnsqnbcyf.supabase.co + test + development/preview。
缺失、冲突、URL后缀、Preview连正式库均拒绝；客户端环境字段/Header不是授权。

应用KCNY_POST_IMAGES_ENABLED和数据库media_private.configuration.enabled均默认false，独立控制。
Edge只用平台内置SUPABASE_*，不导出/覆盖管理凭据。两个env.example只有非敏感标识；
本轮测试Dashboard仅补齐test/development两个标识，应用写开关仍false。

获生产授权后、核实管理API实际Project Ref，再执行install-production-026.sql。
SQL没有内置物理Project Ref GUC，客户端自设GUC不能充当证明；
运行时再次比对Edge平台URL与DB受保护的环境/URL。
脚本在生产DB内生成32字节独立Vault秘密kcny_media_maintenance_026_production，不复制_test或旧024值，
不输出值；若同名秘密意外存在即停止核实。测试库使用独立_026_test。
签名绑定环境、URL、来源、时间和nonce；五分钟窗口、一次性消费；v1执行权限撤销。

安装kcny-post-media-hourly-026，17 * * * *，初始active=false。
维护enabled与上传enabled分开，上传关闭时必要维护可运行。
先手动派发并检查真实completed/finished_at/HTTP结果，再恢复小时任务，
至少一次真实source=cron的v2完成后才启用上传。派发ID不等于完成。
本轮新任务仍暂停；只验证manual真实运行，不声称026小时调度已发生。
024历史实际调度已接受，不重跑。schedule-control-026.sql提供暂停/显式恢复和指标查询。

平台自动执行；负责人/获授权维护人员检查异常，不把ChatGPT提醒或一次Codex调用当持续服务。
首日检查每次小时运行，之后至少每日查看last_success_at、dueJobs、oldestDueAt、failed_runs、
失效任务/全局租约、last_error及physical_deleted/already_absent/acknowledged。
35秒批次截止、42秒取消、单次请求8秒、最多3个owner/每人20任务，持久游标和租约恢复。
失败或超过两个小时无成功记录时关闭新增上传双开关；保留历史，按记录有界重试。
旧未测物理计数为NULL，不假称零。删除必须Storage API成功后确认，不能SQL删storage.objects。

## 后续获授权后的执行顺序与回退
A. 先恢复合法Vercel团队权限，核对当前线上commit/部署，不能覆盖后续其他更新。
最后已接受020回执：e54588d / dpl_7jeKf7uX1GHYtrydBCxi8U7ZS3p8 /
kcny-gcrlrmkjc-yan-s-projects24.vercel.app，作为待再次确认的回滚目标。
本轮公开release-check为200、配置布尔值全真、举报应用false；
新鲜Vercel部署元数据/用量因团队403不可读。
B. 保持图片双开关false及举报OFF/OFF，复核当前共享用量和预算。
C. 只执行精确六迁移，设置合理锁/语句超时，冲突即停。
D. 配置并部署两Edge完整依赖，不能为消除403而撤销环境检查。
E. 安装独立Vault/暂停Cron；验证手动及真实周期运行后再继续。
F. 核实RLS/GRANT、拒绝路径、私有Storage、读取和维护成功。
G. 从最终commit新建干净发布目录，使用Production变量重新构建；
核CLI参数/项目/scope后先deploy --prod --skip-domain，检查READY对应同一commit，再promote。
禁止复用本地测试构建、测试账号/数据/凭据或会话。
H. 所有门槛通过、iPad实机验收或负责人明确接受PENDING限制，才开图片双层写开关。
不顺便启用举报。
I. 观察日志、资源和积压。

严重问题先关双层写开关，保留帖子、slots、合法图片、记录及清理任务；
维持安全读取和v2维护，必要时仅回滚应用至重新核实的目标。
旧应用可能不渲染图片，但不得删除图片补偿回滚。
不要把维护Edge降回已撤销v1接口；需要相容修复或维持上传关闭。
禁止DROP bucket/schema、SQL删Storage元数据、删案件/审计或改TASK B。
