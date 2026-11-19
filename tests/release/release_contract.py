import os,pathlib,subprocess,tempfile
source=pathlib.Path('script/release.sh').read_text()
with tempfile.TemporaryDirectory() as temp:
 root=pathlib.Path(temp);(root/'script').mkdir();(root/'script/release.sh').write_text(source);(root/'bin').mkdir();(root/'apps/api').mkdir(parents=True)
 docker=root/'bin/docker';docker.write_text('#!/bin/bash\nprintf "%s\\n" "$*" >> "$TEST_DOCKER_LOG"\nif [[ "${TEST_FAIL_UP:-}" == 1 && "$*" == *"up -d"* ]]; then exit 1; fi\n');docker.chmod(0o755)
 state=root/'.env.deploy';state.write_text('QIANSHILIN_IMAGE=previous\nQIANSHILIN_DB_PASSWORD=synthetic-test-only\n')
 env={**os.environ,'PATH':str(root/'bin')+':'+os.environ['PATH'],'TEST_DOCKER_LOG':str(root/'docker.log')}
 def run(action,extra=None):return subprocess.run(['bash',str(root/'script/release.sh'),action],env={**env,**(extra or {})},capture_output=True,text=True)
 r=run('deploy');assert r.returncode==0,r.stderr
 values=dict(x.split('=',1) for x in state.read_text().splitlines());web=values['QIANSHILIN_IMAGE'];api=values['QIANSHILIN_API_IMAGE'];assert web.split(':')[-1]==api.split(':')[-1];assert 'qianshilin-api-v1.0.0:' in api
 logs=(root/'docker.log').read_text();assert 'build -t '+web in logs and 'build -t '+api in logs;assert 'up -d --no-build --wait' in logs
 r=run('push');assert r.returncode==0,r.stderr
 logs=(root/'docker.log').read_text();assert 'push '+web in logs and 'push '+api in logs
 before=state.read_text();r=run('deploy',{'TEST_FAIL_UP':'1'});assert r.returncode!=0;assert state.read_text()==before
 state.write_text(before.replace(api,'registry.nat.gmaigc.cn/zhiarch/images/qianshilin-api-v1.0.0:WRONG'));assert run('push').returncode!=0
 print('PASS paired builds, compose no-rebuild, paired push, failed deploy state preservation, mismatched pair rejection')
