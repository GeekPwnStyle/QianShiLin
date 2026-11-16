BEGIN;
WITH demo(username, display_name, alias) AS (
 VALUES
 ('admin','林致远','admin@qianshilink.demo'),
 ('manager','周婉宁','store.xihu@qianshilink.demo'),
 ('guide','陈明轩','guide.binjiang@qianshilink.demo'),
 ('optometrist','许文博','optom.xihu@qianshilink.demo'),
 ('supplier','顾承泽','supplier.zeiss@qianshilink.demo')
), inserted AS (
 INSERT INTO identity.users (username, display_name)
 SELECT username, display_name FROM demo
 ON CONFLICT DO NOTHING
 RETURNING id, username
)
INSERT INTO identity.password_credentials (user_id, password_hash, password_algorithm)
SELECT id, crypt(username, gen_salt('bf', 12)), 'bcrypt' FROM inserted;
INSERT INTO identity.login_aliases (alias,user_id)
SELECT d.alias,u.id FROM (VALUES
 ('admin','admin@qianshilink.demo'),
 ('manager','store.xihu@qianshilink.demo'),
 ('guide','guide.binjiang@qianshilink.demo'),
 ('optometrist','optom.xihu@qianshilink.demo'),
 ('supplier','supplier.zeiss@qianshilink.demo')
) AS d(username,alias) JOIN identity.users u ON u.username=d.username
ON CONFLICT DO NOTHING;
COMMIT;
