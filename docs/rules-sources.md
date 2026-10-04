# 规则数据来源与维护说明

数据版本：`7e-2026.10.04`。资料核对日期：2026 年 10 月 4 日；时代与扩展选择范围调整日期：2026 年 10 月 5 日。

`src/data/rules.ts` 组合可随静态站点打包的完整目录：120 项技能、191 个职业、481 件装备与武器、8 项法术索引、5 个可选规则 profile、35 条书目与来源。完整目录保留导入验证与旧档案引用；当前可选内容还取决于时代与勾选的扩展包。

共享内容在 `core.json`；时代差异分别维护在煤气灯、日本现代、黑暗时代与西部 JSON 中。维多利亚与煤气灯使用同一套时代规则，合并为 `gaslight`；旧档案中的 `victorian` 在读取与导入时转换为 `gaslight`。`publications.json` 登记尚未导入的官方及授权资料；补充包维护可从公开官方或授权来源核实的新增职业、专长和装备。登记出版物与录入建卡数据是不同操作，目录尚不是核心及所有扩展规则书的完整复刻。

中文说明由本项目撰写，名称、机械数值与规则条件以所列版次为版本锚点。中文技能名称是界面译名，可能与不同中文出版物的译名不同。

本轮在 master `9c6a2e0` 上新增 4 个职业、5 个科学专长和 249 件装备与武器。公开普通装备表的 215 个带价实物行由 206 个新增条目与 9 个已有条目对应，逐行映射保存在 `general-supplement.json` 的 `sourceRowCoverage`；排除 34 个餐饮、住宿、酒吧消费与不动产价格行，以及 4 个无价格分组标题。公开武器表 44 行均有对应条目，其中 37 件新增、7 件沿用旧 ID；泛称霰弹枪和 .38 左轮作为既有条目另行保留。

随后读取用户提供的《空白卡(1)_20260924_090335.xlsx》：新增 165 个职业模板、46 项技能与专长、206 项装备（武器 61、防具／掩体 68、载具 63、附件 3、游戏毒剂参考 11）。来源 `user-workbook-reference` 分类为“用户提供参考”，没有官方身份或规则版次断言；工作簿注明的试运行、非规则书栏目及旧版内容分别记录。39 个职业候选暂缓，43 行武器按型号去重，36 行财富表只保留审计。具体单元格、哈希、差异和边界见 [Excel 工作簿审计](excel-reference-audit.md)与[逐行记录](data/workbook-reference-audit.json)。

这些新增职业、技能和装备统一属于可选的“Excel 参考扩展包”（ID：`workbook-reference`），每个调查员分别勾选，默认关闭。开启后仍按条目的 `eras` 筛选；关闭后不能新选其中的内容，已有职业、技能点、选择与库存继续保存并可导出。角色 JSON 与档案备份保存扩展勾选状态；缺少此字段的旧档案按默认关闭读取。共享属性与体格提示作为基础建卡说明保留，不属于可选择的扩展条目。

武器表有少数列错位，用 [Chaosium 官方武器 Wiki](https://cthulhuwiki.chaosium.com/equipment/weapons.html)交叉校核。BAR 的公开连续字段能核实；维克斯机枪的故障值仍缺依据；近战长矛保留公开表的 `1D8 + 1` 并提示与所持规则书核对。弓、鞭、绞索、斧、连枷、矛、冲锋枪、机枪等独立攻击专长未从公开来源核实基础值，相关武器不误挂斗殴或步枪。公开武器目录中的 14 件武器补关联了工作簿专长：扩展关闭或该专长不适用于当前时代时，新增武器不自动选择该专长，攻击技能由守秘人确认；已保存的攻击技能引用保留。这里的表格覆盖不等于每个字段或所有扩展已经完整实现。

## 采用的资料

- [Chaosium 官方快速入门](https://www.chaosium.com/cthulhu-quickstart/)：百分骰、半值与五分之一值、HP、MP、初始 SAN、伤害加值等基础规则。快速入门的固定数组建卡，与正式职业点建卡是两种流程，不能把二者的技能点混算。
- [Keeper Rulebook，第 7 版](https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-7th-ed-hardcover/)：核心版本锚点，常用武器数值与法术名称索引。
- [Investigator Handbook，第 7 版](https://www.chaosium.com/call-of-cthulhu-investigator-handbook-pdf/)：职业公式、信用范围、技能专长与装备的版本锚点。
- [Chaosium 官方人物卡](https://www.chaosium.com/cthulhu-character-sheets/)：经典和现代技能基础值与人物卡字段组织。网页采用自己的版面与装饰，不将原版 PDF 文件嵌入或重新发布。
- [Chaosium 官方职业示例](https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html)：八个常见职业的技能选择条件，以及新调查员通常不能购入克苏鲁神话技能的规则。
- [Roll20 授权基础规则职业页](https://roll20.net/compendium/coc/Step%20Four%20(Determine%20Occupation))：公开核对核心与 Pulp 共同的职业样本；本轮补入考古学家、飞贼、探险家与调查记者。每个职业保留 8 个技能槽位、信用范围与属性选择条件；页面含 Pulp 语境，但未由此引入 Pulp 的额外 HP、天赋或原型规则。
- [Chaosium 官方科学专长说明](https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html#science)：新增天文学、植物学、密码学、地质学、动物学，基础值为 1%，各自独立计分。应用场景与中文短说明为项目原创。
- [Roll20 授权武器表](https://roll20.net/compendium/coc/Rules%3AAmmunition%20%26%20Weapons)：核对具体武器的伤害、射程、攻击次数、装弹量、故障值与 1920s 美元参考价格。保留原表距离单位，近战、投掷、枪械分类分别记录；空白或存在歧义的字段不补猜数值。
- [Roll20 授权普通装备表](https://roll20.net/compendium/coc/Rules%3AGeneral%20Equipment)：记录表中可持有的实体物品、车辆与配件，价格为 1920s 美元参考值；餐饮、住宿、酒吧消费和不动产价格不是携带物目录。
- [Cthulhu by Gaslight: Investigators’ Guide，2024，第 7 版](https://www.chaosium.com/cthulhu-by-gaslight-investigators-guide-hardcover/)及[官方 Gaslight 人物卡，2025](https://downloads.chaosium.com/call-of-cthulhu/cha2300-investigator-sheets/CoC7_Investigator_Sheet_Gaslight_autocalc.pdf)：维多利亚设定的版次、技能和基础值差异。
- [Cthulhu Through the Ages，2014，第 7 版](https://www.chaosium.com/cthulhu-through-the-ages-pdf/)：核对跨时代资料与 Gaslight 的关系。这本书的七种设定不包括独立“日本现代”通用建卡规则。
- [新クトゥルフ神話TRPG クトゥルフ2020](https://product.kadokawa.co.jp/p01/product-c/322001000090.html)及[クトゥルフ2026](https://www.kadokawa.co.jp/product/322601000219/)：KADOKAWA 官方日文第 7 版现代日本资料。2020 的职业样本、经历包和年少调查员规则，2026 的职业、副业、特征与新武器都有出版物依据；完整数据表尚未录入。2026 的出版日期为 2026 年 5 月 29 日。
- [KADOKAWA 官方版次说明](https://product.kadokawa.co.jp/cthulhu/coc-rule-book/)：区分新版第 7 版与经典第 6 版。[クトゥルフ2010](https://product.kadokawa.co.jp/p01/product-c/200906000348.html)、[クトゥルフ2015](https://www.kadokawa.co.jp/product/301506000920/)也是官方资料，但属于经典版，不能直接视为原生第 7 版数据。
- [The Sutra of Pale Leaves: Twin Suns Rising，2025，第 7 版](https://www.chaosium.com/call-of-cthulhu-the-sutra-of-pale-leaves-twin-suns-rising-hardcover/)：官方出版的 1980 年代日本背景参考，与 KADOKAWA 的日版扩展是不同书目；本工具尚未复制其专属场景、故事和机制。
- [Cthulhu Dark Ages，第 3 版，2020](https://www.chaosium.com/cthulhu-dark-ages-3rd-edition-hardcover/)：出版页明确这次修订适用于 CoC 第 7 版，主设定涵盖约 950—1054 年。技能直接核对[官方 2021 年标准人物卡](https://www.chaosium.com/content/FreePDFs/CoC/Character%20Sheets/V2/CoC7%20PC%20Sheet%20-%20Auto-Fill%20-%20Dark%20Ages%20-%20Standard%20-%20Greyscale.pdf)。未从产品介绍推导宗教理智、口述传统、民俗魔法和骑乘战斗的完整机制。
- [Down Darker Trails，2017](https://www.chaosium.com/down-darker-trails-hardcover/)：官方 CoC 第 7 版荒野西部扩展；采用产品页提供的[标准调查员人物卡](https://www.chaosium.com/content/FreePDFs/CoC/Character%20Sheets/Down-Darker-Trails-CLASSIC%20INVESTIGATOR-sheet-FULL%20AUTOCALC.pdf)，不采用 Pulp 额外 HP 和天赋。旧版 XFA 文件不能由普通 PDF 渲染器显示表单，已直接检查其嵌入人物卡图像的全部技能基础值。

## 五个可选 profile 的边界

| ID | 基础 | 实际差异 | 状态 |
| --- | --- | --- | --- |
| `core` | 第 7 版经典规则 | 经典 1920s 技能表 | 官方核心规则 |
| `gaslight` | 2024 Gaslight、2025 官方人物卡 | 维多利亚背景、历史技能、若干基础值与名称替换 | 官方时代设定的工具适配 |
| `japan` | 核心第 7 版现代人物卡；关联 KADOKAWA 2020 / 2026 书目 | 计算机使用、电子学和日本现代背景；日版专属目录尚未导入 | 官方设定的部分资料适配 |
| `dark-ages` | Dark Ages 第 3 版（适用 CoC7） | 中世纪技能、社会地位、读写分离与基础值差异 | 官方公开标准人物卡适配 |
| `western` | Down Darker Trails（适用 CoC7） | 西部技能、驾驶马车与基础值差异 | 官方公开标准人物卡适配 |

维多利亚背景有正式的 Gaslight 扩展，包含 2024 年调查员指南与 2025 年守秘人指南；本工具将原先重复的维多利亚选项合并到煤气灯。现代日本也有官方扩展，当前 `japan` 的数据不足不能被解释为官方不存在这些资料。界面同时展示出版身份与实际收录状态。

## 已登记但尚未完整导入的资料

| 资料 | 出版身份与规则版次 | 尚缺的建卡数据或机制 |
| --- | --- | --- |
| KADOKAWA《クトゥルフ2020》《クトゥルフ2026》 | 官方日版第 7 版 | 日版职业、经历包、特征、副业与专属装备 |
| KADOKAWA《クトゥルフ2010》《クトゥルフ2015》 | 官方日版经典第 6 版 | 原书条目与向第 7 版的逐项转换核验 |
| [Gaslight Investigators’ Guide](https://www.chaosium.com/cthulhu-by-gaslight-investigators-guide-hardcover/) / [Keepers’ Guide](https://www.chaosium.com/cthulhu-by-gaslight-keepers-guide-hardcover/) | Chaosium，2024 / 2025，第 7 版 | 专属职业、阶层特权、完整装备及新增神秘学规则；当前技能差异核实依据为官方人物卡 |
| [Cthulhu Dark Ages](https://www.chaosium.com/cthulhu-dark-ages-3rd-edition-hardcover/) | 2020 年第 3 版，适用 CoC7 | 专属职业、装备、宗教理智、民俗魔法与骑乘战斗 |
| [Down Darker Trails](https://www.chaosium.com/down-darker-trails-hardcover/) | 2017，适用 CoC7 / Pulp | 西部专属职业、完整武器装备和选择规则；当前采用标准调查员人物卡 |
| [Pulp Cthulhu](https://www.chaosium.com/pulp-cthulhu-hardcover/) | 2016，CoC7 规则扩展 | 原型、天赋与英雄规则；公开职业页的共同条目不代表已支持 Pulp |
| [Regency Cthulhu](https://www.chaosium.com/regency-cthulhu-hardcover/) | 2022，CoC7 摄政时代 | 专属职业、技能、声望与装备 |
| [The 7th Edition Guide to Cthulhu Invictus](https://goldengoblinpress.com/) | Golden Goblin Press，[Chaosium 授权](https://www.chaosium.com/blog/chaosium-and-golden-goblin-press-announce-new-licensing-deal-for-call-of-cthulhu/) | 古罗马职业、技能与装备 |
| [Cthulhu Through the Ages](https://www.chaosium.com/cthulhu-through-the-ages-pdf/) | 2014，CoC7，含 Invictus、Mythic Iceland、Dark Ages、Dreamlands、Gaslight、Icarus、The Reaping | 其余时代和世界的实际建卡数据；登记七种设定不自动生成七个可玩选项 |
| [H.P. Lovecraft’s Dreamlands](https://www.chaosium.com/h-p-lovecrafts-dreamlands-pdf/) | 官方产品页标注第 5 版；与 Through the Ages 的 CoC7 适配分别辨认 | 幻梦境创建、神器、典籍、法术及版次转换 |
| [The Grand Grimoire](https://www.chaosium.com/the-grand-grimoire-of-cthulhu-mythos-magic-hardcover/) | 2017，CoC7 魔法专题 | 完整法术及施法选择规则 |
| [Malleus Monstrorum](https://www.chaosium.com/malleus-monstrorum-cthulhu-mythos-bestiary-slipcase-set/) | 2020，CoC7 神话生物专题 | 生物目录；不计入调查员职业、技能或装备的完整性 |
| [Cults of Cthulhu](https://www.chaosium.com/cults-of-cthulhu-hardcover/) | 2021，CoC7 邪教专题 | 组织创建、专属条目和场景资料 |
| [Call of Cthulhu: Arkham](https://www.chaosium.com/call-of-cthulhu-arkham-hardcover/) | 2024，CoC7 城市设定 | 新技能与阿卡姆调查员相关资料 |

来源的 `publisher`、`year`、`edition` 和 `kind` 描述出版信息，`coverage` 分别标示职业、技能与装备是否完整收录、部分收录、尚未收录或不涉及。人物卡、公开规则页与完整规则书分别登记，不能用一张人物卡的技能基础值声称整本书已收录。书目搜索支持出版方、书名、版次和说明；时代筛选后展示该时代的技能基础值、别名与说明。

Gaslight 官方人物卡明确采用：会计 10%、机械维修 20%、骑术 20%、游泳 30%；新增精神病学 1%、驾驶马车 20%、宗教 10%、安抚 APP / 5。本项目将这些差异编码为 `skillBaseOverrides`，并将汽车驾驶和精神分析分别映射为驾驶马车和精神病学。时代名称映射对应实际技能时避免提供重复的同名选择。基础目录中的电气维修仍允许选择，具体适用性由人物背景与守秘人确定。全部基础值按整数向下取整。

目录中的职业来自核心通用职业，不是完整复刻 Gaslight 的专属职业、社会阶层或特权目录。工程师等职业在历史 profile 中需要选择适合时代的技术专长，此适配要求写在 `skillNotes` 中。

黑暗时代的官方标准人物卡差异如下：会计 10%、跳跃 25%、图书馆使用 5%、聆听 25%、博物学 20%、说服 15%、妙手 25%、游泳 25%、投掷 25%、宗教 20%。动物驯养 15%、洞察 5%、驾驶（马 / 牛）20%、本国知识 20%、其他王国知识 10%、读写语言 1%、维修 / 制作 20%、社会地位 0% 为时代条目。母语 EDU 和外语 1% 表示口语能力，读写语言独立购点。

为保留跨时代切换的数据，洞察复用 `psychology` ID，并将基础值改为 5；维修 / 制作复用 `mechanical-repair`，基础值改为 20；社会地位复用 `credit-rating`。标签通过 `skillAliases` 显示。驾驶（马 / 牛）、西部驾驶篷车 / 马车均复用 `drive-carriage`。别名可以是另一个技能 ID，也可以是直接显示文字。

荒野西部人物卡将博物学设为 20%、骑术设为 15%、电气维修设为 0%。新增动物驯养 5%、赌博 10%、绳索使用 5%、陷阱 10%，驾驶篷车 / 马车 20%。官方该卡没有精神分析；本工具允许从共享基础目录选择，并不据此宣称其属于西部官方人物卡。

黑暗时代官方标准人物卡不列现代交通、电气与电子技能、摄影、枪械、现代重型机械以及部分学科。本工具的共享基础目录在该时代仍可选，使用这些条目应结合故事设定与守秘人裁定；仅日本时代声明的计算机使用和电子学等专属技能仍按时代限制。弓箭专长的空白基础值、护甲值和盾牌值不从空白栏推导；对应武器、护甲与扩展机制需对照扩展规则书。核心通用职业在该时代是工具适配：社会地位范围暂用通用职业的参考范围，固定技能的适用性依人物背景确认，不称为扩展书完整职业目录。

## 数据字段与选择规则

- `formula.edu`：EDU 的倍率。
- `formula.other`：备选属性列表，选择其中一项，再乘以 `factor`。例如私家侦探为 EDU × 2 +（DEX 或 STR）× 2，不能将两个备选属性同时相加。
- `skills`：固定职业技能。
- `choiceGroups`：每组的有限选择，用 `{name, count, options}` 表示；同一组不允许重复选取。
- `choiceCount`：在有限组之外任选技能的数量。不得选择克苏鲁神话，且不能重复占用已经选择的职业技能槽位。
- 每个职业固定技能、有限组和任意选择合计为 8 个职业技能槽位。信用评级另行占用职业点，必须落在该职业的范围内。
- `parentId` 表示艺术 / 工艺与科学的固定专长。专长独立计分，不能把科学（生物学）与科学（药学）合并成同一行；护士的生物学与化学也是两行。
- 职业可保留 `version`、`eraNote` 与 `verificationSourceIds`，分别记录版本、适配边界和公开核实依据。探险家原条目允许枪械专长，本工具目前限定为目录可选择的专长，限制写在条目说明中。
- 通用艺术 / 工艺、外语、驾驶、科学、生存条目仍需记录具体专长。目录给常用固定专长独立 ID；其他专长通过原创技能补充。
- `eras` 使用 profile ID，省略或空数组时表示通用。加载内置基础目录时，非工作簿条目原本包含 `core` 的时代限制转换为通用，使基础职业、技能和装备可在所有时代选择；原时代数组中的 `victorian` 转为 `gaslight` 并去重。仅特定时代声明的条目、工作簿条目和用户原创内容继续按其明确范围筛选。1920s 装备价格仍保留原币种、年代与规格，不自动换算其他时代。切换时代时保留人物已填写的数据，基础值与可选技能重新计算。
- `enabledExtensionIds` 保存每个调查员的扩展勾选状态，缺省为空数组。只有勾选 `workbook-reference` 后，工作簿来源的新增条目才进入新选择列表；完整目录始终用于验证与读取已有记录。

## 保留的范围与维护原则

### 数值说明、护甲与财富

八项属性文字参考用户工作簿《属性和掷骰》B19:AS52 的各自锚点重写：多数属性以 15、50、90、99 为参考，体型以 15、65、80、99 为参考，教育另区分 60、70、80、90、96、99。全部 1–99 值对应一个提示，文案不赋予额外机械效果。学历只作现代知识水平类比，不换算身高体重，也不沿用贬损、免疫伤害或自动掌握技能的说法。体格短注参考 F77:S86，以双方体格比较说明推搡与擒抱，不把原表相对体格 1 的“可扔很远”写成普遍能力。技能场景示例仍由项目撰写。属性含义核对 [Chaosium 官方属性说明](https://cthulhuwiki.chaosium.com/investigators/step-one-investigator-characteristics.html)；体格计算依据 [官方衍生值](https://cthulhuwiki.chaosium.com/investigators/step-two-secondary-attributes.html)。属性短注、体格短注、信用生活水平以及每项技能说明都维护在 JSON；时代改变技能含义时使用 `skillDescriptions` 覆盖。

护甲为手动记录的防护值、来源与适用说明，缺省为 0；不根据装备自动计算，也不预设多件护甲相加。护甲与盾牌字段可核对上列黑暗时代官方人物卡，具体装备和防护数值继续以对应规则书与守秘人裁定为准。徒手使用官方标准人物卡的斗殴技能、1D3 + DB 与一次攻击；每个人物始终提供标准徒手，已修改的旧徒手记录独立保留。

核心信用评级生活水平核对 [Chaosium 官方职业与技能页](https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html)：0、1–9、10–49、50–89、90–98、99 六段。每段的中文生活说明由本项目撰写；历史设定中的定性提示不声称完整实现该扩展的阶层规则，黑暗时代的社会地位不套核心财富分段。

可用现金、资产、消费水平是不同的记录，现金不要求全随身携带。概念参考 [公开授权基础规则](https://roll20.net/compendium/coc/Step%20Seven%20(Round%20Out%20the%20Hero))；该页的 1930s/Pulp 金额表未用于推导经典 1920s 或其他时代的金额。[官方索引](https://www.chaosium.com/content/FreePDFs/CoC%207/Call%20of%20Cthulhu%207th%20Edition%20Index%20for%20Keepers%20and%20Investigators.pdf)指出现金资产表见 Keeper Rulebook 第 47 页、Investigator Handbook 第 57 页，但不提供表内金额。本次只增加定性说明和独立手填金额，未核实对应金额表前不生成起始现金；改变信用或时代不覆盖已填写的财产。

### 目录维护

规则包可增加来源、profile、技能、职业、装备和法术；共享 ID 只能提供相同定义，冲突会报错。保留所有既有 ID 与目录顺序，新增字段通过可选字段兼容 schemaVersion 1；旧库存中未知的装备定义仍可保留。职业选择只改变职业及其可选槽位，已分配技能点继续保留并提示不符合新职业的部分。

原创扩展允许附带 `sources`，新增引用须能解析，来源 URL、覆盖状态、版次元数据及专长关系均验证；来源定义冲突、悬空引用或专长循环会拒绝。旧格式中没有来源目录的职业、装备、法术与 profile 标签，通过 `legacySourceIds` 保留并提示补出处；该兼容标记不放宽新技能或核实依据的验证。旧内置条目的完整副本可省略新增可选元数据，不能覆盖内置定义。

项目原创与用户提供参考允许来源 URL 为空，其他来源要求有效 HTTP(S) URL；所有提供的链接仍检查协议和认证信息。打印导出对具体专长（`specialization` 或 `parentId`）按职业固定、已选、已分配或装备关联情况显示；通用技能保留原时代逻辑，其他时代的已分配技能不丢失。

装备价格因时代、地区、型号和信用评级而异；公开表中的参考价格明确标注 1920s 美元与规格，未核实的现有条目继续保留定性价格。普通装备的选择及购买由玩家和守秘人结合人物职业判断，不把服装价格推导为护甲值。

武器增加可选 `ammo`、`malfunction`、`armor`、`eras` 与核实来源。伤害、射程、攻击次数、装弹量与故障值能在人物装备中手动修改，并随 JSON、HTML 和 PDF 保留；旧库存已保存的数值优先于新定义，空字符串也是有效覆写。已有 .32 自动手枪、.45 自动手枪与 .30-06 步枪补入公开核实的装弹量 / 故障值；这三件武器与泛称 12 号霰弹枪的目录射程，将原误写的“米”纠正为原表的“码”；旧人物库存的距离记录不会自动改写。目录选项按时代过滤，换时代不删除已持有装备，只提示检查适用性。自动射击、特殊攻击和护甲效果仍按所持版次的规则书执行。

法术目录保留原版名称与原创用途短注。当前成本字段明确指向 Keeper Rulebook 第 12 章确认，不把未经公开官方资料充分核对的 MP、SAN 或 POW 数字伪装成原版。该目录是人物知识与持有法术的记录入口，不是可自动执行的完整施法规则。

新增原创职业、技能、装备与法术应使用自己的 ID，记录为原创来源，避免覆盖标准目录。增补规则数值时记录对应版次和来源；产品介绍页只用于核对出版身份与适用时代，不能用来推导书中未公开的完整机制。

数据加载时检查：各目录 ID 无重复、职业技能 / 来源 / 核实来源 / 时代引用存在、信用范围合法、职业槽位合计为 8、克苏鲁神话不在购点职业列表、专长父项存在且无循环、profile 的基础值与技能映射引用存在。回归检查覆盖新增字段往返、混合新旧归档、非法引用、来源冲突、时代数据保留和 HTML 转义；PDF 门禁继续实际生成各时代人物卡以检查分页。

本轮 `npm run check` 的 76 项测试与生产构建均通过。桌面与手机验证了书目搜索、时代基础值与别名、武器数值保存、时代装备筛选和库存保留；界面记录见[桌面截图](design/screenshots/source-library-desktop.png)及[手机截图](design/screenshots/source-library-mobile.png)。
