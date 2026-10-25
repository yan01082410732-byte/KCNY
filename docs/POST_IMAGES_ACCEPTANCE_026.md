# TASK 026 — 定向验收及一次回溯
2026-10-25 KST。仅kirvcbkbkvotnsqnbcyf可写；生产只读。

| 层次 | 实际结果 |
|---|---|
| 新增环境/维护单元 | 27/27 PASS；生产正向为代码测试，不是生产部署 |
| 完整单元 | 505/505 PASS，26文件，0失败/跳过；不沿用过时459数量 |
| 数据库v2契约 | 16/16 PASS，真实隔离库函数，控制数据全部ROLLBACK |
| SDK/真实localhost浏览器累计原始批次 | 15 PASS / 2 FAIL，17条记录（含prepare修正后重试） |
| 韩文平板单场景补验 | 1/1 PASS、pageerror=0；不把原批次改写为全绿 |
| 应用TypeScript、Next生产模式Build、diff检查 | PASS |
| Edge类型 | TypeScript+实际SDK+最小Deno provider声明PASS，未冒称运行Deno CLI |
| 云Edge | post-media v19 / maintenance v2 ACTIVE，真实调用成功 |
| 真正iPad硬件 | PENDING；390×844及820×1180是Chromium视口 |

外部kcny-media-release-026-evidence含final-*-026.log/final-checks-026.json、
原targeted-results-026.json、KR-targeted-recheck-026.json、维护及权限JSON。
本地构建未连接Production、未读生产凭据；正式发布必须从commit用正式配置重新构建。

## 保留的失败及复核
初次两个mock没返回Storage真实data数组，影响原56项中的2项；
补全实际返回形状，保留ack失败断言，随后受影响+新增83/83通过。
真实prepare先HTTP403：新增显式Edge环境标识原未配置；官方测试Dashboard只新增
KCNY_MEDIA_ENVIRONMENT=test与KCNY_MEDIA_DEPLOYMENT_ENV=development后复测通过。
CLI Invalid access token只试一次，未改凭据或反复尝试。
浏览器初次默认缓存路径缺失；复用TASK017原安装的Chromium，未重新安装。
韩文首次等待只记录CONTROL_FAILED，未保存足够细分类，不能事后断言根因或应用缺陷；
当时server图片查询5.7秒，独立30秒有界等待复核通过，不改业务代码或原记录。

## 检查边界
- 正确/错配环境、缺失、冲突、URL伪造、客户端伪造标识及默认关闭。
- 匿名/公开key/普通用户/伪HMAC维护401；普通v2 RPC=42501、私有schema不可访问。
- v2签名项目/环境/来源/nonce/时间绑定、重放拒绝、并发锁、失效租约恢复；
  ack故障前的物理计数保留、失败释放全局锁。
  SQL使用事务内服务工作角色模拟，不能当作普通用户权限成功证据；所有控制数据回滚。
- 普通A真实浏览器登录；媒体关闭后UI纯文字发帖且查到持久记录；
  B仍能读取可见帖的已校验图；UI/API新上传403；中文手机/韩文平板读取；举报UI disabled。
- 三次真实v2维护：空批次；physical=0/absent=2/ack=2；
  physical=1/absent=0/ack=1。均真实completed/finished_at，非仅派发成功。
  有效图在未删除帖子时被保护；之后删合成帖并超过实际安全时间才清展示图。
- 空对象计数控制从未签发凭证，不是伪造自然到期测试。
- 9个私有表RLS均开启；普通schema USAGE=false；v2服务EXECUTE=true、anon/auth=false；
  v1服务EXECUTE=false；固定空search_path。
- 媒体Advisors仅预期私有表deny-all的RLS无Policy INFO，
  不为消提示放宽权限：[说明](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)。
  其他历史提示未修改。
- Edge相对依赖闭包检查、两份测试部署均成功；不把Next构建当Edge发布。

## 原历史与剩余测试原件
TASK021原22/24及定向4/4保留，TASK025自然过期PASS、清理3/3/6、原加密状态删除证据保留，
本轮不重造过期凭证或重跑这些批次。
本轮3个合成帖子已删、展示图已回收，剩1个151字节暂存原件及1条未来任务；
原件安全时间为2026-10-25 22:16:13.951941 KST，届时仍须核对租约。
到期/失败/失效租约目前0，024和026小时任务均active=false，媒体写OFF。
不为清零提前删除、不改时间、不恢复调度或承诺自动跟进。保留无凭据状态供授权人届时有界回收。

## 一次回溯
没有确认的越权、隐私泄漏、数据损坏或核心流程阻断。
环境默认猜测被移除，删除/确认计数分开，摘要字节类型兼容已修正。
实机、冷启动/规模、原生文件选择器增强继续延期；
Vercel团队权限与后续生产安装是发布门槛，不是已经完成的事项。
未扩展到AI、举报留存、历史UNKNOWN或无关基础设施。
