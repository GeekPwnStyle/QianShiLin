INSERT INTO identity.users(username,display_name) SELECT 'perf'||g,'Synthetic '||g FROM generate_series(1,50000) g;
INSERT INTO identity.roles(id,name,identity_type,data_scope,permissions) VALUES ('perf','perf','admin','all_stores',ARRAY['customer.read','customer.create','customer.update','purchase.read','purchase.create']);
INSERT INTO identity.user_access(user_id,role_id,store_ids) SELECT id,'perf',ARRAY['store_hq_01'] FROM identity.users;
INSERT INTO identity.sessions(token_hash,user_id,expires_at) SELECT encode(digest('perf-'||username,'sha256'),'hex'),id,now()+interval '1 day' FROM identity.users;
INSERT INTO customer.profiles(member_no,name,phone,store_id,created_at) SELECT 'PERF-'||g,'Synthetic '||g,'138'||lpad(g::text,8,'0'),'store_hq_01',now()-g*interval '1 second' FROM generate_series(1,100000) g;
ANALYZE;
UPDATE identity.roles SET permissions=ARRAY['basic.customer.read','basic.customer.create','basic.customer.update','purchase.read','purchase.create'] WHERE id='perf';
UPDATE identity.sessions SET token_hash=encode(digest(rpad(encode(convert_to('perf-perf1','UTF8'),'hex'),64,'0'),'sha256'),'hex') WHERE user_id=(SELECT id FROM identity.users WHERE username='perf1');
INSERT INTO catalog.suppliers(id,name) VALUES ('11111111-1111-4111-8111-111111111111','Synthetic supplier');
