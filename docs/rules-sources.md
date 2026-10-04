# 规则数据来源与维护说明

数据版本：`7e-2026.10.04`。核对日期：2026 年 10 月 4 日。

`src/data/rules.ts` 组合可随静态站点打包的目录：69 项技能、22 个通用职业、26 件装备与武器、8 项法术索引、6 个可选规则 profile。共享内容在 `core.json`；煤气灯、日本现代、维多利亚、黑暗时代与西部的新增内容和差异分别在对应 JSON 中，维多利亚继承煤气灯的共享差异。煤气灯、黑暗时代和荒野西部提供三个有独立官方出版物支撑的扩展选项。中文说明由本项目撰写，名称、机械数值与规则条件以对应英文版第 7 版资料为版本锚点。中文技能名称是界面译名，可能与不同中文出版物的译名不同。

## 采用的资料

- [Chaosium 官方快速入门](https://www.chaosium.com/cthulhu-quickstart/)：百分骰、半值与五分之一值、HP、MP、初始 SAN、伤害加值等基础规则。快速入门的固定数组建卡，与正式职业点建卡是两种流程，不能把二者的技能点混算。
- [Keeper Rulebook，第 7 版](https://www.chaosium.com/call-of-cthulhu-keeper-rulebook-7th-ed-hardcover/)：核心版本锚点，常用武器数值与法术名称索引。
- [Investigator Handbook，第 7 版](https://www.chaosium.com/call-of-cthulhu-investigator-handbook-pdf/)：职业公式、信用范围、技能专长与装备的版本锚点。
- [Chaosium 官方人物卡](https://www.chaosium.com/cthulhu-character-sheets/)：经典和现代技能基础值与人物卡字段组织。网页采用自己的版面与装饰，不将原版 PDF 文件嵌入或重新发布。
- [Chaosium 官方职业示例](https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html)：八个常见职业的技能选择条件，以及新调查员通常不能购入克苏鲁神话技能的规则。
- [Roll20 授权基础规则职业页](https://roll20.net/compendium/coc/Step%20Four%20(Determine%20Occupation))：公开核对作家、业余爱好者、记者、护士、私家侦探、教授和士兵的共同职业数值与选择条件。页面含 Pulp 语境；本工具采用共同职业信息，未由此引入 Pulp 的额外 HP 等规则。
- [Cthulhu by Gaslight: Investigators’ Guide，2024，第 7 版](https://www.chaosium.com/cthulhu-by-gaslight-investigators-guide-hardcover/)及[官方 Gaslight 人物卡，2025](https://downloads.chaosium.com/call-of-cthulhu/cha2300-investigator-sheets/CoC7_Investigator_Sheet_Gaslight_autocalc.pdf)：维多利亚设定的版次、技能和基础值差异。
- [Cthulhu Through the Ages，2014，第 7 版](https://www.chaosium.com/cthulhu-through-the-ages-pdf/)：核对跨时代资料与 Gaslight 的关系。这本书的七种设定不包括独立“日本现代”通用建卡规则。
- [The Sutra of Pale Leaves: Twin Suns Rising，2025，第 7 版](https://www.chaosium.com/call-of-cthulhu-the-sutra-of-pale-leaves-twin-suns-rising-hardcover/)：官方出版的 1980 年代日本背景参考。产品基于核心规则；本工具不复制其专属场景、故事和机制。
- [Cthulhu Dark Ages，第 3 版，2020](https://www.chaosium.com/cthulhu-dark-ages-3rd-edition-hardcover/)：出版页明确这次修订适用于 CoC 第 7 版，主设定涵盖约 950—1054 年。技能直接核对[官方 2021 年标准人物卡](https://www.chaosium.com/content/FreePDFs/CoC/Character%20Sheets/V2/CoC7%20PC%20Sheet%20-%20Auto-Fill%20-%20Dark%20Ages%20-%20Standard%20-%20Greyscale.pdf)。未从产品介绍推导宗教理智、口述传统、民俗魔法和骑乘战斗的完整机制。
- [Down Darker Trails，2017](https://www.chaosium.com/down-darker-trails-hardcover/)：官方 CoC 第 7 版荒野西部扩展；采用产品页提供的[标准调查员人物卡](https://www.chaosium.com/content/FreePDFs/CoC/Character%20Sheets/Down-Darker-Trails-CLASSIC%20INVESTIGATOR-sheet-FULL%20AUTOCALC.pdf)，不采用 Pulp 额外 HP 和天赋。旧版 XFA 文件不能由普通 PDF 渲染器显示表单，已直接检查其嵌入人物卡图像的全部技能基础值。

## 六个可选 profile 的边界

| ID | 基础 | 实际差异 | 状态 |
| --- | --- | --- | --- |
| `core` | 第 7 版经典规则 | 经典 1920s 技能表 | 官方核心规则 |
| `gaslight` | 2024 Gaslight、2025 官方人物卡 | 历史技能、若干基础值与名称替换 | 官方时代设定的工具适配 |
| `japan` | 第 7 版现代规则 | 计算机使用、电子学和日本现代背景 | 日本设定适配 |
| `victorian` | 与 Gaslight 同一历史基础 | 独立可选风格，数值共享 Gaslight | 本项目原创 profile |
| `dark-ages` | Dark Ages 第 3 版（适用 CoC7） | 中世纪技能、社会地位、读写分离与基础值差异 | 官方公开标准人物卡适配 |
| `western` | Down Darker Trails（适用 CoC7） | 西部技能、驾驶马车与基础值差异 | 官方公开标准人物卡适配 |

“维多利亚”不是与 Gaslight 不同的另一部官方扩展。“日本现代”也不声称是日文官方版独立数值扩展。所有选项的来源与状态直接保留在数据中，三个独立官方扩展为 Gaslight、Dark Ages 和 Down Darker Trails。

Gaslight 官方人物卡明确采用：会计 10%、机械维修 20%、骑术 20%、游泳 30%；新增精神病学 1%、驾驶马车 20%、宗教 10%、安抚 APP / 5。本项目将这些差异编码为 `skillBaseOverrides`，并将汽车驾驶和精神分析分别映射为驾驶马车和精神病学。历史 profile 不提供核心现代的电气维修技能行。全部基础值按整数向下取整。

目录中的职业来自核心通用职业，不是完整复刻 Gaslight 的专属职业、社会阶层或特权目录。工程师等职业在历史 profile 中需要选择适合时代的技术专长，此适配要求写在 `skillNotes` 中。

黑暗时代的官方标准人物卡差异如下：会计 10%、跳跃 25%、图书馆使用 5%、聆听 25%、博物学 20%、说服 15%、妙手 25%、游泳 25%、投掷 25%、宗教 20%。动物驯养 15%、洞察 5%、驾驶（马 / 牛）20%、本国知识 20%、其他王国知识 10%、读写语言 1%、维修 / 制作 20%、社会地位 0% 为时代条目。母语 EDU 和外语 1% 表示口语能力，读写语言独立购点。

为保留跨时代切换的数据，洞察复用 `psychology` ID，并将基础值改为 5；维修 / 制作复用 `mechanical-repair`，基础值改为 20；社会地位复用 `credit-rating`。标签通过 `skillAliases` 显示。驾驶（马 / 牛）、西部驾驶篷车 / 马车均复用 `drive-carriage`。别名可以是另一个技能 ID，也可以是直接显示文字。

荒野西部人物卡将博物学设为 20%、骑术设为 15%、电气维修设为 0%。新增动物驯养 5%、赌博 10%、绳索使用 5%、陷阱 10%，驾驶篷车 / 马车 20%。官方该卡没有精神分析，因而不显示这项现代技能。

黑暗时代会排除现代交通、电气与电子技能、摄影、枪械、现代重型机械以及标准卡不列出的部分学科。弓箭专长的空白基础值、护甲值和盾牌值不从空白栏推导；对应武器、护甲与扩展机制需对照扩展规则书。核心通用职业在该时代是工具适配：社会地位范围暂用通用职业的参考范围，现代固定技能需改选相关时代专长。此范围由 profile 描述与 `dataNotes` 明示，不称为扩展书完整职业目录。

## 数据字段与选择规则

- `formula.edu`：EDU 的倍率。
- `formula.other`：备选属性列表，选择其中一项，再乘以 `factor`。例如私家侦探为 EDU × 2 +（DEX 或 STR）× 2，不能将两个备选属性同时相加。
- `skills`：固定职业技能。
- `choiceGroups`：每组的有限选择，用 `{name, count, options}` 表示；同一组不允许重复选取。
- `choiceCount`：在有限组之外任选技能的数量。不得选择克苏鲁神话，且不能重复占用已经选择的职业技能槽位。
- 每个职业固定技能、有限组和任意选择合计为 8 个职业技能槽位。信用评级另行占用职业点，必须落在该职业的范围内。
- `parentId` 表示艺术 / 工艺与科学的固定专长。专长独立计分，不能把科学（生物学）与科学（药学）合并成同一行；护士的生物学与化学也是两行。
- 通用艺术 / 工艺、外语、驾驶、科学、生存条目仍需记录具体专长。目录给常用固定专长独立 ID；其他专长通过原创技能补充。
- `eras` 使用 profile ID，省略时表示通用。切换时代时应保留人物已填写的数据，基础值与可选技能重新计算。

## 保留的范围与维护原则

### 数值说明、护甲与财富

八项属性的五段文字（1–24、25–44、45–64、65–84、85–99）、体格短注以及技能的场景示例均为项目原创辅助说明，不增加能力限制或改动机械效果。属性含义核对 [Chaosium 官方属性说明](https://cthulhuwiki.chaosium.com/investigators/step-one-investigator-characteristics.html)；体格依据 [官方衍生值](https://cthulhuwiki.chaosium.com/investigators/step-two-secondary-attributes.html)，不是身高、体重或胖瘦的换算。属性短注、体格短注、信用生活水平以及每项技能说明都维护在 JSON；时代改变技能含义时使用 `skillDescriptions` 覆盖，避免把现代心理学简介套给黑暗时代的洞察。

护甲为手动记录的防护值、来源与适用说明，缺省为 0；不根据装备自动计算，也不预设多件护甲相加。护甲与盾牌字段可核对上列黑暗时代官方人物卡，具体装备和防护数值继续以对应规则书与守秘人裁定为准。徒手使用官方标准人物卡的斗殴技能、1D3 + DB 与一次攻击；每个人物始终提供标准徒手，已修改的旧徒手记录独立保留。

核心信用评级生活水平核对 [Chaosium 官方职业与技能页](https://cthulhuwiki.chaosium.com/investigators/step-three-occupation-and-skills.html)：0、1–9、10–49、50–89、90–98、99 六段。每段的中文生活说明由本项目撰写；历史设定中的定性提示不声称完整实现该扩展的阶层规则，黑暗时代的社会地位不套核心财富分段。

可用现金、资产、消费水平是不同的记录，现金不要求全随身携带。概念参考 [公开授权基础规则](https://roll20.net/compendium/coc/Step%20Seven%20(Round%20Out%20the%20Hero))；该页的 1930s/Pulp 金额表未用于推导经典 1920s 或其他时代的金额。[官方索引](https://www.chaosium.com/content/FreePDFs/CoC%207/Call%20of%20Cthulhu%207th%20Edition%20Index%20for%20Keepers%20and%20Investigators.pdf)指出现金资产表见 Keeper Rulebook 第 47 页、Investigator Handbook 第 57 页，但不提供表内金额。本次只增加定性说明和独立手填金额，未核实对应金额表前不生成起始现金；改变信用或时代不覆盖已填写的财产。

### 目录维护

规则包可增加来源、profile、技能、职业、装备和法术；共享 ID 只能提供相同定义，冲突会报错。保留所有既有 ID 与目录顺序，新增字段通过可选字段与导入默认值兼容 schemaVersion 1；旧库存中未知的装备定义仍可保留。职业选择只改变职业及其可选槽位，已分配技能点继续保留并提示不符合新职业的部分。

装备价格因时代、地区、型号和信用评级而异；目录不编造统一售价。普通装备的选择及购买由玩家和守秘人结合人物职业判断。武器预置常用伤害、射程与攻击次数，故障值、装弹量、自动射击和具体型号仍应对照所持规则书。

法术目录保留原版名称与原创用途短注。当前成本字段明确指向 Keeper Rulebook 第 12 章确认，不把未经公开官方资料充分核对的 MP、SAN 或 POW 数字伪装成原版。该目录是人物知识与持有法术的记录入口，不是可自动执行的完整施法规则。

新增原创职业、技能、装备与法术应使用自己的 ID，记录为原创来源，避免覆盖标准目录。增补规则数值时记录对应版次和来源；产品介绍页只用于核对出版身份与适用时代，不能用来推导书中未公开的完整机制。

已执行数据检查：JSON 可解析、各目录 ID 无重复、职业技能引用存在、来源引用存在、信用范围合法、职业槽位合计为 8、克苏鲁神话不在购点职业列表、profile 的基础值与技能映射引用存在。
