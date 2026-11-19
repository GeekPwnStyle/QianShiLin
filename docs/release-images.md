# Paired frontend/API release images

bash script/release.sh deploy [v1.0.0] builds both images with identical Asia/Shanghai timestamp tags:
- registry.nat.gmaigc.cn/zhiarch/images/qianshilin-v1.0.0:TIMESTAMP
- registry.nat.gmaigc.cn/zhiarch/images/qianshilin-api-v1.0.0:TIMESTAMP

Compose receives QIANSHILIN_IMAGE and QIANSHILIN_API_IMAGE; deployment uses --no-build, preventing a second implicit API build with local tag. State file records both image references only after containers pass health checks. Failed deployment preserves previous state file; automatic container rollback is not implemented. Existing installations without API_IMAGE retain legacy local fallback until next deploy.

bash script/release.sh push pushes the recorded pair and rejects missing/mismatched API tags. Partial remote pushes are possible: retry push if one fails. No credentials are committed. Deployment lock retained. Validation: bash syntax, isolated stub Docker contract tests, and actual paired build/deployment with both containers healthy. Contract tests simulate paired push; no claim of successful registry push in this change. Database migrations for existing installations still need explicit application; init mounts only apply to a new DB.
