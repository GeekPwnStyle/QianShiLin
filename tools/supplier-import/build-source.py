"""Reproduce the manually transcribed screenshot fixture. No inferred contact data."""
import json
from pathlib import Path

common = '''泰龙(富丽城)
时代天鸿(富丽城)
靓视线(富丽城)
东大致远(蔡司镜片)
新国际光学(富丽城店)
三晶(镜架部)
优视康(暴龙光学镜架)
嘉信眼镜(暴龙太阳镜)
临时合作商(富丽城店)
金龙(富丽城店)
视明悦(富丽城店)
明亮眼镜(富丽城店)
振威(隐形眼镜)
博桑(阳光新业)
创承眼镜(富丽城)
美视达(广州)
正信眼镜(正信)
万邦眼睛(福林广场)
精工眼镜配件(富丽城)
泰发眼镜配件(富丽城)
阿里巴巴(网购)
朗程眼镜(世纪中心)
明亮眼镜(昆明)
舒雅眼镜(世纪中心)
东大致远(国际镜架部)
云南合洋眼镜(镜架)
正源眼镜(富丽城)
万邦眼睛(富丽城)
罗敦司得(天眷光学)
云南合洋眼镜（凯米）（镜片）
华东眼镜(中创视界)
东大致远(隐形部)
云南嗣宏眼镜(月结镜片)
成都合洋眼镜(镜架)
睿镜商贸（依视路）（镜片）
云南云程发轫（金算盘）(成都)
新微（凯米）(紫金乐章)
艾伦光学(昆明)
朗程眼镜（镜片部）(昆明)
云南嗣宏眼镜(现金镜片)
三晶(镜片部)
百大眼镜(富丽城)
精诚眼镜(现金镜片)
兴亮眼镜(富丽城)
上品视嘉（尼康）(预存)
云南嗣宏眼镜(舒米商贸)
成都合洋眼镜(镜片)
东大致远(扬帆镜架)
东大致远(名品部)
耐凡(无框加工)
万顺眼镜(富丽城)
璟晔眼镜(镜片)
璟晔眼镜(江苏万新)
鑫瑞视光(暴龙万那科兹)
昆明臻青胜(柯达)
昆明视清(隐形)
成都优信(柯达)
云南晶瑞(东海镜片)
法依笛(切边定制)
云南云程发轫（金算盘）(五华区阳光)
云南潜美(镜片)
金龙配件(富丽城)
时代天鸿(现金)
东大致远(盈昌事业部)
成都优信(蔡司)
振威(德沃驰)
盘点报溢(报溢)
镜友眼镜工作室(16楼加工)
南方眼镜(富丽城)
唯色卓达(镜框维修)
上海远景(阿里千问)
新国际光学(明月)
昆明视清(镜片)
宜美视商贸(李白)
视视看(加工维修)
天姿眼镜(富丽城)
中林眼镜(镜片)
北京宝典(华尔诗丹)
宏正眼镜(加工)
华茂光学(纱米)
成都艾鲸科技(镜架)'''.splitlines()

# Each list is independently visible; differences must not be unioned into both accounts.
zyy = common + ['艾伦光学(富丽城店)', '超任眼镜(富丽城店)', '理疗养护供货商(临时)', '虚拟商品店铺(临时)', '时代天鸿(施耐德)']
msmx = common + ['艾伦光学(富丽城店)', '理疗养护供货商(临时)', '虚拟商品店铺(临时)', '时代天鸿(施耐德)', '精诚眼镜(月结镜片)', '欧宝视眼镜(富丽城)']
def account(username, created, updated, names):
    return dict(username=username, role='管理员', status='有效', phone=None,
                createdAt=created, updatedAt=updated, suppliers=names)

accounts = [
    account('ZYY', '2026/11/3 09:07:38', '2026/11/18 13:48:12', zyy),
    account('msmx', '2023/5/9 14:58:29', '2026/11/18 13:48:20', msmx),
    account('youshikang', '2023/4/26 16:04:37', None, ['优视康(暴龙光学镜架)']),
    account('jinlong', '2023/4/25 15:17:33', '2023/7/1 21:32:07', ['金龙(富丽城店)']),
    account('sanjing', '2023/4/25 15:17:22', None, ['三晶(镜架部)']),
    account('xinguoji', '2023/4/24 23:52:13', None, ['新国际光学(富丽城店)']),
    account('dongda', '2023/4/3 12:13:29', None, ['东大致远(蔡司镜片)']),
    account('liangshixian', '2023/4/3 12:13:21', None, ['靓视线(富丽城)']),
    account('ailun', '2023/4/3 12:13:10', None, ['艾伦光学(富丽城店)']),
    account('shidaitianhong', '2023/4/3 12:13:01', None, ['时代天鸿(富丽城)']),
    account('tailong', '2023/4/3 12:12:30', '2023/4/3 12:13:38', ['泰龙(富丽城)']),
]
data = dict(source='legacy-supplier-screenshots-20261121',
            notes='人工转录五张账户截图；括号与空格按可读文本保留；个别小字号商号需与原始导出复核。旧角色、状态不授予新系统权限。',
            reviewNames=['睿镜商贸（依视路）（镜片）', '云南云程发轫（金算盘）(成都)', '云南云程发轫（金算盘）(五华区阳光)', '昆明臻青胜(柯达)', '华茂光学(纱米)', '罗敦司得(天眷光学)'],
            accounts=accounts)
Path(__file__).with_name('legacy-suppliers.json').write_text(json.dumps(data, ensure_ascii=False, indent=2)+'\n', encoding='utf-8', newline='\n')
print(len({n for a in accounts for n in a['suppliers']}), 'suppliers;', len(accounts), 'accounts;', sum(len(a['suppliers']) for a in accounts), 'grants')
