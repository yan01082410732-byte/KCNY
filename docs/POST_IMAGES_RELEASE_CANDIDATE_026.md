# KCNY 单图 Release Candidate — TASK 026
2026-10-25 KST。独立分支codex/post-images-release-026，工作树kcny-media-release-026。
基线6f392fc包含正式e54588d及TASK019–024代码；025验收证据另行保留。
原工作树、历史备份、未跟踪材料及共享协调文件不动。

本地checkpoint包含实际生产适配代码、迁移、测试和安装材料。
最终commit以回执及外部checkpoint元数据锁定，不在文档内自引用其自身commit。

| 工作 | 结果 |
|---|---|
| 应用/两Edge共享精确环境解析 | 完成；Test也必须显式配置，缺失/冲突拒绝 |
| 数据库Dispatcher及生产维护配置 | 完成，新增第6条迁移，不改旧5条 |
| 独立Vault、v2认证和权限 | 完成，生产安装尚未执行 |
| 有界清理/游标/租约 | 复用；新增physical/absent/ack独立指标 |
| 真实定向链路 | 普通A/B、localhost UI、测试Edge/SQL控制完成；保留原失败与复核 |
| 生产上线 | 未授权、未执行，媒体关闭、举报OFF/OFF |

完整源文件/依赖SHA256在POST_IMAGES_SOURCE_MANIFEST_026.json。
node supabase/maintenance/verify-release-source-026.mjs可只读复核。
检查：npm test；npx tsc --noEmit；npx tsc -p supabase/functions/tsconfig.check.json；
npm run build；git diff --check。
原两份lock和Next版本未升级，Edge完整依赖随Git保留但须独立部署。

## 资源及下一轮条件
本轮Supabase官方All projects页面确认组织Free，账期2026-10-22至2026-11-22，
测试与正式共享组织级Storage/Egress/函数额度。
显示Egress0.034/5GB、缓存0.004/5GB、Storage0/1GB（四舍五入平均，不是零对象）、
Edge325/500,000，单库上限0.5GB；测试27.32MB、正式26.25MB。
页面显示未超额，统计最多延迟一小时，不承诺永久免费或未来容量。
没有购买、升级或新项目。小时维护每月约720–744次，另加业务读取/上传/流量，发布时再复核。
Vercel团队资源和新鲜部署元数据403，仅试一次；不能据此编造当前配额或精确线上版本。
公开release-check实际200、Production配置布尔值全真、举报应用false；
生产DB举报enabled=false。最后接受部署来自020回执，未来执行前仍须重新核对。
[调度依据](https://supabase.com/docs/guides/functions/schedule-functions)，
[公开套餐说明](https://supabase.com/pricing)；用量来自实际Dashboard，不用价目表冒充组织使用情况。

候选代码可进入下一轮受控发布审核，不是生产安装/开放授权。
需明确授权六迁移、Storage、两Edge、独立Vault/Cron、应用发布及条件式启用；
恢复Vercel合法团队访问，核实线上版本/回滚目标，再按生产发布清单实施。
维护没有实际运行成功不能开上传；生产至少一次真实v2小时完成后才启用。
iPad实机PENDING需实测或负责人明确接受残余限制。
另有未到安全时间的151字节测试暂存件登记待清理，不提前删除。

详细顺序/回退：POST_IMAGES_PRODUCTION_RELEASE_PLAN_026.md。
真实结果/失败历史：POST_IMAGES_ACCEPTANCE_026.md。
生产DB/Storage/Edge/应用、举报开关、TASK B、AI均未写入或部署；未push/merge。
