import type {Stats} from "./stats";
import type {AnomalyKind} from "../data/anomalies";
export type Element="Aero"|"Glacio"|"Electro"|"Fusion"|"Havoc"|"Spectro";
export type DamageElement=Element|"Physical";
// 공격이 가진 속성. 캐릭터·몬스터는 6속성 중 하나지만(Element), 피해 자체에는
//   물리가 있다 — 에코 어빌리티 중 「물리 피해」를 입히는 것들이 여기 해당한다.
//   물리는 피해 보너스 칸(physicalDamageBonus)만 있고 부스트 칸은 게임에 없다.
export type WeaponType="Sword"|"Broadblade"|"Pistols"|"Gauntlets"|"Rectifier";
export type AttackType="Basic"|"Heavy"|"Aerial"|"DodgeCounter"|"Skill"|"Liberation"|"Intro"|"Outro"|"Echo"|"Ultimate"|"Variation"|"Chain";
export type ScalingStat="ATK"|"HP"|"DEF";
export type BuffScaleStat=ScalingStat|"EnergyRegen"|"DiscordEfficiency"|"SyncAmplify"|"CritRate";
// 버프 수치가 어느 스탯에서 나오는지(ManualBuff.scaleFrom). 공격의 계수 기준 스탯(ScalingStat)에
//   스탯창 전용 세 가지를 더한 것이다.
//   ATK/HP/DEF          최종 스탯이 나온 뒤에야 값이 정해진다 → 공격력% 같은 자리에는 쓸 수 없다
//   EnergyRegen         공명 효율. 게임 표시값(=100% + 보너스분)을 퍼센트포인트로 본다
//   DiscordEfficiency   부조화 수치 누적 효율. 표시값을 퍼센트포인트로 본다
//   SyncAmplify         조화도 파괴 증폭. 표시값을 pt(=퍼센트포인트)로 본다
//   뒤의 셋은 공격력·HP·방어력에 기대지 않아서 스탯 확정 전에 값을 낼 수 있다
//   — 그래서 공격력% 자리에도 쓸 수 있다(calculator/manualBuffs.ts의 SCALE_PHASE 참고).
export type ResonanceMode="Discord"|"Flame"|"Cluster"|"Frost"|"Echo";
// 공명 모드 — 에이메스처럼 캐릭터가 두 가지 모드 중 하나를 선택하고, 그에 따라
//   발동 가능한 공격과 적용되는 버프가 통째로 달라지는 경우에 사용하는 상태값.
//   "Discord" = 조화 파동, "Flame" = 불꽃, "Cluster" = 조화 밀집,
//   "Frost" = 서리, "Echo" = 에코.
//   이중 모드 캐릭터는 넷이다 — 루실라(서리·에코), 에이메스(조화 파동·불꽃),
//   데니아(불꽃·조화 밀집), 린네(조화 파동·조화 밀집).
//   모드 개념이 없는 캐릭터는 생략(undefined).
export interface Attack{id:string;name:string;type:AttackType;damageBonusType?:AttackType;element:DamageElement;scalingStat:ScalingStat;hits:number[][];skillLevel:number;fixedDamage?:number;resonanceMode?:ResonanceMode;anomaly?:AnomalyKind;discord?:boolean;}
// discord: 조화도 파괴(부조화) 항목이면 true. 켜져 있으면 피해를 calculator/discord.ts가 낸다
//   — 공격력을 타지 않고 10027.14 고정값에서 출발하는 별도 피해식이다(data/discord.ts 참고).
// anomaly: 이 항목이 공격이 아니라 「이상 효과 피해」일 때 어느 효과인지.
//   채워져 있으면 계산이 통째로 다른 길로 간다 — 공격력도 스킬 계수도 타지 않고
//   레벨별 기준값에서 나온 고정 기초값을 쓴다(calculator/anomaly.ts).
//   그때 hits · scalingStat · fixedDamage는 쓰이지 않고, element만 저항 판정에 쓴다.
// type: 이 공격의 분류(어떤 모션인지, UI 표시/그룹핑용)
// damageBonusType: 실제 피해량 계산 시 어떤 "XX 피해 보너스" 스탯이 적용되는지.
//   미지정 시 type을 그대로 사용(기존 캐릭터 데이터와 호환).
//   예: 일부 캐릭터는 "일반공격 모션"이지만 실제로는 "강공격 피해"로 판정되는 경우가 있어
//   type과 damageBonusType을 다르게 설정할 수 있음.
// hits: 이 공격(예: "일반공격 2단") 안에 포함된 개별 타격들의 레벨별 배율.
//   hits[히트번호][스킬레벨-1] = 그 히트의 그 레벨에서의 배율(소수).
//   예: 2단(38.99%+19.50%*3)이면 hits.length===4.
//   계산 시 히트마다 각각 데미지를 구해 합산하므로, 실제 게임처럼 히트별로
//   크리티컬이 독립 판정되는 구조를 그대로 반영하면서도 결과는 "2단" 하나로 묶여 나온다.
// fixedDamage: 모든 배율(피해증가/부스트/저항/방어/받는피해/최종피해)과 무관하게
//   계산 마지막 단계에 그대로 더해지는 고정 추가 피해. 크리티컬 영향도 받지 않음.
// resonanceMode: 특정 공명 모드에서만 발동하는 공격일 때 지정. 미지정 시 모드와 무관하게
//   항상 사용 가능(형태 전환만으로 나오는 대부분의 공격이 여기 해당).
export interface ChainEffect{chain:number;name:string;description:string;stats?:Partial<Stats>;}
// chain: 1~6 (공명체인 몇 돌파에서 열리는 효과인지)
// stats: 계산 가능한 고정 스탯 보너스일 경우에만 채움. 스택형/조건부 버프처럼
//   현재 계산 엔진이 지원하지 않는 메커니즘은 stats 없이 description만 남겨 TODO로 표시.
export type SkillCategory="Basic"|"Skill"|"Circuit"|"Liberation"|"Variation"|"Intro"|"Sync"|"Passive";
// 스킬 분류. 게임 내 스킬 탭 구분과 같다.
//   Basic=기본 공격, Skill=공명 스킬, Circuit=공명 회로, Liberation=공명 해방,
//   Variation=변주 스킬, Intro=반주 스킬, Sync=조화도 파괴, Passive=고유/기타 스킬.
//   공격 팔레트를 이 분류로 묶어서 보여준다.
export interface SkillAttribute{attributeName:string;description:string;values:string[];}
export interface Skill{id:string;name:string;category?:SkillCategory;attacks:Attack[];icon?:string;attributes?:SkillAttribute[];}
export interface CharacterBuffTemplate{label:string;target:BuffTarget;damageType:BuffDamageType;element?:Element;attackId?:string;attackIds?:string[];value:number;scaleFrom?:BuffScaleStat;scaleOffset?:number;maxValue?:number;statGroup?:StatGroup;stacks?:number;modifier?:BuffModifier;resonanceChain?:number;resonanceMode?:ResonanceMode;inherentSkillId?:string;condition?:string;uptime?:BuffUptime;scope?:BuffScope;excludeOwner?:boolean;maxStacks?:number;exclusiveGroup?:string;anomalyStacks?:AnomalyKind;raisesAnomalyStacks?:number;raisesAnomalyKinds?:AnomalyKind[];switchesDamageBonusType?:AttackType;}
// 캐릭터 고유효과·공명체인처럼 캐릭터가 스스로 들고 있는 버프를 계산 가능한 형태로 적어둔 것.
//   무기 쪽 WeaponBuffTemplate과 같은 모양이되, 정련(values 5개) 대신 아래 두 조건을 쓴다.
//   resonanceChain: 이 단계 이상 보유해야 걸린다. 생략하면 체인과 무관(고유효과 등).
//   resonanceMode: 이 공명 모드일 때만 걸린다. 생략하면 모드와 무관.
//   inherentSkillId: 이 버프를 주는 고유 스킬의 id. 적어두면 캐릭터 관리에서 그 고유 스킬을
//     끈 순간 버프도 같이 빠진다. 생략하면 고유 스킬과 무관한 것(공명체인 등)으로 본다.
//   condition: 엔진이 판정하지 못하는 발동 조건을 사람이 읽도록 남기는 메모.
//   uptime / scope: 상시·조건부, 파티·본인 구분. 생략하면 passive / self.
//   excludeOwner: 파티 버프이면서 본인은 빼는 것. 본인 몫이 따로 적혀 있을 때 쓴다
//     (치사 2체인처럼 「본인은 상시, 남은 발동」으로 갈리는 효과). 목록에도 뜨지 않는다.
//   maxStacks / exclusiveGroup: 스택 선택과 배타 묶음. ManualBuff 쪽 설명 참고.
export interface Character{id:string;name:string;level:number;element:Element;weaponType:WeaponType;baseStats:Stats;skills:Skill[];chainEffects?:ChainEffect[];passiveBuffs?:CharacterBuffTemplate[];iconUrl?:string;artUrl?:string;echoIds?:string[];resonanceModes?:ResonanceMode[];}
// passiveBuffs: 위 CharacterBuffTemplate 목록. 파티에 편성하면 버프 목록에 자동으로 잡힌다.
// resonanceModes: 이 캐릭터가 고를 수 있는 공명 모드 목록. 모드가 있는 캐릭터만 채우고,
//   UI는 이 값이 있을 때만 모드 선택을 노출한다. 첫 번째 값이 기본 모드.
// iconUrl: 캐릭터 아이콘 이미지의 원본 서버 URL(문자열만 저장).
//   이미지 파일 자체를 내려받아 리포지토리에 포함하지 않고, <img src={iconUrl}>
//   형태로 원본을 직접 참조하는 방식. 저작권상 이미지 재배포를 피하기 위함.
export interface Weapon{id:string;name:string;baseAtk:number;stats:Partial<Stats>;atkLevels?:number[];}
// baseAtk: 이 무기의 공격력. 레벨이 정해진 무기는 weaponAtLevel()이 atkLevels에서 꺼내 채워준다.
// atkLevels: 레벨별 공격력 표. atkLevels[레벨-1] = 그 레벨의 공격력(api/weapons.json의 Properties 공격력).
export interface Echo{id:string;name:string;cost:number;stats:Partial<Stats>;subStats?:Partial<Stats>;effects:string[];iconUrl?:string;fetterGroups?:{name:string;icon:string}[];}
// subStats: stats 중 **부옵션 5줄에서 온 몫**. 스탯창 값을 낼 때 에코 옵션의 버림이
//   메인 옵션 몫과 부옵션 몫으로 갈리기 때문에 따로 들고 다닌다(calculateFinalStats 참고).
//   합산은 stats로만 한다 — subStats는 그 안에 이미 들어 있는 값이라 더하면 두 번 걸린다.
export interface Buff{id:string;name:string;source:string;description:string;stats:Partial<Stats>;}
export type BuffUptime="passive"|"active";
// 버프가 걸려 있는 방식.
//   passive = 조건 없이 늘 걸려 있다(무기 부옵션형 고정 효과, 상시 고유효과 등)
//   active  = 발동 조건이 있어 그때만 걸린다(스킬 사용 후 N초, 스택 소모 등)
// 계산에는 아직 쓰이지 않는다 — 버프를 분류하고 화면에서 걸러 보기 위한 값이다.
export type BuffScope="self"|"party";
// 버프가 누구에게 걸리는지.
//   self  = 그 버프를 들고 있는 캐릭터에게만
//   party = 파티 전원에게
// scope가 self인 버프는 그 캐릭터의 공격에만 붙는다(appliesTo에서 ownerId로 판정).
export type StatGroup="panel"|"buff";
// 공격력·HP·방어력 %가 어느 단계에서 붙는지.
//   panel = 스탯창에 찍히는 값(스킬 트리 · 무기 부옵션 · 무기 효과 · 에코 옵션)
//   buff  = 전투 중에 얹히는 값(공명체인 · 파티 버프 · 에코 세트 효과)
// 게임은 스탯창 값을 먼저 확정(버림)한 뒤 버프분을 더하므로 둘을 갈라 담아야 한다
//   — 계산식은 calculateFinalStats 주석 참고. 생략하면 buff로 본다.
export type BuffModifier="increase"|"amplify";
// 배율에 붙는 방식. increase=증가(기본×(1+수치)), amplify=상승(기본이 한 벌 더 얹힘 → 1+수치만큼 가산).
export type BuffDamageType="All"|AttackType|Element|AnomalyKind;
// 이 버프가 걸리는 피해 종류. "All"은 모든 공격, AttackType은 공격 분류(일반/강공격/공명스킬 등),
//   Element는 속성(용융/응결 등), AnomalyKind는 이상 효과(광학·서리 등)다.
//   지금은 이 넷을 한 필드에 섞어 담는 프로토타입 형태다.
//   이상 효과는 일반 공격과 피해식이 통째로 달라서, AnomalyKind로 적은 버프는
//   이상 효과 피해에만 걸리고 일반 공격에는 절대 걸리지 않는다(그 반대도 같다).
export type BuffTarget="motionValue"|"damageBonus"|"boost"|"critRate"|"critDamage"|"defIgnore"|"defReduction"|"resPen"|"resReduction"|"damageTaken"|"totalDamage"|"anomalyBoost"|"anomalyCritRate"|"anomalyCritDamage"|"anomalyAmplify"|"energyRegen"|"syncAmplify"|"discordEfficiency"|"atkFlat"|"atkPercent"|"hpPercent"|"defPercent";
// 이 버프가 계산의 어느 자리에 붙는지.
//   motionValue = 스킬 배율(증가/상승 구분이 여기서만 의미가 있다)
//   damageBonus = 피해 보너스 그룹(1+Σ로 묶여 곱해지는 자리)
//   boost       = 부스트 그룹(피해증가와는 별개의 독립 곱연산)
//   critRate    = 크리티컬 확률
//   critDamage  = 크리티컬 피해(기본 100%를 뺀 보너스분)
//   defIgnore   = 방어력 무시
//   resPen      = 속성 저항 무시
//   resReduction = 속성 저항 감소(적에게 거는 디버프). resPen과 합산한 뒤 저항에서 한 번에 뺀다.
//   damageTaken = 받는피해 그룹(적이 받는 피해를 늘리는 독립 배율)
//   totalDamage = 최종피해 그룹. 피해증가·부스트와는 또 다른 독립 곱연산이라
//     원문에 「최종 피해가 N% 증가」로 적힌 것은 반드시 여기에 담아야 한다
//     (damageBonus에 넣으면 다른 피해증가와 합산돼 결과가 달라진다).
//   anomalyBoost = 이상 효과 부스트. 이상 피해에만 곱해지는 독립 배율로,
//     damageType에 적은 이상 효과(AnomalyKind)에만 걸린다. "All"이면 이상 효과 전부.
//   energyRegen = 공명 효율. 해방 회전율에만 영향을 주고 피해식에는 들어가지 않는 표시 전용 값이지만,
//     무기·에코가 실제로 주는 수치라 스탯창에 그대로 보이도록 여기에 자리를 둔다.
//   syncAmplify / discordEfficiency = 조화도 파괴 증폭 · 부조화 수치 누적 효율.
//     energyRegen과 같이 피해식에는 안 들어가지만, 이 수치에 비례해 공격력을 올리는
//     화음 세트가 있어서(역광 속 눈부신 서약 · 빛을 쫓는 별의 고리) 버프로 얹을 자리가 필요하다.
//   atkPercent / hpPercent / defPercent = 공격력·HP·방어력 % 증가
//     이 셋은 기초 스탯에 곱해지기 전에 합산돼야 해서, 다른 타깃과 달리
//     calculateFinalStats의 곱연산 이전 단계에 얹힌다(manualBuffDelta 참고).
export interface ManualBuff{id:string;label:string;target:BuffTarget;damageType:BuffDamageType;element?:Element;attackId?:string;attackIds?:string[];value:number;scaleFrom?:BuffScaleStat;scaleOffset?:number;maxValue?:number;statGroup?:StatGroup;stacks:number;modifier:BuffModifier;enabled:boolean;uptime?:BuffUptime;scope?:BuffScope;excludeOwner?:boolean;ownerId?:string;iconUrl?:string;maxStacks?:number;exclusiveGroup?:string;anomalyStacks?:AnomalyKind;raisesAnomalyStacks?:number;raisesAnomalyKinds?:AnomalyKind[];switchesDamageBonusType?:AttackType;}
// 수기로 입력하는 버프 프로토타입.
//   label: 메모용 이름(선택). 계산에는 쓰이지 않는다.
//   target: 위 BuffTarget — 계산의 어느 자리에 붙는지
//   damageType: 어떤 공격에 걸리는지. "All"이면 전부, AttackType이면 그 분류, Element면 그 속성 공격.
//   element: target이 "resPen"/"resReduction"일 때 어느 속성 저항인지. 생략하면 속성을 가리지 않는다.
//   attackId: 특정 공격 하나에만 걸릴 때 그 공격의 id. 생략하면 damageType 조건만 본다.
//     공명체인처럼 "이 스킬의 배율만 상승" 형태를 표현하려면 필요하다.
//     예) 3체인 「종결 배율 100% 상승」 → attackId:"1004603_2"
//     예) 「공명 해방 피해가 용융 저항 무시」 → damageType:"Liberation", element:"Fusion"
//   attackIds: 여러 공격에 한꺼번에 걸릴 때. attackId보다 우선한다.
//     예) 「주식 1단·2단 피해 20% 증가」 → attackIds:["1000802_2","1000802_3"]
//   iconUrl: 목록에 띄울 아이콘. 무기 버프는 무기 그림, 그 외는 오너 캐릭터 아이콘을 쓴다.
//   value: 스택 1개당 수치(소수). 예) 12% → 0.12
//   scaleFrom: 수치가 고정값이 아니라 그때의 스탯에서 나오는 버프에 쓴다.
//     적용치(%) = 그 스탯 × value × stacks  → 소수 비율로는 (스탯 × value × stacks) / 100.
//     ATK/HP/DEF 기준일 때는 스탯 자체를 올리는 자리(atkPercent 등)에 쓸 수 없다
//     — 그 값들은 최종 스탯이 나오기 전에 합산돼야 해서 순환이 된다(manualBuffs.ts 참고).
//     반대로 EnergyRegen/DiscordEfficiency/SyncAmplify 기준은 공격력에 기대지 않아
//     스탯 확정 전에 값이 정해지므로 공격력% 자리에도 쓸 수 있다.
//     예) 내려앉은 깃털의 노래 5세트 「공명 효율 1%당 파티 공격력 0.1%(최대 25%)」
//         → target:"atkPercent", scaleFrom:"EnergyRegen", value:0.001, maxValue:0.25
//   maxValue: 비례분의 상한(소수 비율). 게임 설명의 「최대 25%까지」가 이 값이다.
//     scaleFrom이 있을 때만 의미가 있고, 생략하면 상한이 없다.
//   stacks: 스택 수. 실제 적용치 = value × stacks
//   modifier: 증가/상승 구분. target이 "motionValue"일 때만 갈리고, 나머지는 단순 가산이다.
//   enabled: 체크를 꺼두면 계산에서 빠진다
//   uptime: 상시(passive)인지 조건부(active)인지. 생략하면 passive로 본다.
//   scope: 파티 전원(party)인지 본인만(self)인지.
//     무기·캐릭터 버프는 따로 적지 않으면 self로 잡힌다 — 남의 개인 버프가
//     내 공격 목록에 섞이지 않게 하려는 것이다. 파티에 거는 것만 party로 적는다.
//     수기 버프는 ownerId가 없어 이 판정을 타지 않고 늘 적용된다.
//   ownerId: 이 버프를 들고 있는 캐릭터의 id. 무기·캐릭터 버프는 자동으로 채워진다.
//     scope가 self일 때 누구의 공격에만 붙일지 가리는 데 쓴다.
//   maxStacks: 스택을 쌓을 수 있는 버프의 최대 스택. 2 이상이면 공격마다 몇 스택인지 고를 수 있다.
//     stacks는 기본값이고, 실제 적용치는 RotationAttack.buffStacks가 있으면 그쪽이 이긴다.
//   exclusiveGroup: 같은 이름끼리 하나만 켜지는 묶음. 「HP 60% 이상 / 미만」처럼
//     동시에 성립할 수 없는 상태를 나눠 적을 때 쓴다.
// 필드는 프로토타입이라 앞으로 추가·변경될 수 있다.
export type EnemyResPreset="field"|"tower"|"hologram";
// 콘텐츠별 속성 저항 프리셋. 수치는 PartyConfigContext의 ENEMY_RES_PRESETS에 있다.
//   field=필드(10/40%), tower=역경의 탑(20/60%), hologram=홀로그램(10/80%).
export interface Enemy{id:string;name:string;level:number;element:Element;resPreset?:EnemyResPreset;baseRes:number;sameElementRes:number;damageReduction:number;damageTakenBonus?:number;}
// level: 적 레벨. 방어 배율에 쓰이며 적 방어력은 8×레벨+792로 유도된다(별도 데이터 불필요).
// element: 이 몬스터의 속성. 같은 속성으로 때리면 저항이 더 높게 잡힌다.
// resPreset: 고른 콘텐츠 프리셋. baseRes/sameElementRes는 이 값에서 따라온다.
// baseRes: 몬스터 속성과 다른 속성 공격에 적용되는 기본 속성 저항.
// sameElementRes: 몬스터 속성과 같은 속성 공격에 적용되는 저항.
// damageTakenBonus: 받는피해(DMG Taken) — 역경의 탑 스테이지 전용 버프 등 적이 받는 피해를 늘리는 독립 배율
export interface RotationAttack{id:string;attackId:string;characterId:string;cycle?:number;enabledBuffIds:string[];disabledBuffIds?:string[];damageBonusType?:AttackType;buffStacks?:Record<string,number>;anomalyStacks?:number;anomalyOccurrences?:number;discordRate?:number;discordOccurrences?:number;}
// damageBonusType: 이 한 대의 피해 판정을 손으로 바꿔치기한 값. 자료가 「공명 스킬」이라고
//   적어 둔 공격이 실제로는 공명 해방 피해로 들어가는 일이 있어(스킬 설명에 그렇게 적힌다),
//   카드에서 바로 고칠 수 있게 열어 두었다. 비어 있으면 공격 자료를 그대로 따른다.
// disabledBuffIds: 상시(passive) 버프 중 이 공격에서만 꺼 둔 것. 상시는 조건이 없어 늘 걸리지만
//   「이 버프가 얼마나 보태는지」를 보려고 잠깐 빼 보는 일이 잦아 끌 수 있게 열어 두었다.
//   비어 있으면(대개) 상시는 전부 걸린다.
// cycle: 이 공격이 몇 번째 사이클에 드는지(1부터). 루틴은 보통 4~5사이클을 도는 단위로 읽히므로
//   그 경계를 자료에 남겨 화면에서 구분선을 긋는다. 생략(예전에 담은 공격)은 1사이클로 본다.
// discordRate: 조화도 파괴 항목일 때 그 스킬의 배율(16 = 1600%). 생략하면 기본 조화도 파괴 배율.
// discordOccurrences: 조화도 파괴가 몇 번 터졌는지. 생략하면 1.
// anomalyStacks: 이상 효과 항목일 때 적에게 몇 스택이 쌓인 상태인지. 기초값이 스택에서 나온다.
//   생략하면 그 효과의 최대 스택으로 본다(폭발형은 최대 스택에서만 터지므로 그게 기본값이다).
// anomalyOccurrences: 그 상태로 몇 번 터졌는지(발생 횟수). 생략하면 1.
// enabledBuffIds: 이 공격에서 "켠" 버프. 버프는 기본적으로 전부 꺼져 있고, 여기 담긴 것만 걸린다.
//   공격을 추가하면 빈 배열로 시작하므로 아무 버프도 자동으로 붙지 않는다.
//   나중에 무기를 바꾸거나 버프를 새로 만들어도 이미 담긴 공격에 멋대로 얹히지 않는다.
// buffStacks: 이 공격에서 그 버프를 몇 스택으로 볼지. 스택형 버프(maxStacks 2 이상)에만 쓴다.
//   없으면 버프의 기본 stacks를 그대로 쓴다.
// characterId: 이 공격을 누가 쓰는지. 로테이션에는 여러 캐릭터의 공격이 섞일 수 있고
//   attackId는 캐릭터 사이에서 겹칠 수 있으므로 공격을 담을 때 캐릭터도 같이 기록한다.
export interface CharacterWeaponConfig{weaponId:string;refine:number;level?:number;}
// refine: 정련(중첩) 단계 1~5. 무기 스킬 수치가 단계별로 달라진다.
// level: 무기 레벨 1~90. 생략(예전에 저장된 설정)이면 90으로 본다.
//   현재 무기 스킬은 계산에 반영되지 않아 표시에만 쓰인다.
export interface PartyMemberConfig{characterId:string;weaponId:string;echoIds:string[];resonanceChain?:number;resonanceMode?:ResonanceMode;}
// resonanceChain: 공명체인 보유 단계, 0(미보유)~6. 생략 시 0으로 취급.
// resonanceMode: 이 캐릭터를 어느 공명 모드로 운용할지. 생략 시 Character.resonanceModes[0]
//   (모드가 없는 캐릭터면 undefined)으로 취급.
export interface PartyConfig{id:string;name:string;mainDps:PartyMemberConfig;subDps:PartyMemberConfig;support:PartyMemberConfig;rotation:RotationAttack[];enemy:Enemy;}
// enemy: 계산 대상 몬스터. 목록에서 고르는 게 아니라 계산 화면에서 직접 레벨/속성을 정한다.
export interface PartyTemplate{id:string;name:string;description:string;config:PartyConfig;}