import type {Stats} from "./stats";
export type Element="Aero"|"Glacio"|"Electro"|"Fusion"|"Havoc"|"Spectro";
export type WeaponType="Sword"|"Broadblade"|"Pistols"|"Gauntlets"|"Rectifier";
export type AttackType="Basic"|"Heavy"|"Aerial"|"DodgeCounter"|"Skill"|"Liberation"|"Intro"|"Outro"|"Echo";
export type ScalingStat="ATK"|"HP"|"DEF";
export interface Attack{id:string;name:string;type:AttackType;damageBonusType?:AttackType;element:Element;scalingStat:ScalingStat;hits:number[][];skillLevel:number;fixedDamage?:number;}
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
export interface ChainEffect{chain:number;name:string;description:string;stats?:Partial<Stats>;}
// chain: 1~6 (공명체인 몇 돌파에서 열리는 효과인지)
// stats: 계산 가능한 고정 스탯 보너스일 경우에만 채움. 스택형/조건부 버프처럼
//   현재 계산 엔진이 지원하지 않는 메커니즘은 stats 없이 description만 남겨 TODO로 표시.
export interface Skill{id:string;name:string;attacks:Attack[];}
export interface Character{id:string;name:string;level:number;element:Element;weaponType:WeaponType;baseStats:Stats;skills:Skill[];chainEffects?:ChainEffect[];iconUrl?:string;}
// iconUrl: 캐릭터 아이콘 이미지의 원본 서버 URL(문자열만 저장).
//   이미지 파일 자체를 내려받아 리포지토리에 포함하지 않고, <img src={iconUrl}>
//   형태로 원본을 직접 참조하는 방식. 저작권상 이미지 재배포를 피하기 위함.
export interface Weapon{id:string;name:string;baseAtk:number;stats:Partial<Stats>;}
export interface Echo{id:string;name:string;cost:number;stats:Partial<Stats>;effects:string[];}
export interface Buff{id:string;name:string;source:string;description:string;stats:Partial<Stats>;}
export interface Enemy{id:string;name:string;level:number;baseRes:number;damageReduction:number;elementReduction:number;damageTakenBonus?:number;}
// damageTakenBonus: 받는피해(DMG Taken) — 역경의 탑 스테이지 전용 버프 등 적이 받는 피해를 늘리는 독립 배율
export interface RotationAttack{id:string;attackId:string;activeBuffIds:string[];}
export interface PartyMemberConfig{characterId:string;weaponId:string;echoIds:string[];resonanceChain?:number;}
// resonanceChain: 공명체인 보유 단계, 0(미보유)~6. 생략 시 0으로 취급.
export interface PartyConfig{id:string;name:string;mainDps:PartyMemberConfig;subDps:PartyMemberConfig;support:PartyMemberConfig;rotation:RotationAttack[];enemyId:string;}
export interface PartyTemplate{id:string;name:string;description:string;config:PartyConfig;}